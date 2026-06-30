"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RotateCcw } from "lucide-react"

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Settings error:", error)
  }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-[16px] px-[24px]">
      <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-amber-50">
        <AlertTriangle className="h-[24px] w-[24px] text-amber-500" strokeWidth={1.5} />
      </div>
      <h2 className="text-[18px] font-semibold text-folk-text">Settings error</h2>
      <p className="max-w-[400px] text-center text-[14px] leading-[1.5] text-folk-secondary">
        Failed to load this settings page. Try again or return to the dashboard.
      </p>
      <div className="mt-[8px] flex items-center gap-[10px]">
        <Link
          href="/tasks"
          className="outline-btn flex items-center gap-[6px] px-[14px] py-[9px] text-[13px] font-medium text-[#555]"
          tabIndex={0}
        >
          Back to dashboard
        </Link>
        <button
          onClick={reset}
          className="primary-btn flex items-center gap-[6px]"
          tabIndex={0}
        >
          <RotateCcw className="h-[14px] w-[14px]" strokeWidth={1.5} />
          Try again
        </button>
      </div>
    </div>
  )
}
