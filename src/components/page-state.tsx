"use client"

import { motion } from "@/lib/motion"

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className={`flex h-full items-center justify-center ${motion.fadeIn}`}>
      <div className="flex flex-col items-center gap-[12px]">
        <div className="h-[24px] w-[24px] animate-spin rounded-full border-[2px] border-folk-border border-t-[#888]" />
        <span className="text-[13px] text-folk-secondary">{label}</span>
      </div>
    </div>
  )
}

export function PageError({ message = "Something went wrong", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className={`flex h-full items-center justify-center ${motion.fadeIn}`}>
      <div className="flex flex-col items-center gap-[12px] text-center">
        <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-red-50 text-[18px]">!</div>
        <p className="text-[14px] font-medium text-folk-text">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className={`rounded-[6px] border border-folk-border bg-folk-surface px-[14px] py-[6px] text-[13px] font-medium text-folk-text hover:bg-folk-hover ${motion.interactive}`}
            tabIndex={0}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

export function PageEmpty({ icon, title, description }: { icon?: React.ReactNode; title: string; description?: string }) {
  return (
    <div className={`flex h-full items-center justify-center ${motion.fadeIn}`}>
      <div className="flex flex-col items-center gap-[8px] text-center">
        {icon && <div className="mb-[4px] text-[#ccc]">{icon}</div>}
        <p className="text-[14px] font-medium text-folk-secondary">{title}</p>
        {description && <p className="text-[13px] text-folk-placeholder">{description}</p>}
      </div>
    </div>
  )
}
