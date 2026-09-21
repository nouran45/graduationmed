"use client"

import Link from "next/link"
import { Heart, ShoppingCart, ArrowUpRight } from "lucide-react"
import { useState } from "react"
import type { PharmacyProduct } from "@/lib/pharmacy/mock-data"

type ProductCardProps = {
    product: PharmacyProduct
}

export default function ProductCard({ product }: ProductCardProps) {
    const [wishlist, setWishlist] = useState(false)
    const [added, setAdded] = useState(false)

    const discount =
        product.discount ??
        (product.originalPrice
            ? Math.round(
                ((product.originalPrice - product.price) /
                    product.originalPrice) *
                100
            )
            : 0)

    return (
        <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-xl hover:shadow-secondary/5">
            {/* Image area */}
            <div className="relative aspect-square overflow-hidden bg-gray-50">
                {/* Discount */}
                {discount > 0 && (
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-white">
                        -{discount}%
                    </span>
                )}

                {/* Prescription */}
                {product.prescriptionRequired && (
                    <span className="absolute bottom-3 left-3 z-10 rounded-full bg-secondary px-2.5 py-1 text-[9px] font-semibold text-white">
                        Rx Required
                    </span>
                )}

                {/* Wishlist */}
                <button
                    type="button"
                    onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setWishlist((value) => !value)
                    }}
                    className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-gray-100 bg-white/95 text-gray-400 shadow-sm transition-all hover:text-primary"
                    aria-label="Add to wishlist"
                >
                    <Heart
                        className={`h-4 w-4 ${wishlist ? "fill-primary text-primary" : ""
                            }`}
                    />
                </button>

                {/* Product image */}
                <Link
                    href={`/pharmacy/product/${product.id}`}
                    className="flex h-full w-full items-center justify-center p-8"
                >
                    <div className="flex h-full w-full items-center justify-center rounded-xl bg-white shadow-sm">
                        <div className="text-center">
                            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10">
                                <ShoppingCart className="h-10 w-10 text-primary/50" />
                            </div>

                            <p className="mt-3 max-w-[130px] text-[9px] font-medium text-gray-300">
                                Product image
                            </p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col p-4">
                {/* Category */}
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-primary">
                    {product.category}
                </p>

                {/* Name */}
                <Link
                    href={`/pharmacy/product/${product.id}`}
                    className="mt-1.5"
                >
                    <h3 className="line-clamp-2 text-sm font-bold leading-5 text-secondary transition-colors group-hover:text-primary">
                        {product.name}
                    </h3>
                </Link>

                {/* Strength */}
                <p className="mt-1 text-[11px] text-gray-400">
                    {product.strength} · {product.dosageForm}
                </p>

                {/* Pharmacy */}
                <div className="mt-3">
                    <p className="text-[10px] font-medium text-gray-500">
                        {product.pharmacy}
                    </p>

                    {product.available ? (
                        <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            In stock
                        </p>
                    ) : (
                        <p className="mt-1 text-[10px] font-medium text-red-500">
                            Out of stock
                        </p>
                    )}
                </div>

                {/* Bottom */}
                <div className="mt-auto pt-4">
                    <div className="flex items-end justify-between gap-2">
                        <div>
                            <p className="text-lg font-bold tracking-tight text-secondary">
                                {product.price} EGP
                            </p>

                            {product.originalPrice && (
                                <p className="text-[10px] text-gray-400 line-through">
                                    {product.originalPrice} EGP
                                </p>
                            )}
                        </div>

                        <Link
                            href={`/pharmacy/product/${product.id}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-400 transition-colors hover:bg-primary hover:text-white"
                            aria-label="View product"
                        >
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <button
                        type="button"
                        disabled={!product.available}
                        onClick={() => setAdded(true)}
                        className={`mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-all ${!product.available
                                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                                : added
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-secondary text-white hover:bg-primary"
                            }`}
                    >
                        <ShoppingCart className="h-3.5 w-3.5" />

                        {!product.available
                            ? "Unavailable"
                            : added
                                ? "Added to cart"
                                : "Add to cart"}
                    </button>
                </div>
            </div>
        </article>
    )
}