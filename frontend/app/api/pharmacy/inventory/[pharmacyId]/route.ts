
import { NextRequest, NextResponse } from "next/server"
import { getPharmacyInventory } from "@/lib/pharmacy/stock-sync"

export const dynamic = "force-dynamic"

interface RouteContext {
    params: Promise<{ pharmacyId: string }>
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { pharmacyId } = await context.params
        const params = request.nextUrl.searchParams

        const limit = params.has("limit")
            ? Number(params.get("limit"))
            : 100

        const offset = params.has("offset")
            ? Number(params.get("offset"))
            : 0

        if (
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 500 ||
            !Number.isInteger(offset) ||
            offset < 0 ||
            offset > 1000000
        ) {
            return NextResponse.json(
                { error: "Invalid inventory pagination parameters." },
                { status: 400 }
            )
        }

        const availability = params.get("availability")
        const allowedAvailability = [
            "in_stock",
            "out_of_stock",
            "unknown",
            "stale",
        ]

        if (
            availability &&
            !allowedAvailability.includes(availability)
        ) {
            return NextResponse.json(
                { error: "Invalid availability filter." },
                { status: 400 }
            )
        }

        const data = await getPharmacyInventory(pharmacyId, {
            availability: availability as
                | "in_stock"
                | "out_of_stock"
                | "unknown"
                | "stale"
                | undefined,
            q: params.get("q") || undefined,
            limit,
            offset,
        })

        return NextResponse.json(data, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        })
    } catch (error) {
        console.error(
            "PharmaSync inventory request failed:",
            error instanceof Error ? error.message : "Unknown error"
        )

        return NextResponse.json(
            { error: "Unable to retrieve pharmacy inventory." },
            { status: 502 }
        )
    }
}
