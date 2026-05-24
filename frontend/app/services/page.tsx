import Link from "next/link"
import { ArrowRight, CheckCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { ServiceCard } from "@/components/service-card"

export default function ServicesPage() {
  return (
    
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="bg-primary py-2">
          <div className="container flex justify-between items-center">
            <div className="flex items-center gap-2 text-white text-sm">
              <span>MediCheck Health Assistant</span>
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
            <nav className="hidden md:flex items-center gap-8">
  <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/">
    Home
  </Link>
  <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/symptom-checker">
    Symptom Checker
  </Link>
  <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/kidney-prediction">
    Kidney Risk
  </Link>
  <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/diabetes-prediction">
    Diabetes Risk
  </Link>

<Link className="text-secondary font-medium hover:text-primary transition-colors" href="/skin-checker">
  Skin Analysis
</Link>

<Link className="text-secondary font-medium hover:text-primary transition-colors" href="/heart-assessment">
  Heart Assessment
</Link>
<Link className="text-secondary font-medium hover:text-primary transition-colors" href="/anemia-prediction">
  Anemia Prediction
</Link>
  <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/services">
    Services
  </Link>
  <Link className="text-secondary font-medium hover:text-primary transition-colors" href="/about">
    About Us
  </Link>
</nav>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex border-primary text-primary hover:bg-primary hover:text-white"
                >
                  Sign In
                </Button>
</Link>
<Link href="/skin-checker">
  <Button size="sm" className="bg-primary text-white hover:bg-primary/90">
    Get Started
  </Button>
</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-secondary text-white clip-diagonal">
          <div className="container py-16 md:py-24">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl mb-6">Our Services</h1>
              <p className="text-lg text-gray-200 mb-8">
                Discover how MediCheck can help you understand your health and make informed decisions.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-secondary mb-4">Core Services</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Our platform offers a range of tools to help you understand your symptoms and health conditions
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
<ServiceCard
  icon="camera"
  title="Skin Condition Analysis"
  description="AI-powered analysis of skin images with protected upload checks and instant visual assessment."
  link="/skin-checker"
/>
              <ServiceCard
                title="Photo Analysis"
                description="Upload skin photos for protected AI-powered analysis with robust upload checks and instant condition matching."
                icon="camera"
                link="/skin-checker"
              />
              <ServiceCard
                title="Health Chat"
                description="Chat with our AI health assistant for guidance and continuous symptom monitoring"
                icon="message-circle"
                link="/health-chat"
                
              />
              <ServiceCard
            icon="xray"
            title="X-ray Fracture Detection"
            description="Upload an X-ray image to screen for possible fractures with an instant explanation."
            link="/x-ray"
          />
          <ServiceCard
            icon="heart"
            title="Heart Disease Risk Assessment"
            description="AI-powered analysis of cardiovascular health factors to assess heart disease risk with detailed probability results."
            link="/heart-assessment"
             />
             <ServiceCard
  title="Anemia Prediction"
  description="Analyze blood parameters to detect anemia types and provide personalized health recommendations"
  icon="droplets"
  link="/anemia-prediction"
/>
            </div>
          </div>
        </section>

        <section className="bg-muted py-16">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <h2 className="text-3xl font-bold text-secondary mb-6">Symptom Checker</h2>
                <div className="space-y-4 text-gray-600">
                  <p>
                    Our advanced symptom checker uses AI technology to help identify potential health conditions based
                    on the symptoms you're experiencing.
                  </p>
                  <p>
                    Simply describe your symptoms or upload photos of visible conditions, and our system will analyze
                    the information to provide potential matches from our extensive database of medical conditions.
                  </p>
                  <div className="space-y-3 mt-6">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <p>Analyze multiple symptoms simultaneously</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <p>Get detailed information about potential conditions</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <p>Receive recommendations for next steps</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Link href="/symptom-checker">
                      <Button className="bg-primary text-white hover:bg-primary/90">
                       Try Skin Condition Detection <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-video rounded-lg overflow-hidden bg-white shadow-lg">
                  <img
                    src="/placeholder.svg?height=400&width=600"
                    alt="Symptom checker interface"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div className="order-2 lg:order-1 relative">
                <div className="aspect-video rounded-lg overflow-hidden bg-white shadow-lg">
                  <img
                    src="/placeholder.svg?height=400&width=600"
                    alt="Photo analysis interface"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <h2 className="text-3xl font-bold text-secondary mb-6">Photo Analysis</h2>
                <div className="space-y-4 text-gray-600">
                  <p>
                    Our photo analysis tool uses computer vision and AI to analyze images of skin conditions, rashes,
                    and other visible symptoms.
                  </p>
                  <p>
                    Upload clear photos of the affected area, and our system will analyze visual patterns to identify
                    potential matching conditions from our database.
                  </p>
                  <div className="space-y-3 mt-6">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <p>Upload multiple images for more accurate analysis</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <p>Get condition matches based on visual characteristics</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <p>Track changes in appearance over time</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Link href="/photo-analysis">
                      <Button className="bg-primary text-white hover:bg-primary/90">
                        Try Photo Analysis <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted py-16">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <h2 className="text-3xl font-bold text-secondary mb-6">Health Chat</h2>
                <div className="space-y-4 text-gray-600">
                  <p>
                    Our AI-powered health chat assistant provides personalized guidance and continuous support for your
                    health concerns.
                  </p>
                  <p>
                    Chat with our assistant to get answers to health questions, follow up on symptom checker results, or
                    track changes in your condition over time.
                  </p>
                  <div className="space-y-3 mt-6">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <p>Get personalized health information and guidance</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <p>Track symptoms and conditions over time</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <p>Receive reminders and follow-up questions</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Link href="/health-chat">
                      <Button className="bg-primary text-white hover:bg-primary/90">
                        Try Health Chat <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-video rounded-lg overflow-hidden bg-white shadow-lg">
                  <img
                    src="/placeholder.svg?height=400&width=600"
                    alt="Health chat interface"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-secondary text-white py-16">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-6">Ready to take control of your health?</h2>
              <p className="text-lg text-gray-200 mb-8">
                Start using MediCheck today to get insights about your symptoms and make informed health decisions.
              </p>
              <Link href="/symptom-checker">
                <Button className="bg-primary text-white hover:bg-primary/90">
                  Get Started Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
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
                MediCheck provides symptom checking and health condition identification. Fast, accurate, and private.
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
              <h3 className="font-bold mb-4">Services</h3>
              <ul className="space-y-2">
<li>
  <Link href="/skin-checker" className="text-gray-300 hover:text-white">
    Skin Analysis
  </Link>
</li>
                <li>
                  <Link href="/photo-analysis" className="text-gray-300 hover:text-white">
                    Photo Analysis
                  </Link>
                </li>
                <li>
                  <Link href="/health-chat" className="text-gray-300 hover:text-white">
                    Health Chat
                  </Link>
                </li>
                <li>
                  <Link href="/anemia-prediction" className="text-gray-300 hover:text-white">
                    Anemia Prediction
                  </Link>
                </li>
                <li>
    <Link href="/xray-prediction" className="text-gray-300 hover:text-white">
      X-ray Fracture Detection
    </Link>
  </li>
                <li>
                  <Link href="/health-library" className="text-gray-300 hover:text-white">
                    Health Library
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
            <p className="text-sm text-gray-400">© 2025 MediCheck. All rights reserved.</p>
            <p className="text-xs text-gray-400 mt-4 md:mt-0 max-w-md text-center md:text-right">
              <strong>Medical Disclaimer:</strong> The information provided by this tool is not intended to be a
              substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your
              physician.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
