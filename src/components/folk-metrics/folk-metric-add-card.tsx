"use client"

import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface FolkMetricAddCardProps {
  title?: string
  onClick?: () => void
  className?: string
}

export function FolkMetricAddCard({ title, onClick, className }: FolkMetricAddCardProps) {
  const shellClassName = cn(
    "flex min-h-[220px] w-full flex-col rounded-md border border-folk-border bg-[#FAFAFA] text-left transition-colors",
    onClick && "cursor-pointer hover:bg-[#F5F5F5]",
    className
  )

  const content = (
    <>
      {title ? (
        <div className="px-[16px] pt-[14px]">
          <span className="truncate text-[12px] font-normal text-folk-secondary">{title}</span>
        </div>
      ) : null}
      <div className="flex flex-1 items-center justify-center pb-[20px] pt-[8px]">
        <Plus className="h-[18px] w-[18px] text-folk-secondary" strokeWidth={1.75} />
      </div>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shellClassName} tabIndex={0} aria-label="Add chart">
        {content}
      </button>
    )
  }

  return <div className={shellClassName}>{content}</div>
}
