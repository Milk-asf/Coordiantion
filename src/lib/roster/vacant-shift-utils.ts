import type { RosterShift } from "@/lib/roster/types"

export const ROSTER_UNASSIGNED_ID = ""

/** A shift is vacant when it has no staff member assigned. */
export function isShiftUnassigned(shift: RosterShift): boolean {
  if (shift.status === "cancelled") return false
  return !shift.staffId
}

export function getUnassignedShifts(shifts: RosterShift[]): RosterShift[] {
  return shifts.filter(isShiftUnassigned)
}

export function getVacantShiftsForDate(
  vacantShifts: RosterShift[],
  dateStr: string
): RosterShift[] {
  return vacantShifts.filter((shift) => shift.date === dateStr)
}

export function getVacantRowStorageKey(workspaceId: string | undefined): string {
  return workspaceId ? `roster-vacant-row-open-${workspaceId}` : "roster-vacant-row-open"
}

export function loadVacantRowOpen(workspaceId: string | undefined): boolean {
  if (typeof window === "undefined") return true
  try {
    const stored = localStorage.getItem(getVacantRowStorageKey(workspaceId))
    if (stored === null) return true
    return stored === "true"
  } catch {
    return true
  }
}

export function saveVacantRowOpen(workspaceId: string | undefined, isOpen: boolean) {
  if (typeof window === "undefined") return
  localStorage.setItem(getVacantRowStorageKey(workspaceId), String(isOpen))
}
