"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { PharmacyShell } from "@/components/pharmacy/shell"
import { getCart, setCartQuantity } from "@/lib/pharmacy/cart"
import type { Cart, CartLine } from "@/lib/pharmacy/cart"

const money = new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
})

export default function CartPage() {
    const [cart, setCart] = useState<Cart | null>(null)
    const [error, setError] = useState("")
    const [busy, setBusy] = useState(false)
    const changing = useRef(false)

    useEffect(() => {
        let current = true
        getCart()
            .then((result) => {
                if (current) setCart(result)
            })
            .catch((err: unknown) => {
                if (current) {
                    setError(err instanceof Error ? err.message : "Could not load your cart.")
                }
            })
        return () => { current = false }
    }, [])

    async function update(line: CartLine, quantity: number) {
        if (!cart || changing.current) return
        changing.current = true
        setBusy(true)
        setError("")
        try {
            setCart(await setCartQuantity(cart, line.pharmacy_id, line.product_id, quantity))
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not update your cart.")
            try {
                setCart(await getCart())
            } catch {
                setError("Could not recover the latest cart. Refresh the page and try again.")
            }
        } finally {
            changing.current = false
            setBusy(false)
        }
    }

    const groups = new Map<string, CartLine[]>()
    for (const line of cart?.lines ?? []) {
        const group = groups.get(line.pharmacy_id) ?? []
        group.push(line)
        groups.set(line.pharmacy_id, group)
    }

    return (
        <PharmacyShell>
            <main className="container mx-auto max-w-3xl space-y-5 px-4 py-8">
                <h1 className="text-2xl font-bold">Your cart</h1>
                <Link href="/pharmacy" className="underline">Continue browsing</Link>
                {error && <p role="alert" className="text-red-700">{error}</p>}
                {!cart && !error && <p role="status">Loading your cart…</p>}
                {cart?.lines.length === 0 && <p>Your cart is empty.</p>}
                {Array.from(groups, ([pharmacyId, lines]) => (
                    <section key={pharmacyId} className="rounded-xl border p-4">
                        <h2 className="font-semibold">{lines[0].pharmacy_name}</h2>
                        <ul className="divide-y">
                            {lines.map((line) => (
                                <li key={line.product_id} className="space-y-2 py-3">
                                    <p>{line.product_name}</p>
                                    <p>{money.format(line.unit_price_piastres / 100)} per pack</p>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <button type="button" disabled={busy || line.quantity <= 1}
                                            className="rounded border px-3 py-1 disabled:opacity-50"
                                            aria-label={`Decrease quantity for ${line.product_name}`}
                                            onClick={() => void update(line, line.quantity - 1)}>−</button>
                                        <span aria-live="polite">{line.quantity}</span>
                                        <button type="button" disabled={busy || line.quantity >= 99}
                                            className="rounded border px-3 py-1 disabled:opacity-50"
                                            aria-label={`Increase quantity for ${line.product_name}`}
                                            onClick={() => void update(line, line.quantity + 1)}>+</button>
                                        <button type="button" disabled={busy}
                                            className="underline disabled:opacity-50"
                                            onClick={() => void update(line, 0)}>Remove</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <p className="font-semibold">
                            Estimated subtotal{" "}
                            {money.format(lines.reduce(
                                (sum, line) => sum + line.unit_price_piastres * line.quantity, 0
                            ) / 100)}
                        </p>
                    </section>
                ))}
            </main>
        </PharmacyShell>
    )
}