"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import {
  ArrowRight,
  BadgeCheck,
  Brain,
  CheckCircle,
  ChevronRight,
  FlaskConical,
  HeartPulse,
  PackageCheck,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { TestimonialCard } from "@/components/testimonial-card"
import { AuthStateHandler } from "@/components/auth-state-handler"

import { SearchBox } from "@/components/pharmacy/search-box"
import { ProductRow } from "@/components/pharmacy/product-carousel"
import { ProductImage } from "@/components/pharmacy/product-card"
import { Reveal, CountUp, Marquee, MotionStyles } from "@/components/pharmacy/motion"
import { fetchCategories, fetchDiscounts, getKnownPharmacies } from "@/lib/pharmacy/api"
import {
  categoryIcon, categoryKeyOf, categoryNameOf, friendlyCategory, hue, isRealProduct, sortCategories,
} from "@/lib/pharmacy/categories"
import { useAsync, useInView, useProductFeed } from "@/lib/pharmacy/hooks"
import { formatEGP, groupProducts, productHref, savingsPct } from "@/lib/pharmacy/marketplace"
import type { MarketProduct } from "@/lib/pharmacy/types"

/* =========================================================
   STATIC CONTENT (health tools only — all pharmacy data is live)
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
  /* ---------- live pharmacy data (PharmaSync via /api/pharmacy/*) ---------- */
  const categories = useAsync((s) => fetchCategories(undefined, s), "home-categories")
  const discounts = useAsync((s) => fetchDiscounts({ limit: 66 }, s), "home-discounts")
  const deals = useMemo(
    () =>
      groupProducts(discounts.data?.items ?? [])
        .filter((p) => p.maxDiscount && isRealProduct(p))
        .sort((a, b) => (b.maxDiscount ?? 0) - (a.maxDiscount ?? 0)),
    [discounts.data]
  )
  const feed = useProductFeed({}, 132)
  const sample = useMemo(() => feed.groups.filter(isRealProduct), [feed.groups])
  const cats = useMemo(() => sortCategories(categories.data ?? []), [categories.data])

  // Read client-only cache after mount so server and client markup match (avoids hydration errors).
  const [pharmacyCount, setPharmacyCount] = useState(0)
  useEffect(() => {
    setPharmacyCount(getKnownPharmacies().length)
  }, [feed.items])
  const topPicks = useMemo(
    () =>
      sample
        .filter((p) => p.bestOffer?.price != null)
        .sort(
          (a, b) =>
            Number(b.availability.status === "in_stock") - Number(a.availability.status === "in_stock") ||
            b.offerCount - a.offerCount
        ),
    [sample]
  )
  const showcase = useMemo(
    () => sample.filter((p) => p.offerCount > 1 && savingsPct(p) >= 1).sort((a, b) => savingsPct(b) - savingsPct(a))[0],
    [sample]
  )

  // Show real discounts when there are any; otherwise fall back to real top picks.
  const spotlight = deals.length > 0 ? deals : topPicks
  const spotlightLoading = deals.length > 0 ? false : discounts.loading || feed.loading

  const footerPharmacyLinks: [string, string][] = [
    ["Pharmacy Home", "/pharmacy"],
    ...cats.slice(0, 3).map(
      (c): [string, string] => [friendlyCategory(categoryNameOf(c)), `/pharmacy/category/${encodeURIComponent(categoryKeyOf(c))}`]
    ),
    ["Deals & Offers", "/pharmacy#deals"],
  ]

  return (
    <div className="min-h-screen bg-white text-secondary">
      <MotionStyles />

      {/* =====================================================
          HEADER
      ===================================================== */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-xl">
        <div className="container">
          <div className="flex h-[68px] items-center justify-between">
            <Logo />

            <nav className="hidden items-center gap-7 lg:flex">
              <Link href="/" className="text-sm font-semibold text-primary">Home</Link>
              <Link href="/symptom-checker" className="text-sm font-medium text-gray-500 transition-colors hover:text-secondary">Symptom Checker</Link>
              <Link href="/x-ray" className="text-sm font-medium text-gray-500 transition-colors hover:text-secondary">X-ray</Link>
              <Link href="/lab-assessments" className="text-sm font-medium text-gray-500 transition-colors hover:text-secondary">Lab Assessments</Link>
              <Link href="/pharmacy" className="flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-secondary">
                <ShoppingBag className="h-4 w-4" />
                Pharmacy
              </Link>
              <Link href="/services" className="text-sm font-medium text-gray-500 transition-colors hover:text-secondary">Services</Link>
              <Link href="/about" className="text-sm font-medium text-gray-500 transition-colors hover:text-secondary">About</Link>
            </nav>

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
          <div className="mc-float-slow pointer-events-none absolute right-[-180px] top-[-220px] h-[520px] w-[520px] rounded-full bg-primary/[0.1] blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-260px] left-[-160px] h-[420px] w-[420px] rounded-full bg-primary/[0.06] blur-3xl" />

          <div className="container relative">
            <div className="grid min-h-[570px] items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
              {/* LEFT */}
              <div className="max-w-[650px]">
                <Reveal>
                  <div className="mb-6 flex items-center gap-2">
                    <span className="h-px w-8 bg-primary" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Intelligent healthcare</span>
                  </div>
                </Reveal>

                <Reveal delay={80}>
                  <h1 className="text-[46px] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-[56px] lg:text-[64px]">
                    Healthcare that
                    <br />
                    <span className="text-primary">understands you.</span>
                  </h1>
                </Reveal>

                <Reveal delay={160}>
                  <p className="mt-6 max-w-[540px] text-base leading-7 text-gray-300 sm:text-[17px]">
                    ShifAI brings AI-powered health assessments, medical image analysis, laboratory insights, and
                    live pharmacy prices together in one simple healthcare experience.
                  </p>
                </Reveal>

                <Reveal delay={240}>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button asChild size="lg" className="h-12 rounded-lg bg-primary px-6 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-primary/90">
                      <Link href="/symptom-checker">
                        Start an Assessment
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>

                    <Button asChild size="lg" variant="outline" className="h-12 rounded-lg border-white/15 bg-transparent px-6 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-white hover:text-secondary">
                      <Link href="/pharmacy">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Visit Pharmacy
                      </Link>
                    </Button>
                  </div>
                </Reveal>

                <Reveal delay={320}>
                  <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-gray-400">
                    <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Secure platform</div>
                    <div className="flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />AI-assisted insights</div>
                    <div className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-primary" />Live pharmacy prices</div>
                  </div>
                </Reveal>
              </div>

              {/* RIGHT */}
              <Reveal delay={200} y={32}>
                <div className="relative mx-auto w-full max-w-[500px] lg:ml-auto">
                  <div className="mc-float-slow relative rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl backdrop-blur-sm">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">ShifAI</p>
                        <p className="mt-1 text-sm font-medium text-white">Your health overview</p>
                      </div>

                      <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                        </span>
                        <span className="text-[10px] font-medium text-primary">Connected</span>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl bg-white p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-400">Health tools</p>
                          <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-secondary">Explore your health</h3>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <HeartPulse className="h-5 w-5 text-primary" />
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-3 gap-2">
                        {[
                          { href: "/symptom-checker", icon: HeartPulse, title: "Symptoms", sub: "Check" },
                          { href: "/x-ray", icon: ScanLine, title: "X-ray", sub: "Analyze" },
                          { href: "/lab-assessments", icon: FlaskConical, title: "Labs", sub: "Assess" },
                        ].map(({ href, icon: Icon, title, sub }) => (
                          <Link key={href} href={href} className="group rounded-xl border border-gray-100 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary/[0.03]">
                            <Icon className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
                            <p className="mt-3 text-[11px] font-semibold text-secondary">{title}</p>
                            <p className="mt-1 text-[9px] text-gray-400">{sub}</p>
                          </Link>
                        ))}
                      </div>
                    </div>

                    <Link href="/pharmacy" className="group mt-3 flex items-center justify-between rounded-2xl bg-primary p-4 transition-all hover:bg-primary/90">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                          <ShoppingBag className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">Online pharmacy</p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {pharmacyCount > 0 ? `Compare prices across ${pharmacyCount} pharmacies` : "Healthcare essentials in one place"}
                          </p>
                        </div>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                        <ArrowRight className="h-4 w-4 text-white transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>

                    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">ShifAI Assistant</p>
                        <p className="mt-0.5 text-[10px] text-gray-500">Helping you navigate your healthcare journey</p>
                      </div>
                    </div>
                  </div>

                  <div className="mc-float pointer-events-none absolute -bottom-5 -left-5 hidden rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-xl sm:block">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <BadgeCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-secondary">Real pharmacy data</p>
                        <p className="text-[9px] text-gray-400">Prices & stock, side by side</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* =====================================================
            LIVE CATEGORY TICKER
        ===================================================== */}
        {cats.length > 0 && (
          <section className="border-b border-gray-100 bg-white py-4" aria-label="Pharmacy categories">
            <div className="container flex items-center gap-4">
              <span className="hidden shrink-0 text-xs font-bold uppercase tracking-[0.16em] text-gray-400 sm:block">In the pharmacy</span>
              <div className="min-w-0 flex-1">
                <Marquee>
                  {cats.map((c) => {
                    const raw = categoryNameOf(c)
                    const Icon = categoryIcon(raw)
                    return (
                      <Link
                        key={categoryKeyOf(c)}
                        href={`/pharmacy/category/${encodeURIComponent(categoryKeyOf(c))}`}
                        className="flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-secondary transition-colors hover:border-primary hover:text-primary"
                      >
                        <Icon className="h-3.5 w-3.5 text-primary" />
                        {friendlyCategory(raw)}
                      </Link>
                    )
                  })}
                </Marquee>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================
            PLATFORM INTRO
        ===================================================== */}
        <section className="border-b border-gray-100 bg-white">
          <div className="container py-9">
            <div className="grid gap-8 md:grid-cols-3 md:divide-x md:divide-gray-100">
              <Reveal><PlatformPoint number="01" title="Assess" description="Use AI-powered tools to explore symptoms, laboratory information and medical images." /></Reveal>
              <Reveal delay={100}><PlatformPoint number="02" title="Understand" description="Receive clear, accessible results that help you better understand your health information." /></Reveal>
              <Reveal delay={200}><PlatformPoint number="03" title="Access" description="Move from digital health tools to real pharmacy products, prices and availability." /></Reveal>
            </div>
          </div>
        </section>

        {/* =====================================================
            HEALTH ASSESSMENTS
        ===================================================== */}
        <section className="bg-white py-20 md:py-24">
          <div className="container">
            <Reveal>
              <SectionHeading
                eyebrow="HEALTH ASSESSMENTS"
                title="Healthcare tools in one place"
                description="Explore ShifAI's digital health services and choose the assessment that matches what you need."
              />
            </Reveal>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {assessmentServices.map((service, i) => {
                const Icon = service.icon
                return (
                  <Reveal key={service.title} delay={i * 110} className="h-full">
                    <Link href={service.href} className="group block h-full">
                      <article className="relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl">
                        <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-primary/[0.04] blur-2xl transition-all group-hover:bg-primary/[0.1]" />
                        <div className="relative">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                              <Icon className="h-6 w-6 text-primary" />
                            </div>
                            <span className="rounded-full bg-gray-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">{service.label}</span>
                          </div>
                          <h3 className="mt-7 text-xl font-bold text-secondary">{service.title}</h3>
                          <p className="mt-3 text-sm leading-7 text-gray-600">{service.description}</p>
                          <div className="mt-7 flex items-center text-sm font-semibold text-primary">
                            Explore assessment
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </article>
                    </Link>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* =====================================================
            PHARMACY FEATURE (live)
        ===================================================== */}
        <section id="pharmacy" className="overflow-hidden bg-[#f6faf8] py-20 md:py-28">
          <div className="container">
            <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <Reveal>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-xs font-bold tracking-wide text-primary">
                    <ShoppingBag className="h-4 w-4" />
                    ONLINE PHARMACY
                  </div>
                </Reveal>

                <Reveal delay={80}>
                  <h2 className="max-w-xl text-4xl font-bold leading-tight tracking-tight text-secondary md:text-5xl">
                    Your healthcare journey,
                    <span className="block text-primary">now connected to your pharmacy.</span>
                  </h2>
                </Reveal>

                <Reveal delay={160}>
                  <p className="mt-6 max-w-xl text-base leading-8 text-gray-600">
                    Search any medicine and see its price and availability at every partner pharmacy — so you can choose
                    the one that suits you best.
                  </p>
                </Reveal>

                <Reveal delay={240}>
                  <div className="mt-8 max-w-xl">
                    <SearchBox large placeholder="Search medicines or scan a barcode number…" />
                  </div>
                </Reveal>

                {(pharmacyCount > 0 || cats.length > 0) && (
                  <Reveal delay={300}>
                    <div className="mt-8 flex gap-10">
                      {pharmacyCount > 0 && (
                        <div>
                          <p className="text-3xl font-bold text-secondary"><CountUp to={pharmacyCount} /></p>
                          <p className="mt-0.5 text-xs text-gray-500">partner pharmacies</p>
                        </div>
                      )}
                      {cats.length > 0 && (
                        <div>
                          <p className="text-3xl font-bold text-secondary"><CountUp to={cats.length} /></p>
                          <p className="mt-0.5 text-xs text-gray-500">product categories</p>
                        </div>
                      )}
                    </div>
                  </Reveal>
                )}

                <Reveal delay={360}>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Button asChild size="lg" className="w-full bg-primary text-white shadow-lg shadow-primary/15 transition-transform hover:-translate-y-0.5 hover:bg-primary/90 sm:w-auto">
                      <Link href="/pharmacy">
                        Explore Pharmacy
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="w-full border-gray-300 bg-white text-secondary transition-transform hover:-translate-y-0.5 hover:border-primary hover:text-primary sm:w-auto">
                      <Link href="/pharmacy#deals">
                        View Offers
                        <Tag className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </Reveal>
              </div>

              {/* Live pharmacy panel */}
              <Reveal delay={150} y={32}>
                <div className="relative">
                  <div className="pointer-events-none absolute -inset-5 rounded-[40px] bg-primary/[0.06] blur-2xl" />

                  <div className="relative rounded-[28px] border border-gray-200 bg-white p-5 shadow-2xl md:p-7">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Pharmacy</p>
                        <h3 className="mt-1 text-xl font-bold text-secondary">What are you looking for?</h3>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                        <ShoppingBag className="h-5 w-5 text-primary" />
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {categories.loading
                        ? Array.from({ length: 4 }, (_, i) => <div key={i} className="h-[116px] animate-pulse rounded-xl bg-gray-100" />)
                        : cats.length > 0
                          ? cats.slice(0, 4).map((c) => {
                            const raw = categoryNameOf(c)
                            const Icon = categoryIcon(raw)
                            return (
                              <Link
                                key={categoryKeyOf(c)}
                                href={`/pharmacy/category/${encodeURIComponent(categoryKeyOf(c))}`}
                                className="group rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary/[0.03]"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm">
                                    <Icon className="h-4 w-4 text-primary" />
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                                </div>
                                <p className="mt-4 text-sm font-bold text-secondary">{friendlyCategory(raw)}</p>
                                <p className="mt-1 text-[11px] leading-5 text-gray-500">
                                  {typeof c.pharmacy_count === "number" && c.pharmacy_count > 0 ? `At ${c.pharmacy_count} pharmacies` : "Browse products"}
                                </p>
                              </Link>
                            )
                          })
                          : (
                            <Link href="/pharmacy" className="col-span-2 rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm font-semibold text-primary">
                              Open the pharmacy to browse products
                            </Link>
                          )}
                    </div>

                    <div className="mt-5 flex items-center justify-between rounded-xl bg-secondary px-4 py-4 text-white">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                          <Tag className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold">
                            {deals.length > 0 ? `${deals.length} products on offer right now` : "Prices differ between pharmacies"}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {deals.length > 0 ? "Reduced prices from our pharmacies" : "Compare before you choose"}
                          </p>
                        </div>
                      </div>
                      <Link href={deals.length > 0 ? "/pharmacy#deals" : "/pharmacy"} className="text-xs font-semibold text-primary hover:underline">
                        {deals.length > 0 ? "View deals" : "Compare"}
                      </Link>
                    </div>
                  </div>

                  <div className="mc-float pointer-events-none absolute -bottom-5 -left-5 hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-xl sm:block">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                        <Store className="h-5 w-5 text-primary" />
                        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-secondary">
                          {pharmacyCount > 0 ? `${pharmacyCount} pharmacies connected` : "Multiple pharmacies"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-gray-500">Live from the pharmacy catalogue</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* =====================================================
            PRICE COMPARISON SHOWCASE (real product, real offers)
        ===================================================== */}
        {showcase && <PriceShowcase product={showcase} />}

        {/* =====================================================
            LIVE CATEGORIES
        ===================================================== */}
        <section className="bg-white py-20">
          <div className="container">
            <Reveal>
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div>
                  <p className="text-xs font-bold tracking-[0.16em] text-primary">PHARMACY CATEGORIES</p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight text-secondary md:text-4xl">Find what you need</h2>
                  <p className="mt-3 max-w-xl text-gray-600">Start with a category and compare prices across our partner pharmacies.</p>
                </div>
                <Link href="/pharmacy#categories" className="group inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Browse all categories
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </Reveal>

            <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {categories.loading
                ? Array.from({ length: 8 }, (_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />)
                : cats.slice(0, 8).map((c, i) => {
                  const raw = categoryNameOf(c)
                  const Icon = categoryIcon(raw)
                  const h = hue(raw)
                  return (
                    <Reveal key={categoryKeyOf(c)} delay={(i % 4) * 80} className="h-full">
                      <Link href={`/pharmacy/category/${encodeURIComponent(categoryKeyOf(c))}`} className="group block h-full">
                        <div className="h-full rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-lg md:p-6">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                            style={{ background: `hsl(${h} 70% 94%)`, color: `hsl(${h} 45% 34%)` }}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <h3 className="mt-5 font-bold text-secondary">{friendlyCategory(raw)}</h3>
                          <p className="mt-2 text-sm leading-6 text-gray-500">
                            {typeof c.pharmacy_count === "number" && c.pharmacy_count > 0 ? `Available at ${c.pharmacy_count} pharmacies` : "Browse available products"}
                          </p>
                          <div className="mt-5 flex items-center text-xs font-semibold text-primary">
                            Explore
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </Link>
                    </Reveal>
                  )
                })}
            </div>

            {!categories.loading && cats.length === 0 && (
              <p className="mt-10 rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                {categories.error || "Categories are not available right now."}{" "}
                <Link href="/pharmacy" className="font-semibold text-primary">Open the pharmacy</Link>
              </p>
            )}
          </div>
        </section>

        {/* =====================================================
            LIVE DEALS / TOP PICKS (full-row carousel)
        ===================================================== */}
        <section className="bg-gray-50 py-14">
          <div className="container">
            <ProductRow
              bare
              title={deals.length > 0 ? "Pharmacy hot deals" : "Popular at our pharmacies"}
              subtitle={deals.length > 0 ? "Reduced prices reported by our partner pharmacies." : "Health essentials stocked by many of our partner pharmacies."}
              href="/pharmacy"
              hrefLabel={deals.length > 0 ? "View all offers" : "Browse the pharmacy"}
              products={spotlight}
              loading={spotlightLoading}
            />
            {!spotlightLoading && spotlight.length === 0 && feed.error && (
              <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                {feed.error} <button type="button" onClick={feed.retry} className="font-semibold text-primary">Try again</button>
              </p>
            )}
          </div>
        </section>

        {/* =====================================================
            CONNECTED HEALTHCARE
        ===================================================== */}
        <section className="bg-white py-20 md:py-28">
          <div className="container">
            <div className="grid items-center gap-14 lg:grid-cols-2">
              <Reveal className="relative order-2 lg:order-1">
                <div className="pointer-events-none absolute -inset-6 rounded-[40px] bg-primary/[0.05] blur-2xl" />

                <div className="relative rounded-[28px] border border-gray-200 bg-white p-6 shadow-xl md:p-8">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">ShifAI ecosystem</p>
                      <h3 className="mt-1 text-lg font-bold text-secondary">One connected experience</h3>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <HeartPulse className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  <div className="relative mt-7">
                    <div className="pointer-events-none absolute left-6 top-8 h-[calc(100%-64px)] w-px bg-primary/15" />
                    <ConnectedItem icon={HeartPulse} title="Health Assessment" description="Explore symptoms and health information." active />
                    <ConnectedItem icon={FlaskConical} title="Lab Results" description="Assess selected clinical measurements." />
                    <ConnectedItem icon={ShoppingBag} title="Online Pharmacy" description="Compare real prices and availability across pharmacies." />
                  </div>

                  <div className="mt-5 rounded-2xl bg-gray-50 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-secondary">Designed as one platform</p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Move between health tools and pharmacy services without leaving the ShifAI experience.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>

              <div className="order-1 lg:order-2">
                <Reveal>
                  <p className="text-xs font-bold tracking-[0.16em] text-primary">CONNECTED CARE</p>
                  <h2 className="mt-4 max-w-xl text-4xl font-bold leading-tight tracking-tight text-secondary md:text-5xl">
                    More than individual tools.
                    <span className="block text-primary">A complete digital experience.</span>
                  </h2>
                  <p className="mt-6 max-w-xl text-base leading-8 text-gray-600">
                    ShifAI brings health assessments and pharmacy access into one organized platform, making it easier to
                    find the right digital health service and the right price for the products you need.
                  </p>
                </Reveal>

                <div className="mt-8 space-y-5">
                  <Reveal delay={80}><BenefitRow icon={Brain} title="AI-assisted health tools" description="Use specialized AI-powered tools for symptoms, laboratory data and medical images." /></Reveal>
                  <Reveal delay={160}><BenefitRow icon={ShoppingBag} title="Integrated online pharmacy" description="Browse medicines and healthcare products and compare prices across partner pharmacies." /></Reveal>
                  <Reveal delay={240}><BenefitRow icon={ShieldCheck} title="Designed with privacy in mind" description="Keep the experience organized around secure access and responsible healthcare information." /></Reveal>
                </div>

                <Reveal delay={300}>
                  <div className="mt-8">
                    <Button asChild variant="outline" className="border-gray-300 text-secondary transition-transform hover:-translate-y-0.5 hover:border-primary hover:text-primary">
                      <Link href="/services">
                        Explore ShifAI
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            HOW IT WORKS
        ===================================================== */}
        <section className="bg-secondary py-20 text-white md:py-24">
          <div className="container">
            <Reveal>
              <SectionHeading
                dark
                eyebrow="HOW IT WORKS"
                title="Healthcare made easier to navigate"
                description="A simple flow from your information to an understandable result."
              />
            </Reveal>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <Reveal key={step.number} delay={index * 120} className="relative h-full">
                    {index < steps.length - 1 && (
                      <div className="pointer-events-none absolute left-[calc(100%-20px)] top-9 hidden h-px w-[40px] bg-white/10 md:block lg:w-[70px]" />
                    )}
                    <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-7 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.07]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold tracking-widest text-primary">{step.number}</span>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <h3 className="mt-8 text-xl font-bold">{step.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-gray-400">{step.description}</p>
                    </div>
                  </Reveal>
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
            <Reveal>
              <div className="relative overflow-hidden rounded-[28px] bg-primary px-7 py-12 text-white shadow-2xl shadow-primary/20 md:px-12 md:py-16">
                <div className="mc-float-slow pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-secondary/20 blur-2xl" />

                <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
                  <div className="max-w-2xl">
                    <p className="text-xs font-bold tracking-[0.18em] text-white/70">START WITH SHIFAI</p>
                    <h2 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">Take the next step toward understanding your health.</h2>
                    <p className="mt-4 max-w-xl leading-7 text-white/80">
                      Explore an assessment, compare prices in the online pharmacy, or simply start discovering what ShifAI can offer.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                    <Button asChild size="lg" className="w-full bg-white text-primary transition-transform hover:-translate-y-0.5 hover:bg-gray-100 sm:w-auto lg:w-full">
                      <Link href="/symptom-checker">
                        Start Assessment
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="w-full border-white/30 bg-transparent text-white transition-transform hover:-translate-y-0.5 hover:bg-white hover:text-primary sm:w-auto">
                      <Link href="/pharmacy">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Visit Pharmacy
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* =====================================================
            TESTIMONIALS
        ===================================================== */}
        <section className="border-t border-gray-100 bg-gray-50 py-20">
          <div className="container">
            <Reveal>
              <SectionHeading
                eyebrow="USER EXPERIENCE"
                title="Designed to feel simple"
                description="A healthcare platform should make information easier to navigate, not harder."
              />
            </Reveal>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <Reveal key={t.name} delay={i * 100} className="h-full">
                  <TestimonialCard name={t.name} role={t.role} content={t.content} rating={t.rating} avatar={t.avatar} />
                </Reveal>
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
            <div className="max-w-sm">
              <Logo />
              <p className="mt-5 text-sm leading-7 text-gray-400">
                ShifAI brings AI-powered health assessments and online pharmacy access together in one digital healthcare experience.
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

            <FooterColumn
              title="Pharmacy"
              links={footerPharmacyLinks}
              icon={<ShoppingBag className="h-4 w-4 text-primary" />}
            />

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
            <p className="text-xs text-gray-500">© 2026 ShifAI. All rights reserved.</p>
            <div className="max-w-2xl text-left text-[11px] leading-5 text-gray-500 md:text-right">
              <strong className="text-gray-400">Medical Disclaimer:</strong>{" "}
              ShifAI's digital health tools are intended to provide informational and AI-assisted assessments and are not a
              substitute for professional medical advice, diagnosis, or treatment.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* =========================================================
   PRICE SHOWCASE — built from a real product's real offers
========================================================= */

function PriceShowcase({ product }: { product: MarketProduct }) {
  const [ref, seen] = useInView<HTMLDivElement>("0px")

  const offers = useMemo(
    () => product.offers.filter((o) => o.price != null).sort((a, b) => (a.price as number) - (b.price as number)),
    [product]
  )
  const shown = offers.slice(0, 5)
  const max = product.maxPrice ?? 0
  const min = product.minPrice ?? 0
  const save = max - min
  const pct = max > 0 ? Math.round((save / max) * 100) : 0
  if (shown.length < 2 || max <= 0) return null

  return (
    <section className="bg-white py-20 md:py-24">
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <p className="text-xs font-bold tracking-[0.16em] text-primary">SEE THE DIFFERENCE</p>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-secondary md:text-4xl">
              Same product. <span className="text-primary">Different prices.</span>
            </h2>
            <p className="mt-5 max-w-md leading-8 text-gray-600">
              Pharmacies set their own prices. MediCheck lines them up so you can see where a product costs the least
              before you go.
            </p>
            <Button asChild size="lg" className="mt-7 bg-primary text-white shadow-lg shadow-primary/15 transition-transform hover:-translate-y-0.5 hover:bg-primary/90">
              <Link href={productHref(product)}>
                Compare all {product.offerCount} pharmacies
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Reveal>

          <Reveal delay={120} y={32}>
            <div ref={ref} className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-xl md:p-8">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-5">
                <ProductImage
                  src={product.imageUrl} name={product.name} category={product.category}
                  isMedicine={product.isMedicine} isFridge={product.isFridge} className="h-16 w-16 shrink-0 rounded-2xl"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    {product.category ? friendlyCategory(product.category) : "Healthcare"}
                  </p>
                  <h3 className="mt-1 truncate text-lg font-bold text-secondary">{product.name}</h3>
                  <p className="text-xs text-gray-500">Price at {product.offerCount} pharmacies</p>
                </div>
              </div>

              <ul className="mt-6 space-y-4">
                {shown.map((o, i) => {
                  const price = o.price as number
                  return (
                    <li key={`${o.pharmacyId}-${o.productId}`}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2 font-semibold text-secondary">
                          <Store className="h-4 w-4 shrink-0 text-gray-400" />
                          <span className="truncate">{o.pharmacyName}</span>
                          {i === 0 && <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Lowest</span>}
                        </span>
                        <span className={`shrink-0 font-bold ${i === 0 ? "text-primary" : "text-secondary"}`}>{formatEGP(price)} EGP</span>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${i === 0 ? "bg-primary" : "bg-gray-300"}`}
                          style={{
                            width: seen ? `${Math.max(6, (price / max) * 100)}%` : "0%",
                            transition: `width 900ms cubic-bezier(.2,.7,.2,1) ${i * 120}ms`,
                          }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4">
                <Tag className="h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-800">
                  Choosing the lowest price saves up to {formatEGP(save)} EGP{pct >= 1 ? ` (${pct}%)` : ""}.
                </p>
              </div>
              <p className="mt-3 text-[11px] text-gray-400">Prices as last synchronised by each pharmacy. Confirm availability with the pharmacy.</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
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
      <p className="text-xs font-bold tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className={`mt-4 text-3xl font-bold tracking-tight md:text-4xl ${dark ? "text-white" : "text-secondary"}`}>{title}</h2>
      <p className={`mt-4 leading-7 ${dark ? "text-gray-400" : "text-gray-600"}`}>{description}</p>
    </div>
  )
}

function PlatformPoint({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <span className="text-xs font-bold tracking-widest text-primary">{number}</span>
      <div>
        <h3 className="font-bold text-secondary">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
      </div>
    </div>
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
        <p className="mt-1 text-sm leading-6 text-gray-600">{description}</p>
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
        className={`relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border ${active ? "border-primary/20 bg-primary/10" : "border-gray-200 bg-white"
          }`}
      >
        <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-gray-400"}`} />
      </div>
      <div className="pt-1">
        <h4 className="text-sm font-bold text-secondary">{title}</h4>
        <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
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
            <Link href={href} className="text-sm text-gray-400 transition-colors hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
