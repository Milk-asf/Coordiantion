"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import type { RosterShift } from "@/lib/roster/types"
import { buildShiftDragId, getRosterShiftCursorClass } from "@/lib/roster/dnd-utils"
import { RosterShiftBlock } from "@/components/roster/roster-shift-block"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { cn } from "@/lib/utils"

interface RosterDraggableShiftProps {
  shift: RosterShift
  showStaffName?: boolean
  className?: string
  disabled?: boolean
  onClick?: (shift: RosterShift) => void
}

export function RosterDraggableShift({
  shift,
  showStaffName = false,
  className,
  disabled = false,
  onClick,
}: RosterDraggableShiftProps) {
  const { canManageRoster } = usePermissions()
  const isDragDisabled = disabled || !canManageRoster
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: buildShiftDragId(shift.id),
    disabled: isDragDisabled,
    data: { shift },
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-shift-block
      data-shift-id={shift.id}
      data-shift-string-id={shift.shiftStringId ?? undefined}
      className={cn(
        "touch-none",
        getRosterShiftCursorClass(isDragDisabled, isDragging),
        isDragging && "relative z-20 opacity-40",
        className
      )}
      {...listeners}
      {...attributes}
    >
      <RosterShiftBlock
        shift={shift}
        showStaffName={showStaffName}
        className="h-full"
        onClick={onClick}
        isDragging={isDragging}
      />
    </div>
  )
}
