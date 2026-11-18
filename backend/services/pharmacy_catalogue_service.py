import os
import re
import logging
import threading
from datetime import datetime, timezone
from urllib.parse import urlencode

import requests
from pymongo import UpdateOne
from pymongo.errors import PyMongoError

from database import db

logger = logging.getLogger(__name__)

catalogue_collection = db["pharmacy_catalogue"]
sync_collection = db["pharmacy_catalogue_sync"]

SYNC_ID = "pharmacy_catalogue_initial_import"

_sync_lock = threading.Lock()
_sync_thread = None
_indexes_ready = False


def utc_now():
    return datetime.now(timezone.utc)


def ensure_catalogue_indexes():
    global _indexes_ready

    if _indexes_ready:
        return

    catalogue_collection.create_index(
        [("pharmacy_id", 1), ("external_id", 1)],
        unique=True,
        name="unique_pharmacy_listing"
    )

    catalogue_collection.create_index(
        [("pharmacy_id", 1), ("availability", 1)],
        name="pharmacy_availability"
    )

    catalogue_collection.create_index(
        [("category.id", 1)],
        name="category_id"
    )

    catalogue_collection.create_index(
        [("source_item_id", 1)],
        name="source_item_id"
    )

    catalogue_collection.create_index(
        [("barcode", 1)],
        name="barcode"
    )

    catalogue_collection.create_index(
        [("name", 1)],
        name="product_name"
    )

    catalogue_collection.create_index(
        [("price", 1)],
        name="product_price"
    )

    sync_collection.create_index(
        [("updated_at", -1)],
        name="sync_updated_at"
    )

    _indexes_ready = True


def get_upstream_config():
    base_url = os.getenv("PHARMASYNC_API_BASE_URL", "").rstrip("/")
    token = os.getenv("MEDICHECK_API_TOKEN", "")

    if not base_url or not token:
        raise RuntimeError(
            "PharmaSync API configuration is missing."
        )

    return base_url, token


def upstream_get(endpoint, params=None):
    base_url, token = get_upstream_config()

    response = requests.get(
        f"{base_url}{endpoint}",
        headers={
            "Accept": "application/json",
            "X-MediCheck-Token": token,
        },
        params=params,
        timeout=60,
    )

    response.raise_for_status()

    data = response.json()

    if not isinstance(data, dict):
        raise RuntimeError("Unexpected upstream response format.")

    return data


def serialize_listing(document):
    if document is None:
        return None

    document = dict(document)
    document.pop("_id", None)
    document.pop("_sync_updated_at", None)

    return document


def get_sync_status():
    state = sync_collection.find_one({"_id": SYNC_ID})

    if not state:
        return {
            "status": "not_started",
            "processed": 0,
            "total": 0,
            "offset": 0,
            "last_success_at": None,
            "error": None,
        }

    state.pop("_id", None)
    return state


def _set_sync_state(**updates):
    updates["updated_at"] = utc_now()

    sync_collection.update_one(
        {"_id": SYNC_ID},
        {"$set": updates},
        upsert=True,
    )


def _import_worker():
    global _sync_thread

    session = requests.Session()

    try:
        ensure_catalogue_indexes()

        state = sync_collection.find_one({"_id": SYNC_ID}) or {}

        offset = int(state.get("offset", 0))
        total = int(state.get("total", 0))

        page_size = int(
            os.getenv("CATALOGUE_SYNC_PAGE_SIZE", "100")
        )
        page_size = max(10, min(page_size, 500))

        _set_sync_state(
            status="running",
            started_at=state.get("started_at") or utc_now(),
            error=None,
        )

        base_url, token = get_upstream_config()

        while True:
            response = session.get(
                f"{base_url}/api/v1/products",
                headers={
                    "Accept": "application/json",
                    "X-MediCheck-Token": token,
                },
                params={
                    "limit": page_size,
                    "offset": offset,
                },
                timeout=60,
            )

            response.raise_for_status()
            payload = response.json()

            if not isinstance(payload, dict):
                raise RuntimeError(
                    "Invalid products response from upstream."
                )

            items = payload.get("items", [])

            if not isinstance(items, list):
                raise RuntimeError(
                    "Upstream products response has invalid items."
                )

            total = int(payload.get("total", total))

            if not items:
                break

            operations = []

            for item in items:
                if not isinstance(item, dict):
                    continue

                listing_id = item.get("id")
                pharmacy_id = item.get("pharmacy_id")

                if listing_id is None or not pharmacy_id:
                    continue

                document = dict(item)

                document["_id"] = (
                    f"{pharmacy_id}:{listing_id}"
                )

                document["external_id"] = str(listing_id)
                document["pharmacy_id"] = str(pharmacy_id)
                document["_sync_updated_at"] = utc_now()

                operations.append(
                    UpdateOne(
                        {"_id": document["_id"]},
                        {"$set": document},
                        upsert=True,
                    )
                )

            if operations:
                catalogue_collection.bulk_write(
                    operations,
                    ordered=False,
                )

            offset += len(items)

            _set_sync_state(
                status="running",
                offset=offset,
                processed=offset,
                total=total,
                last_page_count=len(items),
                error=None,
            )

            logger.info(
                "Catalogue import progress: %s / %s",
                offset,
                total,
            )

            if offset >= total:
                break

        _set_sync_state(
            status="completed",
            offset=offset,
            processed=offset,
            total=total,
            completed_at=utc_now(),
            last_success_at=utc_now(),
            error=None,
        )

        logger.info("Initial pharmacy catalogue import completed.")

    except Exception as exc:
        logger.exception("Pharmacy catalogue synchronization failed.")

        _set_sync_state(
            status="failed",
            error=str(exc)[:1000],
        )

    finally:
        session.close()

        with _sync_lock:
            _sync_thread = None


def start_catalogue_sync():
    global _sync_thread

    with _sync_lock:
        if _sync_thread is not None and _sync_thread.is_alive():
            return {
                "started": False,
                "message": "A catalogue synchronization is already running.",
                "status": get_sync_status(),
            }

        _sync_thread = threading.Thread(
            target=_import_worker,
            name="pharmacy-catalogue-sync",
            daemon=True,
        )

        _sync_thread.start()

    return {
        "started": True,
        "message": "Catalogue synchronization started.",
    }


def list_catalogue_products(
    pharmacy_id=None,
    q=None,
    category_id=None,
    category_key=None,
    availability=None,
    discounted_only=False,
    limit=24,
    offset=0,
):
    ensure_catalogue_indexes()

    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    query = {}

    if pharmacy_id:
        query["pharmacy_id"] = pharmacy_id

    if category_id is not None:
        query["category.id"] = category_id

    if category_key:
        query["category.name"] = {
            "$regex": re.escape(category_key),
            "$options": "i",
        }

    if availability:
        allowed = {
            "in_stock",
            "out_of_stock",
            "unknown",
            "stale",
        }

        if availability not in allowed:
            raise ValueError("Invalid availability filter.")

        query["availability"] = availability

    if discounted_only:
        query["$and"] = [
            {"old_price": {"$ne": None}},
            {"price": {"$ne": None}},
            {"$expr": {"$gt": ["$old_price", "$price"]}},
        ]

    if q:
        search = re.escape(q.strip())

        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"name_ar": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}},
            {"pharmacy_name": {"$regex": search, "$options": "i"}},
        ]

    total = catalogue_collection.count_documents(query)

    cursor = (
        catalogue_collection
        .find(query, {"_sync_updated_at": 0})
        .sort([("name", 1), ("pharmacy_id", 1)])
        .skip(offset)
        .limit(limit)
    )

    items = [
        serialize_listing(item)
        for item in cursor
    ]

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": items,
    }


def get_catalogue_listing(listing_id, pharmacy_id=None):
    ensure_catalogue_indexes()

    query = {"external_id": str(listing_id)}

    if pharmacy_id:
        query["pharmacy_id"] = pharmacy_id

    document = catalogue_collection.find_one(query)

    return serialize_listing(document)


def get_catalogue_offers(listing_id):
    ensure_catalogue_indexes()

    listing = get_catalogue_listing(listing_id)

    if not listing:
        return None

    source_item_id = listing.get("source_item_id")

    if source_item_id is not None:
        query = {"source_item_id": source_item_id}
    else:
        barcode = str(listing.get("barcode") or "").strip()

        if len(barcode) >= 6 and not set(barcode) <= {"0"}:
            query = {"barcode": barcode}
        else:
            return {
                "product": listing,
                "offers": [listing],
            }

    offers = [
        serialize_listing(item)
        for item in catalogue_collection.find(query)
        .sort("price", 1)
    ]

    return {
        "product": listing,
        "offers": offers,
    }


def list_catalogue_categories():
    ensure_catalogue_indexes()

    pipeline = [
        {
            "$match": {
                "category.id": {"$exists": True, "$ne": None}
            }
        },
        {
            "$group": {
                "_id": "$category.id",
                "name": {"$first": "$category.name"},
                "name_ar": {"$first": "$category.name_ar"},
                "product_count": {"$sum": 1},
            }
        },
        {"$sort": {"name": 1}},
    ]

    return [
        {
            "id": item["_id"],
            "name": item.get("name"),
            "name_ar": item.get("name_ar"),
            "product_count": item["product_count"],
        }
        for item in catalogue_collection.aggregate(pipeline)
    ]
