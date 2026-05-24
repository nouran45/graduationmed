"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Logo } from "@/components/logo"

type Prediction = {
  disease: string
  confidence: number
  hideConfidence?: boolean
  description?: string
  symptoms?: string[]
  causes?: string
  treatment?: string
  link?: string
  status?: "passed" | "review" | "blocked"
  protectionMessage?: string
  message?: string
  raw?: Record<string, unknown>
}

const CONDITION_DETAILS: Record<
  string,
  {
    description: string
    symptoms: string[]
    causes: string
    treatment: string
    link: string
  }
> = {
  acne: {
    description:
      "A common skin condition that occurs when hair follicles become clogged with oil and dead skin cells.",
    symptoms: ["Pimples", "Blackheads", "Whiteheads", "Oily skin", "Inflammation"],
    causes:
      "Excess oil production, clogged hair follicles, bacteria, and hormonal changes.",
    treatment:
      "Topical treatments, oral medications, lifestyle changes, and professional dermatology care when needed.",
    link: "https://www.mayoclinic.org/diseases-conditions/acne/symptoms-causes/syc-20368047",
  },
  rosacea: {
    description:
      "A chronic skin condition that can cause facial redness, visible blood vessels, and acne-like bumps.",
    symptoms: [
      "Facial redness",
      "Visible blood vessels",
      "Swollen bumps",
      "Burning sensation",
      "Eye irritation",
    ],
    causes:
      "A mix of genetic factors, environmental triggers, and blood vessel sensitivity.",
    treatment:
      "Trigger avoidance, topical medications, oral antibiotics, laser therapy, and dermatologist follow-up.",
    link: "https://www.mayoclinic.org/diseases-conditions/rosacea/symptoms-causes/syc-20353815",
  },
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value

  if (typeof value === "string") {
    const parsed = Number(value.replace("%", ""))
    if (Number.isFinite(parsed)) return parsed
  }

  return null
}

function normaliseConfidence(value: unknown): number {
  const numeric = asNumber(value)

  if (numeric === null) return 0
  if (numeric > 1) return Math.max(0, Math.min(100, numeric)) / 100

  return Math.max(0, Math.min(1, numeric))
}

function pickString(
  data: Record<string, unknown>,
  keys: string[],
  fallback: string
) {
  for (const key of keys) {
    const value = data[key]

    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }

  return fallback
}

function findDetails(name: string) {
  const match = Object.keys(CONDITION_DETAILS).find(
    (key) =>
      name.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(name.toLowerCase())
  )

  return match
    ? CONDITION_DETAILS[match]
    : {
        description: `The AI model identified ${name}. This result should be reviewed with clinical context and, when needed, by a healthcare professional.`,
        symptoms: [
          "Visible skin change",
          "Possible irritation",
          "Possible redness or texture change",
        ],
        causes:
          "Skin findings may have multiple causes, including irritation, infection, allergy, inflammation, or other dermatological conditions.",
        treatment:
          "Avoid self-diagnosis. Keep the area clean, avoid scratching or harsh products, and consult a healthcare professional for confirmation and treatment.",
        link: "https://www.aad.org/public/diseases/a-z",
      }
}

function rawToPrediction(raw: any): Prediction {
  const nested =
    (raw?.result && typeof raw.result === "object" ? raw.result : null) ||
    (raw?.prediction && typeof raw.prediction === "object" ? raw.prediction : null) ||
    (raw?.output && typeof raw.output === "object" ? raw.output : null)

  const source = {
    ...(raw ?? {}),
    ...(nested ?? {}),
  } as Record<string, unknown>

  const disease = pickString(
    source,
    [
      "disease",
      "diagnosis",
      "diagnosis_name",
      "predicted_class",
      "class_name",
      "label_name",
      "condition",
      "result",
      "prediction",
    ],
    "Skin analysis completed"
  )

  const confidence = normaliseConfidence(
    source.confidence ??
      source.confidence_score ??
      source.probability ??
      source.score ??
      source.max_probability ??
      source.prediction_probability
  )

  const statusText = pickString(
    source,
    ["status", "decision", "input_status", "defense_status", "safety_status"],
    "passed"
  ).toLowerCase()

  const blocked = Boolean(
    source.attack_detected ||
      source.is_attack ||
      source.adversarial_detected ||
      source.rejected ||
      statusText.includes("attack") ||
      statusText.includes("blocked") ||
      statusText.includes("rejected") ||
      statusText.includes("unsafe")
  )

  const details = findDetails(disease)


  const routeText = pickString(
  source,
  ["route", "pipeline", "model_route", "selected_model", "analysis_path"],
  ""
).toLowerCase()

const hideConfidence = Boolean(
  source.hide_confidence ||
    source.hideConfidence ||
    source.routed_through_attack_retrieval ||
    source.dense_attack_retrieval ||
    routeText.includes("dense") ||
    routeText.includes("retrieval") ||
    routeText.includes("protected")
)

  return {
    disease,
    hideConfidence,
    confidence,
    status: blocked ? "blocked" : confidence > 0 && confidence < 0.5 ? "review" : "passed",
    protectionMessage:
      typeof source.protectionMessage === "string"
        ? source.protectionMessage
        : blocked
          ? "The uploaded image was flagged by the protected screening layer. Please upload a clear, original clinical photo."
          : "Image passed the protected upload checks and was processed by the robust skin analysis workflow.",
    message: pickString(source, ["message", "detail", "notes", "explanation"], ""),
    raw,
    ...details,
  }
}

function expandPredictions(raw: any): Prediction[] {
  if (!raw) return []

  const source = Array.isArray(raw) ? raw : [raw]
  const output: Prediction[] = []

  for (const item of source) {
    const candidates = item?.predictions || item?.top_predictions || item?.results

    if (Array.isArray(candidates) && candidates.length > 0) {
      output.push(
        ...candidates.map((candidate: any) =>
          rawToPrediction({ ...item, ...candidate })
        )
      )
      continue
    }

    const probs =
      item?.all_probabilities || item?.probabilities || item?.class_probabilities

    if (probs && typeof probs === "object" && !Array.isArray(probs)) {
      const entries = Object.entries(probs as Record<string, unknown>)
        .map(([disease, confidence]) => ({ disease, confidence }))
        .sort(
          (a, b) =>
            normaliseConfidence(b.confidence) - normaliseConfidence(a.confidence)
        )
        .slice(0, 3)

      if (entries.length > 0) {
        output.push(...entries.map((entry) => rawToPrediction({ ...item, ...entry })))
        continue
      }
    }

    output.push(rawToPrediction(item))
  }

  return output
}

export default function ResultsPage() {
  const router = useRouter()

  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)

      const fromQuery = params.get("predictions")
      const fromSession = sessionStorage.getItem("skinAnalysisResults")
      const fromLocal =
        localStorage.getItem("predictions") ||
        localStorage.getItem("skinAnalysisLastResult")

      const selected = fromQuery || fromSession || fromLocal

      if (!selected) {
        setError("No analysis result was found. Please upload a skin image first.")
        return
      }

      const parsed = JSON.parse(selected)
      const enhanced = expandPredictions(parsed)

      if (enhanced.length === 0) {
        setError("No valid analysis result was found. Please try again with a clear image.")
        return
      }

      setPredictions(enhanced)
    } catch (err) {
      console.error("Failed to load skin analysis result:", err)
      setError("Failed to load the analysis result. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const topPrediction = useMemo(() => predictions[0], [predictions])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-secondary">Loading health analysis...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Result not available</AlertTitle>
          <AlertDescription>{error}</AlertDescription>

          <Button onClick={() => router.push("/skin-checker")} className="mt-4">
            Start New Skin Analysis
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Logo />

            <Link
              href="/skin-checker"
              className="flex items-center gap-2 text-secondary transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>New Skin Analysis</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary">
            Your Skin Analysis Results
          </h1>

          <p className="mt-2 max-w-3xl text-gray-600">
            The image was processed through a protected AI workflow. Results are informational and should be confirmed by a qualified healthcare professional.
          </p>
        </div>

        <Alert className="mb-8 border-amber-300 bg-amber-50 text-amber-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important Medical Disclaimer</AlertTitle>
          <AlertDescription>
            These AI-generated results are not a medical diagnosis and should not replace professional medical advice.
          </AlertDescription>
        </Alert>

        {topPrediction && (
          <Card className="mb-6 overflow-hidden border-0 shadow-md">
            <CardHeader className="bg-white">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <CardTitle className="text-2xl text-secondary">
                    {topPrediction.disease}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Most likely result from the uploaded image
                  </CardDescription>
                </div>

                {!topPrediction.hideConfidence ? (
                  <div className="rounded-2xl bg-primary/10 px-5 py-3 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">
                      Confidence
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {Math.round(topPrediction.confidence * 100)}%
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-primary/10 px-5 py-3 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">
                      Verification
                    </p>
                    <p className="text-lg font-bold text-primary">
                      Protected review applied
                    </p>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-6">
              <div className="flex gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">
                {topPrediction.status === "blocked" ? (
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                )}

                <div>
                  <p className="font-semibold">Protected image check</p>
                  <p className="text-sm">{topPrediction.protectionMessage}</p>
                </div>
              </div>

              <p className="text-gray-600">{topPrediction.description}</p>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border bg-white p-4">
                  <h3 className="font-semibold text-secondary">Common signs</h3>
                  <ul className="mt-3 space-y-2 text-sm text-gray-600">
                    {(topPrediction.symptoms ?? []).map((symptom) => (
                      <li key={symptom} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <h3 className="font-semibold text-secondary">Possible causes</h3>
                  <p className="mt-3 text-sm text-gray-600">
                    {topPrediction.causes}
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <h3 className="font-semibold text-secondary">
                    Recommended next step
                  </h3>
                  <p className="mt-3 text-sm text-gray-600">
                    {topPrediction.treatment}
                  </p>
                </div>
              </div>

              {topPrediction.message && (
                <div className="rounded-2xl border bg-muted/40 p-4 text-sm text-gray-600">
                  <span className="font-semibold text-secondary">Model note: </span>
                  {topPrediction.message}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {predictions.length > 1 && (
          <div className="mb-8 grid gap-4 md:grid-cols-2">
            {predictions.slice(1).map((prediction) => (
              <Card
                key={`${prediction.disease}-${prediction.confidence}`}
                className="border-0 shadow-sm"
              >
                <CardHeader>
                  <CardTitle className="text-lg text-secondary">
                    {prediction.disease}
                  </CardTitle>
                  <CardDescription>
                    {!prediction.hideConfidence
                      ? `${Math.round(prediction.confidence * 100)}% confidence`
                      : "Protected review applied"}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-gray-600">
                    {prediction.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex flex-col justify-between gap-3 sm:flex-row">
          <Link href="/skin-checker">
            <Button
              variant="outline"
              className="w-full border-secondary text-secondary hover:bg-secondary hover:text-white sm:w-auto"
            >
              Start New Analysis
            </Button>
          </Link>

          <Link
            href={topPrediction?.link || "https://www.aad.org/public/diseases/a-z"}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="w-full bg-primary text-white hover:bg-primary/90 sm:w-auto">
              Learn More <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}