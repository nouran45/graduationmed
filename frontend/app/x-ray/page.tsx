"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Info, Bone, Scan } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Logo } from "@/components/logo"
import { XRayPredictor } from "@/components/x-ray-predictor"
import { AuthStateHandler } from "@/components/auth-state-handler"

export default function XRayPrediction() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [progress, setProgress] = useState(50)
  const [image, setImage] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<any>(null)

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1)
      setProgress((step + 1) * 50)
    } else {
      if (prediction) {
        sessionStorage.setItem('xrayResults', JSON.stringify(prediction))
        router.push('/x-ray/results')
      }
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
      setProgress((step - 1) * 50)
    }
  }

  const handlePredictionComplete = (result: any) => {
    setPrediction(result)
  }

  const handleImageUpload = (file: File, previewUrl: string) => {
    setImage(previewUrl)
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
              <AuthStateHandler />
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
              <Link href="/services" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors">
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Services</span>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex border-primary text-primary hover:bg-primary hover:text-white"
              >
                <Info className="mr-2 h-4 w-4" />
                Need Help?
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium text-secondary">Step {step} of 2</h2>
            <span className="text-sm text-gray-500">{progress}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" indicatorClassName="bg-primary" />
        </div>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-blue-100 p-4 rounded-full mb-4">
            <Scan className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary mb-4">
            {step === 1 && "Upload X-ray Image"}
            {step === 2 && "Clinical Information"}
          </h1>
          <p className="text-gray-600 max-w-[700px]">
            {step === 1 && "Upload your X-ray image for AI-powered fracture detection analysis."}
            {step === 2 && "Provide additional clinical information to improve assessment accuracy."}
          </p>
        </div>

        <Card className="border-0 shadow-md overflow-hidden">
          <CardContent className="p-6">
            {step === 1 && (
              <div className="space-y-6">
                <XRayPredictor 
                  onPredictionComplete={handlePredictionComplete}
                  onImageUpload={handleImageUpload}
                  compact={true}
                />
                
                {prediction && (
                  <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 font-medium">✓ Analysis Complete - Ready for Next Step</p>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">Injury Location</label>
                    <select className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Select location</option>
                      <option value="wrist">Wrist</option>
                      <option value="ankle">Ankle</option>
                      <option value="rib">Rib</option>
                      <option value="arm">Arm</option>
                      <option value="leg">Leg</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">Pain Level</label>
                    <select className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Select level</option>
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">Swelling Present</label>
                    <select className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">Mechanism of Injury</label>
                    <select className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Select type</option>
                      <option value="fall">Fall</option>
                      <option value="sports">Sports injury</option>
                      <option value="accident">Accident</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-secondary">Additional Symptoms</label>
                  <textarea
                    className="w-full min-h-[100px] p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Describe any additional symptoms, bruising, or limitations in movement..."
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
                className="border-secondary text-secondary hover:bg-secondary hover:text-white"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                onClick={handleNext} 
                className="bg-primary text-white hover:bg-primary/90"
                disabled={step === 1 && (!image || !prediction)}
              >
                {step === 2 ? "Get Results" : "Continue"} <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Description Section - KEPT INTACT */}
        <section className="bg-white py-16">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <h2 className="text-3xl font-bold text-secondary mb-6">X-ray Fracture Detection</h2>
                <div className="space-y-4 text-gray-600">
                  <p>
                    Our AI-powered X-ray analysis tool uses advanced computer vision algorithms to detect 
                    potential fractures in bone X-rays. The system analyzes radiographic images to identify 
                    fracture lines, bone displacement, and other indicators of bone injuries.
                  </p>
                  <p>
                    By combining image analysis with clinical information, our system provides accurate 
                    fracture detection and helps healthcare professionals in preliminary assessment of 
                    bone injuries.
                  </p>
                  <div className="space-y-3 mt-6">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Bone className="h-5 w-5 text-primary" />
                      </div>
                      <p>AI-powered fracture line detection</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Scan className="h-5 w-5 text-primary" />
                      </div>
                      <p>Multiple bone region support</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Scan className="h-5 w-5 text-primary" />
                      </div>
                      <p>Fast analysis with detailed reports</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-video rounded-lg overflow-hidden bg-white shadow-lg">
                  <img
                    src={image || "/placeholder.svg?height=400&width=600"}
                    alt="X-ray analysis interface"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

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