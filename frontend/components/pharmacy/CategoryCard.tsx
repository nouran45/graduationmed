"use client"

import Link from "next/link"
import {
    ArrowRight,
    Baby,
    Droplets,
    HeartPulse,
    Pill,
    Plus,
    Sparkles,
    Stethoscope,
    Thermometer,
} from "lucide-react"

const icons = {
    HeartPulse,
    Thermometer,
    Pill,
    Sparkles,
    Droplets,
    Baby,
    Plus,
    Stethoscope,
}

type CategoryCardProps = {
    name: string
    slug: string
    description: string
    icon: string
}

export default function CategoryCard({
    name,
    slug,
    description,
    icon,
}: CategoryCardProps) {
    const Icon =
        icons[icon as keyof typeof icons] ?? Pill

    return (
        <Link
            href={`/pharmacy?category=${slug}`}
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

            <p className="mt-1.5 text-xs leading-5 text-gray-400">
                {description}
            </p>
        </Link>
    )
}