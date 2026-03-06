import { NextResponse } from "next/server"

const FLASK_API_URL = process.env.FLASK_API_URL ?? "http://127.0.0.1:5000"

export async function POST(req: Request) {
  try {
    const { message } = await req.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const upstream = await fetch(`${FLASK_API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      cache: "no-store",
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return NextResponse.json(
        { error: `Backend error: ${text || upstream.statusText}` },
        { status: 502 }
      )
    }

    const data = await upstream.json()
    return NextResponse.json({
      response: data.response,
      confidence: data.confidence,
      intent: data.intent,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
