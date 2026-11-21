"""
Prescription API  (identity now comes from the verified session).

Removed: X-Patient-ID, X-Actor-ID headers (client-controlled, forgeable).

Patients
    POST /api/prescriptions                   upload (branch_id = chosen target pharmacy)
    GET  /api/prescriptions/{id}              only the OWNER may read; others get 404

Pharmacy staff (membership verified against pharmacy_staff)
    GET  /api/prescriptions/pharmacy/queue
    GET  /api/prescriptions/pharmacy/{id}
    POST /api/prescriptions/{id}/review

Why 404 (not 403) for someone else's prescription?
    A 403 confirms "that ID exists but is not yours". 404 gives an attacker
    no such oracle. The real reason is still known server-side; Phase 2 will
    record it in the audit event as target_relation = "other_patient".
"""
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from security import audit_events as audit
from security import faults
from schemas.prescription import (
    PrescriptionResponse,
    PrescriptionReviewRequest,
)
from security.authorization import BranchContext, branch_permission
from security.config import get_settings
from security.identity import get_current_user
from security.rate_limit import rate_limit
from security.uploads import read_upload_limited
from services.pharmacy_service import is_branch_eligible
from services.prescription_service import (
    create_prescription,
    get_prescription,
    get_prescription_for_branch,
    list_pending_prescriptions,
    review_prescription,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/prescriptions",
    tags=["Prescriptions"],
)


def _branch_relation(prescription_id: str) -> str:
    """Why did a branch-scoped lookup fail? (internal reason, never sent to the client)"""
    return "other_branch" if get_prescription(prescription_id) is not None else "not_found"


# =========================================================
# PRESCRIPTION UPLOAD (patient)
# =========================================================

@router.post(
    "",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_prescription(
    file: UploadFile = File(...),
    branch_id: str = Form(..., min_length=1, max_length=64),
    user: dict = Depends(get_current_user),
    _rl: None = Depends(rate_limit("rx_upload", "upload_per_hour", 3600)),
):
    # The patient is whoever the session says they are. Not a header.
    patient_id = str(user["_id"])

    # The patient CHOOSES a target branch; it must be a real, approved,
    # online pharmacy branch (otherwise prescriptions could be pushed into
    # arbitrary or unapproved branch queues).
    if not is_branch_eligible(branch_id.strip()):
        audit.emit(
            "prescription.upload.rejected", outcome="rejected", resource_type="prescription",
            target_ref=audit.ref("branch", branch_id.strip()), details={"reason": "branch_unavailable"},
        )
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "The selected pharmacy branch is not available.",
        )

    file_bytes = await read_upload_limited(
        file, get_settings().max_prescription_bytes
    )

    try:
        created = create_prescription(
            patient_id=patient_id,
            branch_id=branch_id.strip(),
            filename=file.filename or "",
            file_bytes=file_bytes,
        )
        audit.emit(
            "prescription.upload.accepted", outcome="success", resource_type="prescription",
            target_relation="self", authorization_result="allowed", rule_id=audit.RULE_RX_OWN,
            target_ref=audit.ref("prescription", created["prescription_id"]),
        )
        return created

    except ValueError as exc:
        audit.emit(
            "prescription.upload.rejected", outcome="rejected", resource_type="prescription",
            details={"reason": "validation_failed"},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        logger.exception("Prescription upload failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The prescription could not be uploaded.",
        ) from exc


# =========================================================
# PH7 - PHARMACY PRESCRIPTION QUEUE
# =========================================================

@router.get(
    "/pharmacy/queue",
    response_model=list[PrescriptionResponse],
)
def pharmacy_prescription_queue(
    ctx: BranchContext = Depends(branch_permission("prescription.read")),
):
    return list_pending_prescriptions(ctx.branch_id)


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
    ctx: BranchContext = Depends(branch_permission("prescription.review")),
):
    try:
        reviewed = review_prescription(
            prescription_id=prescription_id,
            branch_id=ctx.branch_id,            # verified, not client-supplied
            pharmacist_id=ctx.user_id,          # verified, not client-supplied
            request=request,
        )

    except ValueError as exc:
        audit.emit(
            "prescription.review.rejected", outcome="rejected", resource_type="prescription",
            rule_id=audit.RULE_RX_BRANCH, target_ref=audit.ref("prescription", prescription_id),
            details={"reason": "invalid_review"},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if reviewed is None:
        audit.emit(
            "prescription.review.rejected", outcome="rejected", resource_type="prescription",
            rule_id=audit.RULE_RX_BRANCH, authorization_result="denied",
            target_relation=_branch_relation(prescription_id),
            target_ref=audit.ref("prescription", prescription_id),
            details={"reason": "not_found_for_branch"},
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Pending prescription not found "
                "for this pharmacy branch."
            ),
        )

    audit.emit(
        "prescription.review.completed", outcome="success", resource_type="prescription",
        rule_id=audit.RULE_RX_BRANCH, authorization_result="allowed", target_relation="own_branch",
        target_ref=audit.ref("prescription", prescription_id),
        details={"decision": str(getattr(request.decision, "value", request.decision))},
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
    ctx: BranchContext = Depends(branch_permission("prescription.read")),
):
    prescription = get_prescription_for_branch(
        prescription_id,
        ctx.branch_id,
    )

    if prescription is None:
        audit.emit(
            "prescription.read.denied", outcome="denied", resource_type="prescription",
            rule_id=audit.RULE_RX_BRANCH, authorization_result="denied",
            target_relation=_branch_relation(prescription_id),
            target_ref=audit.ref("prescription", prescription_id),
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Prescription not found "
                "for this pharmacy branch."
            ),
        )

    audit.emit(
        "prescription.read.allowed", outcome="success", resource_type="prescription",
        rule_id=audit.RULE_RX_BRANCH, authorization_result="allowed", target_relation="own_branch",
        target_ref=audit.ref("prescription", prescription_id),
    )
    return prescription


# =========================================================
# PRESCRIPTION GET (patient, owner only)
# =========================================================

@router.get(
    "/{prescription_id}",
    response_model=PrescriptionResponse,
)
def read_prescription(
    prescription_id: str,
    user: dict = Depends(get_current_user),
):
    prescription = get_prescription(prescription_id)

    # The relationship is COMPUTED from the data (never assumed), so the event stays
    # truthful even when a staging fault lets a non-owner through.
    is_owner = prescription is not None and prescription["patient_id"] == str(user["_id"])

    if prescription is None or (not is_owner and not faults.fault_active("rx_read_idor")):
        # The HTTP answer is an identical 404 either way. The REAL reason is
        # recorded in the security event (BOLA attempt vs. unknown id).
        audit.emit(
            "prescription.read.denied", outcome="denied", resource_type="prescription",
            rule_id=audit.RULE_RX_OWN, authorization_result="denied",
            target_relation="other_patient" if prescription is not None else "not_found",
            target_ref=audit.ref("prescription", prescription_id),
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found.",
        )

    audit.emit(
        "prescription.read.allowed", outcome="success", resource_type="prescription",
        rule_id=audit.RULE_RX_OWN, authorization_result="allowed",
        target_relation="self" if is_owner else "other_patient",
        target_ref=audit.ref("prescription", prescription_id),
    )
    return prescription
