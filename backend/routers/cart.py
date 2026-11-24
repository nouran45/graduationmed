from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

import requests
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response
from pymongo.errors import DuplicateKeyError

from database import carts_collection
from schemas.cart import CartLineChange, CartResponse
from security.identity import Principal, get_current_principal
from services.pharmacy_catalogue_service import upstream_get


router = APIRouter(prefix="/api/cart", tags=["cart"])

MAX_CART_LINES = 50


def cart_customer_id(
    principal: Principal = Depends(get_current_principal),
) -> ObjectId:
    if principal.role != "patient":
        raise HTTPException(status_code=403, detail="A customer account is required.")
    return ObjectId(principal.user_id)


def resolve_cart_line(change: CartLineChange) -> dict:
    try:
        data = upstream_get(
            f"/api/v1/products/{change.product_id}",
            params={"pharmacy_id": change.pharmacy_id},
            timeout=5,
        )
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 404:
            raise HTTPException(status_code=404, detail="This offer was not found.") from exc
        raise HTTPException(
            status_code=503, detail="The pharmacy catalogue is temporarily unavailable."
        ) from exc
    except (requests.RequestException, RuntimeError, ValueError) as exc:
        raise HTTPException(
            status_code=503, detail="The pharmacy catalogue is temporarily unavailable."
        ) from exc

    offer = data.get("product", data.get("item", data))
    if (
        not isinstance(offer, dict)
        or str(offer.get("id")) != change.product_id
        or str(offer.get("pharmacy_id")) != change.pharmacy_id
    ):
        raise HTTPException(
            status_code=404, detail="This offer could not be verified for that pharmacy."
        )

    try:
        price = Decimal(str(offer.get("price")))
        if not price.is_finite() or not Decimal("0") < price <= Decimal("1000000"):
            raise InvalidOperation
        price_piastres = int(
            (price * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        )
        if price_piastres < 1:
            raise InvalidOperation
    except (InvalidOperation, ValueError, OverflowError) as exc:
        raise HTTPException(
            status_code=409, detail="This offer has no usable EGP price."
        ) from exc

    return {
        "pharmacy_id": change.pharmacy_id,
        "product_id": change.product_id,
        "pharmacy_name": str(
            offer.get("pharmacy_name") or offer.get("pharmacy_name_ar") or change.pharmacy_id
        )[:200],
        "product_name": str(
            offer.get("name") or offer.get("name_ar") or change.product_id
        )[:200],
        "quantity": change.quantity,
        "unit_price_piastres": price_piastres,
    }


@router.get("", response_model=CartResponse)
def read_cart(
    response: Response,
    customer_id: ObjectId = Depends(cart_customer_id),
) -> CartResponse:
    response.headers["Cache-Control"] = "private, no-store"
    cart = carts_collection.find_one({"_id": customer_id})
    if cart is None:
        return CartResponse(revision=0, lines=[])
    return CartResponse(revision=cart["revision"], lines=cart["lines"])


@router.patch("/items", response_model=CartResponse)
def change_cart_line(
    change: CartLineChange,
    response: Response,
    customer_id: ObjectId = Depends(cart_customer_id),
) -> CartResponse:
    response.headers["Cache-Control"] = "private, no-store"
    current = carts_collection.find_one({"_id": customer_id})
    revision = current["revision"] if current is not None else 0

    if revision != change.expected_revision:
        raise HTTPException(status_code=409, detail="Your cart changed. Refresh and try again.")

    previous_lines = current["lines"] if current is not None else []
    lines = [
        line for line in previous_lines
        if (line["pharmacy_id"], line["product_id"]) != (change.pharmacy_id, change.product_id)
    ]

    if change.quantity == 0 and len(lines) == len(previous_lines):
        return CartResponse(revision=revision, lines=previous_lines)

    if change.quantity > 0:
        if len(lines) >= MAX_CART_LINES:
            raise HTTPException(status_code=409, detail="Your cart can hold up to 50 offers.")
        lines.append(resolve_cart_line(change))

    updated_at = datetime.now(timezone.utc)
    if current is None:
        try:
            carts_collection.insert_one({
                "_id": customer_id,
                "revision": 1,
                "lines": lines,
                "updated_at": updated_at,
            })
        except DuplicateKeyError as exc:
            raise HTTPException(
                status_code=409, detail="Your cart changed. Refresh and try again."
            ) from exc
    else:
        result = carts_collection.update_one(
            {"_id": customer_id, "revision": revision},
            {"$set": {"lines": lines, "updated_at": updated_at}, "$inc": {"revision": 1}},
        )
        if result.matched_count == 0:
            raise HTTPException(
                status_code=409, detail="Your cart changed. Refresh and try again."
            )

    return CartResponse(revision=revision + 1, lines=lines)