
import { NextRequest, NextResponse } from "next/server"
import { getPharmaSyncProducts } from "@/app/lib/pharamcy/pharmasync"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
    try {
        const params = request.nextUrl.searchParams

        const data = await getPharmaSyncProducts({
            pharmacy_id: params.get("pharmacy_id") || undefined,
            q: params.get("q") || undefined,
            category_id: params.has("category_id")
                ? Number(params.get("category_id"))
                : undefined,
            category_key: params.get("category_key") || undefined,
            limit: params.has("limit")
                ? Number(params.get("limit"))
                : undefined,
            offset: params.has("offset")
                ? Number(params.get("offset"))
                : undefined,
            discounted_only: params.has("discounted_only")
                ? params.get("discounted_only") === "true"
                : undefined,
            availability:
                (params.get("availability") as
                    | "in_stock"
                    | "out_of_stock"
                    | "unknown"
                    | "stale"
                    | null) || undefined,
        })

        return NextResponse.json(data)
    } catch (error) {
        console.error(
            "PharmaSync products request failed:",
            error instanceof Error ? error.message : "Unknown error"
        )

        return NextResponse.json(
            { error: "Unable to retrieve pharmacy products." },
            { status: 502 }
        )
    }
}
