"use client"

import { FolkMetricCard } from "@/components/folk-metrics/folk-metric-card"

interface FolkMetricNumberProps {
  title: string
  value: string
  emptyLabel?: string
  onClick?: () => void
  disabled?: boolean
  valueClassName?: string
  variant?: "default" | "compact" | "featured"
}

export function FolkMetricNumber({
  title,
  value,
  emptyLabel = "—",
  onClick,
  disabled,
  valueClassName,
  variant = "default",
}: FolkMetricNumberProps) {
  const hasValue = Boolean(value)
  const isCompact = variant === "compact"
  const isFeatured = variant === "featured"

  return (
    <FolkMetricCard
      title={title}
      onClick={onClick}
      disabled={disabled}
      minHeightClassName={isFeatured ? "min-h-[132px]" : isCompact ? "min-h-[96px]" : "min-h-[132px]"}
      contentClassName={
        isFeatured
          ? "flex flex-1 items-center justify-center px-[20px] pb-[24px] pt-[8px]"
          : "px-[16px] pb-[16px] pt-[8px]"
      }
    >
      {hasValue ? (
        <span
          className={
            valueClassName
              ?? (isFeatured || variant === "default"
                ? "text-[28px] font-semibold leading-none tracking-[-0.02em] text-folk-text"
                : "text-[20px] font-semibold leading-none tracking-tight text-folk-text")
          }
        >
          {value}
        </span>
      ) : (
        <span className="text-[14px] font-normal text-folk-placeholder">{emptyLabel}</span>
      )}
    </FolkMetricCard>
  )
}
