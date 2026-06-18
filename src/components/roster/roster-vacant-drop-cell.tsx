"use client"

import { useDroppable } from "@dnd-kit/core"
import { buildVacantDropId } from "@/lib/roster/dnd-utils"
import { cn } from "@/lib/utils"

interface RosterVacantDropCellProps {
  dateStr: string
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

export function RosterVacantDropCell({
  dateStr,
  className,
  style,
  children,
}: RosterVacantDropCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: buildVacantDropId(dateStr),
    data: { dateStr, type: "vacant" },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver &&
          "bg-[color-mix(in_srgb,var(--primary-color)_6%,white)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary-color)_18%,#e8e8e8)]"
      )}
      style={style}
    >
      {children}
    </div>
  )
}
