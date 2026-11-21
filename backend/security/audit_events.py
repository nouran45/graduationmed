"""
Route-level audit events (Phase 2).

The logging middleware records THAT a request happened (method, route, status,
latency). Audit events record what it MEANT: a login failed because of a bad
password, a patient tried to read somebody else's prescription, an inventory
write was authorised for branch X.

Usage (inside dependencies / route handlers):

    from security import audit_events as audit
    audit.emit("auth.login.failure", outcome="failure", subject_id=..., details={"reason": "bad_password"})

Events created during a request are buffered in the RequestContext and
finalised by the middleware (it adds status_code, latency_ms, route template),
so every audit event is complete and shares the request_id of the HTTP record.

emit() NEVER raises in production (a logging bug must not break a request).
With SECURITY_EVENTS_STRICT=true (used by the tests) it raises instead, so
mistakes such as an unknown event type are caught during development.
"""
from __future__ import annotations

import logging
from typing import Optional

from .config import get_settings
from .event_schema import EVENT_TYPES, SecurityEvent, classify_route
from .event_sink import get_sink
from .request_context import get_context
from .requestinfo import (
    account_pseudonym,
    new_request_id,
    target_pseudonym,
)

logger = logging.getLogger("medicheck.security.audit")

# ---- rule ids (Phase 4C catalogue; see docs/phase2) -----------------------
RULE_AUTH = "AUTH-01"          # protected operation requires valid authenticated identity
RULE_HISTORY = "HIST-01"       # patient may access only own history
RULE_RX_OWN = "RX-01"          # patient may read only own prescriptions
RULE_RX_BRANCH = "RX-02"       # pharmacist acts only for authorised branches
RULE_PHARM_ADMIN = "PHARM-01"  # pharmacy verification requires an administrator
RULE_PHARM_OWNER = "PHARM-02"  # pharmacy profile/branch/staff management requires an owner  (added in Phase 2)
RULE_INV_BRANCH = "INV-01"     # inventory access/modification requires branch membership
RULE_INV_OPS = "INV-02"        # stock changes must follow permitted operations
RULE_ADMIN = "ADMIN-01"        # admin-only operations require role admin  (added in Phase 2)


def ref(kind: str, value: str) -> str:
    """Pseudonymous reference to a targeted resource id."""
    return target_pseudonym(kind, value)


def emit(
    event_type: str,
    *,
    resource_type: Optional[str] = None,
    target_relation: Optional[str] = None,
    target_ref: Optional[str] = None,
    authorization_result: Optional[str] = None,
    rule_id: Optional[str] = None,
    outcome: Optional[str] = None,
    subject_email: Optional[str] = None,
    subject_id: Optional[str] = None,
    staff_role: Optional[str] = None,
    details: Optional[dict] = None,
) -> None:
    """Create an audit event for the current request. Safe to call anywhere."""
    try:
        ctx = get_context()
        if subject_email and not subject_id:
            subject_id = account_pseudonym(subject_email)       # raw e-mail never stored
        if staff_role and ctx is not None:
            ctx.set_staff_role(staff_role)

        event = SecurityEvent(
            event_type=event_type,
            source="audit",
            request_id=ctx.request_id if ctx else "req_internal_" + new_request_id()[4:],
            session_id=ctx.session_id if ctx else None,
            actor_id=ctx.actor_id if ctx else None,
            actor_role=ctx.actor_role if ctx else "anonymous",
            staff_role=staff_role or (ctx.staff_role if ctx else None),
            subject_id=subject_id,
            ip_hash=ctx.ip_hash if ctx else None,
            method=ctx.method if ctx else "",
            resource_type=resource_type,
            target_relation=target_relation,
            target_ref=target_ref,
            authorization_result=authorization_result,
            rule_id=rule_id,
            outcome=outcome,
            details=details or {},
        )
        if ctx is not None:
            ctx.add_pending(event)          # finalised by the middleware
        else:
            get_sink().emit(event.to_document())
    except Exception:  # noqa: BLE001
        if get_settings().security_events_strict:
            raise
        logger.exception("audit event %r could not be created", event_type)


# --------------------------------------------------------------------------
# helpers for the recurring patterns
# --------------------------------------------------------------------------
def token_invalid(reason: str, *, subject_id: Optional[str] = None) -> None:
    """reason: missing_token | expired_token | invalid_token | session_inactive | user_unavailable"""
    emit(
        "auth.token.invalid",
        authorization_result="denied",
        rule_id=RULE_AUTH,
        outcome="denied",
        target_relation="no_valid_identity",
        subject_id=subject_id,
        details={"reason": reason},
    )


def rate_limited(limiter: str) -> None:
    emit("resource.rate_limited", outcome="blocked", details={"limiter": limiter})


def authz(
    permission_or_type: str,
    allowed: bool,
    *,
    rule_id: str,
    resource_type: str,
    target_relation: str,
    target_ref: Optional[str] = None,
    staff_role: Optional[str] = None,
) -> None:
    """Authorization decision event: '<permission>.allowed' / '<permission>.denied'."""
    emit(
        f"{permission_or_type}.{'allowed' if allowed else 'denied'}",
        resource_type=resource_type,
        target_relation=target_relation,
        target_ref=target_ref,
        authorization_result="allowed" if allowed else "denied",
        rule_id=rule_id,
        outcome="success" if allowed else "denied",
        staff_role=staff_role,
        details={"permission": permission_or_type},
    )


def route_group_template() -> Optional[str]:
    ctx = get_context()
    return ctx.route_template() if ctx else None


def admin_rule_id() -> str:
    """PHARM-01 for the pharmacy-verification admin routes, ADMIN-01 for other admin-only routes."""
    tmpl = route_group_template() or ""
    return RULE_PHARM_ADMIN if tmpl.startswith("/api/admin/pharmacies") else RULE_ADMIN


__all__ = [
    "emit", "ref", "token_invalid", "rate_limited", "authz", "admin_rule_id",
    "RULE_AUTH", "RULE_HISTORY", "RULE_RX_OWN", "RULE_RX_BRANCH", "RULE_PHARM_ADMIN",
    "RULE_PHARM_OWNER", "RULE_INV_BRANCH", "RULE_INV_OPS", "RULE_ADMIN", "classify_route",
]
