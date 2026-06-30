"use client"

import type { ComponentType, ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Small grey label beside a value — matches Folk contact detail sidebars. */
export function folkSidebarLabelClass(className?: string) {
  return cn("text-[12px] font-normal leading-[1.4] text-[#616161]", className)
}

/** Default value text styling for read-only sidebar fields. */
export function folkSidebarValueClass(className?: string) {
  return cn("min-w-0 text-[13px] font-normal text-folk-text", className)
}

/** Hover surface for clickable property values (entity pickers, inline edit triggers). */
export function folkSidebarValueButtonClass(className?: string) {
  return cn(
    "flex min-w-0 items-center gap-[7px] rounded-md px-[8px] py-[6px] text-left transition-colors hover:bg-folk-page",
    className
  )
}

interface FolkSidebarFieldProps {
  label: string
  children: ReactNode
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>
  align?: "start" | "center"
  className?: string
  valueClassName?: string
}

export function FolkSidebarField({
  label,
  children,
  icon: Icon,
  align = "center",
  className,
  valueClassName,
}: FolkSidebarFieldProps) {
  return (
    <div
      className={cn(
        "flex gap-[10px] py-[5px]",
        align === "center" ? "items-center" : "items-start",
        className
      )}
    >
      <div
        className={cn(
          folkSidebarLabelClass(),
          "w-[100px] shrink-0",
          align === "center" ? "" : "pt-[6px]"
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          folkSidebarValueClass(),
          "flex min-w-0 flex-1 items-center gap-[8px]",
          valueClassName
        )}
      >
        {Icon && (
          <Icon className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

interface FolkSidebarStaticValueProps {
  value: string
  emptyLabel?: string
  className?: string
}

export function FolkSidebarStaticValue({
  value,
  emptyLabel = "Empty",
  className,
}: FolkSidebarStaticValueProps) {
  return (
    <span className={cn(value ? "text-folk-text" : "text-folk-placeholder", className)}>
      {value || emptyLabel}
    </span>
  )
}
