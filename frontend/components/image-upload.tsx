"use client"

import { ChangeEvent, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  FileImage,
  ShieldCheck,
  Upload,
  UploadCloud,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "")

const MAX_FILE_SIZE_MB = 10

type SkinAnalysisDisplayResult = {
  disease: string
  confidence: number
  hideConfidence?: boolean
  status: "passed" | "review" | "blocked"
  protectionMessage: string
  message?: string
  raw: Record<string, unknown>
}

type ImageUploadProps = {
  onUploadComplete?: (result: SkinAnalysisDisplayResult) => void
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
  fallback = "Skin analysis completed"
) {
  for (const key of keys) {
    const value = data[key]

    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }

  return fallback
}

function normaliseSkinResult(data: Record<string, unknown>): SkinAnalysisDisplayResult {
  const nested =
    (data.result && typeof data.result === "object" ? data.result : null) ||
    (data.prediction && typeof data.prediction === "object" ? data.prediction : null) ||
    (data.output && typeof data.output === "object" ? data.output : null)

  const source = {
    ...data,
    ...((nested as Record<string, unknown> | null) ?? {}),
  }

  const disease = pickString(source, [
    "disease",
    "diagnosis",
    "diagnosis_name",
    "predicted_class",
    "class_name",
    "label_name",
    "condition",
    "result",
    "prediction",
  ])

  const confidence = normaliseConfidence(
    source.confidence ??
      source.confidence_score ??
      source.probability ??
      source.score ??
      source.max_probability ??
      source.prediction_probability
  )

  const rawStatus = pickString(
    source,
    ["status", "decision", "input_status", "defense_status", "safety_status"],
    "passed"
  ).toLowerCase()

  const flaggedInput = Boolean(
    source.attack_detected ||
      source.is_attack ||
      source.adversarial_detected ||
      source.rejected ||
      rawStatus.includes("attack") ||
      rawStatus.includes("rejected") ||
      rawStatus.includes("blocked") ||
      rawStatus.includes("unsafe")
  )

  const status: SkinAnalysisDisplayResult["status"] = flaggedInput
    ? "blocked"
    : confidence > 0 && confidence < 0.5
      ? "review"
      : "passed"

  const message = pickString(source, ["message", "detail", "notes", "explanation"], "")


  const routeText = String(
    source.route_used ||
      source.route ||
      source.model_route ||
      source.selected_model ||
      source.analysis_path ||
      ""
  ).toLowerCase()

const detectorClass = Number(source.detector_class)

const hideConfidence = Boolean(
  source.hide_confidence === true ||
    source.hideConfidence === true ||
    detectorClass === 1 ||
    detectorClass === 2 ||
    routeText.includes("sparse") ||
    routeText.includes("dense")
)

  return {
    disease,
    hideConfidence,
    confidence,
    status,
    protectionMessage: flaggedInput
      ? "The uploaded image was flagged by the protected screening layer. Please upload a clear, original clinical photo."
      : "Image passed the protected upload checks and was processed by the robust skin analysis workflow.",
    message,
    raw: data,
  }
}

export function ImageUpload({ onUploadComplete }: ImageUploadProps) {
  const [images, setImages] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<SkinAnalysisDisplayResult | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const confidencePercent = useMemo(() => {
    if (!analysis) return 0
    return Math.round(analysis.confidence * 100)
  }, [analysis])

  const removeImage = () => {
    setImages([])
    setSelectedFile(null)
    setAnalysis(null)
    setError(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files)
  }

  const handleFiles = (files: FileList) => {
    const file = Array.from(files)[0]
    if (!file) return

    setError(null)
    setAnalysis(null)

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file such as JPG, JPEG, or PNG.")
      return
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Image size must be less than ${MAX_FILE_SIZE_MB}MB.`)
      return
    }

    const preview = URL.createObjectURL(file)
    setImages([preview])
    setSelectedFile(file)

    void processImageForPrediction(file)
  }

  const processImageForPrediction = async (file: File) => {
    setIsLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("access_token") : null

      if (!token) {
        throw new Error("Please sign in first, then upload the image again.")
      }

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${API_BASE}/predict-skin-defense`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const rawText = await response.text()

      let data: Record<string, unknown> = {}

      try {
        data = rawText ? JSON.parse(rawText) : {}
      } catch {
        data = { message: rawText }
      }

      if (!response.ok) {
        const detail =
          typeof data.detail === "string"
            ? data.detail
            : typeof data.message === "string"
              ? data.message
              : `Upload failed with status ${response.status}`

        throw new Error(detail)
      }

      const normalized = normaliseSkinResult(data)

      setAnalysis(normalized)

      localStorage.setItem("skinAnalysisLastResult", JSON.stringify(normalized))
      localStorage.setItem("predictions", JSON.stringify([normalized]))

      onUploadComplete?.(normalized)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unexpected upload error. Please try again."

      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>

            <div>
              <h3 className="font-semibold text-secondary">
                Protected skin image analysis
              </h3>

              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                Upload a clear skin photo. The image is checked through a robust protection layer designed to reduce invalid, noisy, or manipulated uploads before analysis.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-secondary">Upload a skin photo</Label>

        <div className="grid grid-cols-1 gap-4">
          <div
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
              dragging
                ? "border-primary bg-accent"
                : "border-gray-300 hover:border-primary hover:bg-muted"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              className={`rounded-full p-4 ${
                dragging || isLoading ? "bg-accent" : "bg-muted"
              }`}
            >
              {isLoading ? (
                <UploadCloud className="h-9 w-9 animate-pulse text-primary" />
              ) : (
                <Upload
                  className={`h-9 w-9 ${
                    dragging ? "text-primary" : "text-gray-400"
                  }`}
                />
              )}
            </div>

            <div className="mt-4">
              {isLoading ? (
                <>
                  <p className="text-base font-semibold text-secondary">
                    Analyzing image securely...
                  </p>
                  <p className="text-sm text-gray-500">
                    Please keep this page open while the model processes your photo.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-secondary">
                    {dragging
                      ? "Drop image to upload"
                      : "Drag and drop your image here"}
                  </p>
                  <p className="text-sm text-gray-500">
                    or click to browse files. JPG, JPEG, PNG up to{" "}
                    {MAX_FILE_SIZE_MB}MB.
                  </p>
                </>
              )}
            </div>

            <Button
              variant="outline"
              type="button"
              className="mt-5 border-primary text-primary hover:bg-primary hover:text-white"
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
            >
              <FileImage className="mr-2 h-4 w-4" />
              {selectedFile ? "Choose Another Image" : "Select Image"}
            </Button>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImageUpload}
              disabled={isLoading}
            />
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
              <div className="group relative aspect-square overflow-hidden rounded-2xl border bg-white shadow-sm">
                <img
                  src={images[0] || "/placeholder.svg"}
                  alt="Uploaded skin image"
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h4 className="font-semibold text-secondary">Upload status</h4>
                <p className="mt-1 text-sm text-gray-500">{selectedFile?.name}</p>

                {isLoading && (
                  <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.03] p-4 text-sm text-primary">
                    Running protected image checks and AI analysis...
                  </div>
                )}

                {error && (
                  <div className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                {analysis && (
                  <div className="mt-4 space-y-4">
                    <div className="flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-semibold">Analysis complete</p>
                        <p>{analysis.protectionMessage}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border bg-muted/40 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Most likely result
                        </p>
                        <p className="mt-1 text-lg font-bold text-secondary">
                          {analysis.disease}
                        </p>
                      </div>

                      {!analysis.hideConfidence ? (
                        <div className="rounded-xl border bg-muted/40 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Confidence
                          </p>
                          <p className="mt-1 text-lg font-bold text-primary">
                            {confidencePercent}%
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl border bg-muted/40 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Verification
                          </p>
                          <p className="mt-1 text-lg font-bold text-primary">
                            Protected review applied
                          </p>
                        </div>
                      )}
                    </div>

                    {analysis.message && (
                      <p className="rounded-xl border bg-white p-4 text-sm text-gray-600">
                        {analysis.message}
                      </p>
                    )}

                    <Button
                      type="button"
                      className="w-full bg-primary text-white hover:bg-primary/90"
                      onClick={() => {
                        sessionStorage.setItem(
                          "skinAnalysisResults",
                          JSON.stringify([analysis])
                        )
                        window.location.href = "/symptom-checker/results"
                      }}
                    >
                      View Detailed Results
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="image-description" className="text-secondary">
            Describe the condition
          </Label>

          <Textarea
            id="image-description"
            placeholder="When did it start? Is it painful or itchy? Has it changed over time?"
            rows={4}
            className="border-gray-300 focus:border-primary focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="affected-areas" className="text-secondary">
            Affected area and triggers
          </Label>

          <Textarea
            id="affected-areas"
            placeholder="Which body area is affected? Any new products, foods, medication, or environmental triggers?"
            rows={4}
            className="border-gray-300 focus:border-primary focus:ring-primary"
          />
        </div>
      </div>
    </div>
  )
}