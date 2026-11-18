"use client"

import { Suspense, useMemo } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { PharmacyShell, Breadcrumbs } from "@/components/pharmacy/shell"
import { SearchBox } from "@/components/pharmacy/search-box"
import { ProductBrowser } from "@/components/pharmacy/product-browser"
import { Shelf } from "@/components/pharmacy/product-card"
import { CategoryShelf, categoryKeyOf, categoryNameOf } from "@/components/pharmacy/category-shelf"
import { ErrorState } from "@/components/pharmacy/states"
import { fetchCategories, fetchDiscounts, fetchProducts } from "@/lib/pharmacy/api"
import { useAsync } from "@/lib/pharmacy/hooks"
import { groupProducts, isFresh, safeDecode, timeAgo } from "@/lib/pharmacy/marketplace"

function Store() {
    const params = useParams<{ pharmacyId: string }>()
    const id = safeDecode(String(params.pharmacyId ?? ""))
    const sp = useSearchParams()
    const category = sp.get("category") ?? ""
    const q = (sp.get("q") ?? "").trim()
    const viewAll = sp.get("view") === "all"

    const info = useAsync((s) => fetchProducts({ pharmacy_id: id, limit: 20 }, s), `store-${id}`)
    const cats = useAsync((s) => fetchCategories(id, s), `store-cats-${id}`)
    const offers = useAsync((s) => fetchDiscounts({ pharmacy_id: id, limit: 12 }, s), `store-deals-${id}`)

    const name = info.data?.items[0]?.pharmacy_name || (info.loading ? "Loading pharmacy…" : "Pharmacy")
    const total = info.data?.total
    const syncs = (info.data?.items ?? []).map((i) => i.last_synced_at).filter(Boolean) as string[]
    const latest = syncs.length ? syncs.reduce((a, b) => (new Date(b) > new Date(a) ? b : a)) : null
    const base = useMemo(() => ({ pharmacy_id: id, category_key: category || undefined, q: q || undefined }), [id, category, q])
    const deals = useMemo(() => groupProducts(offers.data?.items ?? []).filter((p) => p.maxDiscount), [offers.data])
    const list = cats.data ?? []
    const browsing = !!(category || q || viewAll)
    const activeCat = list.find((c) => categoryKeyOf(c) === category)
    const href = (extra = "") => `/pharmacy/store/${encodeURIComponent(id)}${extra}`

    if (info.error && !info.data) {
        return <div className="container py-10"><ErrorState message={info.error} onRetry={() => window.location.reload()} /></div>
    }

    return (
        <div className="container py-7 sm:py-10">
            <Breadcrumbs items={[{ label: "Pharmacy", href: "/pharmacy" }, { label: "Pharmacies", href: "/pharmacy#pharmacies" }, { label: name }, ...(activeCat ? [{ label: categoryNameOf(activeCat) }] : [])]} />

            <div className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary" aria-hidden>{name.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            {typeof total === "number" && <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-600">{total.toLocaleString()} products</span>}
                            <span className={`rounded-full px-3 py-1 font-semibold ${!latest ? "bg-gray-100 text-gray-600" : isFresh(latest) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                {!latest ? "Inventory sync unknown" : isFresh(latest) ? `Inventory up to date · synced ${timeAgo(latest)}` : `Inventory may be outdated · synced ${timeAgo(latest)}`}
                            </span>
                        </div>
                    </div>
                    <div className="w-full md:w-96"><SearchBox pharmacyId={id} initialValue={q} placeholder={`Search in ${info.data?.items[0]?.pharmacy_name ?? "this pharmacy"}…`} /></div>
                </div>
            </div>

            <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Pharmacy categories">
                <Link href={href()} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${!browsing ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-gray-600 hover:border-primary"}`}>Overview</Link>
                <Link href={href("?view=all")} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${viewAll && !category ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-gray-600 hover:border-primary"}`}>All products</Link>
                {list.map((c) => {
                    const k = categoryKeyOf(c)
                    return (
                        <Link key={k} href={href(`?category=${encodeURIComponent(k)}`)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${k === category ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-gray-600 hover:border-primary"}`}>
                            {categoryNameOf(c)}{typeof c.product_count === "number" ? ` (${c.product_count.toLocaleString()})` : ""}
                        </Link>
                    )
                })}
            </div>

            <div className="mt-6">
                {browsing ? (
                    <>
                        {q && <p className="mb-4 text-sm text-gray-500">Results for <span className="font-semibold text-secondary">“{q}”</span> in this pharmacy. <Link href={href()} className="font-semibold text-primary hover:underline">Clear</Link></p>}
                        <ProductBrowser baseParams={base} emptyTitle="No products found in this pharmacy" emptyMessage="Try another category or search term." />
                    </>
                ) : (
                    <>
                        <Shelf eyebrow="Offers" title="Offers & discounts" products={deals} loading={offers.loading} limit={4} pharmacyId={id} />
                        {list.slice(0, 6).map((c) => <CategoryShelf key={categoryKeyOf(c)} category={c} pharmacyId={id} />)}
                        {!cats.loading && list.length === 0 && (
                            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No categories were returned for this pharmacy. <Link href={href("?view=all")} className="font-semibold text-primary">Browse all products</Link></p>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default function StorePage() {
    return (
        <PharmacyShell hideSearch>
            <Suspense fallback={<div className="container py-10"><div className="h-64 animate-pulse rounded-2xl bg-gray-200" /></div>}>
                <Store />
            </Suspense>
        </PharmacyShell>
    )
}