from fastapi import APIRouter, HTTPException, status

from schemas.pharmacy import (
    PharmacyCreate,
    PharmacyUpdate,
    BranchCreate,
    BranchUpdate,
    VerificationAction,
)

from services.pharmacy_service import (
    create_pharmacy,
    get_pharmacy,
    update_pharmacy,
    create_branch,
    get_branch,
    get_pharmacy_branches,
    update_branch,
    submit_verification,
    get_pending_verifications,
    review_verification,
    get_public_branches,
)


router = APIRouter(
    prefix="/api",
    tags=["Pharmacy Network"],
)


# =========================================================
# PHARMACY
# =========================================================

@router.post(
    "/pharmacies",
    status_code=status.HTTP_201_CREATED,
)
def create_pharmacy_endpoint(data: PharmacyCreate):
    return create_pharmacy(data)


@router.get("/pharmacies/{pharmacy_id}")
def get_pharmacy_endpoint(pharmacy_id: str):

    pharmacy = get_pharmacy(pharmacy_id)

    if pharmacy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacy not found",
        )

    return pharmacy


@router.patch("/pharmacies/{pharmacy_id}")
def update_pharmacy_endpoint(
    pharmacy_id: str,
    data: PharmacyUpdate,
):

    pharmacy = update_pharmacy(
        pharmacy_id,
        data,
    )

    if pharmacy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacy not found",
        )

    return pharmacy


# =========================================================
# BRANCHES
# =========================================================

@router.post(
    "/pharmacies/{pharmacy_id}/branches",
    status_code=status.HTTP_201_CREATED,
)
def create_branch_endpoint(
    pharmacy_id: str,
    data: BranchCreate,
):
    """
    Create a branch for a pharmacy.

    The pharmacy_id in the URL is treated as the
    authoritative pharmacy ID.
    """

    if data.pharmacy_id != pharmacy_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "pharmacy_id in request body must "
                "match pharmacy_id in URL"
            ),
        )

    try:
        return create_branch(data)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.get("/pharmacies/{pharmacy_id}/branches")
def get_pharmacy_branches_endpoint(
    pharmacy_id: str,
):

    pharmacy = get_pharmacy(pharmacy_id)

    if pharmacy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacy not found",
        )

    return get_pharmacy_branches(pharmacy_id)


# IMPORTANT:
# Keep /branches/public before /branches/{branch_id}
@router.get("/branches/public")
def get_public_branches_endpoint():
    return get_public_branches()


@router.get("/branches/{branch_id}")
def get_branch_endpoint(branch_id: str):

    branch = get_branch(branch_id)

    if branch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found",
        )

    return branch


@router.patch("/branches/{branch_id}")
def update_branch_endpoint(
    branch_id: str,
    data: BranchUpdate,
):

    branch = update_branch(
        branch_id,
        data,
    )

    if branch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found",
        )

    return branch


# =========================================================
# PHARMACY VERIFICATION SUBMISSION
# =========================================================

@router.post(
    "/pharmacies/{pharmacy_id}/verification",
    status_code=status.HTTP_201_CREATED,
)
def submit_verification_endpoint(
    pharmacy_id: str,
):

    try:
        return submit_verification(pharmacy_id)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


# =========================================================
# ADMIN VERIFICATION
# =========================================================

@router.get("/admin/pharmacies/pending")
def pending_verifications_endpoint():
    """
    Temporary development endpoint.

    Person 5's reusable admin-role dependency should
    protect this endpoint before integration.
    """

    return get_pending_verifications()


@router.post(
    "/admin/pharmacies/{pharmacy_id}/verification"
)
def review_verification_endpoint(
    pharmacy_id: str,
    action: VerificationAction,
):
    """
    Admin verification action.

    Person 5's admin-role dependency must be added
    before production/main-app integration.
    """

    try:
        pharmacy = review_verification(
            pharmacy_id=pharmacy_id,
            status=action.status,
            reason=action.reason,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if pharmacy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacy not found",
        )

    return pharmacy