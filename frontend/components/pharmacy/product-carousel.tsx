"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { MarketProduct } from "@/lib/pharmacy/types"
import { ProductCard, ProductCardSkeleton } from "./product-card"
import { Reveal } from "./motion"

/**
 * Every slot is sized so a FULL row is visible at rest (2 / 3 / 4 / 5 cards by screen width, gaps included).
 * The arrows then page through the remaining products one full row at a time.
 */
const SLOT =
    "shrink-0 snap-start basis-[calc((100%_-_12px)/2)] sm:basis-[calc((100%_-_24px)/3)] lg:basis-[calc((100%_-_36px)/4)] xl:basis-[calc((100%_-_48px)/5)]"

export function Carousel({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null)
    const [edge, setEdge] = useState({ start: true, end: true })

    const update = useCallback(() => {
        const el = ref.current
        if (!el) return
        const start = el.scrollLeft <= 4
        const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
        // Return the previous object when nothing changed so React bails out (prevents an infinite render loop).
        setEdge((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }, [])

    useEffect(() => {
        update() // content or size may have changed after any render; safe now because update() bails out
    })

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [update])

    const page = (dir: 1 | -1) => {
        const el = ref.current
        if (el) el.scrollBy({ left: dir * (el.clientWidth + 12), behavior: "smooth" })
    }

    const arrow =
        "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-gray-100 transition hover:scale-105 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-0 md:flex"

    return (
        <div className="relative">
            <button type="button" aria-label="Previous products" disabled={edge.start} onClick={() => page(-1)} className={`${arrow} -left-3`}>
                <ChevronLeft className="h-5 w-5" />
            </button>
            <div
                ref={ref}
                onScroll={update}
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {children}
            </div>
            <button type="button" aria-label="Next products" disabled={edge.end} onClick={() => page(1)} className={`${arrow} -right-3`}>
                <ChevronRight className="h-5 w-5" />
            </button>
        </div>
    )
}

export function ProductRow({
    id, title, subtitle, href, hrefLabel = "See all", products, loading, bare = false,
}: {
    id?: string; title: string; subtitle?: string; href?: string; hrefLabel?: string
    products: MarketProduct[]; loading?: boolean; bare?: boolean
}) {
    if (!loading && products.length === 0) return null
    const body = (
        <>
            <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-secondary sm:text-2xl">{title}</h2>
                    {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
                </div>
                {href && (
                    <Link href={href} className="group flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
                        <span className="group-hover:underline">{hrefLabel}</span>
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                )}
            </div>
            <Carousel>
                {loading
                    ? Array.from({ length: 5 }, (_, i) => <div key={i} className={SLOT}><ProductCardSkeleton /></div>)
                    : products.slice(0, 20).map((p, i) => (
                        <Reveal key={p.key} delay={Math.min(i, 5) * 60} className={`flex ${SLOT} [&>a]:h-full [&>a]:w-full`}>
                            <ProductCard product={p} />
                        </Reveal>
                    ))}
            </Carousel>
        </>
    )
    return (
        <section id={id} className="scroll-mt-24 py-7">
            {bare ? body : <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">{body}</div>}
        </section>
    )
}