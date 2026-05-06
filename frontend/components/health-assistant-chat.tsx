"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, Send, Bot, User } from 'lucide-react'

interface Message {
  id: string
  content: string
  sender: "user" | "assistant"
  timestamp: Date
}

const healthResponses: Record<string, string> = {
  headache: "Headaches can have various causes including stress, dehydration, lack of sleep, or underlying medical conditions. If headaches are frequent or severe, consider consulting a healthcare provider.",
  fever: "Fever is often a sign that your body is fighting an infection. Stay hydrated, rest, and monitor your temperature. Seek medical attention if fever is high (>101.3°F) or persistent.",
  cold: "Common cold symptoms include runny nose, cough, and mild fever. Rest, stay hydrated, and consider over-the-counter medications for symptom relief. Most colds resolve within 7-10 days.",
  cough: "Coughs can be caused by infections, allergies, or irritants. Stay hydrated and consider honey for soothing. See a doctor if cough persists for more than 2 weeks or is accompanied by blood.",
  stomach: "Stomach pain can result from various causes including indigestion, stress, or infections. Try bland foods and stay hydrated. Seek medical care for severe or persistent pain.",
  diet: "A balanced diet includes fruits, vegetables, whole grains, lean proteins, and healthy fats. Limit processed foods, sugar, and excessive sodium. Consider consulting a nutritionist for personalized advice.",
  exercise: "Regular exercise is important for overall health. Aim for at least 150 minutes of moderate activity per week. Start slowly and gradually increase intensity. Consult your doctor before starting new exercise programs.",
  sleep: "Adults need 7-9 hours of quality sleep per night. Maintain a regular sleep schedule, create a comfortable sleep environment, and avoid screens before bedtime.",
  stress: "Chronic stress can affect your health. Try relaxation techniques like deep breathing, meditation, or yoga. Regular exercise and adequate sleep also help manage stress.",
  doctor: "You should see a doctor if you have persistent symptoms, severe pain, high fever, difficulty breathing, chest pain, or any concerning changes in your health."
}

export function HealthAssistantChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your health assistant. I can provide general health information and guidance. How can I help you today?",
      sender: "assistant",
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const quickPrompts = [
    "What causes headaches?",
    "How to reduce fever?",
    "Common cold symptoms",
    "When to see a doctor?"
  ]

  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase()
    
    for (const [keyword, response] of Object.entries(healthResponses)) {
      if (lowerMessage.includes(keyword)) {
        return response
      }
    }
    
    return "I understand you're asking about a health concern. While I can provide general information, it's always best to consult with a healthcare professional for personalized medical advice. Is there a specific symptom or health topic you'd like to know more about?"
  }

  const handleSendMessage = (message: string) => {
    if (!message.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      sender: "user",
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    // Simulate assistant response delay
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: generateResponse(message),
        sender: "assistant",
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, assistantMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSendMessage(inputValue)
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-secondary flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Chat with our Health Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-64 overflow-y-auto space-y-3 bg-gray-50 rounded-lg p-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.sender === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3 w-3 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-2 rounded-lg text-sm ${
                  message.sender === "user"
                    ? "bg-primary text-white"
                    : "bg-white text-gray-800 border"
                }`}
              >
                {message.content}
              </div>
              {message.sender === "user" && (
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                  <User className="h-3 w-3 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Bot className="h-3 w-3 text-white" />
              </div>
              <div className="bg-white text-gray-800 border p-2 rounded-lg text-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your symptoms or questions..."
            className="w-full py-2 px-4 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-800 placeholder-gray-500"
            disabled={isTyping}
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-primary text-white hover:bg-primary/90 p-0"
            disabled={isTyping || !inputValue.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handleQuickPrompt(prompt)}
              className="px-3 py-1 bg-accent text-primary text-sm rounded-full hover:bg-primary hover:text-white transition-colors"
              disabled={isTyping}
            >
              {prompt}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
