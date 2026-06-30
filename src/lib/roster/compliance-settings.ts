/** How strictly a compliance rule is applied. */
export type ComplianceEnforcement = "off" | "warn" | "block"

export interface RosterComplianceSettings {
  /** Require a progress note before marking a shift completed. */
  progressNoteOnComplete: ComplianceEnforcement
  /** Hours after shift end before a note is considered overdue (for warnings). */
  progressNoteDeadlineHours: number
  /** When incident flag is set on a note, require linking/creating an incident. */
  incidentLinkRequired: ComplianceEnforcement
  /** Bill every charge type on a shift (not just the first). */
  billAllChargeTypes: boolean
  /** Create billable entries when a timesheet is approved (not only at invoicing). */
  syncBillablesOnTimesheetApproval: boolean
  /** Suggest NDIS cancellation claim lines when a shift is cancelled. */
  cancellationClaimSuggestions: boolean
  /** Block or warn when rostering a disallowed staff–participant pair. */
  suitabilityEnforcement: ComplianceEnforcement
  /** Warn or block when worker NDIS screening is missing or expired. */
  workerScreeningCheck: ComplianceEnforcement
  /** Show SCHADS-style roster warnings (rest breaks, max length, broken shifts). */
  schadsRosterWarnings: boolean
  minRestHoursBetweenShifts: number
  maxShiftLengthHours: number
  brokenShiftWarnings: boolean
  /** Warn or block when scheduled shifts exceed participant plan/budget headroom. */
  budgetWarnings: ComplianceEnforcement
  /** Allow downloading a complete support log from a shift. */
  enableSupportLogExport: boolean
}

export const defaultRosterComplianceSettings: RosterComplianceSettings = {
  progressNoteOnComplete: "warn",
  progressNoteDeadlineHours: 24,
  incidentLinkRequired: "warn",
  billAllChargeTypes: true,
  syncBillablesOnTimesheetApproval: true,
  cancellationClaimSuggestions: true,
  suitabilityEnforcement: "warn",
  workerScreeningCheck: "warn",
  schadsRosterWarnings: true,
  minRestHoursBetweenShifts: 10,
  maxShiftLengthHours: 12,
  brokenShiftWarnings: true,
  budgetWarnings: "warn",
  enableSupportLogExport: true,
}

function normalizeEnforcement(value: unknown, fallback: ComplianceEnforcement): ComplianceEnforcement {
  if (value === "off" || value === "warn" || value === "block") return value
  return fallback
}

function clampHours(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function normalizeRosterComplianceSettings(
  value: Partial<RosterComplianceSettings> | undefined,
): RosterComplianceSettings {
  const base = defaultRosterComplianceSettings
  if (!value) return base

  return {
    progressNoteOnComplete: normalizeEnforcement(value.progressNoteOnComplete, base.progressNoteOnComplete),
    progressNoteDeadlineHours: clampHours(value.progressNoteDeadlineHours, base.progressNoteDeadlineHours, 1, 168),
    incidentLinkRequired: normalizeEnforcement(value.incidentLinkRequired, base.incidentLinkRequired),
    billAllChargeTypes: value.billAllChargeTypes ?? base.billAllChargeTypes,
    syncBillablesOnTimesheetApproval:
      value.syncBillablesOnTimesheetApproval ?? base.syncBillablesOnTimesheetApproval,
    cancellationClaimSuggestions: value.cancellationClaimSuggestions ?? base.cancellationClaimSuggestions,
    suitabilityEnforcement: normalizeEnforcement(value.suitabilityEnforcement, base.suitabilityEnforcement),
    workerScreeningCheck: normalizeEnforcement(value.workerScreeningCheck, base.workerScreeningCheck),
    schadsRosterWarnings: value.schadsRosterWarnings ?? base.schadsRosterWarnings,
    minRestHoursBetweenShifts: clampHours(
      value.minRestHoursBetweenShifts,
      base.minRestHoursBetweenShifts,
      0,
      24,
    ),
    maxShiftLengthHours: clampHours(value.maxShiftLengthHours, base.maxShiftLengthHours, 1, 24),
    brokenShiftWarnings: value.brokenShiftWarnings ?? base.brokenShiftWarnings,
    budgetWarnings: normalizeEnforcement(value.budgetWarnings, base.budgetWarnings),
    enableSupportLogExport: value.enableSupportLogExport ?? base.enableSupportLogExport,
  }
}

export function isComplianceBlocking(
  enforcement: ComplianceEnforcement,
  hasIssue: boolean,
): boolean {
  return hasIssue && enforcement === "block"
}

export function isComplianceWarning(
  enforcement: ComplianceEnforcement,
  hasIssue: boolean,
): boolean {
  return hasIssue && enforcement === "warn"
}
