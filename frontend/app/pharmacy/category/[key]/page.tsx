"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { PharmacyShell, Breadcrumbs } from "@/components/pharmacy/shell"
import { ProductBrowser } from "@/components/pharmacy/product-browser"
import { categoryKeyOf, categoryNameOf } from "@/components/pharmacy/category-shelf"
import { fetchCategories } from "@/lib/pharmacy/api"
import { useAsync } from "@/lib/pharmacy/hooks"
import { safeDecode } from "@/lib/pharmacy/marketplace"

const hue = (s: string) => Array.from(s).reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

export default function CategoryPage() {
    const params = useParams<{ key: string }>()
    const key = safeDecode(String(params.key ?? ""))
    const { data: categories } = useAsync((s) => fetchCategories(undefined, s), "categories")

    const current = categories?.find((c) => categoryKeyOf(c) === key)
    const name = current ? categoryNameOf(current) : key
    const h = hue(name)
    const base = useMemo(() => ({ category_key: key }), [key])

    return (
        <PharmacyShell>
            <div className="container py-7 sm:py-10">
                <Breadcrumbs items={[{ label: "Pharmacy", href: "/pharmacy" }, { label: "Categories", href: "/pharmacy#categories" }, { label: name }]} />

                <div className="relative overflow-hidden rounded-3xl px-6 py-9 sm:px-10 sm:py-12" style={{ background: `linear-gradient(120deg, hsl(${h} 45% 20%), hsl(${h} 55% 34%))` }}>
                    <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
                    <p className="relative text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Category</p>
                    <h1 className="relative mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">{name}</h1>
                    <p className="relative mt-3 max-w-xl text-sm leading-6 text-white/80">
                        {current
                            ? `Browse ${name.toLowerCase()} from ${typeof current.pharmacy_count === "number" ? `${current.pharmacy_count} connected pharmacies` : "connected pharmacies"} and compare prices before you choose.`
                            : `Browse ${name.toLowerCase()} from connected pharmacies and compare prices.`}
                    </p>
                    {current && typeof current.product_count === "number" && (
                        <p className="relative mt-4 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">{current.product_count.toLocaleString()} pharmacy listings</p>
                    )}
                </div>

                {categories && categories.length > 1 && (
                    <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Other categories">
                        {categories.slice(0, 20).map((c) => {
                            const k = categoryKeyOf(c)
                            return (
                                <Link key={k} href={`/pharmacy/category/${encodeURIComponent(k)}`} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${k === key ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary"}`}>
                                    {categoryNameOf(c)}
                                </Link>
                            )
                        })}
                    </div>
                )}

                <div className="mt-6">
                    <ProductBrowser baseParams={base} showPharmacyFilter emptyTitle={`No products in ${name}`} emptyMessage="This category has no products matching your filters." />
                </div>
            </div>
        </PharmacyShell>
    )
}