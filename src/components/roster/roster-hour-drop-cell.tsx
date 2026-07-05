"use client"

import { Plus } from "lucide-react"
import { useDroppable } from "@dnd-kit/core"
import { buildHourDropId } from "@/lib/roster/dnd-utils"
import {
  SHIFT_SELECTOR_ACTIVE_CLASSES,
  SHIFT_SELECTOR_HOVER_CLASSES,
} from "@/components/roster/roster-shift-selector"
import { cn } from "@/lib/utils"

interface RosterHourDropCellProps {
  rowId: string
  dateStr: string
  hour: number
}

export function RosterHourDropCell({
  rowId,
  dateStr,
  hour,
}: RosterHourDropCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: buildHourDropId(rowId, dateStr, hour),
    data: { rowId, dateStr, hour },
  })

  return (
    <div
      ref={setNodeRef}
      data-hour-cell={hour}
      className={cn(
        "group/cell relative h-full bg-folk-surface",
        "border border-dashed border-transparent transition-colors",
        !isOver && SHIFT_SELECTOR_HOVER_CLASSES,
        isOver && SHIFT_SELECTOR_ACTIVE_CLASSES,
      )}
    >
      <Plus
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 text-folk-text opacity-0 transition-opacity group-hover/cell:opacity-100",
          isOver && "opacity-100",
        )}
        strokeWidth={1.5}
        aria-hidden
      />
    </div>
  )
}
