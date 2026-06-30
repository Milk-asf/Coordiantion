"use client"

import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface BackButtonProps {
  onClick: () => void
  ariaLabel?: string
  className?: string
  iconClassName?: string
}

/** Square, bordered back button used across record/detail page headers. */
export function BackButton({ onClick, ariaLabel = "Go back", className, iconClassName }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      tabIndex={0}
      className={cn(
        "flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px] border border-folk-border-strong bg-white text-folk-secondary transition-colors hover:border-folk-text hover:text-folk-text",
        className,
      )}
    >
      <ChevronLeft className={cn("h-[14px] w-[14px]", iconClassName)} strokeWidth={1.75} />
    </button>
  )
}
