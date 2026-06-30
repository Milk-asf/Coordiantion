"use client"

import { Plus } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface TableAddNewButtonProps {
  label?: string
  onClick?: () => void
  className?: string
}

/** Inline “+ Add new” control below a table (Folk-style). */
export function TableAddNewButton({ label = "Add new", onClick, className }: TableAddNewButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-[6px] text-[13px] font-medium text-folk-secondary transition-colors hover:text-folk-text",
        className,
      )}
      tabIndex={0}
      aria-label={label}
    >
      <Plus className="h-[14px] w-[14px]" strokeWidth={1.75} />
      <span>{label}</span>
    </button>
  )
}

interface TableAddFooterProps {
  children: ReactNode
  className?: string
}

/** Compact footer below a table — button only, no empty grid row. */
export function TableAddFooter({ children, className }: TableAddFooterProps) {
  return <div className={cn("bg-folk-surface px-[16px] py-[8px]", className)}>{children}</div>
}

/** @deprecated Use TableAddFooter — kept as alias for existing imports. */
export const TableAddRow = TableAddFooter
