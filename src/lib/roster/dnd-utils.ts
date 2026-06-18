import {
  DAY_VIEW_HOUR_HEIGHT,
  DAY_VIEW_HOUR_WIDTH,
  getDayViewEndHour,
  getDayViewStartHour,
  timeToMinutes,
} from "@/lib/roster/week-utils"

export const ROSTER_SHIFT_DRAG_PREFIX = "shift:"
export const ROSTER_CELL_DROP_PREFIX = "cell:"
export const ROSTER_TIMELINE_DROP_PREFIX = "timeline:"
export const ROSTER_HOUR_DROP_PREFIX = "hour:"
export const ROSTER_VACANT_DROP_PREFIX = "vacant:"

export function buildShiftDragId(shiftId: string) {
  return `${ROSTER_SHIFT_DRAG_PREFIX}${shiftId}`
}

export function parseShiftDragId(id: string): string | null {
  if (!id.startsWith(ROSTER_SHIFT_DRAG_PREFIX)) return null
  return id.slice(ROSTER_SHIFT_DRAG_PREFIX.length)
}

export function buildCellDropId(rowId: string, dateStr: string) {
  return `${ROSTER_CELL_DROP_PREFIX}${rowId}:${dateStr}`
}

export function parseCellDropId(id: string): { rowId: string; dateStr: string } | null {
  if (!id.startsWith(ROSTER_CELL_DROP_PREFIX)) return null
  const payload = id.slice(ROSTER_CELL_DROP_PREFIX.length)
  const separatorIndex = payload.indexOf(":")
  if (separatorIndex === -1) return null
  return {
    rowId: payload.slice(0, separatorIndex),
    dateStr: payload.slice(separatorIndex + 1),
  }
}

export function buildTimelineDropId(rowId: string, dateStr: string) {
  return `${ROSTER_TIMELINE_DROP_PREFIX}${rowId}:${dateStr}`
}

export function parseTimelineDropId(id: string): { rowId: string; dateStr: string } | null {
  if (!id.startsWith(ROSTER_TIMELINE_DROP_PREFIX)) return null
  const payload = id.slice(ROSTER_TIMELINE_DROP_PREFIX.length)
  const separatorIndex = payload.indexOf(":")
  if (separatorIndex === -1) return null
  return {
    rowId: payload.slice(0, separatorIndex),
    dateStr: payload.slice(separatorIndex + 1),
  }
}

export function buildHourDropId(rowId: string, dateStr: string, hour: number) {
  return `${ROSTER_HOUR_DROP_PREFIX}${rowId}:${dateStr}:${hour}`
}

export function parseHourDropId(id: string): { rowId: string; dateStr: string; hour: number } | null {
  if (!id.startsWith(ROSTER_HOUR_DROP_PREFIX)) return null
  const payload = id.slice(ROSTER_HOUR_DROP_PREFIX.length)
  const parts = payload.split(":")
  if (parts.length < 3) return null
  const hour = Number(parts[parts.length - 1])
  const dateStr = parts[parts.length - 2]
  const rowId = parts.slice(0, parts.length - 2).join(":")
  if (Number.isNaN(hour)) return null
  return { rowId, dateStr, hour }
}

export function buildVacantDropId(dateStr: string) {
  return `${ROSTER_VACANT_DROP_PREFIX}${dateStr}`
}

export function parseVacantDropId(id: string): { dateStr: string } | null {
  if (!id.startsWith(ROSTER_VACANT_DROP_PREFIX)) return null
  const dateStr = id.slice(ROSTER_VACANT_DROP_PREFIX.length)
  if (!dateStr) return null
  return { dateStr }
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export function snapMinutes(totalMinutes: number, interval = 15): number {
  return Math.round(totalMinutes / interval) * interval
}

export function pixelsToMinutes(deltaY: number): number {
  return (deltaY / DAY_VIEW_HOUR_HEIGHT) * 60
}

export function pixelsToMinutesHorizontal(deltaX: number, hourWidth = DAY_VIEW_HOUR_WIDTH): number {
  return (deltaX / hourWidth) * 60
}

export function clampShiftWindow(startMinutes: number, durationMinutes: number) {
  const dayStart = getDayViewStartHour() * 60
  const dayEnd = getDayViewEndHour() * 60
  const minDuration = 15

  let nextStart = snapMinutes(startMinutes)
  let nextEnd = nextStart + durationMinutes

  if (nextStart < dayStart) {
    nextStart = dayStart
    nextEnd = nextStart + durationMinutes
  }

  if (nextEnd > dayEnd) {
    nextEnd = dayEnd
    nextStart = Math.max(dayStart, nextEnd - durationMinutes)
  }

  if (nextEnd - nextStart < minDuration) {
    nextEnd = Math.min(dayEnd, nextStart + minDuration)
  }

  return {
    startTime: minutesToTime(nextStart),
    endTime: minutesToTime(nextEnd),
  }
}

export function shiftTimesFromDelta(startTime: string, endTime: string, deltaY: number) {
  const duration = timeToMinutes(endTime) - timeToMinutes(startTime)
  const nextStart = timeToMinutes(startTime) + snapMinutes(pixelsToMinutes(deltaY))
  return clampShiftWindow(nextStart, duration)
}

export function shiftTimesFromHorizontalDelta(
  startTime: string,
  endTime: string,
  deltaX: number,
  hourWidth = DAY_VIEW_HOUR_WIDTH
) {
  const duration = timeToMinutes(endTime) - timeToMinutes(startTime)
  const nextStart = timeToMinutes(startTime) + snapMinutes(pixelsToMinutesHorizontal(deltaX, hourWidth))
  return clampShiftWindow(nextStart, duration)
}

export function shiftTimesFromHourDrop(startTime: string, endTime: string, hour: number) {
  const duration = timeToMinutes(endTime) - timeToMinutes(startTime)
  return clampShiftWindow(hour * 60, duration)
}

export function shiftTimesFromResize(
  startTime: string,
  endTime: string,
  edge: "start" | "end",
  deltaY: number
) {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  const deltaMinutes = snapMinutes(pixelsToMinutes(deltaY))
  const dayStart = getDayViewStartHour() * 60
  const dayEnd = getDayViewEndHour() * 60
  const minDuration = 15

  if (edge === "start") {
    const nextStart = Math.min(endMinutes - minDuration, Math.max(dayStart, startMinutes + deltaMinutes))
    return {
      startTime: minutesToTime(nextStart),
      endTime,
    }
  }

  const nextEnd = Math.max(startMinutes + minDuration, Math.min(dayEnd, endMinutes + deltaMinutes))
  return {
    startTime,
    endTime: minutesToTime(nextEnd),
  }
}

export function shiftTimesFromHorizontalResize(
  startTime: string,
  endTime: string,
  edge: "start" | "end",
  deltaX: number,
  hourWidth = DAY_VIEW_HOUR_WIDTH
) {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  const deltaMinutes = snapMinutes(pixelsToMinutesHorizontal(deltaX, hourWidth))
  const dayStart = getDayViewStartHour() * 60
  const dayEnd = getDayViewEndHour() * 60
  const minDuration = 60

  if (edge === "start") {
    const nextStart = Math.min(endMinutes - minDuration, Math.max(dayStart, startMinutes + deltaMinutes))
    return {
      startTime: minutesToTime(nextStart),
      endTime,
    }
  }

  const nextEnd = Math.max(startMinutes + minDuration, Math.min(dayEnd, endMinutes + deltaMinutes))
  return {
    startTime,
    endTime: minutesToTime(nextEnd),
  }
}

export function getRosterShiftCursorClass(isDisabled = false, isDragging = false): string {
  if (isDisabled) return ""
  return isDragging ? "cursor-grabbing" : "cursor-pointer"
}

export function setRosterDragCursor(isDragging: boolean) {
  document.body.style.cursor = isDragging ? "grabbing" : ""
}
