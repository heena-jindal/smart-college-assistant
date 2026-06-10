"use client"

import { SendHorizontal } from "lucide-react"
import { useRef, type FormEvent, type KeyboardEvent } from "react"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const value = inputRef.current?.value.trim()
    if (!value || disabled) return
    onSend(value)
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-card px-4 py-3"
    >
      <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-1 focus-within:ring-ring">
        <textarea
          ref={inputRef}
          rows={1}
          placeholder="Type your question..."
          disabled={disabled}
          onKeyDown={handleKeyDown}
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          aria-label="Chat message input"
        />
        <button
          type="submit"
          disabled={disabled}
          aria-label="Send message"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  )
}
