"use client"

import { FolkMetricCard } from "@/components/folk-metrics/folk-metric-card"

interface FolkMetricUsageProps {
  title: string
  percent: number
  emptyLabel?: string
  onClick?: () => void
  variant?: "compact" | "featured"
}

export function FolkMetricUsage({
  title,
  percent,
  emptyLabel = "—",
  onClick,
  variant = "compact",
}: FolkMetricUsageProps) {
  const hasValue = Number.isFinite(percent)
  const pct = Math.max(0, Math.min(100, percent))
  const fillColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-[#3BA3F8]"
  const isFeatured = variant === "featured"
  const barHeightClass = isFeatured ? "h-[14px]" : "h-[8px]"

  return (
    <FolkMetricCard
      title={title}
      onClick={onClick}
      minHeightClassName={isFeatured ? "min-h-[132px]" : "min-h-[96px]"}
      contentClassName={
        isFeatured
          ? "flex flex-1 items-center justify-center px-[20px] pb-[24px] pt-[8px]"
          : "px-[16px] pb-[16px] pt-[8px]"
      }
    >
      {hasValue ? (
        <div className={`flex w-full items-center ${isFeatured ? "gap-[16px]" : "gap-[12px]"}`}>
          <div className={`${barHeightClass} min-w-0 flex-1 overflow-hidden rounded-[6px] bg-folk-border-subtle`}>
            <div
              className={`h-full rounded-[6px] ${fillColor} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span
            className={
              isFeatured
                ? "shrink-0 text-[28px] font-semibold tabular-nums leading-none tracking-[-0.02em] text-folk-text"
                : "shrink-0 text-[15px] font-semibold tabular-nums text-folk-text"
            }
          >
            {pct}%
          </span>
        </div>
      ) : (
        <span className="text-[14px] font-normal text-folk-placeholder">{emptyLabel}</span>
      )}
    </FolkMetricCard>
  )
}
