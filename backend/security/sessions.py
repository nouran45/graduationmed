"""
Server-side sessions.

The old design: JWT = {sub: email, exp}. Nothing on the server could say
"this token is no longer valid", so logout was cosmetic and the future
response engine could not cut off a suspicious session.

New design: the JWT carries a session id (`sid`). A request is accepted only
if the matching row in the `sessions` collection is neither revoked nor
expired. Revocation = set `revoked_at`.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from bson import ObjectId

from database import sessions_collection

from .requestinfo import actor_pseudonym, pseudonymize, session_pseudonym

PURGE_AFTER_EXPIRY = timedelta(days=7)   # keep expired rows for investigation


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def as_naive_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """PyMongo returns naive-UTC datetimes by default; normalise both sides."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def create_session(
    user_id: ObjectId,
    ttl_minutes: int,
    ip: str,
    user_agent: str | None,
) -> dict:
    now = utcnow()
    session_id = "ses_" + uuid.uuid4().hex
    doc = {
        "session_id": session_id,
        # Pseudonyms as they appear in security events. Stored here so the
        # response engine (Phase 6) can map an alert back to a real session.
        "session_pseudonym": session_pseudonym(session_id),
        "actor_pseudonym": actor_pseudonym(str(user_id)),
        "user_id": user_id,
        "created_at": now,
        "last_seen_at": now,
        "expires_at": now + timedelta(minutes=ttl_minutes),
        "purge_at": now + timedelta(minutes=ttl_minutes) + PURGE_AFTER_EXPIRY,
        "revoked_at": None,
        "revoked_reason": None,
        # pseudonymous: lets Phase 2/4 correlate sessions by network origin
        "ip_hash": pseudonymize(ip, "ip"),
        "user_agent": (user_agent or "")[:200],
    }
    sessions_collection.insert_one(doc)
    return doc


def get_active_session(session_id: str) -> Optional[dict]:
    doc = sessions_collection.find_one({"session_id": session_id})
    if doc is None:
        return None
    if doc.get("revoked_at") is not None:
        return None
    if as_naive_utc(doc["expires_at"]) <= as_naive_utc(utcnow()):
        return None
    return doc


def touch_session(doc: dict, min_interval_seconds: int = 300) -> None:
    """Update last_seen_at at most every few minutes (avoid a write per request)."""
    last = as_naive_utc(doc.get("last_seen_at"))
    now = utcnow()
    if last is None or (as_naive_utc(now) - last).total_seconds() >= min_interval_seconds:
        sessions_collection.update_one(
            {"session_id": doc["session_id"]}, {"$set": {"last_seen_at": now}}
        )


def revoke_session(session_id: str, reason: str) -> bool:
    res = sessions_collection.update_one(
        {"session_id": session_id, "revoked_at": None},
        {"$set": {"revoked_at": utcnow(), "revoked_reason": reason}},
    )
    return res.modified_count == 1


def revoke_all_user_sessions(
    user_id: ObjectId,
    reason: str,
    except_session_id: str | None = None,
) -> int:
    query: dict = {"user_id": user_id, "revoked_at": None}
    if except_session_id:
        query["session_id"] = {"$ne": except_session_id}
    res = sessions_collection.update_many(
        query, {"$set": {"revoked_at": utcnow(), "revoked_reason": reason}}
    )
    return res.modified_count
