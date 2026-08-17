from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class PrescriptionStatus(str, Enum):
    UPLOADED = "uploaded"
    OCR_PROCESSING = "ocr_processing"
    PENDING_REVIEW = "pending_review"
    REVIEWED = "reviewed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class OCRStatus(str, Enum):
    NOT_STARTED = "not_started"
    PROCESSING = "processing"
    DRAFT_READY = "draft_ready"
    FAILED = "failed"


class MatchStatus(str, Enum):
    UNMATCHED = "unmatched"
    POSSIBLE = "possible"
    MATCHED = "matched"


class ReviewDecision(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"


class PrescriptionFileMetadata(BaseModel):
    original_name: str
    content_type: str
    size_bytes: int = Field(ge=1)


class OCRMedicationDraft(BaseModel):
    line_id: str
    raw_text: str

    extracted_name: Optional[str] = None
    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    directions: Optional[str] = None

    quantity: Optional[int] = Field(default=None, ge=1)
    confidence: Optional[float] = Field(default=None, ge=0, le=1)

    matched_medication_id: Optional[str] = None
    match_status: MatchStatus = MatchStatus.UNMATCHED


class ReviewedMedication(BaseModel):
    line_id: str

    medication_id: Optional[str] = None
    confirmed_name: str

    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    directions: Optional[str] = None
    quantity: Optional[int] = Field(default=None, ge=1)

    pharmacist_notes: Optional[str] = None


class PrescriptionReviewRequest(BaseModel):
    decision: ReviewDecision
    reviewed_items: List[ReviewedMedication] = Field(default_factory=list)
    review_notes: Optional[str] = None


class PrescriptionResponse(BaseModel):
    prescription_id: str
    patient_id: str
    branch_id: str

    status: PrescriptionStatus
    ocr_status: OCRStatus

    file: PrescriptionFileMetadata

    ocr_items: List[OCRMedicationDraft] = Field(default_factory=list)
    reviewed_items: List[ReviewedMedication] = Field(default_factory=list)

    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None

    created_at: datetime
    updated_at: datetime