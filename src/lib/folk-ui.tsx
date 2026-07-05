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

export function folkPrimaryBtnClass(className?: string) {
  return cn("primary-btn", className)
}

export function folkOutlineBtnClass(className?: string) {
  return cn("outline-btn", className)
}

export function folkIconBtnClass(className?: string) {
  return cn("icon-btn", className)
}

/** Pill-shaped filter trigger (Filter, Display). */
export function folkFilterBtnClass(className?: string) {
  return cn("outline-btn folk-pill-btn", className)
}

/** Pill-shaped add trigger (Add new, Add shift, Add task). Solid black fill. */
export function folkAddBtnClass(className?: string) {
  return cn("primary-btn folk-pill-btn", className)
}

/** Primary (solid) pill action trigger — Add new, Approve all, Create invoices, etc. */
export function folkPrimaryAddBtnClass(className?: string) {
  return cn(
    "primary-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors",
    className,
  )
}

/** Pill-shaped clock on/off actions — dark fill on light sidebar band. */
export function folkClockBtnClass(className?: string) {
  return cn(
    "folk-clock-btn inline-flex h-[29px] shrink-0 items-center justify-center gap-[6px] rounded-full bg-[#1a1a1a] px-[16px] text-[13px] font-medium text-white transition-colors hover:bg-[#000000] disabled:opacity-50",
    className,
  )
}

export function folkQuickActionClass(className?: string) {
  return cn(
    "outline-btn h-[29px] min-h-[29px] gap-[5px] px-[10px] text-[12px] font-medium",
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

/**
 * Canonical popup/panel form language — matches the app-wide forms style
 * (38px controls, 6px radius, white fill, blue focus) and folk pill footers.
 * Every modal and side-panel form should use these instead of local variants.
 */
export const FORM_LABEL_CLASS = "mb-[6px] block text-[13px] font-medium text-folk-text"

export const FORM_INPUT_CLASS =
  "h-[38px] w-full rounded-[6px] border border-folk-border bg-white px-[12px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder hover:border-folk-border-strong focus:border-[#a3c4f3]"

export const FORM_TEXTAREA_CLASS =
  "min-h-[72px] w-full resize-y rounded-[6px] border border-folk-border bg-white px-[12px] py-[10px] text-[13px] leading-[1.5] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder hover:border-folk-border-strong focus:border-[#a3c4f3]"

/** Trigger button styled like an input (date pickers, selects). */
export const FORM_FIELD_BUTTON_CLASS =
  "flex h-[38px] w-full items-center justify-between gap-[8px] rounded-[6px] border border-folk-border bg-white px-[12px] text-left text-[13px] text-folk-text outline-none transition-colors hover:border-folk-border-strong focus:border-[#a3c4f3]"

/** Wrapper for inputs with a leading icon; the inner input stays transparent. */
export const FORM_INPUT_WRAPPER_CLASS =
  "flex h-[38px] items-center gap-[7px] rounded-[6px] border border-folk-border bg-white px-[12px] transition-colors hover:border-folk-border-strong focus-within:border-[#a3c4f3]"

export const FORM_FOOTER_CLASS =
  "flex shrink-0 items-center justify-end gap-[8px] border-t border-folk-border-subtle px-[24px] py-[12px]"

export const FORM_FOOTER_PRIMARY_BTN_CLASS =
  "primary-btn folk-pill-btn h-[32px] px-[14px] text-[13px] font-medium transition-colors disabled:opacity-50"

export const FORM_FOOTER_OUTLINE_BTN_CLASS =
  "outline-btn folk-pill-btn h-[32px] px-[12px] text-[13px] font-medium transition-colors disabled:opacity-50"
