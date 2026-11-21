"""
Authorization: what may this authenticated caller do?

Two layers
----------
1. user["role"]  : "patient" (default) or "admin".  Platform-wide.
2. pharmacy_staff memberships: who works at which pharmacy/branch and as what
   ("owner" | "pharmacist" | "inventory").  This is the trusted answer to
   "is this person allowed to act for branch X?".  Before Phase 1 the backend
   had no such record at all; the branch simply came from a request header.

The client may still *name* a branch (X-Branch-ID) because staff can work at
several. That name is only a CLAIM that is checked here against the
membership table. It is never trusted by itself.

The responses for "branch does not exist" and "you are not allowed on this
branch" are identical on purpose (no enumeration).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import Depends, Header, HTTPException, status

from database import branches_collection, pharmacy_staff_collection, pharmacies_collection

from . import audit_events as audit
from . import faults
from .identity import get_current_user

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------
# Permission model
# --------------------------------------------------------------------------
STAFF_ROLES = ("owner", "pharmacist", "inventory")

STAFF_PERMISSIONS: dict[str, frozenset[str]] = {
    "owner": frozenset(
        {
            "pharmacy.read",
            "prescription.read",
            "prescription.review",
            "inventory.read",
            "inventory.write",
            "pharmacy.manage",
        }
    ),
    "pharmacist": frozenset(
        {"pharmacy.read", "prescription.read", "prescription.review", "inventory.read"}
    ),
    "inventory": frozenset({"pharmacy.read", "inventory.read", "inventory.write"}),
}

FORBIDDEN_BRANCH = "You do not have access to this pharmacy branch."
FORBIDDEN_PHARMACY = "You do not have access to this pharmacy."


# --------------------------------------------------------------------------
# Platform role
# --------------------------------------------------------------------------
def require_admin(user: dict = Depends(get_current_user)) -> dict:
    is_admin = user.get("role") == "admin"
    allowed = is_admin or faults.fault_active("admin_bypass")      # fault: staging only
    audit.authz(
        "admin.access",
        allowed,
        rule_id=audit.admin_rule_id(),
        resource_type="admin_area",
        target_relation="platform_admin" if is_admin else "non_admin",
    )
    if not allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized")
    return user


# --------------------------------------------------------------------------
# Membership data access
# --------------------------------------------------------------------------
def get_user_memberships(user_id: ObjectId) -> list[dict]:
    return list(pharmacy_staff_collection.find({"user_id": user_id, "active": True}))


def grant_membership(
    *,
    user_id: ObjectId,
    pharmacy_id: str,
    staff_role: str,
    branch_ids: Optional[list[str]],
    granted_by: ObjectId,
) -> dict:
    """Create or update the single membership of `user_id` in `pharmacy_id`."""
    if staff_role not in STAFF_ROLES:
        raise ValueError("Invalid staff role.")
    now = datetime.now(timezone.utc)
    pharmacy_staff_collection.update_one(
        {"user_id": user_id, "pharmacy_id": pharmacy_id},
        {
            "$set": {
                "staff_role": staff_role,
                "branch_ids": branch_ids,        # None = every branch of the pharmacy
                "active": True,
                "updated_at": now,
                "granted_by": granted_by,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    return pharmacy_staff_collection.find_one(
        {"user_id": user_id, "pharmacy_id": pharmacy_id}
    )


def revoke_membership(user_id: ObjectId, pharmacy_id: str) -> bool:
    res = pharmacy_staff_collection.update_one(
        {"user_id": user_id, "pharmacy_id": pharmacy_id, "active": True},
        {"$set": {"active": False, "updated_at": datetime.now(timezone.utc)}},
    )
    return res.modified_count == 1


def memberships_summary(user_id: ObjectId) -> list[dict]:
    """Safe-to-return view used by GET /users/me (drives the UI menus only)."""
    return [
        {
            "pharmacy_id": m["pharmacy_id"],
            "staff_role": m["staff_role"],
            "branch_ids": m.get("branch_ids"),
        }
        for m in get_user_memberships(user_id)
    ]


def _branches_of_membership(m: dict) -> list[dict]:
    """Branch documents this membership covers (always inside ITS pharmacy)."""
    query: dict = {"pharmacy_id": m["pharmacy_id"]}
    if m.get("branch_ids") is not None:
        query["branch_id"] = {"$in": list(m["branch_ids"])}
    return list(branches_collection.find(query))


# --------------------------------------------------------------------------
# Branch-scoped context
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class BranchContext:
    """Everything a branch-scoped endpoint is allowed to rely on."""
    user_id: str          # trusted: from the verified session
    branch_id: str        # trusted: verified against pharmacy_staff
    pharmacy_id: str
    staff_role: str


def list_operable_branches(user: dict, permission: str) -> list[BranchContext]:
    out: list[BranchContext] = []
    seen: set[str] = set()
    for m in get_user_memberships(user["_id"]):
        if permission not in STAFF_PERMISSIONS.get(m["staff_role"], frozenset()):
            continue
        for b in _branches_of_membership(m):
            if b["branch_id"] in seen:
                continue
            seen.add(b["branch_id"])
            out.append(
                BranchContext(
                    user_id=str(user["_id"]),
                    branch_id=b["branch_id"],
                    pharmacy_id=m["pharmacy_id"],
                    staff_role=m["staff_role"],
                )
            )
    return out


def _branch_rule(permission: str) -> str:
    if permission.startswith("prescription."):
        return audit.RULE_RX_BRANCH
    if permission.startswith("inventory."):
        return audit.RULE_INV_BRANCH
    return audit.RULE_PHARM_OWNER


def _audit_branch(permission: str, allowed: bool, relation: str, branch_id: Optional[str], staff_role: Optional[str] = None) -> None:
    audit.authz(
        permission,
        allowed,
        rule_id=_branch_rule(permission),
        resource_type="pharmacy_branch",
        target_relation=relation,
        target_ref=audit.ref("branch", branch_id) if branch_id else None,
        staff_role=staff_role,
    )


def resolve_branch_context(
    user: dict, requested_branch_id: Optional[str], permission: str
) -> BranchContext:
    candidates = list_operable_branches(user, permission)
    requested = (requested_branch_id or "").strip()

    if requested:
        for c in candidates:
            if c.branch_id == requested:
                _audit_branch(permission, True, "staff_of_branch", c.branch_id, c.staff_role)
                return c
        if faults.fault_active("branch_hop") and candidates:       # fault: staging only
            hop_pharmacy = pharmacy_id_of_branch(requested)
            if hop_pharmacy:
                hop = BranchContext(str(user["_id"]), requested, hop_pharmacy, candidates[0].staff_role)
                _audit_branch(permission, True, "not_staff_of_branch", requested, hop.staff_role)   # honest relation
                return hop
        _audit_branch(permission, False, "not_staff_of_branch", requested)
        raise HTTPException(status.HTTP_403_FORBIDDEN, FORBIDDEN_BRANCH)

    if len(candidates) == 1:
        _audit_branch(permission, True, "staff_of_branch", candidates[0].branch_id, candidates[0].staff_role)
        return candidates[0]
    if not candidates:
        _audit_branch(permission, False, "no_membership", None)
        raise HTTPException(status.HTTP_403_FORBIDDEN, FORBIDDEN_BRANCH)
    raise HTTPException(
        status.HTTP_400_BAD_REQUEST,
        "You work at several branches. Send the X-Branch-ID header to choose one.",
    )


def branch_permission(permission: str):
    """
    FastAPI dependency factory.

        ctx: BranchContext = Depends(branch_permission("inventory.write"))
    """

    def dependency(
        x_branch_id: Optional[str] = Header(default=None, alias="X-Branch-ID"),
        user: dict = Depends(get_current_user),
    ) -> BranchContext:
        return resolve_branch_context(user, x_branch_id, permission)

    return dependency


# --------------------------------------------------------------------------
# Pharmacy-scoped checks (pharmacy profile, branches, staff, verification)
# --------------------------------------------------------------------------
def membership_for_pharmacy(user: dict, pharmacy_id: str) -> Optional[dict]:
    return pharmacy_staff_collection.find_one(
        {"user_id": user["_id"], "pharmacy_id": pharmacy_id, "active": True}
    )


def require_pharmacy_permission(
    user: dict,
    pharmacy_id: str,
    permission: str,
    *,
    allow_admin: bool = False,
) -> None:
    """Raise 403 unless `user` holds `permission` for `pharmacy_id`."""
    def _audit(allowed: bool, relation: str, staff_role: Optional[str] = None) -> None:
        audit.authz(
            permission,
            allowed,
            rule_id=audit.RULE_PHARM_OWNER,
            resource_type="pharmacy",
            target_relation=relation,
            target_ref=audit.ref("pharmacy", pharmacy_id),
            staff_role=staff_role,
        )

    if allow_admin and user.get("role") == "admin":
        _audit(True, "platform_admin")
        return
    m = membership_for_pharmacy(user, pharmacy_id)
    if m is None:
        _audit(False, "not_staff_of_pharmacy")
        raise HTTPException(status.HTTP_403_FORBIDDEN, FORBIDDEN_PHARMACY)
    if permission not in STAFF_PERMISSIONS.get(m["staff_role"], frozenset()):
        _audit(False, "insufficient_staff_role", m["staff_role"])
        raise HTTPException(status.HTTP_403_FORBIDDEN, FORBIDDEN_PHARMACY)
    _audit(True, "staff_of_pharmacy", m["staff_role"])


def pharmacy_id_of_branch(branch_id: str) -> Optional[str]:
    b = branches_collection.find_one({"branch_id": branch_id}, {"pharmacy_id": 1})
    return b["pharmacy_id"] if b else None


def pharmacy_exists(pharmacy_id: str) -> bool:
    return pharmacies_collection.count_documents({"id": pharmacy_id}, limit=1) == 1
