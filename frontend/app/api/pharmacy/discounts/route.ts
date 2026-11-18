
import { NextRequest, NextResponse } from "next/server"
import { getPharmaSyncDiscounts } from "@/app/lib/pharamcy/pharmasync"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
    try {
        const params = request.nextUrl.searchParams

        const data = await getPharmaSyncDiscounts({
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
        })

        return NextResponse.json(data)
    } catch (error) {
        console.error(
            "PharmaSync discounts request failed:",
            error instanceof Error ? error.message : "Unknown error"
        )

        return NextResponse.json(
            { error: "Unable to retrieve pharmacy discounts." },
            { status: 502 }
        )
    }
}
