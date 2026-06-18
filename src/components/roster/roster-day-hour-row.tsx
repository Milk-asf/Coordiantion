"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import type { RosterShift, ShiftFormContext } from "@/lib/roster/types"
import {
  DAY_VIEW_HOUR_WIDTH,
  DAY_VIEW_ROW_HEIGHT,
  DAY_VIEW_SHIFT_INSET,
  getDayViewHourWidthFromContainer,
  getDayViewHours,
  getDayViewShiftBlockHeight,
  getHourIndexFromOffset,
  getShiftHourGridStyle,
  getShiftTimesForHourSelection,
} from "@/lib/roster/week-utils"
import { RosterHourDropCell } from "@/components/roster/roster-hour-drop-cell"
import { RosterHourShift } from "@/components/roster/roster-hour-shift"
import { RosterPendingShiftPreview } from "@/components/roster/roster-pending-shift-preview"
import { RosterShiftSelector } from "@/components/roster/roster-shift-selector"

interface HourSelection {
  startHour: number
  endHour: number
}

interface RosterDayHourRowProps {
  rowId: string
  dateStr: string
  shifts: RosterShift[]
  showStaffName?: boolean
  isToday?: boolean
  pendingShiftPreview?: ShiftFormContext | null
  onShiftClick?: (shift: RosterShift) => void
  onCreateShift: (startTime: string, endTime: string) => void
  onTimeChange: (shift: RosterShift, startTime: string, endTime: string) => void
}

export function RosterDayHourRow({
  rowId,
  dateStr,
  shifts,
  showStaffName = false,
  isToday = false,
  pendingShiftPreview = null,
  onShiftClick,
  onCreateShift,
  onTimeChange,
}: RosterDayHourRowProps) {
  const hours = getDayViewHours()
  const gridRef = useRef<HTMLDivElement>(null)
  const [hourWidth, setHourWidth] = useState(DAY_VIEW_HOUR_WIDTH)
  const [selection, setSelection] = useState<HourSelection | null>(null)
  const selectionRef = useRef<HourSelection | null>(null)

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    const updateHourWidth = () => {
      setHourWidth(getDayViewHourWidthFromContainer(grid.clientWidth, hours.length))
    }

    updateHourWidth()

    const observer = new ResizeObserver(updateHourWidth)
    observer.observe(grid)
    return () => observer.disconnect()
  }, [hours.length])

  const getSelectionStyle = useCallback((value: HourSelection) => {
    const { startTime, endTime } = getShiftTimesForHourSelection(value.startHour, value.endHour)
    return getShiftHourGridStyle(startTime, endTime, hourWidth)
  }, [hourWidth])

  const handleGridPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest("[data-shift-block]")) return

    const grid = gridRef.current
    if (!grid) return

    event.preventDefault()
    event.stopPropagation()
    grid.setPointerCapture(event.pointerId)

    const rect = grid.getBoundingClientRect()
    const startHour = getHourIndexFromOffset(event.clientX - rect.left, hourWidth)
    const nextSelection = { startHour, endHour: startHour }
    selectionRef.current = nextSelection
    setSelection(nextSelection)

    const finishSelection = () => {
      if (grid.hasPointerCapture(event.pointerId)) {
        grid.releasePointerCapture(event.pointerId)
      }
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
      document.removeEventListener("pointercancel", handlePointerCancel)

      const current = selectionRef.current
      selectionRef.current = null
      setSelection(null)
      if (!current) return

      const { startTime, endTime } = getShiftTimesForHourSelection(current.startHour, current.endHour)
      onCreateShift(startTime, endTime)
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!selectionRef.current || !gridRef.current) return
      moveEvent.preventDefault()

      const gridRect = gridRef.current.getBoundingClientRect()
      const measuredWidth = getDayViewHourWidthFromContainer(gridRect.width, hours.length)
      const endHour = getHourIndexFromOffset(moveEvent.clientX - gridRect.left, measuredWidth)
      const updated = { ...selectionRef.current, endHour }
      selectionRef.current = updated
      setSelection(updated)
    }

    const handlePointerUp = () => {
      finishSelection()
    }

    const handlePointerCancel = () => {
      selectionRef.current = null
      setSelection(null)
      if (grid.hasPointerCapture(event.pointerId)) {
        grid.releasePointerCapture(event.pointerId)
      }
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
      document.removeEventListener("pointercancel", handlePointerCancel)
    }

    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
    document.addEventListener("pointercancel", handlePointerCancel)
  }, [hourWidth, hours.length, onCreateShift])

  return (
    <div className="relative h-full w-full overflow-hidden bg-folk-surface">
      <div
        ref={gridRef}
        className="relative h-full overflow-hidden cursor-pointer touch-none select-none"
        style={{ height: DAY_VIEW_ROW_HEIGHT }}
        onPointerDown={handleGridPointerDown}
      >
        <div
          className="absolute inset-0 grid gap-px bg-[var(--folk-border)]"
          style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}
        >
          {hours.map((hour) => (
            <RosterHourDropCell
              key={hour}
              rowId={rowId}
              dateStr={dateStr}
              hour={hour}
            />
          ))}
        </div>

        {selection && (
          <RosterShiftSelector
            active
            className="pointer-events-none absolute z-[1]"
            style={{
              ...getSelectionStyle(selection),
              top: DAY_VIEW_SHIFT_INSET,
              height: getDayViewShiftBlockHeight(),
            }}
          />
        )}

        {shifts.map((shift) => (
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

        {pendingShiftPreview && (
          <RosterPendingShiftPreview
            draft={pendingShiftPreview}
            hourWidth={hourWidth}
            showStaffName={showStaffName}
          />
        )}
      </div>
    </div>
  )
}

export { DAY_VIEW_HOUR_WIDTH }
