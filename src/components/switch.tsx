"use client"

import { cn } from "@/lib/utils"

interface SwitchProps {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

export function Switch({ checked, onChange, disabled, ariaLabel, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onChange() }}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "relative h-[18px] w-[32px] shrink-0 rounded-full transition-colors",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      style={{ backgroundColor: checked ? "var(--primary-color)" : "#d4d4d4" }}
    >
      <span
        className={cn(
          "absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform",
          checked ? "left-[16px]" : "left-[2px]"
        )}
      />
    </button>
  )
}
