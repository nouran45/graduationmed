"use client"

import { motion } from "@/components/motion"

export function SymptomTimeline() {
  const timelineEvents = [
    {
      date: "3 days ago",
      title: "Symptoms Started",
      description: "Initial redness and mild itching appeared",
    },
    {
      date: "2 days ago",
      title: "Symptoms Worsened",
      description: "Increased itching and development of small bumps",
    },
    {
      date: "1 day ago",
      title: "New Areas Affected",
      description: "Spread to additional areas with more intense itching",
    },
    {
      date: "Today",
      title: "Current State",
      description: "Redness, swelling, and severe itching in multiple areas",
    },
  ]

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted"></div>

      <div className="space-y-6">
        {timelineEvents.map((event, index) => (
          <motion.div
            key={index}
            className="relative pl-10"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="absolute left-0 top-1.5 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
            </div>
            <div className="text-xs text-muted-foreground mb-1">{event.date}</div>
            <h4 className="text-sm font-medium">{event.title}</h4>
            <p className="text-sm text-muted-foreground">{event.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

