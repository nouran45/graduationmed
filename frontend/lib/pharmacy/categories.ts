import {
    Baby, Droplets, Eye, FlaskConical, HeartPulse, Leaf, Package, Pill, Sparkles, Syringe, Wind,
    type LucideIcon,
} from "lucide-react"
import type { ApiCategory, MarketProduct } from "./types"

/* Display-only helpers: links always use the real API category key. */

export const categoryKeyOf = (c: ApiCategory) => String(c.category_key ?? c.name ?? c.name_ar ?? "")
export const categoryNameOf = (c: ApiCategory) => c.name || c.name_ar || "Unnamed category"

const FRIENDLY: Record<string, string> = {
    "tablets + capsules": "Tablets & Capsules",
    "injections": "Injections",
    "creams": "Creams & Ointments",
    "drops": "Drops",
    "internal solution": "Syrups & Oral Solutions",
    "internal powder": "Oral Powders",
    "babies tools": "Baby Care & Accessories",
    "cosmetic": "Beauty & Personal Care",
    "aerosol inhalations": "Inhalers & Sprays",
    "diskus": "Diskus Inhalers",
    "gels": "Gels",
    "external solutions": "Topical Solutions",
    "ext. sol. tablets": "Solution Tablets",
    "chemicals - liquid": "Antiseptics & Liquids",
    "dusting powder": "Medicated Powders",
    "effervescent powder": "Effervescent Sachets",
    "enemas": "Enemas",
    "eye lotions": "Eye Care Lotions",
    "eye ointments": "Eye Ointments",
    "honey": "Honey & Natural Products",
    "hormones": "Hormonal Medicines",
}

const PRIORITY = [
    "tablets + capsules", "injections", "creams", "drops", "internal solution",
    "babies tools", "cosmetic", "aerosol inhalations", "gels", "external solutions",
]

export function friendlyCategory(raw: string) {
    const k = raw.trim().toLowerCase()
    if (FRIENDLY[k]) return FRIENDLY[k]
    return k.replace(/\s*\+\s*/g, " & ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function categoryIcon(raw: string): LucideIcon {
    const k = raw.toLowerCase()
    if (/tablet|capsule/.test(k)) return Pill
    if (/inject/.test(k)) return Syringe
    if (/bab/.test(k)) return Baby
    if (/cosmetic/.test(k)) return Sparkles
    if (/eye/.test(k)) return Eye
    if (/aerosol|inhal|diskus/.test(k)) return Wind
    if (/cream|gel|ointment|drop|lotion/.test(k)) return Droplets
    if (/powder|effervescent|solution|chemical|liquid/.test(k)) return FlaskConical
    if (/honey|herb|natural/.test(k)) return Leaf
    if (/hormone/.test(k)) return HeartPulse
    return Package
}

export const hue = (s: string) => Array.from(s).reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

/** Common categories first, the rest alphabetical. */
export function sortCategories(list: ApiCategory[]) {
    const rank = (c: ApiCategory) => {
        const i = PRIORITY.indexOf(categoryNameOf(c).trim().toLowerCase())
        return i === -1 ? PRIORITY.length : i
    }
    return [...list].sort((a, b) => rank(a) - rank(b) || categoryNameOf(a).localeCompare(categoryNameOf(b)))
}

/** Hides placeholder records such as "0" or "[" that the catalogue sometimes contains. */
export const isRealProduct = (p: MarketProduct) => /\p{L}{2,}/u.test(p.name) && p.name !== "Product name unavailable"