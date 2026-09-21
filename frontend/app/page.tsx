"use client"

import Link from "next/link"

import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Brain,
  CheckCircle,
  ChevronRight,
  FlaskConical,
  HeartPulse,
  PackageCheck,
  Pill,
  ScanLine,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { FeatureCard } from "@/components/feature-card"
import { TestimonialCard } from "@/components/testimonial-card"
import { HealthAssistantChat } from "@/components/health-assistant-chat"
import { AuthStateHandler } from "@/components/auth-state-handler"

/* =========================================================
   DATA
========================================================= */

const assessmentServices = [
  {
    title: "Symptom Checker",
    description:
      "Describe your symptoms and receive an AI-assisted assessment to help you understand possible health concerns.",
    href: "/symptom-checker",
    icon: HeartPulse,
    label: "AI Assessment",
  },
  {
    title: "X-ray Analysis",
    description:
      "Upload an X-ray and use AI-powered image analysis to screen for possible fractures.",
    href: "/x-ray",
    icon: ScanLine,
    label: "Image Analysis",
  },
  {
    title: "Lab Assessments",
    description:
      "Enter your laboratory results and explore AI-assisted risk assessments across several health conditions.",
    href: "/lab-assessments",
    icon: FlaskConical,
    label: "Clinical Data",
  },
]

const pharmacyCategories = [
  {
    name: "Medicines",
    description: "Browse medicines and healthcare essentials",
    icon: Pill,
  },
  {
    name: "Vitamins & Supplements",
    description: "Support your everyday wellness",
    icon: HeartPulse,
  },
  {
    name: "Personal Care",
    description: "Everyday personal healthcare products",
    icon: Sparkles,
  },
  {
    name: "Hot Deals",
    description: "Discover selected pharmacy offers",
    icon: Tag,
  },
]

const pharmacyHotDeals = [
  {
    id: "PH001",
    name: "Daily Multivitamin",
    pharmacyName: "MediCare Pharmacy",
    category: "Vitamins & Supplements",
    price: 95,
    originalPrice: 120,
    discount: 20,
    prescriptionRequired: false,
  },
  {
    id: "PH002",
    name: "Vitamin C 1000mg",
    pharmacyName: "HealthPlus Pharmacy",
    category: "Vitamins & Supplements",
    price: 120,
    originalPrice: 150,
    discount: 20,
    prescriptionRequired: false,
  },
  {
    id: "PH003",
    name: "Moisturizing Cream",
    pharmacyName: "Care Pharmacy",
    category: "Personal Care",
    price: 75,
    originalPrice: 90,
    discount: 17,
    prescriptionRequired: false,
  },
  {
    id: "PH004",
    name: "Pain Relief Tablets",
    pharmacyName: "MediCare Pharmacy",
    category: "Pain Relief",
    price: 80,
    originalPrice: 100,
    discount: 20,
    prescriptionRequired: true,
  },
]

const steps = [
  {
    number: "01",
    title: "Tell us about your health",
    description:
      "Enter symptoms, laboratory values, or upload an X-ray depending on the assessment you choose.",
    icon: HeartPulse,
  },
  {
    number: "02",
    title: "Let ShifAI analyze",
    description:
      "Our AI-powered tools process the information and provide an easy-to-understand assessment.",
    icon: Brain,
  },
  {
    number: "03",
    title: "Understand your next step",
    description:
      "Review your results and use the available information to have a more informed conversation with a healthcare professional.",
    icon: CheckCircle,
  },
]

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Platform User",
    content:
      "The assessment interface was simple to use and made it much easier for me to understand the information I entered.",
    rating: 5,
    avatar: "/placeholder.svg?height=60&width=60",
  },
  {
    name: "Michael Chen",
    role: "Platform User",
    content:
      "I liked having the different assessment tools available in one place instead of using several separate platforms.",
    rating: 5,
    avatar: "/placeholder.svg?height=60&width=60",
  },
  {
    name: "Lisa Rodriguez",
    role: "Healthcare Professional",
    content:
      "The platform presents complex health information in a much more accessible and organized way.",
    rating: 5,
    avatar: "/placeholder.svg?height=60&width=60",
  },
]

/* =========================================================
   HOME PAGE
========================================================= */

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-secondary">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-xl">
        <div className="container">
          <div className="flex h-[68px] items-center justify-between">
            {/* Logo */}
            <Logo />

            {/* Navigation */}
            <nav className="hidden items-center gap-7 lg:flex">
              <Link
                href="/"
                className="text-sm font-semibold text-primary"
              >
                Home
              </Link>

              <Link
                href="/symptom-checker"
                className="text-sm font-medium text-gray-500 transition-colors hover:text-secondary"
              >
                Symptom Checker
              </Link>

              <Link
                href="/x-ray"
                className="text-sm font-medium text-gray-500 transition-colors hover:text-secondary"
              >
                X-ray
              </Link>

              <Link
                href="/lab-assessments"
                className="text-sm font-medium text-gray-500 transition-colors hover:text-secondary"
              >
                Lab Assessments
              </Link>

              <Link
                href="/pharmacy"
                className="flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-secondary"
              >
                <ShoppingBag className="h-4 w-4" />
                Pharmacy
              </Link>

              <Link
                href="/services"
                className="text-sm font-medium text-gray-500 transition-colors hover:text-secondary"
              >
                Services
              </Link>

              <Link
                href="/about"
                className="text-sm font-medium text-gray-500 transition-colors hover:text-secondary"
              >
                About
              </Link>
            </nav>

            {/* Auth */}
            <div className="flex items-center">
              <AuthStateHandler />
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* =====================================================
            HERO
        ===================================================== */}
        <section className="relative overflow-hidden bg-secondary">
          {/* Very subtle background decoration */}
          <div className="pointer-events-none absolute right-[-180px] top-[-220px] h-[520px] w-[520px] rounded-full bg-primary/[0.08] blur-3xl" />

          <div className="container relative">
            <div className="grid min-h-[570px] items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">

              {/* =================================================
                  LEFT — HERO CONTENT
              ================================================= */}
              <div className="max-w-[650px]">
                {/* Small label */}
                <div className="mb-6 flex items-center gap-2">
                  <span className="h-px w-8 bg-primary" />

                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Intelligent healthcare
                  </span>
                </div>

                {/* Heading */}
                <h1 className="text-[46px] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-[56px] lg:text-[64px]">
                  Healthcare that
                  <br />

                  <span className="text-primary">
                    understands you.
                  </span>
                </h1>

                {/* Description */}
                <p className="mt-6 max-w-[540px] text-base leading-7 text-gray-300 sm:text-[17px]">
                  ShifAI brings AI-powered health assessments, medical
                  image analysis, laboratory insights, and pharmacy access
                  together in one simple healthcare experience.
                </p>

                {/* Buttons */}
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/symptom-checker">
                    <Button
                      size="lg"
                      className="h-12 rounded-lg bg-primary px-6 text-sm font-semibold text-white hover:bg-primary/90"
                    >
                      Start an Assessment
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>

                  <Link href="/pharmacy">
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-12 rounded-lg border-white/15 bg-transparent px-6 text-sm font-semibold text-white hover:bg-white hover:text-secondary"
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Visit Pharmacy
                    </Button>
                  </Link>
                </div>

                {/* Trust line */}
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Secure platform
                  </div>

                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    AI-assisted insights
                  </div>

                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-primary" />
                    Pharmacy access
                  </div>
                </div>
              </div>

              {/* =================================================
                  RIGHT — SIMPLE HEALTHCARE VISUAL
              ================================================= */}
              <div className="relative mx-auto w-full max-w-[500px] lg:ml-auto">

                {/* Main visual */}
                <div className="relative rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl backdrop-blur-sm">

                  {/* Top */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                        ShifAI
                      </p>

                      <p className="mt-1 text-sm font-medium text-white">
                        Your health overview
                      </p>
                    </div>

                    <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />

                      <span className="text-[10px] font-medium text-primary">
                        Connected
                      </span>
                    </div>
                  </div>

                  {/* Health overview */}
                  <div className="mt-5 rounded-2xl bg-white p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-400">
                          Health tools
                        </p>

                        <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-secondary">
                          Explore your health
                        </h3>
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <HeartPulse className="h-5 w-5 text-primary" />
                      </div>
                    </div>

                    {/* Services */}
                    <div className="mt-6 grid grid-cols-3 gap-2">
                      <Link
                        href="/symptom-checker"
                        className="group rounded-xl border border-gray-100 p-3 transition-all hover:border-primary/20 hover:bg-primary/[0.03]"
                      >
                        <HeartPulse className="h-4 w-4 text-primary" />

                        <p className="mt-3 text-[11px] font-semibold text-secondary">
                          Symptoms
                        </p>

                        <p className="mt-1 text-[9px] text-gray-400">
                          Check
                        </p>
                      </Link>

                      <Link
                        href="/x-ray"
                        className="group rounded-xl border border-gray-100 p-3 transition-all hover:border-primary/20 hover:bg-primary/[0.03]"
                      >
                        <ScanLine className="h-4 w-4 text-primary" />

                        <p className="mt-3 text-[11px] font-semibold text-secondary">
                          X-ray
                        </p>

                        <p className="mt-1 text-[9px] text-gray-400">
                          Analyze
                        </p>
                      </Link>

                      <Link
                        href="/lab-assessments"
                        className="group rounded-xl border border-gray-100 p-3 transition-all hover:border-primary/20 hover:bg-primary/[0.03]"
                      >
                        <FlaskConical className="h-4 w-4 text-primary" />

                        <p className="mt-3 text-[11px] font-semibold text-secondary">
                          Labs
                        </p>

                        <p className="mt-1 text-[9px] text-gray-400">
                          Assess
                        </p>
                      </Link>
                    </div>
                  </div>

                  {/* Pharmacy */}
                  <Link
                    href="/pharmacy"
                    className="group mt-3 flex items-center justify-between rounded-2xl bg-primary p-4 transition-all hover:bg-primary/90"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                        <ShoppingBag className="h-5 w-5 text-white" />
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
                          Online pharmacy
                        </p>

                        <p className="mt-1 text-sm font-semibold text-white">
                          Healthcare essentials in one place
                        </p>
                      </div>
                    </div>

                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                      <ArrowRight className="h-4 w-4 text-white transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>

                  {/* Assistant */}
                  <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-white">
                        ShifAI Assistant
                      </p>

                      <p className="mt-0.5 text-[10px] text-gray-500">
                        Helping you navigate your healthcare journey
                      </p>
                    </div>
                  </div>
                </div>

                {/* Small floating card */}
                <div className="absolute -bottom-5 -left-5 hidden rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-xl sm:block">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <BadgeCheck className="h-4 w-4 text-primary" />
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold text-secondary">
                        Personalized
                      </p>

                      <p className="text-[9px] text-gray-400">
                        Built around you
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* =====================================================
            PLATFORM INTRO
        ===================================================== */}
        <section className="border-b border-gray-100 bg-white">
          <div className="container py-9">
            <div className="grid gap-8 md:grid-cols-3 md:divide-x md:divide-gray-100">

              <PlatformPoint
                number="01"
                title="Assess"
                description="Use AI-powered tools to explore symptoms, laboratory information and medical images."
              />

              <PlatformPoint
                number="02"
                title="Understand"
                description="Receive clear, accessible results that help you better understand your health information."
              />

              <PlatformPoint
                number="03"
                title="Access"
                description="Move from digital health tools to healthcare products through the online pharmacy."
              />

            </div>
          </div>
        </section>
        

        {/* =====================================================
            HEALTH ASSESSMENTS
        ===================================================== */}

        <section className="bg-white py-20 md:py-24">
          <div className="container">
            <SectionHeading
              eyebrow="HEALTH ASSESSMENTS"
              title="Healthcare tools in one place"
              description="Explore ShifAI's digital health services and choose the assessment that matches what you need."
            />

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {assessmentServices.map((service) => {
                const Icon = service.icon

                return (
                  <Link
                    key={service.title}
                    href={service.href}
                    className="group"
                  >
                    <article className="relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-primary/[0.04] blur-2xl transition-all group-hover:bg-primary/[0.08]" />

                      <div className="relative">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-primary/10">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>

                          <span className="rounded-full bg-gray-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            {service.label}
                          </span>
                        </div>

                        <h3 className="mt-7 text-xl font-bold text-secondary">
                          {service.title}
                        </h3>

                        <p className="mt-3 text-sm leading-7 text-gray-600">
                          {service.description}
                        </p>

                        <div className="mt-7 flex items-center text-sm font-semibold text-primary">
                          Explore assessment
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* =====================================================
            PHARMACY FEATURE
        ===================================================== */}

        <section className="overflow-hidden bg-[#f6faf8] py-20 md:py-28">
          <div className="container">
            <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
              {/* Copy */}
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-xs font-bold tracking-wide text-primary">
                  <ShoppingBag className="h-4 w-4" />
                  ONLINE PHARMACY
                </div>

                <h2 className="max-w-xl text-4xl font-bold leading-tight tracking-tight text-secondary md:text-5xl">
                  Your healthcare journey,
                  <span className="block text-primary">
                    now connected to your pharmacy.
                  </span>
                </h2>

                <p className="mt-6 max-w-xl text-base leading-8 text-gray-600">
                  Discover medicines, vitamins, personal care products, and
                  selected offers from participating pharmacies through the
                  ShifAI platform.
                </p>

                {/* Search */}
                <form
                  action="/pharmacy"
                  method="get"
                  className="mt-8 max-w-xl"
                >
                  <div className="flex items-center rounded-2xl border border-gray-200 bg-white p-2 shadow-lg shadow-gray-200/40 transition-all focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5">
                    <Search className="ml-3 h-5 w-5 flex-shrink-0 text-gray-400" />

                    <input
                      name="search"
                      type="text"
                      placeholder="Search medicines, vitamins, personal care..."
                      className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-secondary outline-none placeholder:text-gray-400"
                      aria-label="Search pharmacy"
                    />

                    <Button
                      type="submit"
                      className="rounded-xl bg-primary px-5 text-white hover:bg-primary/90"
                    >
                      Search
                    </Button>
                  </div>
                </form>

                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    Participating pharmacies
                  </div>

                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Secure experience
                  </div>

                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-primary" />
                    Product availability
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/pharmacy">
                    <Button
                      size="lg"
                      className="w-full bg-primary text-white shadow-lg shadow-primary/15 hover:bg-primary/90 sm:w-auto"
                    >
                      Explore Pharmacy
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>

                  <Link href="/pharmacy">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full border-gray-300 bg-white text-secondary hover:border-primary hover:text-primary sm:w-auto"
                    >
                      View Offers
                      <Tag className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Pharmacy UI */}
              <div className="relative">
                <div className="absolute -inset-5 rounded-[40px] bg-primary/[0.06] blur-2xl" />

                <div className="relative rounded-[28px] border border-gray-200 bg-white p-5 shadow-2xl md:p-7">
                  {/* Top */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Pharmacy
                      </p>

                      <h3 className="mt-1 text-xl font-bold text-secondary">
                        What are you looking for?
                      </h3>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  {/* Search preview */}
                  <div className="mt-5 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <Search className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">
                      Search products...
                    </span>
                  </div>

                  {/* Categories */}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {pharmacyCategories.map((category) => {
                      const Icon = category.icon

                      return (
                        <Link
                          key={category.name}
                          href="/pharmacy"
                          className="group rounded-xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-primary/20 hover:bg-primary/[0.03]"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>

                            <ChevronRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                          </div>

                          <p className="mt-4 text-sm font-bold text-secondary">
                            {category.name}
                          </p>

                          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-gray-500">
                            {category.description}
                          </p>
                        </Link>
                      )
                    })}
                  </div>

                  {/* Bottom strip */}
                  <div className="mt-5 flex items-center justify-between rounded-xl bg-secondary px-4 py-4 text-white">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                        <Tag className="h-4 w-4 text-primary" />
                      </div>

                      <div>
                        <p className="text-xs font-semibold">
                          Looking for a deal?
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Browse selected offers
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/pharmacy"
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      View deals
                    </Link>
                  </div>
                </div>

                {/* Floating pharmacy card */}
                <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-xl sm:block">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                      <Store className="h-5 w-5 text-primary" />
                    </div>

                    <div>
                      <p className="text-xs font-bold text-secondary">
                        Multiple pharmacies
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-500">
                        Connected to the platform
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            PHARMACY CATEGORIES
        ===================================================== */}

        <section className="bg-white py-20">
          <div className="container">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold tracking-[0.16em] text-primary">
                  PHARMACY CATEGORIES
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-secondary md:text-4xl">
                  Find what you need
                </h2>

                <p className="mt-3 max-w-xl text-gray-600">
                  Start with a category and explore available healthcare
                  products.
                </p>
              </div>

              <Link
                href="/pharmacy"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                Browse all products
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {pharmacyCategories.map((category) => {
                const Icon = category.icon

                return (
                  <Link
                    key={category.name}
                    href="/pharmacy"
                    className="group"
                  >
                    <div className="h-full rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg md:p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>

                      <h3 className="mt-5 font-bold text-secondary">
                        {category.name}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-500">
                        {category.description}
                      </p>

                      <div className="mt-5 flex items-center text-xs font-semibold text-primary">
                        Explore
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* =====================================================
            HOT DEALS
        ===================================================== */}

        <section className="bg-gray-50 py-20">
          <div className="container">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                  <Tag className="h-3.5 w-3.5" />
                  FEATURED OFFERS
                </div>

                <h2 className="mt-4 text-3xl font-bold tracking-tight text-secondary md:text-4xl">
                  Pharmacy hot deals
                </h2>

                <p className="mt-2 text-gray-600">
                  Selected offers from participating pharmacies.
                </p>
              </div>

              <Link
                href="/pharmacy"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                View all offers
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {pharmacyHotDeals.map((product) => (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"
                >
                  {/* Product visual */}
                  <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-gray-50 to-primary/[0.04]">
                    <div className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold text-white">
                      {product.discount}% OFF
                    </div>

                    {product.prescriptionRequired && (
                      <div className="absolute right-4 top-4 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-[10px] font-semibold text-orange-700">
                        Prescription
                      </div>
                    )}

                    <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-lg transition-transform duration-300 group-hover:scale-105">
                      <Pill className="h-11 w-11 text-primary/50" />
                    </div>
                  </div>

                  {/* Product details */}
                  <div className="p-5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {product.category}
                    </p>

                    <h3 className="mt-2 min-h-[48px] text-base font-bold leading-6 text-secondary">
                      {product.name}
                    </h3>

                    <div className="mt-2 flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-gray-400" />
                      <p className="text-xs text-gray-500">
                        {product.pharmacyName}
                      </p>
                    </div>

                    <div className="mt-5 flex items-end gap-2">
                      <span className="text-xl font-bold text-primary">
                        {product.price} EGP
                      </span>

                      <span className="mb-1 text-xs text-gray-400 line-through">
                        {product.originalPrice} EGP
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Available
                      </div>

                      {product.prescriptionRequired && (
                        <span className="text-[10px] font-medium text-orange-600">
                          Rx required
                        </span>
                      )}
                    </div>

                    <Link href="/pharmacy" className="mt-5 block">
                      <Button
                        variant="outline"
                        className="w-full border-gray-300 text-secondary hover:border-primary hover:bg-primary/[0.03] hover:text-primary"
                      >
                        View Product
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            CONNECTED HEALTHCARE
        ===================================================== */}

        <section className="bg-white py-20 md:py-28">
          <div className="container">
            <div className="grid items-center gap-14 lg:grid-cols-2">
              {/* Visual */}
              <div className="relative order-2 lg:order-1">
                <div className="absolute -inset-6 rounded-[40px] bg-primary/[0.05] blur-2xl" />

                <div className="relative rounded-[28px] border border-gray-200 bg-white p-6 shadow-xl md:p-8">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        ShifAI ecosystem
                      </p>

                      <h3 className="mt-1 text-lg font-bold text-secondary">
                        One connected experience
                      </h3>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <HeartPulse className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  <div className="relative mt-7">
                    {/* Connector */}
                    <div className="absolute left-6 top-8 h-[calc(100%-64px)] w-px bg-primary/15" />

                    <ConnectedItem
                      icon={HeartPulse}
                      title="Health Assessment"
                      description="Explore symptoms and health information."
                      active
                    />

                    <ConnectedItem
                      icon={FlaskConical}
                      title="Lab Results"
                      description="Assess selected clinical measurements."
                    />

                    <ConnectedItem
                      icon={ShoppingBag}
                      title="Online Pharmacy"
                      description="Browse healthcare products and offers."
                    />
                  </div>

                  <div className="mt-5 rounded-2xl bg-gray-50 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />

                      <div>
                        <p className="text-sm font-semibold text-secondary">
                          Designed as one platform
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Move between health tools and pharmacy services
                          without leaving the ShifAI experience.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Copy */}
              <div className="order-1 lg:order-2">
                <p className="text-xs font-bold tracking-[0.16em] text-primary">
                  CONNECTED CARE
                </p>

                <h2 className="mt-4 max-w-xl text-4xl font-bold leading-tight tracking-tight text-secondary md:text-5xl">
                  More than individual tools.
                  <span className="block text-primary">
                    A complete digital experience.
                  </span>
                </h2>

                <p className="mt-6 max-w-xl text-base leading-8 text-gray-600">
                  ShifAI brings health assessments and pharmacy access into one
                  organized platform, making it easier for users to find the
                  right digital health service and discover relevant healthcare
                  products.
                </p>

                <div className="mt-8 space-y-5">
                  <BenefitRow
                    icon={Brain}
                    title="AI-assisted health tools"
                    description="Use specialized AI-powered tools for symptoms, laboratory data and medical images."
                  />

                  <BenefitRow
                    icon={ShoppingBag}
                    title="Integrated online pharmacy"
                    description="Browse medicines, supplements, personal care products and selected offers."
                  />

                  <BenefitRow
                    icon={ShieldCheck}
                    title="Designed with privacy in mind"
                    description="Keep the experience organized around secure access and responsible healthcare information."
                  />
                </div>

                <div className="mt-8">
                  <Link href="/services">
                    <Button
                      variant="outline"
                      className="border-gray-300 text-secondary hover:border-primary hover:text-primary"
                    >
                      Explore ShifAI
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            HOW IT WORKS
        ===================================================== */}

        <section className="bg-secondary py-20 text-white md:py-24">
          <div className="container">
            <SectionHeading
              dark
              eyebrow="HOW IT WORKS"
              title="Healthcare made easier to navigate"
              description="A simple flow from your information to an understandable result."
            />

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = step.icon

                return (
                  <div key={step.number} className="relative">
                    {/* Connector */}
                    {index < steps.length - 1 && (
                      <div className="absolute left-[calc(100%-20px)] top-9 hidden h-px w-[40px] bg-white/10 md:block lg:w-[70px]" />
                    )}

                    <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-7 transition-colors hover:bg-white/[0.07]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold tracking-widest text-primary">
                          {step.number}
                        </span>

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                      </div>

                      <h3 className="mt-8 text-xl font-bold">
                        {step.title}
                      </h3>

                      <p className="mt-3 text-sm leading-7 text-gray-400">
                        {step.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* =====================================================
            FINAL CTA
        ===================================================== */}

        <section className="bg-white py-20 md:py-24">
          <div className="container">
            <div className="relative overflow-hidden rounded-[28px] bg-primary px-7 py-12 text-white shadow-2xl shadow-primary/20 md:px-12 md:py-16">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-secondary/20 blur-2xl" />

              <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
                <div className="max-w-2xl">
                  <p className="text-xs font-bold tracking-[0.18em] text-white/70">
                    START WITH SHIFAI
                  </p>

                  <h2 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">
                    Take the next step toward understanding your health.
                  </h2>

                  <p className="mt-4 max-w-xl leading-7 text-white/80">
                    Explore an assessment, browse the online pharmacy, or
                    simply start discovering what ShifAI can offer.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Link href="/symptom-checker">
                    <Button
                      size="lg"
                      className="w-full bg-white text-primary hover:bg-gray-100 sm:w-auto lg:w-full"
                    >
                      Start Assessment
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>

                  <Link href="/pharmacy">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full border-white/30 bg-transparent text-white hover:bg-white hover:text-primary sm:w-auto"
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Visit Pharmacy
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            TESTIMONIALS
        ===================================================== */}

        <section className="border-t border-gray-100 bg-gray-50 py-20">
          <div className="container">
            <SectionHeading
              eyebrow="USER EXPERIENCE"
              title="Designed to feel simple"
              description="A healthcare platform should make information easier to navigate, not harder."
            />

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {testimonials.map((testimonial) => (
                <TestimonialCard
                  key={testimonial.name}
                  name={testimonial.name}
                  role={testimonial.role}
                  content={testimonial.content}
                  rating={testimonial.rating}
                  avatar={testimonial.avatar}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="bg-secondary text-white">
        <div className="container py-14">
          <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
            {/* Brand */}
            <div className="max-w-sm">
              <Logo />

              <p className="mt-5 text-sm leading-7 text-gray-400">
                ShifAI brings AI-powered health assessments and online pharmacy
                access together in one digital healthcare experience.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-gray-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Secure platform
                </div>

                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-gray-300">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  AI-powered
                </div>
              </div>
            </div>

            {/* Health */}
            <FooterColumn
              title="Health"
              links={[
                ["Symptom Checker", "/symptom-checker"],
                ["X-ray Analysis", "/x-ray"],
                ["Lab Assessments", "/lab-assessments"],
                ["Heart Assessment", "/heart-assessment"],
                ["Diabetes Risk", "/diabetes-prediction"],
              ]}
            />

            {/* Pharmacy */}
            <FooterColumn
              title="Pharmacy"
              links={[
                ["Pharmacy Home", "/pharmacy"],
                ["Medicines", "/pharmacy"],
                ["Vitamins & Supplements", "/pharmacy"],
                ["Personal Care", "/pharmacy"],
                ["Hot Deals", "/pharmacy"],
              ]}
              icon={<ShoppingBag className="h-4 w-4 text-primary" />}
            />

            {/* Company */}
            <FooterColumn
              title="Company"
              links={[
                ["About Us", "/about"],
                ["Services", "/services"],
                ["Contact Us", "/contact"],
                ["Careers", "/careers"],
                ["Privacy Policy", "/privacy"],
              ]}
            />
          </div>

          <div className="mt-12 flex flex-col gap-5 border-t border-white/10 pt-7 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-gray-500">
              © 2026 ShifAI. All rights reserved.
            </p>

            <div className="max-w-2xl text-left text-[11px] leading-5 text-gray-500 md:text-right">
              <strong className="text-gray-400">Medical Disclaimer:</strong>{" "}
              ShifAI's digital health tools are intended to provide
              informational and AI-assisted assessments and are not a
              substitute for professional medical advice, diagnosis, or
              treatment.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* =========================================================
   SMALL REUSABLE COMPONENTS
========================================================= */

function SectionHeading({
  eyebrow,
  title,
  description,
  dark = false,
}: {
  eyebrow: string
  title: string
  description: string
  dark?: boolean
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p
        className={`text-xs font-bold tracking-[0.18em] ${dark ? "text-primary" : "text-primary"
          }`}
      >
        {eyebrow}
      </p>

      <h2
        className={`mt-4 text-3xl font-bold tracking-tight md:text-4xl ${dark ? "text-white" : "text-secondary"
          }`}
      >
        {title}
      </h2>

      <p
        className={`mt-4 leading-7 ${dark ? "text-gray-400" : "text-gray-600"
          }`}
      >
        {description}
      </p>
    </div>
  )
}

function PlatformPoint({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <span className="text-xs font-bold tracking-widest text-primary">
        {number}
      </span>

      <div>
        <h3 className="font-bold text-secondary">{title}</h3>

        <p className="mt-1 text-sm leading-6 text-gray-500">
          {description}
        </p>
      </div>
    </div>
  )
}

function MiniDashboardRow({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 transition-colors hover:border-primary/20 hover:bg-primary/[0.03]"
    >
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-primary" />

        <span className="text-xs font-medium text-secondary">
          {label}
        </span>
      </div>

      <ChevronRight className="h-3.5 w-3.5 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  )
}

function BenefitRow({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>

      <div>
        <h3 className="font-bold text-secondary">{title}</h3>

        <p className="mt-1 text-sm leading-6 text-gray-600">
          {description}
        </p>
      </div>
    </div>
  )
}

function ConnectedItem({
  icon: Icon,
  title,
  description,
  active = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  active?: boolean
}) {
  return (
    <div className="relative mb-5 flex gap-4 last:mb-0">
      <div
        className={`relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border ${active
            ? "border-primary/20 bg-primary/10"
            : "border-gray-200 bg-white"
          }`}
      >
        <Icon
          className={`h-5 w-5 ${active ? "text-primary" : "text-gray-400"
            }`}
        />
      </div>

      <div className="pt-1">
        <h4 className="text-sm font-bold text-secondary">{title}</h4>

        <p className="mt-1 text-xs leading-5 text-gray-500">
          {description}
        </p>
      </div>
    </div>
  )
}

function FooterColumn({
  title,
  links,
  icon,
}: {
  title: string
  links: [string, string][]
  icon?: React.ReactNode
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-bold text-white">
        {icon}
        {title}
      </h3>

      <ul className="mt-5 space-y-3">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}