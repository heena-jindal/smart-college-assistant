"use client"

import { cn } from "@/lib/utils"
import { BotAvatar } from "./bot-avatar"
import { User } from "lucide-react"

export interface Message {
  id: string
  role: "user" | "bot"
  content: string
  confidence?: number
  intent?: string
  timestamp: Date
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  return (
    <span
      className={cn(
        "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
        pct >= 80
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
          : pct >= 50
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
      )}
    >
      {pct}% match
    </span>
  )
}

function IntentBadge({ intent }: { intent: string }) {
  return (
    <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium capitalize text-primary">
      {intent}
    </span>
  )
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user"

  return (
    <div
      className={cn(
        "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {isUser ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-4 w-4" />
        </div>
      ) : (
        <BotAvatar />
      )}

      <div
        className={cn("flex max-w-[75%] flex-col", isUser ? "items-end" : "items-start")}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-shadow hover:shadow-md",
            isUser
              ? "rounded-tr-md bg-user-bubble text-user-bubble-foreground"
              : "rounded-tl-md bg-bot-bubble text-bot-bubble-foreground"
          )}
        >
          {message.content}
        </div>

        <div
          className={cn(
            "mt-1 flex flex-wrap items-center gap-2",
            isUser ? "flex-row-reverse" : "flex-row"
          )}
        >
          <span className="text-[10px] text-muted-foreground">
            {formatTime(message.timestamp)}
          </span>
          {!isUser && message.confidence !== undefined && message.confidence > 0 && (
            <ConfidenceBadge confidence={message.confidence} />
          )}
          {!isUser && message.intent && message.confidence !== undefined && message.confidence > 0 && (
            <IntentBadge intent={message.intent} />
          )}
        </div>
      </div>
    </div>
  )
}
