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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Logo } from "@/components/logo"

type ProbabilityMap = Record<string, number>

interface XRayResult {
  success?: boolean
  diagnosis: "Fracture" | "No Fracture" | string
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
  ensemble?: {
    efficientnet_weight?: number
    swin_weight?: number
    efficientnet_p_not_fractured?: number
    swin_p_not_fractured?: number
    raw_ensemble_p_not_fractured?: number
    calibrated_p_not_fractured?: number
    temperature_T?: number
    decision_threshold?: number
  }
  notes?: string
  type?: string
}

function isFractureDetected(diagnosis?: string) {
  return (diagnosis || "").trim().toLowerCase() === "fracture"
}

function toPercent(value?: number, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A"
  const decimalValue = value > 1 ? value / 100 : value
  return `${(decimalValue * 100).toFixed(digits)}%`
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

function isCurrentProbability(diagnosis: string, label: string) {
  const normalDiagnosis = diagnosis.toLowerCase().replace(/\s+/g, "_")
  const normalLabel = label.toLowerCase().replace(/\s+/g, "_")
  return normalDiagnosis === normalLabel
}

function generateRecommendations(results: XRayResult) {
  const recommendations: string[] = []

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

  if (results.clinical_action) {
    recommendations.unshift(results.clinical_action)
  }

  if (results.treatment) {
    recommendations.push(results.treatment)
  }

  return Array.from(new Set(recommendations))
}

function generateNextSteps(results: XRayResult) {
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
      console.error("Error parsing stored X-ray results:", error)
      router.push("/x-ray")
    }
  }, [router])

  if (!results) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>Loading results...</p>
        </div>
      </div>
    )
  }

  const fractureDetected = isFractureDetected(results.diagnosis)
  const probabilityEntries = getProbabilityEntries(results)
  const recommendations = generateRecommendations(results)
  const nextSteps = generateNextSteps(results)

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="bg-primary py-2">
          <div className="container flex justify-between items-center">
            <div className="flex items-center gap-2 text-white text-sm">
              <span>Patient Support: (800) 555-1234</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-white text-sm hover:underline">
                Dashboard
              </Link>
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
              <span>Back to Assessment</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="container max-w-5xl py-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-blue-100 p-4 rounded-full mb-4">
            <Scan className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary mb-4">X-ray Analysis Results</h1>
          <p className="text-gray-600">Stage E EfficientNetB0 + Swin-T ensemble fracture screening</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                {fractureDetected ? (
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                )}
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${fractureDetected ? "text-red-600" : "text-green-600"}`}>
                {results.diagnosis}
              </h3>
              <p className="text-gray-600">X-ray Analysis Result</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {toPercent(results.confidence, 1)}
              </div>
              <h3 className="text-lg font-semibold mb-2">Confidence Level</h3>
              <p className="text-gray-600">Model confidence for selected diagnosis</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <Bone className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{results.severity || "N/A"}</h3>
              <p className="text-gray-600">Severity Level</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Stethoscope className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-secondary">Clinical Decision Support</h2>
              </div>
              <div className="space-y-3 text-sm">
                <p><strong>Clinical Tier:</strong> {results.clinical_tier || "N/A"}</p>
                <p><strong>Recommended Action:</strong> {results.clinical_action || "Clinical review if symptomatic"}</p>
                <p>
                  <strong>Radiologist Review:</strong>{" "}
                  {results.needs_radiologist_review ? "Required / Recommended" : "Not required by AI tier if clinical exam agrees"}
                </p>
              </div>

              {results.needs_radiologist_review && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm font-medium">
                    Radiologist or orthopedic review is recommended for this result.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-secondary">Model Information</h2>
              </div>
              <div className="space-y-3 text-sm">
                <p><strong>Stage:</strong> {results.stage || "Stage E ensemble"}</p>
                {typeof results.ensemble?.efficientnet_weight === "number" && (
                  <p><strong>EfficientNetB0 Weight:</strong> {results.ensemble.efficientnet_weight}</p>
                )}
                {typeof results.ensemble?.swin_weight === "number" && (
                  <p><strong>Swin-T Weight:</strong> {results.ensemble.swin_weight}</p>
                )}
                {typeof results.ensemble?.temperature_T === "number" && (
                  <p><strong>Temperature T:</strong> {results.ensemble.temperature_T}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {probabilityEntries.length > 0 && (
          <Card className="border-0 shadow-md mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-secondary mb-4">Detailed Probabilities</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {probabilityEntries.map(([condition, probability]) => (
                  <div key={condition} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-semibold text-primary">
                      {toPercent(probability, 1)}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">{condition}</div>
                    {isCurrentProbability(results.diagnosis, condition) && (
                      <div className="text-xs text-green-600 font-medium mt-1">✓ Current Diagnosis</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-md mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">Analysis Summary</h2>
            <p className="text-gray-700 mb-4">{nextSteps}</p>

            {results.notes && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-2">Model Note</h3>
                <p className="text-blue-700 text-sm">{results.notes}</p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">Important Medical Disclaimer</h3>
              <p className="text-yellow-700 text-sm">
                This AI analysis is for preliminary screening only. It must not replace radiologist or clinician judgement.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">Recommended Next Steps</h2>
            <ul className="space-y-3">
              {recommendations.map((rec, index) => (
                <li key={`${rec}-${index}`} className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <Button asChild className="bg-primary text-white hover:bg-primary/90">
            <Link href="/services">Back to Services</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Consult Specialist</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/x-ray">New Analysis</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
