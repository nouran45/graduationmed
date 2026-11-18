"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, Clock3, Search, ShieldCheck, Store, Tag } from "lucide-react"
import { PharmacyShell } from "@/components/pharmacy/shell"
import { SearchBox } from "@/components/pharmacy/search-box"
import { ProductRow } from "@/components/pharmacy/product-carousel"
import { Reveal, MotionStyles } from "@/components/pharmacy/motion"
import { PharmacyDirectory } from "@/components/pharmacy/pharmacy-directory"
import { ErrorState } from "@/components/pharmacy/states"
import { fetchCategories, fetchDiscounts, getKnownPharmacies } from "@/lib/pharmacy/api"
import {
    categoryIcon, categoryKeyOf, categoryNameOf, friendlyCategory, hue, isRealProduct, sortCategories,
} from "@/lib/pharmacy/categories"
import { useAsync, useInView, useProductFeed } from "@/lib/pharmacy/hooks"
import { groupProducts, savingsPct } from "@/lib/pharmacy/marketplace"
import type { ApiCategory } from "@/lib/pharmacy/types"

function CategoryRow({ category }: { category: ApiCategory }) {
    const [ref, seen] = useInView<HTMLDivElement>()
    const key = categoryKeyOf(category)
    const feed = useProductFeed({ category_key: key }, 88, seen) // fetched only when scrolled near
    const products = useMemo(() => feed.groups.filter(isRealProduct), [feed.groups])
    return (
        <div ref={ref} className="min-h-[120px]">
            {seen && (
                <ProductRow
                    title={friendlyCategory(categoryNameOf(category))}
                    subtitle="Compare prices for this category across pharmacies."
                    href={`/pharmacy/category/${encodeURIComponent(key)}`} hrefLabel="Browse all"
                    products={products} loading={feed.loading}
                />
            )}
        </div>
    )
}

export default function PharmacyHomePage() {
    const feed = useProductFeed({}, 176)
    const categories = useAsync((s) => fetchCategories(undefined, s), "categories")
    const discounts = useAsync((s) => fetchDiscounts({ limit: 66 }, s), "discounts")
    const [showAllCats, setShowAllCats] = useState(false)

    const sample = useMemo(() => feed.groups.filter(isRealProduct), [feed.groups])
    const topPicks = useMemo(
        () => sample.filter((p) => p.bestOffer?.price != null).sort((a, b) =>
            Number(b.availability.status === "in_stock") - Number(a.availability.status === "in_stock") || b.offerCount - a.offerCount),
        [sample])
    const saveMore = useMemo(() => sample.filter((p) => p.offerCount > 1 && savingsPct(p) >= 1).sort((a, b) => savingsPct(b) - savingsPct(a)), [sample])
    const recent = useMemo(() => sample.filter((p) => p.latestSync).sort((a, b) => new Date(b.latestSync!).getTime() - new Date(a.latestSync!).getTime()), [sample])
    const deals = useMemo(
        () => groupProducts(discounts.data?.items ?? []).filter((p) => p.maxDiscount && isRealProduct(p)).sort((a, b) => (b.maxDiscount ?? 0) - (a.maxDiscount ?? 0)),
        [discounts.data])

    const cats = useMemo(() => sortCategories(categories.data ?? []), [categories.data])

    // Read client-only cache after mount so server and client markup match (avoids hydration errors).
    const [pharmacyCount, setPharmacyCount] = useState(0)
    useEffect(() => {
        setPharmacyCount(getKnownPharmacies().length)
    }, [feed.items])

    const visibleCats = showAllCats ? cats : cats.slice(0, 8)

    return (
        <PharmacyShell hideSearch>
            <MotionStyles />

            <section id="top" className="relative overflow-hidden bg-secondary text-white">
                <div className="mc-float-slow pointer-events-none absolute -right-40 -top-56 h-[520px] w-[520px] rounded-full bg-primary/20 blur-[110px]" />
                <div className="pointer-events-none absolute -bottom-48 -left-32 h-[420px] w-[420px] rounded-full bg-primary/10 blur-[110px]" />
                <div className="container relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.25fr_0.75fr]">
                    <div>
                        <Reveal>
                            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary">
                                <ShieldCheck className="h-3.5 w-3.5" />MediCheck Pharmacy
                            </p>
                        </Reveal>
                        <Reveal delay={80}>
                            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
                                Find your medicine.<br /><span className="text-primary">Compare. Save.</span>
                            </h1>
                        </Reveal>
                        <Reveal delay={160}>
                            <p className="mt-4 max-w-xl text-sm leading-7 text-gray-300 sm:text-base">
                                Search by medicine name or barcode and see the price and availability at every partner pharmacy, side by side.
                            </p>
                        </Reveal>
                        <Reveal delay={240}>
                            <div id="search" className="mt-7 max-w-2xl"><SearchBox large placeholder="What are you looking for? Try a medicine name or barcode" /></div>
                        </Reveal>
                        {cats.length > 0 && (
                            <Reveal delay={320}>
                                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                                    <span className="text-gray-400">Popular:</span>
                                    {cats.slice(0, 5).map((c) => (
                                        <Link key={categoryKeyOf(c)} href={`/pharmacy/category/${encodeURIComponent(categoryKeyOf(c))}`} className="rounded-full border border-white/15 px-3 py-1.5 text-gray-200 transition hover:-translate-y-0.5 hover:border-primary hover:text-primary">
                                            {friendlyCategory(categoryNameOf(c))}
                                        </Link>
                                    ))}
                                </div>
                            </Reveal>
                        )}
                    </div>

                    <Reveal delay={200} className="hidden lg:block">
                        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
                            <p className="text-sm font-semibold text-white">Why shop with MediCheck</p>
                            <ul className="mt-5 space-y-5">
                                {[
                                    { icon: Tag, title: "Compare prices", text: "The same product, every pharmacy, one page." },
                                    { icon: Clock3, title: "Know how fresh the stock is", text: "We show when each pharmacy last updated." },
                                    { icon: Store, title: "Browse by pharmacy", text: "Explore a pharmacy's full range by category." },
                                ].map(({ icon: Icon, title, text }) => (
                                    <li key={title} className="flex gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15"><Icon className="h-5 w-5 text-primary" /></span>
                                        <span><span className="block text-sm font-semibold">{title}</span><span className="block text-xs leading-5 text-gray-400">{text}</span></span>
                                    </li>
                                ))}
                            </ul>
                            {(pharmacyCount > 0 || cats.length > 0) && (
                                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 text-center">
                                    <div><p className="text-2xl font-bold">{pharmacyCount || "–"}</p><p className="text-[11px] text-gray-400">partner pharmacies</p></div>
                                    <div><p className="text-2xl font-bold">{cats.length || "–"}</p><p className="text-[11px] text-gray-400">categories</p></div>
                                </div>
                            )}
                        </div>
                    </Reveal>
                </div>
            </section>

            <div className="container pb-6">
                <section id="categories" className="scroll-mt-24 pt-10">
                    <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Shop by category</h2>
                    <p className="mt-1 text-sm text-gray-500">Pick a category to see every product and compare pharmacy prices.</p>

                    {categories.loading ? (
                        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-200" />)}
                        </div>
                    ) : cats.length ? (
                        <>
                            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                {visibleCats.map((c, i) => {
                                    const raw = categoryNameOf(c)
                                    const Icon = categoryIcon(raw)
                                    const h = hue(raw)
                                    return (
                                        <Reveal key={categoryKeyOf(c)} delay={(i % 4) * 70} className="h-full">
                                            <Link href={`/pharmacy/category/${encodeURIComponent(categoryKeyOf(c))}`}
                                                className="group flex h-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                                                    style={{ background: `hsl(${h} 70% 94%)`, color: `hsl(${h} 45% 34%)` }}>
                                                    <Icon className="h-6 w-6" />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-bold leading-5 group-hover:text-primary">{friendlyCategory(raw)}</span>
                                                    <span className="block text-xs text-gray-400">
                                                        {typeof c.pharmacy_count === "number" && c.pharmacy_count > 0 ? `At ${c.pharmacy_count} pharmacies` : "Browse products"}
                                                    </span>
                                                </span>
                                            </Link>
                                        </Reveal>
                                    )
                                })}
                            </div>
                            {cats.length > 8 && (
                                <div className="mt-5 text-center">
                                    <button type="button" onClick={() => setShowAllCats((v) => !v)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 text-sm font-semibold hover:border-primary hover:text-primary" aria-expanded={showAllCats}>
                                        {showAllCats ? "Show fewer categories" : `Show all ${cats.length} categories`}
                                        <ChevronDown className={`h-4 w-4 transition-transform ${showAllCats ? "rotate-180" : ""}`} />
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                            {categories.error || "Categories are not available right now. Please check back shortly."}
                        </p>
                    )}
                </section>

                {feed.error && feed.items.length === 0 ? (
                    <div className="mt-10"><ErrorState message={feed.error} onRetry={feed.retry} /></div>
                ) : (
                    <div className="mt-4">
                        <ProductRow title="Top picks" subtitle="Popular health essentials, available at many of our partner pharmacies." products={topPicks} loading={feed.loading} />
                        <ProductRow title="Compare & save" subtitle="The price changes from pharmacy to pharmacy. These products show the biggest difference." products={saveMore} loading={feed.loading} />

                        {deals.length > 0 || discounts.loading ? (
                            <ProductRow id="deals" title="Deals & discounts" subtitle="Reduced prices reported by our pharmacies." products={deals} loading={discounts.loading} />
                        ) : (
                            <section id="deals" className="scroll-mt-24 py-7">
                                <div className="flex items-center gap-4 rounded-3xl border border-dashed border-gray-200 bg-white p-5 sm:p-6">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Tag className="h-5 w-5 text-primary" /></span>
                                    <div>
                                        <p className="text-sm font-bold">No active discounts right now</p>
                                        <p className="text-xs text-gray-500">New offers appear here as soon as pharmacies publish them. Check back soon.</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        <ProductRow title="Recently updated" subtitle="Listings that pharmacies refreshed most recently." products={recent} loading={feed.loading} />
                        {cats.slice(0, 4).map((c) => <CategoryRow key={categoryKeyOf(c)} category={c} />)}
                    </div>
                )}

                <section className="py-10">
                    <h2 className="text-center text-xl font-bold tracking-tight sm:text-2xl">How MediCheck works</h2>
                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        {[
                            { icon: Search, step: "1", title: "Search or browse", text: "Type a medicine name or barcode, or start from a category." },
                            { icon: Tag, step: "2", title: "Compare pharmacies", text: "See each pharmacy's price and stock, and when it was last updated." },
                            { icon: Store, step: "3", title: "Choose your pharmacy", text: "Open the pharmacy that suits you and continue from there." },
                        ].map(({ icon: Icon, step, title, text }, i) => (
                            <Reveal key={step} delay={i * 100} className="h-full">
                                <div className="h-full rounded-2xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{step}</span>
                                        <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <h3 className="mt-4 text-base font-bold">{title}</h3>
                                    <p className="mt-1.5 text-sm leading-6 text-gray-500">{text}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </section>

                <section id="pharmacies" className="scroll-mt-24 pb-6">
                    <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Our partner pharmacies</h2>
                    <p className="mb-5 mt-1 text-sm text-gray-500">Open a pharmacy to browse its full range, organised by category.</p>
                    {feed.loading ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-200" />)}</div>
                    ) : <PharmacyDirectory seed={feed.items} />}
                </section>

                <section className="py-8">
                    <div className="flex flex-col items-start justify-between gap-5 overflow-hidden rounded-3xl bg-secondary px-6 py-8 text-white sm:flex-row sm:items-center sm:px-10">
                        <div>
                            <h2 className="text-xl font-bold sm:text-2xl">Can’t find what you’re looking for?</h2>
                            <p className="mt-1 text-sm text-gray-300">Try the product’s full name, a shorter keyword, or the barcode on the box.</p>
                        </div>
                        <a href="#search" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-primary/90">
                            <Search className="h-4 w-4" />Search again
                        </a>
                    </div>
                </section>
            </div>
        </PharmacyShell>
    )
}