import type { RosterShift } from "@/lib/roster/types"
import type { Timesheet } from "@/lib/timesheets/types"

/**
 * Universal computed record statuses. These bucket raw records into the
 * ready-made labels any report can group or filter by (screening health,
 * note timeliness, document expiry, roster–timesheet match). They are not
 * compliance-only: the same buckets power lists, reports and dashboards.
 */

/** Days before an NDIS worker screening expiry where it counts as "expiring soon". */
export const SCREENING_EXPIRING_SOON_DAYS = 60

/** Days before a document's valid-to date where it counts as "expiring soon". */
export const DOCUMENT_EXPIRING_SOON_DAYS = 30

/** Hours after a shift ends before a missing progress note becomes overdue. */
export const NOTE_OVERDUE_GRACE_HOURS = 24

/** Allowed drift between rostered and worked minutes before a timesheet mismatches. */
export const ROSTER_MATCH_TOLERANCE_MINUTES = 15

function parseIsoDay(value: string | null | undefined): Date | null {
  if (!value || !value.trim()) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

// ---------------------------------------------------------------------------
// Worker screening
// ---------------------------------------------------------------------------

export type ScreeningStatus = "valid" | "expiring" | "expired" | "missing"

export const SCREENING_STATUS_LABELS: Record<ScreeningStatus, string> = {
  valid: "Valid",
  expiring: "Expiring soon",
  expired: "Expired",
  missing: "Missing",
}

export function getScreeningStatus(expiry: string | null | undefined, now: Date = new Date()): ScreeningStatus {
  const expiryDate = parseIsoDay(expiry)
  if (!expiryDate) return "missing"
  const today = startOfDay(now)
  if (expiryDate < today) return "expired"
  if (expiryDate < addDays(today, SCREENING_EXPIRING_SOON_DAYS)) return "expiring"
  return "valid"
}

// ---------------------------------------------------------------------------
// Progress notes
// ---------------------------------------------------------------------------

export type ShiftNoteStatus = "recorded" | "due" | "overdue" | "not-due" | "not-required"

export const SHIFT_NOTE_STATUS_LABELS: Record<ShiftNoteStatus, string> = {
  recorded: "Note recorded",
  due: "Note due",
  overdue: "Note overdue",
  "not-due": "Not due yet",
  "not-required": "Not required",
}

type NoteStatusShift = Pick<RosterShift, "date" | "startTime" | "endTime" | "status"> & {
  progressNote?: RosterShift["progressNote"]
}

function shiftEndDateTime(shift: NoteStatusShift): Date | null {
  const day = parseIsoDay(shift.date)
  if (!day) return null
  const [endH, endM] = (shift.endTime ?? "").split(":").map(Number)
  const [startH, startM] = (shift.startTime ?? "").split(":").map(Number)
  if ([endH, endM].some((v) => Number.isNaN(v))) return null
  const end = new Date(day)
  end.setHours(endH, endM, 0, 0)
  // Overnight shifts finish on the following day.
  const startMinutes = Number.isNaN(startH) || Number.isNaN(startM) ? null : startH * 60 + startM
  if (startMinutes !== null && endH * 60 + endM < startMinutes) end.setDate(end.getDate() + 1)
  return end
}

export function getShiftNoteStatus(shift: NoteStatusShift, now: Date = new Date()): ShiftNoteStatus {
  if (shift.status === "cancelled") return "not-required"
  if (shift.progressNote?.supportProvided?.trim()) return "recorded"
  const end = shiftEndDateTime(shift)
  if (!end || end > now) return "not-due"
  const hoursSinceEnd = (now.getTime() - end.getTime()) / (1000 * 60 * 60)
  return hoursSinceEnd > NOTE_OVERDUE_GRACE_HOURS ? "overdue" : "due"
}

// ---------------------------------------------------------------------------
// Document expiry
// ---------------------------------------------------------------------------

export type DocumentExpiryStatus = "expired" | "expiring" | "valid" | "none"

export const DOCUMENT_EXPIRY_LABELS: Record<DocumentExpiryStatus, string> = {
  expired: "Expired",
  expiring: "Expiring soon",
  valid: "Valid",
  none: "No expiry set",
}

export function getDocumentExpiryStatus(validTo: string | null | undefined, now: Date = new Date()): DocumentExpiryStatus {
  const expiryDate = parseIsoDay(validTo)
  if (!expiryDate) return "none"
  const today = startOfDay(now)
  if (expiryDate < today) return "expired"
  if (expiryDate < addDays(today, DOCUMENT_EXPIRING_SOON_DAYS)) return "expiring"
  return "valid"
}

// ---------------------------------------------------------------------------
// Roster–timesheet match
// ---------------------------------------------------------------------------

export type TimesheetRosterMatch = "match" | "mismatch" | "unlinked"

export const ROSTER_MATCH_LABELS: Record<TimesheetRosterMatch, string> = {
  match: "Matches roster",
  mismatch: "Differs from roster",
  unlinked: "No linked shift",
}

function timeToMinutes(value: string): number | null {
  const [h, m] = (value ?? "").split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

type MatchTimesheet = Pick<Timesheet, "startDate" | "workedMinutes" | "breakMinutes">
type MatchShift = Pick<RosterShift, "date" | "startTime" | "endTime">

export function getTimesheetRosterMatch(
  timesheet: MatchTimesheet,
  shift: MatchShift | null | undefined,
): TimesheetRosterMatch {
  if (!shift) return "unlinked"
  if (timesheet.startDate && shift.date && timesheet.startDate !== shift.date) return "mismatch"
  const start = timeToMinutes(shift.startTime)
  const end = timeToMinutes(shift.endTime)
  if (start === null || end === null) return "match"
  let rosteredMinutes = end - start
  if (rosteredMinutes < 0) rosteredMinutes += 24 * 60
  const paidMinutes = (timesheet.workedMinutes || 0) + (timesheet.breakMinutes || 0)
  return Math.abs(paidMinutes - rosteredMinutes) <= ROSTER_MATCH_TOLERANCE_MINUTES ? "match" : "mismatch"
}

// ---------------------------------------------------------------------------
// Incident case state
// ---------------------------------------------------------------------------

export type IncidentCaseState = "open" | "closed" | "dismissed"

export const INCIDENT_CASE_STATE_LABELS: Record<IncidentCaseState, string> = {
  open: "Open",
  closed: "Closed",
  dismissed: "Not an incident",
}

export function getIncidentCaseState(investigationStatus: string): IncidentCaseState {
  if (investigationStatus === "completed" || investigationStatus === "closed") return "closed"
  if (investigationStatus === "not_an_incident") return "dismissed"
  return "open"
}
