import Link from "next/link"
import { Mail, MapPin, Phone } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Logo } from "@/components/logo"

export default function ContactPage() {
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
              <Link href="/register" className="text-white text-sm hover:underline">
                Register
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
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl mb-6">Contact Us</h1>
              <p className="text-lg text-gray-200 mb-8">
                Have questions or feedback? We're here to help. Reach out to our team using the form below.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-2">
              <Card className="border-0 shadow-md overflow-hidden">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-secondary mb-6">Get in Touch</h2>
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="first-name" className="text-secondary">
                          First Name
                        </Label>
                        <Input
                          id="first-name"
                          placeholder="Enter your first name"
                          className="border-gray-300 focus:border-primary focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-name" className="text-secondary">
                          Last Name
                        </Label>
                        <Input
                          id="last-name"
                          placeholder="Enter your last name"
                          className="border-gray-300 focus:border-primary focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-secondary">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        className="border-gray-300 focus:border-primary focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-secondary">
                        Subject
                      </Label>
                      <Input
                        id="subject"
                        placeholder="How can we help you?"
                        className="border-gray-300 focus:border-primary focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-secondary">
                        Message
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="Please provide details about your inquiry..."
                        rows={5}
                        className="border-gray-300 focus:border-primary focus:ring-primary"
                      />
                    </div>

                    <Button className="w-full bg-primary text-white hover:bg-primary/90">Send Message</Button>
                  </form>
                </CardContent>
              </Card>

              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-secondary mb-6">Contact Information</h2>
                  <p className="text-gray-600 mb-8">
                    Our team is available Monday through Friday, 9am to 5pm EST. We strive to respond to all inquiries
                    within 24 hours.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-secondary">Email</h3>
                      <p className="text-gray-600">support@medicheck.com</p>
                      <p className="text-gray-600">info@medicheck.com</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-secondary">Phone</h3>
                      <p className="text-gray-600">General: (555) 123-4567</p>
                      <p className="text-gray-600">Support: (555) 987-6543</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-secondary">Address</h3>
                      <p className="text-gray-600">123 Health Avenue</p>
                      <p className="text-gray-600">Suite 456</p>
                      <p className="text-gray-600">Boston, MA 02110</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-lg overflow-hidden h-64 bg-muted">
                  {/* Map placeholder */}
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <p className="text-gray-500">Map location</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-secondary mb-4">Frequently Asked Questions</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Find answers to common questions about MediCheck</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {[
                {
                  question: "Is MediCheck a substitute for professional medical advice?",
                  answer:
                    "No, MediCheck is designed to provide information and guidance, but it is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for medical concerns.",
                },
                {
                  question: "How accurate is the symptom checker?",
                  answer:
                    "Our symptom checker uses advanced algorithms and medical knowledge to provide potential matches for your symptoms. While we strive for accuracy, it's important to remember that many conditions share similar symptoms, and a proper diagnosis requires professional medical evaluation.",
                },
                {
                  question: "Is my health information kept private?",
                  answer:
                    "Yes, we take privacy very seriously. All your health information is encrypted and stored securely. We do not share your personal health information with third parties without your explicit consent.",
                },
                {
                  question: "How do I get a refund?",
                  answer:
                    "If you're not satisfied with your premium subscription, you can request a refund within 14 days of purchase. Please contact our support team at support@medicheck.com with your order details.",
                },
              ].map((faq, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-lg font-bold text-secondary mb-2">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              ))}
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

