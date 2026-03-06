"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import { ChatHeader } from "./chat-header"
import { ChatMessage, type Message } from "./chat-message"
import { ChatInput } from "./chat-input"
import { ChatWelcome } from "./chat-welcome"
import { TypingIndicator } from "./typing-indicator"

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setIsTyping(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      })
      if (!res.ok) throw new Error("Failed to get response")
      const data = await res.json()
      const botMessage: Message = {
        id: crypto.randomUUID(),
        role: "bot",
        content: data.response,
        confidence: data.confidence,
        intent: data.intent,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
    } catch {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "bot",
        content: "Sorry, I'm having trouble connecting right now. Please make sure the Flask backend is running on port 5000.",
        confidence: 0,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }, [])

  return (
    <div className="flex h-dvh flex-col bg-background">
      <ChatHeader />
      <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto scroll-smooth"
        style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}>
        {messages.length === 0 ? (
          <ChatWelcome onSuggestionClick={sendMessage} />
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isTyping && <TypingIndicator />}
          </div>
        )}
      </div>
      <div className="mx-auto w-full max-w-2xl">
        <ChatInput onSend={sendMessage} disabled={isTyping} />
      </div>
    </div>
  )
}