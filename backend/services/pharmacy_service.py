from datetime import datetime, timezone
from uuid import uuid4

from database import (
    pharmacies_collection,
    branches_collection,
    verification_collection,
)

from schemas.pharmacy import (
    PharmacyCreate,
    PharmacyUpdate,
    BranchCreate,
    BranchUpdate,
    VerificationStatus,
    VerificationDecision,
    StorefrontStatus,
)

# =========================================================
# SHARED HELPERS
# =========================================================

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_document(document: dict | None) -> dict | None:
    """
    Remove MongoDB internal _id before returning data.
    """

    if document is None:
        return None

    document = document.copy()
    document.pop("_id", None)

    return document


# =========================================================
# PHARMACY
# =========================================================

def create_pharmacy(data: PharmacyCreate) -> dict:
    """
    Create a new pharmacy profile.

    New pharmacies start in PENDING verification state.
    """

    now = _utc_now()

    pharmacy_id = f"ph_{uuid4().hex}"

    document = {
        "id": pharmacy_id,
        "name": data.name,
        "license_number": data.license_number,
        "phone": data.phone,
        "email": str(data.email) if data.email else None,

        "verification_status": VerificationStatus.PENDING.value,

        "created_at": now,
        "updated_at": now,
    }

    pharmacies_collection.insert_one(document)

    return _serialize_document(document)


def get_pharmacy(pharmacy_id: str) -> dict | None:
    """
    Get one pharmacy by pharmacy ID.
    """

    document = pharmacies_collection.find_one(
        {"id": pharmacy_id}
    )

    return _serialize_document(document)


def update_pharmacy(
    pharmacy_id: str,
    data: PharmacyUpdate,
) -> dict | None:
    """
    Update pharmacy profile fields.
    """

    update_data = data.model_dump(
        exclude_unset=True
    )

    if "email" in update_data and update_data["email"] is not None:
        update_data["email"] = str(update_data["email"])

    if not update_data:
        return get_pharmacy(pharmacy_id)

    update_data["updated_at"] = _utc_now()

    result = pharmacies_collection.update_one(
        {"id": pharmacy_id},
        {"$set": update_data},
    )

    if result.matched_count == 0:
        return None

    return get_pharmacy(pharmacy_id)


# =========================================================
# BRANCH
# =========================================================

def create_branch(data: BranchCreate) -> dict:
    """
    Create one physical pharmacy branch.
    """

    pharmacy = pharmacies_collection.find_one(
        {"id": data.pharmacy_id}
    )

    if pharmacy is None:
        raise ValueError("Pharmacy not found")

    now = _utc_now()

    branch_id = f"br_{uuid4().hex}"

    document = {
        "branch_id": branch_id,
        "pharmacy_id": data.pharmacy_id,

        "branch_name": data.branch_name,
        "address": data.address,
        "phone": data.phone,

        "latitude": data.latitude,
        "longitude": data.longitude,

        "storefront_status": StorefrontStatus.OFFLINE.value,

        "accepting_reservations": False,
        "pickup_enabled": False,
        "delivery_enabled": False,

        "created_at": now,
        "updated_at": now,
    }

    branches_collection.insert_one(document)

    return _serialize_document(document)


def get_branch(branch_id: str) -> dict | None:
    """
    Get one branch by branch ID.
    """

    document = branches_collection.find_one(
        {"branch_id": branch_id}
    )

    return _serialize_document(document)


def get_pharmacy_branches(pharmacy_id: str) -> list[dict]:
    """
    Return all branches belonging to one pharmacy.
    """

    documents = branches_collection.find(
        {"pharmacy_id": pharmacy_id}
    )

    return [
        _serialize_document(document)
        for document in documents
    ]


def update_branch(
    branch_id: str,
    data: BranchUpdate,
) -> dict | None:
    """
    Update branch information and storefront settings.
    """

    update_data = data.model_dump(
        exclude_unset=True
    )

    if not update_data:
        return get_branch(branch_id)

    if "storefront_status" in update_data:
        status = update_data["storefront_status"]

        if isinstance(status, StorefrontStatus):
            update_data["storefront_status"] = status.value

    update_data["updated_at"] = _utc_now()

    result = branches_collection.update_one(
        {"branch_id": branch_id},
        {"$set": update_data},
    )

    if result.matched_count == 0:
        return None

    return get_branch(branch_id)


# =========================================================
# VERIFICATION
# =========================================================

def submit_verification(pharmacy_id: str) -> dict:
    """
    Submit a pharmacy for admin verification.
    """

    pharmacy = pharmacies_collection.find_one(
        {"id": pharmacy_id}
    )

    if pharmacy is None:
        raise ValueError("Pharmacy not found")

    now = _utc_now()

    verification_id = f"ver_{uuid4().hex}"

    document = {
        "verification_id": verification_id,
        "pharmacy_id": pharmacy_id,

        "status": VerificationStatus.PENDING.value,
        "reason": None,

        "submitted_at": now,
        "reviewed_at": None,
    }

    verification_collection.insert_one(document)

    pharmacies_collection.update_one(
        {"id": pharmacy_id},
        {
            "$set": {
                "verification_status":
                    VerificationStatus.PENDING.value,
                "updated_at": now,
            }
        },
    )

    return _serialize_document(document)


def get_pending_verifications() -> list[dict]:
    """
    Return all pending verification requests.
    """

    documents = verification_collection.find(
        {"status": VerificationStatus.PENDING.value}
    )

    return [
        _serialize_document(document)
        for document in documents
    ]


def review_verification(
    pharmacy_id: str,
    status: VerificationDecision,
    reason: str | None = None,
) -> dict | None:
    """
    Admin reviews a pharmacy verification request.
    """

    allowed_statuses = {
    VerificationDecision.APPROVED,
    VerificationDecision.REJECTED,
    VerificationDecision.REQUEST_INFO,
    VerificationDecision.SUSPENDED,
    }

    if status not in allowed_statuses:
        raise ValueError(
            "Invalid verification decision"
        )

    pharmacy = pharmacies_collection.find_one(
        {"id": pharmacy_id}
    )

    if pharmacy is None:
        raise ValueError("Pharmacy not found")

    now = _utc_now()

    verification_collection.update_one(
        {
            "pharmacy_id": pharmacy_id,
            "status": VerificationStatus.PENDING.value,
        },
        {
            "$set": {
                "status": status.value,
                "reason": reason,
                "reviewed_at": now,
            }
        },
    )

    pharmacies_collection.update_one(
        {"id": pharmacy_id},
        {
            "$set": {
                "verification_status": status.value,
                "updated_at": now,
            }
        },
    )

    return get_pharmacy(pharmacy_id)


# =========================================================
# ELIGIBILITY / PUBLIC
# =========================================================

def is_branch_eligible(branch_id: str) -> bool:
    """
    Branch is eligible only if:
    - pharmacy is approved
    - branch storefront is online
    """

    branch = branches_collection.find_one(
        {"branch_id": branch_id}
    )

    if branch is None:
        return False

    pharmacy = pharmacies_collection.find_one(
        {"id": branch["pharmacy_id"]}
    )

    if pharmacy is None:
        return False

    return (
        pharmacy.get("verification_status")
        == VerificationStatus.APPROVED.value
        and branch.get("storefront_status")
        == StorefrontStatus.ONLINE.value
    )


def get_public_branches() -> list[dict]:
    """
    Return only approved + online branches
    for patient-facing pharmacy discovery.
    """

    result = []

    branches = branches_collection.find(
        {
            "storefront_status":
                StorefrontStatus.ONLINE.value
        }
    )

    for branch in branches:

        pharmacy = pharmacies_collection.find_one(
            {"id": branch["pharmacy_id"]}
        )

        if pharmacy is None:
            continue

        if (
            pharmacy.get("verification_status")
            != VerificationStatus.APPROVED.value
        ):
            continue

        result.append(
            {
                "branch_id": branch["branch_id"],
                "pharmacy_id": branch["pharmacy_id"],
                "pharmacy_name": pharmacy["name"],

                "branch_name": branch["branch_name"],
                "address": branch["address"],
                "phone": branch.get("phone"),

                "latitude": branch.get("latitude"),
                "longitude": branch.get("longitude"),

                "storefront_status":
                    branch["storefront_status"],

                "accepting_reservations":
                    branch.get(
                        "accepting_reservations",
                        False,
                    ),

                "pickup_enabled":
                    branch.get(
                        "pickup_enabled",
                        False,
                    ),

                "delivery_enabled":
                    branch.get(
                        "delivery_enabled",
                        False,
                    ),
            }
        )

    return result