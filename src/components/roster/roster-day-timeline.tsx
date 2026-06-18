"use client"

import type { RosterShift } from "@/lib/roster/types"
import {
  DAY_VIEW_HOUR_HEIGHT,
  formatHourLabel,
  getDayViewHours,
  getDayViewTimelineHeight,
} from "@/lib/roster/week-utils"
import { RosterAddShiftButton } from "@/components/roster/roster-add-shift-button"
import { RosterTimelineDropZone, RosterTimelineShift } from "@/components/roster/roster-timeline-shift"
import { cn } from "@/lib/utils"

const TIME_GUTTER_WIDTH = "w-[56px]"
const GRID_BORDER = "border-[var(--folk-border)]"

interface RosterDayTimelineProps {
  rowId: string
  dateStr: string
  shifts: RosterShift[]
  showStaffName?: boolean
  isToday?: boolean
  onShiftClick?: (shift: RosterShift) => void
  onAddClick?: () => void
  onTimeChange: (shift: RosterShift, startTime: string, endTime: string) => void
}

export function RosterDayTimeline({
  rowId,
  dateStr,
  shifts,
  showStaffName = false,
  isToday = false,
  onShiftClick,
  onAddClick,
  onTimeChange,
}: RosterDayTimelineProps) {
  const hours = getDayViewHours()
  const timelineHeight = getDayViewTimelineHeight()

  return (
    <div className={cn("flex min-w-[320px] flex-1 bg-folk-surface", isToday && "shadow-[inset_0_2px_0_0_var(--primary-color)]")}>
      <div className={cn("sticky left-0 z-10 shrink-0 border-r bg-folk-surface", GRID_BORDER, TIME_GUTTER_WIDTH)}>
        {hours.map((hour) => (
          <div
            key={hour}
            className={cn("relative border-b", GRID_BORDER)}
            style={{ height: DAY_VIEW_HOUR_HEIGHT }}
          >
            <span className="absolute -top-[7px] right-[8px] text-[10px] font-medium text-folk-secondary">
              {formatHourLabel(hour)}
            </span>
          </div>
        ))}
      </div>

      <RosterTimelineDropZone rowId={rowId} dateStr={dateStr} height={timelineHeight}>
        <div className="group relative h-full bg-folk-surface">
          {hours.map((hour) => (
            <div
              key={hour}
              className={cn("border-b", GRID_BORDER)}
              style={{ height: DAY_VIEW_HOUR_HEIGHT }}
            />
          ))}

          {hours.slice(0, -1).map((hour, index) => (
            <div
              key={`half-${hour}`}
              className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-[#f5f5f5]"
              style={{ top: (index + 1) * DAY_VIEW_HOUR_HEIGHT - DAY_VIEW_HOUR_HEIGHT / 2 }}
            />
          ))}

          {onAddClick && (
            <RosterAddShiftButton
              onClick={onAddClick}
              label={shifts.length > 0 ? "Add another shift" : "Add shift"}
              className="absolute inset-x-[8px] top-[8px] z-0"
            />
          )}

          {shifts.map((shift) => (
            <RosterTimelineShift
              key={shift.id}
              shift={shift}
              rowId={rowId}
              dateStr={dateStr}
              showStaffName={showStaffName}
              disabled={shift.status === "cancelled"}
              onClick={onShiftClick}
              onTimeChange={onTimeChange}
            />
          ))}
        </div>
      </RosterTimelineDropZone>
    </div>
  )
}

export { TIME_GUTTER_WIDTH }
