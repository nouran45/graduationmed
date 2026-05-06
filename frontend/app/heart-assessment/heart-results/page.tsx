"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Heart, Activity, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Logo } from "@/components/logo"
import { HeartPredictionResult } from "@/components/heart-disease-predictor"

export default function HeartResults() {
  const router = useRouter()
  const [results, setResults] = useState<HeartPredictionResult | null>(null)

  useEffect(() => {
    const storedResults = sessionStorage.getItem('heartResults')
    if (storedResults) {
      try {
        setResults(JSON.parse(storedResults))
      } catch (error) {
        console.error("Error parsing stored results:", error)
        router.push('/heart-assessment')
      }
    } else {
      router.push('/heart-assessment')
    }
  }, [router])

  if (!results) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>Loading results...</p>
        </div>
      </div>
    )
  }

  const highRisk = results.prediction === 1

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="bg-green-600 py-2">
          <div className="container flex justify-between items-center">
            <div className="flex items-center gap-2 text-white text-sm">
              <span>Cardiac Support: (800) 555-HEART</span>
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
              <Link href="/heart-assessment" className="flex items-center gap-2 text-secondary hover:text-green-600 transition-colors">
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Assessment</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-4xl py-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-green-100 p-4 rounded-full mb-4">
            <Heart className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-secondary mb-4">Heart Disease Risk Results</h1>
          <p className="text-gray-600">AI-powered cardiovascular health analysis</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                {highRisk ? (
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                )}
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${highRisk ? 'text-red-600' : 'text-green-600'}`}>
                {highRisk ? 'High Risk' : 'Low Risk'}
              </h3>
              <p className="text-gray-600">Heart Disease Risk</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {(results.probability).toFixed(1)}%
              </div>
              <h3 className="text-lg font-semibold mb-2">Probability</h3>
              <p className="text-gray-600">Risk Percentage</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <Activity className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {results.confidence ? `${(results.confidence ).toFixed(1)}%` : 'N/A'}
              </h3>
              <p className="text-gray-600">Model Confidence</p>
            </CardContent>
          </Card>
        </div>

        {/* FIXED Probability breakdown with proper typing */}
        {results.all_probabilities && Object.keys(results.all_probabilities).length > 0 && (
          <Card className="border-0 shadow-md mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-secondary mb-4">Detailed Probabilities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(results.all_probabilities).map(([condition, probability]) => {
                  // FIX: Type the probability as number
                  const probValue = probability as number;
                  const displayLabel = condition === '1' ? 'Heart Disease Present' : 
                                    condition === '0' ? 'No Heart Disease' : 
                                    condition.replace(/_/g, ' ');
                  
                  const isCurrent = (condition === '1' && highRisk) || (condition === '0' && !highRisk);
                  
                  return (
                    <div key={condition} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-semibold text-green-600">
                        {(probValue ).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600 capitalize">
                        {displayLabel}
                      </div>
                      {isCurrent && (
                        <div className="text-xs text-green-600 font-medium mt-1">✓ Current Assessment</div>
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
            <h2 className="text-xl font-bold text-secondary mb-4">Risk Assessment Summary</h2>
            <p className="text-gray-700 mb-4">
              Based on the cardiovascular health analysis, your risk of heart disease is{' '}
              <strong>{highRisk ? 'high' : 'low'}</strong> with a probability of{' '}
              <strong>{(results.probability ).toFixed(1)}%</strong>.
              {highRisk 
                ? ' Consultation with a cardiologist is strongly recommended for further evaluation and preventive measures.'
                : ' Continue maintaining healthy lifestyle habits and regular check-ups.'
              }
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">Important Note</h3>
              <p className="text-green-700 text-sm">
                This AI analysis is for preliminary assessment only. Always consult with a cardiologist 
                or healthcare professional for definitive diagnosis and treatment planning of heart conditions.
                {highRisk && ' If you experience chest pain, shortness of breath, or other cardiac symptoms, seek immediate medical attention.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">Recommended Next Steps</h2>
            <ul className="space-y-3">
              {highRisk ? (
                <>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Schedule appointment with cardiologist</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Consider cardiac stress testing</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Monitor blood pressure regularly</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Adopt heart-healthy diet and exercise</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Continue regular health check-ups</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Maintain healthy lifestyle habits</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Monitor cardiovascular risk factors annually</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Consult doctor if symptoms develop</span>
                  </li>
                </>
              )}
            </ul>
          </CardContent>
        </Card>

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
            <strong>Medical Disclaimer:</strong> This tool is for informational purposes only and is not a substitute
            for professional medical advice. Always consult with a healthcare professional for proper diagnosis and
            treatment of heart conditions.
          </p>
        </div>
      </div>
    </div>
  )
}