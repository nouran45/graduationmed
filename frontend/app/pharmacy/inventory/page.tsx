"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
    AlertTriangle,
    Boxes,
    PackageX,
    RefreshCw,
    Search,
} from "lucide-react"

import type { InventoryItem } from "@/lib/inventory-api"
import {
    getInventory,
    updateInventoryDetails,
    updateInventoryQuantity,
} from "@/lib/inventory-api"

import InventoryTable from "@/components/inventory/inventory-table"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"


type StockFilter =
    | "all"
    | "in_stock"
    | "low_stock"
    | "out_of_stock"

type VisibilityFilter =
    | "all"
    | "online"
    | "offline"


const DEV_BRANCH_ID =
    process.env.NEXT_PUBLIC_P4_BRANCH_ID || ""

const DEV_ACTOR_ID =
    process.env.NEXT_PUBLIC_P4_ACTOR_ID || ""


function getStockState(
    item: InventoryItem
): Exclude<StockFilter, "all"> {
    if (item.available_quantity <= 0) {
        return "out_of_stock"
    }

    if (
        item.available_quantity <=
        item.reorder_level
    ) {
        return "low_stock"
    }

    return "in_stock"
}


export default function PharmacyInventoryPage() {
    const [items, setItems] = useState<
        InventoryItem[]
    >([])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<
        string | null
    >(null)

    const [search, setSearch] = useState("")
    const [stockFilter, setStockFilter] =
        useState<StockFilter>("all")

    const [visibilityFilter, setVisibilityFilter] =
        useState<VisibilityFilter>("all")

    const [editingItem, setEditingItem] =
        useState<InventoryItem | null>(null)

    const [editPhysical, setEditPhysical] =
        useState("")

    const [editPrice, setEditPrice] =
        useState("")

    const [editReorderLevel, setEditReorderLevel] =
        useState("")

    const [editVisibility, setEditVisibility] =
        useState(true)

    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<
        string | null
    >(null)


    const loadInventory = useCallback(
        async (signal?: AbortSignal) => {
            if (!DEV_BRANCH_ID) {
                setError(
                    "Inventory development branch is not configured."
                )
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setError(null)

                const result = await getInventory(
                    {
                        branchId: DEV_BRANCH_ID,
                    },
                    signal
                )

                setItems(result)
            } catch (err) {
                if (
                    err instanceof DOMException &&
                    err.name === "AbortError"
                ) {
                    return
                }

                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load inventory."
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

        loadInventory(controller.signal)

        return () => {
            controller.abort()
        }
    }, [loadInventory])


    const filteredItems = useMemo(() => {
        const normalizedSearch =
            search.trim().toLowerCase()

        return items.filter((item) => {
            const matchesSearch =
                !normalizedSearch ||
                item.product_id
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                item.inventory_id
                    .toLowerCase()
                    .includes(normalizedSearch)

            const state =
                getStockState(item)

            const matchesStock =
                stockFilter === "all" ||
                state === stockFilter

            const matchesVisibility =
                visibilityFilter === "all" ||
                (visibilityFilter === "online" &&
                    item.online_visibility) ||
                (visibilityFilter === "offline" &&
                    !item.online_visibility)

            return (
                matchesSearch &&
                matchesStock &&
                matchesVisibility
            )
        })
    }, [
        items,
        search,
        stockFilter,
        visibilityFilter,
    ])


    const totalItems = items.length

    const lowStockItems = items.filter(
        (item) =>
            item.available_quantity > 0 &&
            item.available_quantity <=
                item.reorder_level
    ).length

    const outOfStockItems = items.filter(
        (item) =>
            item.available_quantity <= 0
    ).length


    function openEdit(item: InventoryItem) {
        setEditingItem(item)

        setEditPhysical(
            String(item.physical_quantity)
        )

        setEditPrice(String(item.price))

        setEditReorderLevel(
            String(item.reorder_level)
        )

        setEditVisibility(
            item.online_visibility
        )

        setSaveError(null)
    }


    function closeEdit() {
        if (saving) {
            return
        }

        setEditingItem(null)
        setSaveError(null)
    }


    async function handleSave() {
        if (!editingItem) {
            return
        }

        if (!DEV_BRANCH_ID || !DEV_ACTOR_ID) {
            setSaveError(
                "Inventory development identity is not configured."
            )
            return
        }

        const physicalQuantity =
            Number(editPhysical)

        const price =
            Number(editPrice)

        const reorderLevel =
            Number(editReorderLevel)

        if (
            !Number.isInteger(
                physicalQuantity
            ) ||
            physicalQuantity < 0
        ) {
            setSaveError(
                "Physical quantity must be a whole number greater than or equal to 0."
            )
            return
        }

        if (
            !Number.isFinite(price) ||
            price < 0
        ) {
            setSaveError(
                "Price must be greater than or equal to 0."
            )
            return
        }

        if (
            !Number.isInteger(
                reorderLevel
            ) ||
            reorderLevel < 0
        ) {
            setSaveError(
                "Reorder level must be a whole number greater than or equal to 0."
            )
            return
        }

        try {
            setSaving(true)
            setSaveError(null)

            let updatedItem =
                editingItem

            if (
                physicalQuantity !==
                editingItem.physical_quantity
            ) {
                updatedItem =
                    await updateInventoryQuantity(
                        editingItem.inventory_id,
                        {
                            physical_quantity:
                                physicalQuantity,
                        },
                        {
                            branchId:
                                DEV_BRANCH_ID,
                            actorId:
                                DEV_ACTOR_ID,
                        }
                    )
            }

            const detailsChanged =
                price !== editingItem.price ||
                reorderLevel !==
                    editingItem.reorder_level ||
                editVisibility !==
                    editingItem.online_visibility

            if (detailsChanged) {
                updatedItem =
                    await updateInventoryDetails(
                        editingItem.inventory_id,
                        {
                            price,
                            reorder_level:
                                reorderLevel,
                            online_visibility:
                                editVisibility,
                        },
                        {
                            branchId:
                                DEV_BRANCH_ID,
                        }
                    )
            }

            setItems((current) =>
                current.map((item) =>
                    item.inventory_id ===
                    updatedItem.inventory_id
                        ? updatedItem
                        : item
                )
            )

            setEditingItem(null)
        } catch (err) {
            setSaveError(
                err instanceof Error
                    ? err.message
                    : "Unable to update inventory."
            )
        } finally {
            setSaving(false)
        }
    }


    return (
        <div className="min-h-screen bg-white text-secondary">
            <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-xl">
                <div className="container">
                    <div className="flex min-h-[70px] items-center justify-between gap-4">
                        <div>
                            <p className="text-lg font-bold tracking-tight text-secondary">
                                Medi
                                <span className="text-primary">
                                    Check
                                </span>
                            </p>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                loadInventory()
                            }
                            disabled={loading}
                            className="rounded-xl"
                        >
                            <RefreshCw
                                className={`mr-2 h-4 w-4 ${
                                    loading
                                        ? "animate-spin"
                                        : ""
                                }`}
                            />

                            Refresh
                        </Button>
                    </div>
                </div>
            </header>


            <main className="container py-8 sm:py-10">
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                        Pharmacy Operations
                    </p>

                    <h1 className="text-3xl font-semibold tracking-[-0.03em] text-secondary">
                        Inventory
                    </h1>

                    <p className="max-w-2xl text-sm leading-6 text-gray-500">
                        Monitor physical stock,
                        reservations, availability,
                        pricing, reorder levels and
                        online visibility.
                    </p>
                </div>


                {/* Stats */}
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    <Card className="rounded-2xl border-gray-100 p-5 shadow-none">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500">
                                    Total products
                                </p>

                                <p className="mt-2 text-3xl font-semibold tracking-tight text-secondary">
                                    {totalItems}
                                </p>
                            </div>

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                <Boxes className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                    </Card>


                    <Card className="rounded-2xl border-gray-100 p-5 shadow-none">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500">
                                    Low stock
                                </p>

                                <p className="mt-2 text-3xl font-semibold tracking-tight text-secondary">
                                    {lowStockItems}
                                </p>
                            </div>

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                            </div>
                        </div>
                    </Card>


                    <Card className="rounded-2xl border-gray-100 p-5 shadow-none">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500">
                                    Out of stock
                                </p>

                                <p className="mt-2 text-3xl font-semibold tracking-tight text-secondary">
                                    {outOfStockItems}
                                </p>
                            </div>

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                                <PackageX className="h-5 w-5 text-red-600" />
                            </div>
                        </div>
                    </Card>
                </div>


                {/* Toolbar */}
                <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                        <Input
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Search product or inventory ID..."
                            className="h-11 rounded-xl border-gray-200 pl-10"
                        />
                    </div>


                    <Select
                        value={stockFilter}
                        onValueChange={(value) =>
                            setStockFilter(
                                value as StockFilter
                            )
                        }
                    >
                        <SelectTrigger className="h-11 w-full rounded-xl lg:w-[180px]">
                            <SelectValue placeholder="Stock status" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="all">
                                All stock
                            </SelectItem>

                            <SelectItem value="in_stock">
                                In stock
                            </SelectItem>

                            <SelectItem value="low_stock">
                                Low stock
                            </SelectItem>

                            <SelectItem value="out_of_stock">
                                Out of stock
                            </SelectItem>
                        </SelectContent>
                    </Select>


                    <Select
                        value={
                            visibilityFilter
                        }
                        onValueChange={(value) =>
                            setVisibilityFilter(
                                value as VisibilityFilter
                            )
                        }
                    >
                        <SelectTrigger className="h-11 w-full rounded-xl lg:w-[180px]">
                            <SelectValue placeholder="Visibility" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="all">
                                All visibility
                            </SelectItem>

                            <SelectItem value="online">
                                Online
                            </SelectItem>

                            <SelectItem value="offline">
                                Offline
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>


                {/* Content */}
                <div className="mt-5">
                    {loading ? (
                        <div className="space-y-3 rounded-2xl border border-gray-100 p-5">
                            {Array.from({
                                length: 6,
                            }).map((_, index) => (
                                <Skeleton
                                    key={index}
                                    className="h-12 w-full rounded-xl"
                                />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50/40 px-6 text-center">
                            <AlertTriangle className="h-7 w-7 text-red-500" />

                            <h2 className="mt-4 text-sm font-semibold text-secondary">
                                Unable to load inventory
                            </h2>

                            <p className="mt-1 max-w-md text-xs leading-5 text-gray-500">
                                {error}
                            </p>

                            <Button
                                type="button"
                                onClick={() =>
                                    loadInventory()
                                }
                                className="mt-5 rounded-xl"
                            >
                                Try again
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs text-gray-500">
                                    Showing{" "}
                                    <span className="font-semibold text-secondary">
                                        {
                                            filteredItems.length
                                        }
                                    </span>{" "}
                                    of{" "}
                                    <span className="font-semibold text-secondary">
                                        {items.length}
                                    </span>{" "}
                                    inventory items
                                </p>
                            </div>

                            <InventoryTable
                                items={
                                    filteredItems
                                }
                                onEdit={openEdit}
                            />
                        </>
                    )}
                </div>
            </main>


            {/* Edit Inventory */}
            <Dialog
                open={Boolean(editingItem)}
                onOpenChange={(open) => {
                    if (!open) {
                        closeEdit()
                    }
                }}
            >
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>
                            Edit inventory
                        </DialogTitle>

                        <DialogDescription>
                            Update stock and
                            operational settings for{" "}
                            <span className="font-medium text-secondary">
                                {
                                    editingItem?.product_id
                                }
                            </span>
                            .
                        </DialogDescription>
                    </DialogHeader>


                    <div className="grid gap-5 py-3">
                        <div className="grid gap-2">
                            <Label htmlFor="physicalQuantity">
                                Physical quantity
                            </Label>

                            <Input
                                id="physicalQuantity"
                                type="number"
                                min={0}
                                step={1}
                                value={editPhysical}
                                onChange={(event) =>
                                    setEditPhysical(
                                        event.target.value
                                    )
                                }
                            />

                            {editingItem && (
                                <p className="text-[11px] text-gray-400">
                                    Reserved:{" "}
                                    {
                                        editingItem.reserved_quantity
                                    }
                                    . Physical stock
                                    cannot be lower than
                                    reserved stock.
                                </p>
                            )}
                        </div>


                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="price">
                                    Price
                                </Label>

                                <Input
                                    id="price"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={
                                        editPrice
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setEditPrice(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />
                            </div>


                            <div className="grid gap-2">
                                <Label htmlFor="reorderLevel">
                                    Reorder level
                                </Label>

                                <Input
                                    id="reorderLevel"
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={
                                        editReorderLevel
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setEditReorderLevel(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />
                            </div>
                        </div>


                        <div className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                            <div>
                                <Label htmlFor="visibility">
                                    Online visibility
                                </Label>

                                <p className="mt-1 text-xs text-gray-400">
                                    Allow this stock item
                                    to appear as available
                                    online.
                                </p>
                            </div>

                            <Switch
                                id="visibility"
                                checked={
                                    editVisibility
                                }
                                onCheckedChange={
                                    setEditVisibility
                                }
                            />
                        </div>


                        {saveError && (
                            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
                                {saveError}
                            </div>
                        )}
                    </div>


                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={closeEdit}
                            disabled={saving}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded-xl"
                        >
                            {saving
                                ? "Saving..."
                                : "Save changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}