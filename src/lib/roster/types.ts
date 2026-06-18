export type RosterViewMode = "week" | "day"
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
