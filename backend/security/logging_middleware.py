"""
Centralised request logging (Phase 2, step 2.1).

For EVERY request that reaches the application this middleware:
  1. opens a RequestContext (request_id, ip_hash, start time),
  2. lets the request run,
  3. after the status code is known, writes
        seq 0   one `<group>.request` record (the general metadata record),
        seq 1.. every audit event created during the request (finalised here),
        last    for model routes, one `inference.completed|rejected|failed` record.

It NEVER interferes with the request: any error while logging is swallowed and
reported to the server log only. Request/response bodies, query strings, raw
paths, User-Agent and credentials are never read.

Placement (see app.py): CORS > SecurityLoggingMiddleware > RequestContextMiddleware > routes.
Being OUTSIDE RequestContextMiddleware means early rejections (e.g. 413 oversized
body) are still logged.
"""
from __future__ import annotations

import logging

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from .config import get_settings
from .event_schema import SecurityEvent, classify_route, resolve_template
from .event_sink import get_sink
from .request_context import RequestContext, reset_context, set_context
from .requestinfo import client_ip, new_request_id, pseudonymize

logger = logging.getLogger("medicheck.security.http")

_SKIP_PATHS = frozenset({"/favicon.ico", "/docs", "/openapi.json", "/redoc"})

# status -> inference outcome (401/403/429 are recorded by auth / authz / rate-limit events)
_INFERENCE_REASON = {400: "invalid_input", 413: "too_large", 415: "unsupported_type", 422: "validation_error"}


def _outcome(status: int) -> str:
    if status < 400:
        return "success"
    if status in (401, 403):
        return "denied"
    if status == 429:
        return "blocked"
    if status >= 500:
        return "error"
    return "rejected"


class SecurityLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not get_settings().security_events_enabled or request.url.path in _SKIP_PATHS:
            return await call_next(request)

        # The request id is created HERE (outermost app middleware); RequestContextMiddleware reuses it.
        rid = getattr(request.state, "request_id", None) or new_request_id()
        request.state.request_id = rid

        ctx = RequestContext(
            request_id=rid,
            method=request.method,
            ip_hash="ip_" + pseudonymize(client_ip(request), "event-ip")[:16],
            scope=request.scope,
        )
        token = set_context(ctx)
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            return response
        except Exception:
            status = 500          # the safe 500 handler responds; we only record
            raise
        finally:
            try:
                self._finalize(ctx, request.scope, status)
            except Exception:  # noqa: BLE001 - logging must never break a request
                logger.exception("security event finalisation failed")
            reset_context(token)

    # ------------------------------------------------------------------
    @staticmethod
    def _finalize(ctx: RequestContext, scope: dict, status: int) -> None:
        template = resolve_template(scope)
        info = classify_route(template)
        latency = ctx.elapsed_ms()
        sink = get_sink()
        common = dict(
            request_id=ctx.request_id,
            session_id=ctx.session_id,
            actor_id=ctx.actor_id,
            actor_role=ctx.actor_role,
            staff_role=ctx.staff_role,
            ip_hash=ctx.ip_hash,
            method=ctx.method,
            endpoint_template=template,
            service_name=info.service,
            route_sensitivity=info.sensitivity,
            status_code=status,
            latency_ms=latency,
        )

        # 0 - general request record (stamped with the request START time)
        http_event = SecurityEvent(
            event_type=f"{info.group}.request" if info.group != "other" else "http.request",
            source="middleware",
            seq=0,
            timestamp=ctx.started_at.replace(microsecond=(ctx.started_at.microsecond // 1000) * 1000),
            resource_type=info.resource_type,
            outcome=_outcome(status),
            details=dict(ctx.details),
            **common,
        )
        sink.emit(http_event.to_document())

        # 1.. - audit events raised by dependencies / handlers
        seq = 0
        for ev in list(ctx.pending):
            seq += 1
            merged = {
                **ev.model_dump(),
                "seq": seq,
                "endpoint_template": template,
                "service_name": info.service,
                "route_sensitivity": info.sensitivity,
                "status_code": status,
                "latency_ms": latency,
                # actor may have been established after the event was created (login)
                "actor_id": ev.actor_id or ctx.actor_id,
                "session_id": ev.session_id or ctx.session_id,
                "actor_role": ev.actor_role if ev.actor_id else ctx.actor_role,
                "staff_role": ev.staff_role or ctx.staff_role,
                "sig": None,
            }
            sink.emit(SecurityEvent(**merged).to_document())

        # last - model-usage outcome derived from the HTTP result
        if info.group == "inference" and status not in (401, 403, 429):
            seq += 1
            if status < 400:
                etype, details = "inference.completed", dict(ctx.details)
            elif status >= 500:
                etype, details = "inference.failed", {"status_class": "5xx"}
            else:
                etype = "inference.rejected"
                details = {"reason": _INFERENCE_REASON.get(status, "client_error"), **ctx.details}
            sink.emit(
                SecurityEvent(
                    event_type=etype,
                    source="audit",
                    seq=seq,
                    resource_type="model",
                    outcome="success" if status < 400 else ("error" if status >= 500 else "rejected"),
                    details=details,
                    **common,
                ).to_document()
            )
