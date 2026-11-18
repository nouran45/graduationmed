"use client"

import { Suspense, useMemo } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Clock3, Snowflake, Store, Tag } from "lucide-react"
import { PharmacyShell, Breadcrumbs } from "@/components/pharmacy/shell"
import { AvailabilityBadge, ProductImage } from "@/components/pharmacy/product-card"
import { ErrorState } from "@/components/pharmacy/states"
import { fetchProduct, fetchProducts } from "@/lib/pharmacy/api"
import { useAsync } from "@/lib/pharmacy/hooks"
import { formatEGP, groupProducts, productKey, safeDecode, STATUS_STYLES, timeAgo } from "@/lib/pharmacy/marketplace"
import type { Availability, Offer } from "@/lib/pharmacy/types"

const STATUS_DETAIL: Record<Availability, string> = {
    in_stock: "Stock confirmed by the pharmacy.",
    out_of_stock: "The pharmacy reports this product as unavailable.",
    stale: "Inventory data is outdated — confirm with the pharmacy before visiting.",
    unknown: "The pharmacy has not confirmed availability.",
}
const STATUS_LABEL: Record<Availability, string> = {
    in_stock: "In stock — confirmed", out_of_stock: "Out of stock", stale: "Stock info outdated", unknown: "Not confirmed",
}

function Details() {
    const params = useParams<{ id: string }>()
    const id = safeDecode(String(params.id ?? ""))
    const pharmacyId = useSearchParams().get("pharmacy_id") ?? undefined

    const base = useAsync((s) => fetchProduct(id, pharmacyId, s), `product-${id}-${pharmacyId ?? ""}`, /^\d+$/.test(id))

    // Offers from other pharmacies: matched by barcode (or exact normalised name) via the backend search.
    const related = useAsync(async (s) => {
        const p = base.data!
        const key = productKey(p)
        const term = p.barcode?.trim() && key.startsWith("bc:") ? p.barcode.trim() : (p.name ?? "").trim()
        if (!term || term === "*") return []
        const r = await fetchProducts({ q: term, limit: 50 }, s)
        return r.items.filter((i) => productKey(i) === key)
    }, `related-${base.data?.id}`, !!base.data)

    const product = useMemo(() => (base.data ? groupProducts([base.data, ...(related.data ?? [])])[0] : null), [base.data, related.data])

    const offers = useMemo(() => {
        if (!product) return []
        const rank = (o: Offer) => (o.availability === "in_stock" ? 0 : o.availability === "stale" || o.availability === "unknown" ? 1 : 2)
        return [...product.offers].sort((a, b) => rank(a) - rank(b) || (a.price ?? Infinity) - (b.price ?? Infinity))
    }, [product])

    if (!/^\d+$/.test(id)) return <div className="container py-10"><ErrorState message="This product ID is invalid." /></div>
    if (base.error) return <div className="container py-10"><ErrorState message={base.error} onRetry={() => window.location.reload()} /></div>

    if (base.loading || !product) {
        return (
            <div className="container grid gap-8 py-10 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="aspect-square animate-pulse rounded-3xl bg-gray-200" />
                <div className="space-y-5"><div className="h-4 w-32 animate-pulse rounded bg-gray-200" /><div className="h-10 w-3/4 animate-pulse rounded bg-gray-200" /><div className="h-32 animate-pulse rounded-2xl bg-gray-200" /><div className="h-48 animate-pulse rounded-2xl bg-gray-200" /></div>
            </div>
        )
    }

    const best = product.bestOffer
    const bestPrice = formatEGP(best?.price)
    const rows: [string, string | null][] = [
        ["Category", product.category], ["Barcode", product.barcode],
        ["Product ID", String(base.data!.id)], ["Parts", base.data!.parts == null ? null : String(base.data!.parts)],
        ["Type", product.isMedicine ? "Medicine" : "Healthcare product"],
        ["Latest inventory sync", product.latestSync ? `${new Date(product.latestSync).toLocaleString()} (${timeAgo(product.latestSync)})` : null],
    ]

    return (
        <div className="container py-7 sm:py-10">
            <Breadcrumbs items={[
                { label: "Pharmacy", href: "/pharmacy" },
                ...(product.categoryKey ? [{ label: product.category ?? "", href: `/pharmacy/category/${encodeURIComponent(product.categoryKey)}` }] : []),
                { label: product.name },
            ]} />

            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
                <div>
                    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white">
                        <ProductImage src={product.imageUrl} name={product.name} category={product.category} isMedicine={product.isMedicine} isFridge={product.isFridge} className="aspect-square w-full" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {product.isFridge && <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700"><Snowflake className="h-3.5 w-3.5" />Keep refrigerated</span>}
                        {product.isMedicine && <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">Medicine</span>}
                    </div>
                </div>

                <div className="space-y-6">
                    <section className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{product.category ?? "Healthcare"}</p>
                        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
                        {product.description && <p className="mt-3 text-sm leading-7 text-gray-500">{product.description}</p>}

                        <div className="mt-6 rounded-2xl bg-gray-50 p-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{product.offerCount > 1 ? "Best available price" : "Price"}</p>
                            {bestPrice ? (
                                <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
                                    <span className="text-3xl font-bold">{bestPrice} EGP</span>
                                    {formatEGP(best?.oldPrice) && <span className="text-sm text-gray-400 line-through">{formatEGP(best?.oldPrice)} EGP</span>}
                                    {best?.discountPercent && <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white">{Math.round(best.discountPercent)}% OFF</span>}
                                </div>
                            ) : <p className="mt-1.5 text-lg font-semibold text-gray-400">Price unavailable</p>}
                            {best && <p className="mt-1 text-xs text-gray-500">at {best.pharmacyName}</p>}
                            <div className="mt-3"><AvailabilityBadge summary={product.availability} /></div>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8" aria-labelledby="offers">
                        <div className="flex items-center justify-between gap-3">
                            <h2 id="offers" className="text-lg font-bold">Compare pharmacies <span className="text-gray-400">({offers.length})</span></h2>
                            {related.loading && <span className="flex items-center gap-1.5 text-xs text-gray-400"><Clock3 className="h-3.5 w-3.5" />Checking other pharmacies…</span>}
                        </div>
                        {related.error && <p className="mt-2 text-xs text-amber-700">Other pharmacies could not be checked right now; showing this pharmacy only.</p>}

                        <ul className="mt-4 divide-y divide-gray-100 rounded-2xl border border-gray-100">
                            {offers.map((o) => {
                                const cheapest = offers.length > 1 && o.price != null && o === best
                                const st = STATUS_STYLES[o.availability]
                                return (
                                    <li key={`${o.pharmacyId}-${o.productId}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4">
                                        <div className="min-w-0">
                                            <Link href={o.pharmacyId ? `/pharmacy/store/${encodeURIComponent(o.pharmacyId)}` : "/pharmacy"} className="flex items-center gap-2 text-sm font-bold hover:text-primary"><Store className="h-4 w-4 text-primary" />{o.pharmacyName}</Link>
                                            <p className={`mt-1 text-xs font-semibold ${st.text}`}>{STATUS_LABEL[o.availability]}{o.availability === "in_stock" && o.availablePacks != null ? ` · ${o.availablePacks} packs` : ""}</p>
                                            <p className="text-[11px] text-gray-400">{STATUS_DETAIL[o.availability]}{o.lastSyncedAt ? ` Synced ${timeAgo(o.lastSyncedAt)}.` : " No sync time reported."}</p>
                                        </div>
                                        <div className="text-right">
                                            {cheapest && <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><Tag className="h-3 w-3" />Best price</span>}
                                            <p className="text-lg font-bold">{formatEGP(o.price) ? `${formatEGP(o.price)} EGP` : <span className="text-sm text-gray-400">Price unavailable</span>}</p>
                                            {formatEGP(o.oldPrice) && <p className="text-[11px] text-gray-400 line-through">{formatEGP(o.oldPrice)} EGP</p>}
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                        <p className="mt-3 text-[11px] leading-5 text-gray-400">Ordering and delivery depend on each pharmacy. Prices and stock reflect the latest synchronisation.</p>
                    </section>

                    <section className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8">
                        <h2 className="text-lg font-bold">Product information</h2>
                        <dl className="mt-4 divide-y divide-gray-100 rounded-2xl border border-gray-100">
                            {rows.map(([label, value]) => (
                                <div key={label} className="flex flex-wrap justify-between gap-3 px-4 py-3 text-xs">
                                    <dt className="text-gray-400">{label}</dt>
                                    <dd className="max-w-[65%] break-words text-right font-semibold">{value || "Not provided by catalogue"}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                </div>
            </div>
        </div>
    )
}

export default function ProductDetailsPage() {
    return (
        <PharmacyShell>
            <Suspense fallback={<div className="container py-10"><div className="h-64 animate-pulse rounded-2xl bg-gray-200" /></div>}>
                <Details />
            </Suspense>
        </PharmacyShell>
    )
}