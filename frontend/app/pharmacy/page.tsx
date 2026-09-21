"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
    ArrowRight,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Heart,
    Search,
    ShieldCheck,
    ShoppingBag,
    Store,
    Truck,
} from "lucide-react"

import ProductCard from "@/components/pharmacy/ProductCard"
import CategoryCard from "@/components/pharmacy/CategoryCard"

import {
    pharmacyCategories,
    pharmacyProducts,
    searchProducts,
} from "@/lib/pharmacy/mock-data"

export default function PharmacyPage() {
    const [search, setSearch] = useState("")

    const searchResults = useMemo(() => {
        if (!search.trim()) {
            return []
        }

        return searchProducts(search).slice(0, 5)
    }, [search])

    const hotDeals = pharmacyProducts
        .filter((product) => product.discount)
        .slice(0, 4)

    const popularProducts = pharmacyProducts.slice(0, 4)

    return (
        <div className="min-h-screen bg-white text-secondary">
            {/* =====================================================
          PHARMACY HEADER
      ===================================================== */}
            <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-xl">
                <div className="container">
                    <div className="flex h-[70px] items-center justify-between gap-6">
                        {/* Logo */}
                        <Link href="/" className="shrink-0">
                            <span className="text-xl font-bold tracking-tight text-secondary">
                                ShifAI
                            </span>
                        </Link>

                        {/* Navigation */}
                        <nav className="hidden items-center gap-7 lg:flex">
                            <Link
                                href="/"
                                className="text-sm font-medium text-gray-500 hover:text-secondary"
                            >
                                Home
                            </Link>

                            <Link
                                href="/pharmacy"
                                className="text-sm font-semibold text-primary"
                            >
                                Pharmacy
                            </Link>

                            <Link
                                href="/pharmacy?section=medicines"
                                className="text-sm font-medium text-gray-500 hover:text-secondary"
                            >
                                Medicines
                            </Link>

                            <Link
                                href="/pharmacy?section=deals"
                                className="text-sm font-medium text-gray-500 hover:text-secondary"
                            >
                                Deals
                            </Link>

                            <Link
                                href="/pharmacy?section=categories"
                                className="text-sm font-medium text-gray-500 hover:text-secondary"
                            >
                                Categories
                            </Link>
                        </nav>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <Link
                                href="/pharmacy/wishlist"
                                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-50 hover:text-primary"
                                aria-label="Wishlist"
                            >
                                <Heart className="h-5 w-5" />
                            </Link>

                            <Link
                                href="/pharmacy/cart"
                                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-50 hover:text-primary"
                                aria-label="Cart"
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
                {/* =====================================================
            HERO
        ===================================================== */}
                <section className="relative overflow-visible bg-secondary text-white">
                    <div className="pointer-events-none absolute right-[-150px] top-[-200px] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px]" />

                    <div className="container relative">
                        <div className="py-16 text-center sm:py-20 lg:py-24">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                MediCheck Pharmacy
                            </p>

                            <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                                Healthcare products,
                                <br />
                                <span className="text-primary">
                                    made easier to find.
                                </span>
                            </h1>

                            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-gray-300 sm:text-base">
                                Search medicines, wellness products, and healthcare
                                essentials from participating pharmacies in one place.
                            </p>

                            {/* Search */}
                            <div className="relative mx-auto mt-8 max-w-2xl text-left">
                                <div className="flex h-14 items-center rounded-2xl bg-white p-1.5 shadow-2xl">
                                    <Search className="ml-4 h-5 w-5 shrink-0 text-gray-400" />

                                    <input
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        placeholder="Search medicines, brands, ingredients..."
                                        className="h-full flex-1 bg-transparent px-4 text-sm text-secondary outline-none placeholder:text-gray-400"
                                    />

                                    <button
                                        type="button"
                                        className="hidden h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary/90 sm:block"
                                    >
                                        Search
                                    </button>
                                </div>

                                {/* Search dropdown */}
                                {search.trim() && (
                                    <div className="absolute left-0 right-0 top-[62px] z-40 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
                                        {searchResults.length > 0 ? (
                                            <>
                                                {searchResults.map((product) => (
                                                    <Link
                                                        key={product.id}
                                                        href={`/pharmacy/product/${product.id}`}
                                                        onClick={() => setSearch("")}
                                                        className="flex items-center gap-4 border-b border-gray-50 px-5 py-4 transition-colors hover:bg-gray-50"
                                                    >
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                                            <ShoppingBag className="h-4 w-4 text-primary" />
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-semibold text-secondary">
                                                                {product.name}
                                                            </p>

                                                            <p className="mt-0.5 text-xs text-gray-400">
                                                                {product.strength} · {product.dosageForm} ·{" "}
                                                                {product.category}
                                                            </p>
                                                        </div>

                                                        <ChevronRight className="h-4 w-4 text-gray-300" />
                                                    </Link>
                                                ))}

                                                <Link
                                                    href={`/pharmacy?search=${encodeURIComponent(
                                                        search
                                                    )}`}
                                                    onClick={() => setSearch("")}
                                                    className="flex items-center justify-between px-5 py-4 text-xs font-semibold text-primary hover:bg-primary/[0.03]"
                                                >
                                                    View all results
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                </Link>
                                            </>
                                        ) : (
                                            <div className="px-5 py-8 text-center">
                                                <Search className="mx-auto h-6 w-6 text-gray-300" />

                                                <p className="mt-3 text-sm font-semibold text-secondary">
                                                    No products found
                                                </p>

                                                <p className="mt-1 text-xs text-gray-400">
                                                    Try another medicine, brand, or ingredient.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Popular searches */}
                            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
                                <span className="text-gray-500">
                                    Popular:
                                </span>

                                {["Panadol", "Vitamin C", "Skincare", "First Aid"].map(
                                    (item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => setSearch(item)}
                                            className="rounded-full border border-white/10 px-3 py-1.5 text-gray-300 transition-colors hover:border-primary/30 hover:text-primary"
                                        >
                                            {item}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* =====================================================
            CATEGORIES
        ===================================================== */}
                <section className="py-16 sm:py-20">
                    <div className="container">
                        <div className="flex items-end justify-between gap-6">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                                    Explore
                                </p>

                                <h2 className="mt-2 text-2xl font-bold tracking-tight text-secondary sm:text-3xl">
                                    Shop by category
                                </h2>

                                <p className="mt-2 max-w-lg text-sm text-gray-500">
                                    Find what you need across medicines, wellness,
                                    personal care, and healthcare essentials.
                                </p>
                            </div>

                            <Link
                                href="/pharmacy?section=categories"
                                className="hidden items-center gap-2 text-sm font-semibold text-primary sm:flex"
                            >
                                View all
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {pharmacyCategories.slice(0, 8).map((category) => (
                                <CategoryCard
                                    key={category.slug}
                                    {...category}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* =====================================================
            HOT DEALS
        ===================================================== */}
                <section className="bg-gray-50 py-16 sm:py-20">
                    <div className="container">
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                                    Limited offers
                                </p>

                                <h2 className="mt-2 text-2xl font-bold tracking-tight text-secondary sm:text-3xl">
                                    Hot deals
                                </h2>

                                <p className="mt-2 text-sm text-gray-500">
                                    Discover selected offers from participating pharmacies.
                                </p>
                            </div>

                            <Link
                                href="/pharmacy?section=deals"
                                className="hidden items-center gap-2 text-sm font-semibold text-primary sm:flex"
                            >
                                See all deals
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                            {hotDeals.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* =====================================================
            POPULAR PRODUCTS
        ===================================================== */}
                <section className="py-16 sm:py-20">
                    <div className="container">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                                Popular now
                            </p>

                            <h2 className="mt-2 text-2xl font-bold tracking-tight text-secondary sm:text-3xl">
                                Popular healthcare products
                            </h2>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                            {popularProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* =====================================================
            PHARMACIES
        ===================================================== */}
                <section className="border-y border-gray-100 bg-gray-50 py-16 sm:py-20">
                    <div className="container">
                        <div className="max-w-xl">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                                Our network
                            </p>

                            <h2 className="mt-2 text-2xl font-bold tracking-tight text-secondary sm:text-3xl">
                                Participating pharmacies
                            </h2>

                            <p className="mt-3 text-sm leading-6 text-gray-500">
                                Explore products made available through pharmacies
                                participating in the MediCheck platform.
                            </p>
                        </div>

                        <div className="mt-8 grid gap-4 md:grid-cols-3">
                            {[
                                "CarePlus Pharmacy",
                                "HealthLine Pharmacy",
                                "MediCare Pharmacy",
                            ].map((pharmacy) => (
                                <div
                                    key={pharmacy}
                                    className="rounded-2xl border border-gray-100 bg-white p-5"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                                            <Store className="h-5 w-5 text-primary" />
                                        </div>

                                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-600">
                                            Connected
                                        </span>
                                    </div>

                                    <h3 className="mt-5 text-sm font-bold text-secondary">
                                        {pharmacy}
                                    </h3>

                                    <p className="mt-1 text-xs text-gray-400">
                                        Alexandria
                                    </p>

                                    <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                                        <span className="text-xs text-gray-500">
                                            Participating pharmacy
                                        </span>

                                        <ArrowRight className="h-4 w-4 text-gray-300" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* =====================================================
            WHY MEDICHECK
        ===================================================== */}
                <section className="py-16 sm:py-20">
                    <div className="container">
                        <div className="mx-auto max-w-2xl text-center">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                                Why MediCheck
                            </p>

                            <h2 className="mt-3 text-2xl font-bold tracking-tight text-secondary sm:text-3xl">
                                A simpler way to find healthcare products
                            </h2>
                        </div>

                        <div className="mt-10 grid gap-4 md:grid-cols-4">
                            {[
                                {
                                    icon: Search,
                                    title: "Easy search",
                                    text: "Find products using names, brands, categories, or ingredients.",
                                },
                                {
                                    icon: Store,
                                    title: "Multiple pharmacies",
                                    text: "Explore offers from participating pharmacies in one place.",
                                },
                                {
                                    icon: CheckCircle2,
                                    title: "Availability",
                                    text: "See product availability before adding an item to your cart.",
                                },
                                {
                                    icon: ShieldCheck,
                                    title: "Connected care",
                                    text: "A pharmacy experience connected to your wider healthcare journey.",
                                },
                            ].map((item) => {
                                const Icon = item.icon

                                return (
                                    <div
                                        key={item.title}
                                        className="rounded-2xl border border-gray-100 p-6"
                                    >
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                                            <Icon className="h-5 w-5 text-primary" />
                                        </div>

                                        <h3 className="mt-5 text-sm font-bold text-secondary">
                                            {item.title}
                                        </h3>

                                        <p className="mt-2 text-xs leading-5 text-gray-500">
                                            {item.text}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>

                {/* =====================================================
            CTA
        ===================================================== */}
                <section className="pb-16 sm:pb-20">
                    <div className="container">
                        <div className="overflow-hidden rounded-3xl bg-secondary px-6 py-12 text-center sm:px-12">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                                MediCheck Pharmacy
                            </p>

                            <h2 className="mx-auto mt-3 max-w-xl text-3xl font-bold tracking-tight text-white">
                                Find what you need, without the extra searching.
                            </h2>

                            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-gray-400">
                                Search medicines and healthcare products from
                                participating pharmacies.
                            </p>

                            <Link
                                href="#"
                                className="mt-7 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-white hover:bg-primary/90"
                            >
                                Start shopping
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}