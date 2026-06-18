"use client"

import { useMemo } from "react"
import type { ShiftFormContext } from "@/lib/roster/types"
import { useRosterContext } from "@/lib/roster-context"
import { formatShiftTime, getDayViewShiftBlockHeight, getShiftHourGridStyle, DAY_VIEW_HOUR_WIDTH, DAY_VIEW_SHIFT_INSET } from "@/lib/roster/week-utils"
import { EntityIcon } from "@/components/entity-icon"
import { cn } from "@/lib/utils"

interface RosterPendingShiftPreviewProps {
  draft: ShiftFormContext
  hourWidth?: number
  showStaffName?: boolean
  className?: string
}

export function RosterPendingShiftPreview({
  draft,
  hourWidth = DAY_VIEW_HOUR_WIDTH,
  showStaffName = false,
  className,
}: RosterPendingShiftPreviewProps) {
  const { activeStaff, activeClients } = useRosterContext()

  const staff = useMemo(
    () => activeStaff.find((member) => member.id === draft.staffId),
    [activeStaff, draft.staffId]
  )

  const client = useMemo(
    () => activeClients.find((entry) => entry.id === draft.clientId),
    [activeClients, draft.clientId]
  )

  if (!draft.startTime || !draft.endTime) return null

  const { left, width } = getShiftHourGridStyle(draft.startTime, draft.endTime, hourWidth)
  const assigneeName = showStaffName ? staff?.name : client?.displayName
  const assigneeIcon = showStaffName ? staff?.iconText : client?.iconText
  const timeLabel = formatShiftTime(draft.startTime, draft.endTime)

  const shiftBlockHeight = getDayViewShiftBlockHeight()

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-[5] overflow-hidden rounded-none border border-dashed border-[var(--primary-color)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        className
      )}
      style={{ left, width, top: DAY_VIEW_SHIFT_INSET, height: shiftBlockHeight, maxHeight: shiftBlockHeight }}
      aria-hidden="true"
    >
      <div className="flex h-full min-h-0 flex-col gap-[4px] overflow-hidden px-[8px] py-[6px]">
        <p className="shrink-0 truncate text-[12px] font-semibold leading-tight text-[var(--primary-color)]">{timeLabel}</p>

        <div className="flex min-w-0 shrink-0 items-center gap-[6px]">
          <EntityIcon text={assigneeIcon ?? "?"} size="sm" />
          <p className="min-w-0 flex-1 truncate text-[12px] font-medium leading-tight text-folk-text">
            {assigneeName || "New shift"}
          </p>
        </div>
      </div>
    </div>
  )
}
