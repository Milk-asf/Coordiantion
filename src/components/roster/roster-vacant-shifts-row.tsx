"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import type { RosterShift } from "@/lib/roster/types"
import {
  DAY_VIEW_HOUR_WIDTH,
  DAY_VIEW_ROW_HEIGHT,
  getDayViewHourWidthFromContainer,
  getDayViewHours,
  shiftDurationHours,
} from "@/lib/roster/week-utils"
import { getVacantShiftsForDate } from "@/lib/roster/vacant-shift-utils"
import { RosterCellShiftItem } from "@/components/roster/roster-cell-shift-item"
import { RosterHourShift } from "@/components/roster/roster-hour-shift"
import { RosterVacantDropCell } from "@/components/roster/roster-vacant-drop-cell"
import {
  rosterStickyRowColClass,
  rosterStickyTopClass,
  ROSTER_GRID_CELL,
  ROSTER_STICKY_BELOW_HEADER,
} from "@/components/roster/roster-grid-styles"
import { groupShiftsForCell } from "@/lib/roster/shift-string-utils"
import { cn } from "@/lib/utils"

const GRID_CELL = ROSTER_GRID_CELL
const ROW_HEIGHT = "min-h-[96px]"
const DAY_VIEW_ROW_CLASS = "h-[96px] overflow-hidden"

interface RosterVacantShiftsRowProps {
  isDayView: boolean
  focusDateStr: string
  visibleDayDates: string[]
  vacantShifts: RosterShift[]
  onShiftClick?: (shift: RosterShift) => void
  onTimeChange: (shift: RosterShift, startTime: string, endTime: string) => void
}

function VacantSidebarCell({
  vacantHours,
  className,
}: {
  vacantHours: number
  className?: string
}) {
  return (
    <div
      className={cn(
        rosterStickyRowColClass("flex items-center py-[10px] pl-[10px] pr-[6px]"),
        GRID_CELL,
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold leading-tight text-folk-text">Vacant shifts</p>
        <p className="mt-[2px] text-[10px] font-medium text-folk-secondary">
          {vacantHours.toFixed(1)} hrs
        </p>
      </div>
    </div>
  )
}

export function RosterVacantShiftsRow({
  isDayView,
  focusDateStr,
  visibleDayDates,
  vacantShifts,
  onShiftClick,
  onTimeChange,
}: RosterVacantShiftsRowProps) {
  const showStaffName = false
  const dayViewGridRef = useRef<HTMLDivElement>(null)
  const [hourWidth, setHourWidth] = useState(DAY_VIEW_HOUR_WIDTH)
  const hours = getDayViewHours()
  const dayViewVacantShifts = getVacantShiftsForDate(vacantShifts, focusDateStr)

  const vacantHours = useMemo(
    () =>
      vacantShifts.reduce((total, shift) => {
        if (shift.status === "cancelled") return total
        return total + shiftDurationHours(shift.startTime, shift.endTime)
      }, 0),
    [vacantShifts]
  )

  useLayoutEffect(() => {
    if (!isDayView) return
    const grid = dayViewGridRef.current
    if (!grid) return

    const updateHourWidth = () => {
      setHourWidth(getDayViewHourWidthFromContainer(grid.clientWidth, hours.length))
    }

    updateHourWidth()
    const observer = new ResizeObserver(updateHourWidth)
    observer.observe(grid)
    return () => observer.disconnect()
  }, [hours.length, isDayView])

  const sidebarClassName = isDayView ? DAY_VIEW_ROW_CLASS : ROW_HEIGHT

  return (
    <div className="contents">
      <VacantSidebarCell vacantHours={vacantHours} className={sidebarClassName} />

      {isDayView ? (
        <RosterVacantDropCell
          dateStr={focusDateStr}
          className={cn(
            rosterStickyTopClass(undefined, ROSTER_STICKY_BELOW_HEADER),
            GRID_CELL,
            DAY_VIEW_ROW_CLASS
          )}
          style={{ gridColumn: "2 / -1" }}
        >
          <div className="relative h-full w-full overflow-hidden bg-folk-surface">
            <div
              ref={dayViewGridRef}
              className="relative h-full overflow-hidden"
              style={{ height: DAY_VIEW_ROW_HEIGHT }}
            >
              <div
                className="absolute inset-0 grid gap-px bg-[var(--folk-border)]"
                style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}
              >
                {hours.map((hour) => (
                  <div key={`vacant-hour-${hour}`} className={GRID_CELL} />
                ))}
              </div>

              {dayViewVacantShifts.map((shift) => (
                  <RosterHourShift
                    key={shift.id}
                    shift={shift}
                    hourWidth={hourWidth}
                    showStaffName={showStaffName}
                    disabled={shift.status === "cancelled"}
                    onClick={onShiftClick}
                    onTimeChange={onTimeChange}
                  />
                ))}
            </div>
          </div>
        </RosterVacantDropCell>
      ) : (
        visibleDayDates.map((dateStr) => {
          const dayVacantShifts = getVacantShiftsForDate(vacantShifts, dateStr)

          return (
            <RosterVacantDropCell
              key={`vacant-${dateStr}`}
              dateStr={dateStr}
              className={cn(
                rosterStickyTopClass("flex flex-col gap-[6px] p-[8px]", ROSTER_STICKY_BELOW_HEADER),
                GRID_CELL,
                ROW_HEIGHT
              )}
            >
              {groupShiftsForCell(dayVacantShifts, vacantShifts).map((item) => (
                <RosterCellShiftItem
                  key={item.kind === "string" ? item.stringId : item.shift.id}
                  item={item}
                  showStaffName={showStaffName}
                  disabled={
                    item.kind === "string"
                      ? item.shifts.every((shift) => shift.status === "cancelled")
                      : item.shift.status === "cancelled"
                  }
                  onClick={onShiftClick}
                />
              ))}
            </RosterVacantDropCell>
          )
        })
      )}
    </div>
  )
}
