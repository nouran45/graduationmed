"""
Authentication: who is calling?

Rules enforced here
-------------------
1. Identity comes ONLY from a signed JWT *and* a live server-side session.
2. The user's role is read from MongoDB on every request. It is never taken
   from the token, so a forged or stale "role" claim has no effect.
3. The JWT subject is the immutable MongoDB user _id, not the e-mail address.
4. The signing algorithm is pinned (algorithms=[HS256]); "alg: none" tokens
   are rejected by python-jose.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import timedelta
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError

from database import users

from . import audit_events as audit
from .config import get_settings
from .request_context import get_context
from .requestinfo import actor_pseudonym
from .sessions import get_active_session, touch_session, utcnow

logger = logging.getLogger(__name__)

# auto_error=False -> we produce the 401 ourselves (same body for every failure)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


# --------------------------------------------------------------------------
# Tokens
# --------------------------------------------------------------------------
def create_access_token(
    user_id: str,
    session_id: str,
    expires_minutes: Optional[int] = None,
) -> str:
    s = get_settings()
    now = utcnow()
    minutes = expires_minutes if expires_minutes is not None else s.access_token_expire_minutes
    claims = {
        "sub": user_id,                  # immutable user _id (string)
        "sid": session_id,               # server-side session
        "jti": uuid.uuid4().hex,         # unique token id (audit / correlation)
        "typ": "access",
        "iat": now,
        "exp": now + timedelta(minutes=minutes),
    }
    return jwt.encode(claims, s.secret_key, algorithm=s.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    s = get_settings()
    claims = jwt.decode(
        token,
        s.secret_key,
        algorithms=[s.jwt_algorithm],
        options={"require_exp": True, "require_sub": True, "require_jti": True},
    )
    if claims.get("typ") != "access" or not claims.get("sid"):
        raise JWTError("not an access token")
    return claims


# --------------------------------------------------------------------------
# Dependencies
# --------------------------------------------------------------------------
@dataclass
class Principal:
    user: dict
    session: dict
    token_id: str

    @property
    def user_id(self) -> str:
        return str(self.user["_id"])

    @property
    def role(self) -> str:
        return self.user.get("role", "patient")

    @property
    def session_id(self) -> str:
        return self.session["session_id"]


def get_current_principal(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
) -> Principal:
    """
    Plain `def` on purpose: FastAPI runs it in a worker thread, so the
    blocking PyMongo calls below do not stall the event loop.
    """
    # The HTTP answer is always the same 401. The REASON is recorded internally
    # (security event) so detectors can tell replay-after-logout from garbage tokens.
    if not token:
        audit.token_invalid("missing_token")
        raise _credentials_exception()

    try:
        claims = decode_access_token(token)
        user_oid = ObjectId(claims["sub"])
    except ExpiredSignatureError:
        audit.token_invalid("expired_token")
        raise _credentials_exception()
    except (JWTError, InvalidId, KeyError, TypeError):
        # Old-style tokens (sub = e-mail, no sid) also land here -> re-login.
        audit.token_invalid("invalid_token")
        raise _credentials_exception()

    # From here the signature was valid, so `sub` is trustworthy as a subject.
    subject = actor_pseudonym(str(user_oid))

    session = get_active_session(claims["sid"])
    if session is None or session["user_id"] != user_oid:
        audit.token_invalid("session_inactive", subject_id=subject)
        raise _credentials_exception()

    user = users.find_one({"_id": user_oid})
    if user is None or user.get("is_disabled"):
        audit.token_invalid("user_unavailable", subject_id=subject)
        raise _credentials_exception()

    touch_session(session)

    # Exposed for the Phase 2 logging middleware (trusted, server-derived).
    request.state.actor_id = str(user["_id"])
    request.state.actor_role = user.get("role", "patient")
    request.state.session_id = session["session_id"]

    ctx = get_context()
    if ctx is not None:
        ctx.set_actor(str(user["_id"]), user.get("role", "patient"), session["session_id"])

    return Principal(user=user, session=session, token_id=claims["jti"])


def get_current_user(principal: Principal = Depends(get_current_principal)) -> dict:
    """
    Drop-in replacement for the old get_current_user(): returns the MongoDB
    user document, so every existing endpoint keeps working unchanged.
    """
    return principal.user
