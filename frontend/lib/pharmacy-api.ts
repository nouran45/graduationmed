// lib/pharmacy-api.ts
//
// Client-side helper for the mock pharmacy API. Centralizing the fetch here
// means the homepage, /pharmacy, and any future surface all speak to the
// same contract — and swapping the mock route for a real backend later is a
// one-file change.

import type { PharmacyCategory, PharmacyDeal } from "@/app/api/pharmacy/deals/route"

export type { PharmacyCategory, PharmacyDeal }

export interface PharmacyDealsResponse {
    deals: PharmacyDeal[]
    total: number
    categories: PharmacyCategory[]
    generatedAt: string
}

export interface GetPharmacyDealsParams {
    category?: PharmacyCategory | "all"
    query?: string
    limit?: number
    signal?: AbortSignal
}

export async function getPharmacyDeals(
    params: GetPharmacyDealsParams = {}
): Promise<PharmacyDealsResponse> {
    const { category, query, limit, signal } = params

    const searchParams = new URLSearchParams()
    if (category && category !== "all") searchParams.set("category", category)
    if (query) searchParams.set("q", query)
    if (limit) searchParams.set("limit", String(limit))

    const url = `/api/pharmacy/deals${searchParams.toString() ? `?${searchParams}` : ""}`

    const res = await fetch(url, { signal, cache: "no-store" })

    if (!res.ok) {
        throw new Error(`Pharmacy API request failed (${res.status})`)
    }

    return res.json()
}