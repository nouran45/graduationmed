import os
import hmac

from fastapi import APIRouter, HTTPException, Header, Query

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


def verify_sync_key(x_catalogue_sync_key: str | None):
    expected = os.getenv("CATALOGUE_SYNC_ADMIN_KEY", "")

    if (
        not expected
        or not x_catalogue_sync_key
        or not hmac.compare_digest(expected, x_catalogue_sync_key)
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid catalogue synchronization credentials.",
        )


@router.get("/products")
def catalogue_products(
    pharmacy_id: str | None = None,
    q: str | None = None,
    category_id: int | None = None,
    category_key: str | None = None,
    availability: str | None = None,
    discounted_only: bool = False,
    limit: int = Query(default=24, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
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


@router.get("/categories")
def catalogue_categories():
    return {
        "items": list_catalogue_categories()
    }


@router.get("/products/{listing_id}/offers")
def catalogue_product_offers(listing_id: str):
    result = get_catalogue_offers(listing_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Catalogue listing not found.",
        )

    return result


@router.get("/products/{listing_id}")
def catalogue_product(
    listing_id: str,
    pharmacy_id: str | None = None,
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
):
    verify_sync_key(x_catalogue_sync_key)
    return start_catalogue_sync()


@router.get("/admin/sync/status")
def sync_status(
    x_catalogue_sync_key: str | None = Header(default=None),
):
    verify_sync_key(x_catalogue_sync_key)
    return get_sync_status()
