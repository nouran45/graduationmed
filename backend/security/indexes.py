"""
MongoDB indexes required by Phase 1.

Called once at start-up. A failure to create a UNIQUE index (because the data
already contains duplicates) is logged loudly but does not stop the server;
run scripts/migrate_phase1.py to find and fix those duplicates.
"""
from __future__ import annotations

import logging

from pymongo import ASCENDING, DESCENDING

from database import (
    branches_collection,
    inventory_collection,
    login_attempts_collection,
    pharmacies_collection,
    pharmacy_staff_collection,
    prescriptions_collection,
    security_events_collection,
    sessions_collection,
    stock_movements_collection,
    users,
    verification_collection,
)

logger = logging.getLogger(__name__)


def ensure_indexes() -> list[str]:
    problems: list[str] = []

    specs = [
        (users, [("email", ASCENDING)], {"unique": True, "name": "uniq_email"}),
        (sessions_collection, [("session_id", ASCENDING)], {"unique": True, "name": "uniq_session_id"}),
        (sessions_collection, [("user_id", ASCENDING), ("revoked_at", ASCENDING)], {"name": "by_user_active"}),
        (sessions_collection, [("session_pseudonym", ASCENDING)], {"name": "by_session_pseudonym"}),
        (sessions_collection, [("actor_pseudonym", ASCENDING)], {"name": "by_actor_pseudonym"}),
        # ---- Phase 2: security events -------------------------------------
        (security_events_collection, [("event_id", ASCENDING)], {"unique": True, "name": "uniq_event_id"}),
        (security_events_collection, [("timestamp", DESCENDING)], {"name": "by_time"}),
        (security_events_collection, [("request_id", ASCENDING), ("seq", ASCENDING)], {"name": "by_request"}),
        (security_events_collection, [("session_id", ASCENDING), ("timestamp", ASCENDING)], {"name": "by_session_time"}),
        (security_events_collection, [("actor_id", ASCENDING), ("timestamp", ASCENDING)], {"name": "by_actor_time"}),
        (security_events_collection, [("event_type", ASCENDING), ("timestamp", DESCENDING)], {"name": "by_type_time"}),
        (sessions_collection, [("purge_at", ASCENDING)], {"expireAfterSeconds": 0, "name": "ttl_sessions"}),
        (login_attempts_collection, [("key", ASCENDING), ("at", DESCENDING)], {"name": "by_key_time"}),
        (login_attempts_collection, [("expire_at", ASCENDING)], {"expireAfterSeconds": 0, "name": "ttl_login_attempts"}),
        (pharmacy_staff_collection, [("user_id", ASCENDING), ("pharmacy_id", ASCENDING)], {"unique": True, "name": "uniq_user_pharmacy"}),
        (pharmacies_collection, [("id", ASCENDING)], {"unique": True, "name": "uniq_pharmacy_id"}),
        (branches_collection, [("branch_id", ASCENDING)], {"unique": True, "name": "uniq_branch_id"}),
        (branches_collection, [("pharmacy_id", ASCENDING)], {"name": "by_pharmacy"}),
        (verification_collection, [("pharmacy_id", ASCENDING), ("status", ASCENDING)], {"name": "by_pharmacy_status"}),
        (prescriptions_collection, [("prescription_id", ASCENDING)], {"unique": True, "name": "uniq_prescription_id"}),
        (prescriptions_collection, [("branch_id", ASCENDING), ("status", ASCENDING), ("created_at", ASCENDING)], {"name": "queue"}),
        (inventory_collection, [("inventory_id", ASCENDING)], {"unique": True, "name": "uniq_inventory_id"}),
        (inventory_collection, [("branch_id", ASCENDING), ("product_id", ASCENDING)], {"unique": True, "name": "uniq_branch_product"}),
        (stock_movements_collection, [("inventory_id", ASCENDING), ("timestamp", DESCENDING)], {"name": "by_inventory_time"}),
    ]

    for coll, keys, opts in specs:
        try:
            coll.create_index(keys, **opts)
        except Exception as exc:  # noqa: BLE001 - report every failure, never crash start-up
            msg = f"{coll.name}.{opts.get('name')}: {exc}"
            logger.error("INDEX FAILED %s", msg)
            problems.append(msg)

    return problems
