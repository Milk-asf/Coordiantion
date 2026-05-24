"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-[16px] px-[24px]">
      <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="h-[24px] w-[24px] text-red-500" strokeWidth={1.5} />
      </div>
      <h2 className="text-[18px] font-semibold text-[#262626]">Something went wrong</h2>
      <p className="max-w-[400px] text-center text-[14px] leading-[1.5] text-[#888]">
        An error occurred while loading this page. You can try again or navigate to a different section.
      </p>
      {error.digest && (
        <p className="text-[12px] font-mono text-[#bbb]">Error ID: {error.digest}</p>
      )}
      <div className="mt-[8px] flex items-center gap-[10px]">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-[6px] rounded-[8px] border border-[#e0e0e0] bg-white px-[14px] py-[9px] text-[13px] font-medium text-[#555] transition-colors hover:bg-[#f5f5f5]"
          tabIndex={0}
        >
          <ArrowLeft className="h-[14px] w-[14px]" strokeWidth={1.5} />
          Go back
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-[6px] rounded-[8px] bg-[#262626] px-[14px] py-[9px] text-[13px] font-medium text-white transition-colors hover:bg-black"
          tabIndex={0}
        >
          <RotateCcw className="h-[14px] w-[14px]" strokeWidth={1.5} />
          Try again
        </button>
      </div>
    </div>
  )
}
