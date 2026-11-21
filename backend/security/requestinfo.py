"""
Helpers that derive request facts *without trusting the client*.
"""
from __future__ import annotations

import hashlib
import hmac
import uuid

from fastapi import Request

from .config import get_settings


def new_request_id() -> str:
    # Always generated server-side. A client-sent X-Request-ID is ignored so
    # attackers cannot forge correlation IDs in the Phase 2 audit trail.
    return "req_" + uuid.uuid4().hex[:20]


def get_request_id(request: Request) -> str:
    rid = getattr(request.state, "request_id", None)
    if not rid:
        rid = new_request_id()
        request.state.request_id = rid
    return rid


def client_ip(request: Request) -> str:
    """
    Best-effort client IP.

    Behind Hugging Face / Vercel the TCP peer is the proxy, and the real
    address is in X-Forwarded-For. That header can also be *forged by the
    client*, but each trusted proxy APPENDS the address it saw. So with N
    trusted proxies the real client is the N-th entry from the RIGHT, and
    anything further left is attacker-controlled and ignored.
    """
    n = get_settings().trusted_proxy_count
    xff = request.headers.get("x-forwarded-for")
    if n > 0 and xff:
        parts = [p.strip() for p in xff.split(",") if p.strip()]
        if len(parts) >= n:
            return parts[-n]
    return request.client.host if request.client else "unknown"


def pseudonymize(value: str, purpose: str) -> str:
    """
    Keyed hash (HMAC-SHA256) of an identifier such as an IP or e-mail.

    Used where we need to *correlate* (same IP failed 25 times) but must not
    store the raw value. `purpose` domain-separates the hashes so an IP hash
    can never be compared with an e-mail hash.
    """
    key = get_settings().secret_key.encode()
    msg = f"{purpose}:{value}".encode()
    return hmac.new(key, msg, hashlib.sha256).hexdigest()[:32]


# --------------------------------------------------------------------------
# Pseudonyms used in security events (Phase 2).
#
# Deterministic keyed hashes: the same user always maps to the same actor_id,
# so detectors can correlate behaviour, but the value cannot be turned back
# into a user id / e-mail / session id without the server's secret key.
# --------------------------------------------------------------------------
def actor_pseudonym(user_id: str) -> str:
    return "actor_" + pseudonymize(str(user_id), "actor")[:16]


def session_pseudonym(session_id: str) -> str:
    return "session_" + pseudonymize(str(session_id), "session")[:16]


def account_pseudonym(email: str) -> str:
    """Pseudonym of an ACCOUNT NAME (the e-mail a login attempt names)."""
    return "acct_" + pseudonymize(email.strip().lower(), "account")[:16]


def target_pseudonym(kind: str, value: str) -> str:
    """Pseudonymous reference to a targeted resource (prescription id, branch id, ...)."""
    return "ref_" + pseudonymize(str(value), f"target:{kind}")[:16]
