"""
Pharmacy network API  (all routes now require authentication).

Access summary
--------------
POST   /api/pharmacies                              any signed-in user (becomes OWNER)
GET    /api/pharmacies/{id}                         staff of that pharmacy, or admin
PATCH  /api/pharmacies/{id}                         owner
POST   /api/pharmacies/{id}/branches                owner
GET    /api/pharmacies/{id}/branches                staff of that pharmacy, or admin
GET    /api/branches/public                         PUBLIC by design (approved + online only)
GET    /api/branches/{id}                           staff of that pharmacy, or admin
PATCH  /api/branches/{id}                           owner
POST   /api/pharmacies/{id}/verification            owner
GET    /api/pharmacies/{id}/staff                   owner, or admin
POST   /api/pharmacies/{id}/staff                   owner, or admin
DELETE /api/pharmacies/{id}/staff/{user_id}         owner, or admin
GET    /api/me/branches                             any signed-in user (their own branches)
GET    /api/admin/pharmacies/pending                admin
POST   /api/admin/pharmacies/{id}/verification      admin
"""
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status

from database import branches_collection, pharmacy_staff_collection, users
from security import audit_events as audit
from schemas.pharmacy import (
    BranchCreate,
    BranchUpdate,
    PharmacyCreate,
    PharmacyUpdate,
    StaffGrant,
    VerificationAction,
)
from security.authorization import (
    FORBIDDEN_BRANCH,
    grant_membership,
    list_operable_branches,
    pharmacy_id_of_branch,
    require_admin,
    require_pharmacy_permission,
    revoke_membership,
)
from security.identity import get_current_user
from security.rate_limit import rate_limit
from services.pharmacy_service import (
    VerificationAlreadyPending,
    create_branch,
    create_pharmacy,
    get_branch,
    get_pending_verifications,
    get_pharmacy,
    get_pharmacy_branches,
    get_public_branches,
    review_verification,
    submit_verification,
    update_branch,
    update_pharmacy,
)

router = APIRouter(prefix="/api", tags=["Pharmacy Network"])

_write_limit = rate_limit("pharmacy_write", "admin_write_per_minute", 60)


def _not_found(what: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"{what} not found")


# =========================================================
# PHARMACY
# =========================================================

@router.post("/pharmacies", status_code=status.HTTP_201_CREATED)
def create_pharmacy_endpoint(
    data: PharmacyCreate,
    user: dict = Depends(get_current_user),
    _rl: None = Depends(rate_limit("pharmacy_create", "upload_per_hour", 3600)),
):
    created = create_pharmacy(data, owner_user_id=user["_id"])
    audit.emit(
        "pharmacy.created", outcome="success", resource_type="pharmacy",
        target_relation="self", target_ref=audit.ref("pharmacy", created["id"]),
    )
    return created


@router.get("/pharmacies/{pharmacy_id}")
def get_pharmacy_endpoint(pharmacy_id: str, user: dict = Depends(get_current_user)):
    require_pharmacy_permission(user, pharmacy_id, "pharmacy.read", allow_admin=True)
    pharmacy = get_pharmacy(pharmacy_id)
    if pharmacy is None:
        raise _not_found("Pharmacy")
    return pharmacy


@router.patch("/pharmacies/{pharmacy_id}")
def update_pharmacy_endpoint(
    pharmacy_id: str,
    data: PharmacyUpdate,
    user: dict = Depends(get_current_user),
    _rl: None = Depends(_write_limit),
):
    require_pharmacy_permission(user, pharmacy_id, "pharmacy.manage")
    pharmacy = update_pharmacy(pharmacy_id, data)
    if pharmacy is None:
        raise _not_found("Pharmacy")
    return pharmacy


# =========================================================
# BRANCHES
# =========================================================

@router.post("/pharmacies/{pharmacy_id}/branches", status_code=status.HTTP_201_CREATED)
def create_branch_endpoint(
    pharmacy_id: str,
    data: BranchCreate,
    user: dict = Depends(get_current_user),
    _rl: None = Depends(_write_limit),
):
    """The pharmacy_id in the URL is authoritative (and must be owned by the caller)."""
    require_pharmacy_permission(user, pharmacy_id, "pharmacy.manage")

    if data.pharmacy_id != pharmacy_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "pharmacy_id in request body must match pharmacy_id in URL",
        )
    try:
        return create_branch(data)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))


@router.get("/pharmacies/{pharmacy_id}/branches")
def get_pharmacy_branches_endpoint(pharmacy_id: str, user: dict = Depends(get_current_user)):
    require_pharmacy_permission(user, pharmacy_id, "pharmacy.read", allow_admin=True)
    if get_pharmacy(pharmacy_id) is None:
        raise _not_found("Pharmacy")
    return get_pharmacy_branches(pharmacy_id)


# IMPORTANT: keep /branches/public before /branches/{branch_id}
@router.get("/branches/public")
def get_public_branches_endpoint():
    """Intentionally unauthenticated: patient-facing discovery of approved, online branches."""
    return get_public_branches()


def _require_branch_access(user: dict, branch_id: str, permission: str, *, allow_admin: bool):
    pharmacy_id = pharmacy_id_of_branch(branch_id)
    if pharmacy_id is None:
        # Same answer as "not yours" for non-admins -> no branch-id enumeration.
        if allow_admin and user.get("role") == "admin":
            raise _not_found("Branch")
        raise HTTPException(status.HTTP_403_FORBIDDEN, FORBIDDEN_BRANCH)
    require_pharmacy_permission(user, pharmacy_id, permission, allow_admin=allow_admin)


@router.get("/branches/{branch_id}")
def get_branch_endpoint(branch_id: str, user: dict = Depends(get_current_user)):
    _require_branch_access(user, branch_id, "pharmacy.read", allow_admin=True)
    branch = get_branch(branch_id)
    if branch is None:
        raise _not_found("Branch")
    return branch


@router.patch("/branches/{branch_id}")
def update_branch_endpoint(
    branch_id: str,
    data: BranchUpdate,
    user: dict = Depends(get_current_user),
    _rl: None = Depends(_write_limit),
):
    _require_branch_access(user, branch_id, "pharmacy.manage", allow_admin=False)
    branch = update_branch(branch_id, data)
    if branch is None:
        raise _not_found("Branch")
    return branch


# =========================================================
# VERIFICATION
# =========================================================

@router.post("/pharmacies/{pharmacy_id}/verification", status_code=status.HTTP_201_CREATED)
def submit_verification_endpoint(
    pharmacy_id: str,
    user: dict = Depends(get_current_user),
    _rl: None = Depends(_write_limit),
):
    require_pharmacy_permission(user, pharmacy_id, "pharmacy.manage")
    try:
        submitted = submit_verification(pharmacy_id)
        audit.emit(
            "pharmacy.verification.submitted", outcome="success", resource_type="pharmacy",
            target_ref=audit.ref("pharmacy", pharmacy_id),
        )
        return submitted
    except VerificationAlreadyPending:
        raise HTTPException(status.HTTP_409_CONFLICT, "A verification request is already pending.")
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))


@router.get("/admin/pharmacies/pending")
def pending_verifications_endpoint(_admin: dict = Depends(require_admin)):
    return get_pending_verifications()


@router.post("/admin/pharmacies/{pharmacy_id}/verification")
def review_verification_endpoint(
    pharmacy_id: str,
    action: VerificationAction,
    _admin: dict = Depends(require_admin),
):
    try:
        pharmacy = review_verification(
            pharmacy_id=pharmacy_id, status=action.status, reason=action.reason
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    if pharmacy is None:
        raise _not_found("Pharmacy")
    audit.emit(
        "pharmacy.verification.reviewed", outcome="success", resource_type="pharmacy",
        rule_id=audit.RULE_PHARM_ADMIN, authorization_result="allowed", target_relation="platform_admin",
        target_ref=audit.ref("pharmacy", pharmacy_id),
        details={"decision": str(getattr(action.status, "value", action.status))},
    )
    return pharmacy


# =========================================================
# STAFF (who may act for this pharmacy)
# =========================================================

def _staff_view(m: dict) -> dict:
    return {
        "user_id": str(m["user_id"]),
        "staff_role": m["staff_role"],
        "branch_ids": m.get("branch_ids"),
        "active": m.get("active", True),
    }


@router.get("/pharmacies/{pharmacy_id}/staff")
def list_staff_endpoint(pharmacy_id: str, user: dict = Depends(get_current_user)):
    require_pharmacy_permission(user, pharmacy_id, "pharmacy.manage", allow_admin=True)
    return [
        _staff_view(m)
        for m in pharmacy_staff_collection.find({"pharmacy_id": pharmacy_id, "active": True})
    ]


@router.post("/pharmacies/{pharmacy_id}/staff", status_code=status.HTTP_201_CREATED)
def grant_staff_endpoint(
    pharmacy_id: str,
    data: StaffGrant,
    user: dict = Depends(get_current_user),
    _rl: None = Depends(_write_limit),
):
    require_pharmacy_permission(user, pharmacy_id, "pharmacy.manage", allow_admin=True)

    if get_pharmacy(pharmacy_id) is None:
        raise _not_found("Pharmacy")

    target = users.find_one({"email": str(data.email).strip().lower()})
    if target is None or target.get("is_disabled"):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No active MediCheck account exists for that e-mail address.",
        )

    if target.get("role") == "admin":
        # separation of duties: administrators do not also act as pharmacy staff
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "An administrator cannot also hold pharmacy staff access (separation of duties).",
        )

    if data.branch_ids is not None:
        valid = {
            b["branch_id"]
            for b in branches_collection.find(
                {"pharmacy_id": pharmacy_id, "branch_id": {"$in": data.branch_ids}}
            )
        }
        if set(data.branch_ids) - valid:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "One or more branch_ids do not belong to this pharmacy.",
            )

    membership = grant_membership(
        user_id=target["_id"],
        pharmacy_id=pharmacy_id,
        staff_role=data.staff_role,
        branch_ids=data.branch_ids,
        granted_by=user["_id"],
    )
    audit.emit(
        "pharmacy.staff.granted", outcome="success", resource_type="pharmacy",
        rule_id=audit.RULE_PHARM_OWNER, authorization_result="allowed",
        target_ref=audit.ref("pharmacy", pharmacy_id),
        details={"staff_role": data.staff_role},
    )
    return _staff_view(membership)


@router.delete("/pharmacies/{pharmacy_id}/staff/{staff_user_id}")
def revoke_staff_endpoint(
    pharmacy_id: str,
    staff_user_id: str,
    user: dict = Depends(get_current_user),
    _rl: None = Depends(_write_limit),
):
    require_pharmacy_permission(user, pharmacy_id, "pharmacy.manage", allow_admin=True)
    try:
        target_oid = ObjectId(staff_user_id)
    except (InvalidId, TypeError):
        raise _not_found("Staff member")

    # Never allow the LAST owner to be removed (would orphan the pharmacy).
    target = pharmacy_staff_collection.find_one(
        {"user_id": target_oid, "pharmacy_id": pharmacy_id, "active": True}
    )
    if target and target["staff_role"] == "owner":
        owners = pharmacy_staff_collection.count_documents(
            {"pharmacy_id": pharmacy_id, "staff_role": "owner", "active": True}
        )
        if owners <= 1:
            raise HTTPException(status.HTTP_409_CONFLICT, "A pharmacy must keep at least one owner.")

    if not revoke_membership(target_oid, pharmacy_id):
        raise _not_found("Staff member")
    audit.emit(
        "pharmacy.staff.revoked", outcome="success", resource_type="pharmacy",
        rule_id=audit.RULE_PHARM_OWNER, authorization_result="allowed",
        target_ref=audit.ref("pharmacy", pharmacy_id),
    )
    return {"message": "Staff access revoked"}


# =========================================================
# "WHICH BRANCHES CAN I WORK ON?"  (drives the pharmacy UI)
# =========================================================

@router.get("/me/branches")
def my_branches_endpoint(user: dict = Depends(get_current_user)):
    out = []
    for ctx in list_operable_branches(user, "pharmacy.read"):
        branch = branches_collection.find_one({"branch_id": ctx.branch_id}) or {}
        out.append(
            {
                "branch_id": ctx.branch_id,
                "branch_name": branch.get("branch_name"),
                "pharmacy_id": ctx.pharmacy_id,
                "staff_role": ctx.staff_role,
            }
        )
    return out
