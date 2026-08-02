"use client"

import { useEffect } from "react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40">
        <h2 className="mb-2 text-lg font-bold text-red-700 dark:text-red-400">
          ❌ Dashboard Error
        </h2>
        <p className="mb-4 text-sm text-red-600 dark:text-red-300">
          A client-side error occurred. Error details:
        </p>
        <div className="mb-4 overflow-auto rounded-xl bg-red-100 p-4 dark:bg-red-900/30">
          <p className="font-mono text-xs text-red-800 dark:text-red-300 whitespace-pre-wrap break-all">
            <strong>Message:</strong> {error.message}
            {"\n\n"}
            <strong>Stack:</strong>{"\n"}{error.stack}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
          <button
            onClick={() => { localStorage.clear(); window.location.href = "/dashboard" }}
            className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Clear Cache & Reload
          </button>
        </div>
      </div>
    </div>
  )
}
