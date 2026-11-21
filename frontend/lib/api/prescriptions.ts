export type PrescriptionStatus =
  | "uploaded"
  | "ocr_processing"
  | "pending_review"
  | "reviewed"
  | "rejected"
  | "cancelled";

export type OCRStatus =
  | "not_started"
  | "processing"
  | "draft_ready"
  | "failed";

export type MatchStatus =
  | "unmatched"
  | "possible"
  | "matched";

export type ReviewDecision =
  | "approve"
  | "reject";

export type ISODateTime = string;

export interface PrescriptionFileMetadata {
  original_name: string;
  content_type: string;
  size_bytes: number;
}

export interface OCRMedicationDraft {
  line_id: string;
  raw_text: string;

  extracted_name: string | null;
  strength: string | null;
  dosage_form: string | null;
  directions: string | null;

  quantity: number | null;
  confidence: number | null;

  matched_medication_id: string | null;
  match_status: MatchStatus;
}

export interface ReviewedMedication {
  line_id: string;

  medication_id: string | null;
  confirmed_name: string;

  strength: string | null;
  dosage_form: string | null;
  directions: string | null;
  quantity: number | null;

  pharmacist_notes: string | null;
}

export interface PrescriptionReviewRequest {
  decision: ReviewDecision;
  reviewed_items: ReviewedMedication[];
  review_notes: string | null;
}

export interface PrescriptionResponse {
  prescription_id: string;
  patient_id: string;
  branch_id: string;

  status: PrescriptionStatus;
  ocr_status: OCRStatus;

  file: PrescriptionFileMetadata;

  ocr_items: OCRMedicationDraft[];
  reviewed_items: ReviewedMedication[];

  reviewed_by: string | null;
  review_notes: string | null;
  reviewed_at: ISODateTime | null;

  created_at: ISODateTime;
  updated_at: ISODateTime;
}

import {
  AUTO_BRANCH,
  ApiError,
  apiJson,
  branchHeader,
} from "@/lib/auth-client";

/**
 * Identity is now ONLY the bearer token (added by authFetch).
 *
 * Removed: DEMO_PATIENT_ID / DEMO_PHARMACIST_ID and the X-Patient-ID /
 * X-Actor-ID headers. The server derives the patient and the pharmacist from
 * the verified session, so nothing the browser sends can impersonate someone.
 *
 * `branchId`
 *   - patient upload : the branch the patient CHOSE (sent as form field)
 *   - pharmacy calls : optional selector (X-Branch-ID). Omit / AUTO_BRANCH to
 *     let the server pick the staff member's only branch. The server rejects
 *     any branch the user does not work at.
 */
export { AUTO_BRANCH };

export interface PublicBranch {
  branch_id: string;
  pharmacy_id: string;
  pharmacy_name: string;
  branch_name: string;
  address: string;
  phone: string | null;
}

export async function listPublicBranches(): Promise<PublicBranch[]> {
  return apiJson<PublicBranch[]>("/api/branches/public");
}

export async function uploadPrescription(
  file: File,
  branchId: string,
): Promise<PrescriptionResponse> {
  if (file.size < 1) {
    throw new Error("The selected prescription file is empty.");
  }

  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG and PDF files are supported.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("The file is larger than 10 MB.");
  }
  if (!branchId || branchId === AUTO_BRANCH) {
    throw new Error("Please choose a pharmacy branch.");
  }

  // The server re-validates all of this by inspecting the file's content.
  const formData = new FormData();
  formData.append("file", file);
  formData.append("branch_id", branchId);

  return apiJson<PrescriptionResponse>("/api/prescriptions", {
    method: "POST",
    body: formData,
  });
}

export async function getPrescription(
  prescriptionId: string,
): Promise<PrescriptionResponse> {
  return apiJson<PrescriptionResponse>(
    `/api/prescriptions/${encodeURIComponent(prescriptionId)}`,
    { cache: "no-store" },
  );
}

export async function getPharmacyPrescriptionQueue(
  branchId?: string,
): Promise<PrescriptionResponse[]> {
  return apiJson<PrescriptionResponse[]>("/api/prescriptions/pharmacy/queue", {
    cache: "no-store",
    headers: branchHeader(branchId),
  });
}

export async function getPharmacyPrescription(
  prescriptionId: string,
  branchId?: string,
): Promise<PrescriptionResponse> {
  return apiJson<PrescriptionResponse>(
    `/api/prescriptions/pharmacy/${encodeURIComponent(prescriptionId)}`,
    { cache: "no-store", headers: branchHeader(branchId) },
  );
}

export async function reviewPrescription(
  prescriptionId: string,
  branchId: string | undefined,
  request: PrescriptionReviewRequest,
): Promise<PrescriptionResponse> {
  return apiJson<PrescriptionResponse>(
    `/api/prescriptions/${encodeURIComponent(prescriptionId)}/review`,
    {
      method: "POST",
      headers: branchHeader(branchId),
      body: JSON.stringify(request),
    },
  );
}

export { ApiError };
