import Link from "next/link"
import { ChevronRight, ShieldCheck } from "lucide-react"
import { SearchBox } from "./search-box"

export function PharmacyShell({ children, hideSearch = false }: { children: React.ReactNode; hideSearch?: boolean }) {
    return (
        <div className="min-h-screen bg-gray-50/60 text-secondary">
            <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-xl">
                <div className="container flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
                    <Link href="/pharmacy" className="shrink-0 text-xl font-bold tracking-tight">
                        Medi<span className="text-primary">Check</span>
                        <span className="ml-2 hidden text-xs font-semibold uppercase tracking-widest text-gray-400 sm:inline">Pharmacy</span>
                    </Link>
                    {!hideSearch && <div className="order-3 w-full lg:order-none lg:max-w-xl lg:flex-1"><SearchBox /></div>}
                    <nav className="ml-auto flex items-center gap-5 text-sm font-medium text-gray-500">
                        <Link href="/pharmacy#categories" className="hover:text-secondary">Categories</Link>
                        <Link href="/pharmacy#deals" className="hover:text-secondary">Offers</Link>
                        <Link href="/pharmacy#pharmacies" className="hover:text-secondary">Pharmacies</Link>
                        <Link href="/" className="hidden hover:text-secondary sm:block">ShifAI</Link>
                    </nav>
                </div>
            </header>

            {children}

            <footer className="mt-12 border-t border-gray-100 bg-white">
                <div className="container flex items-start gap-3 py-8 text-xs leading-5 text-gray-500">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p>
                        Prices and availability are reported by each pharmacy and synchronised periodically; stock marked “not confirmed”
                        or “outdated” should be verified with the pharmacy. Information here is not medical advice.
                    </p>
                </div>
            </footer>
        </div>
    )
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
    return (
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
            {items.map((item, i) => (
                <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight className="h-3 w-3" />}
                    {item.href ? <Link href={item.href} className="hover:text-primary">{item.label}</Link> : <span className="max-w-[40ch] truncate text-gray-600">{item.label}</span>}
                </span>
            ))}
        </nav>
    )
}