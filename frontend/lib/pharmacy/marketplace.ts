import type { ApiProduct, Availability, AvailabilitySummary, MarketProduct, Offer } from "./types"

export function toNumber(v: unknown): number | null {
    if (v === null || v === undefined || v === "") return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
}

export function formatEGP(v: number | null | undefined) {
    if (v == null || !(v > 0)) return null
    return new Intl.NumberFormat("en-EG", { maximumFractionDigits: 2 }).format(v)
}

export function displayName(p: ApiProduct) {
    const name = p.name?.trim()
    if (name && name !== "*") return name
    return p.description?.trim() || p.name_ar?.trim() || "Product name unavailable"
}

const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()

/** Identity of a product across pharmacies: barcode when usable, otherwise normalised name. */
export function productKey(p: ApiProduct) {
    const barcode = p.barcode?.trim()
    if (barcode && barcode.length >= 6 && !/^0+$/.test(barcode)) return `bc:${barcode}`
    const name = displayName(p)
    if (name === "Product name unavailable") return `id:${p.pharmacy_id ?? ""}:${p.id}`
    return `nm:${normalize(name)}`
}

export function normalizeStatus(a: unknown): Availability {
    return a === "in_stock" || a === "out_of_stock" || a === "stale" ? a : "unknown"
}

/**
 * The API documents no image field. This defensively checks common names and is inert when absent;
 * the UI then uses the generated fallback tile. Adjust the keys if PharmaSync adds an image field.
 */
const IMAGE_KEYS = ["image_url", "image", "thumbnail", "photo_url"]
export function resolveImage(p: ApiProduct): string | null {
    const r = p as unknown as Record<string, unknown>
    for (const k of IMAGE_KEYS) {
        const v = r[k]
        if (typeof v === "string" && /^(https?:)?\/\/|^\//.test(v.trim())) return v.trim()
    }
    return null
}

export function toOffer(p: ApiProduct): Offer {
    const price = toNumber(p.price)
    const old = toNumber(p.old_price)
    const disc = toNumber(p.discount_percent)
    return {
        productId: String(p.id),
        pharmacyId: p.pharmacy_id != null ? String(p.pharmacy_id) : "",
        pharmacyName: p.pharmacy_name?.trim() || p.pharmacy_name_ar?.trim() || "Pharmacy",
        price: price && price > 0 ? price : null,
        oldPrice: old && price && old > price ? old : null,
        discountPercent: disc && disc > 0 && disc <= 100 ? disc : null,
        availability: normalizeStatus(p.availability),
        lastSyncedAt: p.last_synced_at ?? null,
        availablePacks: toNumber(p.available_packs),
    }
}

function pickBest(offers: Offer[]): Offer | null {
    const priced = offers.filter((o) => o.price != null)
    const confirmed = priced.filter((o) => o.availability === "in_stock")
    const pool = confirmed.length ? confirmed : priced
    if (!pool.length) return offers[0] ?? null
    return pool.reduce((a, b) => ((b.price as number) < (a.price as number) ? b : a))
}

export function summarizeAvailability(offers: Offer[]): AvailabilitySummary {
    const total = offers.length
    const inStock = offers.filter((o) => o.availability === "in_stock").length
    if (inStock > 0) {
        return { status: "in_stock", confirmed: true, label: total > 1 ? `In stock at ${inStock} of ${total} pharmacies` : "In stock" }
    }
    if (total > 0 && offers.every((o) => o.availability === "out_of_stock")) {
        return { status: "out_of_stock", confirmed: true, label: "Out of stock" }
    }
    if (offers.some((o) => o.availability === "stale")) {
        return { status: "stale", confirmed: false, label: "Stock info outdated" }
    }
    return { status: "unknown", confirmed: false, label: "Availability not confirmed" }
}

/** Collapse pharmacy-level records into one product each, keeping every pharmacy's offer. */
export function groupProducts(items: ApiProduct[]): MarketProduct[] {
    const map = new Map<string, MarketProduct & { _offers: Map<string, Offer> }>()

    for (const p of items) {
        const key = productKey(p)
        const offer = toOffer(p)
        const pharmacyKey = offer.pharmacyId || offer.pharmacyName
        let g = map.get(key)
        if (!g) {
            g = {
                key, name: displayName(p), description: null, barcode: null, category: null, categoryKey: null,
                imageUrl: null, isMedicine: false, isFridge: false, offers: [], bestOffer: null, offerCount: 0,
                minPrice: null, maxPrice: null, maxDiscount: null, latestSync: null,
                availability: { status: "unknown", confirmed: false, label: "" }, _offers: new Map(),
            }
            map.set(key, g)
        }
        const existing = g._offers.get(pharmacyKey)
        if (!existing || (offer.price != null && (existing.price == null || offer.price < existing.price))) {
            g._offers.set(pharmacyKey, offer)
        }
        const desc = p.description?.trim()
        if (!g.description && desc && desc !== g.name) g.description = desc
        g.barcode ||= p.barcode?.trim() || null
        g.category ||= p.category?.name?.trim() || p.category?.name_ar?.trim() || null
        g.categoryKey ||= p.category?.name?.trim() || null
        g.imageUrl ||= resolveImage(p)
        g.isMedicine ||= !!p.is_medicine
        g.isFridge ||= !!p.is_fridge
    }

    return Array.from(map.values()).map(({ _offers, ...g }) => {
        const offers = Array.from(_offers.values())
        const prices = offers.map((o) => o.price).filter((n): n is number => n != null)
        const discounts = offers.map((o) => o.discountPercent).filter((n): n is number => n != null)
        const syncs = offers.map((o) => o.lastSyncedAt).filter(Boolean) as string[]
        return {
            ...g,
            offers,
            offerCount: offers.length,
            bestOffer: pickBest(offers),
            minPrice: prices.length ? Math.min(...prices) : null,
            maxPrice: prices.length ? Math.max(...prices) : null,
            maxDiscount: discounts.length ? Math.max(...discounts) : null,
            latestSync: syncs.length ? syncs.reduce((a, b) => (new Date(b) > new Date(a) ? b : a)) : null,
            availability: summarizeAvailability(offers),
        }
    })
}

export function productHref(p: MarketProduct, pharmacyId?: string) {
    const offer = (pharmacyId && p.offers.find((o) => o.pharmacyId === pharmacyId)) || p.bestOffer
    if (!offer) return "/pharmacy"
    const q = offer.pharmacyId ? `?pharmacy_id=${encodeURIComponent(offer.pharmacyId)}` : ""
    return `/pharmacy/product/${encodeURIComponent(offer.productId)}${q}`
}

export function savingsPct(p: MarketProduct) {
    return p.minPrice != null && p.maxPrice != null && p.maxPrice > 0 ? ((p.maxPrice - p.minPrice) / p.maxPrice) * 100 : 0
}

export const STATUS_STYLES: Record<Availability, { dot: string; text: string; bg: string }> = {
    in_stock: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
    out_of_stock: { dot: "bg-red-500", text: "text-red-600", bg: "bg-red-50" },
    stale: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
    unknown: { dot: "bg-gray-400", text: "text-gray-600", bg: "bg-gray-100" },
}

export function timeAgo(iso?: string | null) {
    if (!iso) return null
    const t = new Date(iso).getTime()
    if (!Number.isFinite(t)) return null
    const m = Math.max(0, Math.round((Date.now() - t) / 60000))
    if (m < 2) return "just now"
    if (m < 60) return `${m} min ago`
    if (m < 60 * 24) return `${Math.round(m / 60)} h ago`
    return `${Math.round(m / 1440)} d ago`
}

/** UI heuristic: inventory synced within the last 24 h counts as fresh. */
export function isFresh(iso?: string | null) {
    const t = iso ? new Date(iso).getTime() : NaN
    return Number.isFinite(t) && Date.now() - t < 24 * 3600 * 1000
}

export function safeDecode(s: string) {
    try { return decodeURIComponent(s) } catch { return s }
}