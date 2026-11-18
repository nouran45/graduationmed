
import "server-only"

const API_BASE_URL = process.env.PHARMASYNC_API_BASE_URL?.replace(/\/+$/, "")
const API_TOKEN = process.env.MEDICHECK_API_TOKEN

export type StockAvailability =
    | "in_stock"
    | "out_of_stock"
    | "unknown"
    | "stale"

export interface InventoryQuery {
    availability?: StockAvailability
    q?: string
    limit?: number
    offset?: number
}

function buildQuery(query: InventoryQuery): string {
    const params = new URLSearchParams()

    if (query.availability) params.set("availability", query.availability)
    if (query.q) params.set("q", query.q)
    if (query.limit !== undefined) params.set("limit", String(query.limit))
    if (query.offset !== undefined) params.set("offset", String(query.offset))

    const result = params.toString()
    return result ? `?${result}` : ""
}

async function requestPharmaSync<T>(
    path: string,
    signal?: AbortSignal
): Promise<T> {
    if (!API_BASE_URL) {
        throw new Error("PHARMASYNC_API_BASE_URL is not configured.")
    }

    if (!API_TOKEN) {
        throw new Error("MEDICHECK_API_TOKEN is not configured.")
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "X-MediCheck-Token": API_TOKEN,
        },
        cache: "no-store",
        signal: signal ?? AbortSignal.timeout(15000),
    })

    const body = await response.text()

    if (!response.ok) {
        throw new Error(
            `PharmaSync returned HTTP ${response.status}: ${body.slice(0, 500)}`
        )
    }

    try {
        return JSON.parse(body) as T
    } catch {
        throw new Error("PharmaSync returned an invalid JSON response.")
    }
}

export async function getPharmacyInventory(
    pharmacyId: string,
    query: InventoryQuery = {},
    signal?: AbortSignal
): Promise<unknown> {
    if (!pharmacyId.trim()) {
        throw new Error("A pharmacy ID is required.")
    }

    return requestPharmaSync(
        `/api/v1/pharmacies/${encodeURIComponent(pharmacyId)}/inventory${buildQuery(query)}`,
        signal
    )
}

export async function getPharmacySyncStatus(
    pharmacyId: string,
    signal?: AbortSignal
): Promise<unknown> {
    if (!pharmacyId.trim()) {
        throw new Error("A pharmacy ID is required.")
    }

    return requestPharmaSync(
        `/api/v1/pharmacies/${encodeURIComponent(pharmacyId)}/sync-status`,
        signal
    )
}
