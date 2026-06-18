"use client"

import type { CellShiftItem } from "@/lib/roster/shift-string-utils"
import type { RosterShift } from "@/lib/roster/types"
import { RosterDraggableShift } from "@/components/roster/roster-draggable-shift"
import { RosterShiftStringGroup } from "@/components/roster/roster-shift-string-group"

interface RosterCellShiftItemProps {
  item: CellShiftItem
  showStaffName?: boolean
  disabled?: boolean
  onClick?: (shift: RosterShift) => void
}

export function RosterCellShiftItem({
  item,
  showStaffName = false,
  disabled = false,
  onClick,
}: RosterCellShiftItemProps) {
  if (item.kind === "string") {
    return (
      <RosterShiftStringGroup
        stringId={item.stringId}
        shifts={item.shifts}
        showStaffName={showStaffName}
        disabled={disabled}
        onClick={onClick}
      />
    )
  }

  return (
    <RosterDraggableShift
      shift={item.shift}
      showStaffName={showStaffName}
      disabled={disabled}
      onClick={onClick}
    />
  )
}
