import type { BillableEntryInput, BillableEntryUnit } from "@/lib/billable-entries/types"
import { getScheduledShiftProjection } from "@/lib/budget-utils"
import type { Client, StaffMember } from "@/lib/types"
import type { NdisChargeItem } from "@/lib/ndis-charges"
import { isPerItemChargeUnit } from "@/lib/ndis-charges"
import type { Timesheet } from "@/lib/timesheets/types"
import type { ComplianceEnforcement } from "@/lib/roster/compliance-settings"
import type { RosterComplianceSettings } from "@/lib/roster/compliance-settings"
import { getRosterSettings } from "@/lib/roster/settings"
import type { RosterShift, RosterShiftInput } from "@/lib/roster/types"
import {
  findShiftConflicts,
  shiftsOverlap,
} from "@/lib/roster/shift-utils"
import { shiftDurationHours, timeToMinutes } from "@/lib/roster/week-utils"

export type ComplianceIssueLevel = "warn" | "block"

export interface ComplianceIssue {
  code: string
  level: ComplianceIssueLevel
  message: string
}

export interface ComplianceContext {
  shifts: RosterShift[]
  staff?: StaffMember | null
  client?: Client | null
  enabledCharges?: NdisChargeItem[]
  isDisallowedPair?: boolean
  targetStatus?: RosterShift["status"]
  compliance?: RosterComplianceSettings
}

function enforcementLevel(enforcement: ComplianceEnforcement, active: boolean): ComplianceIssueLevel | null {
  if (!active || enforcement === "off") return null
  return enforcement === "block" ? "block" : "warn"
}

function pushIssue(
  issues: ComplianceIssue[],
  enforcement: ComplianceEnforcement,
  active: boolean,
  code: string,
  message: string,
) {
  const level = enforcementLevel(enforcement, active)
  if (!level) return
  issues.push({ code, level, message })
}

function parseIsoDate(value: string): Date | null {
  if (!value) return null
  const d = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function isScreeningExpired(expiry: string, shiftDate: string): boolean {
  const exp = parseIsoDate(expiry)
  const shift = parseIsoDate(shiftDate)
  if (!exp || !shift) return !expiry.trim()
  return exp < shift
}

function getStaffShiftsOnDate(
  shifts: RosterShift[],
  staffId: string,
  date: string,
  excludeId?: string,
): RosterShift[] {
  return shifts.filter(
    (s) =>
      s.staffId === staffId &&
      s.date === date &&
      s.id !== excludeId &&
      s.status !== "cancelled",
  )
}

function getAdjacentShifts(
  shifts: RosterShift[],
  staffId: string,
  candidate: Pick<RosterShiftInput, "date" | "startTime" | "endTime"> & { id?: string },
): { before: RosterShift | null; after: RosterShift | null } {
  const sameStaff = shifts.filter(
    (s) => s.staffId === staffId && s.id !== candidate.id && s.status !== "cancelled",
  )

  const candidateStart = timeToMinutes(normalizeTime(candidate.startTime))
  const candidateEnd = timeToMinutes(normalizeTime(candidate.endTime))
  const candidateDate = candidate.date

  let before: RosterShift | null = null
  let after: RosterShift | null = null

  for (const shift of sameStaff) {
    const shiftStart = timeToMinutes(shift.startTime)
    const shiftEnd = timeToMinutes(shift.endTime)

    if (shift.date === candidateDate && shiftEnd <= candidateStart) {
      if (!before || timeToMinutes(before.endTime) < shiftEnd) before = shift
    }
    if (shift.date === candidateDate && shiftStart >= candidateEnd) {
      if (!after || timeToMinutes(after.startTime) > shiftStart) after = shift
    }

    const prevDate = addDays(candidateDate, -1)
    if (shift.date === prevDate && shiftEnd > shiftStart) {
      const gapMinutes = candidateStart + 24 * 60 - shiftEnd
      if (gapMinutes < 24 * 60 && (!before || shift.date === prevDate)) before = shift
    }
  }

  return { before, after }
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function normalizeTime(value: string): string {
  const parts = value.split(":")
  if (parts.length < 2) return value
  return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`
}

function restHoursBetween(endTime: string, endDate: string, startTime: string, startDate: string): number {
  const end = new Date(`${endDate}T${normalizeTime(endTime)}:00`)
  let start = new Date(`${startDate}T${normalizeTime(startTime)}:00`)
  if (start < end) start = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return (start.getTime() - end.getTime()) / (1000 * 60 * 60)
}

export function getShiftComplianceIssues(
  candidate: RosterShiftInput & { id?: string; progressNote?: RosterShift["progressNote"] },
  context: ComplianceContext,
): ComplianceIssue[] {
  const compliance = context.compliance ?? getRosterSettings().compliance
  const issues: ComplianceIssue[] = []
  const status = context.targetStatus ?? candidate.status ?? "scheduled"

  if (context.isDisallowedPair) {
    pushIssue(
      issues,
      compliance.suitabilityEnforcement,
      true,
      "suitability",
      "This staff member is marked as disallowed for this participant.",
    )
  }

  if (context.staff && compliance.workerScreeningCheck !== "off") {
    const expiry = context.staff.details.ndisScreeningExpiry?.trim() ?? ""
    const missing = !expiry
    const expired = expiry ? isScreeningExpired(expiry, candidate.date) : false
    if (missing) {
      pushIssue(
        issues,
        compliance.workerScreeningCheck,
        true,
        "screening-missing",
        "Worker NDIS screening expiry is not recorded.",
      )
    } else if (expired) {
      pushIssue(
        issues,
        compliance.workerScreeningCheck,
        true,
        "screening-expired",
        `Worker NDIS screening expired on ${expiry}.`,
      )
    }
  }

  if (compliance.schadsRosterWarnings && candidate.staffId && status !== "cancelled") {
    const hours = shiftDurationHours(
      normalizeTime(candidate.startTime),
      normalizeTime(candidate.endTime),
    )
    if (hours > compliance.maxShiftLengthHours) {
      issues.push({
        code: "max-shift-length",
        level: "warn",
        message: `Shift is ${hours.toFixed(1)} hours — exceeds ${compliance.maxShiftLengthHours}h guideline.`,
      })
    }

    const { before, after } = getAdjacentShifts(context.shifts, candidate.staffId, candidate)
    const minRest = compliance.minRestHoursBetweenShifts

    if (before) {
      const rest = restHoursBetween(before.endTime, before.date, candidate.startTime, candidate.date)
      if (rest < minRest) {
        issues.push({
          code: "rest-before",
          level: "warn",
          message: `Only ${rest.toFixed(1)}h rest after previous shift (minimum ${minRest}h).`,
        })
      }
    }
    if (after) {
      const rest = restHoursBetween(candidate.endTime, candidate.date, after.startTime, after.date)
      if (rest < minRest) {
        issues.push({
          code: "rest-after",
          level: "warn",
          message: `Only ${rest.toFixed(1)}h rest before next shift (minimum ${minRest}h).`,
        })
      }
    }

    if (compliance.brokenShiftWarnings && before && before.date === candidate.date) {
      const gapHours =
        (timeToMinutes(normalizeTime(candidate.startTime)) - timeToMinutes(before.endTime)) / 60
      if (gapHours >= 1 && gapHours <= 12) {
        issues.push({
          code: "broken-shift",
          level: "warn",
          message: `Broken shift: ${gapHours.toFixed(1)}h gap between shifts on the same day.`,
        })
      }
    }
  }

  if (
    status === "completed" &&
    compliance.progressNoteOnComplete !== "off"
  ) {
    const note = candidate.progressNote
    const hasNote = Boolean(note?.supportProvided?.trim())
    pushIssue(
      issues,
      compliance.progressNoteOnComplete,
      !hasNote,
      "progress-note-required",
      "A progress note is required before completing this shift.",
    )
  }

  if (
    candidate.progressNote?.incidentOccurred &&
    compliance.incidentLinkRequired !== "off"
  ) {
    pushIssue(
      issues,
      compliance.incidentLinkRequired,
      true,
      "incident-link",
      "An incident was flagged — log a formal incident report and link it to this shift.",
    )
  }

  if (
    compliance.budgetWarnings !== "off" &&
    context.client &&
    context.enabledCharges?.length &&
    candidate.clientId &&
    candidate.chargeTypes?.length &&
    status !== "cancelled"
  ) {
    const budgets = context.client.participant?.budgets ?? []
    for (const budget of budgets) {
      const projection = getScheduledShiftProjection(
        context.shifts.filter((s) => s.id !== candidate.id),
        candidate.clientId,
        context.enabledCharges,
        { fromDate: budget.startDate, budgetChargeItems: budget.chargeItems },
      )
      const shiftCost = estimateShiftCost(candidate, context.enabledCharges)
      const total = projection.projectedTotal + shiftCost
      const cap = budget.allocatedAmount ?? 0
      if (cap > 0 && total > cap) {
        pushIssue(
          issues,
          compliance.budgetWarnings,
          true,
          "budget-overrun",
          `Scheduled supports may exceed ${budget.name} ($${total.toFixed(0)} vs $${cap.toFixed(0)} allocated).`,
        )
        break
      }
    }
  }

  return issues
}

function estimateShiftCost(
  candidate: Pick<RosterShiftInput, "startTime" | "endTime" | "chargeTypes">,
  charges: NdisChargeItem[],
): number {
  const hours = shiftDurationHours(normalizeTime(candidate.startTime), normalizeTime(candidate.endTime))
  let total = 0
  for (const itemNumber of candidate.chargeTypes ?? []) {
    const charge = charges.find((c) => c.itemNumber === itemNumber)
    if (!charge) continue
    if (charge.unit === "hour") total += hours * charge.price
    else total += charge.price
  }
  return total
}

export function complianceIssuesToMessages(issues: ComplianceIssue[]): string[] {
  return issues.map((issue) => issue.message)
}

export function hasBlockingComplianceIssues(issues: ComplianceIssue[]): boolean {
  return issues.some((issue) => issue.level === "block")
}

export function mergeComplianceWithConflicts(
  conflictMessages: string[],
  complianceIssues: ComplianceIssue[],
): { messages: string[]; hasBlock: boolean } {
  const messages = [...conflictMessages, ...complianceIssuesToMessages(complianceIssues)]
  return {
    messages,
    hasBlock: hasBlockingComplianceIssues(complianceIssues),
  }
}

export function getCancellationClaimSuggestion(
  cancelledBy: RosterShift["cancelledBy"],
  shift: Pick<RosterShift, "date" | "chargeTypes">,
): string | null {
  const compliance = getRosterSettings().compliance
  if (!compliance.cancellationClaimSuggestions) return null
  if (!shift.chargeTypes.length) return null

  if (cancelledBy === "client") {
    return "Consider a short-notice cancellation claim if notice was under 7 days. Use claim type “Short Notice Cancellation” when generating NDIS claims."
  }
  return "Organisation-initiated cancellation — typically not claimable unless policy allows. Document the reason for audit."
}

export function buildBillableInputsFromShiftTimesheet(
  timesheet: Pick<Timesheet, "id" | "staffId" | "submittedByName" | "startDate" | "workedMinutes">,
  shift: RosterShift,
  enabledCharges: NdisChargeItem[],
  chargeItems: Array<{ itemNumber: string; gstCode: string }>,
  options?: { billAllChargeTypes?: boolean },
): BillableEntryInput[] {
  const billAll = options?.billAllChargeTypes ?? getRosterSettings().compliance.billAllChargeTypes
  const chargeNumbers = billAll && shift.chargeTypes.length > 0 ? shift.chargeTypes : shift.chargeTypes.slice(0, 1)
  if (chargeNumbers.length === 0) return []

  const hours = Number((timesheet.workedMinutes / 60).toFixed(2))
  if (hours <= 0 && chargeNumbers.every((n) => {
    const c = enabledCharges.find((e) => e.itemNumber === n)
    return c?.unit === "hour"
  })) {
    return []
  }

  const stringParts = billAll ? [shift] : [shift]
  const parts = stringParts.length > 0 ? stringParts : [shift]

  return chargeNumbers.flatMap((chargeNumber, index) => {
    const charge = enabledCharges.find((c) => c.itemNumber === chargeNumber)
    if (!charge) return []

    const perItem = isPerItemChargeUnit(charge.unit)
    const gstCode = chargeItems.find((ci) => ci.itemNumber === charge.itemNumber)?.gstCode || "P2"
    const quantity = perItem ? 1 : hours / Math.max(1, chargeNumbers.length)

    return [
      {
        clientId: shift.clientId,
        clientName: shift.clientName,
        staffId: timesheet.staffId,
        staffName: timesheet.submittedByName,
        source: "shift" as const,
        sourceId: `${timesheet.id}:${chargeNumber}:${index}`,
        serviceDate: timesheet.startDate,
        chargeItemNumber: charge.itemNumber,
        chargeName: charge.shortName || charge.name,
        unit: (perItem ? "each" : "hour") as BillableEntryUnit,
        quantity: perItem ? 1 : Number(quantity.toFixed(2)),
        rate: charge.price,
        gstCode,
        description: `Support delivered ${timesheet.startDate}`,
      },
    ]
  })
}
