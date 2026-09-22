const API_BASE = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://127.0.0.1:8000"
).replace(/\/$/, "")


// =========================================================
// TYPES
// =========================================================

export interface InventoryItem {
    inventory_id: string
    product_id: string
    branch_id: string

    physical_quantity: number
    reserved_quantity: number
    available_quantity: number

    price: number
    online_visibility: boolean
    reorder_level: number

    last_updated: string
}


export interface InventoryQuantityUpdate {
    physical_quantity: number
}


export interface InventoryDetailsUpdate {
    price?: number
    reorder_level?: number
    online_visibility?: boolean
}


export interface InventoryApiContext {
    branchId: string
    actorId?: string
}


// =========================================================
// STAGE 5 - STOCK INTAKE TYPES
// =========================================================

export interface InventoryIntakeRow {
    product_id: string
    quantity: number
    price: number
    reorder_level: number
    online_visibility: boolean
}


export interface InventoryIntakeRowResult {
    row_number: number
    product_id: string | null

    valid: boolean
    errors: string[]

    data: InventoryIntakeRow | null
}


export interface InventoryIntakeValidationResponse {
    total_rows: number
    valid_rows: number
    invalid_rows: number

    rows: InventoryIntakeRowResult[]
}


export interface InventoryImportResult {
    imported: number
    failed: number

    inventory_items: InventoryItem[]
}


// =========================================================
// STAGE 6 - DASHBOARD TYPES
// =========================================================

export interface InventoryDashboardSummary {
    total_products: number

    low_stock_products: number
    out_of_stock_products: number

    online_products: number
    offline_products: number

    total_physical_units: number
    total_reserved_units: number
    total_available_units: number
}


export interface StockMovement {
    movement_id: string

    inventory_id: string
    product_id: string
    branch_id: string

    actor: string

    movement_type:
        | "manual_add"
        | "correction"
        | "import"
        | "reservation"
        | "release"
        | "completion"

    physical_quantity_change: number
    reserved_quantity_change: number

    resulting_physical_quantity: number
    resulting_reserved_quantity: number
    resulting_available_quantity: number

    related_order_id: string | null

    timestamp: string
}


export interface InventoryDashboardResponse {
    summary: InventoryDashboardSummary

    low_stock_items: InventoryItem[]
    out_of_stock_items: InventoryItem[]

    recent_movements: StockMovement[]
}


// =========================================================
// SHARED HELPERS
// =========================================================

function buildHeaders(
    context: InventoryApiContext,
    includeActor = false
): HeadersInit {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Branch-ID": context.branchId,
    }

    if (includeActor) {
        if (!context.actorId) {
            throw new Error(
                "Actor ID is required for this inventory action."
            )
        }

        headers["X-Actor-ID"] = context.actorId
    }

    return headers
}


async function handleResponse<T>(
    response: Response
): Promise<T> {
    if (!response.ok) {
        let message =
            `Request failed with status ${response.status}.`

        try {
            const body = await response.json()

            if (body?.detail) {
                message =
                    typeof body.detail === "string"
                        ? body.detail
                        : JSON.stringify(body.detail)
            }
        } catch {
            // Ignore JSON parsing failure and use fallback message.
        }

        throw new Error(message)
    }

    return response.json() as Promise<T>
}


// =========================================================
// INVENTORY READ
// =========================================================

export async function getInventory(
    context: InventoryApiContext,
    signal?: AbortSignal
): Promise<InventoryItem[]> {
    const response = await fetch(
        `${API_BASE}/api/inventory`,
        {
            method: "GET",
            headers: buildHeaders(context),
            signal,
        }
    )

    return handleResponse<InventoryItem[]>(
        response
    )
}


export async function getInventoryItem(
    inventoryId: string,
    context: InventoryApiContext,
    signal?: AbortSignal
): Promise<InventoryItem> {
    const response = await fetch(
        `${API_BASE}/api/inventory/${inventoryId}`,
        {
            method: "GET",
            headers: buildHeaders(context),
            signal,
        }
    )

    return handleResponse<InventoryItem>(
        response
    )
}


// =========================================================
// INVENTORY UPDATE
// =========================================================

export async function updateInventoryQuantity(
    inventoryId: string,
    data: InventoryQuantityUpdate,
    context: InventoryApiContext
): Promise<InventoryItem> {
    const response = await fetch(
        `${API_BASE}/api/inventory/${inventoryId}/quantity`,
        {
            method: "PATCH",
            headers: buildHeaders(
                context,
                true
            ),
            body: JSON.stringify(data),
        }
    )

    return handleResponse<InventoryItem>(
        response
    )
}


export async function updateInventoryDetails(
    inventoryId: string,
    data: InventoryDetailsUpdate,
    context: InventoryApiContext
): Promise<InventoryItem> {
    const response = await fetch(
        `${API_BASE}/api/inventory/${inventoryId}/details`,
        {
            method: "PATCH",
            headers: buildHeaders(context),
            body: JSON.stringify(data),
        }
    )

    return handleResponse<InventoryItem>(
        response
    )
}


// =========================================================
// STAGE 5 - MANUAL STOCK INTAKE
// =========================================================

export async function addManualStock(
    row: InventoryIntakeRow,
    context: InventoryApiContext
): Promise<InventoryItem> {
    const response = await fetch(
        `${API_BASE}/api/inventory/intake/manual`,
        {
            method: "POST",
            headers: buildHeaders(
                context,
                true
            ),
            body: JSON.stringify(row),
        }
    )

    return handleResponse<InventoryItem>(
        response
    )
}


// =========================================================
// STAGE 5 - CSV VALIDATION
// =========================================================

export async function validateInventoryCsv(
    csvText: string,
    context: InventoryApiContext
): Promise<InventoryIntakeValidationResponse> {
    const response = await fetch(
        `${API_BASE}/api/inventory/intake/validate-csv`,
        {
            method: "POST",
            headers: buildHeaders(context),
            body: JSON.stringify({
                csv_text: csvText,
            }),
        }
    )

    return handleResponse<InventoryIntakeValidationResponse>(
        response
    )
}


// =========================================================
// STAGE 5 - CONFIRMED CSV IMPORT
// =========================================================

export async function importInventoryRows(
    rows: InventoryIntakeRow[],
    context: InventoryApiContext
): Promise<InventoryImportResult> {
    const response = await fetch(
        `${API_BASE}/api/inventory/intake/import`,
        {
            method: "POST",
            headers: buildHeaders(
                context,
                true
            ),
            body: JSON.stringify({
                rows,
            }),
        }
    )

    return handleResponse<InventoryImportResult>(
        response
    )
}


// =========================================================
// STAGE 6 - INVENTORY DASHBOARD
// =========================================================

export async function getInventoryDashboard(
    context: InventoryApiContext,
    signal?: AbortSignal
): Promise<InventoryDashboardResponse> {
    const response = await fetch(
        `${API_BASE}/api/inventory/dashboard`,
        {
            method: "GET",
            headers: buildHeaders(context),
            signal,
        }
    )

    return handleResponse<InventoryDashboardResponse>(
        response
    )
}