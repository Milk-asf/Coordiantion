import { timeToMinutes } from "@/lib/roster/week-utils"

/**
 * SCHADS Award (MA000100) pay engine for disability support workers.
 *
 * Computes the penalty/loading that applies to a worked period and the gross
 * pay from a base hourly rate. Follows the SCHADS rules:
 *  - Penalty rates are a percentage of the base rate and do NOT compound; when
 *    multiple triggers apply, the higher applies. Public holiday overrides.
 *  - Casual employees: 25% loading on weekday ordinary/shift work; weekend and
 *    public-holiday rates are inclusive of the loading (175/225/275%).
 *  - Vehicle (per-km) allowance stacks on top of penalty rates.
 *
 * Rates are operative from 1 July 2025; verify against the Fair Work pay guide
 * each annual review. These are an estimation aid, not a substitute for payroll
 * sign-off.
 */

export type EmploymentType = "full-time" | "part-time" | "casual"

export const EMPLOYMENT_TYPES: Array<{ value: EmploymentType; label: string }> = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "casual", label: "Casual" },
]

export type DayType = "weekday" | "saturday" | "sunday" | "public-holiday"

/** Loading classification within a weekday based on the shift window. */
export type ShiftKind = "day" | "afternoon" | "night"

/** SCHADS vehicle allowance for using your own car (per km), from 1 Jul 2025. */
export const VEHICLE_ALLOWANCE_PER_KM = 0.99

/** Casual loading applied to weekday ordinary/shift hours. */
export const CASUAL_LOADING = 0.25

/**
 * Indicative SCHADS Social & Community Services (disability) full-time minimum
 * hourly rates by level, from 1 July 2025. Used as defaults/hints only.
 */
export const SCHADS_LEVEL_RATES: Record<string, number> = {
  "1": 30.84,
  "2": 33.41,
  "3": 36.31,
  "4": 39.96,
  "5": 43.07,
  "6": 46.42,
  "7": 49.86,
  "8": 53.34,
}

export interface PenaltyResult {
  multiplier: number
  label: string
}

/** Day type for an ISO date, given an optional set of public-holiday ISO dates. */
export function getDayType(dateIso: string, publicHolidays?: Set<string>): DayType {
  if (publicHolidays?.has(dateIso)) return "public-holiday"
  const date = new Date(`${dateIso}T00:00:00`)
  const day = date.getDay()
  if (day === 0) return "sunday"
  if (day === 6) return "saturday"
  return "weekday"
}

/**
 * Classifies a weekday shift window. Afternoon = finishes after 8pm to midnight;
 * Night = starts before 6am or finishes after midnight (overnight); otherwise day.
 */
export function getShiftKind(startTime: string, endTime: string): ShiftKind {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  if (Number.isNaN(start) || Number.isNaN(end)) return "day"

  const isOvernight = end <= start
  if (isOvernight || start < 6 * 60) return "night"
  if (end > 20 * 60) return "afternoon"
  return "day"
}

/**
 * The applicable SCHADS penalty multiplier for a worked period. Non-compounding:
 * weekend and public-holiday rates are inclusive of casual loading; weekday shift
 * loadings add the casual loading on top for casuals.
 */
export function computePenalty(params: {
  dayType: DayType
  employmentType: EmploymentType
  shiftKind: ShiftKind
}): PenaltyResult {
  const { dayType, employmentType, shiftKind } = params
  const isCasual = employmentType === "casual"

  if (dayType === "public-holiday")
    return { multiplier: isCasual ? 2.75 : 2.5, label: isCasual ? "Public holiday (casual)" : "Public holiday" }
  if (dayType === "sunday")
    return { multiplier: isCasual ? 2.25 : 2.0, label: isCasual ? "Sunday (casual)" : "Sunday" }
  if (dayType === "saturday")
    return { multiplier: isCasual ? 1.75 : 1.5, label: isCasual ? "Saturday (casual)" : "Saturday" }

  // Weekday: ordinary or shift loading, plus casual loading where applicable.
  const shiftLoading = shiftKind === "night" ? 0.15 : shiftKind === "afternoon" ? 0.125 : 0
  const base = 1 + shiftLoading + (isCasual ? CASUAL_LOADING : 0)
  const kindLabel = shiftKind === "night" ? "Night shift" : shiftKind === "afternoon" ? "Afternoon shift" : "Ordinary"
  return { multiplier: Number(base.toFixed(4)), label: isCasual ? `${kindLabel} (casual)` : kindLabel }
}

export interface ShiftPayInput {
  baseRate: number
  employmentType: EmploymentType
  dateIso: string
  startTime: string
  endTime: string
  workedMinutes: number
  travelKm?: number
  publicHolidays?: Set<string>
}

export interface ShiftPayResult {
  hours: number
  multiplier: number
  penaltyLabel: string
  hourlyRate: number
  basePay: number
  travelAllowance: number
  gross: number
}

/** Computes gross pay for a single worked period under SCHADS. */
export function computeShiftPay(input: ShiftPayInput): ShiftPayResult {
  const hours = Math.max(0, input.workedMinutes) / 60
  const dayType = getDayType(input.dateIso, input.publicHolidays)
  const shiftKind = getShiftKind(input.startTime, input.endTime)
  const penalty = computePenalty({ dayType, employmentType: input.employmentType, shiftKind })

  const hourlyRate = Number((input.baseRate * penalty.multiplier).toFixed(4))
  const basePay = Number((hours * hourlyRate).toFixed(2))
  const travelAllowance = Number((Math.max(0, input.travelKm ?? 0) * VEHICLE_ALLOWANCE_PER_KM).toFixed(2))

  return {
    hours: Number(hours.toFixed(2)),
    multiplier: penalty.multiplier,
    penaltyLabel: penalty.label,
    hourlyRate,
    basePay,
    travelAllowance,
    gross: Number((basePay + travelAllowance).toFixed(2)),
  }
}

export function formatPayCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
