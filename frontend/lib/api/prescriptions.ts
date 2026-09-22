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

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");


const DEMO_PATIENT_ID = "demo-patient-001";
const DEMO_BRANCH_ID = "demo-branch-001";
const DEMO_PHARMACIST_ID = "demo-pharmacist-001";







export async function uploadPrescription(
  file: File,
  branchId: string,
): Promise<PrescriptionResponse> {
  if (file.size < 1) {
    throw new Error("The selected prescription file is empty.");
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG and PDF files are supported.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE}/api/prescriptions`,
    {
      method: "POST",

      headers: {
        "X-Patient-ID": DEMO_PATIENT_ID,
        "X-Branch-ID": branchId,
      },

      body: formData,
    },
  );

  if (!response.ok) {
    let message = "The prescription could not be uploaded.";

    try {
      const errorBody = await response.json();

      if (
        typeof errorBody?.detail === "string"
      ) {
        message = errorBody.detail;
      }
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }

  return response.json();
}

export async function getPrescription(
  prescriptionId: string,
): Promise<PrescriptionResponse> {
  const response = await fetch(
    `${API_BASE}/api/prescriptions/${encodeURIComponent(
      prescriptionId,
    )}`,
    {
      method: "GET",

      headers: {
        "X-Patient-ID": DEMO_PATIENT_ID,
      },

      cache: "no-store",
    },
  );

  if (!response.ok) {
    let message = "Prescription not found.";

    try {
      const errorBody = await response.json();

      if (
        typeof errorBody?.detail === "string"
      ) {
        message = errorBody.detail;
      }
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }

  return response.json();
}


export async function getPharmacyPrescriptionQueue(
  branchId: string,
): Promise<PrescriptionResponse[]> {
  const response = await fetch(
    `${API_BASE}/api/prescriptions/pharmacy/queue`,
    {
      method: "GET",

      headers: {
        "X-Branch-ID": branchId,
      },

      cache: "no-store",
    },
  );

  if (!response.ok) {
    let message =
      "The prescription queue could not be loaded.";

    try {
      const errorBody = await response.json();

      if (
        typeof errorBody?.detail === "string"
      ) {
        message = errorBody.detail;
      }
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }

  return response.json();
}

export async function getPharmacyPrescription(
  prescriptionId: string,
  branchId: string,
): Promise<PrescriptionResponse> {
  const response = await fetch(
    `${API_BASE}/api/prescriptions/pharmacy/${encodeURIComponent(
      prescriptionId,
    )}`,
    {
      method: "GET",

      headers: {
        "X-Branch-ID": branchId,
      },

      cache: "no-store",
    },
  );

  if (!response.ok) {
    let message =
      "The prescription could not be loaded.";

    try {
      const errorBody = await response.json();

      if (
        typeof errorBody?.detail === "string"
      ) {
        message = errorBody.detail;
      }
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }

  return response.json();
}


export async function reviewPrescription(
  prescriptionId: string,
  branchId: string,
  request: PrescriptionReviewRequest,
): Promise<PrescriptionResponse> {
  const response = await fetch(
    `${API_BASE}/api/prescriptions/${encodeURIComponent(
      prescriptionId,
    )}/review`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "X-Branch-ID": branchId,
        "X-Actor-ID": DEMO_PHARMACIST_ID,
      },

      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    let message =
      "The prescription review could not be saved.";

    try {
      const errorBody = await response.json();

      if (
        typeof errorBody?.detail === "string"
      ) {
        message = errorBody.detail;
      }
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }

  return response.json();
}

export { DEMO_BRANCH_ID };