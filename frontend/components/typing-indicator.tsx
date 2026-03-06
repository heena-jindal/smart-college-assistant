import { BotAvatar } from "./bot-avatar"

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-in fade-in duration-300">
      <BotAvatar />
      <div className="rounded-2xl rounded-tl-md bg-bot-bubble px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}
