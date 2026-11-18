"use client"

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
} from "react"

import { createPortal } from "react-dom"

import {
    Search,
    X,
    ArrowRight,
    Package,
    Loader2,
    Sparkles,
} from "lucide-react"

type Props = {
    pharmacyId?: string
    initialValue?: string
    placeholder?: string
    className?: string
    large?: boolean
}

type Product = {
    id: string
    name: string
    brand?: string
    image?: string
    price?: number
}

type DropdownPosition = {
    top: number
    left: number
    width: number
}

function getString(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) {
            return value.trim()
        }
    }

    return ""
}

function normalizeProducts(payload: unknown): Product[] {
    let items: unknown[] = []

    if (Array.isArray(payload)) {
        items = payload
    } else if (payload && typeof payload === "object") {
        const response = payload as Record<string, unknown>

        const candidates = [
            response.items,
            response.products,
            response.results,
            response.data,
        ]

        for (const candidate of candidates) {
            if (Array.isArray(candidate)) {
                items = candidate
                break
            }

            if (candidate && typeof candidate === "object") {
                const nested = candidate as Record<string, unknown>

                const nestedItems =
                    nested.items ??
                    nested.products ??
                    nested.results

                if (Array.isArray(nestedItems)) {
                    items = nestedItems
                    break
                }
            }
        }
    }

    return items
        .map((item, index) => {
            if (!item || typeof item !== "object") return null

            const product = item as Record<string, unknown>

            const name = getString(
                product.name,
                product.product_name,
                product.title,
                product.name_en
            )

            if (!name) return null

            const rawPrice =
                product.discounted_price ??
                product.sale_price ??
                product.price

            const price =
                typeof rawPrice === "number"
                    ? rawPrice
                    : Number(rawPrice)

            return {
                id:
                    getString(
                        product.id,
                        product.product_id,
                        product._id
                    ) || `${name}-${index}`,

                name,

                brand: getString(
                    product.brand,
                    product.brand_name
                ),

                image: getString(
                    product.image_url,
                    product.image,
                    product.thumbnail,
                    product.imageUrl
                ),

                price:
                    Number.isFinite(price) && price > 0
                        ? price
                        : undefined,
            }
        })
        .filter((item): item is Product => item !== null)
        .slice(0, 5)
}

export function SearchBox({
    pharmacyId,
    initialValue = "",
    placeholder = "Search medicines, brands and products...",
    className = "",
    large = false,
}: Props) {
    const wrapperRef = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const [value, setValue] = useState(initialValue)
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(false)
    const [focused, setFocused] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const [mounted, setMounted] = useState(false)

    const [dropdownPosition, setDropdownPosition] =
        useState<DropdownPosition>({
            top: 0,
            left: 0,
            width: 0,
        })

    const showDropdown =
        focused && value.trim().length >= 2

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        setValue(initialValue)
    }, [initialValue])

    // Calculate dropdown position relative to the search input.
    const updateDropdownPosition = useCallback(() => {
        const element = wrapperRef.current

        if (!element) return

        const rect = element.getBoundingClientRect()

        setDropdownPosition({
            top: rect.bottom + 8,
            left: rect.left,
            width: rect.width,
        })
    }, [])

    // Keep the dropdown aligned while scrolling or resizing.
    useEffect(() => {
        if (!showDropdown) return

        updateDropdownPosition()

        window.addEventListener("resize", updateDropdownPosition)
        window.addEventListener("scroll", updateDropdownPosition, true)

        return () => {
            window.removeEventListener("resize", updateDropdownPosition)
            window.removeEventListener("scroll", updateDropdownPosition, true)
        }
    }, [showDropdown, updateDropdownPosition])

    // Close dropdown when clicking outside both the search box and portal.
    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node

            const clickedInsideSearch =
                wrapperRef.current?.contains(target)

            const clickedInsideDropdown =
                dropdownRef.current?.contains(target)

            if (!clickedInsideSearch && !clickedInsideDropdown) {
                setFocused(false)
                setActiveIndex(-1)
            }
        }

        document.addEventListener("mousedown", handleOutsideClick)

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick)
        }
    }, [])

    // Fetch suggestions with debounce and cancellation.
    useEffect(() => {
        const query = value.trim()

        if (query.length < 2) {
            setProducts([])
            setLoading(false)
            return
        }

        const controller = new AbortController()

        const timer = window.setTimeout(async () => {
            try {
                setLoading(true)

                const params = new URLSearchParams({
                    q: query,
                    limit: "5",
                    offset: "0",
                })

                if (pharmacyId?.trim()) {
                    params.set("pharmacy_id", pharmacyId.trim())
                }

                const response = await fetch(
                    `/api/pharmacy/products?${params.toString()}`,
                    {
                        signal: controller.signal,
                        cache: "no-store",
                    }
                )

                if (!response.ok) {
                    throw new Error(
                        "Unable to load product suggestions."
                    )
                }

                const data = await response.json()

                if (!controller.signal.aborted) {
                    setProducts(normalizeProducts(data))
                    setActiveIndex(-1)
                }
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.name !== "AbortError"
                ) {
                    console.error(
                        "Search suggestions error:",
                        error
                    )

                    setProducts([])
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false)
                }
            }
        }, 350)

        return () => {
            window.clearTimeout(timer)
            controller.abort()
        }
    }, [value, pharmacyId])

    const navigateToSearch = useCallback(
        (query: string) => {
            const search = query.trim()

            if (!search) {
                inputRef.current?.focus()
                return
            }

            const params = new URLSearchParams()

            params.set("q", search)

            if (pharmacyId?.trim()) {
                params.set("pharmacy_id", pharmacyId.trim())
            }

            setFocused(false)
            setActiveIndex(-1)

            window.location.assign(
                `/pharmacy/search?${params.toString()}`
            )
        },
        [pharmacyId]
    )

    const selectProduct = (product: Product) => {
        setValue(product.name)
        navigateToSearch(product.name)
    }

    const handleKeyDown = (
        event: KeyboardEvent<HTMLInputElement>
    ) => {
        if (event.key === "Escape") {
            setFocused(false)
            setActiveIndex(-1)
            return
        }

        if (event.key === "ArrowDown" && products.length > 0) {
            event.preventDefault()

            setActiveIndex((current) =>
                current < products.length - 1
                    ? current + 1
                    : 0
            )

            return
        }

        if (event.key === "ArrowUp" && products.length > 0) {
            event.preventDefault()

            setActiveIndex((current) =>
                current > 0
                    ? current - 1
                    : products.length - 1
            )

            return
        }

        if (event.key === "Enter") {
            event.preventDefault()

            if (activeIndex >= 0 && products[activeIndex]) {
                selectProduct(products[activeIndex])
            } else {
                navigateToSearch(value)
            }
        }
    }

    const clearSearch = () => {
        setValue("")
        setProducts([])
        setActiveIndex(-1)
        inputRef.current?.focus()
    }

    const formatPrice = (price: number) =>
        new Intl.NumberFormat("en-EG", {
            style: "currency",
            currency: "EGP",
            maximumFractionDigits: 2,
        }).format(price)

    const dropdown = showDropdown ? (
        <div
            ref={dropdownRef}
            id="pharmacy-search-suggestions"
            role="listbox"
            style={{
                position: "fixed",
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                zIndex: 2147483000,
                visibility: dropdownPosition.width > 0
                    ? "visible"
                    : "hidden",
            }}
            className="
                max-h-[min(460px,65vh)] overflow-y-auto
                rounded-2xl border border-gray-200
                bg-white shadow-2xl
                animate-in fade-in slide-in-from-top-2
                duration-150
            "
        >
            {/* Dropdown heading */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" />

                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Product suggestions
                    </span>
                </div>

                {products.length > 0 && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        {products.length} suggestions
                    </span>
                )}
            </div>

            {/* Loading state */}
            {loading && products.length === 0 && (
                <div className="flex items-center gap-3 px-5 py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />

                    <div>
                        <p className="text-sm font-semibold text-gray-700">
                            Finding products
                        </p>

                        <p className="mt-0.5 text-xs text-gray-400">
                            Searching connected pharmacies...
                        </p>
                    </div>
                </div>
            )}

            {/* No results */}
            {!loading && products.length === 0 && (
                <div className="px-5 py-6">
                    <p className="text-sm font-semibold text-gray-700">
                        No matching suggestions
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                        You can still search for this product.
                    </p>

                    <button
                        type="button"
                        onClick={() => navigateToSearch(value)}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800"
                    >
                        Search for &quot;{value.trim()}&quot;
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Product suggestions */}
            {products.map((product, index) => (
                <button
                    key={product.id}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectProduct(product)}
                    className={`
                        flex w-full items-center gap-3
                        border-b border-gray-50
                        px-4 py-3 text-left
                        transition last:border-0
                        ${activeIndex === index
                            ? "bg-emerald-50"
                            : "hover:bg-gray-50"
                        }
                    `}
                >
                    {/* Product image */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                        {product.image ? (
                            <img
                                src={product.image}
                                alt={product.name}
                                loading="lazy"
                                className="h-full w-full object-contain"
                            />
                        ) : (
                            <Package className="h-5 w-5 text-gray-400" />
                        )}
                    </div>

                    {/* Product details */}
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-800">
                            {product.name}
                        </p>

                        {product.brand && (
                            <p className="mt-1 truncate text-xs text-gray-500">
                                {product.brand}
                            </p>
                        )}
                    </div>

                    {/* Price */}
                    {product.price !== undefined && (
                        <span className="shrink-0 text-sm font-bold text-emerald-700">
                            {formatPrice(product.price)}
                        </span>
                    )}

                    <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
                </button>
            ))}

            {/* View all */}
            {products.length > 0 && (
                <button
                    type="button"
                    onClick={() => navigateToSearch(value)}
                    className="
                        flex w-full items-center
                        justify-center gap-2
                        border-t border-gray-100
                        bg-gray-50 px-4 py-4
                        text-sm font-bold text-emerald-700
                        transition hover:bg-emerald-50
                    "
                >
                    View all search results
                    <ArrowRight className="h-4 w-4" />
                </button>
            )}
        </div>
    ) : null

    return (
        <div
            ref={wrapperRef}
            className={`relative w-full ${className}`}
        >
            {/* Search container */}
            <div
                className={`
                    relative flex w-full items-center gap-2
                    rounded-2xl border bg-white
                    transition-all duration-200
                    ${focused
                        ? "border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.09)]"
                        : "border-gray-200 shadow-sm hover:border-gray-300"
                    }
                    ${large ? "min-h-[76px] p-2.5" : "min-h-[62px] p-2"}
                `}
            >
                {/* Search icon */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Search className="h-5 w-5" />
                </div>

                {/* Input */}
                <div className="min-w-0 flex-1">
                    <input
                        ref={inputRef}
                        type="search"
                        value={value}
                        onChange={(event) => {
                            setValue(event.target.value)
                            setActiveIndex(-1)
                        }}
                        onFocus={() => setFocused(true)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        autoComplete="off"
                        aria-label="Search pharmacy products"
                        aria-expanded={showDropdown}
                        aria-controls="pharmacy-search-suggestions"
                        className={`
                            w-full bg-transparent outline-none
                            font-semibold text-gray-800
                            placeholder:font-normal
                            placeholder:text-gray-400
                            ${large ? "text-base" : "text-sm sm:text-base"}
                        `}
                    />

                    {large && (
                        <p className="mt-1 text-[11px] font-medium text-gray-400">
                            Medicines · Personal care · Healthcare essentials
                        </p>
                    )}
                </div>

                {/* Loading */}
                {loading && (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-600" />
                )}

                {/* Clear */}
                {value.length > 0 && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        aria-label="Clear search"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}

                {/* Search button */}
                <button
                    type="button"
                    onClick={() => navigateToSearch(value)}
                    disabled={!value.trim()}
                    className="
                        inline-flex h-11 shrink-0 items-center
                        justify-center gap-2 rounded-xl
                        bg-emerald-600 px-5
                        text-sm font-bold text-white
                        shadow-sm transition
                        hover:bg-emerald-700
                        active:scale-[0.98]
                        disabled:cursor-not-allowed
                        disabled:opacity-40
                    "
                >
                    <span className="hidden sm:inline">
                        Search
                    </span>

                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>

            {/* Portal dropdown: escapes parent overflow and stacking contexts */}
            {mounted && dropdown && createPortal(dropdown, document.body)}
        </div>
    )
}