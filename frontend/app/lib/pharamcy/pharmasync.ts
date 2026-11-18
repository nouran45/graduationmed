import "server-only"

const API_BASE_URL = process.env.PHARMASYNC_API_BASE_URL?.replace(/\/+$/, "")
const API_TOKEN = process.env.MEDICHECK_API_TOKEN

export type ProductAvailability =
    | "in_stock"
    | "out_of_stock"
    | "unknown"
    | "stale"

export interface PharmaSyncProduct {
    id: number | string
    pharmacy_id: string
    pharmacy_name?: string | null
    pharmacy_name_ar?: string | null
    source_item_id?: number | string | null

    name: string
    name_ar?: string | null
    description?: string | null
    barcode?: string | null

    price?: number | null
    old_price?: number | null
    discount_percent?: number | null

    parts?: number | string | null
    is_medicine?: boolean | null
    is_fridge?: boolean | null

    category?: {
        id?: number | string
        name?: string | null
        name_ar?: string | null
    } | null

    availability: ProductAvailability
    last_synced_at?: string | null
    quantity_packs?: number | null
    available_packs?: number | null
}

export interface PharmaSyncProductsResponse {
    pharmacy_id?: string | null
    total: number
    limit: number
    offset: number
    items: PharmaSyncProduct[]
}
export interface ProductQuery {
    pharmacy_id?: string
    q?: string
    category_id?: number
    category_key?: string
    limit?: number
    offset?: number
    discounted_only?: boolean
    availability?: ProductAvailability
}

export interface CategoryQuery {
    pharmacy_id?: string
    q?: string
    limit?: number
    offset?: number
}

function buildQuery(values: object): string {
    const params = new URLSearchParams()

    for (const [key, value] of Object.entries(values)) {
        if (value !== undefined && value !== "") {
            params.set(key, String(value))
        }
    }

    const query = params.toString()
    return query ? `?${query}` : ""
}

async function pharmaSyncRequest<T>(
    endpoint: string,
    signal?: AbortSignal
): Promise<T> {
    if (!API_BASE_URL) {
        throw new Error("PHARMASYNC_API_BASE_URL is not configured.")
    }

    if (!API_TOKEN) {
        throw new Error("MEDICHECK_API_TOKEN is not configured.")
    }

    const controller = new AbortController()
    let timedOut = false

    const timeout = setTimeout(() => {
        timedOut = true
        controller.abort()
    }, 60000)

    const abortFromCaller = () => controller.abort()

    if (signal?.aborted) {
        controller.abort()
    } else {
        signal?.addEventListener("abort", abortFromCaller, { once: true })
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "X-MediCheck-Token": API_TOKEN,
            },
            cache: "no-store",
            signal: controller.signal,
        })

        const responseText = await response.text()

        let body: unknown = null

        if (responseText) {
            try {
                body = JSON.parse(responseText)
            } catch {
                body = responseText
            }
        }

        if (!response.ok) {
            let detail = ""

            if (body && typeof body === "object" && "detail" in body) {
                const value = (body as { detail: unknown }).detail
                detail = typeof value === "string"
                    ? value
                    : JSON.stringify(value)
            }

            throw new Error(
                detail ||
                `MediCheck API request failed with HTTP ${response.status}.`
            )
        }

        return body as T
    } catch (error) {
        if (timedOut) {
            throw new Error("MediCheck API request timed out.")
        }

        if (error instanceof Error && error.name === "AbortError") {
            throw new Error("MediCheck API request was cancelled.")
        }

        throw error
    } finally {
        clearTimeout(timeout)
        signal?.removeEventListener("abort", abortFromCaller)
    }
}

/* ------------------------------------------------------------------
   Server-side cache (stale-while-revalidate)

   - Fresh entries are returned instantly.
   - Entries past their fresh window but within STALE_MS are returned
     instantly while a background refresh runs.
   - Identical concurrent requests share a single upstream call.
   - Stored on globalThis so it survives Next.js dev hot reloads.
------------------------------------------------------------------ */
type CacheEntry = { data: unknown; fresh: number; stale: number }

const g = globalThis as unknown as {
    __psCache?: Map<string, CacheEntry>
    __psPending?: Map<string, Promise<unknown>>
}
const store = (g.__psCache ??= new Map<string, CacheEntry>())
const pending = (g.__psPending ??= new Map<string, Promise<unknown>>())

const STALE_MS = 60 * 60_000 // serve old data for up to 1 hour if refresh fails
const MAX_ENTRIES = 500

async function cachedRequest<T>(
    endpoint: string,
    _signal?: AbortSignal
): Promise<T> {
    const ttl = endpoint.startsWith("/api/v1/categories")
        ? 10 * 60_000
        : 2 * 60_000
    const hit = store.get(endpoint)
    const now = Date.now()

    const refresh = () => {
        let p = pending.get(endpoint)

        if (!p) {
            // Shared request: deliberately not tied to one caller's abort signal.
            p = pharmaSyncRequest<T>(endpoint)
                .then((data) => {
                    if (store.size >= MAX_ENTRIES) {
                        store.delete(store.keys().next().value as string)
                    }
                    store.set(endpoint, {
                        data,
                        fresh: Date.now() + ttl,
                        stale: Date.now() + STALE_MS,
                    })
                    return data
                })
                .finally(() => pending.delete(endpoint))

            pending.set(endpoint, p)
        }

        return p as Promise<T>
    }

    if (hit && hit.fresh > now) return hit.data as T

    if (hit && hit.stale > now) {
        refresh().catch(() => { }) // refresh in the background, answer instantly
        return hit.data as T
    }

    return refresh()
}

export async function getPharmaSyncCategories(
    query: CategoryQuery = {},
    signal?: AbortSignal
): Promise<unknown> {
    const search = buildQuery(query)

    return cachedRequest<unknown>(
        `/api/v1/categories${search}`,
        signal
    )
}

export async function getPharmaSyncProducts(
    query: ProductQuery = {},
    signal?: AbortSignal
): Promise<PharmaSyncProductsResponse> {
    const search = buildQuery(query)

    return cachedRequest<PharmaSyncProductsResponse>(
        `/api/v1/products${search}`,
        signal
    )
}

export async function getPharmaSyncProduct(
    productId: number | string,
    pharmacyId?: string,
    signal?: AbortSignal
): Promise<unknown> {
    if (!String(productId).trim()) {
        throw new Error("A product ID is required.")
    }

    const search = buildQuery({
        pharmacy_id: pharmacyId,
    })

    return cachedRequest<unknown>(
        `/api/v1/products/${encodeURIComponent(String(productId))}${search}`,
        signal
    )
}

export async function getPharmaSyncDiscounts(
    query: Omit<ProductQuery, "discounted_only" | "availability"> = {},
    signal?: AbortSignal
): Promise<PharmaSyncProductsResponse> {
    const search = buildQuery(query)

    return cachedRequest<PharmaSyncProductsResponse>(
        `/api/v1/discounts${search}`,
        signal
    )
}