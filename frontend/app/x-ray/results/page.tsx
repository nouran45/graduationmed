"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Scan, Bone, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Logo } from "@/components/logo"

// Updated interface to match backend response
interface XRayResult {
  diagnosis: string  // "Fracture" or "No Fracture"
  confidence: number
  severity?: string  // "High" or "Low"
  treatment?: string
  all_probabilities?: Record<string, number>
  notes?: string
}

export default function XRayResults() {
  const router = useRouter()
  const [results, setResults] = useState<XRayResult | null>(null)

  useEffect(() => {
    const storedResults = sessionStorage.getItem('xrayResults')
    if (storedResults) {
      try {
        setResults(JSON.parse(storedResults))
      } catch (error) {
        console.error("Error parsing stored results:", error)
        router.push('/x-ray')
      }
    } else {
      router.push('/x-ray')
    }
  }, [router])

// Helper function to determine if fracture is detected (updated)
const isFractureDetected = (diagnosis: string) => {
  const normalizedDiagnosis = diagnosis.toLowerCase().replace(/\s+/g, '_');
  return normalizedDiagnosis === 'fracture';
}
  // Generate recommendations based on backend data
  const generateRecommendations = (results: XRayResult) => {
    const recommendations = []
    
    if (isFractureDetected(results.diagnosis)) {
      recommendations.push(
        "Immediate consultation with orthopedic specialist recommended",
        "Avoid putting weight on affected area",
        "Apply ice to reduce swelling if present",
        "Keep the area immobilized until professional evaluation"
      )
      
      if (results.severity === "High") {
        recommendations.push("Consider visiting emergency department for urgent care")
      }
    } else {
      recommendations.push(
        "No fracture detected in the uploaded X-ray",
        "If pain persists, consult with an orthopedic specialist",
        "Follow RICE protocol (Rest, Ice, Compression, Elevation) if needed",
        "Schedule follow-up if symptoms worsen"
      )
    }
    
    // Add treatment recommendations if available
    if (results.treatment) {
      recommendations.push(results.treatment)
    }
    
    return recommendations
  }

  // Generate next steps based on backend data
  const generateNextSteps = (results: XRayResult) => {
    if (isFractureDetected(results.diagnosis)) {
      return `Based on the X-ray analysis, ${results.diagnosis.toLowerCase()} was detected with ${results.confidence * 100}% confidence. ${results.severity ? `Severity level: ${results.severity}.` : ''} ${results.notes || 'Professional medical consultation is strongly recommended.'}`
    } else {
      return `Based on the X-ray analysis, ${results.diagnosis.toLowerCase()} with ${results.confidence * 100}% confidence. ${results.notes || 'Clinical examination is recommended if symptoms persist.'}`
    }
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading results...</p>
        </div>
      </div>
    )
  }

  const fractureDetected = isFractureDetected(results.diagnosis)
  const recommendations = generateRecommendations(results)
  const nextSteps = generateNextSteps(results)

  // --- normalize & guard against inverted probs (place this above return) ---
const normalizedDiagnosis =
  (results?.diagnosis ?? "").toLowerCase().replace(/\s+/g, "_");

// coerce values to numbers + normalize keys (e.g., "No Fracture" -> "no_fracture")
const rawProbs = results?.all_probabilities ?? {};
const probs: Record<string, number> = Object.fromEntries(
  Object.entries(rawProbs).map(([k, v]) => [
    k.toLowerCase().replace(/\s+/g, "_"),
    Number(v),
  ])
);

// If binary task and the chosen diagnosis prob is lower than the other, swap them.
// (temporary front-end bandaid until backend is fixed)
if ("fracture" in probs && "no_fracture" in probs) {
  const chosen = normalizedDiagnosis === "no_fracture" ? "no_fracture" : "fracture";
  const other = chosen === "fracture" ? "no_fracture" : "fracture";
  if (probs[chosen] < probs[other]) {
    const tmp = probs[chosen];
    probs[chosen] = probs[other];
    probs[other] = tmp;
  }
}

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="bg-primary py-2">
          <div className="container flex justify-between items-center">
            <div className="flex items-center gap-2 text-white text-sm">
              <span>Patient Support: (800) 555-1234</span>
            </div>
            <div className="flex items-center gap-4">
              <div id="auth-links">
                <Link href="/login" className="text-white text-sm hover:underline">
                  Patient Portal
                </Link>
              </div>
              <div id="user-links" className="hidden">
                <Link href="/dashboard" className="text-white text-sm hover:underline">
                  Dashboard
                </Link>
              </div>
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
            <div className="flex items-center gap-4">
              <Link href="/x-ray" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors">
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Assessment</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-4xl py-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-blue-100 p-4 rounded-full mb-4">
            <Scan className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary mb-4">X-ray Analysis Results</h1>
          <p className="text-gray-600">AI-powered fracture detection analysis</p>
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
              <h3 className={`text-2xl font-bold mb-2 ${fractureDetected ? 'text-red-600' : 'text-green-600'}`}>
                {results.diagnosis}
              </h3>
              <p className="text-gray-600">X-ray Analysis Result</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {(results.confidence * 100).toFixed(1)}%
              </div>
              <h3 className="text-lg font-semibold mb-2">Confidence Level</h3>
              <p className="text-gray-600">Detection Accuracy</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <Bone className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {results.severity || 'N/A'}
              </h3>
              <p className="text-gray-600">Severity Level</p>
            </CardContent>
          </Card>
        </div>

{/* Probability breakdown if available */}
{probs && Object.keys(probs).length > 0 && (
  <Card className="border-0 shadow-md mb-6">
    <CardContent className="p-6">
      <h2 className="text-xl font-bold text-secondary mb-4">Detailed Probabilities</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(probs).map(([condition, probability]) => {
          // condition is already normalized (lowercase + underscores)
          const displayLabel =
            condition === "fracture"
              ? "Fracture Present"
              : condition === "no_fracture"
              ? "No Fracture"
              : condition.replace(/_/g, " ");

          return (
            <div key={condition} className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-primary">
                {(probability * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 capitalize">{displayLabel}</div>

              {/* Current diagnosis indicator */}
              {condition === normalizedDiagnosis && (
                <div className="text-xs text-green-600 font-medium mt-1">
                  ✓ Current Diagnosis
                </div>
              )}
            </div>
          );
        })}
      </div>
    </CardContent>
  </Card>
)}

        <Card className="border-0 shadow-md mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">Analysis Summary</h2>
            <p className="text-gray-700 mb-4">{nextSteps}</p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Important Note</h3>
              <p className="text-blue-700 text-sm">
                This AI analysis is for preliminary assessment only. Always consult with a radiologist 
                or orthopedic specialist for definitive diagnosis and treatment planning.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">Recommended Next Steps</h2>
            <ul className="space-y-3">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4 mt-8">
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

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 max-w-[700px] mx-auto">
            <strong>Medical Disclaimer:</strong> This tool is for informational purposes only and is not a substitute
            for professional medical advice. Always consult with a healthcare professional for proper diagnosis and
            treatment.
          </p>
        </div>
      </div>
    </div>
  )
}