"use client"

import { cn } from "@/lib/utils"
import { FOLK_CHIP_PALETTE } from "@/lib/chip-colors"

export const folk = {
  border: "#e5e7eb",
  borderLight: "var(--folk-border-subtle)",
  borderStrong: "#d1d5db",
  text: "#1a1a1a",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  hover: "#f5f5f4",
  selected: "#f0f0ef",
} as const

export function folkCanvasClass(className?: string) {
  return cn("bg-white", className)
}

export function folkOutlineBtnClass(className?: string) {
  return cn(
    "inline-flex h-[32px] items-center justify-center gap-[6px] rounded-folk-btn border border-folk-border-strong bg-white px-[14px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover disabled:opacity-45",
    className
  )
}

export function folkIconBtnClass(className?: string) {
  return cn(
    "inline-flex h-[28px] w-[28px] items-center justify-center rounded-folk-input border border-folk-border-strong bg-white text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text",
    className
  )
}

export function folkQuickActionClass(className?: string) {
  return cn(
    "inline-flex h-[28px] items-center gap-[5px] rounded-folk-btn border border-folk-border-strong bg-white px-[10px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover",
    className
  )
}

/** Dashed pill trigger for inline chip / tag add (MultiChip, ContactChip empty). */
export function folkInlineAddButtonClass(size: "compact" | "default" = "compact", className?: string) {
  return cn(
    "folk-chip inline-flex shrink-0 cursor-default items-center border border-dashed border-folk-border-strong bg-transparent font-normal text-folk-placeholder transition-colors hover:border-folk-secondary hover:text-folk-secondary",
    size === "compact"
      ? "h-[20px] gap-[2px] px-[8px] text-[11px]"
      : "h-[24px] gap-[3px] px-[10px] text-[13px]",
    className
  )
}

/** Inline input while adding a chip / tag value — focus border from global input styles. */
export function folkInlineAddInputClass(size: "compact" | "default" = "compact", className?: string) {
  return cn(
    "folk-chip inline-flex shrink-0 items-center border border-dashed border-folk-border bg-folk-page font-normal text-folk-text outline-none placeholder:text-folk-placeholder",
    size === "compact"
      ? "h-[20px] min-w-[120px] px-[8px] text-[11px]"
      : "h-[24px] min-w-[140px] px-[10px] text-[13px]",
    className
  )
}

const statusStyles: Record<string, string> = {
  active: FOLK_CHIP_PALETTE.green,
  archived: FOLK_CHIP_PALETTE.yellow,
  inactive: FOLK_CHIP_PALETTE.rose,
  pending: FOLK_CHIP_PALETTE.orange,
  new: FOLK_CHIP_PALETTE.purple,
  default: "bg-folk-hover text-folk-secondary",
}

export function getFolkStatusClass(status: string) {
  return statusStyles[status.toLowerCase()] ?? statusStyles.default
}

export function FolkStatusPill({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "folk-chip inline-flex h-[20px] items-center whitespace-nowrap px-[8px] text-[11px] font-medium capitalize",
        getFolkStatusClass(label),
        className
      )}
    >
      {label.replace(/-/g, " ")}
    </span>
  )
}
