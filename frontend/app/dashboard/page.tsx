"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  GraduationCap, LogOut, Moon, Sun, ClipboardList, Bell,
  CheckSquare, Users, BarChart2, MessageSquare, Upload, Megaphone,
  Plus, Trash2, Check, Calendar, AlertCircle, TrendingUp, Award,
  Camera, Eye, EyeOff, ArrowLeft, UserPlus, Send, X, Loader2,
  ScanFace, ShieldCheck
} from "lucide-react"

const API = "http://localhost:5000"

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  })
  return res.json()
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

interface User { id: number; name: string; roll_number: string; role: string; department: string }

// ── UI primitives ──────────────────────────────────────────────
function Badge({ text, type }: { text: string; type: "success" | "warning" | "danger" | "info" | "normal" }) {
  const colors = {
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    normal: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  }
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", colors[type])}>{text}</span>
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm", className)}>{children}</div>
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", color)}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </Card>
  )
}

// ════════════════════════════════════════════════════════════════
// WEBCAM COMPONENT
// ════════════════════════════════════════════════════════════════
function WebcamCapture({ onCapture, onCancel, mode }: {
  onCapture: (imageBase64: string) => void
  onCancel: () => void
  mode: "register" | "login"
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [streaming, setStreaming] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [captured, setCaptured] = useState(false)

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        if (videoRef.current) { videoRef.current.srcObject = stream; setStreaming(true) }
      })
      .catch(() => alert("Cannot access webcam. Please allow camera access."))
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  const capture = () => {
    setCountdown(3)
    let count = 3
    const timer = setInterval(() => {
      count--; setCountdown(count)
      if (count === 0) { clearInterval(timer); setCountdown(null); takePhoto() }
    }, 1000)
  }

  const takePhoto = () => {
    if (!canvasRef.current || !videoRef.current) return
    const canvas = canvasRef.current
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0)
    const base64 = canvas.toDataURL("image/jpeg", 0.8)
    setCaptured(true)
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
    }
    setTimeout(() => onCapture(base64), 500)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-black">
        <video ref={videoRef} autoPlay playsInline className="h-56 w-80 object-cover" />
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-6xl font-bold text-white animate-pulse">{countdown}</span>
          </div>
        )}
        {captured && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/30">
            <ShieldCheck className="h-16 w-16 text-emerald-400" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-40 w-32 rounded-full border-2 border-primary/60 border-dashed" />
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <p className="text-xs text-muted-foreground text-center">
        {mode === "register" ? "Position your face in the oval and click capture" : "Look directly at the camera to verify"}
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={capture} disabled={!streaming || countdown !== null || captured}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Camera className="h-4 w-4" />
          {countdown !== null ? `Capturing in ${countdown}...` : captured ? "Captured!" : "Capture Face"}
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// REGISTER PAGE
// ════════════════════════════════════════════════════════════════
function RegisterPage({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<"form" | "face">("form")
  const [form, setForm] = useState({ name: "", roll_number: "", password: "", confirm_password: "", role: "student", department: "Computer Science" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const departments = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "MBA", "MCA"]

  const validate = () => {
    if (!form.name || !form.roll_number || !form.password) { setError("All fields are required"); return false }
    if (form.password !== form.confirm_password) { setError("Passwords do not match"); return false }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return false }
    return true
  }

  const handleFaceCapture = async (imageBase64: string) => {
    setLoading(true); setError("")
    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...form, image: imageBase64 })
      })
      if (data.error) { setError(data.error); setStep("form") }
      else onSuccess()
    } catch { setError("Registration failed. Please try again."); setStep("form") }
    setLoading(false)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </button>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <UserPlus className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "form" ? "Fill in your details to register" : "Capture your face for verification"}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all", step === "form" ? "bg-primary text-primary-foreground" : "bg-emerald-500 text-white")}>
            {step === "form" ? "1" : <Check className="h-4 w-4" />}
          </div>
          <div className={cn("h-0.5 w-16 transition-all", step === "face" ? "bg-primary" : "bg-border")} />
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all", step === "face" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>2</div>
        </div>

        <Card>
          {step === "form" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full Name</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter your full name"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Roll Number / ID</label>
                  <input value={form.roll_number} onChange={e => setForm(p => ({ ...p, roll_number: e.target.value }))} placeholder="e.g. STU004"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Role</label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Department</label>
                  <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    {departments.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min. 6 characters"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm Password</label>
                  <input type="password" value={form.confirm_password} onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))} placeholder="Re-enter password"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>}
              <button onClick={() => { if (validate()) { setError(""); setStep("face") } }}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                Continue to Face Capture →
              </button>
            </div>
          ) : (
            <div>
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Registering your account...</p>
                </div>
              ) : (
                <WebcamCapture mode="register" onCapture={handleFaceCapture} onCancel={() => setStep("form")} />
              )}
              {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ════════════════════════════════════════════════════════════════
function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [mode, setMode] = useState<"credentials" | "face">("credentials")
  const [roll, setRoll] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [registerSuccess, setRegisterSuccess] = useState(false)

  const loginWithCredentials = async () => {
    if (!roll || !password) { setError("Please fill in all fields"); return }
    setLoading(true); setError("")
    const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ roll_number: roll, password }) })
    setLoading(false)
    if (data.error) { setError(data.error); return }
    onLogin(data.user)
  }

  const loginWithFace = async (imageBase64: string) => {
    setLoading(true); setError("")
    const data = await apiFetch("/auth/face-login", { method: "POST", body: JSON.stringify({ image: imageBase64 }) })
    setLoading(false)
    if (!data.recognized) { setError(data.message || "Face not recognized. Try credentials."); setMode("credentials"); return }
    onLogin(data.user)
  }

  if (showRegister) {
    return <RegisterPage
      onBack={() => { setShowRegister(false); setRegisterSuccess(false) }}
      onSuccess={() => { setShowRegister(false); setRegisterSuccess(true) }}
    />
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Smart College Assistant</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to access your dashboard</p>
        </div>

        {registerSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4 shrink-0" /> Registration successful! You can now sign in.
          </div>
        )}

        <Card>
          {/* Toggle */}
          <div className="mb-5 flex rounded-xl bg-muted p-1">
            <button onClick={() => { setMode("credentials"); setError("") }}
              className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all",
                mode === "credentials" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <ShieldCheck className="h-3.5 w-3.5" /> Credentials
            </button>
            <button onClick={() => { setMode("face"); setError("") }}
              className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all",
                mode === "face" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <ScanFace className="h-3.5 w-3.5" /> Face Login
            </button>
          </div>

          {mode === "credentials" ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Roll Number / Faculty ID</label>
                <input value={roll} onChange={e => setRoll(e.target.value)} placeholder="e.g. STU001 or FAC001"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loginWithCredentials()} placeholder="Enter your password"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>}
              <button onClick={loginWithCredentials} disabled={loading}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</span> : "Sign In"}
              </button>
            </div>
          ) : (
            <div>
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Verifying your face...</p>
                </div>
              ) : (
                <WebcamCapture mode="login" onCapture={loginWithFace} onCancel={() => setMode("credentials")} />
              )}
              {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>}
            </div>
          )}
        </Card>

        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            New member?{" "}
            <button onClick={() => setShowRegister(true)} className="font-medium text-primary hover:underline">
              Create an account
            </button>
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1 text-foreground">Demo Credentials</p>
          <p>👨‍🏫 Faculty: FAC001 / faculty123</p>
          <p>👨‍🎓 Student: STU001 / student123</p>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TODO PANEL
// ════════════════════════════════════════════════════════════════
function TodoPanel() {
  const [todos, setTodos] = useState<any[]>([])
  const [newTitle, setNewTitle] = useState("")
  const [newDue, setNewDue] = useState("")
  const [newPriority, setNewPriority] = useState("normal")
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()])

  const load = useCallback(async () => {
    const data = await apiFetch(`/todos?month=${selectedMonth}&year=${new Date().getFullYear()}`)
    setTodos(data.todos || [])
  }, [selectedMonth])

  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!newTitle.trim()) return
    await apiFetch("/todos", { method: "POST", body: JSON.stringify({ title: newTitle, due_date: newDue, month: selectedMonth, year: String(new Date().getFullYear()), priority: newPriority }) })
    setNewTitle(""); setNewDue(""); load()
  }

  const toggle = async (todo: any) => {
    await apiFetch(`/todos/${todo.id}`, { method: "PATCH", body: JSON.stringify({ status: todo.status === "pending" ? "done" : "pending" }) }); load()
  }

  const remove = async (id: number) => { await apiFetch(`/todos/${id}`, { method: "DELETE" }); load() }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><CheckSquare className="h-4 w-4 text-primary" /> Monthly Planner</h3>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground">
          {months.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="mb-4 flex flex-col gap-2">
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Add new task..." onKeyDown={e => e.key === "Enter" && add()}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        <div className="flex gap-2">
          <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none" />
          <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground">
            <option value="normal">Normal</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
          <button onClick={add} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {todos.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No tasks for {selectedMonth}</p>}
        {todos.map(todo => (
          <div key={todo.id} className={cn("flex items-center gap-3 rounded-xl border border-border p-3", todo.status === "done" && "opacity-50")}>
            <button onClick={() => toggle(todo)} className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors", todo.status === "done" ? "border-emerald-500 bg-emerald-500" : "border-border hover:border-primary")}>
              {todo.status === "done" && <Check className="h-3 w-3 text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm text-foreground truncate", todo.status === "done" && "line-through")}>{todo.title}</p>
              {todo.due_date && <p className="text-[10px] text-muted-foreground">Due: {todo.due_date}</p>}
            </div>
            <button onClick={() => remove(todo.id)} className="text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ════════════════════════════════════════════════════════════════
// REMINDERS PANEL
// ════════════════════════════════════════════════════════════════
function RemindersPanel() {
  const [reminders, setReminders] = useState<any[]>([])
  const [newTitle, setNewTitle] = useState("")
  const [newDate, setNewDate] = useState("")
  const [newTime, setNewTime] = useState("")

  const load = async () => { const data = await apiFetch("/reminders"); setReminders(data.reminders || []) }
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!newTitle.trim() || !newDate) return
    await apiFetch("/reminders", { method: "POST", body: JSON.stringify({ title: newTitle, reminder_date: newDate, reminder_time: newTime }) })
    setNewTitle(""); setNewDate(""); setNewTime(""); load()
  }

  const markDone = async (id: number, done: number) => {
    await apiFetch(`/reminders/${id}`, { method: "PATCH", body: JSON.stringify({ is_done: done ? 0 : 1 }) }); load()
  }

  const today = new Date().toISOString().split("T")[0]
  const upcoming = reminders.filter(r => !r.is_done && r.reminder_date >= today)
  const past = reminders.filter(r => r.is_done || r.reminder_date < today)

  return (
    <Card>
      <h3 className="mb-4 font-semibold text-foreground flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Reminders</h3>
      <div className="mb-4 flex flex-col gap-2">
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Reminder title..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        <div className="flex gap-2">
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none" />
          <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none" />
          <button onClick={add} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      </div>
      <div className="space-y-2 max-h-56 overflow-y-auto">
        {upcoming.length === 0 && <p className="text-center text-xs text-muted-foreground py-2">No upcoming reminders</p>}
        {upcoming.map(r => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <Bell className="h-4 w-4 shrink-0 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
              <p className="text-[10px] text-muted-foreground">{r.reminder_date} {r.reminder_time}</p>
            </div>
            <button onClick={() => markDone(r.id, r.is_done)} className="text-xs text-emerald-600 hover:underline">Done</button>
          </div>
        ))}
        {past.slice(0, 3).map(r => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border p-3 opacity-50">
            <Check className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="flex-1 text-xs text-muted-foreground line-through truncate">{r.title}</p>
            <button onClick={() => markDone(r.id, r.is_done)} className="text-xs text-primary hover:underline">Undo</button>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ════════════════════════════════════════════════════════════════
// CHATBOT PANEL
// ════════════════════════════════════════════════════════════════
function ChatbotPanel() {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim(); setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMsg }])
    setLoading(true)
    try {
      const data = await apiFetch("/chat", { method: "POST", body: JSON.stringify({ message: userMsg }) })
      setMessages(prev => [...prev, { role: "bot", content: data.response, intent: data.intent, confidence: data.confidence }])
    } catch { setMessages(prev => [...prev, { role: "bot", content: "Sorry, something went wrong." }]) }
    setLoading(false)
  }

  return (
    <Card className="flex flex-col h-96">
      <h3 className="mb-3 font-semibold text-foreground flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> College Assistant Chatbot</h3>
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">Ask me about admissions, fees, exams, attendance, placements...</p>}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm")}>
              {m.content}
              {m.role === "bot" && m.intent && (
                <div className="mt-1 flex gap-1">
                  <Badge text={m.intent} type="info" />
                  {m.confidence !== undefined && <Badge text={`${Math.round(m.confidence * 100)}%`} type={m.confidence >= 0.8 ? "success" : "warning"} />}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2 text-sm text-muted-foreground">Typing...</div></div>}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask a question..."
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        <button onClick={send} disabled={loading} className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </Card>
  )
}

// ════════════════════════════════════════════════════════════════
// STUDENT DASHBOARD
// ════════════════════════════════════════════════════════════════
function StudentDashboard({ user }: { user: User }) {
  const [data, setData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [attendance, setAttendance] = useState<any[]>([])

  useEffect(() => { apiFetch("/student/dashboard").then(setData) }, [])
  useEffect(() => { if (activeTab === "attendance") apiFetch("/student/attendance").then(d => setAttendance(d.records || [])) }, [activeTab])

  if (!data) return <div className="flex h-64 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...</div>

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart2 },
    { id: "attendance", label: "Attendance", icon: ClipboardList },
    { id: "grades", label: "Grades", icon: Award },
    { id: "announcements", label: "Updates", icon: Megaphone },
    { id: "planner", label: "Planner", icon: Calendar },
    { id: "chatbot", label: "Chatbot", icon: MessageSquare },
  ]

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
              activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            <tab.icon className="h-3.5 w-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={ClipboardList} label="Attendance" value={`${data.attendance.percentage}%`} sub={data.attendance.eligible ? "✅ Eligible" : "⚠️ Low"} color={data.attendance.eligible ? "bg-emerald-500" : "bg-red-500"} />
            <StatCard icon={Award} label="Subjects" value={data.grades.length} sub="Grades uploaded" color="bg-blue-500" />
            <StatCard icon={Megaphone} label="Announcements" value={data.announcements.length} sub="From faculty" color="bg-purple-500" />
            <StatCard icon={Bell} label="Reminders" value={data.reminders.length} sub="Upcoming" color="bg-amber-500" />
          </div>
          {data.announcements.length > 0 && (
            <Card>
              <h3 className="mb-3 font-semibold text-foreground flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> Latest Announcements</h3>
              <div className="space-y-3">
                {data.announcements.slice(0, 3).map((a: any, i: number) => (
                  <div key={i} className="flex gap-3 rounded-xl border border-border p-3">
                    <AlertCircle className={cn("h-4 w-4 shrink-0 mt-0.5", a.priority === "high" ? "text-red-500" : "text-blue-500")} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.content}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">— {a.faculty_name} · {a.created_at?.split("T")[0]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card>
            <h3 className="mb-3 font-semibold text-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Performance Summary</h3>
            <div className="space-y-2">
              {data.grades.slice(0, 5).map((g: any) => {
                const pct = Math.round((g.marks_obtained / g.total_marks) * 100)
                return (
                  <div key={g.subject} className="flex items-center gap-3">
                    <p className="w-40 truncate text-sm text-foreground">{g.subject}</p>
                    <div className="flex-1 rounded-full bg-muted h-2 overflow-hidden">
                      <div className={cn("h-full rounded-full", pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${pct}%` }} />
                    </div>
                    <Badge text={g.grade} type={pct >= 75 ? "success" : pct >= 50 ? "warning" : "danger"} />
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "attendance" && (
        <Card>
          <h3 className="mb-4 font-semibold text-foreground">Attendance Records</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4">Time</th><th className="pb-2 pr-4">Subject</th><th className="pb-2">Status</th>
              </tr></thead>
              <tbody>
                {attendance.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-4 text-foreground">{r.date}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.time}</td>
                    <td className="py-2 pr-4 text-foreground">{r.subject}</td>
                    <td className="py-2"><Badge text={r.status} type={r.status === "present" ? "success" : "danger"} /></td>
                  </tr>
                ))}
                {attendance.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No records found</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "grades" && (
        <Card>
          <h3 className="mb-4 font-semibold text-foreground">Academic Performance</h3>
          <div className="space-y-3">
            {data.grades.map((g: any) => {
              const pct = Math.round((g.marks_obtained / g.total_marks) * 100)
              return (
                <div key={g.subject} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground">{g.subject}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{g.marks_obtained}/{g.total_marks}</span>
                      <Badge text={g.grade} type={pct >= 75 ? "success" : pct >= 50 ? "warning" : "danger"} />
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full", pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">{g.semester} · {pct}%</p>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {activeTab === "announcements" && (
        <div className="space-y-3">
          {data.announcements.map((a: any, i: number) => (
            <Card key={i}>
              <div className="flex items-start gap-3">
                <AlertCircle className={cn("h-5 w-5 shrink-0 mt-0.5", a.priority === "high" ? "text-red-500" : "text-blue-500")} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-foreground">{a.title}</p>
                    <Badge text={a.priority} type={a.priority === "high" ? "danger" : "info"} />
                  </div>
                  <p className="text-sm text-muted-foreground">{a.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Posted by {a.faculty_name} · {a.created_at?.split("T")[0]}</p>
                </div>
              </div>
            </Card>
          ))}
          {data.announcements.length === 0 && <Card><p className="text-center text-muted-foreground">No announcements yet</p></Card>}
        </div>
      )}

      {activeTab === "planner" && <div className="grid gap-4 md:grid-cols-2"><TodoPanel /><RemindersPanel /></div>}
      {activeTab === "chatbot" && <ChatbotPanel />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// FACULTY DASHBOARD
// ════════════════════════════════════════════════════════════════
function FacultyDashboard({ user }: { user: User }) {
  const [data, setData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [markForm, setMarkForm] = useState({ roll_number: "", subject: "General", status: "present", date: new Date().toISOString().split("T")[0] })
  const [gradeForm, setGradeForm] = useState({ roll_number: "", subject: "", marks_obtained: "", total_marks: "100", semester: "Semester 3" })
  const [announcForm, setAnnouncForm] = useState({ title: "", content: "", priority: "normal" })
  const [msg, setMsg] = useState("")

  const load = () => apiFetch("/faculty/dashboard").then(setData)
  useEffect(() => { load() }, [])

  const markAtt = async () => {
    const res = await apiFetch("/faculty/attendance/mark", { method: "POST", body: JSON.stringify(markForm) })
    setMsg(res.message || res.error); load()
  }

  const uploadGrade = async () => {
    const res = await apiFetch("/faculty/grades/upload", { method: "POST", body: JSON.stringify(gradeForm) })
    setMsg(res.message || res.error)
  }

  const postAnnouncement = async () => {
    const res = await apiFetch("/faculty/announcement", { method: "POST", body: JSON.stringify(announcForm) })
    setMsg(res.message || res.error)
    setAnnouncForm({ title: "", content: "", priority: "normal" })
  }

  if (!data) return <div className="flex h-64 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...</div>

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart2 },
    { id: "students", label: "Students", icon: Users },
    { id: "attendance", label: "Mark Attendance", icon: ClipboardList },
    { id: "grades", label: "Upload Grades", icon: Upload },
    { id: "announce", label: "Announce", icon: Megaphone },
    { id: "planner", label: "Planner", icon: Calendar },
    { id: "chatbot", label: "Chatbot", icon: MessageSquare },
  ]

  const present = data.today_attendance?.length || 0
  const total = data.students?.length || 0
  const eligible = data.students?.filter((s: any) => s.eligible).length || 0

  return (
    <div>
      {msg && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-primary/10 px-4 py-2 text-sm text-primary">
          {msg} <button onClick={() => setMsg("")}><X className="h-4 w-4" /></button>
        </div>
      )}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
              activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            <tab.icon className="h-3.5 w-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={Users} label="Total Students" value={total} color="bg-blue-500" />
            <StatCard icon={ClipboardList} label="Present Today" value={present} sub={`of ${total}`} color="bg-emerald-500" />
            <StatCard icon={Award} label="75%+ Eligible" value={eligible} color="bg-purple-500" />
            <StatCard icon={AlertCircle} label="Low Attendance" value={total - eligible} color="bg-red-500" />
          </div>
          <Card>
            <h3 className="mb-3 font-semibold text-foreground">Today's Attendance — {data.today_date}</h3>
            {data.today_attendance?.length === 0
              ? <p className="text-sm text-muted-foreground">No attendance marked today yet.</p>
              : <div className="flex flex-wrap gap-2">
                {data.today_attendance?.map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm text-foreground">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{a.roll_number}</span>
                  </div>
                ))}
              </div>
            }
          </Card>
        </div>
      )}

      {activeTab === "students" && (
        <Card>
          <h3 className="mb-4 font-semibold text-foreground">All Students</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4">Name</th><th className="pb-2 pr-4">Roll</th><th className="pb-2 pr-4">Dept</th><th className="pb-2 pr-4">Attendance</th><th className="pb-2">Status</th>
              </tr></thead>
              <tbody>
                {data.students?.map((s: any) => (
                  <tr key={s.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{s.name}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{s.roll_number}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{s.department}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full", s.eligible ? "bg-emerald-500" : "bg-red-500")} style={{ width: `${s.percentage}%` }} />
                        </div>
                        <span className="text-xs">{s.percentage}%</span>
                      </div>
                    </td>
                    <td className="py-2.5"><Badge text={s.eligible ? "Eligible" : "Low"} type={s.eligible ? "success" : "danger"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "attendance" && (
        <Card className="max-w-md">
          <h3 className="mb-4 font-semibold text-foreground">Mark Attendance</h3>
          <div className="space-y-3">
            {[{ label: "Roll Number", key: "roll_number", placeholder: "e.g. STU001" }, { label: "Subject", key: "subject", placeholder: "e.g. Mathematics" }].map(f => (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}</label>
                <input value={(markForm as any)[f.key]} onChange={e => setMarkForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
              <input type="date" value={markForm.date} onChange={e => setMarkForm(p => ({ ...p, date: e.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
              <select value={markForm.status} onChange={e => setMarkForm(p => ({ ...p, status: e.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none">
                <option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option>
              </select>
            </div>
            <button onClick={markAtt} className="w-full rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Mark Attendance</button>
          </div>
        </Card>
      )}

      {activeTab === "grades" && (
        <Card className="max-w-md">
          <h3 className="mb-4 font-semibold text-foreground">Upload Grades</h3>
          <div className="space-y-3">
            {[{ label: "Roll Number", key: "roll_number", placeholder: "e.g. STU001" }, { label: "Subject", key: "subject", placeholder: "e.g. Mathematics" }, { label: "Marks Obtained", key: "marks_obtained", placeholder: "e.g. 85" }, { label: "Total Marks", key: "total_marks", placeholder: "e.g. 100" }, { label: "Semester", key: "semester", placeholder: "e.g. Semester 3" }].map(f => (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}</label>
                <input value={(gradeForm as any)[f.key]} onChange={e => setGradeForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            ))}
            <button onClick={uploadGrade} className="w-full rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Upload Grade</button>
          </div>
        </Card>
      )}

      {activeTab === "announce" && (
        <Card className="max-w-lg">
          <h3 className="mb-4 font-semibold text-foreground">Post Announcement</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
              <input value={announcForm.title} onChange={e => setAnnouncForm(p => ({ ...p, title: e.target.value }))} placeholder="Announcement title..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Content</label>
              <textarea value={announcForm.content} onChange={e => setAnnouncForm(p => ({ ...p, content: e.target.value }))} rows={4} placeholder="Write your announcement..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
              <select value={announcForm.priority} onChange={e => setAnnouncForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none">
                <option value="normal">Normal</option><option value="high">High Priority</option>
              </select>
            </div>
            <button onClick={postAnnouncement} className="w-full rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Post Announcement</button>
          </div>
        </Card>
      )}

      {activeTab === "planner" && <div className="grid gap-4 md:grid-cols-2"><TodoPanel /><RemindersPanel /></div>}
      {activeTab === "chatbot" && <ChatbotPanel />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [dark, setDark] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch("/auth/me").then(data => { if (data.user) setUser(data.user); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { document.documentElement.classList.toggle("dark", dark) }, [dark])

  const logout = async () => { await apiFetch("/auth/logout", { method: "POST" }); setUser(null) }

  if (loading) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="text-center">
        <GraduationCap className="mx-auto h-12 w-12 text-primary animate-pulse" />
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )

  if (!user) return (
    <div className={dark ? "dark" : ""}>
      <div className="fixed top-4 right-4 z-50">
        <button onClick={() => setDark(!dark)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-accent">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
      <LoginPage onLogin={setUser} />
    </div>
  )

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-dvh bg-background">
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Smart College Assistant</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role} · {user.department}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {user.name[0]}
                </div>
                <span className="text-sm font-medium text-foreground">{user.name}</span>
                <Badge text={user.role} type={user.role === "faculty" ? "info" : "success"} />
              </div>
              <button onClick={() => setDark(!dark)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-accent">
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button onClick={logout} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-accent hover:text-red-500">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Welcome back, {user.name.split(" ")[0]}! 👋</h2>
            <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          {user.role === "student" ? <StudentDashboard user={user} /> : <FacultyDashboard user={user} />}
        </main>
      </div>
    </div>
  )
}
