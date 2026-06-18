"use client"

import type { ReactNode, ComponentType } from "react"
import { cn } from "@/lib/utils"

interface DetailRowProps {
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  children: ReactNode
  labelWidthClassName?: string
  rowClassName?: string
  valueClassName?: string
  layout?: "stacked" | "inline"
}

export function DetailRow({
  icon: Icon,
  label,
  children,
  labelWidthClassName = "w-[180px]",
  rowClassName,
  valueClassName,
  layout = "stacked",
}: DetailRowProps) {
  const useInlineLayout =
    layout === "inline" ||
    (layout === "stacked" && labelWidthClassName !== "w-[180px]")

  if (useInlineLayout) {
    return (
      <div className={cn("flex items-center gap-[12px] py-[6px]", rowClassName)}>
        <div
          className={cn(
            "flex shrink-0 items-center gap-[8px] text-[13px] font-normal leading-none text-folk-secondary",
            labelWidthClassName
          )}
        >
          {Icon ? (
            <Icon className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
          ) : (
            <span className="inline-block h-[14px] w-[14px] shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">{label}</span>
        </div>
        <div className={cn("min-w-0 flex-1 text-[13px] font-normal text-folk-text", valueClassName)}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("py-[10px]", rowClassName)}>
      <div className="mb-[4px] flex items-center gap-[6px] text-[11px] font-normal text-folk-secondary">
        {Icon && <Icon className="h-[12px] w-[12px]" strokeWidth={1.5} />}
        <span>{label}</span>
      </div>
      <div className={cn("text-[13px] font-normal text-folk-text", valueClassName)}>{children}</div>
    </div>
  )
}

export function SectionHeader({ title, className }: { title: string; className?: string }) {
  return (
    <h3 className={className || "mb-[8px] mt-[4px] text-[12px] font-medium text-folk-text"}>
      {title}
    </h3>
  )
}
