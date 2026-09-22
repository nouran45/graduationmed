from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from database import prescriptions_collection
from schemas.prescription import (
    MatchStatus,
    OCRStatus,
    PrescriptionStatus,
)


# =========================================================
# PRIVATE PRESCRIPTION STORAGE
# =========================================================

PRIVATE_UPLOAD_ROOT = (
    Path(__file__).resolve().parents[1]
    / "private_uploads"
    / "prescriptions"
)

PRIVATE_UPLOAD_ROOT.mkdir(
    parents=True,
    exist_ok=True,
)


ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf",
}


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
    content_type: str,
    file_bytes: bytes,
) -> None:
    if not filename.strip():
        raise ValueError(
            "Prescription filename is required."
        )

    if not file_bytes:
        raise ValueError(
            "The selected prescription file is empty."
        )

    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(
            "Only JPG, PNG and PDF files are supported."
        )


def _save_private_file(
    prescription_id: str,
    original_filename: str,
    file_bytes: bytes,
) -> Path:
    """
    Save the uploaded prescription outside the public
    frontend tree.

    The generated filename is used instead of trusting
    the user's original filename.
    """

    suffix = Path(original_filename).suffix.lower()

    stored_filename = (
        f"{prescription_id}{suffix}"
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
    content_type: str,
    file_bytes: bytes,
) -> dict:
    _validate_upload(
        filename,
        content_type,
        file_bytes,
    )

    prescription_id = (
        _generate_prescription_id()
    )

    storage_path = _save_private_file(
        prescription_id,
        filename,
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
            "original_name": filename,
            "content_type": content_type,
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