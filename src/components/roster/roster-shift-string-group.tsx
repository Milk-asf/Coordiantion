"use client"

import type { RosterShift } from "@/lib/roster/types"
import { RosterDraggableShift } from "@/components/roster/roster-draggable-shift"

interface RosterShiftStringGroupProps {
  stringId: string
  shifts: RosterShift[]
  showStaffName?: boolean
  disabled?: boolean
  onClick?: (shift: RosterShift) => void
}

/** Renders linked string parts as separate shift cards. */
export function RosterShiftStringGroup({
  stringId,
  shifts,
  showStaffName = false,
  disabled = false,
  onClick,
}: RosterShiftStringGroupProps) {
  return (
    <div className="flex flex-col gap-[6px]" data-shift-string-group data-shift-string-id={stringId}>
      {shifts.map((shift) => (
        <RosterDraggableShift
          key={shift.id}
          shift={shift}
          showStaffName={showStaffName}
          disabled={disabled}
          onClick={onClick}
        />
      ))}
    </div>
  )
}
