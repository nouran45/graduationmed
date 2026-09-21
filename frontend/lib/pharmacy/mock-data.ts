export type PharmacyProduct = {
    id: string
    name: string
    genericName: string
    manufacturer: string
    strength: string
    dosageForm: string
    packageSize: string
    category: string
    categorySlug: string
    description: string
    image: string
    price: number
    originalPrice?: number
    discount?: number
    pharmacy: string
    pharmacyLocation: string
    available: boolean
    stock: number
    prescriptionRequired: boolean
    rating: number
    reviewCount: number
    activeIngredients: string[]
    tags: string[]
}

export type PharmacyOffer = {
    pharmacy: string
    location: string
    price: number
    originalPrice?: number
    available: boolean
    stock: number
    delivery: string
}

export const pharmacyCategories = [
    {
        name: "Pain Relief",
        slug: "pain-relief",
        description: "Pain and fever relief products",
        icon: "HeartPulse",
    },
    {
        name: "Cold & Flu",
        slug: "cold-flu",
        description: "Cold, flu and respiratory care",
        icon: "Thermometer",
    },
    {
        name: "Vitamins",
        slug: "vitamins",
        description: "Vitamins and supplements",
        icon: "Pill",
    },
    {
        name: "Skincare",
        slug: "skincare",
        description: "Skin and beauty care",
        icon: "Sparkles",
    },
    {
        name: "Personal Care",
        slug: "personal-care",
        description: "Everyday personal care",
        icon: "Droplets",
    },
    {
        name: "Baby Care",
        slug: "baby-care",
        description: "Products for babies and children",
        icon: "Baby",
    },
    {
        name: "First Aid",
        slug: "first-aid",
        description: "First aid and wound care",
        icon: "Plus",
    },
    {
        name: "Medical Supplies",
        slug: "medical-supplies",
        description: "Healthcare and medical supplies",
        icon: "Stethoscope",
    },
]

export const pharmacyProducts: PharmacyProduct[] = [
    {
        id: "med-001",
        name: "Panadol Extra",
        genericName: "Paracetamol + Caffeine",
        manufacturer: "GSK",
        strength: "500 mg",
        dosageForm: "Tablets",
        packageSize: "20 tablets",
        category: "Pain Relief",
        categorySlug: "pain-relief",
        description:
            "Panadol Extra is a commonly available pain relief product. Product information, usage instructions, and warnings should be provided from the verified product source.",
        image: "/images/pharmacy/panadol.jpg",
        price: 95,
        originalPrice: 120,
        discount: 21,
        pharmacy: "CarePlus Pharmacy",
        pharmacyLocation: "Alexandria",
        available: true,
        stock: 25,
        prescriptionRequired: false,
        rating: 4.7,
        reviewCount: 128,
        activeIngredients: ["Paracetamol", "Caffeine"],
        tags: ["Pain Relief", "Popular", "Bestseller"],
    },

    {
        id: "med-002",
        name: "Vitamin C 1000mg",
        genericName: "Ascorbic Acid",
        manufacturer: "Nature's Way",
        strength: "1000 mg",
        dosageForm: "Effervescent Tablets",
        packageSize: "20 tablets",
        category: "Vitamins",
        categorySlug: "vitamins",
        description:
            "Vitamin C supplement in effervescent tablet form. Product information should be verified against the manufacturer's or pharmacy's source.",
        image: "/images/pharmacy/vitamin-c.jpg",
        price: 180,
        originalPrice: 220,
        discount: 18,
        pharmacy: "HealthLine Pharmacy",
        pharmacyLocation: "Alexandria",
        available: true,
        stock: 18,
        prescriptionRequired: false,
        rating: 4.6,
        reviewCount: 94,
        activeIngredients: ["Vitamin C"],
        tags: ["Vitamins", "Wellness"],
    },

    {
        id: "med-003",
        name: "Daily Multivitamin",
        genericName: "Multivitamin Formula",
        manufacturer: "Solgar",
        strength: "Daily Formula",
        dosageForm: "Tablets",
        packageSize: "60 tablets",
        category: "Vitamins",
        categorySlug: "vitamins",
        description:
            "A daily multivitamin product containing a combination of vitamins and minerals.",
        image: "/images/pharmacy/multivitamin.jpg",
        price: 420,
        originalPrice: 500,
        discount: 16,
        pharmacy: "LifeCare Pharmacy",
        pharmacyLocation: "Alexandria",
        available: true,
        stock: 12,
        prescriptionRequired: false,
        rating: 4.8,
        reviewCount: 76,
        activeIngredients: ["Multivitamin"],
        tags: ["Vitamins", "Wellness"],
    },

    {
        id: "med-004",
        name: "Moisturizing Cream",
        genericName: "Moisturizing Skin Cream",
        manufacturer: "DermaCare",
        strength: "Daily Care",
        dosageForm: "Cream",
        packageSize: "100 ml",
        category: "Skincare",
        categorySlug: "skincare",
        description:
            "Daily moisturizing cream designed for general skin care.",
        image: "/images/pharmacy/moisturizer.jpg",
        price: 265,
        originalPrice: 310,
        discount: 15,
        pharmacy: "CarePlus Pharmacy",
        pharmacyLocation: "Alexandria",
        available: true,
        stock: 9,
        prescriptionRequired: false,
        rating: 4.5,
        reviewCount: 63,
        activeIngredients: ["Moisturizing Complex"],
        tags: ["Skincare", "Popular"],
    },

    {
        id: "med-005",
        name: "Cold & Flu Relief",
        genericName: "Cold and Flu Formula",
        manufacturer: "HealthCare",
        strength: "Standard",
        dosageForm: "Tablets",
        packageSize: "16 tablets",
        category: "Cold & Flu",
        categorySlug: "cold-flu",
        description:
            "Cold and flu relief product. Always follow the verified product label and professional guidance.",
        image: "/images/pharmacy/cold-flu.jpg",
        price: 145,
        pharmacy: "HealthLine Pharmacy",
        pharmacyLocation: "Alexandria",
        available: true,
        stock: 20,
        prescriptionRequired: false,
        rating: 4.4,
        reviewCount: 51,
        activeIngredients: ["Combination Formula"],
        tags: ["Cold & Flu"],
    },

    {
        id: "med-006",
        name: "First Aid Kit",
        genericName: "Home First Aid Kit",
        manufacturer: "MediSafe",
        strength: "Standard",
        dosageForm: "Kit",
        packageSize: "1 Kit",
        category: "First Aid",
        categorySlug: "first-aid",
        description:
            "A general-purpose first aid kit containing essential first aid supplies.",
        image: "/images/pharmacy/first-aid.jpg",
        price: 350,
        pharmacy: "MediCare Pharmacy",
        pharmacyLocation: "Alexandria",
        available: true,
        stock: 7,
        prescriptionRequired: false,
        rating: 4.7,
        reviewCount: 42,
        activeIngredients: [],
        tags: ["First Aid"],
    },

    {
        id: "med-007",
        name: "Allergy Relief",
        genericName: "Antihistamine",
        manufacturer: "HealthCare",
        strength: "10 mg",
        dosageForm: "Tablets",
        packageSize: "20 tablets",
        category: "Allergy",
        categorySlug: "allergy",
        description:
            "An allergy relief medicine. Verify the product label and prescription requirements before use.",
        image: "/images/pharmacy/allergy.jpg",
        price: 110,
        pharmacy: "LifeCare Pharmacy",
        pharmacyLocation: "Alexandria",
        available: true,
        stock: 14,
        prescriptionRequired: false,
        rating: 4.3,
        reviewCount: 38,
        activeIngredients: ["Antihistamine"],
        tags: ["Allergy"],
    },

    {
        id: "med-008",
        name: "Prescription Medicine",
        genericName: "Prescription Medication",
        manufacturer: "PharmaCare",
        strength: "10 mg",
        dosageForm: "Tablets",
        packageSize: "30 tablets",
        category: "Prescription",
        categorySlug: "prescription",
        description:
            "Prescription medicine. A valid prescription may be required before purchase.",
        image: "/images/pharmacy/prescription.jpg",
        price: 280,
        pharmacy: "MediCare Pharmacy",
        pharmacyLocation: "Alexandria",
        available: true,
        stock: 5,
        prescriptionRequired: true,
        rating: 4.2,
        reviewCount: 21,
        activeIngredients: ["Prescription Ingredient"],
        tags: ["Prescription"],
    },
]

export const pharmacyOffers: Record<string, PharmacyOffer[]> = {
    "med-001": [
        {
            pharmacy: "CarePlus Pharmacy",
            location: "Alexandria",
            price: 95,
            originalPrice: 120,
            available: true,
            stock: 25,
            delivery: "Same-day delivery",
        },
        {
            pharmacy: "HealthLine Pharmacy",
            location: "Alexandria",
            price: 98,
            available: true,
            stock: 14,
            delivery: "1–2 days",
        },
        {
            pharmacy: "MediCare Pharmacy",
            location: "Alexandria",
            price: 92,
            available: false,
            stock: 0,
            delivery: "Unavailable",
        },
    ],

    "med-002": [
        {
            pharmacy: "HealthLine Pharmacy",
            location: "Alexandria",
            price: 180,
            originalPrice: 220,
            available: true,
            stock: 18,
            delivery: "Same-day delivery",
        },
        {
            pharmacy: "CarePlus Pharmacy",
            location: "Alexandria",
            price: 185,
            available: true,
            stock: 8,
            delivery: "1–2 days",
        },
    ],
}

export function getProductById(id: string) {
    return pharmacyProducts.find((product) => product.id === id)
}

export function getProductsByCategory(categorySlug: string) {
    return pharmacyProducts.filter(
        (product) => product.categorySlug === categorySlug
    )
}

export function searchProducts(query: string) {
    const normalized = query.toLowerCase().trim()

    if (!normalized) {
        return pharmacyProducts
    }

    return pharmacyProducts.filter((product) => {
        return (
            product.name.toLowerCase().includes(normalized) ||
            product.genericName.toLowerCase().includes(normalized) ||
            product.manufacturer.toLowerCase().includes(normalized) ||
            product.category.toLowerCase().includes(normalized) ||
            product.activeIngredients.some((ingredient) =>
                ingredient.toLowerCase().includes(normalized)
            )
        )
    })
}