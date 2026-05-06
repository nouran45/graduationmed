"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Info, Droplets } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Logo } from "@/components/logo"



export default function AnemiaPrediction() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    gender: "",
    hemoglobin: "",
    mch: "",
    mchc: "",
    mcv: ""
  })

  const [loading, setLoading] = useState(false)
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)

  try {
    // Convert form data to numbers
    const apiData = {
      gender: formData.gender,
      hemoglobin: Number(formData.hemoglobin),
      mch: Number(formData.mch),
      mchc: Number(formData.mchc),
      mcv: Number(formData.mcv)
    }

    console.log('Sending to API:', apiData)

    // Call the actual API instead of using simulated data
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/predict-anemia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify(apiData)
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()
    console.log('API response:', result)

    // Store the REAL API response
    sessionStorage.setItem('anemiaResults', JSON.stringify(result))
    router.push('/anemia-prediction/results')
    
  } catch (error) {
    console.error('Submission error:', error)
    // Handle error (show message to user)
  } finally {
    setLoading(false)
  }
}

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const isFormValid = () => {
    return formData.gender && formData.hemoglobin && formData.mch && formData.mchc && formData.mcv
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
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-blue-100 p-4 rounded-full mb-4">
            <Droplets className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary mb-4">
            Blood Test Parameters
          </h1>
          <p className="text-gray-600 max-w-[700px]">
            Enter your complete blood count (CBC) parameters for anemia assessment.
          </p>
        </div>

        {/* Detailed Description */}
        <Card className="border-0 shadow-md mb-6 bg-green-50 border-green-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-green-800 mb-3 flex items-center">
              <Info className="h-5 w-5 mr-2" />
              About Anemia Detection
            </h3>
            <div className="text-gray-700 text-sm space-y-2">
              <p>
                <strong>Anemia</strong> is a medical condition characterized by a deficiency in the number or quality of red blood cells, 
                leading to reduced oxygen-carrying capacity of the blood. This assessment analyzes key Complete Blood Count (CBC) 
                parameters to evaluate your risk of anemia and identify potential types.
              </p>
              <p>
                The parameters we analyze include hemoglobin levels (oxygen-carrying protein), Mean Corpuscular Hemoglobin (MCH - 
                average hemoglobin per red blood cell), Mean Corpuscular Hemoglobin Concentration (MCHC - hemoglobin concentration 
                in red blood cells), and Mean Corpuscular Volume (MCV - average red blood cell size).
              </p>
              <p>
                These values help differentiate between various types of anemia including iron-deficiency anemia, vitamin B12 
                deficiency, folate deficiency anemia, and hemolytic anemias.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md overflow-hidden">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Gender */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">Gender</label>
                    <select 
                      className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      required
                    >
                      <option value="">Choose gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                    <p className="text-xs text-gray-500">
                      Gender-specific reference ranges are used for accurate assessment
                    </p>
                  </div>
                  
                  {/* Hemoglobin */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">Hemoglobin (g/L)</label>
                    <input
                      type="number"
                      className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., 135"
                      value={formData.hemoglobin}
                      onChange={(e) => handleInputChange('hemoglobin', e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Normal range: Men 130-170 g/L, Women 120-150 g/L
                    </p>
                  </div>

                  {/* MCH */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">MCH - Mean Corpuscular Hemoglobin (pg)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., 27.5"
                      value={formData.mch}
                      onChange={(e) => handleInputChange('mch', e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Normal range: 27-31 pg. Measures average hemoglobin in each red blood cell
                    </p>
                  </div>
                  
                  {/* MCHC */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">MCHC - Mean Corpuscular Hemoglobin Concentration (g/dL)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., 33.5"
                      value={formData.mchc}
                      onChange={(e) => handleInputChange('mchc', e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Normal range: 32-36 g/dL. Measures hemoglobin concentration in red blood cells
                    </p>
                  </div>
                  
                  {/* MCV */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">MCV - Mean Corpuscular Volume (fL)</label>
                    <input
                      type="number"
                      className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., 88"
                      value={formData.mcv}
                      onChange={(e) => handleInputChange('mcv', e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Normal range: 80-100 fL. Measures average size of red blood cells
                    </p>
                  </div>
                  
                  {/* Parameter Summary */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">Parameter Interpretation Guide</label>
                    <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm text-gray-600">
                      <p className="mb-1"><strong>Low MCV + Low MCH</strong> = Microcytic hypochromic anemia</p>
                      <p className="mb-1"><strong>High MCV</strong> = Macrocytic anemia</p>
                      <p><strong>Normal MCV</strong> = Normocytic anemia</p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center mt-8">
                  <Button 
                    type="submit" 
                    className="bg-primary text-white hover:bg-primary/90 px-8 py-3 text-lg"
                    disabled={!isFormValid() || loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analyzing...
                      </>
                    ) : (
                      "Analyze Blood Parameters"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 max-w-[700px] mx-auto">
            <strong>Medical Disclaimer:</strong> This tool is for informational purposes only and is not a substitute
            for professional medical advice. Always consult with a healthcare professional for proper diagnosis and
            treatment. Reference ranges may vary between laboratories.
          </p>
        </div>
      </div>
    </div>
  )
}