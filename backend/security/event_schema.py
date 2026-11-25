"""
Security event schema (Phase 2).

One event = one fact about one request, written by the SERVER only.

Design rules
------------
1. CLOSED VOCABULARY. `event_type` must be listed in EVENT_TYPES. Detectors
   (XGBoost features, GRU vocabulary, context rules) need a stable alphabet;
   free-form strings would silently break them.
2. NO SENSITIVE CONTENT. Only the fields below exist (extra="forbid"), and the
   free-form `details` dict is filtered by an allow-list of keys with short,
   charset-restricted values. Passwords, tokens, e-mails, names, medical
   values, file names and file contents cannot be stored by construction.
3. PSEUDONYMS. actor_id / session_id / subject_id / ip_hash / target_ref are keyed
   hashes (see requestinfo.py).
4. TRUSTED ORIGIN. Each stored event carries an HMAC signature `sig` over its
   canonical form. Later phases verify it before using an event as training or
   evidence data, so rows edited or inserted directly into MongoDB are detected.
5. NOT LOGGED ON PURPOSE: User-Agent, raw IP, query string, request/response
   bodies, raw URL path. (A User-Agent would let a model learn the shortcut
   "python-requests = attack" from our own scenario generator.)
"""
from __future__ import annotations

import hashlib
import hmac
import json
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .config import get_settings

SCHEMA_VERSION = "1.0"

Source = Literal["middleware", "audit"]
AuthzResult = Literal["allowed", "denied", "not_applicable"]
Outcome = Literal["success", "failure", "denied", "rejected", "blocked", "error"]
ActorRole = Literal["anonymous", "patient", "admin"]
Sensitivity = Literal["low", "medium", "high"]


# ==========================================================================
# 1. Event vocabulary
# ==========================================================================
# event_type -> (category, source)
EVENT_TYPES: dict[str, tuple[str, str]] = {}


def _reg(event_type: str, category: str, source: str = "audit") -> None:
    EVENT_TYPES[event_type] = (category, source)


# -- generic per-request records (source = middleware) ---------------------
for _t, _c in [
    ("http.request", "http"),
    ("auth.request", "auth"),
    ("inference.request", "inference"),
    ("history.request", "history"),
    ("prescription.request", "prescription"),
    ("pharmacy.request", "pharmacy"),
    ("inventory.request", "inventory"),
    ("admin.request", "admin"),
    ("security.request", "security"),
]:
    _reg(_t, _c, "middleware")

# -- authentication --------------------------------------------------------
for _t in [
    "auth.register.success", "auth.register.failure",
    "auth.login.success", "auth.login.failure", "auth.login.locked",
    "auth.token.invalid", "auth.verify_token.success",
    "auth.logout.success", "auth.logout_all.success",
    "auth.password_change.success", "auth.password_change.failure",
]:
    _reg(_t, "auth")

# -- resource limits -------------------------------------------------------
_reg("resource.rate_limited", "resource")

# -- medical model usage (derived from the HTTP outcome) -------------------
for _t in ["inference.completed", "inference.rejected", "inference.failed"]:
    _reg(_t, "inference")

# -- authorization decisions -----------------------------------------------
_reg("admin.access.allowed", "authorization")
_reg("admin.access.denied", "authorization")
PERMISSIONS = (
    "pharmacy.read", "pharmacy.manage",
    "prescription.read", "prescription.review",
    "inventory.read", "inventory.write",
)
for _p in PERMISSIONS:
    _reg(f"{_p}.allowed", "authorization")
    _reg(f"{_p}.denied", "authorization")

# -- database-sensitive operations -----------------------------------------
for _t in ["history.read.allowed", "history.write.allowed", "admin.users.listed"]:
    _reg(_t, "history" if _t.startswith("history") else "admin")
for _t in [
    "prescription.upload.accepted", "prescription.upload.rejected",
    "prescription.read.allowed", "prescription.read.denied",
    "prescription.review.completed", "prescription.review.rejected",
]:
    _reg(_t, "prescription")
for _t in [
    "pharmacy.created", "pharmacy.verification.submitted", "pharmacy.verification.reviewed",
    "pharmacy.staff.granted", "pharmacy.staff.revoked",
]:
    _reg(_t, "pharmacy")
for _t in ["inventory.write.completed", "inventory.write.rejected"]:
    _reg(_t, "inventory")
_reg("security.events.read", "security")

# -- admin user management (added with the role-management screen) ----------
_reg("admin.user.created", "admin")
_reg("admin.user.role_changed", "admin")
_reg("admin.user.rejected", "admin")

# -- public pharmacy catalogue (teammate's module) ----------------------------
_reg("pharmacy.catalogue_sync.started", "pharmacy")
_reg("pharmacy.catalogue_sync.denied", "pharmacy")


# ==========================================================================
# 2. Route registry  (template -> service / group / sensitivity)
# ==========================================================================
@dataclass(frozen=True)
class RouteInfo:
    service: str
    group: str            # auth | inference | history | prescription | pharmacy | inventory | admin | security | other
    sensitivity: str      # low | medium | high   (initial values, tuned in Phase 5)
    resource_type: Optional[str] = None


_STATIC: dict[str, RouteInfo] = {
    "/": RouteInfo("health_check", "other", "low"),
    "/register": RouteInfo("registration", "auth", "medium", "account"),
    "/login": RouteInfo("login", "auth", "medium", "account"),
    "/logout": RouteInfo("logout", "auth", "low", "session"),
    "/logout-all": RouteInfo("logout_all", "auth", "low", "session"),
    "/verify-token": RouteInfo("token_verification", "auth", "low", "session"),
    "/users/me": RouteInfo("own_profile", "auth", "low", "account"),
    "/auth/change-password": RouteInfo("password_change", "auth", "high", "account"),
    "/predict": RouteInfo("skin_classification", "inference", "medium", "model"),
    "/predict-skin-defense": RouteInfo("skin_defense_pipeline", "inference", "medium", "model"),
    "/predict-diabetes": RouteInfo("diabetes_prediction", "inference", "medium", "model"),
    "/predict-kidney": RouteInfo("kidney_prediction", "inference", "medium", "model"),
    "/predict-fracture": RouteInfo("fracture_detection", "inference", "medium", "model"),
    "/predict-heart": RouteInfo("heart_disease_prediction", "inference", "medium", "model"),
    "/predict-anemia": RouteInfo("anemia_prediction", "inference", "medium", "model"),
    "/predict-skin-defense/health": RouteInfo("skin_defense_health", "admin", "medium", "system"),
    "/save-history": RouteInfo("history_write", "history", "medium", "medical_history"),
    "/history": RouteInfo("history_read", "history", "high", "medical_history"),
    "/dashboard-history": RouteInfo("history_dashboard", "history", "high", "medical_history"),
    "/users": RouteInfo("user_directory", "admin", "high", "user_directory"),
    "/api/prescriptions": RouteInfo("prescription_upload", "prescription", "high", "prescription"),
    "/api/prescriptions/pharmacy/queue": RouteInfo("prescription_queue", "prescription", "high", "prescription"),
    "/api/pharmacies": RouteInfo("pharmacy_registration", "pharmacy", "high", "pharmacy"),
    "/api/branches/public": RouteInfo("public_branch_listing", "pharmacy", "low", "pharmacy_branch"),
    "/api/me/branches": RouteInfo("own_branches", "pharmacy", "low", "pharmacy_branch"),
    "/api/inventory": RouteInfo("inventory_list_create", "inventory", "high", "inventory"),
    "/api/inventory/dashboard": RouteInfo("inventory_dashboard", "inventory", "medium", "inventory"),
    "/api/inventory/intake/manual": RouteInfo("inventory_manual_intake", "inventory", "high", "inventory"),
    "/api/inventory/intake/validate-csv": RouteInfo("inventory_csv_validation", "inventory", "medium", "inventory"),
    "/api/inventory/intake/import": RouteInfo("inventory_import", "inventory", "high", "inventory"),
    "/api/admin/pharmacies/pending": RouteInfo("pharmacy_verification_queue", "admin", "high", "pharmacy"),
    "/api/security/events": RouteInfo("security_event_viewer", "security", "high", "security_events"),
    "/api/security/events/stats": RouteInfo("security_event_stats", "security", "medium", "security_events"),
    # admin user / role management
    "/api/admin/users": RouteInfo("admin_user_create", "admin", "high", "account"),
    "/api/admin/pharmacies": RouteInfo("admin_pharmacy_directory", "admin", "medium", "pharmacy"),
    "/api/cart": RouteInfo("cart_read", "pharmacy", "medium", "cart"),
    "/api/cart/items": RouteInfo("cart_update", "pharmacy", "medium", "cart"),
    # public pharmacy catalogue (read-only product data imported from PharmaSync)
    "/api/catalogue/products": RouteInfo("catalogue_search", "pharmacy", "low", "catalogue"),
    "/api/catalogue/categories": RouteInfo("catalogue_categories", "pharmacy", "low", "catalogue"),
    "/api/catalogue/admin/sync/start": RouteInfo("catalogue_sync_start", "admin", "high", "catalogue"),
    "/api/catalogue/admin/sync/status": RouteInfo("catalogue_sync_status", "admin", "medium", "catalogue"),
}

STATIC_PATHS = frozenset(_STATIC)

UNKNOWN_ROUTE = RouteInfo("unknown", "other", "low")


def classify_route(template: str) -> RouteInfo:
    """Map a route TEMPLATE (never a raw URL) to service/group/sensitivity."""
    if template in _STATIC:
        return _STATIC[template]

    if template.startswith("/api/prescriptions/"):
        if "/pharmacy/" in template or template.endswith("/review"):
            return RouteInfo("prescription_pharmacy", "prescription", "high", "prescription")
        return RouteInfo("prescription_patient_read", "prescription", "high", "prescription")
    if template.startswith("/api/inventory/"):
        return RouteInfo("inventory_item", "inventory", "high", "inventory")
    if template.startswith("/api/admin/users/"):
        return RouteInfo("admin_user_role_change", "admin", "high", "account")
    if template.startswith("/api/admin/"):
        return RouteInfo("pharmacy_verification_review", "admin", "high", "pharmacy")
    if template.startswith("/api/catalogue/products/"):
        return RouteInfo("catalogue_product", "pharmacy", "low", "catalogue")
    if template.startswith(("/api/pharmacies/", "/api/branches/")):
        return RouteInfo("pharmacy_network", "pharmacy", "high", "pharmacy")
    return UNKNOWN_ROUTE


def resolve_template(scope: dict) -> str:
    """
    The matched route template, e.g. "/api/prescriptions/{prescription_id}".

    Unmatched requests (404 scans) are NOT logged with their raw path: a path
    fuzzer would create unbounded, attacker-controlled values. The only
    exception is an exact match of a known static path (e.g. an early 413).
    """
    route = scope.get("route")
    path = getattr(route, "path", None)
    if path:
        return path
    raw = scope.get("path", "")
    return raw if raw in STATIC_PATHS else "<unmatched>"


# ==========================================================================
# 3. details sanitiser (the "no sensitive content" guard)
# ==========================================================================
ALLOWED_DETAIL_KEYS = frozenset(
    {
        "reason", "operation", "limiter", "permission", "model_route",
        "record_count", "row_count", "file_kind", "size_bucket", "decision",
        "staff_role", "sessions_revoked", "status_class", "platform_role",
    }
)
_SAFE_STR = re.compile(r"^[A-Za-z0-9_.:/\- ]{1,64}$")
_JWT_LIKE = re.compile(r"[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}")


def sanitize_details(details: Optional[dict]) -> dict:
    out: dict[str, Any] = {}
    for key, value in (details or {}).items():
        if key not in ALLOWED_DETAIL_KEYS:
            continue                                   # unknown key: dropped
        if isinstance(value, bool) or isinstance(value, (int, float)):
            out[key] = value
        elif isinstance(value, str):
            if "@" in value or _JWT_LIKE.search(value) or not _SAFE_STR.match(value):
                out[key] = "[redacted]"
            else:
                out[key] = value
        # lists / dicts / objects: dropped
    return out


# ==========================================================================
# 4. The event
# ==========================================================================
def _ms_now() -> datetime:
    """UTC now, truncated to MILLISECONDS (MongoDB stores ms; keeps the signature stable)."""
    now = datetime.now(timezone.utc)
    return now.replace(microsecond=(now.microsecond // 1000) * 1000)


class SecurityEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = SCHEMA_VERSION
    event_id: str = Field(default_factory=lambda: "evt_" + uuid.uuid4().hex)
    timestamp: datetime = Field(default_factory=_ms_now)
    seq: int = 0                                  # order inside one request (0 = request record)
    source: Source = "audit"

    event_type: str
    event_category: str = ""

    request_id: str
    session_id: Optional[str] = None              # pseudonym
    actor_id: Optional[str] = None                # pseudonym of the authenticated user
    actor_role: ActorRole = "anonymous"           # platform role from the DB
    staff_role: Optional[str] = None              # owner | pharmacist | inventory (membership), if acting as staff
    subject_id: Optional[str] = None              # pseudonym of the ACCOUNT NAME an auth event concerns
    ip_hash: Optional[str] = None

    method: str = ""
    endpoint_template: str = ""
    service_name: str = ""
    route_sensitivity: Sensitivity = "low"

    resource_type: Optional[str] = None
    target_relation: Optional[str] = None         # self | other_patient | not_staff_of_branch | ...
    target_ref: Optional[str] = None              # pseudonym of the targeted resource id
    authorization_result: Optional[AuthzResult] = None
    rule_id: Optional[str] = None                 # AUTH-01 | HIST-01 | RX-01 | RX-02 | PHARM-01 | ...
    outcome: Optional[Outcome] = None

    status_code: Optional[int] = None
    latency_ms: Optional[int] = None
    details: dict = Field(default_factory=dict)
    sig: Optional[str] = None

    @model_validator(mode="after")
    def _check(self) -> "SecurityEvent":
        info = EVENT_TYPES.get(self.event_type)
        if info is None:
            raise ValueError(f"unknown event_type {self.event_type!r}")
        self.event_category = info[0]
        self.details = sanitize_details(self.details)
        return self

    # ---- persistence -----------------------------------------------------
    def to_document(self) -> dict:
        doc = self.model_dump()
        doc["sig"] = sign_document(doc)
        return doc


# ==========================================================================
# 5. Signing / JSON-lines helpers
# ==========================================================================
def iso(ts: datetime) -> str:
    if ts.tzinfo is not None:
        ts = ts.astimezone(timezone.utc)
    return ts.strftime("%Y-%m-%dT%H:%M:%S.") + f"{ts.microsecond // 1000:03d}Z"


def _canonical(doc: dict) -> bytes:
    body = {k: v for k, v in doc.items() if k not in ("sig", "_id")}
    body["timestamp"] = iso(body["timestamp"]) if isinstance(body["timestamp"], datetime) else body["timestamp"]
    return json.dumps(body, sort_keys=True, separators=(",", ":"), default=str).encode()


def sign_document(doc: dict) -> str:
    key = get_settings().security_event_signing_key.encode()
    return hmac.new(key, _canonical(doc), hashlib.sha256).hexdigest()


def verify_document(doc: dict) -> bool:
    sig = doc.get("sig")
    return bool(sig) and hmac.compare_digest(sig, sign_document(doc))


def document_to_json_line(doc: dict) -> str:
    body = {k: v for k, v in doc.items() if k != "_id"}
    body["timestamp"] = iso(body["timestamp"])
    return json.dumps(body, sort_keys=True, separators=(",", ":"), default=str)


def json_line_to_document(line: str) -> dict:
    doc = json.loads(line)
    doc["timestamp"] = datetime.strptime(doc["timestamp"], "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=timezone.utc)
    return doc
