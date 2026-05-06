"use client"

import { motion } from "@/components/motion"
import { Star } from 'lucide-react'

interface TestimonialCardProps {
  name: string
  role: string
  content: string
  rating: number
  avatar?: string
}

export function TestimonialCard({ name, role, content, rating, avatar }: TestimonialCardProps) {
  // Safe fallbacks for undefined values
  const safeName = name || "Anonymous"
  const safeRole = role || "User"
  const safeContent = content || ""
  const safeRating = Math.max(0, Math.min(5, rating || 0)) // Ensure rating is between 0-5

  return (
    <motion.div
      className="flex flex-col space-y-4 rounded-xl border bg-background p-6 shadow-sm transition-all hover:shadow-md relative overflow-hidden"
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-1 mb-2">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < safeRating ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
          />
        ))}
      </div>
      <div className="relative z-10">
        <p className="text-muted-foreground italic">"{safeContent}"</p>
      </div>
      <div className="flex items-center gap-3 mt-auto pt-4 border-t">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          {avatar ? (
            <img src={avatar || "/placeholder.svg"} alt={safeName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <span className="text-primary font-medium">{safeName.charAt(0)}</span>
          )}
        </div>
        <div>
          <p className="font-medium">{safeName}</p>
          <p className="text-sm text-muted-foreground">{safeRole}</p>
        </div>
      </div>
    </motion.div>
  )
}