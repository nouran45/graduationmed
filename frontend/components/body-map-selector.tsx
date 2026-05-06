"use client"

import { useState } from "react"

export function BodyMapSelector() {
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])

  const bodyParts = [
    { id: "head", label: "Head", top: "5%", left: "50%", width: "10%" },
    { id: "face", label: "Face", top: "10%", left: "50%", width: "8%" },
    { id: "neck", label: "Neck", top: "15%", left: "50%", width: "8%" },
    { id: "chest", label: "Chest", top: "25%", left: "50%", width: "20%" },
    { id: "back", label: "Back", top: "25%", left: "50%", width: "20%" },
    { id: "left-arm", label: "Left Arm", top: "30%", left: "35%", width: "8%" },
    { id: "right-arm", label: "Right Arm", top: "30%", left: "65%", width: "8%" },
    { id: "abdomen", label: "Abdomen", top: "35%", left: "50%", width: "15%" },
    { id: "left-hand", label: "Left Hand", top: "40%", left: "30%", width: "6%" },
    { id: "right-hand", label: "Right Hand", top: "40%", left: "70%", width: "6%" },
    { id: "groin", label: "Groin", top: "45%", left: "50%", width: "10%" },
    { id: "left-leg", label: "Left Leg", top: "60%", left: "45%", width: "8%" },
    { id: "right-leg", label: "Right Leg", top: "60%", left: "55%", width: "8%" },
    { id: "left-foot", label: "Left Foot", top: "85%", left: "45%", width: "6%" },
    { id: "right-foot", label: "Right Foot", top: "85%", left: "55%", width: "6%" },
  ]

  const toggleBodyPart = (id: string) => {
    setSelectedAreas((prev) => (prev.includes(id) ? prev.filter((area) => area !== id) : [...prev, id]))
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <p className="text-gray-600">Click on the body areas where you're experiencing symptoms</p>
      </div>

      <div className="relative mx-auto h-[500px] max-w-[300px] border rounded-lg bg-white">
        <div className="absolute inset-0 bg-gradient-to-b from-muted to-white"></div>

        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full"
          style={{ filter: "drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.1))" }}
        >
          {/* Simple body outline */}
          <path
            d="M50,10 C45,10 40,15 40,20 C40,25 45,30 50,30 C55,30 60,25 60,20 C60,15 55,10 50,10 Z"
            fill="#f1f5f9"
            stroke="#94a3b8"
            strokeWidth="0.5"
          />
          <path
            d="M40,30 L40,45 L35,60 L30,80 L35,90 L40,90 L42,70 L50,70 L58,70 L60,90 L65,90 L70,80 L65,60 L60,45 L60,30 Z"
            fill="#f1f5f9"
            stroke="#94a3b8"
            strokeWidth="0.5"
          />
          <path d="M40,30 L30,50 L35,60 M60,30 L70,50 L65,60" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
        </svg>

        {bodyParts.map((part) => (
          <button
            key={part.id}
            className={`absolute rounded-full transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-colors duration-200 ${
              selectedAreas.includes(part.id) ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
            }`}
            style={{
              top: part.top,
              left: part.left,
              width: part.width,
              height: part.width,
              aspectRatio: "1",
            }}
            onClick={() => toggleBodyPart(part.id)}
          >
            <span className="sr-only">{part.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-secondary mb-3">Selected Areas</h3>
        {selectedAreas.length === 0 ? (
          <p className="text-gray-600 text-sm">
            No areas selected. Click on the body to select areas where you're experiencing symptoms.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedAreas.map((area) => {
              const part = bodyParts.find((p) => p.id === area)
              return (
                <div key={area} className="rounded-full bg-accent px-3 py-1 text-sm text-primary">
                  {part?.label}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
