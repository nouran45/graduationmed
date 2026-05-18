// components/heart-disease-predictor.ts
//
// ── What changed vs old version ──────────────────────────────────────
//   REMOVED from HeartPredictionInput:  ca, thal
//   ADDED   to HeartPredictionInput:    nothing new — 11 features total
//   REMOVED from HeartPredictionResult: probability (old field)
//   UPDATED HeartPredictionResult:      now maps backend response exactly
//     backend returns: probability_disease, probability_no_disease,
//                      confidence, has_heart_disease, risk_level,
//                      disease, diagnosis, recommendations, threshold_used
// ─────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

// ── Input type — 11 IEEE features, no ca, no thal ────────────────────
export interface HeartPredictionInput {
  // Numeric
  age: number
  trestbps: number
  chol: number
  thalach: number
  oldpeak: number
  // Binary numeric
  fbs: 0 | 1
  // Categorical
  sex: 0 | 1
  cp: 0 | 1 | 2 | 3
  restecg: 0 | 1 | 2
  exang: 0 | 1
  slope: 0 | 1 | 2
}

// ── Result type — maps exactly to HeartDiseaseResponse from backend ──
export interface HeartPredictionResult {
  success: boolean
  prediction: number        // 0 or 1
  has_heart_disease: boolean
  confidence: number        // 0–100 percentage
  probability_no_disease: number        // 0–100 percentage
  probability_disease: number        // 0–100 percentage
  risk_level: string        // "Very Low" | "Low" | "Moderate" | "High" | "Very High"
  disease: string        // "Heart Disease Detected" | "No Heart Disease Detected"
  diagnosis: string
  recommendations: string[]
  threshold_used: number        // e.g. 0.415
  // convenience: all_probabilities built client-side from the two fields above
  all_probabilities?: Record<string, number>
}

// ── Auth token helper ─────────────────────────────────────────────────
function getToken(): string {
  if (typeof window === "undefined") return ""
  // Try localStorage first (where your login stores it), then sessionStorage
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    ""
  )
}

// ── Main prediction function ──────────────────────────────────────────
export async function predictHeartDisease(
  input: HeartPredictionInput
): Promise<HeartPredictionResult> {
  const token = getToken()
  if (!token) {
    throw new Error("Not authenticated. Please log in first.")
  }

  const response = await fetch(`${API_BASE}/predict-heart`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

  if (response.status === 401) {
    throw new Error("Session expired. Please log in again.")
  }
  if (response.status === 422) {
    const detail = await response.json()
    throw new Error(`Invalid input: ${JSON.stringify(detail.detail)}`)
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}))
    throw new Error(detail.detail || `Server error (${response.status})`)
  }

  const data: HeartPredictionResult = await response.json()

  // Build all_probabilities from the two probability fields so the
  // results page can render the breakdown table without changes
  data.all_probabilities = {
    "0": data.probability_no_disease,
    "1": data.probability_disease,
  }

  return data
}