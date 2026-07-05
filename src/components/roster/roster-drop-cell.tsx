"use client"

import { useDroppable } from "@dnd-kit/core"
import { buildCellDropId } from "@/lib/roster/dnd-utils"
import { cn } from "@/lib/utils"

interface RosterDropCellProps {
  rowId: string
  dateStr: string
  className?: string
  children: React.ReactNode
}

export function RosterDropCell({ rowId, dateStr, className, children }: RosterDropCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: buildCellDropId(rowId, dateStr),
    data: { rowId, dateStr },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // group/cell lets add zones light up when hovering anywhere in the day
        // cell, not just the zone strip itself.
        "group/cell relative min-h-full",
        className,
        isOver &&
          "bg-[color-mix(in_srgb,var(--primary-color)_6%,white)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary-color)_18%,#e8e8e8)]",
      )}
    >
      {children}
    </div>
  )
}
