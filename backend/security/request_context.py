"""
Per-request context for security events (Phase 2).

The logging middleware creates ONE RequestContext per request and stores it in
a ContextVar. Anything that runs during that request (dependencies, route
handlers, upload helpers) can reach it without needing the `Request` object:

    from security.request_context import add_detail
    add_detail("file_kind", "png")

It is a MUTABLE object shared by reference, so changes made in worker threads
(FastAPI runs sync dependencies in a thread pool) are visible to the middleware.

Everything stored here is derived by the server. Nothing is copied from
client-controlled headers.
"""
from __future__ import annotations

import threading
import time
from contextvars import ContextVar
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

from .requestinfo import actor_pseudonym, session_pseudonym


@dataclass
class RequestContext:
    request_id: str
    method: str
    ip_hash: Optional[str]
    started_perf: float = field(default_factory=time.perf_counter)
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    # filled in as the request is authenticated / authorised
    actor_id: Optional[str] = None
    actor_role: str = "anonymous"
    staff_role: Optional[str] = None
    session_id: Optional[str] = None

    # request-level facts (file_kind, size_bucket, model_route ...) - sanitised later
    details: dict = field(default_factory=dict)

    # audit events created during the request; finalised (status, latency)
    # by the middleware once the response status is known
    pending: list = field(default_factory=list)

    scope: Optional[dict] = None          # ASGI scope (to read the matched route)
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    # -- mutation helpers (thread-safe) -----------------------------------
    def set_actor(self, user_id: str, role: str, session_id: Optional[str]) -> None:
        with self._lock:
            self.actor_id = actor_pseudonym(user_id)
            self.actor_role = role if role in ("patient", "admin") else "patient"
            self.session_id = _session_pseudonym_or_none(session_id)

    def set_staff_role(self, staff_role: Optional[str]) -> None:
        with self._lock:
            self.staff_role = staff_role

    def add_detail(self, key: str, value: Any) -> None:
        with self._lock:
            self.details[key] = value

    def add_pending(self, event: Any) -> None:
        with self._lock:
            self.pending.append(event)

    def route_template(self) -> Optional[str]:
        route = (self.scope or {}).get("route")
        return getattr(route, "path", None)

    def elapsed_ms(self) -> int:
        return int((time.perf_counter() - self.started_perf) * 1000)


def _session_pseudonym_or_none(session_id: Optional[str]) -> Optional[str]:   # small indirection keeps set_actor readable
    return session_pseudonym(session_id) if session_id else None


_current: ContextVar[Optional[RequestContext]] = ContextVar("security_request_context", default=None)


def get_context() -> Optional[RequestContext]:
    return _current.get()


def set_context(ctx: RequestContext):
    return _current.set(ctx)


def reset_context(token) -> None:
    _current.reset(token)


def add_detail(key: str, value: Any) -> None:
    """Attach a (sanitised later) fact to the current request. No-op outside a request."""
    ctx = _current.get()
    if ctx is not None:
        ctx.add_detail(key, value)
