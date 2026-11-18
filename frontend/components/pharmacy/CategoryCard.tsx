"use client"

import Link from "next/link"
import {
    ArrowRight,
    Baby,
    Droplets,
    HeartPulse,
    Pill,
    Sparkles,
    Stethoscope,
    Thermometer,
    Package,
} from "lucide-react"

const icons = [
    { match: ["baby", "milk", "infant"], icon: Baby },
    { match: ["drop", "solution", "spray"], icon: Droplets },
    { match: ["heart", "cardio"], icon: HeartPulse },
    { match: ["cosmetic", "make up", "perfum", "beauty"], icon: Sparkles },
    { match: ["tool", "device", "equipment"], icon: Stethoscope },
    { match: ["temperature", "thermometer"], icon: Thermometer },
    { match: ["tablet", "capsule", "medicine", "injection"], icon: Pill },
]

type CategoryCardProps = {
    name: string
    slug: string
    description?: string
    icon?: string
    productCount?: number
    pharmacyCount?: number
}

export default function CategoryCard({
    name,
    slug,
    description,
    productCount,
    pharmacyCount,
}: CategoryCardProps) {
    const normalizedName = name.toLowerCase()

    const Icon =
        icons.find((entry) =>
            entry.match.some((word) => normalizedName.includes(word))
        )?.icon ?? Package

    return (
        <Link
            href={`/pharmacy?category=${encodeURIComponent(slug)}`}
            className="group rounded-2xl border border-gray-100 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg"
        >
            <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                </div>

                <ArrowRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>

            <h3 className="mt-5 text-sm font-bold text-secondary">
                {name}
            </h3>

            {description && (
                <p className="mt-1.5 text-xs leading-5 text-gray-400">
                    {description}
                </p>
            )}

            {(typeof productCount === "number" ||
                typeof pharmacyCount === "number") && (
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400">
                    {typeof productCount === "number" && (
                        <span>
                            {productCount.toLocaleString("en-EG")} products
                        </span>
                    )}
                    {typeof pharmacyCount === "number" && (
                        <span>
                            {pharmacyCount.toLocaleString("en-EG")} pharmacies
                        </span>
                    )}
                </div>
            )}
        </Link>
    )
}
