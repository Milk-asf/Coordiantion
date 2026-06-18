"use client"

import { useCallback, useRef, useState } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import type { RosterShift } from "@/lib/roster/types"
import { buildShiftDragId, buildTimelineDropId, getRosterShiftCursorClass, shiftTimesFromResize } from "@/lib/roster/dnd-utils"
import { getShiftTimelineStyle } from "@/lib/roster/week-utils"
import { RosterShiftBlock } from "@/components/roster/roster-shift-block"
import { cn } from "@/lib/utils"

interface RosterTimelineShiftProps {
  shift: RosterShift
  rowId: string
  dateStr: string
  showStaffName?: boolean
  disabled?: boolean
  onClick?: (shift: RosterShift) => void
  onTimeChange: (shift: RosterShift, startTime: string, endTime: string) => void
}

export function RosterTimelineShift({
  shift,
  rowId,
  dateStr,
  showStaffName = false,
  disabled = false,
  onClick,
  onTimeChange,
}: RosterTimelineShiftProps) {
  const { top, height } = getShiftTimelineStyle(shift.startTime, shift.endTime)
  const resizeRef = useRef<{ edge: "start" | "end"; startY: number; startTime: string; endTime: string } | null>(null)
  const [previewTimes, setPreviewTimes] = useState<{ startTime: string; endTime: string } | null>(null)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: buildShiftDragId(shift.id),
    disabled,
    data: { shift, kind: "timeline" },
  })

  const displayShift = previewTimes
    ? { ...shift, startTime: previewTimes.startTime, endTime: previewTimes.endTime }
    : shift

  const displayStyle = previewTimes
    ? getShiftTimelineStyle(displayShift.startTime, displayShift.endTime)
    : { top, height }

  const style = transform
    ? {
        top: displayStyle.top,
        height: displayStyle.height,
        transform: CSS.Translate.toString(transform),
      }
    : { top: displayStyle.top, height: displayStyle.height }

  const handleResizePointerDown = useCallback((edge: "start" | "end", event: React.PointerEvent) => {
    if (disabled) return
    event.stopPropagation()
    event.preventDefault()

    resizeRef.current = {
      edge,
      startY: event.clientY,
      startTime: shift.startTime,
      endTime: shift.endTime,
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!resizeRef.current) return
      const deltaY = moveEvent.clientY - resizeRef.current.startY
      const nextTimes = shiftTimesFromResize(
        resizeRef.current.startTime,
        resizeRef.current.endTime,
        resizeRef.current.edge,
        deltaY
      )
      setPreviewTimes(nextTimes)
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (!resizeRef.current) return
      const deltaY = upEvent.clientY - resizeRef.current.startY
      const nextTimes = shiftTimesFromResize(
        resizeRef.current.startTime,
        resizeRef.current.endTime,
        resizeRef.current.edge,
        deltaY
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
  }, [disabled, onTimeChange, shift])

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute left-[8px] right-[8px] z-10 overflow-hidden touch-none",
        getRosterShiftCursorClass(disabled, isDragging),
        isDragging && "z-30 opacity-80"
      )}
      style={style}
      {...listeners}
      {...attributes}
    >
      {!disabled && (
        <div
          className="absolute inset-x-0 top-0 z-20 h-[6px] cursor-ns-resize"
          onPointerDown={(event) => handleResizePointerDown("start", event)}
          aria-hidden="true"
        />
      )}
      <RosterShiftBlock
        shift={displayShift}
        showStaffName={showStaffName}
        className="h-full"
        onClick={onClick}
        isDragging={isDragging}
      />
      {!disabled && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 h-[6px] cursor-ns-resize"
          onPointerDown={(event) => handleResizePointerDown("end", event)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

interface RosterTimelineDropZoneProps {
  rowId: string
  dateStr: string
  height: number
  children: React.ReactNode
}

export function RosterTimelineDropZone({ rowId, dateStr, height, children }: RosterTimelineDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: buildTimelineDropId(rowId, dateStr),
    data: { rowId, dateStr },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex-1 bg-folk-surface",
        isOver && "bg-[color-mix(in_srgb,var(--primary-color)_5%,white)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary-color)_15%,#e8e8e8)]"
      )}
      style={{ height }}
    >
      {children}
    </div>
  )
}
