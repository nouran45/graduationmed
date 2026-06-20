"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronLeft,
  Scan,
  Bone,
  AlertTriangle,
  CheckCircle,
  Stethoscope,
  Brain,
  ShieldCheck,
  Info,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Logo } from "@/components/logo"

type ProbabilityMap = Record<string, number>

interface StageEEnsembleInfo {
  efficientnet_weight?: number
  swin_weight?: number
  efficientnet_p_not_fractured?: number
  swin_p_not_fractured?: number
  raw_ensemble_p_not_fractured?: number
  calibrated_p_not_fractured?: number
  temperature_T?: number
  decision_threshold?: number
}

interface XRayResult {
  success?: boolean
  diagnosis: string
  disease?: string
  label?: number
  confidence: number
  severity?: string
  treatment?: string
  all_probabilities?: ProbabilityMap
  probability_fracture?: number
  probability_no_fracture?: number
  stage?: string
  clinical_tier?: string
  clinical_action?: string
  needs_radiologist_review?: boolean
  ensemble?: StageEEnsembleInfo
  notes?: string
  type?: string
  uploadedImage?: string
}

function isFractureDetected(diagnosis?: string) {
  const text = (diagnosis || "").trim().toLowerCase()
  return text === "fracture" || text.includes("fracture suspected")
}

function toPercent(value?: number, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A"
  }

  const percentValue = value <= 1 ? value * 100 : value
  return `${percentValue.toFixed(digits)}%`
}

function toFixedSafe(value?: number, digits = 3) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A"
  }

  return value.toFixed(digits)
}

function getProbability(results: XRayResult, key: "fracture" | "no_fracture") {
  if (key === "fracture") {
    return (
      results.probability_fracture ??
      results.all_probabilities?.["Fracture"] ??
      results.all_probabilities?.["fracture"]
    )
  }

  return (
    results.probability_no_fracture ??
    results.all_probabilities?.["No Fracture"] ??
    results.all_probabilities?.["no_fracture"] ??
    results.all_probabilities?.["not fractured"]
  )
}

function getProbabilityEntries(results: XRayResult) {
  if (results.all_probabilities && Object.keys(results.all_probabilities).length > 0) {
    return Object.entries(results.all_probabilities)
  }

  const fallback: ProbabilityMap = {}

  if (typeof results.probability_fracture === "number") {
    fallback.Fracture = results.probability_fracture
  }

  if (typeof results.probability_no_fracture === "number") {
    fallback["No Fracture"] = results.probability_no_fracture
  }

  return Object.entries(fallback)
}

function generateRecommendations(results: XRayResult) {
  const recommendations: string[] = []

  if (results.clinical_action) {
    recommendations.push(results.clinical_action)
  }

  if (isFractureDetected(results.diagnosis)) {
    recommendations.push(
      "Arrange radiology or orthopedic review as soon as possible.",
      "Avoid moving or loading the affected area until assessed by a qualified clinician.",
      "Seek urgent care if there is severe pain, deformity, numbness, open wound, or reduced circulation."
    )
  } else {
    recommendations.push(
      "No fracture was detected by the AI model.",
      "If pain, swelling, deformity, or loss of function exists, clinical examination is still recommended.",
      "Use routine follow-up if symptoms persist or worsen."
    )
  }

  if (results.treatment) {
    recommendations.push(results.treatment)
  }

  return Array.from(new Set(recommendations))
}

function generateSummary(results: XRayResult) {
  const confidence = toPercent(results.confidence, 1)
  const tier = results.clinical_tier ? ` Clinical tier: ${results.clinical_tier}.` : ""
  const action = results.clinical_action ? ` Recommended action: ${results.clinical_action}.` : ""

  if (isFractureDetected(results.diagnosis)) {
    return `The Stage E X-ray model detected a possible fracture with ${confidence} confidence.${tier}${action}`
  }

  return `The Stage E X-ray model classified the image as no fracture with ${confidence} confidence.${tier}${action}`
}

export default function XRayResults() {
  const router = useRouter()
  const [results, setResults] = useState<XRayResult | null>(null)

  useEffect(() => {
    const storedResults = sessionStorage.getItem("xrayResults")

    if (!storedResults) {
      router.push("/x-ray")
      return
    }

    try {
      setResults(JSON.parse(storedResults))
    } catch (error) {
      console.error("Failed to parse X-ray results:", error)
      router.push("/x-ray")
    }
  }, [router])

  if (!results) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading X-ray results...</p>
        </div>
      </div>
    )
  }

  const fractureDetected = isFractureDetected(results.diagnosis)
  const fractureProbability = getProbability(results, "fracture")
  const noFractureProbability = getProbability(results, "no_fracture")
  const probabilityEntries = getProbabilityEntries(results)
  const recommendations = generateRecommendations(results)

  const mainColor = fractureDetected ? "red" : "green"

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="bg-primary py-2">
          <div className="container flex justify-between items-center">
            <div className="flex items-center gap-2 text-white text-sm">
              <span>Patient Support: (800) 555-1234</span>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/about" className="text-white text-sm hover:underline">
                About Us
              </Link>
              <Link href="/contact" className="text-white text-sm hover:underline">
                Contact
              </Link>
            </div>
          </div>
        </div>

        <div className="container py-4">
          <div className="flex justify-between items-center">
            <Logo />

            <Link href="/x-ray" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to X-ray Upload</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl py-8">
        <div className="text-center mb-8">
          <div className="bg-blue-100 p-4 rounded-full mb-4 inline-flex">
            <Scan className="h-12 w-12 text-primary" />
          </div>

          <h1 className="text-3xl font-bold text-secondary mb-3">
            X-ray Fracture Detection Results
          </h1>

          <p className="text-gray-600 max-w-3xl mx-auto">
            AI-assisted fracture screening report generated by the Stage E EfficientNetB0 + Swin-T ensemble.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-md overflow-hidden">
              <CardContent className="p-6">
                <div
                  className={`rounded-lg border p-5 ${
                    fractureDetected
                      ? "bg-red-50 border-red-200"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-full ${
                        fractureDetected ? "bg-red-100" : "bg-green-100"
                      }`}
                    >
                      {fractureDetected ? (
                        <AlertTriangle className="h-8 w-8 text-red-700" />
                      ) : (
                        <CheckCircle className="h-8 w-8 text-green-700" />
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm uppercase tracking-wide text-gray-500">
                        Main Diagnosis
                      </p>

                      <h2
                        className={`text-3xl font-bold mt-1 ${
                          fractureDetected ? "text-red-900" : "text-green-900"
                        }`}
                      >
                        {results.diagnosis || results.disease || "No diagnosis returned"}
                      </h2>

                      <p
                        className={`mt-3 leading-relaxed ${
                          fractureDetected ? "text-red-800" : "text-green-800"
                        }`}
                      >
                        {generateSummary(results)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3 mt-6">
                  <div className="border rounded-lg p-4 bg-white">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Confidence
                    </p>
                    <p className="text-2xl font-bold text-secondary mt-1">
                      {toPercent(results.confidence, 1)}
                    </p>
                  </div>

                  <div className="border rounded-lg p-4 bg-white">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Probability of Fracture
                    </p>
                    <p className="text-2xl font-bold text-red-700 mt-1">
                      {toPercent(fractureProbability, 1)}
                    </p>
                  </div>

                  <div className="border rounded-lg p-4 bg-white">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Probability of No Fracture
                    </p>
                    <p className="text-2xl font-bold text-green-700 mt-1">
                      {toPercent(noFractureProbability, 1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold text-secondary">
                    Clinical Interpretation
                  </h3>
                </div>

                <div className="space-y-4">
                  {results.clinical_tier && (
                    <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                      <p className="text-xs uppercase tracking-wide text-blue-700">
                        Clinical Tier
                      </p>
                      <p className="font-semibold text-blue-950 mt-1">
                        {results.clinical_tier}
                      </p>
                    </div>
                  )}

                  {results.clinical_action && (
                    <div className="border rounded-lg p-4 bg-white">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Suggested Clinical Action
                      </p>
                      <p className="font-semibold text-gray-900 mt-1">
                        {results.clinical_action}
                      </p>
                    </div>
                  )}

                  {typeof results.needs_radiologist_review === "boolean" && (
                    <div
                      className={`border rounded-lg p-4 ${
                        results.needs_radiologist_review
                          ? "bg-orange-50 border-orange-200"
                          : "bg-green-50 border-green-200"
                      }`}
                    >
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Radiologist Review
                      </p>
                      <p
                        className={`font-semibold mt-1 ${
                          results.needs_radiologist_review
                            ? "text-orange-800"
                            : "text-green-800"
                        }`}
                      >
                        {results.needs_radiologist_review
                          ? "Recommended / Required"
                          : "Not required by AI result, but clinical judgment still applies"}
                      </p>
                    </div>
                  )}

                  {results.severity && (
                    <div className="border rounded-lg p-4 bg-white">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Severity
                      </p>
                      <p className="font-semibold text-gray-900 mt-1">
                        {results.severity}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold text-secondary">
                    Recommendations
                  </h3>
                </div>

                <ul className="space-y-3">
                  {recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 leading-relaxed">
                        {recommendation}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {results.notes && (
              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-700 mt-0.5" />
                    <div>
                      <h3 className="text-xl font-bold text-secondary mb-2">
                        Important Note
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        {results.notes}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <aside className="space-y-6">
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Bone className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold text-secondary">
                    Uploaded X-ray
                  </h3>
                </div>

                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                  {results.uploadedImage ? (
                    <img
                      src={results.uploadedImage}
                      alt="Uploaded X-ray"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm text-center p-4">
                      Uploaded image preview was not saved for this report.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold text-secondary">
                    Probability Breakdown
                  </h3>
                </div>

                <div className="space-y-4">
                  {probabilityEntries.length > 0 ? (
                    probabilityEntries.map(([label, value]) => (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{label}</span>
                          <span className="font-semibold">{toPercent(value, 1)}</span>
                        </div>

                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              label.toLowerCase().includes("fracture") &&
                              !label.toLowerCase().includes("no")
                                ? "bg-red-500"
                                : "bg-green-500"
                            }`}
                            style={{
                              width: toPercent(value, 1),
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      No probability breakdown returned.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold text-secondary">
                    Model Information
                  </h3>
                </div>

                <div className="space-y-3 text-sm text-gray-700">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Model Version
                    </p>
                    <p className="font-semibold text-gray-900">
                      {results.stage || "Stage E — EfficientNetB0 + Swin-T ensemble"}
                    </p>
                  </div>

                  <div className="border-t pt-3">
                    <p className="font-semibold text-gray-900 mb-2">
                      Internal Held-out Test Performance
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-500">Accuracy</p>
                        <p className="font-bold">99.01%</p>
                      </div>

                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-500">AUC</p>
                        <p className="font-bold">0.9968</p>
                      </div>

                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-500">Missed Fractures</p>
                        <p className="font-bold">4</p>
                      </div>

                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-500">Test Set</p>
                        <p className="font-bold">506</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      Internal test set only; external validation is still required.
                    </p>
                  </div>

                  {results.ensemble && (
                    <div className="border-t pt-3">
                      <p className="font-semibold text-gray-900 mb-2">
                        Ensemble Details
                      </p>

                      <div className="space-y-1">
                        <p>
                          <strong>EfficientNet weight:</strong>{" "}
                          {toFixedSafe(results.ensemble.efficientnet_weight)}
                        </p>
                        <p>
                          <strong>Swin-T weight:</strong>{" "}
                          {toFixedSafe(results.ensemble.swin_weight)}
                        </p>
                        <p>
                          <strong>Temperature T:</strong>{" "}
                          {toFixedSafe(results.ensemble.temperature_T)}
                        </p>
                        <p>
                          <strong>Decision threshold:</strong>{" "}
                          {toFixedSafe(results.ensemble.decision_threshold)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button
            onClick={() => router.push("/x-ray")}
            className="bg-primary text-white hover:bg-primary/90"
          >
            Analyze Another X-ray
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="border-secondary text-secondary hover:bg-secondary hover:text-white"
          >
            Go to Dashboard
          </Button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 max-w-3xl mx-auto">
            <strong>Medical Disclaimer:</strong> This tool is for informational purposes only and is not a substitute
            for professional medical advice, radiologist reporting, or clinical diagnosis. Always consult with a
            qualified healthcare professional for proper diagnosis and treatment.
          </p>
        </div>
      </main>
    </div>
  )
}