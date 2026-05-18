"use client"
// app/lab-assessments/page.tsx
// Lists all 4 lab-based assessments: Heart, Diabetes, Kidney, Anemia
// Matches the existing site design system exactly.

import Link from "next/link"
import { ArrowRight, ChevronLeft, Heart, Droplets, Activity, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Logo } from "@/components/logo"
import { AuthStateHandler } from "@/components/auth-state-handler"

const ASSESSMENTS = [
    {
        title: "Heart Disease Risk",
        description: "Assess your cardiovascular risk using 11 clinical indicators including blood pressure, cholesterol, ST depression, and exercise-induced angina.",
        
        features: ["Age & sex", "Blood pressure", "Cholesterol", "Max heart rate", "ST depression", "Chest pain type"],
        href: "/heart-assessment",
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        badge: "bg-red-100 text-red-700",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
            </svg>
        ),
    },
    {
        title: "Diabetes Risk",
        description: "Evaluate your risk of developing Type 2 diabetes using HbA1c levels, blood glucose, BMI, hypertension status, and lifestyle factors. Early detection enables timely preventive intervention.",
        accuracy: "High",
        auc: null,
        features: ["HbA1c level", "Blood glucose", "BMI", "Hypertension", "Smoking history", "Age & gender"],
        href: "/diabetes-prediction",
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
        badge: "bg-blue-100 text-blue-700",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
        ),
    },
    {
        title: "Kidney Disease Risk",
        description: "Comprehensive chronic kidney disease risk evaluation using 19 clinical parameters including serum creatinine, blood urea, hemoglobin, and urinalysis markers for early-stage detection.",
        accuracy: "High",
        auc: null,
        features: ["Serum creatinine", "Blood urea", "Hemoglobin", "Blood pressure", "Specific gravity", "Albumin"],
        href: "/kidney-prediction",
        color: "text-purple-600",
        bg: "bg-purple-50",
        border: "border-purple-200",
        badge: "bg-purple-100 text-purple-700",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        ),
    },
    {
        title: "Anemia Detection",
        description: "AI-powered analysis of complete blood count parameters — hemoglobin, MCH, MCHC, and MCV — to detect anemia types and provide personalised treatment recommendations.",
        accuracy: "High",
        auc: null,
        features: ["Hemoglobin (g/dL)", "MCH", "MCHC", "MCV", "Gender"],
        href: "/anemia-prediction",
        color: "text-orange-600",
        bg: "bg-orange-50",
        border: "border-orange-200",
        badge: "bg-orange-100 text-orange-700",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
]

export default function LabAssessmentsPage() {
    return (
        <div className="min-h-screen bg-muted">

            {/* Header — matches site pattern */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="bg-primary py-2">
                    <div className="container flex justify-between items-center">
                        <div className="flex items-center gap-2 text-white text-sm">
                            <span>ShifAI Health Assistant</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link href="/login" className="text-white text-sm hover:underline">Patient Portal</Link>
                            <Link href="/about" className="text-white text-sm hover:underline">About Us</Link>
                            <Link href="/contact" className="text-white text-sm hover:underline">Contact</Link>
                        </div>
                    </div>
                </div>
                <div className="container py-4">
                    <div className="flex justify-between items-center">
                        <Logo />
                        <Link href="/" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors">
                            <ChevronLeft className="h-4 w-4" />
                            <span>Back to Home</span>
                        </Link>
                    </div>
                </div>
            </header>

            <div className="container max-w-5xl py-12">

                {/* Page title */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                        <Activity className="h-4 w-4" />
                        Lab Report Assessments
                    </div>
                    <h1 className="text-3xl font-bold text-secondary mb-3">
                        Clinical Lab-Based Risk Assessments
                    </h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Enter your laboratory values and clinical measurements to receive an AI-powered risk assessment.
                        All models are trained on validated medical datasets and reviewed against clinical benchmarks.
                    </p>
                </div>

                {/* Disclaimer banner */}
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-10 text-sm text-amber-800">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-600" />
                    <p>These tools are for informational screening only and are not a substitute for professional medical diagnosis. Always consult a qualified healthcare provider with your results.</p>
                </div>

                {/* Assessment cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {ASSESSMENTS.map((a) => (
                        <Link key={a.href} href={a.href} className="group block">
                            <Card className={`border-0 shadow-md hover:shadow-xl transition-all duration-200 h-full overflow-hidden group-hover:-translate-y-1`}>
                                <CardContent className="p-0 h-full flex flex-col">

                                    {/* Coloured top strip */}
                                    <div className={`${a.bg} ${a.border} border-b px-6 pt-6 pb-5`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 ${a.bg} border ${a.border} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                                    {a.icon}
                                                </div>
                                                <div>
                                                    <h2 className={`text-lg font-bold ${a.color}`}>{a.title}</h2>
                                                    {a.auc ? (
                                                        <div className="flex gap-2 mt-1">
                                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.badge}`}>ACC {a.accuracy}</span>
                                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.badge}`}>AUC {a.auc}</span>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.badge} mt-1 inline-block`}>AI-powered</span>
                                                    )}
                                                </div>
                                            </div>
                                            <ArrowRight className={`h-5 w-5 ${a.color} opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1`} />
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="px-6 py-5 flex flex-col flex-1 bg-white">
                                        <p className="text-gray-600 text-sm leading-relaxed mb-5">{a.description}</p>

                                        {/* Feature tags */}
                                        <div className="flex flex-wrap gap-2 mt-auto">
                                            {a.features.map((f) => (
                                                <span key={f} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">
                                                    {f}
                                                </span>
                                            ))}
                                        </div>

                                        <div className={`mt-5 text-sm font-medium flex items-center gap-1.5 ${a.color}`}>
                                            Start assessment <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>

                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Bottom note */}
                <p className="text-center text-xs text-gray-400 mt-10 max-w-lg mx-auto">
                    <strong>Medical Disclaimer:</strong> All assessments are AI-assisted screening tools. Results should be interpreted by a qualified clinician. This platform does not store or share your health data.
                </p>

            </div>
        </div>
    )
}