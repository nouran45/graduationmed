"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X, Scan, AlertTriangle, CheckCircle, Info, ShieldCheck } from "lucide-react"

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

interface XRayPredictionResult {
  success?: boolean
  diagnosis: string
  disease?: string
  confidence: number
  label?: number
  severity?: string
  treatment?: string
  all_probabilities?: Record<string, number>
  probability_fracture?: number
  probability_no_fracture?: number
  notes?: string
  type?: string

  // Stage E metadata returned by backend
  stage?: string
  ensemble?: StageEEnsembleInfo
  clinical_tier?: string
  clinical_action?: string
  needs_radiologist_review?: boolean
}

interface XRayPredictorProps {
  onPredictionComplete?: (result: XRayPredictionResult) => void
  onImageUpload?: (file: File, previewUrl: string) => void
  compact?: boolean
}

function toPercent(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "N/A"
  }

  const numericValue = Number(value)
  const percentValue = numericValue <= 1 ? numericValue * 100 : numericValue
  return `${percentValue.toFixed(1)}%`
}

function toFixedSafe(value?: number, digits = 3): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "N/A"
  }

  return Number(value).toFixed(digits)
}

function getProbability(result: XRayPredictionResult, key: "fracture" | "no_fracture"): number | undefined {
  if (key === "fracture") {
    return (
      result.probability_fracture ??
      result.all_probabilities?.["Fracture"] ??
      result.all_probabilities?.["fracture"]
    )
  }

  return (
    result.probability_no_fracture ??
    result.all_probabilities?.["No Fracture"] ??
    result.all_probabilities?.["no_fracture"] ??
    result.all_probabilities?.["not fractured"]
  )
}

function getDiagnosisStyle(diagnosis?: string) {
  const diagnosisText = diagnosis?.toLowerCase() || ""

  if (diagnosisText.includes("fracture") && !diagnosisText.includes("no fracture")) {
    return {
      container: "bg-red-50 border-red-200",
      title: "text-red-900",
      text: "text-red-800",
      badge: "bg-red-100 text-red-800 border-red-200",
      icon: <AlertTriangle className="h-5 w-5 text-red-700" />,
    }
  }

  return {
    container: "bg-green-50 border-green-200",
    title: "text-green-900",
    text: "text-green-800",
    badge: "bg-green-100 text-green-800 border-green-200",
    icon: <CheckCircle className="h-5 w-5 text-green-700" />,
  }
}

function XRayResultCard({ prediction, compact = false }: { prediction: XRayPredictionResult; compact?: boolean }) {
  const style = getDiagnosisStyle(prediction.diagnosis)
  const fractureProbability = getProbability(prediction, "fracture")
  const noFractureProbability = getProbability(prediction, "no_fracture")

  return (
    <div className={`border rounded-lg p-4 ${style.container}`}>
      <div className="flex items-start gap-3 mb-4">
        {style.icon}
        <div className="flex-1">
          <h4 className={`font-semibold ${style.title}`}>
            Analysis Complete
          </h4>
          <p className={`text-sm mt-1 ${style.text}`}>
            AI-assisted X-ray fracture screening result
          </p>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white/70 border rounded-md p-3">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Diagnosis</p>
            <p className={`font-bold text-base ${style.title}`}>
              {prediction.diagnosis || prediction.disease || "No diagnosis returned"}
            </p>
          </div>

          <div className="bg-white/70 border rounded-md p-3">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Model Confidence</p>
            <p className={`font-bold text-base ${style.title}`}>
              {toPercent(prediction.confidence)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white/70 border rounded-md p-3">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Probability of Fracture</p>
            <p className="font-semibold text-gray-900">
              {toPercent(fractureProbability)}
            </p>
          </div>

          <div className="bg-white/70 border rounded-md p-3">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Probability of No Fracture</p>
            <p className="font-semibold text-gray-900">
              {toPercent(noFractureProbability)}
            </p>
          </div>
        </div>

        {prediction.severity && (
          <div className="bg-white/70 border rounded-md p-3">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Severity</p>
            <p className="font-semibold text-gray-900">{prediction.severity}</p>
          </div>
        )}

        {prediction.clinical_tier && (
          <div className="bg-white/70 border rounded-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-blue-700" />
              <p className="text-gray-500 text-xs uppercase tracking-wide">Clinical Tier</p>
            </div>
            <p className="font-semibold text-gray-900">{prediction.clinical_tier}</p>
          </div>
        )}

        {prediction.clinical_action && (
          <div className="bg-white/70 border rounded-md p-3">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Suggested Clinical Action</p>
            <p className="font-semibold text-gray-900">{prediction.clinical_action}</p>
          </div>
        )}

        {typeof prediction.needs_radiologist_review === "boolean" && (
          <div
            className={`border rounded-md p-3 ${
              prediction.needs_radiologist_review
                ? "bg-orange-50 border-orange-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            <p className="text-gray-500 text-xs uppercase tracking-wide">Radiologist Review</p>
            <p
              className={`font-semibold ${
                prediction.needs_radiologist_review ? "text-orange-800" : "text-green-800"
              }`}
            >
              {prediction.needs_radiologist_review
                ? "Recommended / Required"
                : "Not required by AI result, but clinical judgment still applies"}
            </p>
          </div>
        )}

        {prediction.treatment && (
          <div className="bg-white/70 border rounded-md p-3">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Recommendation</p>
            <p className="text-gray-900 leading-relaxed">{prediction.treatment}</p>
          </div>
        )}

        {prediction.notes && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-700 mt-0.5" />
              <p className="text-blue-900 leading-relaxed">{prediction.notes}</p>
            </div>
          </div>
        )}

        {!compact && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-2">
            <p className="font-semibold text-gray-900">Model Version</p>
            <p className="text-gray-700">
              {prediction.stage || "Stage E — EfficientNetB0 + Swin-T ensemble"}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700 pt-2">
              <p>
                <strong>Internal test accuracy:</strong> 99.01%
              </p>
              <p>
                <strong>Internal test AUC:</strong> 0.9968
              </p>
              <p>
                <strong>Missed fractures:</strong> 4
              </p>
              <p>
                <strong>Test set:</strong> 506 X-rays
              </p>
            </div>

            {prediction.ensemble && (
              <div className="pt-2 border-t border-gray-200">
                <p className="font-semibold text-gray-900 mb-1">Ensemble Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                  <p>
                    <strong>EfficientNet weight:</strong>{" "}
                    {toFixedSafe(prediction.ensemble.efficientnet_weight)}
                  </p>
                  <p>
                    <strong>Swin-T weight:</strong>{" "}
                    {toFixedSafe(prediction.ensemble.swin_weight)}
                  </p>
                  <p>
                    <strong>Temperature T:</strong>{" "}
                    {toFixedSafe(prediction.ensemble.temperature_T)}
                  </p>
                  <p>
                    <strong>Decision threshold:</strong>{" "}
                    {toFixedSafe(prediction.ensemble.decision_threshold)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function XRayPredictor({
  onPredictionComplete,
  onImageUpload,
  compact = false,
}: XRayPredictorProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState<XRayPredictionResult | null>(null)
  const [error, setError] = useState<string>("")

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file")
        return
      }

      setSelectedImage(file)

      const newPreviewUrl = URL.createObjectURL(file)
      setPreviewUrl(newPreviewUrl)

      setPrediction(null)
      setError("")

      if (onImageUpload) {
        onImageUpload(file, newPreviewUrl)
      }
    }
  }

  const clearImage = () => {
    setSelectedImage(null)
    setPreviewUrl("")
    setPrediction(null)
    setError("")

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }

  const processXRayPrediction = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null

    if (!token) {
      throw new Error("Authentication required. Please log in again.")
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

    const response = await fetch(`${apiUrl}/predict-fracture`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Upload failed with status ${response.status}: ${errorText}`)
    }

    return await response.json()
  }

  const handlePredict = async () => {
    if (!selectedImage) return

    try {
      setLoading(true)
      setError("")

      const result = await processXRayPrediction(selectedImage)

      setPrediction(result)

      if (onPredictionComplete) {
        onPredictionComplete(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          {!previewUrl ? (
            <div>
              <Upload className="mx-auto h-12 w-12 text-gray-400" />

              <div className="mt-4">
                <label htmlFor="xray-upload-compact" className="cursor-pointer">
                  <Button asChild variant="outline">
                    <span>Choose X-ray Image</span>
                  </Button>

                  <input
                    id="xray-upload-compact"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <p className="text-sm text-gray-500 mt-2">PNG, JPG, JPEG up to 10MB</p>
            </div>
          ) : (
            <div className="relative">
              <img
                src={previewUrl}
                alt="X-ray preview"
                className="max-h-64 mx-auto rounded-lg"
              />

              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {selectedImage && (
          <Button onClick={handlePredict} disabled={loading} className="w-full">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Analyzing X-ray...
              </>
            ) : (
              <>
                <Scan className="h-4 w-4 mr-2" />
                Analyze for Fractures
              </>
            )}
          </Button>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {prediction && <XRayResultCard prediction={prediction} compact={true} />}
      </div>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-6 w-6" />
          X-ray Fracture Detection
        </CardTitle>

        <CardDescription>
          Upload an X-ray image to screen for possible fractures using the Stage E ensemble model.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          {!previewUrl ? (
            <div>
              <Upload className="mx-auto h-12 w-12 text-gray-400" />

              <div className="mt-4">
                <label htmlFor="xray-upload-full" className="cursor-pointer">
                  <Button asChild variant="outline">
                    <span>Choose X-ray Image</span>
                  </Button>

                  <input
                    id="xray-upload-full"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <p className="text-sm text-gray-500 mt-2">PNG, JPG, JPEG up to 10MB</p>
            </div>
          ) : (
            <div className="relative">
              <img
                src={previewUrl}
                alt="X-ray preview"
                className="max-h-64 mx-auto rounded-lg"
              />

              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {selectedImage && (
          <Button onClick={handlePredict} disabled={loading} className="w-full">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Analyzing X-ray...
              </>
            ) : (
              <>
                <Scan className="h-4 w-4 mr-2" />
                Analyze for Fractures
              </>
            )}
          </Button>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {prediction && <XRayResultCard prediction={prediction} />}
      </CardContent>
    </Card>
  )
}