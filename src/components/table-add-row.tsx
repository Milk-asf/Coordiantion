"use client"

import { Plus } from "lucide-react"
import type { ReactNode } from "react"
import { TABLE_CELL_LAST, TABLE_CELL_STICKY_EDGE, TABLE_STICKY_DIVIDER } from "@/lib/table-styles"
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

/** Closed-off row below a table — bordered like the grid, matching row height. */
export function TableAddFooter({ children, className }: TableAddFooterProps) {
  return (
    <div className={cn("flex h-[36px] items-center border-b border-folk-border bg-folk-surface px-[16px]", className)}>
      {children}
    </div>
  )
}

interface TableAddFooterRowProps {
  children: ReactNode
  /** Number of columns after the sticky first cell (or total when `stickyFirst` is false). */
  colSpan: number
  /** When true, the add control sits in a sticky first column and `colSpan` fills the rest. */
  stickyFirst?: boolean
  /**
   * `full` — filler runs to the last table column (entity lists).
   * `list` — filler stops at the last data column, before a trailing add-column cell.
   */
  variant?: "full" | "list"
  className?: string
}

/**
 * Table footer row that scrolls with the grid — use inside `<table>` so the add
 * row border extends across all columns when horizontally scrolled.
 */
export function TableAddFooterRow({
  children,
  colSpan,
  stickyFirst = true,
  variant = "full",
  className,
}: TableAddFooterRowProps) {
  const fillerClassName = cn(
    TABLE_CELL_LAST,
    "h-[36px] border-b border-folk-border bg-folk-surface p-0",
    variant === "list" && TABLE_STICKY_DIVIDER,
  )

  return (
    <tfoot>
      <tr>
        {stickyFirst ? (
          <>
            <td
              className={cn(
                TABLE_CELL_STICKY_EDGE,
                "sticky left-0 z-[1] h-[36px] bg-folk-surface px-[16px]",
                className,
              )}
            >
              {children}
            </td>
            {colSpan > 0 ? <td colSpan={colSpan} className={fillerClassName} aria-hidden="true" /> : null}
          </>
        ) : (
          <td
            colSpan={Math.max(1, colSpan)}
            className={cn("h-[36px] border-b border-folk-border bg-folk-surface px-[16px]", className)}
          >
            {children}
          </td>
        )}
      </tr>
    </tfoot>
  )
}

/** @deprecated Use TableAddFooterRow inside the table — kept as alias for existing imports. */
export const TableAddRow = TableAddFooter
