"use client"
// app/page.tsx — updated homepage
// Changes: "Our Health Assessment Services" section restructured into 3 categories:
//   1. Skin Analysis
//   2. X-ray & Fracture Detection  
//   3. Lab Report Assessments → links to /lab-assessments page

import Link from "next/link"
import { ArrowRight, CheckCircle, Star, Users, Award, Shield, Activity, Heart, Brain, Stethoscope, Droplets } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { ServiceCard } from "@/components/service-card"
import { FeatureCard } from "@/components/feature-card"
import { TestimonialCard } from "@/components/testimonial-card"
import { HeroIllustration } from "@/components/hero-illustration"
import { HealthAssistantChat } from "@/components/health-assistant-chat"
import { AuthStateHandler } from "@/components/auth-state-handler"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
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
            <nav className="hidden md:flex items-center gap-8 md:ml-8 lg:ml-12">
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/">Home</Link>
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/symptom-checker">Symptom Checker</Link>
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/x-ray">X-ray</Link>
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/lab-assessments">Lab Assessments</Link>
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/services">Services</Link>
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/about">About Us</Link>
            </nav>
            <div className="flex items-center gap-4">
              <AuthStateHandler />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-secondary text-white clip-diagonal">
          <div className="container py-16 md:py-24">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-6">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Whole Person Care is Our Specialty</h1>
                <p className="text-lg text-gray-200 max-w-[600px]">
                  Advanced AI-powered health assessments including symptom checking, kidney disease risk evaluation,
                  and diabetes risk prediction. Get personalized insights and connect with healthcare professionals.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/symptom-checker">
                    <Button className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90">
                      Start Symptom Check <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/lab-assessments">
                    <Button variant="outline" className="w-full sm:w-auto bg-green-600 text-white border-green-600 hover:bg-green-700 hover:border-green-700">
                      Lab Assessments <Droplets className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative lg:block">
                <div className="aspect-video rounded-lg overflow-hidden bg-white/10 backdrop-blur-sm">
                  <img
                    src="/placeholder.svg?height=400&width=600"
                    alt="Doctor consulting with patient"
                    className="w-full h-full object-cover mix-blend-overlay opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <HealthAssistantChat />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── UPDATED SERVICES SECTION ─────────────────────────────── */}
        <section className="bg-white py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-secondary mb-4">Our Health Assessment Services</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                ShifAI comprehensive health risk assessments to help you understand your health status and take preventive action
              </p>
            </div>

            {/* 3 category cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

              {/* Category 1 — Skin Analysis */}
              <Link href="/symptom-checker" className="group block">
                <div className="border border-gray-200 rounded-2xl p-8 hover:border-primary hover:shadow-lg transition-all duration-200 h-full flex flex-col">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                    {/* Camera / skin icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-secondary mb-3">Skin Condition Analysis</h3>
                  <p className="text-gray-600 text-sm leading-relaxed flex-1">
                    AI-powered analysis of skin images to detect potential dermatological conditions with instant visual assessment and personalised recommendations.
                  </p>
                  <div className="mt-6 flex items-center text-primary text-sm font-medium">
                    Start skin analysis <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

              {/* Category 2 — X-ray */}
              <Link href="/x-ray" className="group block">
                <div className="border border-gray-200 rounded-2xl p-8 hover:border-primary hover:shadow-lg transition-all duration-200 h-full flex flex-col">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                    {/* X-ray icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-secondary mb-3">X-ray &amp; Fracture Detection</h3>
                  <p className="text-gray-600 text-sm leading-relaxed flex-1">
                    Upload an X-ray image to screen for possible fractures using our model with instant AI-powered explanation.
                  </p>
                  <div className="mt-6 flex items-center text-primary text-sm font-medium">
                    Upload X-ray <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

              {/* Category 3 — Lab Assessments */}
              <Link href="/lab-assessments" className="group block">
                <div className="border-2 border-primary rounded-2xl p-8 hover:shadow-lg transition-all duration-200 h-full flex flex-col bg-primary/[0.02]">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                    {/* Lab / beaker icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-xl font-bold text-secondary">Lab Report Assessments</h3>
                    <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full font-medium">4 tests</span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed flex-1">
                    Enter your clinical lab values to assess risk for heart disease, diabetes, kidney disease, and anemia — all powered by advanced ML models.
                  </p>
                  {/* Mini preview of the 4 assessments */}
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {[
                      { label: 'Heart Disease', color: 'bg-red-50 text-red-700 border-red-200' },
                      { label: 'Diabetes', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                      { label: 'Kidney Disease', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                      { label: 'Anemia', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                    ].map(({ label, color }) => (
                      <div key={label} className={`border rounded-lg px-3 py-1.5 text-xs font-medium ${color}`}>
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center text-primary text-sm font-medium">
                    View all assessments <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

            </div>
          </div>
        </section>
        {/* ── END UPDATED SERVICES SECTION ─────────────────────────── */}

        <section className="bg-muted clip-diagonal-reverse">
          <div className="container py-16 md:py-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-secondary mb-4">How Our Risk Assessments Work</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Our platform uses advanced algorithms and clinical guidelines to provide accurate health risk assessments
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard title="Input Health Data" description="Provide your medical history, lab values, and lifestyle information through our secure forms" icon={<Activity className="h-8 w-8" />} step={1} />
              <FeatureCard title="AI Risk Analysis" description="Our advanced algorithms analyze your data using evidence-based medical guidelines" icon={<Brain className="h-8 w-8" />} step={2} />
              <FeatureCard title="Personalized Results" description="Receive detailed risk assessments with personalized recommendations and next steps" icon={<Stethoscope className="h-8 w-8" />} step={3} />
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div className="order-2 lg:order-1">
                <div className="bg-secondary rounded-lg p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/20 rounded-full -ml-12 -mb-12"></div>
                  <h3 className="text-2xl font-bold mb-4 relative z-10">Ready to assess your health risks?</h3>
                  <p className="text-gray-200 mb-6 relative z-10">
                    Take control of your health with our comprehensive risk assessment tools. Early detection and prevention can make all the difference.
                  </p>
                  <div className="space-y-4 relative z-10">
                    {[
                      'Identify potential health conditions based on symptoms',
                      'Assess diabetes risk with comprehensive health indicators',
                      'Evaluate kidney disease risk using clinical parameters',
                      'Screen for fractures with AI-powered X-ray analysis',
                    ].map((text) => (
                      <div key={text} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 relative z-10 flex flex-wrap gap-4">
                    <Link href="/symptom-checker"><Button className="bg-primary text-white hover:bg-primary/90">Symptom Check <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                    <Link href="/lab-assessments"><Button variant="outline" className="border-white text-white hover:bg-white hover:text-secondary">Lab Assessments</Button></Link>
                    <Link href="/x-ray"><Button variant="outline" className="border-white text-white hover:bg-white hover:text-secondary">X-ray Detection</Button></Link>
                  </div>
                </div>
              </div>
              <div className="space-y-6 order-1 lg:order-2">
                <h2 className="text-3xl font-bold text-secondary">Why Choose ShifAI?</h2>
                <p className="text-gray-600">ShifAI advanced AI technology with evidence-based medical guidelines to provide you with accurate health risk assessments.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { val: '10,000+', label: 'Health assessments completed' },
                    { val: '95%', label: 'Accuracy rate for risk predictions' },
                    { val: '6', label: 'Comprehensive risk assessments' },
                    { val: '24/7', label: 'Available anytime, anywhere' },
                  ].map(({ val, label }) => (
                    <div key={label} className="border border-gray-200 rounded-lg p-4">
                      <div className="text-primary font-bold text-xl mb-2">{val}</div>
                      <p className="text-sm text-gray-600">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-secondary mb-4">What Our Users Say</h2>
              <p className="text-gray-600">Real experiences from people who trust us with their health assessments</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <TestimonialCard name="Sarah Johnson" role="Teacher, Age 52" content="The diabetes risk assessment helped me understand my risk factors. I've made lifestyle changes and my doctor is impressed with my progress." rating={5} avatar="/placeholder.svg?height=60&width=60" />
              <TestimonialCard name="Michael Chen" role="Engineer, Age 45" content="As someone with a family history of kidney disease, the kidney risk assessment gave me valuable insights. I'm now working with my doctor on prevention." rating={5} avatar="/placeholder.svg?height=60&width=60" />
              <TestimonialCard name="Lisa Rodriguez" role="Nurse, Age 38" content="Even as a healthcare professional, I found these assessments incredibly useful. The recommendations are evidence-based and practical." rating={5} avatar="/placeholder.svg?height=60&width=60" />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-secondary text-white">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Logo />
              <p className="text-gray-300 text-sm">ShifAI comprehensive health risk assessments and symptom checking. Fast, accurate, and private.</p>
            </div>
            <div>
              <h3 className="font-bold mb-4">Health Assessments</h3>
              <ul className="space-y-2">
                <li><Link href="/symptom-checker" className="text-gray-300 hover:text-white">Symptom Checker</Link></li>
                <li><Link href="/x-ray" className="text-gray-300 hover:text-white">X-ray Fracture Detection</Link></li>
                <li><Link href="/lab-assessments" className="text-gray-300 hover:text-white">Lab Report Assessments</Link></li>
                <li><Link href="/heart-assessment" className="text-gray-300 hover:text-white pl-4">↳ Heart Disease</Link></li>
                <li><Link href="/diabetes-prediction" className="text-gray-300 hover:text-white pl-4">↳ Diabetes Risk</Link></li>
                <li><Link href="/kidney-prediction" className="text-gray-300 hover:text-white pl-4">↳ Kidney Disease</Link></li>
                <li><Link href="/anemia-prediction" className="text-gray-300 hover:text-white pl-4">↳ Anemia</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-gray-300 hover:text-white">About Us</Link></li>
                <li><Link href="/careers" className="text-gray-300 hover:text-white">Careers</Link></li>
                <li><Link href="/blog" className="text-gray-300 hover:text-white">Blog</Link></li>
                <li><Link href="/contact" className="text-gray-300 hover:text-white">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="/terms" className="text-gray-300 hover:text-white">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-gray-300 hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/disclaimer" className="text-gray-300 hover:text-white">Medical Disclaimer</Link></li>
                <li><Link href="/accessibility" className="text-gray-300 hover:text-white">Accessibility</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400">© 2025 ShifAI. All rights reserved.</p>
            <p className="text-xs text-gray-400 mt-4 md:mt-0 max-w-md text-center md:text-right">
              <strong>Medical Disclaimer:</strong> The information provided by these tools is not intended to be a substitute for professional medical advice, diagnosis, or treatment.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}