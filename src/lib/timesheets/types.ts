import { minutesToTime, timeToMinutes } from "@/lib/roster/week-utils"

export type TimesheetStatus = "draft" | "sent" | "returned" | "approved"

export type ClockEventType = "clock_on" | "clock_off"

export interface ClockEvent {
  id: string
  workspaceId: string
  staffId: string | null
  submittedByName: string
  timesheetId: string | null
  eventType: ClockEventType
  recordedAt: string
  latitude: number | null
  longitude: number | null
  locationLabel: string
  createdAt: string
}

export const CLOCK_EVENT_LABELS: Record<ClockEventType, string> = {
  clock_on: "Clock on",
  clock_off: "Clock off",
}

/** Travel claims are reviewed independently of their parent timesheet. */
export type TravelClaimStatus = "sent" | "returned" | "approved"

export interface TravelClaim {
  id: string
  clientIds: string[]
  startLocation: string
  endLocation: string
  distanceKm: number
  purpose: string
  notes: string
  status: TravelClaimStatus
  reviewNote: string
}

/** A travel claim flattened together with its parent timesheet for review. */
export interface TravelClaimEntry {
  key: string
  timesheetId: string
  claim: TravelClaim
  submittedByName: string
  staffId: string | null
  date: string
}

export function travelClaimEntryKey(timesheetId: string, claimId: string): string {
  return `${timesheetId}:${claimId}`
}

/** Backfill status/reviewNote for claims stored before they had a review flow. */
export function normalizeTravelClaim(claim: Partial<TravelClaim> & { id: string }): TravelClaim {
  return {
    id: claim.id,
    clientIds: Array.isArray(claim.clientIds) ? claim.clientIds : [],
    startLocation: claim.startLocation ?? "",
    endLocation: claim.endLocation ?? "",
    distanceKm: claim.distanceKm ?? 0,
    purpose: claim.purpose ?? "",
    notes: claim.notes ?? "",
    status: claim.status ?? "sent",
    reviewNote: claim.reviewNote ?? "",
  }
}

export interface Timesheet {
  id: string
  workspaceId: string
  staffId: string | null
  submittedByName: string
  shiftId: string | null
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  breakMinutes: number
  workedMinutes: number
  notes: string
  signature: string
  travelClaims: TravelClaim[]
  status: TimesheetStatus
  reviewNote: string
  reviewedByName: string
  reviewedAt: string | null
  invoicedAt: string | null
  invoiceId: string | null
  clockActive: boolean
  clockedInAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TimesheetInput {
  staffId?: string | null
  shiftId?: string | null
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  breakMinutes?: number
  workedMinutes?: number
  notes?: string
  signature?: string
  travelClaims?: TravelClaim[]
  status?: TimesheetStatus
  clockActive?: boolean
  clockedInAt?: string | null
}

export const TIMESHEET_STATUS_LABELS: Record<TimesheetStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  returned: "Returned",
  approved: "Approved",
}

/** Statuses surfaced to admin/finance for review. Drafts stay with the worker. */
export const TIMESHEET_REVIEW_STATUSES: TimesheetStatus[] = ["sent", "returned", "approved"]

export interface TimesheetKanbanColumn {
  status: Exclude<TimesheetStatus, "draft">
  label: string
}

export const TIMESHEET_KANBAN_COLUMNS: TimesheetKanbanColumn[] = [
  { status: "sent", label: "Sent" },
  { status: "returned", label: "Returned" },
  { status: "approved", label: "Approved" },
]

export function createTravelClaim(): TravelClaim {
  return {
    id: crypto.randomUUID(),
    clientIds: [],
    startLocation: "",
    endLocation: "",
    distanceKm: 0,
    purpose: "",
    notes: "",
    status: "sent",
    reviewNote: "",
  }
}

/**
 * Worked minutes between two times minus the break. When the end time is earlier
 * than the start (overnight shift), it rolls over to the next day.
 */
export function computeWorkedMinutes(startTime: string, endTime: string, breakMinutes: number): number {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  if (Number.isNaN(start) || Number.isNaN(end)) return 0

  const span = end > start ? end - start : end + 24 * 60 - start
  const worked = span - Math.max(0, breakMinutes)
  return worked > 0 ? worked : 0
}

/** Whether the end time wraps past midnight, meaning the session ends the next day. */
export function isOvernight(startTime: string, endTime: string): boolean {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  if (Number.isNaN(start) || Number.isNaN(end)) return false
  return end <= start
}

export interface TimesheetVerification {
  ok: boolean
  issues: string[]
}

interface VerifiableShift {
  date: string
  startTime: string
  endTime: string
}

/**
 * Verify a submitted timesheet against the rostered shift it claims to cover.
 * Surfaces discrepancies (missing link, date/time mismatch) so a reviewer can
 * decide whether to approve or return — it does not block either action.
 */
export function verifyTimesheet(
  timesheet: Pick<Timesheet, "shiftId" | "startDate" | "startTime" | "endTime">,
  shift: VerifiableShift | null,
): TimesheetVerification {
  const issues: string[] = []

  if (!timesheet.shiftId || !shift) {
    issues.push("No rostered shift linked to verify against.")
    return { ok: false, issues }
  }

  if (shift.date !== timesheet.startDate) {
    issues.push("Date does not match the rostered shift.")
  }
  if (shift.startTime.slice(0, 5) !== timesheet.startTime.slice(0, 5)) {
    issues.push("Start time differs from the rostered shift.")
  }
  if (shift.endTime.slice(0, 5) !== timesheet.endTime.slice(0, 5)) {
    issues.push("End time differs from the rostered shift.")
  }

  return { ok: issues.length === 0, issues }
}

export function formatDuration(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return "0m"
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export { minutesToTime, timeToMinutes }
