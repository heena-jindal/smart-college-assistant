import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  IndianRupee,
  MapPin,
  Building2,
  Award,
  ClipboardList,
  Clock,
  FileText,
} from "lucide-react"

const suggestions = [
  { icon: GraduationCap, text: "How do I apply for admission?" },
  { icon: IndianRupee, text: "What is the fee structure?" },
  { icon: BookOpen, text: "When are the semester exams?" },
  { icon: CalendarDays, text: "What is the attendance requirement?" },
  { icon: ClipboardList, text: "Where can I find my timetable?" },
  { icon: Building2, text: "Tell me about placements" },
  { icon: MapPin, text: "How do I apply for hostel?" },
  { icon: Clock, text: "What are the library hours?" },
  { icon: Award, text: "What scholarships are available?" },
  { icon: FileText, text: "How do I get a bonafide certificate?" },
]

interface ChatWelcomeProps {
  onSuggestionClick: (text: string) => void
}

export function ChatWelcome({ onSuggestionClick }: ChatWelcomeProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <GraduationCap className="h-8 w-8" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground text-balance">
          Welcome to Smart College Assistant
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
          I can help you with admissions, fees, exams, attendance, placements, and more. Try a suggestion or type your own question!
        </p>
      </div>
      <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((item) => (
          <button
            key={item.text}
            onClick={() => onSuggestionClick(item.text)}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-accent hover:shadow-md"
          >
            <item.icon className="h-4 w-4 shrink-0 text-primary" />
            <span>{item.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
