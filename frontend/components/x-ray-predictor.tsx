"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X, Scan } from 'lucide-react'

interface XRayPredictionResult {
  diagnosis: string
  confidence: number
  severity?: string
  treatment?: string
  all_probabilities?: Record<string, number>
  notes?: string
}

interface XRayPredictorProps {
  onPredictionComplete?: (result: XRayPredictionResult) => void
  onImageUpload?: (file: File, previewUrl: string) => void
  compact?: boolean
}

export function XRayPredictor({ onPredictionComplete, onImageUpload, compact = false }: XRayPredictorProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState<XRayPredictionResult | null>(null)
  const [error, setError] = useState<string>('')

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }

      setSelectedImage(file)
      const newPreviewUrl = URL.createObjectURL(file)
      setPreviewUrl(newPreviewUrl)
      setPrediction(null)
      setError('')

      // Notify parent component about the upload
      if (onImageUpload) {
        onImageUpload(file, newPreviewUrl)
      }
    }
  }

  const clearImage = () => {
    setSelectedImage(null)
    setPreviewUrl('')
    setPrediction(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }

  const processXRayPrediction = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    // FIXED: Get JWT token from localStorage using correct key
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    
    if (!token) {
      throw new Error('Authentication required. Please log in again.')
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

    const response = await fetch(`${apiUrl}/predict-fracture`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
      }
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
      setError('')
      const result = await processXRayPrediction(selectedImage)
      setPrediction(result)
      
      // Notify parent component about the prediction completion
      if (onPredictionComplete) {
        onPredictionComplete(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (compact) {
    return (
      <div className="space-y-4">
        {/* Compact version for multi-step forms */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          {!previewUrl ? (
            <div>
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="xray-upload" className="cursor-pointer">
                  <Button asChild variant="outline">
                    <span>Choose X-ray Image</span>
                  </Button>
                  <input
                    id="xray-upload"
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
          <Button
            onClick={handlePredict}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

        {prediction && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">Analysis Complete</h4>
            <p className="text-green-700 text-sm">Confidence: {(prediction.confidence * 100).toFixed(1)}%</p>
          </div>
        )}
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
          Upload an X-ray image to screen for possible fractures
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Image Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          {!previewUrl ? (
            <div>
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="xray-upload" className="cursor-pointer">
                  <Button asChild variant="outline">
                    <span>Choose X-ray Image</span>
                  </Button>
                  <input
                    id="xray-upload"
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

        {/* Prediction Button */}
        {selectedImage && (
          <Button
            onClick={handlePredict}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Prediction Results */}
        {prediction && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">Analysis Results</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Diagnosis:</strong> {prediction.diagnosis}</p>
              <p><strong>Confidence:</strong> {(prediction.confidence * 100).toFixed(2)}%</p>
              {prediction.severity && <p><strong>Severity:</strong> {prediction.severity}</p>}
              {prediction.notes && <p><strong>Notes:</strong> {prediction.notes}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}