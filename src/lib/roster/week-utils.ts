import { getRosterSettings } from "@/lib/roster/settings"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

export function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function parseDateStr(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`)
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const date = parseDateStr(dateStr)
  date.setDate(date.getDate() + days)
  return toDateStr(date)
}

export function formatShortDateLabel(dateStr: string): string {
  return parseDateStr(dateStr).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  const result = new Date(date)
  const day = result.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  result.setDate(result.getDate() - diff)
  result.setHours(0, 0, 0, 0)
  return result
}

export function endOfWeek(weekStart: Date): Date {
  const result = new Date(weekStart)
  result.setDate(result.getDate() + 6)
  result.setHours(23, 59, 59, 999)
  return result
}

export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + weeks * 7)
  return result
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + index)
    return day
  })
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = endOfWeek(weekStart)
  const startMonth = weekStart.toLocaleDateString("en-AU", { month: "long" })
  const endMonth = weekEnd.toLocaleDateString("en-AU", { month: "long" })
  const year = weekStart.getFullYear()

  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${year}, ${startMonth} ${String(weekStart.getDate()).padStart(2, "0")}–${String(weekEnd.getDate()).padStart(2, "0")}`
  }

  return `${year}, ${startMonth} ${String(weekStart.getDate()).padStart(2, "0")} – ${endMonth} ${String(weekEnd.getDate()).padStart(2, "0")}`
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" })
}

export function getDayLabel(date: Date): string {
  return DAY_LABELS[date.getDay()]
}

export function shiftDurationHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number)
  const [endH, endM] = endTime.split(":").map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  return Math.max(0, (endMinutes - startMinutes) / 60)
}

function formatShiftTimePart(value: string): string {
  const [hours, minutes] = value.split(":").map(Number)

  if (minutes !== 0) {
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return date
      .toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
      .replace(/\s*(am|pm)/i, (_, meridiem: string) => meridiem.toLowerCase())
  }

  const normalized = ((hours % 24) + 24) % 24
  let displayHour: number
  let meridiem: "am" | "pm"

  if (normalized === 0) {
    displayHour = 12
    meridiem = "am"
  } else if (normalized === 12) {
    displayHour = 12
    meridiem = "pm"
  } else if (normalized < 12) {
    displayHour = normalized
    meridiem = "am"
  } else {
    displayHour = normalized - 12
    meridiem = "pm"
  }

  return `${displayHour}${meridiem}`
}

export function formatShiftTime(startTime: string, endTime: string): string {
  return `${formatShiftTimePart(startTime)} – ${formatShiftTimePart(endTime)}`
}

export function formatWeekdayShort(dateStr: string): string {
  return parseDateStr(dateStr).toLocaleDateString("en-AU", { weekday: "short" })
}

export function formatCompactShiftTimeRange(startTime: string, endTime: string): string {
  const start = formatShiftTimePart(startTime)
  const end = formatShiftTimePart(endTime)
  const meridiemPattern = /(am|pm)$/i
  const startMeridiem = start.match(meridiemPattern)?.[1]?.toLowerCase()
  const endMeridiem = end.match(meridiemPattern)?.[1]?.toLowerCase()
  const startWithoutMeridiem = start.replace(meridiemPattern, "")
  const endWithoutMeridiem = end.replace(meridiemPattern, "")

  if (
    startMeridiem &&
    endMeridiem &&
    startMeridiem === endMeridiem &&
    !startWithoutMeridiem.includes(":") &&
    !endWithoutMeridiem.includes(":")
  ) {
    return `${startWithoutMeridiem}–${endWithoutMeridiem}${endMeridiem}`
  }

  return `${start}–${end}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateStr(a) === toDateStr(b)
}

export const DAY_VIEW_HOUR_WIDTH = 56
export const DAY_VIEW_HOUR_HEIGHT = 48
export const DAY_VIEW_HOUR_GAP = 1
export const DAY_VIEW_ROW_HEIGHT = 96
export const DAY_VIEW_SHIFT_INSET = 8

export function getDayViewShiftBlockHeight(
  rowHeight = DAY_VIEW_ROW_HEIGHT,
  inset = DAY_VIEW_SHIFT_INSET
): number {
  return rowHeight - inset * 2
}

/** @deprecated Use getDayViewStartHour() */
export const DAY_VIEW_START_HOUR = 0
/** @deprecated Use getDayViewEndHour() */
export const DAY_VIEW_END_HOUR = 24

export function getDayViewStartHour(): number {
  return DAY_VIEW_START_HOUR
}

export function getDayViewEndHour(): number {
  return DAY_VIEW_END_HOUR
}

export function getDayViewHourCount(): number {
  return Math.max(1, getDayViewEndHour() - getDayViewStartHour())
}

/** @deprecated Use getDayViewHourCount() */
export const DAY_VIEW_HOUR_COUNT = 24

export function getDayViewHours(): number[] {
  const start = getDayViewStartHour()
  const count = getDayViewHourCount()
  return Array.from({ length: count }, (_, index) => start + index)
}

export function getDayViewGridWidth(): number {
  const count = getDayViewHourCount()
  return count * DAY_VIEW_HOUR_WIDTH + (count - 1) * DAY_VIEW_HOUR_GAP
}

export function getDayViewHourWidthFromContainer(
  containerWidth: number,
  hourCount = getDayViewHourCount(),
  gap = DAY_VIEW_HOUR_GAP
): number {
  if (hourCount <= 0 || containerWidth <= 0) return DAY_VIEW_HOUR_WIDTH

  const totalGap = Math.max(0, hourCount - 1) * gap
  return Math.max(DAY_VIEW_HOUR_WIDTH, (containerWidth - totalGap) / hourCount)
}

export function getDayViewHourStride(hourWidth: number, gap = DAY_VIEW_HOUR_GAP): number {
  return hourWidth + gap
}

export function getDayViewTimelineHeight(): number {
  return getDayViewHours().length * DAY_VIEW_HOUR_HEIGHT
}

export function formatHourLabel(hour: number): string {
  const date = new Date()
  date.setHours(hour % 24, 0, 0, 0)
  return date.toLocaleTimeString("en-AU", { hour: "numeric", hour12: true })
}

export function formatCompactHourLabel(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24
  if (normalized === 0) return "12a"
  if (normalized === 12) return "12p"
  if (normalized < 12) return `${normalized}a`
  return `${normalized - 12}p`
}

export function getHourIndexFromOffset(
  offsetX: number,
  hourWidth = DAY_VIEW_HOUR_WIDTH,
  gap = DAY_VIEW_HOUR_GAP
): number {
  const stride = hourWidth + gap
  const index = Math.floor(offsetX / stride)
  const dayStart = getDayViewStartHour()
  const dayEnd = getDayViewEndHour()
  return Math.max(dayStart, Math.min(dayEnd - 1, dayStart + index))
}

export function hourRangeToShiftTimes(startHour: number, endHour: number): { startTime: string; endTime: string } {
  const minHour = Math.min(startHour, endHour)
  const maxHour = Math.max(startHour, endHour)
  const startMinutes = minHour * 60
  const endMinutes = (maxHour + 1) * 60
  return {
    startTime: minutesToTime(startMinutes),
    endTime: minutesToTime(Math.min(endMinutes, getDayViewEndHour() * 60)),
  }
}

export function getShiftTimesForHourSelection(startHour: number, endHour: number): { startTime: string; endTime: string } {
  if (startHour !== endHour) return hourRangeToShiftTimes(startHour, endHour)

  const { defaultShiftDurationHours } = getRosterSettings()
  const startTime = minutesToTime(startHour * 60)
  const endMinutes = Math.min(startHour * 60 + defaultShiftDurationHours * 60, getDayViewEndHour() * 60)
  return {
    startTime,
    endTime: minutesToTime(Math.max(endMinutes, startHour * 60 + 60)),
  }
}

export function getDayViewGridWidthFromHourWidth(
  hourWidth: number,
  gap = DAY_VIEW_HOUR_GAP,
  hourCount = getDayViewHourCount()
): number {
  return hourCount * hourWidth + Math.max(0, hourCount - 1) * gap
}

export function getShiftHourGridStyle(
  startTime: string,
  endTime: string,
  hourWidth = DAY_VIEW_HOUR_WIDTH,
  gap = DAY_VIEW_HOUR_GAP
): { left: number; width: number } {
  const dayStartMinutes = getDayViewStartHour() * 60
  const dayEndMinutes = getDayViewEndHour() * 60
  const startMinutes = Math.max(timeToMinutes(startTime), dayStartMinutes)
  const endMinutes = Math.min(timeToMinutes(endTime), dayEndMinutes)
  const stride = hourWidth + gap
  const hourSpan = (endMinutes - startMinutes) / 60
  const left = ((startMinutes - dayStartMinutes) / 60) * stride
  const width = Math.max(hourSpan * stride - gap, hourWidth * 0.35)
  const gridWidth = getDayViewGridWidthFromHourWidth(hourWidth, gap)
  const clampedLeft = Math.max(0, left)
  const clampedWidth = Math.min(width, gridWidth - clampedLeft)

  return { left: clampedLeft, width: Math.max(clampedWidth, hourWidth * 0.35) }
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

export function getShiftTimelineStyle(startTime: string, endTime: string): { top: number; height: number } {
  const dayStartMinutes = getDayViewStartHour() * 60
  const dayEndMinutes = getDayViewEndHour() * 60
  const startMinutes = Math.max(timeToMinutes(startTime), dayStartMinutes)
  const endMinutes = Math.min(timeToMinutes(endTime), dayEndMinutes)
  const top = ((startMinutes - dayStartMinutes) / 60) * DAY_VIEW_HOUR_HEIGHT
  const height = Math.max(((endMinutes - startMinutes) / 60) * DAY_VIEW_HOUR_HEIGHT, 28)
  return { top, height }
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export function formatTimeLabel(time: string): string {
  const [hours, minutes] = time.split(":").map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time

  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
}

export function getShiftTimeOptions(options?: {
  intervalMinutes?: number
  minMinutes?: number
  maxMinutes?: number
  includeTimes?: string[]
}): string[] {
  const interval = options?.intervalMinutes ?? 15
  const dayStart = options?.minMinutes ?? getDayViewStartHour() * 60
  const dayEnd = options?.maxMinutes ?? getDayViewEndHour() * 60
  const times = new Set<string>()

  for (let minutes = dayStart; minutes <= dayEnd; minutes += interval) {
    times.add(minutesToTime(minutes))
  }

  for (const time of options?.includeTimes ?? []) {
    if (!time) continue
    times.add(time)
  }

  return Array.from(times).sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
}

/** Full 24-hour wheel — midnight through 23:45 by default. */
export function getAllDayTimeOptions(intervalMinutes = 15): string[] {
  return getShiftTimeOptions({
    intervalMinutes,
    minMinutes: 0,
    maxMinutes: 24 * 60 - intervalMinutes,
  })
}

