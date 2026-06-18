import { getSessionTypeLabel } from "@/lib/roster/settings"
import type { RosterShift, ShiftFormContext } from "@/lib/roster/types"
import {
  addDaysToDateStr,
  formatCompactShiftTimeRange,
  formatWeekdayShort,
  getDayViewEndHour,
  minutesToTime,
  timeToMinutes,
} from "@/lib/roster/week-utils"

export interface ShiftStringPosition {
  index: number
  total: number
}

export type CellShiftItem =
  | { kind: "single"; shift: RosterShift }
  | { kind: "string"; stringId: string; shifts: RosterShift[] }

const DEFAULT_SEGMENT_MINUTES = 60
const MIN_SEGMENT_MINUTES = 15
const NEXT_DAY_STRING_DEFAULT_END_HOURS = 6

export function getNextDayStringPartDefaultTimes(): { startTime: string; endTime: string } {
  const dayEndMinutes = getDayViewEndHour() * 60
  const endMinutes = Math.min(NEXT_DAY_STRING_DEFAULT_END_HOURS * 60, dayEndMinutes)

  return {
    startTime: "00:00",
    endTime: minutesToTime(endMinutes),
  }
}

export function isNextDayStringPart(
  previousPart: RosterShift | null | undefined,
  date: string | undefined
): boolean {
  if (!previousPart || !date) return false
  return date > previousPart.date
}

export function createShiftStringId(): string {
  return crypto.randomUUID()
}

export function compareShiftsBySchedule(a: RosterShift, b: RosterShift): number {
  const dateCompare = a.date.localeCompare(b.date)
  if (dateCompare !== 0) return dateCompare
  const orderCompare = a.shiftStringOrder - b.shiftStringOrder
  if (orderCompare !== 0) return orderCompare
  return a.startTime.localeCompare(b.startTime)
}

export function sortShiftsBySchedule(shifts: RosterShift[]): RosterShift[] {
  return [...shifts].sort(compareShiftsBySchedule)
}

/** @deprecated Use sortShiftsBySchedule */
export function sortShiftsByStartTime(shifts: RosterShift[]): RosterShift[] {
  return sortShiftsBySchedule(shifts)
}

export function getShiftStringSiblings(shifts: RosterShift[], shift: RosterShift): RosterShift[] {
  if (!shift.shiftStringId) return [shift]
  return sortShiftsBySchedule(
    shifts.filter((entry) => entry.shiftStringId === shift.shiftStringId)
  )
}

export function getNextStringOrder(shifts: RosterShift[], stringId: string): number {
  const siblings = shifts.filter((shift) => shift.shiftStringId === stringId)
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map((shift) => shift.shiftStringOrder)) + 1
}

export function groupShiftsForCell(
  cellShifts: RosterShift[],
  _allShifts: RosterShift[] = cellShifts
): CellShiftItem[] {
  const sorted = sortShiftsBySchedule(cellShifts)
  const processedIds = new Set<string>()
  const items: CellShiftItem[] = []

  for (const shift of sorted) {
    if (processedIds.has(shift.id)) continue

    if (shift.shiftStringId) {
      const siblingsInCell = sorted.filter(
        (entry) => entry.shiftStringId === shift.shiftStringId && !processedIds.has(entry.id)
      )

      if (siblingsInCell.length === 0) continue

      siblingsInCell.forEach((entry) => processedIds.add(entry.id))

      if (siblingsInCell.length > 1) {
        items.push({
          kind: "string",
          stringId: shift.shiftStringId,
          shifts: siblingsInCell,
        })
        continue
      }

      items.push({
        kind: "single",
        shift: siblingsInCell[0],
      })
      continue
    }

    processedIds.add(shift.id)
    items.push({
      kind: "single",
      shift,
    })
  }

  return items
}

export function getShiftStringPosition(
  shift: RosterShift,
  siblings: RosterShift[]
): ShiftStringPosition {
  const ordered = sortShiftsBySchedule(siblings)
  const index = ordered.findIndex((entry) => entry.id === shift.id)
  return {
    index: index >= 0 ? index : 0,
    total: ordered.length,
  }
}

export function getShiftStringAccentClass(stringId: string): string {
  const palette = [
    "border-l-[#6366f1]",
    "border-l-[#7c3aed]",
    "border-l-[#2563eb]",
    "border-l-[#0891b2]",
    "border-l-[#059669]",
  ]
  let hash = 0
  for (let index = 0; index < stringId.length; index += 1) {
    hash = (hash + stringId.charCodeAt(index) * (index + 1)) % palette.length
  }
  return palette[hash] ?? palette[0]
}

export function buildStringSegmentDefaults(
  anchorShift: RosterShift,
  allShifts: RosterShift[]
): ShiftFormContext {
  const stringId = anchorShift.shiftStringId ?? createShiftStringId()
  const mergedShifts = allShifts.some((shift) => shift.id === anchorShift.id)
    ? allShifts
    : [...allShifts, anchorShift]
  const dayEndMinutes = getDayViewEndHour() * 60
  const startMinutes = timeToMinutes(anchorShift.endTime)
  const canContinueSameDay = startMinutes + MIN_SEGMENT_MINUTES < dayEndMinutes

  const segment = canContinueSameDay
    ? {
        date: anchorShift.date,
        startTime: anchorShift.endTime,
        endTime: minutesToTime(Math.min(startMinutes + DEFAULT_SEGMENT_MINUTES, dayEndMinutes)),
      }
    : {
        date: addDaysToDateStr(anchorShift.date, 1),
        ...getNextDayStringPartDefaultTimes(),
      }

  return {
    staffId: anchorShift.staffId,
    clientId: anchorShift.clientId,
    ...segment,
    shiftStringId: stringId,
    shiftStringOrder: getNextStringOrder(mergedShifts, stringId),
    ...(anchorShift.shiftStringId ? {} : { linkAnchorShiftId: anchorShift.id }),
  }
}

export function stringSegmentContinuesNextDay(
  anchorShift: RosterShift,
  defaults: Pick<ShiftFormContext, "date">
): boolean {
  return Boolean(defaults.date && defaults.date > anchorShift.date)
}

export function formatShiftStringPartLabel(position: ShiftStringPosition): string {
  return `Part ${position.index + 1}/${position.total}`
}

const STRING_PART_SESSION_TAB_LABELS: Record<string, string> = {
  sleepover: "Sleepover",
  "active-nights": "Active",
  nursing: "Nursing",
  "buddy-shift": "Buddy",
  training: "Training",
  induction: "Induction",
}

function getStringPartSessionTabLabel(sessionType: string): string | null {
  if (!sessionType || sessionType === "none") return null

  return STRING_PART_SESSION_TAB_LABELS[sessionType] ?? getSessionTypeLabel(sessionType).split(/\s+/)[0] ?? null
}

export function getStringPartTabMeta(part: RosterShift) {
  const weekday = formatWeekdayShort(part.date)
  const sessionType = part.sessionType && part.sessionType !== "none" ? part.sessionType : null
  const sessionLabel = sessionType ? getSessionTypeLabel(part.sessionType) : null
  const timeRange = formatCompactShiftTimeRange(part.startTime, part.endTime)

  return { weekday, sessionType, sessionLabel, timeRange }
}

export function formatStringPartTabLabel(part: RosterShift): string {
  const weekday = formatWeekdayShort(part.date)
  const sessionLabel = getStringPartSessionTabLabel(part.sessionType)

  if (sessionLabel) return `${weekday} · ${sessionLabel}`

  return `${weekday} · ${formatCompactShiftTimeRange(part.startTime, part.endTime)}`
}

export function shiftsShareString(a: RosterShift, b: RosterShift): boolean {
  return Boolean(a.shiftStringId && b.shiftStringId && a.shiftStringId === b.shiftStringId)
}
