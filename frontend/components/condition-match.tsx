"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "@/components/motion"

import { Button } from "@/components/ui/button"

interface ConditionMatchProps {
  name: string
  matchPercentage: number
  description: string
  symptoms: string[]
  learnMoreUrl: string
}

export function ConditionMatch({ name, matchPercentage, description, symptoms, learnMoreUrl }: ConditionMatchProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      className="rounded-xl border bg-background overflow-hidden shadow-sm hover:shadow-md transition-all"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-bold">{name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-sm font-medium text-primary">{matchPercentage}% match</div>
              <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${matchPercentage}%` }}></div>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span>Show More</span>
              </>
            )}
          </Button>
        </div>

        <p className="text-muted-foreground">{description}</p>

        <AnimatePresence>
          {expanded && (
            <motion.div
              className="mt-6 space-y-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div>
                <h4 className="font-medium mb-2">Common Symptoms</h4>
                <ul className="space-y-2">
                  {symptoms.map((symptom, index) => (
                    <motion.li
                      key={index}
                      className="flex items-start gap-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                        <ChevronUp className="h-3 w-3 text-primary rotate-90" />
                      </div>
                      <span className="text-sm">{symptom}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Possible Causes</h4>
                <p className="text-sm text-muted-foreground">
                  This condition can be triggered by exposure to irritants or allergens such as soaps, cosmetics,
                  fragrances, jewelry, plants, and industrial chemicals. It can also be caused by an allergic reaction
                  to certain foods, medications, or environmental factors.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Treatment Options</h4>
                <p className="text-sm text-muted-foreground">
                  Treatment typically involves identifying and avoiding the cause of your reaction. Applying anti-itch
                  creams and taking oral medications may help reduce inflammation and relieve itching. In severe cases,
                  your doctor might prescribe stronger medications.
                </p>
              </div>

              <div className="pt-4">
                <Link href={learnMoreUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2 w-full">
                    Learn More About {name}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-1 w-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${matchPercentage}%` }}></div>
      </div>
    </motion.div>
  )
}

