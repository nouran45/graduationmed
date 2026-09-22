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

const MOCK_DELAY_MS = 400;
const DEMO_PATIENT_ID = "demo-patient-001";
const DEMO_BRANCH_ID = "demo-branch-001";

function wait(milliseconds = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}



const initialTime = new Date().toISOString();

const mockPrescriptions: PrescriptionResponse[] = [
  {
    prescription_id: "prescription-demo-001",
    patient_id: DEMO_PATIENT_ID,
    branch_id: DEMO_BRANCH_ID,

    status: "pending_review",
    ocr_status: "draft_ready",

    file: {
      original_name: "sample-prescription.jpg",
      content_type: "image/jpeg",
      size_bytes: 245000,
    },

    ocr_items: [
      {
        line_id: "line-001",
        raw_text: "Amoxcillin 500 mg cap three times daily",
        extracted_name: "Amoxcillin",
        strength: "500 mg",
        dosage_form: "capsule",
        directions: "three times daily",
        quantity: 21,
        confidence: 0.78,
        matched_medication_id: null,
        match_status: "possible",
      },
      {
        line_id: "line-002",
        raw_text: "Paracetamol 500 mg when needed",
        extracted_name: "Paracetamol",
        strength: "500 mg",
        dosage_form: "tablet",
        directions: "when needed",
        quantity: null,
        confidence: 0.93,
        matched_medication_id: "demo-medication-002",
        match_status: "matched",
      },
    ],

    reviewed_items: [],

    reviewed_by: null,
    review_notes: null,
    reviewed_at: null,

    created_at: initialTime,
    updated_at: initialTime,
  },
];

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
  await wait();

  return mockPrescriptions.filter(
    (item) =>
      item.branch_id === branchId &&
      item.status === "pending_review",
  );
}

export async function reviewPrescription(
  prescriptionId: string,
  request: PrescriptionReviewRequest,
): Promise<PrescriptionResponse> {
  await wait();

  const prescriptionIndex = mockPrescriptions.findIndex(
    (item) => item.prescription_id === prescriptionId,
  );

  if (prescriptionIndex === -1) {
    throw new Error("Prescription not found.");
  }

  if (
    request.decision === "approve" &&
    request.reviewed_items.length === 0
  ) {
    throw new Error(
      "At least one reviewed medication is required for approval.",
    );
  }

  const currentPrescription =
    mockPrescriptions[prescriptionIndex];

  const now = new Date().toISOString();

  const reviewedPrescription: PrescriptionResponse = {
    ...currentPrescription,

    status:
      request.decision === "approve"
        ? "reviewed"
        : "rejected",

    reviewed_items:
      request.decision === "approve"
        ? request.reviewed_items
        : [],

    reviewed_by: "demo-pharmacist-001",
    review_notes: request.review_notes,
    reviewed_at: now,
    updated_at: now,
  };

  mockPrescriptions[prescriptionIndex] =
    reviewedPrescription;

  return reviewedPrescription;
}

export { DEMO_BRANCH_ID };