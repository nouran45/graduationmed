
"use client"

import {
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"

import { useSearchParams } from "next/navigation"
import Link from "next/link"

import {
    ArrowLeft,
    ArrowUpDown,
    Loader2,
    Search,
    SlidersHorizontal,
    X,
    PackageSearch,
    Sparkles,
} from "lucide-react"

import { fetchProducts } from "@/lib/pharmacy/api"
import type { ApiProduct } from "@/lib/pharmacy/types"

import {
    ProductCard,
} from "@/components/pharmacy/search-product-card"

import type {
    PharmacyApiProduct,
} from "@/components/pharmacy/search-product-card"

import { SearchBox } from "@/components/pharmacy/search-box"

const PAGE_SIZE = 24

type AvailabilityFilter =
    | "all"
    | "in_stock"
    | "out_of_stock"

type SortOption =
    | "relevance"
    | "price_low"
    | "price_high"

/* -------------------------------------------------------
   API DATA NORMALIZATION

   Converts the existing PharmaSync API product shape
   into the shape expected by ProductCard.

   This does not modify the API or its source data.
------------------------------------------------------- */

function toNumber(
    value: number | string | null | undefined
): number | null {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null
    }

    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
}

function toProductCardProduct(
    product: ApiProduct
): PharmacyApiProduct {
    const categoryName =
        typeof product.category === "string"
            ? product.category
            : product.category?.name ||
              product.category?.name_ar ||
              "Uncategorized"

    const availability = [
        "in_stock",
        "out_of_stock",
        "unknown",
        "stale",
    ].includes(product.availability ?? "")
        ? (product.availability as PharmacyApiProduct["availability"])
        : "unknown"

    return {
        id: String(product.id),

        pharmacy_id: String(
            product.pharmacy_id ?? ""
        ),

        pharmacy_name:
            product.pharmacy_name ??
            product.pharmacy_name_ar ??
            null,

        name:
            product.name ||
            product.name_ar ||
            "Unnamed product",

        name_ar: product.name_ar ?? null,

        description:
            product.description ?? null,

        barcode:
            product.barcode ?? null,

        price: toNumber(product.price),

        old_price: toNumber(product.old_price),

        discount_percent: toNumber(
            product.discount_percent
        ),

        category: categoryName,

        availability,

        last_synced_at:
            product.last_synced_at ?? null,

        quantity_packs: toNumber(
            product.quantity_packs
        ),

        available_packs: toNumber(
            product.available_packs
        ),

        parts:
            product.parts === null ||
            product.parts === undefined
                ? null
                : String(product.parts),

        is_medicine:
            product.is_medicine ?? false,

        is_fridge:
            product.is_fridge ?? false,

        image_url: null,
        image: null,
        thumbnail: null,
    }
}

/* -------------------------------------------------------
   SEARCH RESULTS
------------------------------------------------------- */

function SearchResultsContent() {
    const searchParams = useSearchParams()

    const query =
        searchParams.get("q")?.trim() ?? ""

    const pharmacyId =
        searchParams.get("pharmacy_id") ?? undefined

    const [products, setProducts] =
        useState<ApiProduct[]>([])

    const [total, setTotal] = useState(0)

    const [loading, setLoading] = useState(true)

    const [loadingMore, setLoadingMore] =
        useState(false)

    const [error, setError] = useState("")

    const [availabilityFilter, setAvailabilityFilter] =
        useState<AvailabilityFilter>("all")

    const [discountedOnly, setDiscountedOnly] =
        useState(false)

    const [sort, setSort] =
        useState<SortOption>("relevance")

    const [nextOffset, setNextOffset] =
        useState(PAGE_SIZE)

    const [hasMore, setHasMore] =
        useState(false)

    const requestRef =
        useRef<AbortController | null>(null)

    const moreRequestRef =
        useRef<AbortController | null>(null)

    /* ---------------------------------------------------
       LOAD FIRST PAGE
    --------------------------------------------------- */

    const loadProducts = useCallback(async () => {
        requestRef.current?.abort()
        moreRequestRef.current?.abort()

        const controller = new AbortController()

        requestRef.current = controller

        if (!query) {
            setProducts([])
            setTotal(0)
            setHasMore(false)
            setNextOffset(0)
            setError("")
            setLoading(false)
            return
        }

        setLoading(true)
        setError("")
        setProducts([])
        setTotal(0)
        setNextOffset(0)
        setHasMore(false)

        try {
            const response = await fetchProducts(
                {
                    q: query,
                    pharmacy_id: pharmacyId,
                    limit: PAGE_SIZE,
                    offset: 0,
                },
                controller.signal
            )

            if (controller.signal.aborted) return

            const items = response.items ?? []

            setProducts(items)

            setTotal(
                response.total ?? items.length
            )

            setNextOffset(items.length)

            setHasMore(
                response.done !== undefined
                    ? !response.done
                    : items.length === PAGE_SIZE
            )
        } catch (err) {
            if (controller.signal.aborted) return

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load search results. Please try again."
            )
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false)
            }
        }
    }, [query, pharmacyId])

    useEffect(() => {
        loadProducts()

        return () => {
            requestRef.current?.abort()
            moreRequestRef.current?.abort()
        }
    }, [loadProducts])

    /* ---------------------------------------------------
       LOAD MORE PRODUCTS
    --------------------------------------------------- */

    const loadMore = async () => {
        if (
            loadingMore ||
            !hasMore ||
            !query
        ) {
            return
        }

        moreRequestRef.current?.abort()

        const controller = new AbortController()

        moreRequestRef.current = controller

        setLoadingMore(true)
        setError("")

        try {
            const response = await fetchProducts(
                {
                    q: query,
                    pharmacy_id: pharmacyId,
                    limit: PAGE_SIZE,
                    offset: nextOffset,
                },
                controller.signal
            )

            if (controller.signal.aborted) return

            const items = response.items ?? []

            setProducts((previous) => {
                const seen = new Set(
                    previous.map((product) =>
                        `${ product.pharmacy_id ?? "" } -${ product.id } `
                    )
                )

                const fresh = items.filter(
                    (product) =>
                        !seen.has(
                            `${ product.pharmacy_id ?? "" } -${ product.id } `
                        )
                )

                return [...previous, ...fresh]
            })

            setNextOffset(
                (previous) => previous + items.length
            )

            setHasMore(
                response.done !== undefined
                    ? !response.done
                    : items.length === PAGE_SIZE
            )

            if (response.total !== undefined) {
                setTotal(response.total)
            }
        } catch (err) {
            if (controller.signal.aborted) return

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load more products."
            )
        } finally {
            if (!controller.signal.aborted) {
                setLoadingMore(false)
            }
        }
    }

    /* ---------------------------------------------------
       FILTERING AND SORTING
    --------------------------------------------------- */

    const visibleProducts = useMemo(() => {
        let result = [...products]

        if (availabilityFilter !== "all") {
            result = result.filter(
                (product) =>
                    product.availability === availabilityFilter
            )
        }

        if (discountedOnly) {
            result = result.filter(
                (product) => {
                    const discount = toNumber(
                        product.discount_percent
                    )

                    return (
                        discount !== null &&
                        discount > 0
                    )
                }
            )
        }

        if (sort === "price_low") {
            result.sort((a, b) => {
                const priceA =
                    toNumber(a.price) ??
                    Number.MAX_SAFE_INTEGER

                const priceB =
                    toNumber(b.price) ??
                    Number.MAX_SAFE_INTEGER

                return priceA - priceB
            })
        }

        if (sort === "price_high") {
            result.sort((a, b) => {
                const priceA =
                    toNumber(a.price) ?? 0

                const priceB =
                    toNumber(b.price) ?? 0

                return priceB - priceA
            })
        }

        return result
    }, [
        products,
        availabilityFilter,
        discountedOnly,
        sort,
    ])

    /* ---------------------------------------------------
       NORMALIZE PRODUCTS FOR PRODUCT CARD

       Keep the original API products in state.
       Only adapt them at the rendering boundary.
    --------------------------------------------------- */

    const cardProducts = useMemo(() => {
        return visibleProducts.map(
            (product) => ({
                key: `${ product.pharmacy_id ?? "" } -${ product.id } `,
                product: toProductCardProduct(product),
            })
        )
    }, [visibleProducts])

    /* ---------------------------------------------------
       FILTER CONTROLS
    --------------------------------------------------- */

    const clearFilters = () => {
        setAvailabilityFilter("all")
        setDiscountedOnly(false)
        setSort("relevance")
    }

    const filtersActive =
        availabilityFilter !== "all" ||
        discountedOnly

    /* ---------------------------------------------------
       PAGE UI
    --------------------------------------------------- */

    return (
        <main className="min-h-screen bg-[#f8fafc] pb-16">

            {/* Search page header */}

            <section className="border-b border-gray-100 bg-white">
                <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">

                    <Link
                        href="/pharmacy"
                        className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-primary"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to pharmacy
                    </Link>

                    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.3fr] lg:items-center">

                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                <Sparkles className="h-3.5 w-3.5" />
                                MEDICHECK PHARMACY
                            </div>

                            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-secondary sm:text-4xl">
                                Find your products
                            </h1>

                            <p className="mt-3 max-w-lg text-sm leading-7 text-gray-500">
                                Discover medicines, healthcare products,
                                personal care essentials, and more
                                across connected pharmacies.
                            </p>
                        </div>

                        <SearchBox
                            key={`${ query } -${ pharmacyId ?? "" } `}
                            initialValue={query}
                            pharmacyId={pharmacyId}
                            large
                            placeholder="Search by product name, brand or barcode..."
                        />

                    </div>
                </div>
            </section>

            {/* Main content */}

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

                {/* Results heading */}

                <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end">

                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Pharmacy search
                        </p>

                        <h2 className="mt-2 break-words text-2xl font-extrabold text-secondary sm:text-3xl">
                            {query ? (
                                <>
                                    Results for{" "}
                                    <span className="text-primary">
                                        &quot;{query}&quot;
                                    </span>
                                </>
                            ) : (
                                "Browse products"
                            )}
                        </h2>

                        {!loading && query && !error && (
                            <p className="mt-2 text-sm text-gray-500">
                                {total.toLocaleString("en-EG")} matching products
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                        <SlidersHorizontal className="h-4 w-4" />
                        Refine your search
                    </div>
                </div>

                {/* Filters and sorting */}

                <section className="my-6 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex flex-wrap items-center gap-2">

                        <span className="mr-1 text-xs font-bold text-gray-400">
                            Availability
                        </span>

                        {([
                            ["all", "All products"],
                            ["in_stock", "In stock"],
                            ["out_of_stock", "Out of stock"],
                        ] as const).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() =>
                                    setAvailabilityFilter(value)
                                }
                                className={`
rounded - full px - 4 py - 2
text - xs font - bold transition
                                    ${
    availabilityFilter === value
        ? "bg-secondary text-white shadow-sm"
        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
}
`}
                            >
                                {label}
                            </button>
                        ))}

                        <button
                            type="button"
                            onClick={() =>
                                setDiscountedOnly((value) => !value)
                            }
                            className={`
rounded - full px - 4 py - 2
text - xs font - bold transition
                                ${
    discountedOnly
        ? "bg-primary text-white shadow-sm"
        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
}
`}
                        >
                            Discounted
                        </button>

                        {filtersActive && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="rounded-full px-3 py-2 text-xs font-bold text-gray-400 transition hover:text-red-500"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>

                    <label className="flex shrink-0 items-center gap-2 text-xs font-bold text-gray-500">
                        <ArrowUpDown className="h-4 w-4" />

                        Sort by

                        <select
                            value={sort}
                            onChange={(event) =>
                                setSort(
                                    event.target.value as SortOption
                                )
                            }
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-secondary outline-none transition focus:border-primary"
                        >
                            <option value="relevance">
                                Relevance
                            </option>

                            <option value="price_low">
                                Price: Low to High
                            </option>

                            <option value="price_high">
                                Price: High to Low
                            </option>
                        </select>
                    </label>
                </section>

                {/* Empty query */}

                {!query && !loading && (
                    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-5 text-center shadow-sm">

                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
                            <PackageSearch className="h-8 w-8 text-emerald-600" />
                        </div>

                        <h3 className="mt-5 text-xl font-bold text-secondary">
                            What are you looking for?
                        </h3>

                        <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                            Enter a medicine name, brand, or barcode
                            above to discover matching pharmacy products.
                        </p>
                    </div>
                )}

                {/* Loading */}

                {loading && (
                    <div className="flex min-h-[320px] flex-col items-center justify-center">
                        <Loader2 className="h-9 w-9 animate-spin text-primary" />

                        <p className="mt-4 text-sm font-semibold text-gray-500">
                            Finding the right products...
                        </p>
                    </div>
                )}

                {/* Error */}

                {!loading && error && (
                    <div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">

                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                            <X className="h-6 w-6 text-red-500" />
                        </div>

                        <h3 className="mt-4 font-bold text-red-600">
                            Unable to load products
                        </h3>

                        <p className="mt-2 break-words text-sm text-gray-500">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={loadProducts}
                            className="mt-5 rounded-xl bg-secondary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* No results */}

                {!loading &&
                    !error &&
                    query &&
                    visibleProducts.length === 0 && (
                        <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-5 text-center shadow-sm">

                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
                                <Search className="h-7 w-7 text-gray-300" />
                            </div>

                            <h3 className="mt-5 text-xl font-bold text-secondary">
                                No products found
                            </h3>

                            <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                                {products.length > 0
                                    ? "No products match your selected filters. Try changing or clearing your filters."
                                    : "We couldn't find matching products. Check the spelling or try another product name or barcode."}
                            </p>

                            {filtersActive && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                                >
                                    <X className="h-4 w-4" />
                                    Clear filters
                                </button>
                            )}
                        </div>
                    )}

                {/* Product grid */}

                {!loading &&
                    !error &&
                    cardProducts.length > 0 && (
                        <>
                            <div className="mb-5 flex items-center justify-between">
                                <p className="text-sm text-gray-500">
                                    Showing{" "}
                                    <span className="font-bold text-secondary">
                                        {cardProducts.length}
                                    </span>{" "}
                                    loaded products
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
                                {cardProducts.map(
                                    ({ key, product }) => (
                                        <ProductCard
                                            key={key}
                                            product={product}
                                        />
                                    )
                                )}
                            </div>

                            {/* Pagination */}

                            {hasMore && (
                                <div className="mt-10 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={loadMore}
                                        disabled={loadingMore}
                                        className="
                                            inline-flex min-w-52
                                            items-center justify-center gap-2
                                            rounded-xl border border-gray-200
                                            bg-white px-7 py-3
                                            text-sm font-bold text-secondary
                                            shadow-sm transition
                                            hover:border-primary
                                            hover:text-primary
                                            disabled:cursor-not-allowed
                                            disabled:opacity-60
                                        "
                                    >
                                        {loadingMore ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Loading products...
                                            </>
                                        ) : (
                                            <>
                                                Load more products
                                                <ArrowUpDown className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
            </div>
        </main>
    )
}

/* -------------------------------------------------------
   PAGE EXPORT

   Suspense is retained because useSearchParams()
   is used inside SearchResultsContent.
------------------------------------------------------- */

export default function PharmacySearchPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }
        >
            <SearchResultsContent />
        </Suspense>
    )
}
