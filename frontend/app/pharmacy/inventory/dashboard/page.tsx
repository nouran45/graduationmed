"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    Boxes,
    Eye,
    EyeOff,
    PackageCheck,
    PackageX,
    RefreshCw,
} from "lucide-react"

import {
    getInventoryDashboard,
    InventoryDashboardResponse,
    StockMovement,
} from "@/lib/inventory-api"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"


const DEV_BRANCH_ID =
    process.env.NEXT_PUBLIC_P4_BRANCH_ID || ""


// =========================================================
// HELPERS
// =========================================================

function formatMovementType(
    type: StockMovement["movement_type"]
) {
    switch (type) {
        case "manual_add":
            return "Manual add"

        case "correction":
            return "Correction"

        case "import":
            return "CSV import"

        case "reservation":
            return "Reservation"

        case "release":
            return "Release"

        case "completion":
            return "Completion"

        default:
            return type
    }
}


function getMovementBadgeClass(
    type: StockMovement["movement_type"]
) {
    switch (type) {
        case "manual_add":
        case "import":
            return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"

        case "correction":
            return "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50"

        case "reservation":
            return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"

        case "release":
            return "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-50"

        case "completion":
            return "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-50"

        default:
            return ""
    }
}


function formatQuantityChange(
    value: number
) {
    if (value > 0) {
        return `+${value}`
    }

    return `${value}`
}


function formatDate(
    value: string
) {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat(
        "en",
        {
            dateStyle: "medium",
            timeStyle: "short",
        }
    ).format(date)
}


// =========================================================
// PAGE
// =========================================================

export default function InventoryDashboardPage() {
    const [
        dashboard,
        setDashboard,
    ] = useState<InventoryDashboardResponse | null>(
        null
    )

    const [
        loading,
        setLoading,
    ] = useState(true)

    const [
        error,
        setError,
    ] = useState("")


    // =====================================================
    // LOAD DASHBOARD
    // =====================================================

    const loadDashboard = useCallback(
        async (
            signal?: AbortSignal
        ) => {
            if (!DEV_BRANCH_ID) {
                setError(
                    "Development branch configuration is missing."
                )
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setError("")

                const result =
                    await getInventoryDashboard(
                        {
                            branchId:
                                DEV_BRANCH_ID,
                        },
                        signal
                    )

                setDashboard(
                    result
                )

            } catch (error) {
                if (
                    error instanceof DOMException &&
                    error.name === "AbortError"
                ) {
                    return
                }

                setError(
                    error instanceof Error
                        ? error.message
                        : "Unable to load inventory dashboard."
                )

            } finally {
                setLoading(false)
            }
        },
        []
    )


    useEffect(() => {
        const controller =
            new AbortController()

        loadDashboard(
            controller.signal
        )

        return () => {
            controller.abort()
        }
    }, [loadDashboard])


    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50">
                <div className="border-b bg-white">
                    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                        <Skeleton className="h-6 w-32" />
                    </div>
                </div>

                <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                    <Skeleton className="h-10 w-64" />

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({
                            length: 8,
                        }).map(
                            (_, index) => (
                                <Skeleton
                                    key={index}
                                    className="h-28 rounded-xl"
                                />
                            )
                        )}
                    </div>

                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-72 rounded-xl" />
                </div>
            </main>
        )
    }


    // =====================================================
    // ERROR
    // =====================================================

    if (
        error ||
        !dashboard
    ) {
        return (
            <main className="min-h-screen bg-gray-50">
                <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-24 text-center">
                    <AlertTriangle className="h-10 w-10 text-red-500" />

                    <h1 className="mt-4 text-xl font-semibold text-gray-900">
                        Unable to load dashboard
                    </h1>

                    <p className="mt-2 text-sm text-gray-500">
                        {error ||
                            "Dashboard data is unavailable."}
                    </p>

                    <Button
                        className="mt-6"
                        onClick={() =>
                            loadDashboard()
                        }
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                </div>
            </main>
        )
    }


    const {
        summary,
        low_stock_items,
        out_of_stock_items,
        recent_movements,
    } = dashboard


    // =====================================================
    // UI
    // =====================================================

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="border-b bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <div>
                        <p className="text-lg font-semibold text-secondary">
                            MediCheck
                        </p>

                        <p className="text-xs text-gray-500">
                            Pharmacy inventory
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() =>
                                loadDashboard()
                            }
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>

                        <Button
                            variant="outline"
                            asChild
                        >
                            <Link href="/pharmacy/inventory">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Inventory
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>


            <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                {/* Title */}
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                        Inventory Dashboard
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Current stock health, availability and recent inventory activity.
                    </p>
                </div>


                {/* =========================================
                    SUMMARY CARDS
                ========================================== */}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="flex items-center justify-between p-5">
                            <div>
                                <p className="text-xs font-medium text-gray-500">
                                    Total products
                                </p>

                                <p className="mt-2 text-2xl font-semibold text-gray-900">
                                    {summary.total_products}
                                </p>
                            </div>

                            <Boxes className="h-7 w-7 text-primary" />
                        </CardContent>
                    </Card>


                    <Card>
                        <CardContent className="flex items-center justify-between p-5">
                            <div>
                                <p className="text-xs font-medium text-gray-500">
                                    Low stock
                                </p>

                                <p className="mt-2 text-2xl font-semibold text-amber-700">
                                    {
                                        summary.low_stock_products
                                    }
                                </p>
                            </div>

                            <AlertTriangle className="h-7 w-7 text-amber-600" />
                        </CardContent>
                    </Card>


                    <Card>
                        <CardContent className="flex items-center justify-between p-5">
                            <div>
                                <p className="text-xs font-medium text-gray-500">
                                    Out of stock
                                </p>

                                <p className="mt-2 text-2xl font-semibold text-red-700">
                                    {
                                        summary.out_of_stock_products
                                    }
                                </p>
                            </div>

                            <PackageX className="h-7 w-7 text-red-600" />
                        </CardContent>
                    </Card>


                    <Card>
                        <CardContent className="flex items-center justify-between p-5">
                            <div>
                                <p className="text-xs font-medium text-gray-500">
                                    Available units
                                </p>

                                <p className="mt-2 text-2xl font-semibold text-emerald-700">
                                    {
                                        summary.total_available_units
                                    }
                                </p>
                            </div>

                            <PackageCheck className="h-7 w-7 text-emerald-600" />
                        </CardContent>
                    </Card>


                    <Card>
                        <CardContent className="flex items-center justify-between p-5">
                            <div>
                                <p className="text-xs font-medium text-gray-500">
                                    Physical units
                                </p>

                                <p className="mt-2 text-2xl font-semibold text-gray-900">
                                    {
                                        summary.total_physical_units
                                    }
                                </p>
                            </div>

                            <Boxes className="h-7 w-7 text-gray-500" />
                        </CardContent>
                    </Card>


                    <Card>
                        <CardContent className="flex items-center justify-between p-5">
                            <div>
                                <p className="text-xs font-medium text-gray-500">
                                    Reserved units
                                </p>

                                <p className="mt-2 text-2xl font-semibold text-gray-900">
                                    {
                                        summary.total_reserved_units
                                    }
                                </p>
                            </div>

                            <Activity className="h-7 w-7 text-gray-500" />
                        </CardContent>
                    </Card>


                    <Card>
                        <CardContent className="flex items-center justify-between p-5">
                            <div>
                                <p className="text-xs font-medium text-gray-500">
                                    Online products
                                </p>

                                <p className="mt-2 text-2xl font-semibold text-emerald-700">
                                    {
                                        summary.online_products
                                    }
                                </p>
                            </div>

                            <Eye className="h-7 w-7 text-emerald-600" />
                        </CardContent>
                    </Card>


                    <Card>
                        <CardContent className="flex items-center justify-between p-5">
                            <div>
                                <p className="text-xs font-medium text-gray-500">
                                    Offline products
                                </p>

                                <p className="mt-2 text-2xl font-semibold text-gray-700">
                                    {
                                        summary.offline_products
                                    }
                                </p>
                            </div>

                            <EyeOff className="h-7 w-7 text-gray-500" />
                        </CardContent>
                    </Card>
                </div>


                {/* =========================================
                    STOCK ALERTS
                ========================================== */}

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Low stock */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                Low Stock
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            {low_stock_items.length ===
                            0 ? (
                                <p className="py-8 text-center text-sm text-gray-500">
                                    No low-stock products.
                                </p>
                            ) : (
                                <div className="overflow-hidden rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    Product
                                                </TableHead>

                                                <TableHead className="text-right">
                                                    Available
                                                </TableHead>

                                                <TableHead className="text-right">
                                                    Reorder
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {low_stock_items.map(
                                                (item) => (
                                                    <TableRow
                                                        key={
                                                            item.inventory_id
                                                        }
                                                    >
                                                        <TableCell className="font-medium">
                                                            {
                                                                item.product_id
                                                            }
                                                        </TableCell>

                                                        <TableCell className="text-right font-medium text-amber-700">
                                                            {
                                                                item.available_quantity
                                                            }
                                                        </TableCell>

                                                        <TableCell className="text-right">
                                                            {
                                                                item.reorder_level
                                                            }
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>


                    {/* Out of stock */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <PackageX className="h-4 w-4 text-red-600" />
                                Out of Stock
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            {out_of_stock_items.length ===
                            0 ? (
                                <div className="py-8 text-center">
                                    <PackageCheck className="mx-auto h-7 w-7 text-emerald-600" />

                                    <p className="mt-2 text-sm text-gray-500">
                                        No products are currently out of stock.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    Product
                                                </TableHead>

                                                <TableHead className="text-right">
                                                    Available
                                                </TableHead>

                                                <TableHead className="text-right">
                                                    Reorder
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {out_of_stock_items.map(
                                                (item) => (
                                                    <TableRow
                                                        key={
                                                            item.inventory_id
                                                        }
                                                    >
                                                        <TableCell className="font-medium">
                                                            {
                                                                item.product_id
                                                            }
                                                        </TableCell>

                                                        <TableCell className="text-right font-medium text-red-700">
                                                            {
                                                                item.available_quantity
                                                            }
                                                        </TableCell>

                                                        <TableCell className="text-right">
                                                            {
                                                                item.reorder_level
                                                            }
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>


                {/* =========================================
                    RECENT STOCK ACTIVITY
                ========================================== */}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="h-4 w-4 text-primary" />
                            Recent Stock Activity
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        {recent_movements.length ===
                        0 ? (
                            <p className="py-10 text-center text-sm text-gray-500">
                                No stock movements yet.
                            </p>
                        ) : (
                            <div className="overflow-hidden rounded-lg border">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    Product
                                                </TableHead>

                                                <TableHead>
                                                    Action
                                                </TableHead>

                                                <TableHead className="text-right">
                                                    Physical change
                                                </TableHead>

                                                <TableHead className="text-right">
                                                    Resulting stock
                                                </TableHead>

                                                <TableHead>
                                                    Actor
                                                </TableHead>

                                                <TableHead>
                                                    Time
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {recent_movements.map(
                                                (
                                                    movement
                                                ) => (
                                                    <TableRow
                                                        key={
                                                            movement.movement_id
                                                        }
                                                    >
                                                        <TableCell className="font-medium">
                                                            {
                                                                movement.product_id
                                                            }
                                                        </TableCell>

                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className={
                                                                    getMovementBadgeClass(
                                                                        movement.movement_type
                                                                    )
                                                                }
                                                            >
                                                                {formatMovementType(
                                                                    movement.movement_type
                                                                )}
                                                            </Badge>
                                                        </TableCell>

                                                        <TableCell
                                                            className={`text-right font-medium ${
                                                                movement.physical_quantity_change >
                                                                0
                                                                    ? "text-emerald-700"
                                                                    : movement.physical_quantity_change <
                                                                        0
                                                                      ? "text-red-700"
                                                                      : "text-gray-600"
                                                            }`}
                                                        >
                                                            {formatQuantityChange(
                                                                movement.physical_quantity_change
                                                            )}
                                                        </TableCell>

                                                        <TableCell className="text-right">
                                                            {
                                                                movement.resulting_physical_quantity
                                                            }
                                                        </TableCell>

                                                        <TableCell className="text-sm text-gray-600">
                                                            {
                                                                movement.actor
                                                            }
                                                        </TableCell>

                                                        <TableCell className="whitespace-nowrap text-xs text-gray-500">
                                                            {formatDate(
                                                                movement.timestamp
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}