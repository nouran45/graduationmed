"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2, SlidersHorizontal, X } from "lucide-react"
import { getKnownPharmacies } from "@/lib/pharmacy/api"
import { useProductFeed } from "@/lib/pharmacy/hooks"
import { savingsPct } from "@/lib/pharmacy/marketplace"
import type { MarketProduct, ProductParams } from "@/lib/pharmacy/types"
import { ProductGrid, ProductGridSkeleton } from "./product-card"
import { EmptyState, ErrorState } from "./states"

type Sort = "relevance" | "price_asc" | "price_desc" | "pharmacies" | "discount" | "fresh"

const SORTS: { value: Sort; label: string }[] = [
    { value: "relevance", label: "Relevance" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
    { value: "pharmacies", label: "Most pharmacies (popularity proxy)" },
    { value: "discount", label: "Biggest discount" },
    { value: "fresh", label: "Recently synced" },
]

function sortProducts(list: MarketProduct[], sort: Sort) {
    const price = (p: MarketProduct) => p.bestOffer?.price ?? null
    const cmp: Record<Exclude<Sort, "relevance">, (a: MarketProduct, b: MarketProduct) => number> = {
        price_asc: (a, b) => (price(a) ?? Infinity) - (price(b) ?? Infinity),
        price_desc: (a, b) => (price(b) ?? -Infinity) - (price(a) ?? -Infinity),
        pharmacies: (a, b) => b.offerCount - a.offerCount || savingsPct(b) - savingsPct(a),
        discount: (a, b) => (b.maxDiscount ?? 0) - (a.maxDiscount ?? 0),
        fresh: (a, b) => new Date(b.latestSync ?? 0).getTime() - new Date(a.latestSync ?? 0).getTime(),
    }
    return sort === "relevance" ? list : [...list].sort(cmp[sort])
}

type BaseParams = Pick<ProductParams, "q" | "category_key" | "pharmacy_id">

/**
 * Shared shopping grid for search, category and pharmacy pages.
 * Availability, offers-only and pharmacy filters run on the server; price range and sort apply to loaded results
 * because the backend exposes no price filter or sort parameter.
 */
export function ProductBrowser({
    baseParams, showPharmacyFilter = false, emptyTitle = "No products found", emptyMessage, pageSize = 24,
}: { baseParams: BaseParams; showPharmacyFilter?: boolean; emptyTitle?: string; emptyMessage?: string; pageSize?: number }) {
    const [inStockOnly, setInStockOnly] = useState(false)
    const [offersOnly, setOffersOnly] = useState(false)
    const [pharmacy, setPharmacy] = useState("")
    const [minPrice, setMinPrice] = useState("")
    const [maxPrice, setMaxPrice] = useState("")
    const [sort, setSort] = useState<Sort>("relevance")
    const [showFilters, setShowFilters] = useState(false)

    const params = useMemo<ProductParams>(() => ({
        ...baseParams,
        pharmacy_id: baseParams.pharmacy_id ?? (pharmacy || undefined),
        availability: inStockOnly ? "in_stock" : undefined,
        discounted_only: offersOnly || undefined,
    }), [baseParams, pharmacy, inStockOnly, offersOnly])

    const feed = useProductFeed(params, pageSize)

    const loadMoreRef = useRef<HTMLDivElement | null>(null)

    // Automatically fetch another page when the user approaches the bottom.
    // Use IntersectionObserver plus scroll/resize fallback.
    useEffect(() => {
        const element = loadMoreRef.current

        if (
            !element ||
            feed.loading ||
            feed.loadingMore ||
            feed.done ||
            feed.error
        ) return

        let requested = false

        const requestNextPage = () => {
            if (requested) return
            requested = true
            feed.loadMore()
        }

        const checkScrollPosition = () => {
            if (!element.isConnected) return

            const distance =
                element.getBoundingClientRect().top - window.innerHeight

            if (distance <= 900) {
                requestNextPage()
            }
        }

        const observer =
            typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver(
                    (entries) => {
                        if (entries.some((entry) => entry.isIntersecting)) {
                            requestNextPage()
                        }
                    },
                    { rootMargin: "900px 0px", threshold: 0 }
                )
                : null

        observer?.observe(element)

        window.addEventListener("scroll", checkScrollPosition, { passive: true, capture: true })
        window.addEventListener("resize", checkScrollPosition)

        // Check immediately in case the sentinel is already near the viewport.
        checkScrollPosition()

        return () => {
            observer?.disconnect()
            window.removeEventListener("scroll", checkScrollPosition, true)
            window.removeEventListener("resize", checkScrollPosition)
        }
    }, [
        feed.loading,
        feed.loadingMore,
        feed.done,
        feed.error,
        feed.items.length,
        feed.loadMore,
    ])

    const visible = useMemo(() => {
        const lo = minPrice === "" ? null : Number(minPrice)
        const hi = maxPrice === "" ? null : Number(maxPrice)
        const filtered = feed.groups.filter((p) => {
            const price = p.bestOffer?.price ?? null
            if (lo != null && (price == null || price < lo)) return false
            if (hi != null && (price == null || price > hi)) return false
            return true
        })
        return sortProducts(filtered, sort)
    }, [feed.groups, minPrice, maxPrice, sort])

    const pharmacies = getKnownPharmacies()
    const activeCount = [inStockOnly, offersOnly, !!pharmacy, minPrice !== "", maxPrice !== ""].filter(Boolean).length
    const reset = () => { setInStockOnly(false); setOffersOnly(false); setPharmacy(""); setMinPrice(""); setMaxPrice("") }

    const field = "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-secondary outline-none focus:border-primary"

    const filters = (
        <div className="space-y-6 text-sm">
            <fieldset className="space-y-2.5">
                <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400">Availability</legend>
                <label className="flex items-center gap-2.5"><input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="h-4 w-4 accent-primary" />Confirmed in stock only</label>
                <label className="flex items-center gap-2.5"><input type="checkbox" checked={offersOnly} onChange={(e) => setOffersOnly(e.target.checked)} className="h-4 w-4 accent-primary" />Discounted products only</label>
            </fieldset>

            {showPharmacyFilter && !baseParams.pharmacy_id && (
                <div>
                    <label htmlFor="pf" className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Pharmacy</label>
                    <select id="pf" value={pharmacy} onChange={(e) => setPharmacy(e.target.value)} className={field}>
                        <option value="">All pharmacies</option>
                        {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {pharmacy && <p className="mt-1.5 text-[11px] text-gray-400">Showing only this pharmacy’s listings.</p>}
                </div>
            )}

            <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Price (EGP)</p>
                <div className="flex items-center gap-2">
                    <input inputMode="decimal" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/[^\d.]/g, ""))} className={field} aria-label="Minimum price" />
                    <span className="text-gray-300">–</span>
                    <input inputMode="decimal" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d.]/g, ""))} className={field} aria-label="Maximum price" />
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">Applies to the results loaded so far.</p>
            </div>

            {activeCount > 0 && (
                <button type="button" onClick={reset} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"><X className="h-3.5 w-3.5" />Clear all filters</button>
            )}
        </div>
    )

    return (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <aside className="hidden h-fit rounded-2xl border border-gray-100 bg-white p-5 lg:sticky lg:top-28 lg:block">
                <h2 className="mb-5 text-sm font-bold text-secondary">Filters</h2>
                {filters}
            </aside>

            <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3">
                    <p className="text-sm text-gray-500" aria-live="polite">
                        {feed.loading ? "Loading products…" : (
                            <>
                                <span className="font-bold text-secondary">{visible.length}</span> unique product{visible.length === 1 ? "" : "s"}
                                {feed.total > 0 && <span className="text-gray-400"> · {feed.total.toLocaleString()} pharmacy listings in catalogue</span>}
                            </>
                        )}
                    </p>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setShowFilters((v) => !v)} className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-semibold lg:hidden" aria-expanded={showFilters}>
                            <SlidersHorizontal className="h-4 w-4" />Filters{activeCount > 0 && ` (${activeCount})`}
                        </button>
                        <label className="sr-only" htmlFor="sort">Sort by</label>
                        <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary">
                            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                </div>

                {showFilters && <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 lg:hidden">{filters}</div>}

                {feed.loading ? (
                    <ProductGridSkeleton count={pageSize > 12 ? 12 : pageSize} />
                ) : feed.error && feed.items.length === 0 ? (
                    <ErrorState message={feed.error} onRetry={feed.retry} />
                ) : visible.length === 0 ? (
                    <EmptyState
                        title={emptyTitle}
                        message={feed.items.length > 0 && !feed.done ? "No loaded results match your price range. Load more or adjust the filters." : emptyMessage ?? "Try different keywords or clear your filters."}
                    />
                ) : (
                    <ProductGrid products={visible} pharmacyId={baseParams.pharmacy_id} />
                )}

                {feed.error && feed.items.length > 0 && <p className="mt-4 text-center text-sm text-red-600">{feed.error}</p>}

                {!feed.loading && !feed.done && !feed.error && (
                    <div ref={loadMoreRef} className="flex min-h-16 items-center justify-center py-6" aria-live="polite">
                        {feed.loadingMore ? (
                            <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading more products…
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={feed.loadMore}
                                className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Load more products
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}