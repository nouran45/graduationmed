import { DiabetesRiskPredictor } from "@/components/diabetes-risk-predictor"
import { ArrowLeft, Droplets, Heart, Activity, Brain } from 'lucide-react'
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function DiabetesPredictionPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <Link href="/">
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Button>
                    </Link>

                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="bg-primary/10 p-4 rounded-full">
                                <Droplets className="h-12 w-12 text-primary" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900">
                            Diabetes Risk Assessment
                        </h1>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Evaluate your risk of developing Type 2 diabetes using evidence-based clinical parameters.
                            Our assessment considers multiple risk factors to provide you with personalized insights.
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center gap-3 mb-3">
                            <Heart className="h-8 w-8 text-red-500" />
                            <h3 className="font-semibold">Comprehensive Analysis</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            Our algorithm evaluates 8 key risk factors including age, BMI, HbA1c levels, and medical history.
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center gap-3 mb-3">
                            <Activity className="h-8 w-8 text-green-500" />
                            <h3 className="font-semibold">Evidence-Based</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            Based on established medical guidelines and diabetes risk assessment protocols.
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center gap-3 mb-3">
                            <Brain className="h-8 w-8 text-blue-500" />
                            <h3 className="font-semibold">Personalized Results</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            Receive tailored recommendations based on your individual risk profile and health status.
                        </p>
                    </div>
                </div>

                <DiabetesRiskPredictor />

                <div className="mt-12 bg-white p-8 rounded-lg shadow-sm border">
                    <h2 className="text-2xl font-bold mb-4">Understanding Diabetes Risk Factors</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold mb-2">Key Risk Factors:</h3>
                            <ul className="space-y-1 text-sm text-gray-600">
                                <li>• Age 45 years or older</li>
                                <li>• BMI of 25 kg/m² or higher</li>
                                <li>• Family history of diabetes</li>
                                <li>• Physical inactivity</li>
                                <li>• High blood pressure</li>
                                <li>• Abnormal cholesterol levels</li>
                                <li>• History of heart disease</li>
                                <li>• Smoking</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Prevention Strategies:</h3>
                            <ul className="space-y-1 text-sm text-gray-600">
                                <li>• Maintain a healthy weight</li>
                                <li>• Regular physical activity</li>
                                <li>• Balanced, nutritious diet</li>
                                <li>• Regular health screenings</li>
                                <li>• Manage blood pressure</li>
                                <li>• Quit smoking</li>
                                <li>• Limit alcohol consumption</li>
                                <li>• Manage stress levels</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
