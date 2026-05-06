import { ReactNode } from "react"

export interface FeatureCardProps {
  title: string
  description: string
  icon: ReactNode
  step?: number
}

export function FeatureCard({ title, description, icon, step }: FeatureCardProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-4 p-6 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
      {step && (
        <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold mb-2">
          {step}
        </div>
      )}
      <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center text-primary">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-secondary">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}