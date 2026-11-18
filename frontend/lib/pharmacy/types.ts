// Types mirror the fields already returned by PharmaSync (see lib/pharmasync.ts). Nothing here is invented.
export type Availability = "in_stock" | "out_of_stock" | "unknown" | "stale"

export interface ApiProduct {
    id: number | string
    pharmacy_id?: string | number | null
    pharmacy_name?: string | null
    pharmacy_name_ar?: string | null
    name?: string | null
    name_ar?: string | null
    description?: string | null
    barcode?: string | null
    price?: number | string | null
    old_price?: number | string | null
    discount_percent?: number | string | null
    parts?: number | string | null
    is_medicine?: boolean | null
    is_fridge?: boolean | null
    category?: { id?: number | string; name?: string | null; name_ar?: string | null } | null
    availability?: Availability | string
    last_synced_at?: string | null
    quantity_packs?: number | string | null
    available_packs?: number | string | null
}

export interface ApiCategory {
    category_key?: string | number
    name?: string | null
    name_ar?: string | null
    pharmacy_count?: number
    product_count?: number
}

export interface ListResponse<T> {
    done?: boolean
    items: T[]
    total: number
}

export interface ProductParams {
    q?: string
    category_key?: string
    pharmacy_id?: string
    availability?: Availability
    discounted_only?: boolean
    limit?: number
    offset?: number
}

export type DiscountParams = Pick<ProductParams, "q" | "category_key" | "pharmacy_id" | "limit" | "offset">

export interface PharmacyRef {
    id: string
    name: string
}

/** One pharmacy's listing of a product. */
export interface Offer {
    productId: string
    pharmacyId: string
    pharmacyName: string
    price: number | null
    oldPrice: number | null
    discountPercent: number | null
    availability: Availability
    lastSyncedAt: string | null
    availablePacks: number | null
}

export interface AvailabilitySummary {
    status: Availability
    confirmed: boolean
    label: string
}

/** A product de-duplicated across pharmacies, with every pharmacy offer retained. */
export interface MarketProduct {
    key: string
    name: string
    description: string | null
    barcode: string | null
    category: string | null
    categoryKey: string | null
    imageUrl: string | null
    isMedicine: boolean
    isFridge: boolean
    offers: Offer[]
    bestOffer: Offer | null
    offerCount: number
    minPrice: number | null
    maxPrice: number | null
    maxDiscount: number | null
    latestSync: string | null
    availability: AvailabilitySummary
}