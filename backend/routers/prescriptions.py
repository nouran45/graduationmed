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
)

from services.prescription_service import (
    create_prescription,
    get_prescription,
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