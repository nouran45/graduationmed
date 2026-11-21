"""
Persistent failed-login throttling.

Stored in MongoDB (not in process memory) so it keeps working with several
backend instances and survives restarts. Keys are keyed hashes, so the
collection never holds raw e-mail addresses of non-existent accounts.

The lock applies to an e-mail *whether or not the account exists*, so lock
behaviour cannot be used to discover registered addresses.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from database import login_attempts_collection

from .config import get_settings
from .requestinfo import pseudonymize
from .sessions import as_naive_utc


def _keys(email: str, ip: str) -> tuple[str, str]:
    return (
        "email:" + pseudonymize(email, "login-email"),
        "ip:" + pseudonymize(ip, "login-ip"),
    )


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _retry_after(key: str, limit: int, window: int) -> Optional[int]:
    since = _now() - timedelta(seconds=window)
    docs = list(
        login_attempts_collection.find({"key": key, "at": {"$gt": since}}).sort("at", 1)
    )
    if len(docs) < limit:
        return None
    # The lock lifts when the OLDEST counted failure leaves the window enough
    # that fewer than `limit` remain: i.e. when docs[len-limit] expires.
    pivot = as_naive_utc(docs[len(docs) - limit]["at"])
    lifts_at = pivot + timedelta(seconds=window)
    remaining = (lifts_at - as_naive_utc(_now())).total_seconds()
    return max(1, int(remaining) + 1)


def check_login_allowed(email: str, ip: str) -> Optional[int]:
    """Return None if allowed, else seconds to wait (for Retry-After)."""
    s = get_settings()
    k_email, k_ip = _keys(email, ip)
    waits = [
        _retry_after(k_email, s.login_max_failures_per_email, s.login_window_seconds),
        _retry_after(k_ip, s.login_max_failures_per_ip, s.login_window_seconds),
    ]
    waits = [w for w in waits if w is not None]
    return max(waits) if waits else None


def record_login_failure(email: str, ip: str) -> None:
    now = _now()
    ttl = get_settings().login_window_seconds
    k_email, k_ip = _keys(email, ip)
    login_attempts_collection.insert_many(
        [
            {"key": k_email, "at": now, "expire_at": now + timedelta(seconds=ttl * 2)},
            {"key": k_ip, "at": now, "expire_at": now + timedelta(seconds=ttl * 2)},
        ]
    )


def clear_login_failures(email: str) -> None:
    """After a successful login forget the e-mail's failures (not the IP's)."""
    k_email, _ = _keys(email, "")
    login_attempts_collection.delete_many({"key": k_email})
