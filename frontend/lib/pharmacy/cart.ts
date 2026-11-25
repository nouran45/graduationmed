import { apiJson } from "@/lib/auth-client"

export interface CartLine {
    pharmacy_id: string
    product_id: string
    pharmacy_name: string
    product_name: string
    quantity: number
    unit_price_piastres: number
}

export interface Cart {
    revision: number
    lines: CartLine[]
}

export function getCart(): Promise<Cart> {
    return apiJson<Cart>("/api/cart", { cache: "no-store" })
}

export function setCartQuantity(
    cart: Cart,
    pharmacyId: string,
    productId: string,
    quantity: number,
): Promise<Cart> {
    return apiJson<Cart>("/api/cart/items", {
        method: "PATCH",
        cache: "no-store",
        body: JSON.stringify({
            pharmacy_id: pharmacyId,
            product_id: productId,
            quantity,
            expected_revision: cart.revision,
        }),
    })
}