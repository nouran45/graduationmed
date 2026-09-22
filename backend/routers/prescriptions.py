from fastapi import (
    APIRouter,
    Depends,
    File,
    Header,
    HTTPException,
    UploadFile,
    status,
)

from schemas.prescription import (
    PrescriptionResponse,
    PrescriptionReviewRequest,
)

from services.prescription_service import (
    create_prescription,
    get_prescription,
    list_pending_prescriptions,
    review_prescription,
)
from services.prescription_service import (
    create_prescription,
    get_prescription,
    get_prescription_for_branch,
    list_pending_prescriptions,
    review_prescription,
)

router = APIRouter(
    prefix="/api/prescriptions",
    tags=["Prescriptions"],
)


# =========================================================
# TEMPORARY DEVELOPMENT PATIENT
# Person 5 must replace this with authenticated
# server-side patient identity.
# =========================================================

def get_patient_scope(
    x_patient_id: str = Header(
        ...,
        alias="X-Patient-ID",
    ),
) -> str:
    patient_id = x_patient_id.strip()

    if not patient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient ID is required.",
        )

    return patient_id


# =========================================================
# TEMPORARY DEVELOPMENT BRANCH
# Person 2 / Person 5 integration must later replace
# this with trusted branch selection / eligibility.
# =========================================================

def get_branch_scope(
    x_branch_id: str = Header(
        ...,
        alias="X-Branch-ID",
    ),
) -> str:
    branch_id = x_branch_id.strip()

    if not branch_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Branch ID is required.",
        )

    return branch_id

# =========================================================
# TEMPORARY DEVELOPMENT PHARMACIST
# Person 5 must replace this with authenticated
# pharmacy staff identity.
# =========================================================

def get_pharmacist_scope(
    x_actor_id: str = Header(
        ...,
        alias="X-Actor-ID",
    ),
) -> str:
    pharmacist_id = x_actor_id.strip()

    if not pharmacist_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pharmacist ID is required.",
        )

    return pharmacist_id

# =========================================================
# PRESCRIPTION UPLOAD
# =========================================================

@router.post(
    "",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_prescription(
    file: UploadFile = File(...),
    patient_id: str = Depends(
        get_patient_scope
    ),
    branch_id: str = Depends(
        get_branch_scope
    ),
):
    file_bytes = await file.read()

    try:
        return create_prescription(
            patient_id=patient_id,
            branch_id=branch_id,
            filename=file.filename or "",
            content_type=(
                file.content_type
                or "application/octet-stream"
            ),
            file_bytes=file_bytes,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "The prescription could not be uploaded."
            ),
        ) from exc

# =========================================================
# PH7 - PHARMACY PRESCRIPTION QUEUE
# =========================================================

@router.get(
    "/pharmacy/queue",
    response_model=list[PrescriptionResponse],
)
def pharmacy_prescription_queue(
    branch_id: str = Depends(get_branch_scope),
):
    return list_pending_prescriptions(
        branch_id
    )


# =========================================================
# PH8 - PHARMACIST REVIEW
# =========================================================

@router.post(
    "/{prescription_id}/review",
    response_model=PrescriptionResponse,
)
def submit_prescription_review(
    prescription_id: str,
    request: PrescriptionReviewRequest,
    branch_id: str = Depends(get_branch_scope),
    pharmacist_id: str = Depends(
        get_pharmacist_scope
    ),
):
    try:
        reviewed = review_prescription(
            prescription_id=prescription_id,
            branch_id=branch_id,
            pharmacist_id=pharmacist_id,
            request=request,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if reviewed is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Pending prescription not found "
                "for this pharmacy branch."
            ),
        )

    return reviewed

# =========================================================
# PH8 - PHARMACY PRESCRIPTION DETAIL
# =========================================================

@router.get(
    "/pharmacy/{prescription_id}",
    response_model=PrescriptionResponse,
)
def pharmacy_prescription_detail(
    prescription_id: str,
    branch_id: str = Depends(
        get_branch_scope
    ),
):
    prescription = get_prescription_for_branch(
        prescription_id,
        branch_id,
    )

    if prescription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Prescription not found "
                "for this pharmacy branch."
            ),
        )

    return prescription

# =========================================================
# PRESCRIPTION GET
# =========================================================

@router.get(
    "/{prescription_id}",
    response_model=PrescriptionResponse,
)
def read_prescription(
    prescription_id: str,
    patient_id: str = Depends(
        get_patient_scope
    ),
):
    prescription = get_prescription(
        prescription_id
    )

    if prescription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found.",
        )

    if (
        prescription["patient_id"]
        != patient_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You cannot access another "
                "patient's prescription."
            ),
        )

    return prescription