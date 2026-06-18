"use client"

import { useCallback, useRef, useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import type { RosterShift } from "@/lib/roster/types"
import { buildShiftDragId, getRosterShiftCursorClass, shiftTimesFromHorizontalResize } from "@/lib/roster/dnd-utils"
import { DAY_VIEW_HOUR_WIDTH, DAY_VIEW_SHIFT_INSET, getDayViewShiftBlockHeight, getShiftHourGridStyle } from "@/lib/roster/week-utils"
import { RosterShiftBlock } from "@/components/roster/roster-shift-block"
import { cn } from "@/lib/utils"

interface RosterHourShiftProps {
  shift: RosterShift
  hourWidth?: number
  showStaffName?: boolean
  disabled?: boolean
  onClick?: (shift: RosterShift) => void
  onTimeChange: (shift: RosterShift, startTime: string, endTime: string) => void
}

export function RosterHourShift({
  shift,
  hourWidth = DAY_VIEW_HOUR_WIDTH,
  showStaffName = false,
  disabled = false,
  onClick,
  onTimeChange,
}: RosterHourShiftProps) {
  const { left, width } = getShiftHourGridStyle(shift.startTime, shift.endTime, hourWidth)
  const resizeRef = useRef<{ edge: "start" | "end"; startX: number; startTime: string; endTime: string } | null>(null)
  const [previewTimes, setPreviewTimes] = useState<{ startTime: string; endTime: string } | null>(null)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: buildShiftDragId(shift.id),
    disabled,
    data: { shift, kind: "hour-grid" },
  })

  const displayShift = previewTimes
    ? { ...shift, startTime: previewTimes.startTime, endTime: previewTimes.endTime }
    : shift

  const displayStyle = previewTimes
    ? getShiftHourGridStyle(displayShift.startTime, displayShift.endTime, hourWidth)
    : { left, width }

  const style = transform
    ? {
        left: displayStyle.left,
        width: displayStyle.width,
        transform: CSS.Translate.toString(transform),
      }
    : { left: displayStyle.left, width: displayStyle.width }

  const handleResizePointerDown = useCallback((edge: "start" | "end", event: React.PointerEvent) => {
    if (disabled) return
    event.stopPropagation()
    event.preventDefault()

    resizeRef.current = {
      edge,
      startX: event.clientX,
      startTime: shift.startTime,
      endTime: shift.endTime,
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!resizeRef.current) return
      const deltaX = moveEvent.clientX - resizeRef.current.startX
      const nextTimes = shiftTimesFromHorizontalResize(
        resizeRef.current.startTime,
        resizeRef.current.endTime,
        resizeRef.current.edge,
        deltaX,
        hourWidth
      )
      setPreviewTimes(nextTimes)
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (!resizeRef.current) return
      const deltaX = upEvent.clientX - resizeRef.current.startX
      const nextTimes = shiftTimesFromHorizontalResize(
        resizeRef.current.startTime,
        resizeRef.current.endTime,
        resizeRef.current.edge,
        deltaX,
        hourWidth
      )
      resizeRef.current = null
      setPreviewTimes(null)
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)

      if (nextTimes.startTime !== shift.startTime || nextTimes.endTime !== shift.endTime) {
        onTimeChange(shift, nextTimes.startTime, nextTimes.endTime)
      }
    }

    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
  }, [disabled, hourWidth, onTimeChange, shift])

  const shiftBlockHeight = getDayViewShiftBlockHeight()

  return (
    <div
      ref={setNodeRef}
      data-shift-block
      data-shift-id={shift.id}
      data-shift-string-id={shift.shiftStringId ?? undefined}
      className={cn(
        "absolute z-10 touch-none overflow-hidden",
        getRosterShiftCursorClass(disabled, isDragging),
        isDragging && "z-30 opacity-80"
      )}
      style={{
        ...style,
        top: DAY_VIEW_SHIFT_INSET,
        height: shiftBlockHeight,
        maxHeight: shiftBlockHeight,
      }}
      {...listeners}
      {...attributes}
    >
      {!disabled && (
        <div
          className="absolute inset-y-0 left-0 z-20 w-[6px] cursor-ew-resize"
          onPointerDown={(event) => handleResizePointerDown("start", event)}
          aria-hidden="true"
        />
      )}
      <RosterShiftBlock
        shift={displayShift}
        showStaffName={showStaffName}
        layout="hour-grid"
        className="h-full min-w-0"
        onClick={onClick}
        isDragging={isDragging}
      />
      {!disabled && (
        <div
          className="absolute inset-y-0 right-0 z-20 w-[6px] cursor-ew-resize"
          onPointerDown={(event) => handleResizePointerDown("end", event)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
