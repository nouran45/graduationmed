import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from pymongo import ReturnDocument
from database import prescriptions_collection
from security.config import get_settings
from security.request_context import add_detail
from security.uploads import (
    CONTENT_TYPE,
    EXTENSION,
    safe_display_filename,
    sniff_type,
)
from schemas.prescription import (
    MatchStatus,
    OCRStatus,
    PrescriptionReviewRequest,
    PrescriptionStatus,
    ReviewDecision,
)


# =========================================================
# PRIVATE PRESCRIPTION STORAGE
# =========================================================

# Override with PRIVATE_UPLOAD_ROOT to point at a PERSISTENT volume.
# On a Hugging Face Space the default (inside the app directory) is wiped on
# every restart/redeploy, so prescription files would silently disappear.
PRIVATE_UPLOAD_ROOT = Path(
    os.getenv("PRIVATE_UPLOAD_ROOT")
    or (Path(__file__).resolve().parents[1] / "private_uploads" / "prescriptions")
)

PRIVATE_UPLOAD_ROOT.mkdir(
    parents=True,
    exist_ok=True,
)


# =========================================================
# SHARED HELPERS
# =========================================================

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_prescription(
    document: dict | None,
) -> dict | None:
    """
    Remove MongoDB's internal _id before returning
    prescription data to the API layer.
    """

    if document is None:
        return None

    document = document.copy()
    document.pop("_id", None)

    # Internal storage information must never be returned
    # to the frontend.
    document.pop("storage_path", None)

    return document


def _generate_prescription_id() -> str:
    return f"prescription_{uuid4().hex}"


def _validate_upload(
    filename: str,
    file_bytes: bytes,
) -> str:
    """
    Validate by CONTENT, not by what the client claims.

    The client-supplied Content-Type header and file extension are ignored:
    both are trivially forged. Returns the sniffed kind: jpeg | png | pdf.
    """
    if not filename.strip():
        raise ValueError(
            "Prescription filename is required."
        )

    if not file_bytes:
        raise ValueError(
            "The selected prescription file is empty."
        )

    if len(file_bytes) > get_settings().max_prescription_bytes:
        raise ValueError(
            "The prescription file is too large."
        )

    kind = sniff_type(file_bytes)

    add_detail("file_kind", kind or "unknown")

    if kind is None:
        raise ValueError(
            "Only JPG, PNG and PDF files are supported."
        )

    return kind


def _save_private_file(
    prescription_id: str,
    kind: str,
    file_bytes: bytes,
) -> Path:
    """
    Save the uploaded prescription outside the public frontend tree.

    The stored name is generated server-side and the extension comes from the
    sniffed file type. The user's filename never touches the file system.
    """

    stored_filename = (
        f"{prescription_id}{EXTENSION[kind]}"
    )

    storage_path = (
        PRIVATE_UPLOAD_ROOT
        / stored_filename
    )

    storage_path.write_bytes(file_bytes)

    return storage_path


# =========================================================
# TEMPORARY OCR STUB
# Phase 1 keeps OCR mocked/manual.
# Real OCR belongs to the later prescription CORE+ stage.
# =========================================================

def _build_stub_ocr_items() -> list[dict]:
    return [
        {
            "line_id": "line-001",
            "raw_text":
                "Amoxcillin 500 mg cap three times daily",

            "extracted_name": "Amoxcillin",
            "strength": "500 mg",
            "dosage_form": "capsule",
            "directions": "three times daily",

            "quantity": 21,
            "confidence": 0.78,

            "matched_medication_id": None,
            "match_status": MatchStatus.POSSIBLE.value,
        }
    ]


# =========================================================
# PRESCRIPTION CREATE
# =========================================================

def create_prescription(
    *,
    patient_id: str,
    branch_id: str,
    filename: str,
    file_bytes: bytes,
) -> dict:
    kind = _validate_upload(
        filename,
        file_bytes,
    )

    prescription_id = (
        _generate_prescription_id()
    )

    storage_path = _save_private_file(
        prescription_id,
        kind,
        file_bytes,
    )

    now = _utc_now()

    # Phase 1 keeps OCR as a temporary stub.
    # It is a draft only and must never be treated
    # as pharmacist-reviewed medication data.
    ocr_items = _build_stub_ocr_items()

    document = {
        "prescription_id": prescription_id,
        "patient_id": patient_id,
        "branch_id": branch_id,

        "status":
            PrescriptionStatus.PENDING_REVIEW.value,

        "ocr_status":
            OCRStatus.DRAFT_READY.value,

        "file": {
            "original_name": safe_display_filename(filename),
            "content_type": CONTENT_TYPE[kind],
            "size_bytes": len(file_bytes),
        },

        "storage_path": str(storage_path),

        "ocr_items": ocr_items,
        "reviewed_items": [],

        "reviewed_by": None,
        "review_notes": None,
        "reviewed_at": None,

        "created_at": now,
        "updated_at": now,
    }

    try:
        prescriptions_collection.insert_one(
            document
        )
    except Exception:
        # Avoid leaving an orphaned private file if
        # MongoDB insertion fails.
        storage_path.unlink(
            missing_ok=True
        )
        raise

    return _serialize_prescription(
        document
    )


# =========================================================
# PRESCRIPTION READ
# =========================================================

def get_prescription(
    prescription_id: str,
) -> dict | None:
    document = prescriptions_collection.find_one(
        {
            "prescription_id":
                prescription_id
        }
    )

    return _serialize_prescription(
        document
    )

def get_prescription_for_branch(
    prescription_id: str,
    branch_id: str,
) -> dict | None:
    document = prescriptions_collection.find_one(
        {
            "prescription_id": prescription_id,
            "branch_id": branch_id,
        }
    )

    return _serialize_prescription(
        document
    )


# =========================================================
# PHARMACY PRESCRIPTION QUEUE
# =========================================================

def list_pending_prescriptions(
    branch_id: str,
) -> list[dict]:
    documents = prescriptions_collection.find(
        {
            "branch_id": branch_id,
            "status": PrescriptionStatus.PENDING_REVIEW.value,
        }
    ).sort("created_at", 1)

    return [
        _serialize_prescription(document)
        for document in documents
    ]


# =========================================================
# PHARMACIST REVIEW
# =========================================================

def review_prescription(
    *,
    prescription_id: str,
    branch_id: str,
    pharmacist_id: str,
    request: PrescriptionReviewRequest,
) -> dict | None:
    if (
        request.decision == ReviewDecision.APPROVE
        and not request.reviewed_items
    ):
        raise ValueError(
            "At least one reviewed medication is required "
            "for approval."
        )

    now = _utc_now()

    if request.decision == ReviewDecision.APPROVE:
        new_status = PrescriptionStatus.REVIEWED.value

        reviewed_items = [
            item.model_dump()
            for item in request.reviewed_items
        ]
    else:
        new_status = PrescriptionStatus.REJECTED.value
        reviewed_items = []

    updated = prescriptions_collection.find_one_and_update(
        {
            "prescription_id": prescription_id,
            "branch_id": branch_id,
            "status": PrescriptionStatus.PENDING_REVIEW.value,
        },
        {
            "$set": {
                "status": new_status,
                "reviewed_items": reviewed_items,
                "reviewed_by": pharmacist_id,
                "review_notes": request.review_notes,
                "reviewed_at": now,
                "updated_at": now,
            }
        },
        return_document=ReturnDocument.AFTER,
    )

    return _serialize_prescription(updated)