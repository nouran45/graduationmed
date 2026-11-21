"""
Authentication endpoints.

Paths /register, /login, /verify-token and /users/me are unchanged so the
existing frontend keeps working. New: /logout, /logout-all, /auth/change-password.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pymongo.errors import DuplicateKeyError

from database import users
from models import ChangePasswordRequest, UserInDB, UserLogin, UserSignup
from security import audit_events as audit
from security.authorization import memberships_summary
from security.config import get_settings
from security.identity import Principal, create_access_token, get_current_principal
from security.login_throttle import (
    check_login_allowed,
    clear_login_failures,
    record_login_failure,
)
from security.passwords import (
    hash_password,
    password_policy_errors,
    verify_password,
    verify_password_or_dummy,
)
from security.rate_limit import ip_rate_limit
from security.request_context import get_context
from security.requestinfo import client_ip
from security.sessions import create_session, revoke_all_user_sessions, revoke_session

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Authentication"])

GENERIC_LOGIN_ERROR = "Incorrect email or password"


def normalize_email(email: str) -> str:
    """One canonical form, so 'A@x.com' and 'a@x.com' are the same account."""
    return email.strip().lower()


# --------------------------------------------------------------------------
# Register
# --------------------------------------------------------------------------
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserSignup,
    _rl: None = Depends(ip_rate_limit("register", "register_per_hour_per_ip", 3600)),
):
    email = normalize_email(str(user_data.email))

    def _reg_fail(reason: str) -> None:
        # Specific reason is recorded INTERNALLY; the HTTP answer is unchanged.
        audit.emit(
            "auth.register.failure", outcome="failure", resource_type="account",
            subject_email=email, details={"reason": reason},
        )

    if user_data.password != user_data.confirmPassword:
        _reg_fail("password_mismatch")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Passwords do not match.")

    problems = password_policy_errors(user_data.password, email)
    if problems:
        _reg_fail("weak_password")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, " ".join(problems))

    if users.find_one({"email": email}):
        _reg_fail("email_exists")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")

    # Build the stored document EXPLICITLY from approved fields.
    # No plaintext password. No client-controlled role.
    document = UserInDB(
        firstName=user_data.firstName.strip(),
        lastName=user_data.lastName.strip(),
        email=email,
        hashed_password=hash_password(user_data.password),
        role="patient",
    ).model_dump()

    try:
        result = users.insert_one(document)
    except DuplicateKeyError:
        # Lost a race against a concurrent registration of the same e-mail.
        _reg_fail("email_exists")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")

    audit.emit(
        "auth.register.success", outcome="success", resource_type="account",
        subject_email=email, target_relation="self",
    )
    return {"message": "User registered successfully", "user_id": str(result.inserted_id)}


# --------------------------------------------------------------------------
# Login
# --------------------------------------------------------------------------
@router.post("/login")
def login(credentials: UserLogin, request: Request):
    s = get_settings()
    email = normalize_email(str(credentials.email))
    ip = client_ip(request)

    wait = check_login_allowed(email, ip)
    if wait is not None:
        audit.emit(
            "auth.login.locked", outcome="blocked", resource_type="account",
            subject_email=email, details={"reason": "lockout"},
        )
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many failed login attempts. Try again later.",
            headers={"Retry-After": str(wait)},
        )

    user = users.find_one({"email": email})

    # Always costs one bcrypt verification, found or not (no timing oracle).
    password_ok = verify_password_or_dummy(
        credentials.password, user.get("hashed_password") if user else None
    )

    if user is None or not password_ok or user.get("is_disabled"):
        record_login_failure(email, ip)
        # Internal reason only. The client always receives the identical 401 below.
        reason = (
            "unknown_account" if user is None
            else "disabled_account" if user.get("is_disabled")
            else "bad_password"
        )
        audit.emit(
            "auth.login.failure", outcome="failure", resource_type="account",
            subject_email=email, details={"reason": reason},
        )
        # Same status, same message, for: unknown e-mail, wrong password,
        # disabled account.
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            GENERIC_LOGIN_ERROR,
            headers={"WWW-Authenticate": "Bearer"},
        )

    clear_login_failures(email)

    session = create_session(
        user_id=user["_id"],
        ttl_minutes=s.access_token_expire_minutes,
        ip=ip,
        user_agent=request.headers.get("user-agent"),
    )
    token = create_access_token(str(user["_id"]), session["session_id"])

    # The session now exists: from here on the request belongs to this actor.
    ctx = get_context()
    if ctx is not None:
        ctx.set_actor(str(user["_id"]), user.get("role", "patient"), session["session_id"])
    audit.emit(
        "auth.login.success", outcome="success", resource_type="account",
        subject_email=email, target_relation="self",
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": s.access_token_expire_minutes * 60,
        "user": {
            "id": str(user["_id"]),
            "firstName": user.get("firstName", ""),
            "lastName": user.get("lastName", ""),
            "email": user["email"],
            "role": user.get("role", "patient"),
        },
    }


# --------------------------------------------------------------------------
# Session / identity
# --------------------------------------------------------------------------
@router.get("/verify-token")
def verify_token(principal: Principal = Depends(get_current_principal)):
    """Valid only if the JWT is genuine AND its server-side session is alive."""
    audit.emit("auth.verify_token.success", outcome="success", resource_type="session", target_relation="self")
    return {
        "valid": True,
        "user": principal.user["email"],
        "userId": principal.user_id,
    }


@router.get("/users/me")
def read_users_me(principal: Principal = Depends(get_current_principal)):
    u = principal.user
    return {
        "id": principal.user_id,
        "email": u["email"],
        "firstName": u.get("firstName", ""),
        "lastName": u.get("lastName", ""),
        "role": principal.role,                       # authoritative (from the DB)
        "memberships": memberships_summary(u["_id"]),  # drives pharmacy menus (UI only)
    }


@router.post("/logout")
def logout(principal: Principal = Depends(get_current_principal)):
    revoke_session(principal.session_id, "logout")
    audit.emit("auth.logout.success", outcome="success", resource_type="session", target_relation="self")
    return {"message": "Logged out"}


@router.post("/logout-all")
def logout_all(principal: Principal = Depends(get_current_principal)):
    count = revoke_all_user_sessions(principal.user["_id"], "logout_all")
    audit.emit(
        "auth.logout_all.success", outcome="success", resource_type="session",
        target_relation="self", details={"sessions_revoked": count},
    )
    return {"message": "All sessions ended", "sessions_revoked": count}


@router.post("/auth/change-password")
def change_password(
    body: ChangePasswordRequest,
    request: Request,
    principal: Principal = Depends(get_current_principal),
):
    email = principal.user["email"]
    ip = client_ip(request)

    def _pw_fail(reason: str) -> None:
        audit.emit(
            "auth.password_change.failure", outcome="failure", resource_type="account",
            target_relation="self", details={"reason": reason},
        )

    wait = check_login_allowed(email, ip)
    if wait is not None:
        _pw_fail("lockout")
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many failed attempts. Try again later.",
            headers={"Retry-After": str(wait)},
        )

    if not verify_password(body.current_password, principal.user.get("hashed_password")):
        record_login_failure(email, ip)
        _pw_fail("bad_current_password")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect.")

    problems = password_policy_errors(body.new_password, email)
    if problems:
        _pw_fail("weak_password")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, " ".join(problems))

    users.update_one(
        {"_id": principal.user["_id"]},
        {
            "$set": {
                "hashed_password": hash_password(body.new_password),
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    # A changed password must end every OTHER session (stolen token => dead).
    ended = revoke_all_user_sessions(
        principal.user["_id"], "password_changed", except_session_id=principal.session_id
    )
    audit.emit(
        "auth.password_change.success", outcome="success", resource_type="account",
        target_relation="self", details={"sessions_revoked": ended},
    )
    return {"message": "Password changed", "other_sessions_revoked": ended}
