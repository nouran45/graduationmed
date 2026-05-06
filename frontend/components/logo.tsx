import { Leaf } from "lucide-react"
import Link from "next/link"

interface LogoProps {
  asLink?: boolean
}

export function Logo({ asLink = true }: LogoProps) {
  const LogoContent = () => (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center">
        <Leaf className="h-6 w-6 text-primary" />
      </div>
      <span className="text-xl font-bold text-secondary">ShifAI</ span>
    </div>
  )

  if (asLink) {
    return (
      <Link href="/" className="flex items-center gap-2">
        <LogoContent />
      </Link>
    )
  }

  return <LogoContent />
}
