"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Heart, Activity, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Logo } from "@/components/logo"
import { HeartPredictionResult } from "@/components/heart-disease-predictor"

// ── What changed vs old version ──────────────────────────────────────
//   FIXED probability display:
//     was:  results.probability          (undefined — did not exist)
//     now:  results.probability_disease  (correct backend field)
//
//   FIXED confidence display:
//     was:  results.confidence (multiplied by 100 needlessly — already 0-100)
//     now:  results.confidence (used directly)
//
//   FIXED all_probabilities display:
//     was:  probValue (multiplied by 100 needlessly — already 0-100)
//     now:  probValue.toFixed(1) directly
//
//   ADDED: risk_level, threshold_used, diagnosis fields shown in results
//   ADDED: recommendations list from backend shown below next steps
// ─────────────────────────────────────────────────────────────────────

export default function HeartResults() {
  const router = useRouter()
  const [results, setResults] = useState<HeartPredictionResult | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem("heartResults")
    if (stored) {
      try {
        setResults(JSON.parse(stored))
      } catch {
        router.push("/heart-assessment")
      }
    } else {
      router.push("/heart-assessment")
    }
  }, [router])

  if (!results) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
          <p>Loading results...</p>
        </div>
      </div>
    )
  }

  const highRisk = results.prediction === 1

  return (
    <div className="min-h-screen bg-muted">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="bg-green-600 py-2">
          <div className="container flex justify-between items-center">
            <div className="flex items-center gap-2 text-white text-sm">
              <span>Cardiac Support: (800) 555-HEART</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-white text-sm hover:underline">Patient Portal</Link>
              <Link href="/about" className="text-white text-sm hover:underline">About Us</Link>
              <Link href="/contact" className="text-white text-sm hover:underline">Contact</Link>
            </div>
          </div>
        </div>
        <div className="container py-4">
          <div className="flex justify-between items-center">
            <Logo />
            <Link
              href="/heart-assessment"
              className="flex items-center gap-2 text-secondary hover:text-green-600 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Assessment</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="container max-w-4xl py-8">

        {/* Title */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-green-100 p-4 rounded-full mb-4">
            <Heart className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-secondary mb-4">Heart Disease Risk Results</h1>
          <p className="text-gray-600">AI-powered cardiovascular health analysis</p>
        </div>

        {/* Top three metric cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Risk verdict */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                {highRisk
                  ? <AlertTriangle className="h-8 w-8 text-red-600" />
                  : <CheckCircle className="h-8 w-8 text-green-600" />}
              </div>
              <h3 className={`text-2xl font-bold mb-1 ${highRisk ? "text-red-600" : "text-green-600"}`}>
                {highRisk ? "High Risk" : "Low Risk"}
              </h3>
              <p className="text-sm text-gray-500">{results.risk_level}</p>
              <p className="text-gray-600 mt-1">Heart Disease Risk</p>
            </CardContent>
          </Card>

          {/* Probability — FIXED: was results.probability (undefined) */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <div className={`text-3xl font-bold mb-2 ${highRisk ? "text-red-600" : "text-green-600"}`}>
                {results.probability_disease *100 .toFixed(1)}%
              </div>
              <h3 className="text-lg font-semibold mb-1">Disease Probability</h3>
              <p className="text-gray-500 text-sm">
                No disease: {results.probability_no_disease *100 .toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          {/* Confidence — FIXED: was results.confidence * 100, backend already sends 0-100 */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <Activity className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {results.confidence != null
                  ? `${results.confidence *100 .toFixed(1)}%`
                  : "N/A"}
              </h3>
              <p className="text-gray-600">Model Confidence</p>
              <p className="text-xs text-gray-400 mt-1">
                Threshold: {results.threshold_used ?? 0.415}
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Probability breakdown */}
        {results.all_probabilities &&
          Object.keys(results.all_probabilities).length > 0 && (
            <Card className="border-0 shadow-md mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-secondary mb-4">Detailed Probabilities</h2>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(results.all_probabilities).map(([key, value]) => {
                    const prob = value as number
                    // FIXED: was probValue * 100 — backend already returns percentage
                    const label = key === "1" ? "Heart Disease Present"
                      : key === "0" ? "No Heart Disease"
                        : key.replace(/_/g, " ")
                    const isCurrent =
                      (key === "1" && highRisk) || (key === "0" && !highRisk)
                    return (
                      <div
                        key={key}
                        className={`text-center p-4 rounded-lg ${isCurrent ? "bg-green-50 border border-green-200" : "bg-gray-50"
                          }`}
                      >
                        <div className={`text-2xl font-bold ${isCurrent
                            ? highRisk ? "text-red-600" : "text-green-600"
                            : "text-gray-500"
                          }`}>
                          {prob.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 capitalize mt-1">{label}</div>
                        {isCurrent && (
                          <div className="text-xs text-green-600 font-medium mt-1">
                            ✓ Current Assessment
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Diagnosis text from backend */}
        <Card className="border-0 shadow-md mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">Risk Assessment Summary</h2>
            <p className="text-gray-700 mb-4">{results.diagnosis}</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">Important Note</h3>
              <p className="text-green-700 text-sm">
                This AI analysis is for preliminary assessment only. Always consult
                with a cardiologist or healthcare professional for definitive diagnosis
                and treatment planning.
                {highRisk &&
                  " If you experience chest pain, shortness of breath, or other cardiac symptoms, seek immediate medical attention."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations from backend */}
        {results.recommendations && results.recommendations.length > 0 && (
          <Card className="border-0 shadow-md mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-secondary mb-4">
                Personalised Recommendations
              </h2>
              <ul className="space-y-3">
                {results.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Static next steps */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">Recommended Next Steps</h2>
            <ul className="space-y-3">
              {highRisk ? (
                <>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Schedule appointment with a cardiologist</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Consider cardiac stress testing and ECG</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Monitor blood pressure and cholesterol regularly</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Adopt a heart-healthy diet and exercise routine</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Continue regular health check-ups</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Maintain healthy lifestyle habits</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Monitor cardiovascular risk factors annually</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Consult a doctor if symptoms develop</span>
                  </li>
                </>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center gap-4 mt-8">
          <Button asChild className="bg-green-600 text-white hover:bg-green-700">
            <Link href="/services">Back to Services</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Consult Cardiologist</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/heart-assessment">New Assessment</Link>
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 max-w-[700px] mx-auto">
            <strong>Medical Disclaimer:</strong> This tool is for informational
            purposes only and is not a substitute for professional medical advice.
            Always consult with a healthcare professional for proper diagnosis and
            treatment of heart conditions.
          </p>
        </div>

      </div>
    </div>
  )
}