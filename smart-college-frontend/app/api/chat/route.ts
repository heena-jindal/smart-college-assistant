import { NextResponse } from "next/server"

const DEFAULT_BACKEND_URL = "https://smart-college-assistant-backend.onrender.com"
const FLASK_API_URL = process.env.FLASK_API_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND_URL

export async function POST(req: Request) {
  try {
    const { message } = await req.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const cleanBackendUrl = FLASK_API_URL.replace(/\/$/, "")
    const upstream = await fetch(`${cleanBackendUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      cache: "no-store",
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return NextResponse.json(
        { error: `Backend error (${upstream.status}): ${text || upstream.statusText}` },
        { status: upstream.status }
      )
    }

    const data = await upstream.json()
    return NextResponse.json({
      response: data.response,
      confidence: data.confidence,
      intent: data.intent,
    })
  } catch (err: any) {
    console.error("Chat API route error:", err)
    return NextResponse.json(
      { error: `Unable to connect to backend server. If the Render service was sleeping, please wait 30 seconds and try again.` },
      { status: 502 }
    )
  }
}
