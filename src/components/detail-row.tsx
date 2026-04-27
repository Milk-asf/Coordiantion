"use client"

import type { ReactNode, ComponentType } from "react"

interface DetailRowProps {
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  children: ReactNode
  labelWidthClassName?: string
  rowClassName?: string
  valueClassName?: string
}

export function DetailRow({
  icon: Icon,
  label,
  children,
  labelWidthClassName = "w-[180px]",
  rowClassName = "flex items-center py-[7px]",
  valueClassName = "min-w-0 flex-1 text-[13px] font-medium text-[#262626]",
}: DetailRowProps) {
  return (
    <div className={rowClassName}>
      <div className={`flex shrink-0 items-center gap-[8px] text-[13px] font-medium text-[#888] ${labelWidthClassName}`}>
        {Icon && <Icon className="h-[14px] w-[14px] text-[#999]" strokeWidth={1.5} />}
        <span>{label}</span>
      </div>
      <div className={valueClassName}>{children}</div>
    </div>
  )
}

export function SectionHeader({ title, className }: { title: string; className?: string }) {
  return (
    <h3 className={className || "mb-[4px] ml-[22px] mt-[12px] text-[11px] font-medium tracking-wide text-[#888]"}>
      {title}
    </h3>
  )
}
