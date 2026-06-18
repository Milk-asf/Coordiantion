import {
  buildSessionTypeToneMap,
  getRosterSettings,
  getSessionTypeLabel,
  getSessionTypeTone,
} from "@/lib/roster/settings"
import type { RosterShift, RosterShiftCancelledBy, RosterShiftInput } from "@/lib/roster/types"
import {
  getCategoryChipClasses,
  getToneBorderClasses,
  getToneSurfaceClasses,
  type FolkChipTone,
} from "@/lib/chip-colors"
import { formatShiftTime, shiftDurationHours, timeToMinutes } from "@/lib/roster/week-utils"

export function normalizeTimeInput(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""

  const compactMatch = trimmed.match(/^(\d{3,4})$/)
  if (compactMatch) {
    const padded = compactMatch[1].padStart(4, "0")
    const hours = Number(padded.slice(0, 2))
    const minutes = Number(padded.slice(2, 4))
    if (hours <= 23 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    }
  }

  const match = trimmed.match(/^(\d{1,2})(?:(?::|\.)(\d{2}))?\s*(am|pm)?$/i)
  if (!match) return trimmed

  let hours = Number(match[1])
  const minutes = Number(match[2] ?? "0")
  const meridiem = match[3]?.toLowerCase()

  if (meridiem === "pm" && hours < 12) hours += 12
  if (meridiem === "am" && hours === 12) hours = 0

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export function validateShiftInput(input: RosterShiftInput): string | null {
  if (!input.staffId && !input.clientId) return "Select staff or a client"
  if (!input.date) return "Select a date"

  const start = normalizeTimeInput(input.startTime)
  const end = normalizeTimeInput(input.endTime)
  if (!start || !end) return "Enter start and end times"
  if (timeToMinutes(end) <= timeToMinutes(start)) return "End time must be after start time"

  return null
}

export function shiftsOverlap(a: Pick<RosterShift, "date" | "startTime" | "endTime">, b: Pick<RosterShift, "date" | "startTime" | "endTime">): boolean {
  if (a.date !== b.date) return false
  const aStart = timeToMinutes(a.startTime)
  const aEnd = timeToMinutes(a.endTime)
  const bStart = timeToMinutes(b.startTime)
  const bEnd = timeToMinutes(b.endTime)
  return aStart < bEnd && bStart < aEnd
}

export function findShiftConflicts(
  shifts: RosterShift[],
  candidate: RosterShiftInput & { id?: string }
): RosterShift[] {
  const normalized = {
    ...candidate,
    startTime: normalizeTimeInput(candidate.startTime),
    endTime: normalizeTimeInput(candidate.endTime),
  }

  return shifts.filter((shift) => {
    if (shift.id === candidate.id) return false
    if (!normalized.staffId || !shift.staffId) return false
    if (shift.shiftStringId && normalized.shiftStringId && shift.shiftStringId === normalized.shiftStringId) return false
    if (shift.staffId !== normalized.staffId) return false
    if (shift.status === "cancelled") return false
    if (normalized.status === "cancelled") return false
    return shiftsOverlap(shift, normalized)
  })
}

export function describeShiftConflict(conflict: RosterShift): string {
  return `Overlaps with ${conflict.clientName} (${formatShiftTime(conflict.startTime, conflict.endTime)}).`
}

export function getShiftIssueDescriptions(
  shifts: RosterShift[],
  candidate: RosterShiftInput & { id?: string }
): string[] {
  if (!getRosterSettings().showConflictWarnings) return []
  if (candidate.status === "cancelled") return []
  return findShiftConflicts(shifts, candidate).map(describeShiftConflict)
}

export function getShiftIssuesForShift(shift: RosterShift, shifts: RosterShift[]): string[] {
  return getShiftIssueDescriptions(shifts, shift)
}

export function hasShiftIssues(
  shifts: RosterShift[],
  candidate: RosterShiftInput & { id?: string }
): boolean {
  return getShiftIssueDescriptions(shifts, candidate).length > 0
}

export function formatShiftConflictMessage(conflicts: RosterShift[]): string {
  if (conflicts.length === 0) return ""
  return conflicts.map(describeShiftConflict).join(" ")
}

export function getShiftStatusLabel(status: RosterShift["status"]): string {
  return shiftStatusConfig[status].label
}

export const shiftStatusConfig: Record<RosterShift["status"], { label: string; chip: string }> = {
  scheduled: { label: "Scheduled", chip: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", chip: "bg-[#e8f5e9] text-[#2e7d32]" },
  cancelled: { label: "Cancelled", chip: "bg-[#eef2f6] text-[#334155]" },
}

export const shiftSessionTypeConfig = {
  none: { label: "None" },
  "active-nights": { label: "Active nights" },
  sleepover: { label: "Sleepover" },
  nursing: { label: "Nursing" },
  "buddy-shift": { label: "Buddy shift" },
  training: { label: "Training" },
  induction: { label: "Induction" },
} as const

export function getShiftSessionTypeLabel(sessionType: string): string {
  return getSessionTypeLabel(sessionType)
}

export function getShiftSessionTypeChipClasses(
  sessionType: string,
  sessionTypes = getRosterSettings().sessionTypes,
  size: "sm" | "md" | "lg" = "sm"
): string {
  return getCategoryChipClasses(sessionType, {
    toneMap: buildSessionTypeToneMap(sessionTypes),
    size,
  })
}

export function getShiftSessionTypeTone(
  sessionType: string,
  sessionTypes = getRosterSettings().sessionTypes
): FolkChipTone {
  return getSessionTypeTone(sessionType, sessionTypes)
}

export function getShiftSessionTypeSurfaceClasses(
  sessionType: string,
  sessionTypes = getRosterSettings().sessionTypes
): string {
  const tone = getSessionTypeTone(sessionType, sessionTypes)
  return `${getToneSurfaceClasses(tone)} ${getToneBorderClasses(tone)}`
}

export const shiftStatusOrder: RosterShift["status"][] = ["scheduled", "completed", "cancelled"]

export const cancelledShiftSurfaceClasses =
  "border-dashed border-[#cbd5e1] bg-[repeating-linear-gradient(-45deg,#f8fafc_0px,#f8fafc_8px,#eef2f7_8px,#eef2f7_16px)]"

export const cancelledShiftTextClasses = "text-folk-secondary line-through decoration-folk-placeholder/50"

export const cancelledShiftChipClasses = "bg-[#f1f5f9] text-[#64748b] border border-[#cbd5e1]"

export function getShiftCancelledByLabel(cancelledBy: RosterShiftCancelledBy): string {
  return cancelledBy === "client" ? "By client" : "By organisation"
}

export function isShiftCancelled(shift: Pick<RosterShift, "status">): boolean {
  return shift.status === "cancelled"
}

export function getShiftStatusClasses(status: RosterShift["status"], hasIssue = false): string {
  if (hasIssue && status !== "cancelled") {
    return "bg-[#fffbeb] border-[#fde68a]"
  }
  if (status === "completed") return "bg-[#f0fdf4] border-[#bbf7d0]"
  if (status === "cancelled") return cancelledShiftSurfaceClasses
  return "bg-[var(--primary-color-light)] border-[color-mix(in_srgb,var(--primary-color)_25%,#dbeafe)]"
}

export function getShiftHoursLabel(shift: RosterShift): string {
  const hours = shiftDurationHours(shift.startTime, shift.endTime)
  return `${hours.toFixed(1)} hrs`
}
