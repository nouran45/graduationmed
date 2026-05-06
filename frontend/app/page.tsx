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
              <span>ShifAI Health Assistant  </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-white text-sm hover:underline">
                Patient Portal
              </Link>
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
            <nav className="hidden md:flex items-center gap-8 md:ml-8 lg:ml-12">
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/">
                Home
              </Link>
<Link className="text-secondary font-medium hover:text-primary transition-colors" href="/symptom-checker">
 symptom checker
</Link>
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/x-ray">
                X-ray
              </Link>
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/kidney-prediction">
                Kidney Risk
              </Link>
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/diabetes-prediction">
                Diabetes Risk
              </Link>
             <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/anemia-prediction">
                Anemia Prediction
              </Link>
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/heart-assessment">
              Heart Assessment
              </Link>
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/services">
                Services
              </Link>
              <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/about">
                About Us
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <AuthStateHandler />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
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
<Link href="/diabetes-prediction">
  <Button 
    variant="outline" 
    className="w-full sm:w-auto bg-green-600 text-white border-green-600 hover:bg-green-700 hover:border-green-700"
  >
    Diabetes Risk Assessment <Droplets className="ml-2 h-4 w-4" />
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

        <section className="bg-white py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-secondary mb-4">Our Health Assessment Services</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                ShifAI comprehensive health risk assessments to help you understand your health status and take preventive action
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

              <ServiceCard
                title="Diabetes Risk Assessment"
                description="Evaluate your risk of developing Type 2 diabetes using key health indicators"
                icon="droplets"
                link="/diabetes-prediction"
              />
              <ServiceCard
                title="Kidney Risk Assessment"
                description="Comprehensive kidney disease risk evaluation using clinical parameters"
                icon="heart"
                link="/kidney-prediction"
              />
              <ServiceCard
                title="X-ray Fracture Detection"
                description="Upload an X-ray image to screen for possible fractures with an instant explanation"
                icon="xray"
                link="/x-ray"
              />
<ServiceCard
  icon="camera"
  title="Skin Condition Analysis"
  description="AI-powered analysis of skin images to detect potential dermatological conditions with instant visual assessment."
  link="/symptom-checker"
/>
             <ServiceCard
  icon="droplets"
  title="Anemia Prediction"
  description="AI-powered analysis of blood parameters to detect anemia types and provide personalized health recommendations."
  link="/anemia-prediction"
/>
            </div>
          </div>
        </section>

        <section className="bg-muted clip-diagonal-reverse">
          <div className="container py-16 md:py-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-secondary mb-4">How Our Risk Assessments Work</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Our platform uses advanced algorithms and clinical guidelines to provide accurate health risk assessments
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard
                title="Input Health Data"
                description="Provide your medical history, lab values, and lifestyle information through our secure forms"
                icon={<Activity className="h-8 w-8" />}
                step={1}
              />
              <FeatureCard
                title="AI Risk Analysis"
                description="Our advanced algorithms analyze your data using evidence-based medical guidelines"
                icon={<Brain className="h-8 w-8" />}
                step={2}
              />
              <FeatureCard
                title="Personalized Results"
                description="Receive detailed risk assessments with personalized recommendations and next steps"
                icon={<Stethoscope className="h-8 w-8" />}
                step={3}
              />
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
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-sm">Identify potential health conditions based on symptoms</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-sm">Assess diabetes risk with comprehensive health indicators</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-sm">Evaluate kidney disease risk using clinical parameters</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-sm">Screen for fractures with AI-powered X-ray analysis</p>
                    </div>
                  </div>
                  <div className="mt-8 relative z-10 flex flex-wrap gap-4">
                    <Link href="/symptom-checker">
                      <Button className="bg-primary text-white hover:bg-primary/90">
                        Symptom Check <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/diabetes-prediction">
                      <Button variant="outline" className="border-white text-white hover:bg-white hover:text-secondary">
                        Diabetes Risk
                      </Button>
                    </Link>
                    <Link href="/kidney-prediction">
                      <Button variant="outline" className="border-white text-white hover:bg-white hover:text-secondary">
                        Kidney Risk
                      </Button>
                    </Link>
<Link href="/symptom-checker">
  <Button variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
    symptom checker
  </Button>
</Link>
                    <Link href="/anemia-prediction">
  <Button variant="outline" className="border-white text-white hover:bg-white hover:text-secondary">
    Anemia Prediction
  </Button>
</Link>
                  </div>
                </div>
              </div>

              <div className="space-y-6 order-1 lg:order-2">
                <h2 className="text-3xl font-bold text-secondary">Why Choose ShifAI?</h2>
                <p className="text-gray-600">
                   ShifAI advanced AI technology with evidence-based medical guidelines to provide you with accurate health risk assessments. Our platform is designed to help you make informed decisions about your health and take preventive action.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-primary font-bold text-xl mb-2">10,000+</div>
                    <p className="text-sm text-gray-600">Health assessments completed</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-primary font-bold text-xl mb-2">95%</div>
                    <p className="text-sm text-gray-600">Accuracy rate for risk predictions</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-primary font-bold text-xl mb-2">4</div>
                    <p className="text-sm text-gray-600">Comprehensive risk assessments</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-primary font-bold text-xl mb-2">24/7</div>
                    <p className="text-sm text-gray-600">Available anytime, anywhere</p>
                  </div>
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
              <TestimonialCard
                name="Sarah Johnson"
                role="Teacher, Age 52"
                content="The diabetes risk assessment helped me understand my risk factors. I've made lifestyle changes and my doctor is impressed with my progress."
                rating={5}
                avatar="/placeholder.svg?height=60&width=60"
              />
              <TestimonialCard
                name="Michael Chen"
                role="Engineer, Age 45"
                content="As someone with a family history of kidney disease, the kidney risk assessment gave me valuable insights. I'm now working with my doctor on prevention."
                rating={5}
                avatar="/placeholder.svg?height=60&width=60"
              />
              <TestimonialCard
                name="Lisa Rodriguez"
                role="Nurse, Age 38"
                content="Even as a healthcare professional, I found these assessments incredibly useful. The recommendations are evidence-based and practical."
                rating={5}
                avatar="/placeholder.svg?height=60&width=60"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-secondary text-white">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Logo />
              <p className="text-gray-300 text-sm">
                  ShifAI comprehensive health risk assessments and symptom checking. Fast, accurate, and private.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-white hover:text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </a>
                <a href="#" className="text-white hover:text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
                <a href="#" className="text-white hover:text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-4">Health Assessments</h3>
              <ul className="space-y-2">
<li>
  <Link href="/symptom-checker" className="text-gray-300 hover:text-white">
    Symptom checker
  </Link>
</li>
                <li>
                  <Link href="/diabetes-prediction" className="text-gray-300 hover:text-white">
                    Diabetes Risk Assessment
                  </Link>
                </li>
                <li>
                  <Link href="/kidney-prediction" className="text-gray-300 hover:text-white">
                    Kidney Risk Assessment
                  </Link>
                </li>
                <li>
                  <Link href="/x-ray" className="text-gray-300 hover:text-white">
                    X-ray Fracture Detection
                  </Link>
                  <Link href="/anemia-prediction" className="text-gray-300 hover:text-white">
                    Anemia Prediction
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-gray-300 hover:text-white">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="text-gray-300 hover:text-white">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-gray-300 hover:text-white">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-300 hover:text-white">
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms" className="text-gray-300 hover:text-white">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-gray-300 hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/disclaimer" className="text-gray-300 hover:text-white">
                    Medical Disclaimer
                  </Link>
                </li>
                <li>
                  <Link href="/accessibility" className="text-gray-300 hover:text-white">
                    Accessibility
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400">© 2025 ShifAI. All rights reserved.</p>
            <p className="text-xs text-gray-400 mt-4 md:mt-0 max-w-md text-center md:text-right">
              <strong>Medical Disclaimer:</strong> The information provided by these tools is not intended to be a
              substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your
              physician.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}