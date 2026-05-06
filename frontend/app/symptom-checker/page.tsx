"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Info } from "lucide-react"
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SymptomForm } from "@/components/symptom-form"
import { ImageUpload } from "@/components/image-upload"
import { Progress } from "@/components/ui/progress"
import { Logo } from "@/components/logo"




export default function SymptomChecker() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("symptoms")
  const [step, setStep] = useState(1)
  const [progress, setProgress] = useState(50)
  const [apiPredictions, setApiPredictions] = useState<any[]>([]);
  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
      setProgress((step + 1) * 50);
    } else {
      // Create URL with query params
      const params = new URLSearchParams();
      params.set('predictions', JSON.stringify(apiPredictions));
      
      router.push(`/symptom-checker/results?${params.toString()}`);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
      setProgress((step - 1) * 50)
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
              <Link href="/" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors">
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Home</span>
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
          <h1 className="text-3xl font-bold text-secondary mb-4">
            {step === 1 && "Tell Us About Your Symptoms"}
            {step === 2 && "Additional Information"}
          </h1>
          <p className="text-gray-600 max-w-[700px]">
            {step === 1 &&
              "Please provide information about your symptoms or upload photos to help identify potential conditions."}
            {step === 2 && "Just a few more details to help us provide more accurate results."}
          </p>
        </div>

        <Card className="border-0 shadow-md overflow-hidden">
          <CardContent className="p-6">
            {step === 1 && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted">
                  <TabsTrigger
                    value="symptoms"
                    className="data-[state=active]:bg-primary data-[state=active]:text-white"
                  >
                    Describe Symptoms
                  </TabsTrigger>
                  <TabsTrigger value="photos" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                    Upload Photos
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="symptoms" className="mt-0 space-y-4">
                  <SymptomForm />
                </TabsContent>
                <TabsContent value="photos" className="mt-0 space-y-4">
                  <ImageUpload 
                    onUploadComplete={(result) => {
                      setApiPredictions([result]);
                    }}/>
                </TabsContent>
              </Tabs>
            )}



            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-secondary">Medical History</h3>
                  <p className="text-sm text-gray-600">
                    Please provide any relevant medical history that might help with the analysis.
                  </p>
                  <textarea
                    className="w-full min-h-[150px] p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="List any chronic conditions, allergies, medications, or previous similar symptoms..."
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-secondary">Lifestyle Factors</h3>
                  <p className="text-sm text-gray-600">
                    These details can help provide more context for your symptoms.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Exercise Frequency</label>
                      <select className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary">
                        <option value="">Select option</option>
                        <option value="rarely">Rarely/Never</option>
                        <option value="1-2">1-2 times per week</option>
                        <option value="3-5">3-5 times per week</option>
                        <option value="daily">Daily</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Sleep Quality</label>
                      <select className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary">
                        <option value="">Select option</option>
                        <option value="poor">Poor</option>
                        <option value="fair">Fair</option>
                        <option value="good">Good</option>
                        <option value="excellent">Excellent</option>
                      </select>
                    </div>
                  </div>
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
              <Button onClick={handleNext} className="bg-primary text-white hover:bg-primary/90">
                {step === 2 ? "Get Results" : "Continue"} <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 max-w-[700px] mx-auto">
            <strong>Medical Disclaimer:</strong> This tool is for informational purposes only and is not a substitute
            for professional medical advice. Always consult with a healthcare professional for proper diagnosis and
            treatment.
          </p>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          document.addEventListener('DOMContentLoaded', function() {
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            const authLinks = document.getElementById('auth-links');
            const userLinks = document.getElementById('user-links');
            
            if (isLoggedIn) {
              authLinks.classList.add('hidden');
              userLinks.classList.remove('hidden');
            } else {
              authLinks.classList.remove('hidden');
              userLinks.classList.add('hidden');
            }
          });
        `,
        }}
      />
    </div>
  )
}
