"use client"

import Link from "next/link"
import { ArrowLeft, CheckCircle2, Info, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Logo } from "@/components/logo"
import { ImageUpload } from "@/components/image-upload"

export default function SkinCheckerPage() {
  return (
    <div className="min-h-screen bg-muted">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="bg-primary py-2">
          <div className="container flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white">
              <span>Patient Support: (800) 555-1234</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm text-white hover:underline">
                Patient Portal
              </Link>
              <Link href="/about" className="text-sm text-white hover:underline">
                About Us
              </Link>
              <Link href="/contact" className="text-sm text-white hover:underline">
                Contact
              </Link>
            </div>
          </div>
        </div>

        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Logo />
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-secondary transition-colors hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Home</span>
              </Link>

              <Button
                variant="outline"
                size="sm"
                className="hidden border-primary text-primary hover:bg-primary hover:text-white md:flex"
              >
                <Info className="mr-2 h-4 w-4" />
                Need Help?
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl py-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>

          <h1 className="text-3xl font-bold text-secondary md:text-4xl">
            Protected Skin Condition Analysis
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            Upload a clear photo for AI-powered dermatology screening. The workflow includes robust protection against invalid or manipulated image inputs before producing the result.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {[
            "Clear image validation before analysis",
            "Robust protection against manipulated uploads",
            "Result saved to your dashboard history",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
              <span className="text-sm font-medium text-secondary">{item}</span>
            </div>
          ))}
        </div>

        <Card className="overflow-hidden border-0 shadow-md">
          <CardContent className="p-6">
            <ImageUpload />
          </CardContent>
        </Card>

        <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-gray-500">
          <strong>Medical Disclaimer:</strong> This tool is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional.
        </p>
      </main>
    </div>
  )
}