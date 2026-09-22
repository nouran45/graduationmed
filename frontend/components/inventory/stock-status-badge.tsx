import { Badge } from "@/components/ui/badge"


interface StockStatusBadgeProps {
    availableQuantity: number
    reorderLevel: number
}


export default function StockStatusBadge({
    availableQuantity,
    reorderLevel,
}: StockStatusBadgeProps) {
    if (availableQuantity <= 0) {
        return (
            <Badge
                variant="outline"
                className="rounded-full border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700"
            >
                Out of stock
            </Badge>
        )
    }

    if (availableQuantity <= reorderLevel) {
        return (
            <Badge
                variant="outline"
                className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"
            >
                Low stock
            </Badge>
        )
    }

    return (
        <Badge
            variant="outline"
            className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
        >
            In stock
        </Badge>
    )
}