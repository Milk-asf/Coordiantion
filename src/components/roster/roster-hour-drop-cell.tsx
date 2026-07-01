"use client"

import { useDroppable } from "@dnd-kit/core"
import { buildHourDropId } from "@/lib/roster/dnd-utils"
import {
  RosterShiftSelector,
  SHIFT_SELECTOR_ACTIVE_CLASSES,
  SHIFT_SELECTOR_GROUP_HOVER_CLASSES,
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
      className="group/cell relative flex h-full items-center justify-center bg-folk-surface"
    >
      <RosterShiftSelector
        fullWidth={false}
        className={cn(
          "pointer-events-none z-[1] h-[36px] w-[36px] opacity-0 transition-opacity group-hover/cell:opacity-100",
          SHIFT_SELECTOR_GROUP_HOVER_CLASSES,
          isOver && "opacity-100",
          isOver && SHIFT_SELECTOR_ACTIVE_CLASSES,
        )}
      />
    </div>
  )
}
