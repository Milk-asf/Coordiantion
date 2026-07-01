"use client"

import { useDroppable } from "@dnd-kit/core"
import { buildCellDropId } from "@/lib/roster/dnd-utils"
import { cn } from "@/lib/utils"

interface RosterDropCellProps {
  rowId: string
  dateStr: string
  className?: string
  children: React.ReactNode
  onAddShift?: () => void
}

export function RosterDropCell({ rowId, dateStr, className, children, onAddShift }: RosterDropCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: buildCellDropId(rowId, dateStr),
    data: { rowId, dateStr },
  })

  const handleCellClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onAddShift) return
    const target = event.target as HTMLElement
    if (target.closest("[data-shift-block], [data-shift-string-group], [data-roster-add-shift], button, a")) return
    onAddShift()
  }

  return (
    <div
      ref={setNodeRef}
      onClick={handleCellClick}
      className={cn(
        "group/cell relative min-h-full group-hover/cell:cursor-pointer",
        className,
        isOver &&
          "bg-[color-mix(in_srgb,var(--primary-color)_6%,white)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary-color)_18%,#e8e8e8)]",
      )}
    >
      {children}
    </div>
  )
}
