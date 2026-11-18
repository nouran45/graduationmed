"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Package, Pill, Snowflake } from "lucide-react"
import { formatEGP, productHref, savingsPct, STATUS_STYLES } from "@/lib/pharmacy/marketplace"
import type { AvailabilitySummary, MarketProduct } from "@/lib/pharmacy/types"
import { EmptyState } from "./states"

const hue = (s: string) => Array.from(s).reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

/** Real image when provided; otherwise a consistent, category-tinted tile (never a broken image). */
export function ProductImage({
    src, name, category, isMedicine, isFridge, className = "",
}: { src?: string | null; name: string; category?: string | null; isMedicine?: boolean; isFridge?: boolean; className?: string }) {
    const [failed, setFailed] = useState(false)
    useEffect(() => setFailed(false), [src])
    if (src && !failed) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className={`bg-white object-contain ${className}`} />
    }
    const h = hue(category || name)
    const Icon = isFridge ? Snowflake : isMedicine ? Pill : Package
    return (
        <div
            role="img" aria-label={name}
            className={`flex items-center justify-center ${className}`}
            style={{ background: `linear-gradient(135deg, hsl(${h} 70% 96%), hsl(${h} 55% 88%))` }}
        >
            <Icon className="h-1/3 w-1/3 opacity-60" style={{ color: `hsl(${h} 45% 36%)` }} />
        </div>
    )
}

export function AvailabilityBadge({ summary, className = "" }: { summary: AvailabilitySummary; className?: string }) {
    const s = STATUS_STYLES[summary.status]
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.bg} ${s.text} ${className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {summary.label}
        </span>
    )
}

export function ProductCard({ product, pharmacyId }: { product: MarketProduct; pharmacyId?: string }) {
    const best = product.bestOffer
    const price = formatEGP(best?.price)
    const oldPrice = formatEGP(best?.oldPrice)
    const multi = product.offerCount > 1
    const saving = product.maxPrice != null && product.minPrice != null ? product.maxPrice - product.minPrice : 0

    return (
        <Link
            href={productHref(product, pharmacyId)}
            className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-gray-200 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary"
        >
            <div className="relative aspect-[4/3] overflow-hidden">
                <ProductImage
                    src={product.imageUrl} name={product.name} category={product.category}
                    isMedicine={product.isMedicine} isFridge={product.isFridge}
                    className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                />
                {best?.discountPercent && (
                    <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-white shadow">
                        {Math.round(best.discountPercent)}% OFF
                    </span>
                )}
                {product.isFridge && (
                    <span className="absolute right-3 top-3 rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700">Keep chilled</span>
                )}
            </div>

            <div className="flex flex-1 flex-col p-4">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{product.category ?? "Healthcare"}</p>
                <h3 className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-5 text-secondary transition-colors group-hover:text-primary">
                    {product.name}
                </h3>

                <p className="mt-2 text-[11px] text-gray-500">
                    {multi ? `Available at ${product.offerCount} pharmacies` : best?.pharmacyName ?? "Pharmacy not specified"}
                </p>
                <div className="mt-2"><AvailabilityBadge summary={product.availability} /></div>

                <div className="mt-auto pt-4">
                    {price ? (
                        <>
                            {multi && <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Best price</p>}
                            <div className="flex flex-wrap items-baseline gap-x-2">
                                <span className="text-lg font-bold tracking-tight text-secondary">{price} EGP</span>
                                {oldPrice && <span className="text-[11px] text-gray-400 line-through">{oldPrice} EGP</span>}
                            </div>
                            {multi && saving > 0 && savingsPct(product) >= 1 && (
                                <p className="text-[11px] font-semibold text-emerald-600">Save up to {formatEGP(saving)} EGP by comparing</p>
                            )}
                        </>
                    ) : (
                        <p className="text-sm font-semibold text-gray-400">Price unavailable</p>
                    )}
                    <span className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-secondary text-xs font-semibold text-white transition-colors group-hover:bg-primary">
                        {multi ? "Compare prices" : "View details"}
                        <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                </div>
            </div>
        </Link>
    )
}

export function ProductCardSkeleton() {
    return (
        <div className="animate-pulse overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <div className="aspect-[4/3] bg-gray-100" />
            <div className="space-y-3 p-4">
                <div className="h-2 w-1/3 rounded bg-gray-100" />
                <div className="h-4 w-4/5 rounded bg-gray-100" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
                <div className="h-5 w-1/3 rounded bg-gray-100" />
                <div className="h-10 rounded bg-gray-100" />
            </div>
        </div>
    )
}

const GRID = "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4"

export function ProductGrid({ products, pharmacyId }: { products: MarketProduct[]; pharmacyId?: string }) {
    return (
        <div className={GRID}>
            {products.map((p) => <ProductCard key={p.key} product={p} pharmacyId={pharmacyId} />)}
        </div>
    )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
    return <div className={GRID}>{Array.from({ length: count }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
}

export function Shelf({
    id, eyebrow, title, subtitle, href, hrefLabel = "See all", products, loading, limit = 4, pharmacyId, emptyMessage,
}: {
    id?: string; eyebrow?: string; title: string; subtitle?: string; href?: string; hrefLabel?: string
    products: MarketProduct[]; loading?: boolean; limit?: number; pharmacyId?: string; emptyMessage?: string
}) {
    if (!loading && products.length === 0 && !emptyMessage) return null
    return (
        <section id={id} className="scroll-mt-24 py-8 sm:py-10">
            <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                    {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>}
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-secondary sm:text-2xl">{title}</h2>
                    {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
                </div>
                {href && (
                    <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
                        {hrefLabel} <ArrowRight className="h-4 w-4" />
                    </Link>
                )}
            </div>
            {loading ? <ProductGridSkeleton count={limit} /> : products.length ? (
                <ProductGrid products={products.slice(0, limit)} pharmacyId={pharmacyId} />
            ) : <EmptyState title={emptyMessage ?? "Nothing to show"} />}
        </section>
    )
}