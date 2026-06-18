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
        "relative h-[18px] w-[32px] shrink-0 rounded-full",
        "transition-[background-color,opacity] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-in-out)]",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      style={{ backgroundColor: checked ? "var(--primary-color)" : "var(--folk-border)" }}
    >
      <span
        className={cn(
          "absolute top-[2px] h-[14px] w-[14px] rounded-full bg-folk-surface shadow-sm",
          "transition-transform duration-[var(--motion-duration-base)] ease-[var(--motion-ease-out)]",
          checked ? "left-[16px]" : "left-[2px]"
        )}
      />
    </button>
  )
}
