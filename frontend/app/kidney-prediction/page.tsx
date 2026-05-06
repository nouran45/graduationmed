import { KidneyDiseasePredictor } from "@/components/kidney-disease-predictor"
import Link from "next/link"
import { ChevronLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

export default function KidneyPredictionPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="bg-primary py-2">
                    <div className="container flex justify-between items-center mx-auto px-4">
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
                <div className="container py-4 mx-auto px-4">
                    <div className="flex justify-between items-center">
                        <Logo />
                        <div className="flex items-center gap-4">
                            <Link href="/" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors">
                                <ChevronLeft className="h-4 w-4" />
                                <span>Back to Home</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-secondary mb-4">
                        Kidney Disease Risk Assessment
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Our comprehensive kidney disease risk assessment uses clinical parameters and laboratory values
                        to evaluate your risk of developing kidney disease. This tool helps identify potential risk factors
                        and provides personalized recommendations.
                    </p>
                </div>

                <KidneyDiseasePredictor />
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
