"use client"

import Link from "next/link"
import { Heart, ArrowUpRight, ShoppingBag } from "lucide-react"
import { useState } from "react"

type ProductCategory =
    | string
    | {
        id?: string
        name?: string
        name_ar?: string
    }
    | null

export type PharmacyApiProduct = {
    id: string
    pharmacy_id: string
    pharmacy_name?: string | null
    name: string
    name_ar?: string | null
    description?: string | null
    barcode?: string | null
    price?: number | null
    old_price?: number | null
    discount_percent?: number | null
    category?: ProductCategory
    availability: "in_stock" | "out_of_stock" | "unknown" | "stale"
    last_synced_at?: string | null
    quantity_packs?: number | null
    available_packs?: number | null
    parts?: string | null
    is_medicine?: boolean
    is_fridge?: boolean
    image_url?: string | null
    image?: string | null
    thumbnail?: string | null
}

type ProductCardProps = {
    product: PharmacyApiProduct
}

function getText(value: unknown, fallback = ""): string {
    if (typeof value === "string") {
        return value.trim() || fallback
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value)
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
        const record = value as Record<string, unknown>

        for (const key of [
            "name",
            "name_en",
            "name_ar",
            "label",
            "title",
            "value",
        ]) {
            const candidate = record[key]

            if (typeof candidate === "string" && candidate.trim()) {
                return candidate.trim()
            }
        }
    }

    return fallback
}

function getPrice(value: number | null | undefined): string {
    if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value <= 0
    ) {
        return "Price unavailable"
    }

    return `${value.toLocaleString("en-EG")} EGP`
}

function getAvailability(availability: unknown) {
    switch (availability) {
        case "in_stock":
            return {
                label: "Confirmed in stock",
                className: "text-emerald-600",
                dotClassName: "bg-emerald-500",
            }

        case "out_of_stock":
            return {
                label: "Out of stock",
                className: "text-red-500",
                dotClassName: "bg-red-500",
            }

        case "stale":
            return {
                label: "Stock not recently verified",
                className: "text-amber-600",
                dotClassName: "bg-amber-500",
            }

        default:
            return {
                label: "Availability unknown",
                className: "text-gray-500",
                dotClassName: "bg-gray-400",
            }
    }
}

function getImageUrl(product: PharmacyApiProduct): string | null {
    const candidates = [
        product.image_url,
        product.image,
        product.thumbnail,
    ]

    for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
            return candidate.trim()
        }
    }

    return null
}

function ProductCard({ product }: ProductCardProps) {
    const [wishlist, setWishlist] = useState(false)
    const [imageFailed, setImageFailed] = useState(false)

    const productName = getText(
        product.name,
        getText(product.name_ar, "Unnamed product")
    )

    const productDescription = getText(product.description)
    const pharmacyName = getText(product.pharmacy_name)

    const categoryName =
        typeof product.category === "string"
            ? product.category
            : getText(product.category, "Uncategorized")

    const availability = getAvailability(product.availability)
    const imageUrl = getImageUrl(product)

    const priceIsAvailable =
        typeof product.price === "number" &&
        Number.isFinite(product.price) &&
        product.price > 0

    const discount =
        typeof product.discount_percent === "number" &&
            Number.isFinite(product.discount_percent) &&
            product.discount_percent > 0
            ? Math.round(product.discount_percent)
            : 0

    const oldPriceIsAvailable =
        typeof product.old_price === "number" &&
        Number.isFinite(product.old_price) &&
        product.old_price > 0 &&
        priceIsAvailable &&
        product.old_price > product.price!

    const productId = getText(product.id)
    const productHref = `/pharmacy/product/${encodeURIComponent(productId)}`

    const lastSynced = product.last_synced_at
        ? new Date(product.last_synced_at)
        : null

    return (
        <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-xl hover:shadow-secondary/5">

            {/* Product visual */}
            <div className="relative aspect-square overflow-hidden bg-gray-50">
                {discount > 0 && (
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-white">
                        -{discount}%
                    </span>
                )}

                <button
                    type="button"
                    onClick={() => setWishlist((value) => !value)}
                    className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-gray-100 bg-white/95 text-gray-400 shadow-sm transition-all hover:text-primary"
                    aria-label={
                        wishlist
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                    }
                >
                    <Heart
                        className={`h-4 w-4 ${wishlist ? "fill-primary text-primary" : ""
                            }`}
                    />
                </button>

                <Link
                    href={productHref}
                    className="flex h-full w-full items-center justify-center p-5"
                    aria-label={`View ${productName}`}
                >
                    {imageUrl && !imageFailed ? (
                        <img
                            src={imageUrl}
                            alt={productName}
                            loading="lazy"
                            onError={() => setImageFailed(true)}
                            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-white shadow-sm">
                            <div className="text-center">
                                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10">
                                    <ShoppingBag className="h-10 w-10 text-primary/50" />
                                </div>

                                <p className="mt-3 max-w-[150px] text-xs font-medium text-gray-400">
                                    No product image available
                                </p>
                            </div>
                        </div>
                    )}
                </Link>
            </div>

            {/* Product information */}
            <div className="flex flex-1 flex-col p-4">
                <p className="truncate text-[9px] font-bold uppercase tracking-[0.15em] text-primary">
                    {categoryName}
                </p>

                <Link href={productHref} className="mt-1.5">
                    <h3 className="line-clamp-2 text-sm font-bold leading-5 text-secondary transition-colors group-hover:text-primary">
                        {productName}
                    </h3>
                </Link>

                {productDescription && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-gray-400">
                        {productDescription}
                    </p>
                )}

                <div className="mt-3">
                    {pharmacyName && (
                        <p className="truncate text-[10px] font-medium text-gray-500">
                            {pharmacyName}
                        </p>
                    )}

                    <p
                        className={`mt-1 flex items-center gap-1.5 text-[10px] font-medium ${availability.className}`}
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${availability.dotClassName}`}
                        />
                        {availability.label}
                    </p>

                    {lastSynced && !Number.isNaN(lastSynced.getTime()) && (
                        <p className="mt-1 text-[9px] text-gray-400">
                            Last synced: {lastSynced.toLocaleString()}
                        </p>
                    )}
                </div>

                {/* Price and actions */}
                <div className="mt-auto pt-4">
                    <div className="flex items-end justify-between gap-2">
                        <div>
                            <p className="text-lg font-bold tracking-tight text-secondary">
                                {getPrice(product.price)}
                            </p>

                            {oldPriceIsAvailable && (
                                <p className="text-[10px] text-gray-400 line-through">
                                    {getPrice(product.old_price)}
                                </p>
                            )}
                        </div>

                        <Link
                            href={productHref}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400 transition-colors hover:bg-primary hover:text-white"
                            aria-label={`View ${productName}`}
                        >
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <Link
                        href={productHref}
                        className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-secondary text-xs font-semibold text-white transition-colors hover:bg-primary"
                    >
                        View product details
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>
        </article>
    )
}

export { ProductCard }