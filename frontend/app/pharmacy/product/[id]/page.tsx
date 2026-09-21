"use client"

import Link from "next/link"
import { useState } from "react"
import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock3,
    Heart,
    Minus,
    Plus,
    ShieldCheck,
    ShoppingBag,
    Star,
    Truck,
} from "lucide-react"

import ProductCard from "@/components/pharmacy/ProductCard"

import {
    getProductById,
    pharmacyOffers,
    pharmacyProducts,
} from "@/lib/pharmacy/mock-data"

type ProductDetailsPageProps = {
    params: {
        id: string
    }
}

export default function ProductDetailsPage({
    params,
}: ProductDetailsPageProps) {
    const product = getProductById(params.id)

    const [quantity, setQuantity] = useState(1)
    const [wishlist, setWishlist] = useState(false)
    const [selectedPharmacy, setSelectedPharmacy] = useState(
        product?.pharmacy ?? ""
    )
    const [added, setAdded] = useState(false)

    const [openSection, setOpenSection] = useState("overview")

    if (!product) {
        return (
            <div className="min-h-screen bg-white">
                <div className="container flex min-h-[70vh] items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-secondary">
                            Product not found
                        </h1>

                        <p className="mt-2 text-sm text-gray-500">
                            The product you're looking for is unavailable.
                        </p>

                        <Link
                            href="/pharmacy"
                            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-white"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to pharmacy
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const offers = pharmacyOffers[product.id] ?? [
        {
            pharmacy: product.pharmacy,
            location: product.pharmacyLocation,
            price: product.price,
            originalPrice: product.originalPrice,
            available: product.available,
            stock: product.stock,
            delivery: "Delivery available",
        },
    ]

    const selectedOffer =
        offers.find(
            (offer) => offer.pharmacy === selectedPharmacy
        ) ?? offers[0]

    const relatedProducts = pharmacyProducts
        .filter(
            (item) =>
                item.id !== product.id &&
                item.categorySlug === product.categorySlug
        )
        .slice(0, 4)

    const increaseQuantity = () => {
        const maxStock = selectedOffer.stock || 1

        setQuantity((value) =>
            Math.min(value + 1, maxStock)
        )
    }

    const decreaseQuantity = () => {
        setQuantity((value) =>
            Math.max(1, value - 1)
        )
    }

    return (
        <div className="min-h-screen bg-white text-secondary">
            {/* =====================================================
          HEADER
      ===================================================== */}
            <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-xl">
                <div className="container">
                    <div className="flex h-[70px] items-center justify-between">
                        <Link href="/pharmacy">
                            <span className="text-xl font-bold tracking-tight text-secondary">
                                Medi<span className="text-primary">Check</span>
                            </span>
                        </Link>

                        <div className="flex items-center gap-2">
                            <Link
                                href="/pharmacy/wishlist"
                                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-50 hover:text-primary"
                            >
                                <Heart className="h-5 w-5" />
                            </Link>

                            <Link
                                href="/pharmacy/cart"
                                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-50 hover:text-primary"
                            >
                                <ShoppingBag className="h-5 w-5" />

                                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[8px] font-bold text-white">
                                    0
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main>
                <div className="container py-6 sm:py-8">
                    {/* =================================================
              BREADCRUMB
          ================================================= */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <Link href="/" className="hover:text-primary">
                            Home
                        </Link>

                        <span>/</span>

                        <Link href="/pharmacy" className="hover:text-primary">
                            Pharmacy
                        </Link>

                        <span>/</span>

                        <Link
                            href={`/pharmacy?category=${product.categorySlug}`}
                            className="hover:text-primary"
                        >
                            {product.category}
                        </Link>

                        <span>/</span>

                        <span className="text-gray-600">
                            {product.name}
                        </span>
                    </div>

                    {/* =================================================
              PRODUCT MAIN
          ================================================= */}
                    <div className="mt-8 grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
                        {/* =================================================
                LEFT — PRODUCT IMAGE
            ================================================= */}
                        <div>
                            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-gray-50">
                                {product.discount && (
                                    <span className="absolute left-5 top-5 z-10 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white">
                                        -{product.discount}%
                                    </span>
                                )}

                                {product.prescriptionRequired && (
                                    <span className="absolute bottom-5 left-5 z-10 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-white">
                                        Prescription Required
                                    </span>
                                )}

                                <div className="flex h-64 w-64 items-center justify-center rounded-3xl bg-white shadow-sm sm:h-80 sm:w-80">
                                    <div className="text-center">
                                        <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-3xl bg-primary/10">
                                            <ShoppingBag className="h-14 w-14 text-primary/50" />
                                        </div>

                                        <p className="mt-4 text-xs text-gray-300">
                                            Product image
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Image thumbnails placeholder */}
                            <div className="mt-3 flex gap-3">
                                {[1, 2, 3].map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        className={`flex h-16 w-16 items-center justify-center rounded-xl border ${item === 1
                                                ? "border-primary"
                                                : "border-gray-100"
                                            } bg-gray-50`}
                                    >
                                        <ShoppingBag className="h-5 w-5 text-gray-300" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* =================================================
                RIGHT — PRODUCT INFO
            ================================================= */}
                        <div>
                            {/* Category */}
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                                {product.category}
                            </p>

                            {/* Name */}
                            <h1 className="mt-3 text-3xl font-bold tracking-tight text-secondary sm:text-4xl">
                                {product.name}
                            </h1>

                            {/* Generic */}
                            <p className="mt-2 text-sm text-gray-500">
                                {product.genericName}
                            </p>

                            {/* Rating */}
                            <div className="mt-4 flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />

                                    <span className="text-sm font-semibold text-secondary">
                                        {product.rating}
                                    </span>
                                </div>

                                <span className="text-xs text-gray-400">
                                    {product.reviewCount} reviews
                                </span>
                            </div>

                            {/* Divider */}
                            <div className="my-6 h-px bg-gray-100" />

                            {/* Product information */}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400">
                                        Strength
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-secondary">
                                        {product.strength}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400">
                                        Form
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-secondary">
                                        {product.dosageForm}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400">
                                        Package
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-secondary">
                                        {product.packageSize}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400">
                                        Manufacturer
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-secondary">
                                        {product.manufacturer}
                                    </p>
                                </div>
                            </div>

                            {/* Price */}
                            <div className="mt-7 rounded-2xl bg-gray-50 p-5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
                                    Current price
                                </p>

                                <div className="mt-2 flex items-end gap-3">
                                    <span className="text-3xl font-bold tracking-tight text-secondary">
                                        {selectedOffer.price} EGP
                                    </span>

                                    {selectedOffer.originalPrice && (
                                        <span className="pb-1 text-sm text-gray-400 line-through">
                                            {selectedOffer.originalPrice} EGP
                                        </span>
                                    )}
                                </div>

                                {product.discount && (
                                    <p className="mt-1 text-xs font-semibold text-primary">
                                        Save {product.discount}%
                                    </p>
                                )}
                            </div>

                            {/* Availability */}
                            <div className="mt-5 flex items-center gap-2">
                                {selectedOffer.available ? (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />

                                        <span className="text-sm font-medium text-emerald-600">
                                            In stock
                                        </span>

                                        {selectedOffer.stock <= 5 && (
                                            <span className="text-xs text-gray-400">
                                                · Only {selectedOffer.stock} left
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-sm font-medium text-red-500">
                                        Currently unavailable
                                    </span>
                                )}
                            </div>

                            {/* =================================================
                  PHARMACY OFFERS
              ================================================= */}
                            <div className="mt-7">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-secondary">
                                        Available from
                                    </h2>

                                    <span className="text-xs text-gray-400">
                                        {offers.length} pharmacies
                                    </span>
                                </div>

                                <div className="mt-3 space-y-2">
                                    {offers.map((offer) => {
                                        const selected =
                                            selectedPharmacy === offer.pharmacy

                                        return (
                                            <button
                                                key={offer.pharmacy}
                                                type="button"
                                                disabled={!offer.available}
                                                onClick={() => {
                                                    setSelectedPharmacy(offer.pharmacy)
                                                    setQuantity(1)
                                                }}
                                                className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${selected
                                                        ? "border-primary bg-primary/[0.04]"
                                                        : "border-gray-100 bg-white hover:border-gray-200"
                                                    } ${!offer.available
                                                        ? "cursor-not-allowed opacity-50"
                                                        : ""
                                                    }`}
                                            >
                                                <div
                                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected
                                                            ? "bg-primary/10"
                                                            : "bg-gray-50"
                                                        }`}
                                                >
                                                    {selected ? (
                                                        <Check className="h-4 w-4 text-primary" />
                                                    ) : (
                                                        <StoreIcon />
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-secondary">
                                                        {offer.pharmacy}
                                                    </p>

                                                    <p className="mt-0.5 text-xs text-gray-400">
                                                        {offer.location} · {offer.delivery}
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-secondary">
                                                        {offer.price} EGP
                                                    </p>

                                                    <p
                                                        className={`mt-0.5 text-[10px] ${offer.available
                                                                ? "text-emerald-600"
                                                                : "text-red-500"
                                                            }`}
                                                    >
                                                        {offer.available
                                                            ? "In stock"
                                                            : "Unavailable"}
                                                    </p>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* =================================================
                  QUANTITY + ACTIONS
              ================================================= */}
                            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                {/* Quantity */}
                                <div className="flex h-12 items-center rounded-xl border border-gray-200">
                                    <button
                                        type="button"
                                        onClick={decreaseQuantity}
                                        className="flex h-full w-11 items-center justify-center text-gray-500 hover:text-primary"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>

                                    <span className="w-10 text-center text-sm font-semibold">
                                        {quantity}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={increaseQuantity}
                                        disabled={
                                            quantity >= (selectedOffer.stock || 1)
                                        }
                                        className="flex h-full w-11 items-center justify-center text-gray-500 hover:text-primary disabled:opacity-30"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Add to cart */}
                                <button
                                    type="button"
                                    disabled={!selectedOffer.available}
                                    onClick={() => setAdded(true)}
                                    className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${!selectedOffer.available
                                            ? "cursor-not-allowed bg-gray-100 text-gray-400"
                                            : added
                                                ? "bg-emerald-50 text-emerald-600"
                                                : "bg-primary text-white hover:bg-primary/90"
                                        }`}
                                >
                                    {added ? (
                                        <>
                                            <Check className="h-4 w-4" />
                                            Added to cart
                                        </>
                                    ) : (
                                        <>
                                            <ShoppingBag className="h-4 w-4" />
                                            Add to cart
                                        </>
                                    )}
                                </button>

                                {/* Wishlist */}
                                <button
                                    type="button"
                                    onClick={() => setWishlist((value) => !value)}
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${wishlist
                                            ? "border-primary bg-primary/5 text-primary"
                                            : "border-gray-200 text-gray-500 hover:border-primary hover:text-primary"
                                        }`}
                                    aria-label="Add to wishlist"
                                >
                                    <Heart
                                        className={`h-5 w-5 ${wishlist ? "fill-primary" : ""
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Delivery information */}
                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-gray-100 p-3.5">
                                    <Truck className="h-4 w-4 text-primary" />

                                    <p className="mt-2 text-xs font-semibold text-secondary">
                                        Delivery
                                    </p>

                                    <p className="mt-1 text-[10px] text-gray-400">
                                        Availability depends on pharmacy
                                    </p>
                                </div>

                                <div className="rounded-xl border border-gray-100 p-3.5">
                                    <ShieldCheck className="h-4 w-4 text-primary" />

                                    <p className="mt-2 text-xs font-semibold text-secondary">
                                        Pharmacy verified
                                    </p>

                                    <p className="mt-1 text-[10px] text-gray-400">
                                        Product source information
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* =================================================
              PRODUCT INFORMATION
          ================================================= */}
                    <section className="mt-16 border-t border-gray-100 pt-10">
                        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
                            {/* Accordions */}
                            <div>
                                <h2 className="text-xl font-bold text-secondary">
                                    Product information
                                </h2>

                                <div className="mt-5 divide-y divide-gray-100 rounded-2xl border border-gray-100">
                                    <Accordion
                                        title="About this product"
                                        open={openSection === "overview"}
                                        onClick={() =>
                                            setOpenSection(
                                                openSection === "overview"
                                                    ? ""
                                                    : "overview"
                                            )
                                        }
                                    >
                                        <p className="text-sm leading-7 text-gray-500">
                                            {product.description}
                                        </p>
                                    </Accordion>

                                    <Accordion
                                        title="Product details"
                                        open={openSection === "details"}
                                        onClick={() =>
                                            setOpenSection(
                                                openSection === "details"
                                                    ? ""
                                                    : "details"
                                            )
                                        }
                                    >
                                        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                                            <Detail
                                                label="Product"
                                                value={product.name}
                                            />

                                            <Detail
                                                label="Generic name"
                                                value={product.genericName}
                                            />

                                            <Detail
                                                label="Strength"
                                                value={product.strength}
                                            />

                                            <Detail
                                                label="Dosage form"
                                                value={product.dosageForm}
                                            />

                                            <Detail
                                                label="Package"
                                                value={product.packageSize}
                                            />

                                            <Detail
                                                label="Manufacturer"
                                                value={product.manufacturer}
                                            />
                                        </div>
                                    </Accordion>

                                    <Accordion
                                        title="Active ingredients"
                                        open={openSection === "ingredients"}
                                        onClick={() =>
                                            setOpenSection(
                                                openSection === "ingredients"
                                                    ? ""
                                                    : "ingredients"
                                            )
                                        }
                                    >
                                        <div className="flex flex-wrap gap-2">
                                            {product.activeIngredients.length > 0 ? (
                                                product.activeIngredients.map(
                                                    (ingredient) => (
                                                        <span
                                                            key={ingredient}
                                                            className="rounded-full bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600"
                                                        >
                                                            {ingredient}
                                                        </span>
                                                    )
                                                )
                                            ) : (
                                                <p className="text-sm text-gray-400">
                                                    No ingredient information available.
                                                </p>
                                            )}
                                        </div>
                                    </Accordion>

                                    <Accordion
                                        title="Usage & warnings"
                                        open={openSection === "warnings"}
                                        onClick={() =>
                                            setOpenSection(
                                                openSection === "warnings"
                                                    ? ""
                                                    : "warnings"
                                            )
                                        }
                                    >
                                        <p className="text-sm leading-7 text-gray-500">
                                            Follow the information provided on the
                                            verified product packaging or by an appropriate
                                            healthcare professional. Do not rely on this
                                            product page as a substitute for professional
                                            medical advice.
                                        </p>
                                    </Accordion>
                                </div>
                            </div>

                            {/* Quick summary */}
                            <aside>
                                <div className="sticky top-24 rounded-2xl bg-gray-50 p-6">
                                    <h3 className="text-sm font-bold text-secondary">
                                        Product summary
                                    </h3>

                                    <div className="mt-5 space-y-4">
                                        <Summary
                                            label="Category"
                                            value={product.category}
                                        />

                                        <Summary
                                            label="Form"
                                            value={product.dosageForm}
                                        />

                                        <Summary
                                            label="Package"
                                            value={product.packageSize}
                                        />

                                        <Summary
                                            label="Manufacturer"
                                            value={product.manufacturer}
                                        />

                                        <Summary
                                            label="Prescription"
                                            value={
                                                product.prescriptionRequired
                                                    ? "Required"
                                                    : "Not required"
                                            }
                                        />
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </section>

                    {/* =================================================
              RELATED PRODUCTS
          ================================================= */}
                    {relatedProducts.length > 0 && (
                        <section className="mt-16 border-t border-gray-100 pt-12">
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                                        You may also like
                                    </p>

                                    <h2 className="mt-2 text-2xl font-bold text-secondary">
                                        Related products
                                    </h2>
                                </div>

                                <Link
                                    href={`/pharmacy?category=${product.categorySlug}`}
                                    className="hidden items-center gap-2 text-sm font-semibold text-primary sm:flex"
                                >
                                    View category
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>

                            <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                                {relatedProducts.map((relatedProduct) => (
                                    <ProductCard
                                        key={relatedProduct.id}
                                        product={relatedProduct}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </main>

            {/* Mobile sticky cart */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white/95 p-3 backdrop-blur-xl lg:hidden">
                <div className="container flex items-center gap-3">
                    <div>
                        <p className="text-[10px] text-gray-400">
                            Total
                        </p>

                        <p className="text-lg font-bold text-secondary">
                            {selectedOffer.price * quantity} EGP
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={!selectedOffer.available}
                        onClick={() => setAdded(true)}
                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-400"
                    >
                        <ShoppingBag className="h-4 w-4" />
                        {added ? "Added to cart" : "Add to cart"}
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function StoreIcon() {
    return (
        <div className="h-4 w-4 rounded-md border-2 border-gray-300" />
    )
}

function Accordion({
    title,
    open,
    onClick,
    children,
}: {
    title: string
    open: boolean
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <div>
            <button
                type="button"
                onClick={onClick}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
                <span className="text-sm font-semibold text-secondary">
                    {title}
                </span>

                {open ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
            </button>

            {open && (
                <div className="px-5 pb-5">
                    {children}
                </div>
            )}
        </div>
    )
}

function Detail({
    label,
    value,
}: {
    label: string
    value: string
}) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">
                {label}
            </p>

            <p className="mt-1 text-xs font-semibold text-secondary">
                {value}
            </p>
        </div>
    )
}

function Summary({
    label,
    value,
}: {
    label: string
    value: string
}) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-3 last:border-0 last:pb-0">
            <span className="text-xs text-gray-400">
                {label}
            </span>

            <span className="text-right text-xs font-semibold text-secondary">
                {value}
            </span>
        </div>
    )
}