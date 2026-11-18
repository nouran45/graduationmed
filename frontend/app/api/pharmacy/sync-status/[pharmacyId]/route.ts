
import { NextRequest, NextResponse } from "next/server"
import { getPharmacySyncStatus } from "@/lib/pharmacy/stock-sync"

export const dynamic = "force-dynamic"

interface RouteContext {
    params: Promise<{ pharmacyId: string }>
}

export async function GET(
    _request: NextRequest,
    context: RouteContext
) {
    try {
        const { pharmacyId } = await context.params

        const data = await getPharmacySyncStatus(pharmacyId)

        return NextResponse.json(data, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        })
    } catch (error) {
        console.error(
            "PharmaSync sync-status request failed:",
            error instanceof Error ? error.message : "Unknown error"
        )

        return NextResponse.json(
            { error: "Unable to retrieve pharmacy sync status." },
            { status: 502 }
        )
    }
}
