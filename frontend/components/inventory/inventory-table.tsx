"use client"

import { Pencil, SearchX } from "lucide-react"

import type { InventoryItem } from "@/lib/inventory-api"

import StockStatusBadge from "@/components/inventory/stock-status-badge"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"


interface InventoryTableProps {
    items: InventoryItem[]
    onEdit: (item: InventoryItem) => void
}


function formatPrice(price: number) {
    return new Intl.NumberFormat("en", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(price)
}


function formatLastUpdated(value: string) {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return "Unknown"
    }

    return new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date)
}


export default function InventoryTable({
    items,
    onEdit,
}: InventoryTableProps) {
    if (items.length === 0) {
        return (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
                    <SearchX className="h-5 w-5 text-gray-400" />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-secondary">
                    No inventory items found
                </h3>

                <p className="mt-1 max-w-sm text-xs leading-5 text-gray-400">
                    No inventory items match the current search or filters.
                </p>
            </div>
        )
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-100 bg-gray-50/70 hover:bg-gray-50/70">
                            <TableHead className="min-w-[190px] text-xs font-semibold text-secondary">
                                Product
                            </TableHead>

                            <TableHead className="text-xs font-semibold text-secondary">
                                Physical
                            </TableHead>

                            <TableHead className="text-xs font-semibold text-secondary">
                                Reserved
                            </TableHead>

                            <TableHead className="text-xs font-semibold text-secondary">
                                Available
                            </TableHead>

                            <TableHead className="min-w-[120px] text-xs font-semibold text-secondary">
                                Status
                            </TableHead>

                            <TableHead className="text-xs font-semibold text-secondary">
                                Price
                            </TableHead>

                            <TableHead className="min-w-[110px] text-xs font-semibold text-secondary">
                                Visibility
                            </TableHead>

                            <TableHead className="text-xs font-semibold text-secondary">
                                Reorder level
                            </TableHead>

                            <TableHead className="min-w-[170px] text-xs font-semibold text-secondary">
                                Last updated
                            </TableHead>

                            <TableHead className="w-[80px] text-right text-xs font-semibold text-secondary">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {items.map((item) => (
                            <TableRow
                                key={item.inventory_id}
                                className="border-gray-50 transition-colors hover:bg-gray-50/70"
                            >
                                <TableCell>
                                    <div>
                                        <p className="text-sm font-semibold text-secondary">
                                            {item.product_id}
                                        </p>

                                        <p className="mt-0.5 text-[11px] text-gray-400">
                                            {item.inventory_id}
                                        </p>
                                    </div>
                                </TableCell>

                                <TableCell className="text-sm font-medium text-secondary">
                                    {item.physical_quantity}
                                </TableCell>

                                <TableCell className="text-sm text-gray-600">
                                    {item.reserved_quantity}
                                </TableCell>

                                <TableCell>
                                    <span className="text-sm font-semibold text-secondary">
                                        {item.available_quantity}
                                    </span>
                                </TableCell>

                                <TableCell>
                                    <StockStatusBadge
                                        availableQuantity={
                                            item.available_quantity
                                        }
                                        reorderLevel={
                                            item.reorder_level
                                        }
                                    />
                                </TableCell>

                                <TableCell className="text-sm font-medium text-secondary">
                                    {formatPrice(item.price)}
                                </TableCell>

                                <TableCell>
                                    {item.online_visibility ? (
                                        <Badge
                                            variant="outline"
                                            className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
                                        >
                                            Online
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="outline"
                                            className="rounded-full border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600"
                                        >
                                            Offline
                                        </Badge>
                                    )}
                                </TableCell>

                                <TableCell className="text-sm text-gray-600">
                                    {item.reorder_level}
                                </TableCell>

                                <TableCell className="text-xs text-gray-500">
                                    {formatLastUpdated(
                                        item.last_updated
                                    )}
                                </TableCell>

                                <TableCell className="text-right">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onEdit(item)}
                                        className="h-9 gap-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-primary/5 hover:text-primary"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Edit
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}