"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"

export function SymptomForm() {
  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")
  const [duration, setDuration] = useState("")
  const [painLevel, setPainLevel] = useState([3])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="age" className="text-secondary">
            Age
          </Label>
          <Input
            id="age"
            type="number"
            placeholder="Enter your age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="border-gray-300 focus:border-primary focus:ring-primary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gender" className="text-secondary">
            Gender
          </Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger id="gender" className="border-gray-300 focus:border-primary focus:ring-primary">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="primary-symptom" className="text-secondary">
          Primary Symptom
        </Label>
        <Input
          id="primary-symptom"
          placeholder="e.g., Skin rash, itching, swelling"
          className="border-gray-300 focus:border-primary focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="symptom-description" className="text-secondary">
          Detailed Description
        </Label>
        <Textarea
          id="symptom-description"
          placeholder="Please describe your symptoms in detail. Include location, severity, and any factors that make it better or worse."
          rows={4}
          className="border-gray-300 focus:border-primary focus:ring-primary"
        />
      </div>

      <div className="space-y-4">
        <Label className="text-secondary">Pain Level</Label>
        <div className="space-y-3">
          <Slider
            defaultValue={[3]}
            max={10}
            step={1}
            value={painLevel}
            onValueChange={setPainLevel}
            className="py-4"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>No Pain</span>
            <span>Mild</span>
            <span>Moderate</span>
            <span>Severe</span>
            <span>Extreme</span>
          </div>
          <div className="text-center mt-2">
            <span className="inline-block px-3 py-1 rounded-full bg-accent text-primary font-medium">
              {painLevel[0]}/10
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration" className="text-secondary">
          How long have you had these symptoms?
        </Label>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger id="duration" className="border-gray-300 focus:border-primary focus:ring-primary">
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="less-than-day">Less than a day</SelectItem>
            <SelectItem value="1-3-days">1-3 days</SelectItem>
            <SelectItem value="4-7-days">4-7 days</SelectItem>
            <SelectItem value="1-2-weeks">1-2 weeks</SelectItem>
            <SelectItem value="2-4-weeks">2-4 weeks</SelectItem>
            <SelectItem value="1-3-months">1-3 months</SelectItem>
            <SelectItem value="more-than-3-months">More than 3 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-secondary">Are you experiencing any of the following?</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {["Fever", "Pain", "Swelling", "Itching", "Redness", "Rash"].map((symptom) => (
            <div
              key={symptom}
              className="flex items-center space-x-2 rounded-lg border p-3 transition-colors hover:bg-muted"
            >
              <Checkbox id={symptom.toLowerCase()} className="text-primary focus:ring-primary" />
              <label
                htmlFor={symptom.toLowerCase()}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer w-full"
              >
                {symptom}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-secondary">Have you been diagnosed with any allergies?</Label>
        <RadioGroup defaultValue="no">
          <div className="flex flex-col space-y-3">
            {["Yes", "No", "Not sure"].map((option) => (
              <div
                key={option}
                className="flex items-center space-x-2 rounded-lg border p-3 transition-colors hover:bg-muted"
              >
                <RadioGroupItem
                  value={option.toLowerCase()}
                  id={`allergies-${option.toLowerCase()}`}
                  className="text-primary focus:ring-primary"
                />
                <Label htmlFor={`allergies-${option.toLowerCase()}`} className="w-full cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="medical-history" className="text-secondary">
          Relevant Medical History
        </Label>
        <Textarea
          id="medical-history"
          placeholder="Please list any relevant medical conditions, medications, or previous similar symptoms."
          rows={3}
          className="border-gray-300 focus:border-primary focus:ring-primary"
        />
      </div>
    </div>
  )
}

