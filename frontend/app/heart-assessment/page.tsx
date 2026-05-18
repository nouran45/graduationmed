"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Heart, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Logo } from "@/components/logo"
import {
  predictHeartDisease,
  HeartPredictionInput,
  HeartPredictionResult,
} from "@/components/heart-disease-predictor"

// ── What changed vs old version ──────────────────────────────────────
//   REMOVED fields:  ca (major vessels), thal (thalassemia)
//   REMOVED from formData default state: ca, thal
//   FIXED probability display: was results.probability (undefined)
//                               now results.probability_disease
//   REMOVED the "fixedResult" swap hack — backend returns correct values
//   REMOVED ca and thal form fields from the JSX
// ─────────────────────────────────────────────────────────────────────

export default function HeartAssessment() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<HeartPredictionResult | null>(null)

  // Default form state — 11 features, no ca, no thal
  const [formData, setFormData] = useState<HeartPredictionInput>({
    age: 50,
    trestbps: 120,
    chol: 200,
    thalach: 150,
    oldpeak: 1.0,
    fbs: 0,
    sex: 0,
    cp: 0,
    restecg: 0,
    exang: 0,
    slope: 1,
  })

  const handleInputChange = (
    field: keyof HeartPredictionInput,
    value: number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      // Send directly — no swap hack needed, backend returns correct values
      const result = await predictHeartDisease(formData)
      setResults(result)
      sessionStorage.setItem("heartResults", JSON.stringify(result))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prediction failed")
    } finally {
      setLoading(false)
    }
  }

  const handleViewResults = () => {
    router.push("/heart-assessment/heart-results")
  }

  // ── Results summary screen ─────────────────────────────────────────
  if (results) {
    return (
      <div className="min-h-screen bg-muted">
        <Header />
        <div className="container max-w-4xl py-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="bg-green-100 p-4 rounded-full mb-4">
              <Heart className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-secondary mb-4">
              Assessment Complete
            </h1>
            <p className="text-gray-600">Heart disease risk analysis results</p>
          </div>

          <Card className="border-0 shadow-md mb-6">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                {results.prediction === 1 ? (
                  <AlertTriangle className="h-12 w-12 text-red-600" />
                ) : (
                  <CheckCircle className="h-12 w-12 text-green-600" />
                )}
              </div>
              <h3
                className={`text-2xl font-bold mb-2 ${results.prediction === 1 ? "text-red-600" : "text-green-600"
                  }`}
              >
                {results.prediction === 1
                  ? "High Risk of Heart Disease"
                  : "Low Risk of Heart Disease"}
              </h3>

              {/* FIXED: was results.probability (undefined field) */}
              <div className="text-3xl font-bold text-primary my-4">
                {(results.probability_disease * 100).toFixed(1)}%
              </div>
              <p className="text-gray-600 mb-2">Probability of heart disease</p>
              <p className="text-sm text-gray-500 mb-4">
                Risk level: <strong>{results.risk_level}</strong>
              </p>

              <Button
                onClick={handleViewResults}
                className="bg-green-600 hover:bg-green-700"
              >
                View Detailed Results
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => setResults(null)}>
              New Assessment
            </Button>
            <Button asChild variant="outline">
              <Link href="/services">Back to Services</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Form screen ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted">
      <Header />
      <div className="container max-w-4xl py-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-green-100 p-4 rounded-full mb-4">
            <Heart className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-secondary mb-4">
            Heart Disease Risk Assessment
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            AI-powered analysis of cardiovascular health factors
          </p>
          <p className="text-sm text-gray-500 max-w-2xl">
            Assess your risk of heart disease using advanced machine learning
            algorithms. Provide your health metrics for a comprehensive
            cardiovascular risk analysis.
          </p>
        </div>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age (years) *
                  </label>
                  <input
                    type="number" min="1" max="120"
                    value={formData.age}
                    onChange={(e) => handleInputChange("age", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                {/* Sex */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sex *
                  </label>
                  <select
                    value={formData.sex}
                    onChange={(e) => handleInputChange("sex", parseInt(e.target.value) as 0 | 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value={0}>Female</option>
                    <option value={1}>Male</option>
                  </select>
                </div>

                {/* Resting Blood Pressure */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resting Blood Pressure (mmHg) *
                  </label>
                  <input
                    type="number" min="60" max="250"
                    value={formData.trestbps}
                    onChange={(e) => handleInputChange("trestbps", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                {/* Cholesterol */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cholesterol (mg/dL) *
                  </label>
                  <input
                    type="number" min="50" max="700"
                    value={formData.chol}
                    onChange={(e) => handleInputChange("chol", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                {/* Max Heart Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Heart Rate Achieved (bpm) *
                  </label>
                  <input
                    type="number" min="50" max="250"
                    value={formData.thalach}
                    onChange={(e) => handleInputChange("thalach", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                {/* ST Depression */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ST Depression (Oldpeak) *
                  </label>
                  <input
                    type="number" step="0.1" min="0.0" max="10.0"
                    value={formData.oldpeak}
                    onChange={(e) => handleInputChange("oldpeak", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                {/* Fasting Blood Sugar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fasting Blood Sugar &gt; 120 mg/dL *
                  </label>
                  <select
                    value={formData.fbs}
                    onChange={(e) => handleInputChange("fbs", parseInt(e.target.value) as 0 | 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>

                {/* Chest Pain Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chest Pain Type *
                  </label>
                  <select
                    value={formData.cp}
                    onChange={(e) => handleInputChange("cp", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value={0}>Typical Angina</option>
                    <option value={1}>Atypical Angina</option>
                    <option value={2}>Non-anginal Pain</option>
                    <option value={3}>Asymptomatic</option>
                  </select>
                </div>

                {/* Resting ECG */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resting ECG Results *
                  </label>
                  <select
                    value={formData.restecg}
                    onChange={(e) => handleInputChange("restecg", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value={0}>Normal</option>
                    <option value={1}>ST-T Wave Abnormality</option>
                    <option value={2}>Left Ventricular Hypertrophy</option>
                  </select>
                </div>

                {/* Exercise Angina */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exercise Induced Angina *
                  </label>
                  <select
                    value={formData.exang}
                    onChange={(e) => handleInputChange("exang", parseInt(e.target.value) as 0 | 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>

                {/* ST Slope */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ST Slope *
                  </label>
                  <select
                    value={formData.slope}
                    onChange={(e) => handleInputChange("slope", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value={0}>Upsloping</option>
                    <option value={1}>Flat</option>
                    <option value={2}>Downsloping</option>
                  </select>
                </div>

              </div>{/* end grid */}

              <div className="flex justify-center gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 text-white hover:bg-green-700 px-8"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    "Assess Heart Disease Risk"
                  )}
                </Button>
                <Button asChild variant="outline">
                  <Link href="/services">Back to Services</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 max-w-[700px] mx-auto">
            <strong>Medical Disclaimer:</strong> This tool is for informational
            purposes only and is not a substitute for professional medical
            advice. Always consult with a healthcare professional for proper
            diagnosis and treatment of heart conditions.
          </p>
        </div>
      </div>
    </div>
  )
}

function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="bg-green-600 py-2">
        <div className="container flex justify-between items-center">
          <div className="flex items-center gap-2 text-white text-sm">
            <span>Cardiac Support: (800) 555-HEART</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-white text-sm hover:underline">
              Patient Portal
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
          <Link
            href="/services"
            className="flex items-center gap-2 text-secondary hover:text-green-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Services</span>
          </Link>
        </div>
      </div>
    </header>
  )
}