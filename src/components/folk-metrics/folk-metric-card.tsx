"use client"

import type { KeyboardEvent, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FolkMetricCardProps {
  title: string
  children: ReactNode
  className?: string
  contentClassName?: string
  minHeightClassName?: string
  headerActions?: ReactNode
  onClick?: () => void
  disabled?: boolean
}

export function FolkMetricCard({
  title,
  children,
  className,
  contentClassName,
  minHeightClassName = "min-h-[120px]",
  headerActions,
  onClick,
  disabled = false,
}: FolkMetricCardProps) {
  const header = (
    <>
      <span className="truncate text-[12px] font-normal text-folk-secondary">{title}</span>
      {headerActions}
    </>
  )

  const content = (
    <div className={cn("flex min-h-0 flex-1 flex-col", contentClassName)}>
      {children}
    </div>
  )

  const shellClassName = cn(
    "flex w-full flex-col rounded-none border border-folk-border bg-folk-surface text-left",
    minHeightClassName,
    onClick && !disabled && "cursor-pointer transition-colors hover:bg-folk-hover",
    disabled && "cursor-default",
    className,
  )

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !onClick) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onClick()
    }
  }

  if (onClick) {
    return (
      <div
        role="button"
        onClick={disabled ? undefined : onClick}
        onKeyDown={handleKeyDown}
        className={shellClassName}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
      >
        <div className={cn("flex items-start justify-between gap-[8px] px-[16px] pt-[14px]", headerActions && "pr-[12px]")}>
          {header}
        </div>
        {content}
      </div>
    )
  }

  return (
    <div className={shellClassName}>
      <div className={cn("flex items-start justify-between gap-[8px] px-[16px] pt-[14px]", headerActions && "pr-[12px]")}>
        {header}
      </div>
      {content}
    </div>
  )
}
