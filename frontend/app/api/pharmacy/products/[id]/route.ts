
import { NextRequest, NextResponse } from "next/server"
import { getPharmaSyncProduct } from "@/app/lib/pharamcy/pharmasync"

export const dynamic = "force-dynamic"

interface RouteContext {
    params: Promise<{ id: string }>
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params

        if (!/^\d+$/.test(id)) {
            return NextResponse.json(
                { error: "Invalid product ID." },
                { status: 400 }
            )
        }

        const pharmacyId =
            request.nextUrl.searchParams.get("pharmacy_id") || undefined

        const data = await getPharmaSyncProduct(id, pharmacyId)

        return NextResponse.json(data)
    } catch (error) {
        console.error(
            "PharmaSync product details request failed:",
            error instanceof Error ? error.message : "Unknown error"
        )

        return NextResponse.json(
            { error: "Unable to retrieve product details." },
            { status: 502 }
        )
    }
}
