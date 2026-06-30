"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function overviewSummaryBoxClass() {
  return "w-full rounded-none border border-[#d9d9d9] bg-folk-surface px-[16px] py-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
}

interface OverviewSummarySectionProps {
  title: string
  itemCount: number
  onViewAll?: () => void
  children: ReactNode
  className?: string
}

export function OverviewSummarySection({
  title,
  itemCount,
  onViewAll,
  children,
  className,
}: OverviewSummarySectionProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-[10px] flex items-center justify-between gap-[8px]">
        <h3 className="text-[13px] font-medium text-folk-secondary">{title}</h3>
        {itemCount > 0 && onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[12px] font-medium text-[#555] transition-colors hover:text-folk-text"
            tabIndex={0}
          >
            View all
          </button>
        )}
      </div>
      <div className={overviewSummaryBoxClass()}>{children}</div>
    </div>
  )
}
