import type {
    ApiCategory,
    ApiProduct,
    DiscountParams,
    ListResponse,
    PharmacyRef,
    ProductParams,
} from "./types"

/* ---------- configuration ---------- */

const TTL_MS = 60_000
const STALE_MS = 10 * 60_000
const MAX_CACHE = 300
const MAX_CONCURRENT = 6
const MAX_UPSTREAM_LIMIT = 100

const PHARMACY_STORE_KEY = "mc_pharmacies_v1"
const PHARMACY_STORE_TTL = 24 * 3600 * 1000

/* ---------- errors ---------- */

export class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
        super(message)
        this.name = "ApiError"
        this.status = status
    }
}

export function isAbortError(e: unknown) {
    return e instanceof Error && e.name === "AbortError"
}

/* ---------- cache ---------- */

type CacheEntry = {
    exp: number
    stale: number
    data: unknown
}

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()
const pharmacyRegistry = new Map<string, string>()

// Prevent requests started before invalidation from repopulating the cache.
let cacheVersion = 0

/**
 * Clears cached API responses.
 *
 * Existing network requests are not cancelled, but their results
 * cannot repopulate the cache after invalidation.
 */
export function invalidateApiCache() {
    cacheVersion++
    cache.clear()
    inflight.clear()
}

/* ---------- query strings ---------- */

function qs(
    values: Record<string, string | number | boolean | undefined | null>
) {
    const p = new URLSearchParams()

    for (const [k, v] of Object.entries(values)) {
        if (
            v !== undefined &&
            v !== null &&
            v !== "" &&
            v !== false
        ) {
            p.set(k, String(v))
        }
    }

    const s = p.toString()
    return s ? `?${s}` : ""
}

/* ---------- abort handling ---------- */

function withSignal<T>(
    p: Promise<T>,
    signal?: AbortSignal
): Promise<T> {
    if (!signal) return p

    return new Promise<T>((resolve, reject) => {
        const onAbort = () => {
            reject(new DOMException("Aborted", "AbortError"))
        }

        if (signal.aborted) {
            onAbort()
            return
        }

        signal.addEventListener("abort", onAbort, { once: true })

        p.then(
            (value) => {
                signal.removeEventListener("abort", onAbort)
                resolve(value)
            },
            (error) => {
                signal.removeEventListener("abort", onAbort)
                reject(error)
            }
        )
    })
}

/* ---------- concurrency limiter ---------- */

let active = 0

const waiting: Array<() => void> = []

async function acquire() {
    if (active < MAX_CONCURRENT) {
        active++
        return
    }

    await new Promise<void>((resolve) => {
        waiting.push(resolve)
    })
}

function release() {
    const next = waiting.shift()

    if (next) {
        // Transfer the active slot to the next waiting request.
        next()
    } else {
        active--
    }
}

/* ---------- network requests ---------- */

const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms))

async function request(url: string): Promise<unknown> {
    await acquire()

    try {
        for (let attempt = 0; ; attempt++) {
            try {
                const response = await fetch(url, {
                    cache: "no-store",
                })

                if (response.ok) {
                    return await response.json()
                }

                throw new ApiError(
                    response.status,
                    response.status === 404
                        ? "This item could not be found."
                        : response.status >= 500
                            ? "The pharmacy catalogue is taking too long to respond. Please try again in a moment."
                            : `The catalogue request failed (HTTP ${response.status}).`
                )
            } catch (e) {
                if (e instanceof ApiError) {
                    throw e
                }

                if (isAbortError(e)) {
                    throw e
                }

                if (attempt < 1) {
                    await sleep(800)
                    continue
                }

                throw new ApiError(
                    503,
                    "Could not reach the pharmacy catalogue. Check your connection and try again."
                )
            }
        }
    } finally {
        release()
    }
}

/* ---------- cached request ---------- */

/**
 * Starts a network request only when one is not already running.
 */
function startRequest(
    url: string
): Promise<unknown> {
    const existing = inflight.get(url)

    if (existing) {
        return existing
    }

    const version = cacheVersion

    const p: Promise<unknown> = request(url)
        .then((data) => {
            // Do not cache results from requests started before invalidation.
            if (version === cacheVersion) {
                if (cache.size >= MAX_CACHE) {
                    const oldest = cache.keys().next().value

                    if (oldest !== undefined) {
                        cache.delete(oldest)
                    }
                }

                const now = Date.now()

                cache.set(url, {
                    exp: now + TTL_MS,
                    stale: now + STALE_MS,
                    data,
                })
            }

            return data
        })
        .catch((error) => {
            const hit = cache.get(url)

            // Keep previously loaded data if the API temporarily fails.
            if (hit && hit.stale > Date.now()) {
                return hit.data
            }

            throw error
        })
        .finally(() => {
            // An older request must not delete a newer in-flight request.
            if (inflight.get(url) === p) {
                inflight.delete(url)
            }
        })

    inflight.set(url, p)

    return p
}

/**
 * GET with:
 * - TTL caching
 * - stale-while-revalidate
 * - in-flight deduplication
 * - stale-on-error fallback
 */
async function getJson<T>(
    url: string,
    signal?: AbortSignal
): Promise<T> {
    if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError")
    }

    const now = Date.now()
    const hit = cache.get(url)

    // Fresh cache: return immediately.
    if (hit && hit.exp > now) {
        return hit.data as T
    }

    // Expired but still usable cache:
    // return immediately and refresh in the background.
    if (hit && hit.stale > now) {
        void startRequest(url).catch(() => {
            // Keep stale data if background refresh fails.
        })

        return hit.data as T
    }

    // No usable cached data: wait for the network request.
    const result = await withSignal(
        startRequest(url) as Promise<T>,
        signal
    )

    return result
}

/* ---------- response parsing ---------- */

function unwrapList<T>(
    raw: unknown
): { items: T[]; total: number } {
    if (Array.isArray(raw)) {
        return {
            items: raw as T[],
            total: raw.length,
        }
    }

    const r = (raw ?? {}) as Record<string, unknown>

    const found = [
        r.items,
        r.data,
        r.results,
    ].find(Array.isArray) as T[] | undefined

    const items = found ?? []

    return {
        items,
        total:
            typeof r.total === "number"
                ? r.total
                : items.length,
    }
}

/**
 * Extract pagination metadata while distinguishing
 * a real backend total from a fallback total.
 */
function unwrapPage<T>(
    raw: unknown
): {
    items: T[]
    total: number
    hasTotal: boolean
} {
    if (Array.isArray(raw)) {
        return {
            items: raw as T[],
            total: raw.length,
            hasTotal: false,
        }
    }

    const r = (raw ?? {}) as Record<string, unknown>

    const found = [
        r.items,
        r.data,
        r.results,
    ].find(Array.isArray) as T[] | undefined

    const items = found ?? []
    const hasTotal = typeof r.total === "number"

    return {
        items,
        total: hasTotal
            ? (r.total as number)
            : items.length,
        hasTotal,
    }
}

/* ---------- pharmacy registry ---------- */

let discoveryComplete = false
let discovering: Promise<void> | null = null

function persistPharmacies() {
    try {
        if (typeof window === "undefined") return

        localStorage.setItem(
            PHARMACY_STORE_KEY,
            JSON.stringify({
                ts: Date.now(),
                list: Array.from(
                    pharmacyRegistry,
                    ([id, name]) => ({ id, name })
                ),
            })
        )
    } catch {
        // Storage unavailable.
    }
}

export function registerPharmacies(
    items: ApiProduct[]
) {
    let changed = false

    for (const product of items) {
        if (
            product.pharmacy_id != null &&
            product.pharmacy_name
        ) {
            const id = String(product.pharmacy_id)

            if (
                pharmacyRegistry.get(id) !==
                product.pharmacy_name
            ) {
                pharmacyRegistry.set(
                    id,
                    product.pharmacy_name
                )

                changed = true
            }
        }
    }

    if (changed && discoveryComplete) {
        persistPharmacies()
    }
}

export function getKnownPharmacies(): PharmacyRef[] {
    return Array.from(
        pharmacyRegistry,
        ([id, name]) => ({ id, name })
    ).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Pharmacy discovery sources:
 * 1. NEXT_PUBLIC_PHARMACY_IDS
 * 2. 24-hour localStorage registry
 * 3. One sample product request
 */
export async function discoverPharmacies(
    signal?: AbortSignal
): Promise<PharmacyRef[]> {
    if (!discoveryComplete) {
        if (!discovering) {
            discovering = (async () => {
                try {
                    if (typeof window !== "undefined") {
                        const stored = JSON.parse(
                            localStorage.getItem(
                                PHARMACY_STORE_KEY
                            ) ?? "null"
                        ) as
                            | {
                                ts: number
                                list: PharmacyRef[]
                            }
                            | null

                        if (
                            stored &&
                            Date.now() - stored.ts <
                            PHARMACY_STORE_TTL
                        ) {
                            stored.list.forEach((p) => {
                                pharmacyRegistry.set(
                                    String(p.id),
                                    p.name
                                )
                            })
                        }
                    }
                } catch {
                    // Ignore invalid or unavailable storage.
                }

                const configuredIds = (
                    process.env.NEXT_PUBLIC_PHARMACY_IDS ?? ""
                )
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)

                for (const id of configuredIds) {
                    if (!pharmacyRegistry.has(id)) {
                        pharmacyRegistry.set(id, id)
                    }
                }

                if (pharmacyRegistry.size === 0) {
                    await rawProducts({
                        limit: 60,
                        offset: 0,
                    })
                }

                discoveryComplete =
                    pharmacyRegistry.size > 0

                if (discoveryComplete) {
                    persistPharmacies()
                }
            })().finally(() => {
                discovering = null
            })
        }

        await withSignal(discovering, signal)
    }

    return getKnownPharmacies()
}

/* ---------- raw paginated fetcher ---------- */

/**
 * The backend enforces limit <= 100.
 * Larger frontend requests are split into safe chunks.
 */
async function rawPaginatedList<T>(
    endpoint: string,
    params: ProductParams | DiscountParams,
    signal?: AbortSignal
): Promise<ListResponse<T>> {
    const requestedLimit = Math.max(
        1,
        Math.floor(params.limit ?? 24)
    )

    const initialOffset = Math.max(
        0,
        Math.floor(params.offset ?? 0)
    )

    const items: T[] = []

    let total = 0
    let hasTotal = false
    let consumed = 0

    while (consumed < requestedLimit) {
        if (signal?.aborted) {
            throw new DOMException(
                "Aborted",
                "AbortError"
            )
        }

        const chunkLimit = Math.min(
            MAX_UPSTREAM_LIMIT,
            requestedLimit - consumed
        )

        const chunkOffset = initialOffset + consumed

        const raw = await getJson<unknown>(
            `${endpoint}${qs({
                ...params,
                limit: chunkLimit,
                offset: chunkOffset,
            })}`,
            signal
        )

        const result = unwrapPage<T>(raw)

        if (consumed === 0) {
            total = result.total
            hasTotal = result.hasTotal
        } else if (result.hasTotal) {
            total = result.total
            hasTotal = true
        }

        items.push(...result.items)

        consumed += result.items.length

        // Stop if the backend returned a partial chunk.
        if (result.items.length < chunkLimit) {
            break
        }

        // Stop if the backend confirms the end of the list.
        if (
            hasTotal &&
            initialOffset + consumed >= total
        ) {
            break
        }

        if (result.items.length === 0) {
            break
        }
    }

    const done = hasTotal
        ? initialOffset + items.length >= total
        : items.length < requestedLimit

    return {
        items,
        total,
        done,
    }
}

/* ---------- raw products and discounts ---------- */

async function rawProducts(
    params: ProductParams,
    signal?: AbortSignal
): Promise<ListResponse<ApiProduct>> {
    const result = await rawPaginatedList<ApiProduct>(
        "/api/pharmacy/products",
        params,
        signal
    )

    registerPharmacies(result.items)

    return result
}

async function rawDiscounts(
    params: DiscountParams,
    signal?: AbortSignal
): Promise<ListResponse<ApiProduct>> {
    const result = await rawPaginatedList<ApiProduct>(
        "/api/pharmacy/discounts",
        params,
        signal
    )

    registerPharmacies(result.items)

    return result
}

async function rawCategories(
    pharmacyId?: string,
    signal?: AbortSignal
): Promise<ApiCategory[]> {
    const raw = await getJson<unknown>(
        `/api/pharmacy/categories${qs({
            pharmacy_id: pharmacyId,
        })}`,
        signal
    )

    return unwrapList<ApiCategory>(raw).items
}

/* ---------- cross-pharmacy fan-out ---------- */

/**
 * Queries pharmacies independently and merges their results.
 *
 * Each pharmacy receives a smaller page request.
 * Results are interleaved to avoid one pharmacy dominating.
 */
async function fanOut(
    params: ProductParams,
    raw: (
        p: ProductParams,
        s?: AbortSignal
    ) => Promise<ListResponse<ApiProduct>>,
    signal?: AbortSignal
): Promise<ListResponse<ApiProduct>> {
    const pharmacies = await discoverPharmacies(signal)

    if (pharmacies.length === 0) {
        return raw(params, signal)
    }

    const limit = Math.max(
        1,
        Math.floor(params.limit ?? 24)
    )

    const offset = Math.max(
        0,
        Math.floor(params.offset ?? 0)
    )

    const page = Math.floor(offset / limit)

    const per = Math.max(
        1,
        Math.ceil(limit / pharmacies.length)
    )

    const settled = await Promise.allSettled(
        pharmacies.map((pharmacy) =>
            raw(
                {
                    ...params,
                    pharmacy_id: pharmacy.id,
                    limit: per,
                    offset: page * per,
                },
                signal
            )
        )
    )

    const ok = settled
        .filter(
            (
                result
            ): result is PromiseFulfilledResult<
                ListResponse<ApiProduct>
            > => result.status === "fulfilled"
        )
        .map((result) => result.value)

    if (ok.length === 0) {
        const failed = settled.find(
            (result) => result.status === "rejected"
        ) as PromiseRejectedResult | undefined

        throw failed?.reason ??
        new ApiError(
            503,
            "No pharmacy catalogue is currently available."
        )
    }

    // Interleave pharmacy results.
    const merged: ApiProduct[] = []

    const longest = Math.max(
        0,
        ...ok.map((result) => result.items.length)
    )

    for (let i = 0; i < longest; i++) {
        for (const result of ok) {
            const product = result.items[i]

            if (product) {
                merged.push(product)
            }
        }
    }

    // Respect the requested frontend page size.
    const items = merged.slice(0, limit)

    return {
        items,
        total: ok.reduce(
            (sum, result) => sum + result.total,
            0
        ),
        done:
            merged.length === 0 ||
            ok.every((result) => result.done),
    }
}

/* ---------- public product API ---------- */

export function fetchProducts(
    params: ProductParams,
    signal?: AbortSignal
) {
    if (params.pharmacy_id) {
        return rawProducts(params, signal)
    }

    return fanOut(
        params,
        rawProducts,
        signal
    )
}

/* ---------- public discount API ---------- */

export function fetchDiscounts(
    params: DiscountParams,
    signal?: AbortSignal
) {
    if (params.pharmacy_id) {
        return rawDiscounts(params, signal)
    }

    return fanOut(
        params,
        rawDiscounts,
        signal
    )
}

/* ---------- public category API ---------- */

export async function fetchCategories(
    pharmacyId?: string,
    signal?: AbortSignal
): Promise<ApiCategory[]> {
    if (pharmacyId) {
        return rawCategories(pharmacyId, signal)
    }

    const pharmacies = await discoverPharmacies(signal)

    if (pharmacies.length === 0) {
        return rawCategories(undefined, signal)
    }

    const settled = await Promise.allSettled(
        pharmacies.map((pharmacy) =>
            rawCategories(pharmacy.id, signal)
        )
    )

    const ok = settled
        .filter(
            (
                result
            ): result is PromiseFulfilledResult<
                ApiCategory[]
            > => result.status === "fulfilled"
        )
        .map((result) => result.value)

    if (ok.length === 0) {
        const failed = settled.find(
            (result) => result.status === "rejected"
        ) as PromiseRejectedResult | undefined

        throw failed?.reason ??
        new ApiError(
            503,
            "Could not load pharmacy categories."
        )
    }

    const merged = new Map<string, ApiCategory>()

    for (const list of ok) {
        for (const category of list) {
            const key = String(
                category.category_key ??
                category.name ??
                category.name_ar ??
                ""
            )

            if (!key) continue

            const previous = merged.get(key)

            merged.set(key, {
                ...(previous ?? category),
                category_key:
                    category.category_key ?? key,
                product_count:
                    (previous?.product_count ?? 0) +
                    (category.product_count ?? 0),
                pharmacy_count:
                    (previous?.pharmacy_count ?? 0) + 1,
            })
        }
    }

    return Array.from(merged.values()).sort(
        (a, b) =>
            (a.name ?? "").localeCompare(
                b.name ?? ""
            )
    )
}

/* ---------- single product API ---------- */

export async function fetchProduct(
    id: string,
    pharmacyId?: string,
    signal?: AbortSignal
): Promise<ApiProduct> {
    const raw = await getJson<Record<string, unknown>>(
        `/api/pharmacy/products/${encodeURIComponent(id)}${qs({
            pharmacy_id: pharmacyId,
        })}`,
        signal
    )

    const record = (
        raw?.product ??
        raw?.item ??
        raw
    ) as ApiProduct | null

    if (
        !record ||
        typeof record !== "object" ||
        record.id == null
    ) {
        throw new ApiError(
            502,
            "The product API returned an invalid response."
        )
    }

    registerPharmacies([record])

    return record
}