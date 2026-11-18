"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { fetchProducts, getKnownPharmacies, registerPharmacies } from "@/lib/pharmacy/api"
import { useAsync } from "@/lib/pharmacy/hooks"
import { isFresh, timeAgo } from "@/lib/pharmacy/marketplace"
import type { ApiProduct } from "@/lib/pharmacy/types"

function PharmacyCard({ id, name, seedSync }: { id: string; name: string; seedSync: string | null }) {
    const { data, loading } = useAsync((s) => fetchProducts({ pharmacy_id: id, limit: 20 }, s), `ph-${id}`)
    const syncs = [seedSync, ...(data?.items ?? []).map((i) => i.last_synced_at ?? null)].filter(Boolean) as string[]
    const latest = syncs.length ? syncs.reduce((a, b) => (new Date(b) > new Date(a) ? b : a)) : null
    const status = !latest
        ? { label: "Inventory sync unknown", cls: "bg-gray-100 text-gray-600", dot: "bg-gray-400" }
        : isFresh(latest)
            ? { label: "Inventory up to date", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" }
            : { label: "Inventory may be outdated", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" }

    return (
        <Link href={`/pharmacy/store/${encodeURIComponent(id)}`} className="group block rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
            <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary" aria-hidden>
                    {name.trim().charAt(0).toUpperCase()}
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-primary" />
            </div>
            <h3 className="mt-4 truncate text-sm font-bold text-secondary group-hover:text-primary">{name}</h3>
            <p className="mt-1 text-xs text-gray-500">
                {loading ? <span className="inline-block h-3 w-24 animate-pulse rounded bg-gray-100" /> : data ? `${data.total.toLocaleString()} products` : "Product count unavailable"}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.cls}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}
                </span>
                {latest && <span className="text-[11px] text-gray-400">Synced {timeAgo(latest)}</span>}
            </div>
        </Link>
    )
}

export function PharmacyDirectory({ seed }: { seed: ApiProduct[] }) {
    const pharmacies = useMemo(() => { registerPharmacies(seed); return getKnownPharmacies() }, [seed])
    const seedSync = (id: string) => {
        const t = seed.filter((p) => String(p.pharmacy_id) === id && p.last_synced_at).map((p) => p.last_synced_at as string)
        return t.length ? t.reduce((a, b) => (new Date(b) > new Date(a) ? b : a)) : null
    }
    if (!pharmacies.length) {
        return <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No pharmacies were found in the catalogue response.</p>
    }
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pharmacies.slice(0, 12).map((p) => <PharmacyCard key={p.id} id={p.id} name={p.name} seedSync={seedSync(p.id)} />)}
        </div>
    )
}