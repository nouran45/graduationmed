"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ArrowLeft, ChevronDown, ChevronUp, ExternalLink, Info, MessageCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Logo } from "@/components/logo"
import { Input } from "@/components/ui/input"

interface Prediction {
  disease: string;
  confidence: number;
  label?: number;
  success?: boolean;
  description?: string;
  symptoms?: string[];
  causes?: string;
  treatment?: string;
  link?: string;
}


const CONDITION_DETAILS: Record<string, {
  description: string;
  symptoms: string[];
  causes: string;
  treatment: string;
  link: string;
}> = {
  "acne": {
    description: "A common skin condition that occurs when hair follicles become clogged with oil and dead skin cells",
    symptoms: ["Pimples", "Blackheads", "Whiteheads", "Oily skin", "Inflammation"],
    causes: "Excess oil production, clogged hair follicles, bacteria, hormonal changes",
    treatment: "Topical treatments, oral medications, lifestyle changes, professional treatments",
    link: "https://www.mayoclinic.org/diseases-conditions/acne/symptoms-causes/syc-20368047"
  },
  "rosacea": {
    description: "A chronic skin condition that causes redness and visible blood vessels in your face",
    symptoms: ["Facial redness", "Visible blood vessels", "Swollen bumps", "Eye problems", "Burning sensation"],
    causes: "Genetic factors, environmental triggers, blood vessel abnormalities",
    treatment: "Topical medications, oral antibiotics, laser therapy, avoiding triggers",
    link: "https://www.mayoclinic.org/diseases-conditions/rosacea/symptoms-causes/syc-20353815"
  }
  
}

export default function ResultsPage() {
  const [isRouterReady, setIsRouterReady] = useState(false)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("conditions")
  const [expandedCondition, setExpandedCondition] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsRouterReady(true)
    
    const loadPredictions = () => {
      try {
        
        const params = new URLSearchParams(window.location.search)
        const predictionsParam = params.get('predictions')
        
        if (predictionsParam) {
          console.log("Raw predictions from URL:", predictionsParam) 
          const parsed = JSON.parse(predictionsParam)
          console.log("Parsed predictions:", parsed) 
          setPredictions(enhancePredictions(parsed))
          return
        }

        
        const saved = localStorage.getItem('predictions')
        if (saved) {
          const parsed = JSON.parse(saved)
          setPredictions(enhancePredictions(parsed))
          return
        }

        setError("No valid predictions found")
      } catch (err) {
        setError("Failed to load predictions")
        console.error("Error loading predictions:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadPredictions()
  }, [])

  const enhancePredictions = (rawPredictions: any): Prediction[] => {
    // Handle case where backend returns single prediction object
    console.log("Raw predictions in enhancer:", rawPredictions) // Debug log
    if (!Array.isArray(rawPredictions)) {
      rawPredictions = [rawPredictions]
    }

    return rawPredictions.map((pred: any) => {
      
      const conditionName = (pred.disease || "Unknown Condition").toString()
      const matchedCondition = Object.keys(CONDITION_DETAILS).find(key => 
        conditionName.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(conditionName.toLowerCase()))
        
      // Get details from our predefined condition details
    const details = matchedCondition 
    ? CONDITION_DETAILS[matchedCondition]
    : {
        description: `AI-detected ${conditionName}`,
        symptoms: ["Consult a doctor for specific symptoms"],
        causes: "Various possible causes",
        treatment: "Medical consultation recommended",
        link: "#"
      }
      

      return {
        disease: conditionName,
        confidence: pred.confidence ? Math.round(pred.confidence ) : 0,
        label: pred.label,
        success: pred.success,
        ...details
      }
    })
  }

  const toggleCondition = (id: string) => {
    setExpandedCondition(expandedCondition === id ? null : id)
  }

  if (!isRouterReady || isLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-secondary">Loading health analysis...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button 
            onClick={() => router.push('/symptom-checker')} 
            className="mt-4"
          >
            Start New Check
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted">
      {/*  */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        {/* */}
      </header>

      <div className="container max-w-4xl py-8">
        {/**/}
        <div className="flex flex-col items-start mb-8">
          <h1 className="text-3xl font-bold text-secondary mb-4">Your Health Analysis Results</h1>
          <p className="text-gray-600 max-w-[700px]">
            Based on the information you provided, our AI system has analyzed potential conditions that may match your symptoms.
          </p>
        </div>

        <Alert className="mb-8 border-amber-300 bg-amber-50 text-amber-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important Medical Disclaimer</AlertTitle>
          <AlertDescription>
            These AI-generated results are provided for informational purposes only and should not replace professional
            medical advice. Always consult with a healthcare provider for proper diagnosis.
          </AlertDescription>
        </Alert>

        {predictions.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <p className="text-gray-600">No conditions identified. Please try with different images or descriptions.</p>
              <Button 
                onClick={() => router.push('/symptom-checker')}
                className="mt-4"
              >
                Start New Check
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted">
              <TabsTrigger value="conditions" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Potential Conditions
              </TabsTrigger>
              <TabsTrigger value="symptoms" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Symptom Analysis
              </TabsTrigger>
              <TabsTrigger value="next-steps" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Next Steps
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conditions" className="mt-0 space-y-6">
              <div className="grid gap-6">
                {predictions.map((prediction, index) => {
                  const conditionId = prediction.disease.toLowerCase().replace(/\s+/g, '-')
                  const confidencePercent = Math.round(prediction.confidence * 100)
                  
                  return (
                    <Card key={index} className="border-0 shadow-md overflow-hidden">
                      <CardHeader className="bg-white pb-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-secondary">{prediction.disease}</CardTitle>
                            <CardDescription>
                              {confidencePercent >= 70 ? 'High' : confidencePercent >= 40 ? 'Moderate' : 'Low'} match based on AI analysis
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-primary">{confidencePercent}% match</div>
                            <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${confidencePercent}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="text-gray-600">{prediction.description}</p>

                        {expandedCondition === conditionId && (
                          <div className="mt-6 space-y-4 animate-in fade-in-50 duration-300">
                            <div>
                              <h4 className="font-medium text-secondary mb-2">Common Symptoms</h4>
                              <ul className="space-y-2">
                                {prediction.symptoms?.map((symptom, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <div className="h-5 w-5 rounded-full bg-accent flex items-center justify-center mt-0.5">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="text-primary"
                                      >
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                    </div>
                                    <span className="text-sm text-gray-600">{symptom}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h4 className="font-medium text-secondary mb-2">Possible Causes</h4>
                              <p className="text-sm text-gray-600">{prediction.causes}</p>
                            </div>

                            <div>
                              <h4 className="font-medium text-secondary mb-2">Treatment Options</h4>
                              <p className="text-sm text-gray-600">{prediction.treatment}</p>
                            </div>

                            <div className="pt-4">
                              <Link href={prediction.link} target="_blank" rel="noopener noreferrer">
                                <Button
                                  variant="outline"
                                  className="gap-2 w-full border-primary text-primary hover:bg-primary hover:text-white"
                                >
                                  Learn More About {prediction.disease.split('(')[0].trim()}
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="bg-gray-50 flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCondition(conditionId)}
                          className="text-secondary hover:text-primary hover:bg-transparent"
                        >
                          {expandedCondition === conditionId ? (
                            <>
                              <ChevronUp className="mr-2 h-4 w-4" />
                              <span>Show Less</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="mr-2 h-4 w-4" />
                              <span>Show More</span>
                            </>
                          )}
                        </Button>
                      </CardFooter>
                      <div className="h-1 w-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${confidencePercent}%` }}></div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            {/* */}
            <TabsContent value="next-steps" className="mt-0 space-y-6">
              {/**/}
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-between items-center mt-8">
          <Link href="/symptom-checker">
            <Button variant="outline" className="border-secondary text-secondary hover:bg-secondary hover:text-white">
              Start New Check
            </Button>
          </Link>
          <Link href="/health-chat">
            <Button className="bg-primary text-white hover:bg-primary/90">Continue with Health Chat</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
