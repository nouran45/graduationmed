"""
Admin user & role management (admin-only).

Self-registration (/register) ALWAYS creates a plain patient: a client can never choose its
own role. Other roles are assigned here, by an administrator:

    GET   /api/admin/pharmacies               pharmacies + branches (for the staff-assignment form)
    POST  /api/admin/users                    create an account with a role, optionally with pharmacy staff access
    PATCH /api/admin/users/{user_id}/role     change the platform role (patient <-> admin)

Pharmacy staff access for an EXISTING account uses the existing endpoints
POST/DELETE /api/pharmacies/{pharmacy_id}/staff (owner or admin).

Rules enforced here
  * platform roles are only "patient" and "admin"; pharmacy roles (owner / pharmacist / inventory)
    are memberships of one pharmacy, optionally limited to some branches
  * separation of duties: an administrator cannot also hold pharmacy staff access
  * the last active administrator cannot be demoted
  * a role change ends all of that user's sessions (the new role applies at next login)
  * every create / change / rejection is a security event (Phase 2)
"""
from datetime import datetime, timezone
from typing import Literal, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pymongo.errors import DuplicateKeyError

from database import branches_collection, pharmacies_collection, pharmacy_staff_collection, users
from models import UserInDB
from security import audit_events as audit
from security.authorization import grant_membership, memberships_summary, require_admin
from security.passwords import hash_password, password_policy_errors
from security.rate_limit import rate_limit
from security.sessions import revoke_all_user_sessions

router = APIRouter(prefix="/api/admin", tags=["Admin: users & roles"])

_write_limit = rate_limit("admin_users", "admin_write_per_minute", 60)

PlatformRole = Literal["patient", "admin"]
StaffRole = Literal["owner", "pharmacist", "inventory"]


class StaffAssignment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pharmacy_id: str = Field(..., min_length=1, max_length=64)
    staff_role: StaffRole
    # None = every branch of the pharmacy, [..] = only these branches
    branch_ids: Optional[list[str]] = Field(default=None, max_length=100)


class AdminUserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    firstName: str = Field(..., min_length=1, max_length=80)
    lastName: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=256)
    role: PlatformRole = "patient"
    staff: Optional[StaffAssignment] = None


class RoleChange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: PlatformRole


def _reject(reason: str, code: int, detail: str):
    audit.emit("admin.user.rejected", outcome="rejected", resource_type="account", details={"reason": reason})
    raise HTTPException(code, detail)


def _validate_staff(staff: StaffAssignment) -> None:
    if pharmacies_collection.count_documents({"id": staff.pharmacy_id}, limit=1) == 0:
        _reject("unknown_pharmacy", status.HTTP_400_BAD_REQUEST, "That pharmacy does not exist.")
    if staff.branch_ids is not None:
        if not staff.branch_ids:
            _reject("empty_branch_list", status.HTTP_400_BAD_REQUEST,
                    "Choose at least one branch, or leave branches empty for all branches.")
        valid = {
            b["branch_id"]
            for b in branches_collection.find(
                {"pharmacy_id": staff.pharmacy_id, "branch_id": {"$in": staff.branch_ids}}, {"branch_id": 1}
            )
        }
        if set(staff.branch_ids) - valid:
            _reject("foreign_branch", status.HTTP_400_BAD_REQUEST,
                    "One or more branches do not belong to that pharmacy.")


def _active_admins_excluding(user_id: ObjectId) -> int:
    return users.count_documents({"role": "admin", "is_disabled": {"$ne": True}, "_id": {"$ne": user_id}})


@router.get("/pharmacies")
def list_pharmacies_with_branches(_admin: dict = Depends(require_admin)):
    out = []
    for ph in pharmacies_collection.find({}, {"_id": 0, "id": 1, "name": 1, "verification_status": 1}).sort("name", 1):
        out.append({
            "pharmacy_id": ph["id"],
            "name": ph.get("name"),
            "verification_status": ph.get("verification_status"),
            "branches": [
                {"branch_id": b["branch_id"], "branch_name": b.get("branch_name")}
                for b in branches_collection.find({"pharmacy_id": ph["id"]}, {"_id": 0, "branch_id": 1, "branch_name": 1})
            ],
        })
    return out


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user_with_role(
    body: AdminUserCreate,
    admin: dict = Depends(require_admin),
    _rl: None = Depends(_write_limit),
):
    email = str(body.email).strip().lower()

    problems = password_policy_errors(body.password, email)
    if problems:
        _reject("weak_password", status.HTTP_400_BAD_REQUEST, " ".join(problems))
    if body.role == "admin" and body.staff is not None:
        _reject("admin_with_staff_access", status.HTTP_400_BAD_REQUEST,
                "An administrator cannot also hold pharmacy staff access (separation of duties).")
    if body.staff is not None:
        _validate_staff(body.staff)
    if users.find_one({"email": email}, {"_id": 1}):
        _reject("email_exists", status.HTTP_400_BAD_REQUEST, "Email already registered")

    document = UserInDB(
        firstName=body.firstName.strip(),
        lastName=body.lastName.strip(),
        email=email,
        hashed_password=hash_password(body.password),
        role=body.role,
    ).model_dump()
    try:
        user_id = users.insert_one(document).inserted_id
    except DuplicateKeyError:
        _reject("email_exists", status.HTTP_400_BAD_REQUEST, "Email already registered")

    if body.staff is not None:
        grant_membership(
            user_id=user_id,
            pharmacy_id=body.staff.pharmacy_id,
            staff_role=body.staff.staff_role,
            branch_ids=body.staff.branch_ids,
            granted_by=admin["_id"],
        )

    audit.emit(
        "admin.user.created", outcome="success", resource_type="account", authorization_result="allowed",
        rule_id=audit.RULE_ADMIN, subject_email=email,
        details={"platform_role": body.role, **({"staff_role": body.staff.staff_role} if body.staff else {})},
    )
    return {
        "user_id": str(user_id),
        "email": email,
        "role": body.role,
        "memberships": memberships_summary(user_id),
    }


@router.patch("/users/{user_id}/role")
def change_platform_role(
    body: RoleChange,
    user_id: str = Path(..., max_length=64),
    admin: dict = Depends(require_admin),
    _rl: None = Depends(_write_limit),
):
    try:
        oid = ObjectId(user_id)
    except (InvalidId, TypeError):
        _reject("unknown_user", status.HTTP_404_NOT_FOUND, "User not found")
    target = users.find_one({"_id": oid})
    if target is None:
        _reject("unknown_user", status.HTTP_404_NOT_FOUND, "User not found")

    current = target.get("role", "patient")
    if current == body.role:
        return {"user_id": user_id, "role": current, "changed": False, "sessions_revoked": 0}

    if current == "admin" and _active_admins_excluding(oid) == 0:
        _reject("last_admin", status.HTTP_409_CONFLICT, "The last active administrator cannot be demoted.")
    if body.role == "admin" and pharmacy_staff_collection.count_documents({"user_id": oid, "active": True}, limit=1):
        _reject("admin_with_staff_access", status.HTTP_409_CONFLICT,
                "Remove this user's pharmacy staff access before making them an administrator (separation of duties).")

    users.update_one({"_id": oid}, {"$set": {"role": body.role, "updated_at": datetime.now(timezone.utc)}})
    ended = revoke_all_user_sessions(oid, "role_changed")
    audit.emit(
        "admin.user.role_changed", outcome="success", resource_type="account", authorization_result="allowed",
        rule_id=audit.RULE_ADMIN, target_ref=audit.ref("user", user_id),
        details={"platform_role": body.role, "sessions_revoked": ended},
    )
    return {"user_id": user_id, "role": body.role, "changed": True, "sessions_revoked": ended}
