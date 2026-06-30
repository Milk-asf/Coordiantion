"use client"

import type { ReactNode } from "react"
import { PageBackButton } from "@/components/page-back-button"
import { PageClockButton } from "@/components/page-clock-button"
import { listViewFilterBarClass, pageTitleBarClass, pageTitleTextClass } from "@/components/tab-active-indicator"
import { cn } from "@/lib/utils"

interface PageTitleBarProps {
  title: ReactNode
  onBack?: () => void
  backLabel?: string
  showBack?: boolean
  /** Show clock on/off on the far right of the title row. */
  showClock?: boolean
  /** Optional actions before the clock button. */
  trailing?: ReactNode
  className?: string
}

/** Title-only row: back button, divider, and page title — matches roster. */
export function PageTitleBar({
  title,
  onBack,
  backLabel,
  showBack = true,
  showClock = true,
  trailing,
  className,
}: PageTitleBarProps) {
  const hasTrailing = Boolean(trailing) || showClock

  return (
    <div className={cn(pageTitleBarClass("justify-between px-[16px]"), className)}>
      <div className="flex h-full min-w-0 items-center gap-[12px]">
        {showBack && <PageBackButton onClick={onBack} ariaLabel={backLabel} />}
        {typeof title === "string" ? (
          <h1 className={pageTitleTextClass("min-w-0 truncate")}>{title}</h1>
        ) : (
          title
        )}
      </div>
      {hasTrailing ? (
        <div className="flex shrink-0 items-center gap-[8px]">
          {trailing}
          {showClock ? <PageClockButton /> : null}
        </div>
      ) : null}
    </div>
  )
}

interface PageToolbarBarProps {
  children?: ReactNode
  className?: string
  align?: "left" | "right" | "between"
}

/** Secondary row for primary actions (Add new, export, etc.). */
export function PageToolbarBar({ children, className, align = "right" }: PageToolbarBarProps) {
  if (!children) return null

  return (
    <div
      className={cn(
        "flex h-[44px] shrink-0 items-center gap-[8px] border-b border-folk-border-subtle bg-white px-[16px]",
        align === "right" && "justify-end",
        align === "left" && "justify-start",
        align === "between" && "justify-between",
        className,
      )}
    >
      {children}
    </div>
  )
}

interface PageFilterBarProps {
  children?: ReactNode
  className?: string
}

/** Filter / search row below title and toolbar. */
export function PageFilterBar({ children, className }: PageFilterBarProps) {
  if (!children) return null

  return (
    <div className={cn(listViewFilterBarClass("flex-nowrap"), className)}>
      {children}
    </div>
  )
}
