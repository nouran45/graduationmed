"""
Public pharmacy catalogue (product data imported from PharmaSync).

Endpoints, paths and response shapes are the teammate's original design. Security changes
made during the merge with the Grad 2 security work (see docs/merge_pharmacy_catalogue.md):

* Public read routes stay public (patient-facing product browsing) but now have
    - length limits on every free-text / id parameter, and
    - a per-client-IP rate limit (CATALOGUE_PER_MINUTE, default 120/min), because each
      search runs case-insensitive regex matches over the whole catalogue.
* The synchronization routes now require a signed-in ADMINISTRATOR session (auditable,
  revocable, rate limited). The shared X-Catalogue-Sync-Key header is still required as a
  second factor whenever CATALOGUE_SYNC_ADMIN_KEY is configured.
* Every sync attempt is recorded as a security event (Phase 2).
"""
import hmac
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query

from security import audit_events as audit
from security.authorization import require_admin
from security.rate_limit import ip_rate_limit, rate_limit
from services.pharmacy_catalogue_service import (
    start_catalogue_sync,
    get_sync_status,
    list_catalogue_products,
    get_catalogue_listing,
    get_catalogue_offers,
    list_catalogue_categories,
)

router = APIRouter(
    prefix="/api/catalogue",
    tags=["Pharmacy Catalogue"],
)

_public_limit = ip_rate_limit("catalogue", "catalogue_per_minute", 60)
_sync_limit = rate_limit("catalogue_sync", "admin_write_per_minute", 60)

ID_MAX = 64
TEXT_MAX = 100


def verify_sync_key(x_catalogue_sync_key: str | None):
    """
    Second factor for the sync routes (the first factor is the admin session).

    If CATALOGUE_SYNC_ADMIN_KEY is configured the header must match it (constant-time
    comparison). If it is not configured, the admin session alone is required.
    """
    expected = os.getenv("CATALOGUE_SYNC_ADMIN_KEY", "")

    if not expected:
        return

    if (
        not x_catalogue_sync_key
        or not hmac.compare_digest(expected, x_catalogue_sync_key)
    ):
        audit.emit(
            "pharmacy.catalogue_sync.denied", outcome="denied", resource_type="catalogue",
            authorization_result="denied", rule_id=audit.RULE_ADMIN, details={"reason": "bad_sync_key"},
        )
        raise HTTPException(
            status_code=401,
            detail="Invalid catalogue synchronization credentials.",
        )


@router.get("/products", dependencies=[Depends(_public_limit)])
def catalogue_products(
    pharmacy_id: str | None = Query(default=None, max_length=ID_MAX),
    q: str | None = Query(default=None, max_length=TEXT_MAX),
    category_id: int | None = Query(default=None, ge=0, le=2_000_000_000),
    category_key: str | None = Query(default=None, max_length=TEXT_MAX),
    availability: str | None = Query(default=None, max_length=16),
    discounted_only: bool = False,
    limit: int = Query(default=24, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=1_000_000),
):
    try:
        return list_catalogue_products(
            pharmacy_id=pharmacy_id,
            q=q,
            category_id=category_id,
            category_key=category_key,
            availability=availability,
            discounted_only=discounted_only,
            limit=limit,
            offset=offset,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/categories", dependencies=[Depends(_public_limit)])
def catalogue_categories():
    return {
        "items": list_catalogue_categories()
    }


@router.get("/products/{listing_id}/offers", dependencies=[Depends(_public_limit)])
def catalogue_product_offers(listing_id: str = Path(..., max_length=ID_MAX)):
    result = get_catalogue_offers(listing_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Catalogue listing not found.",
        )

    return result


@router.get("/products/{listing_id}", dependencies=[Depends(_public_limit)])
def catalogue_product(
    listing_id: str = Path(..., max_length=ID_MAX),
    pharmacy_id: str | None = Query(default=None, max_length=ID_MAX),
):
    result = get_catalogue_listing(
        listing_id,
        pharmacy_id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Catalogue listing not found.",
        )

    return result


@router.post("/admin/sync/start")
def start_sync(
    x_catalogue_sync_key: str | None = Header(default=None),
    _admin: dict = Depends(require_admin),
    _rl: None = Depends(_sync_limit),
):
    verify_sync_key(x_catalogue_sync_key)
    result = start_catalogue_sync()
    audit.emit(
        "pharmacy.catalogue_sync.started", outcome="success", resource_type="catalogue",
        authorization_result="allowed", rule_id=audit.RULE_ADMIN,
        details={"decision": "started" if result.get("started") else "already_running"},
    )
    return result


@router.get("/admin/sync/status")
def sync_status(
    x_catalogue_sync_key: str | None = Header(default=None),
    _admin: dict = Depends(require_admin),
):
    verify_sync_key(x_catalogue_sync_key)
    return get_sync_status()
