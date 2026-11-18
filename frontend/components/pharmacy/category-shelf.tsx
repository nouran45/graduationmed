"use client"

import { useInView, useProductFeed } from "@/lib/pharmacy/hooks"
import type { ApiCategory } from "@/lib/pharmacy/types"
import { Shelf } from "./product-card"

export const categoryKeyOf = (c: ApiCategory) => String(c.category_key ?? c.name ?? c.name_ar ?? "")
export const categoryNameOf = (c: ApiCategory) => c.name || c.name_ar || "Unnamed category"

/** One category's products. Fetches only when scrolled near the viewport. */
export function CategoryShelf({ category, pharmacyId, limit = 4 }: { category: ApiCategory; pharmacyId?: string; limit?: number }) {
    const [ref, seen] = useInView<HTMLDivElement>()
    const key = categoryKeyOf(category)
    const feed = useProductFeed({ category_key: key, pharmacy_id: pharmacyId }, limit * 3, seen)
    const href = pharmacyId
        ? `/pharmacy/store/${encodeURIComponent(pharmacyId)}?category=${encodeURIComponent(key)}`
        : `/pharmacy/category/${encodeURIComponent(key)}`
    return (
        <div ref={ref} className="min-h-[120px]">
            {seen && (
                <Shelf
                    title={categoryNameOf(category)} eyebrow="Category" href={href} hrefLabel="View all"
                    products={feed.groups} loading={feed.loading} limit={limit} pharmacyId={pharmacyId}
                />
            )}
        </div>
    )
}