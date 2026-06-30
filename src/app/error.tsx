"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Unhandled error:", error)
  }, [error])

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-folk-surface px-6">
      <div className="rounded-full bg-red-50 p-4">
        <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <h2 className="text-[18px] font-semibold text-folk-text">Something went wrong</h2>
      <p className="max-w-[400px] text-center text-[14px] text-folk-secondary">
        An unexpected error occurred. You can try again, or contact support if the problem persists.
      </p>
      <button
        onClick={reset}
        className="primary-btn"
        tabIndex={0}
      >
        Try again
      </button>
    </div>
  )
}
