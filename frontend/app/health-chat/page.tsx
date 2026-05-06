"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Send, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Logo } from "@/components/logo"

export default function HealthChat() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState("")
  const router = useRouter()

  const sendMessage = async () => {
    if (!input.trim()) return

    const newMessages = [...messages, { role: "user", content: input }]
    setMessages(newMessages)
    setInput("")

    try {
      const res = await fetch("http://127.0.0.1:8080/get", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ msg: input }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: "bot", content: data.response }])
    } catch (error) {
      setMessages((prev) => [...prev, { role: "bot", content: "⚠️ Sorry, something went wrong." }])
    }
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="bg-primary py-2">
          <div className="container flex justify-between items-center">
            <div className="text-white text-sm">AI Health Assistant</div>
            <div className="flex items-center gap-4">
              <Link href="/about" className="text-white text-sm hover:underline">About</Link>
              <Link href="/contact" className="text-white text-sm hover:underline">Contact</Link>
            </div>
          </div>
        </div>
        <div className="container py-4">
          <div className="flex justify-between items-center">
            <Logo />
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors">
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Home</span>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex border-primary text-primary hover:bg-primary hover:text-white"
              >
                <Info className="mr-2 h-4 w-4" />
                Help
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-2xl py-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-secondary">Chat with Our Health Assistant</h1>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6 space-y-4">
            <div className="h-96 overflow-y-auto border rounded p-4 bg-white text-sm space-y-3">
              {messages.length === 0 && (
                <p className="text-muted-foreground">Ask a health question to get started...</p>
              )}
              {messages.map((msg, index) => (
                <div key={index} className={`text-${msg.role === "user" ? "right" : "left"}`}>
                  <p className={`inline-block px-3 py-2 rounded-lg ${msg.role === "user" ? "bg-primary text-white ml-auto" : "bg-gray-200 text-gray-700 mr-auto"}`}>
                    {msg.content}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Type your question here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button onClick={sendMessage} className="bg-primary text-white">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-gray-500 text-center mt-6 max-w-xl mx-auto">
          <strong>Disclaimer:</strong> This AI health chatbot is for informational purposes only and is not a substitute for professional medical advice.
        </p>
      </div>
    </div>
  )
}
