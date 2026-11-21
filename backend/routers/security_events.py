"""
Admin-only READ access to the security event store (Phase 2).

There is deliberately NO write endpoint: events are created by server code only,
so no frontend user can submit a "trusted audit record".

GET /api/security/events         list (newest first), filterable
GET /api/security/events/stats   sink health + counters

(Beyond the Phase 2 plan: needed to verify the acceptance test on a running
server, and reused by the Phase 7 dashboard.)
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from database import security_events_collection
from security import audit_events as audit
from security.authorization import require_admin
from security.event_schema import EVENT_TYPES, verify_document
from security.event_sink import get_sink

router = APIRouter(prefix="/api/security", tags=["Security events (admin)"])


def _public(doc: dict) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id"}
    ts = out.get("timestamp")
    if isinstance(ts, datetime):
        out["timestamp"] = ts.replace(tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + f"{ts.microsecond // 1000:03d}Z"
    out["sig_valid"] = verify_document(doc)      # False => the stored row was altered
    out.pop("sig", None)
    return out


@router.get("/events")
def list_events(
    request_id: Optional[str] = Query(None, max_length=64),
    event_type: Optional[str] = Query(None, max_length=64),
    actor_id: Optional[str] = Query(None, max_length=64),
    session_id: Optional[str] = Query(None, max_length=64),
    source: Optional[str] = Query(None, pattern="^(middleware|audit)$"),
    limit: int = Query(50, ge=1, le=200),
    _admin: dict = Depends(require_admin),
):
    if event_type and event_type not in EVENT_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown event_type.")

    get_sink().flush(timeout=1.0)           # let very recent events land
    query = {
        k: v for k, v in {
            "request_id": request_id, "event_type": event_type,
            "actor_id": actor_id, "session_id": session_id, "source": source,
        }.items() if v
    }
    docs = list(
        security_events_collection.find(query).sort([("timestamp", -1), ("seq", -1)]).limit(limit)
    )
    audit.emit("security.events.read", outcome="success", resource_type="security_events",
               details={"record_count": len(docs)})
    return [_public(d) for d in docs]


@router.get("/events/stats")
def event_stats(_admin: dict = Depends(require_admin)):
    sink = get_sink()
    sink.flush(timeout=1.0)
    return {
        "sink": sink.stats(),
        "stored_events": security_events_collection.estimated_document_count(),
    }
