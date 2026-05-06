import Link from "next/link"
import { ArrowRight, CheckCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

export default function AboutPage() {
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
              <Link href="/symptom-checker">
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
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl mb-6">About MediCheck</h1>
              <p className="text-lg text-gray-200 mb-8">
                We're on a mission to make healthcare information accessible, accurate, and actionable for everyone.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <h2 className="text-3xl font-bold text-secondary mb-6">Our Story</h2>
                <div className="space-y-4 text-gray-600">
                  <p>
                    MediCheck was founded in 2022 by a team of healthcare professionals and technology experts who
                    recognized the need for better access to reliable health information.
                  </p>
                  <p>
                    Our team noticed that many people were turning to unreliable online sources for health information,
                    often leading to unnecessary anxiety or delayed treatment. We set out to create a platform that
                    combines medical expertise with advanced technology to provide accurate, personalized health
                    insights.
                  </p>
                  <p>
                    Today, MediCheck helps thousands of users understand their symptoms, identify potential conditions,
                    and make informed decisions about their health. We're proud to be a trusted resource for individuals
                    seeking clarity about their health concerns.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src="/placeholder.svg?height=400&width=600"
                    alt="Medical professionals collaborating"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -left-6 bg-primary text-white p-4 rounded-lg shadow-lg">
                  <p className="font-bold">Founded in 2022</p>
                  <p className="text-sm">By healthcare professionals</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-secondary mb-4">Our Mission & Values</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                We're guided by a commitment to improving healthcare access and outcomes through technology
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-secondary mb-2">Accuracy</h3>
                <p className="text-gray-600">
                  We're committed to providing medically accurate information based on the latest research and clinical
                  guidelines.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-secondary mb-2">Accessibility</h3>
                <p className="text-gray-600">
                  We believe everyone deserves access to reliable health information, regardless of location or
                  circumstances.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-secondary mb-2">Privacy</h3>
                <p className="text-gray-600">
                  We maintain the highest standards of data security and privacy protection for all user information.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-secondary mb-4">Our Team</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Meet the experts behind MediCheck</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                {
                  name: "Eng Farida Elselmy",
                  role: "Software developer",
                  image: "/placeholder.jpg?height=300&width=300",
                },
                {
                  name: "Nouran Yasser",
                  role: "Deep Learning eng",
                  image: "/placeholder.svg?height=300&width=300",
                },
                { name: "Sara Aiman", role: "Software Eng", image: "/placeholder.svg?height=300&width=300" },
                {
                  name: "Nour Elhadidy",
                  role: "DL eng",
                  image: "/placeholder.svg?height=300&width=300",
                },
              ].map((member, index) => (
                <div key={index} className="text-center">
                  <div className="aspect-square rounded-full overflow-hidden mb-4 mx-auto max-w-[200px]">
                    <img
                      src={member.image || "/placeholder.svg"}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-secondary">{member.name}</h3>
                  <p className="text-gray-600">{member.role}</p>
                </div>
              ))}
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
                  Try Symptom Checker <ArrowRight className="ml-2 h-4 w-4" />
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
                  <Link href="/symptom-checker" className="text-gray-300 hover:text-white">
                    Symptom Checker
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

