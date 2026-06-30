export type RosterViewMode = "week" | "day" | "table"
export type RosterAssigneeView = "employees" | "clients"

export const ASSIGNEE_VIEW_LABELS: Record<RosterAssigneeView, string> = {
  employees: "Staff",
  clients: "Clients",
}
export type RosterShiftStatus = "scheduled" | "completed" | "cancelled"
export type RosterShiftCancelledBy = "client" | "organisation"
export type ShiftSessionType = string

export type SessionTypeTone =
  | "green"
  | "yellow"
  | "rose"
  | "orange"
  | "purple"
  | "blue"
  | "slate"

export interface RosterSessionTypeDefinition {
  id: string
  label: string
  tone?: SessionTypeTone
}

/**
 * NDIS-standard progress (shift) note. Captures the record a support worker
 * must keep for each support delivered: what support was provided, progress
 * toward the participant's goals, observations of wellbeing, any concerns or
 * incidents, and follow-up actions — authored and signed with a timestamp.
 */
export interface ShiftProgressNote {
  /** What support was delivered during the shift. */
  supportProvided: string
  /** Progress made toward the participant's goals this shift. */
  goalProgress: string
  /** Observations of the participant's wellbeing, mood, behaviour and health. */
  observations: string
  /** Any concerns, changes, or incidents that occurred. */
  concerns: string
  /** Whether something happened that requires a formal incident report. */
  incidentOccurred: boolean
  /** Follow-up actions or handover for the next support worker. */
  followUp: string
  /** Author of the note (the worker recording it). */
  authorStaffId: string | null
  authorName: string
  /** Optional drawn signature, stored as a PNG data URL. */
  signature: string
  /** When the note was first recorded. */
  recordedAt: string
  updatedAt: string
  /** Billing/quality gate. A recorded note is pending until an admin approves it. */
  approvalStatus?: "none" | "approved" | "rejected"
}

export interface RosterShift {
  id: string
  staffId: string
  staffName: string
  staffIconText: string
  clientId: string
  clientName: string
  clientIconText: string
  date: string
  startTime: string
  endTime: string
  title: string
  sessionType: ShiftSessionType
  notes: string
  adminNotes: string
  location: string
  chargeTypes: string[]
  status: RosterShiftStatus
  cancelledBy: RosterShiftCancelledBy | null
  cancellationReason: string
  shiftStringId: string | null
  shiftStringOrder: number
  progressNote: ShiftProgressNote | null
}

export interface RosterShiftInput {
  staffId: string
  clientId: string
  date: string
  startTime: string
  endTime: string
  title?: string
  sessionType?: ShiftSessionType
  notes?: string
  adminNotes?: string
  location?: string
  chargeTypes?: string[]
  status?: RosterShiftStatus
  cancelledBy?: RosterShiftCancelledBy | null
  cancellationReason?: string
  shiftStringId?: string | null
  shiftStringOrder?: number
}

export interface RosterShiftDraft extends RosterShiftInput {
  staffId: string
  clientId: string
  date: string
  startTime: string
  endTime: string
}

export interface RosterAssigneeSummary {
  id: string
  name: string
  iconText: string
  hours: number
}

export interface ShiftFormContext {
  staffId?: string
  clientId?: string
  date?: string
  startTime?: string
  endTime?: string
  shiftStringId?: string
  shiftStringOrder?: number
  /** When creating a new string part, link this existing shift as part 1. */
  linkAnchorShiftId?: string
}
