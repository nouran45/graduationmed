"""
Request quotas (sliding window, in-process).

LIMITATION (be honest about it in the defence):
    The counters live in this process. On a single Hugging Face Space replica
    that is exactly right. With several replicas each one counts separately.
    Phase 6 therefore moves enforcement to a shared store (MongoDB/Redis).
    The dependency interface below will not change when that happens.
"""
from __future__ import annotations

import threading
import time
from collections import deque
from typing import Optional

from fastapi import Depends, HTTPException, Request, status

from . import audit_events as audit
from .config import get_settings
from .identity import Principal, get_current_principal
from .requestinfo import client_ip


class SlidingWindowLimiter:
    def __init__(self, max_keys: int = 50_000) -> None:
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()
        self._max_keys = max_keys

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def hit(self, key: str, limit: int, window_s: int) -> Optional[int]:
        """Register one request. Return None if allowed, else Retry-After secs."""
        now = time.monotonic()
        with self._lock:
            if len(self._hits) > self._max_keys:
                self._gc(now, window_s)
            q = self._hits.setdefault(key, deque())
            while q and now - q[0] >= window_s:
                q.popleft()
            if len(q) >= limit:
                return max(1, int(window_s - (now - q[0])) + 1)
            q.append(now)
            return None

    def _gc(self, now: float, window_s: int) -> None:
        dead = [k for k, q in self._hits.items() if not q or now - q[-1] >= window_s]
        for k in dead:
            del self._hits[k]


limiter = SlidingWindowLimiter()


def _too_many(retry_after: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Too many requests. Please slow down and try again shortly.",
        headers={"Retry-After": str(retry_after)},
    )


def rate_limit(name: str, setting: str, per_seconds: int):
    """Per-authenticated-user quota. `setting` names a Settings attribute."""

    def dependency(principal: Principal = Depends(get_current_principal)) -> None:
        s = get_settings()
        if not s.rate_limits_enabled:
            return
        wait = limiter.hit(f"{name}:u:{principal.user_id}", getattr(s, setting), per_seconds)
        if wait is not None:
            audit.rate_limited(name)
            raise _too_many(wait)

    return dependency


def ip_rate_limit(name: str, setting: str, per_seconds: int):
    """Per-client-IP quota for unauthenticated endpoints (register)."""

    def dependency(request: Request) -> None:
        s = get_settings()
        if not s.rate_limits_enabled:
            return
        wait = limiter.hit(f"{name}:ip:{client_ip(request)}", getattr(s, setting), per_seconds)
        if wait is not None:
            audit.rate_limited(name)
            raise _too_many(wait)

    return dependency
