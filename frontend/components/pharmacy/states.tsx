import Link from "next/link"
import { AlertTriangle, SearchX } from "lucide-react"

export function EmptyState({ title, message, href, actionLabel }: { title: string; message?: string; href?: string; actionLabel?: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
            <SearchX className="mx-auto h-9 w-9 text-gray-300" />
            <p className="mt-4 text-base font-bold text-secondary">{title}</p>
            {message && <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-500">{message}</p>}
            {href && (
                <Link href={href} className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
                    {actionLabel ?? "Back to pharmacy"}
                </Link>
            )}
        </div>
    )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
            <p className="mt-3 text-sm font-semibold text-red-700">{message}</p>
            {onRetry && (
                <button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
                    Try again
                </button>
            )}
        </div>
    )
}