"""
Cross-cutting HTTP protections.

Phase 1 : request id, oversized-body rejection, basic security headers,
          safe 500 responses (no exception text leaked to clients).
Phase 2 : the structured security-event middleware will be added NEXT TO this
          one and will read request.state.request_id / actor_id / session_id,
          which this package already sets.
"""
from __future__ import annotations

import logging
import time

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .config import get_settings
from .requestinfo import get_request_id, new_request_id

logger = logging.getLogger("medicheck.http")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # SecurityLoggingMiddleware (outside this one) creates the id; reuse it.
        rid = getattr(request.state, "request_id", None) or new_request_id()
        request.state.request_id = rid
        started = time.perf_counter()

        declared = request.headers.get("content-length")
        if declared and declared.isdigit() and int(declared) > get_settings().max_request_bytes:
            return JSONResponse(
                {"detail": "Request body too large.", "request_id": rid},
                status_code=413,
                headers={"X-Request-ID": rid},
            )

        response = await call_next(request)

        request.state.latency_ms = int((time.perf_counter() - started) * 1000)
        response.headers["X-Request-ID"] = rid
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        # API responses can contain personal medical data -> never cache them.
        response.headers.setdefault("Cache-Control", "no-store")
        return response


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    rid = get_request_id(request)
    # Full detail goes to the SERVER log only.
    logger.error(
        "Unhandled error request_id=%s %s %s",
        rid, request.method, request.url.path, exc_info=exc,
    )
    return JSONResponse(
        {"detail": "Internal server error.", "request_id": rid},
        status_code=500,
        headers={"X-Request-ID": rid},
    )
