// app/api/pharmacy/deals/route.ts
//
// Mock "online pharmacy" API for ShifAI. In production this would call the
// real pharmacy-inventory service; for now it serves a realistic in-memory
// catalog so the homepage (and /pharmacy) can be built and demoed against a
// stable contract. Swap the DATA source for a DB/service call later without
// touching any client code — the response shape is the contract.

import { NextRequest, NextResponse } from "next/server"

export interface PharmacyDeal {
    id: string
    name: string
    brand: string
    category: PharmacyCategory
    pharmacyName: string
    pharmacyArea: string
    price: number
    originalPrice?: number
    discountPercent?: number
    rating: number
    reviewCount: number
    inStock: boolean
    stockCount: number
    prescriptionRequired: boolean
    deliveryEtaMinutes: number
}

export type PharmacyCategory =
    | "Pain Relief"
    | "Vitamins & Supplements"
    | "Skincare"
    | "Cold & Flu"
    | "Diabetes Care"
    | "First Aid"

export const PHARMACY_CATEGORIES: PharmacyCategory[] = [
    "Pain Relief",
    "Vitamins & Supplements",
    "Skincare",
    "Cold & Flu",
    "Diabetes Care",
    "First Aid",
]

// ---------------------------------------------------------------------------
// Catalog (mock data)
// ---------------------------------------------------------------------------
const CATALOG: PharmacyDeal[] = [
    {
        id: "PH-1001",
        name: "Daily Multivitamin, 60 Tablets",
        brand: "Vitaboost",
        category: "Vitamins & Supplements",
        pharmacyName: "MediCare Pharmacy",
        pharmacyArea: "Nasr City",
        price: 95,
        originalPrice: 120,
        discountPercent: 21,
        rating: 4.6,
        reviewCount: 812,
        inStock: true,
        stockCount: 42,
        prescriptionRequired: false,
        deliveryEtaMinutes: 45,
    },
    {
        id: "PH-1002",
        name: "Vitamin C 1000mg, 30 Effervescent Tablets",
        brand: "CitraPlus",
        category: "Vitamins & Supplements",
        pharmacyName: "HealthPlus Pharmacy",
        pharmacyArea: "Maadi",
        price: 120,
        originalPrice: 150,
        discountPercent: 20,
        rating: 4.8,
        reviewCount: 1204,
        inStock: true,
        stockCount: 76,
        prescriptionRequired: false,
        deliveryEtaMinutes: 30,
    },
    {
        id: "PH-1003",
        name: "Deep Moisture Repair Cream, 200ml",
        brand: "DermaCalm",
        category: "Skincare",
        pharmacyName: "Care Pharmacy",
        pharmacyArea: "Heliopolis",
        price: 75,
        originalPrice: 90,
        discountPercent: 17,
        rating: 4.4,
        reviewCount: 356,
        inStock: true,
        stockCount: 19,
        prescriptionRequired: false,
        deliveryEtaMinutes: 50,
    },
    {
        id: "PH-1004",
        name: "Pain Relief Tablets, 24 Count",
        brand: "FlexRelief",
        category: "Pain Relief",
        pharmacyName: "MediCare Pharmacy",
        pharmacyArea: "Nasr City",
        price: 80,
        originalPrice: 100,
        discountPercent: 20,
        rating: 4.3,
        reviewCount: 289,
        inStock: true,
        stockCount: 8,
        prescriptionRequired: true,
        deliveryEtaMinutes: 45,
    },
    {
        id: "PH-1005",
        name: "Cold & Flu Relief Syrup, 120ml",
        brand: "ClearBreathe",
        category: "Cold & Flu",
        pharmacyName: "HealthPlus Pharmacy",
        pharmacyArea: "Maadi",
        price: 68,
        rating: 4.2,
        reviewCount: 174,
        inStock: true,
        stockCount: 31,
        prescriptionRequired: false,
        deliveryEtaMinutes: 30,
    },
    {
        id: "PH-1006",
        name: "Blood Glucose Test Strips, 50 Count",
        brand: "GlucoCheck",
        category: "Diabetes Care",
        pharmacyName: "Care Pharmacy",
        pharmacyArea: "Heliopolis",
        price: 340,
        originalPrice: 380,
        discountPercent: 11,
        rating: 4.7,
        reviewCount: 522,
        inStock: true,
        stockCount: 14,
        prescriptionRequired: false,
        deliveryEtaMinutes: 50,
    },
    {
        id: "PH-1007",
        name: "First Aid Kit, 42 Pieces",
        brand: "SafeGuard",
        category: "First Aid",
        pharmacyName: "MediCare Pharmacy",
        pharmacyArea: "Nasr City",
        price: 215,
        originalPrice: 260,
        discountPercent: 17,
        rating: 4.9,
        reviewCount: 98,
        inStock: true,
        stockCount: 23,
        prescriptionRequired: false,
        deliveryEtaMinutes: 45,
    },
    {
        id: "PH-1008",
        name: "Omega-3 Fish Oil, 90 Softgels",
        brand: "Vitaboost",
        category: "Vitamins & Supplements",
        pharmacyName: "HealthPlus Pharmacy",
        pharmacyArea: "Maadi",
        price: 210,
        rating: 4.5,
        reviewCount: 441,
        inStock: false,
        stockCount: 0,
        prescriptionRequired: false,
        deliveryEtaMinutes: 30,
    },
    {
        id: "PH-1009",
        name: "Soothing Sunburn Gel, 150ml",
        brand: "DermaCalm",
        category: "Skincare",
        pharmacyName: "Care Pharmacy",
        pharmacyArea: "Heliopolis",
        price: 58,
        originalPrice: 70,
        discountPercent: 17,
        rating: 4.1,
        reviewCount: 63,
        inStock: true,
        stockCount: 27,
        prescriptionRequired: false,
        deliveryEtaMinutes: 50,
    },
    {
        id: "PH-1010",
        name: "Insulin Pen Needles, 100 Count",
        brand: "GlucoCheck",
        category: "Diabetes Care",
        pharmacyName: "MediCare Pharmacy",
        pharmacyArea: "Nasr City",
        price: 175,
        rating: 4.6,
        reviewCount: 210,
        inStock: true,
        stockCount: 11,
        prescriptionRequired: true,
        deliveryEtaMinutes: 45,
    },
    {
        id: "PH-1011",
        name: "Extra-Strength Headache Relief, 20 Caplets",
        brand: "FlexRelief",
        category: "Pain Relief",
        pharmacyName: "HealthPlus Pharmacy",
        pharmacyArea: "Maadi",
        price: 54,
        originalPrice: 65,
        discountPercent: 17,
        rating: 4.0,
        reviewCount: 132,
        inStock: true,
        stockCount: 55,
        prescriptionRequired: false,
        deliveryEtaMinutes: 30,
    },
    {
        id: "PH-1012",
        name: "Kids' Fever & Cold Syrup, 100ml",
        brand: "ClearBreathe",
        category: "Cold & Flu",
        pharmacyName: "Care Pharmacy",
        pharmacyArea: "Heliopolis",
        price: 62,
        rating: 4.4,
        reviewCount: 87,
        inStock: true,
        stockCount: 18,
        prescriptionRequired: false,
        deliveryEtaMinutes: 50,
    },
]

// Simulate real-world network latency so the client's loading state is
// actually exercised during development instead of resolving instantly.
function simulatedLatency() {
    const ms = 350 + Math.random() * 350
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET(request: NextRequest) {
    await simulatedLatency()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const query = searchParams.get("q")?.trim().toLowerCase()
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? Math.max(1, Math.min(50, Number(limitParam))) : undefined

    let results = CATALOG

    if (category && category !== "all") {
        results = results.filter((deal) => deal.category === category)
    }

    if (query) {
        results = results.filter(
            (deal) =>
                deal.name.toLowerCase().includes(query) ||
                deal.brand.toLowerCase().includes(query) ||
                deal.category.toLowerCase().includes(query)
        )
    }

    // Surface the best discounts first — that's what "Hot Deals" implies.
    results = [...results].sort(
        (a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0)
    )

    const total = results.length
    if (limit) {
        results = results.slice(0, limit)
    }

    return NextResponse.json({
        deals: results,
        total,
        categories: PHARMACY_CATEGORIES,
        generatedAt: new Date().toISOString(),
    })
}