import type { Budget, BudgetPeriod, BudgetReleasePeriod, Invoice, SpendingPlan } from "@/lib/types"
import type { NdisChargeItem } from "@/lib/ndis-charges"
import type { RosterShift } from "@/lib/roster/types"
import type { FundingReleaseCadence, NdisFundingComponent } from "@/lib/ndis-funding-pools"
import { FUNDING_RELEASE_CADENCE_OPTIONS, mapSupportCategoryToComponent, resolveBudgetFundingComponent } from "@/lib/ndis-funding-pools"
import { shiftDurationHours } from "@/lib/roster/week-utils"
import { getNdisChargeByItemNumber } from "@/lib/ndis-charges"

export function getPeriodsInBudgetWindow(period: BudgetPeriod, startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    const fallback: Record<BudgetPeriod, number> = {
      "per-week": 52,
      "per-fortnight": 26,
      "per-month": 12,
      "per-year": 1,
      "per-plan": 1,
    }
    return fallback[period]
  }
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))

  switch (period) {
    case "per-week":
      return days / 7
    case "per-fortnight":
      return days / 14
    case "per-month":
      return days / 30.44
    case "per-year":
      return days / 365.25
    case "per-plan":
      return 1
    default:
      return 1
  }
}

export function getLineItemPeriodCost(
  lineItem: { quantity: number; period: BudgetPeriod; chargeItemNumber: string },
  charges: NdisChargeItem[],
  budgetStart: string,
  budgetEnd: string
) {
  const charge = charges.find((c) => c.itemNumber === lineItem.chargeItemNumber)
  const rate = charge?.price ?? 0
  const periods = getPeriodsInBudgetWindow(lineItem.period, budgetStart, budgetEnd)
  return lineItem.quantity * rate * periods
}

export function getBudgetLineTotal(budget: Budget, charges: NdisChargeItem[]) {
  if (budget.allocatedAmount && budget.allocatedAmount > 0) return budget.allocatedAmount
  return budget.lineItems.reduce(
    (sum, li) => sum + getLineItemPeriodCost(li, charges, budget.startDate, budget.endDate),
    0
  )
}

export function getSpendingPlanPeriodCost(plan: SpendingPlan, charges: NdisChargeItem[]) {
  const charge = charges.find((c) => c.itemNumber === plan.chargeItemNumber)
  const rate = charge?.price ?? 0
  const periods = getPeriodsInBudgetWindow(plan.cadence, plan.startDate, plan.endDate)
  return plan.quantity * rate * periods
}

export function getSpendingPlanCadenceCost(plan: SpendingPlan, charges: NdisChargeItem[]) {
  const charge = charges.find((c) => c.itemNumber === plan.chargeItemNumber)
  const rate = charge?.price ?? 0
  return plan.quantity * rate
}

export function sumReleasePeriodAmounts(periods: BudgetReleasePeriod[]): number {
  return periods.reduce((sum, period) => sum + period.allocatedAmount, 0)
}

export function getReleaseScheduleWarning(totalAmount: number, periods: BudgetReleasePeriod[]): string | null {
  if (periods.length === 0 || totalAmount <= 0) return null
  const sum = sumReleasePeriodAmounts(periods)
  const diff = Math.abs(sum - totalAmount)
  if (diff < 0.01) return null
  return `Release periods total ${formatBudgetCurrency(sum)} but budget allocation is ${formatBudgetCurrency(totalAmount)}`
}

export function shouldRegenerateReleasePeriods(
  existing: Budget | null,
  params: {
    startDate: string
    endDate: string
    cadence: FundingReleaseCadence
    allocatedAmount: number
  }
): boolean {
  if (!existing?.releasePeriods?.length) return true
  return (
    existing.startDate !== params.startDate ||
    existing.endDate !== params.endDate ||
    existing.releaseCadence !== params.cadence ||
    existing.allocatedAmount !== params.allocatedAmount
  )
}

export function deriveBudgetChargeItems(budgetId: string, spendingPlans: SpendingPlan[]): string[] {
  const items = spendingPlans
    .filter((plan) => plan.budgetId === budgetId && plan.chargeItemNumber)
    .map((plan) => plan.chargeItemNumber)
  return [...new Set(items)]
}

export function getChargeItemFundingComponent(
  chargeItemNumber: string,
  charges: NdisChargeItem[]
): NdisFundingComponent | null {
  const charge = charges.find((c) => c.itemNumber === chargeItemNumber)
    || getNdisChargeByItemNumber(chargeItemNumber)
  if (!charge) return null
  return mapSupportCategoryToComponent(charge.supportCategoryNumber)
}

export function validateChargeItemForBudgetComponent(
  chargeItemNumber: string,
  charges: NdisChargeItem[],
  budgetComponent: NdisFundingComponent
): { valid: boolean; message?: string } {
  const chargeComponent = getChargeItemFundingComponent(chargeItemNumber, charges)
  if (!chargeComponent) return { valid: true }
  if (chargeComponent === budgetComponent) return { valid: true }
  return {
    valid: false,
    message: `This charge item belongs to ${chargeComponent.replace("-", " ")} funding, not ${budgetComponent.replace("-", " ")}`,
  }
}

export function getSpendingPlanAllocationWarnings(
  budget: Budget,
  spendingPlans: SpendingPlan[],
  charges: NdisChargeItem[],
  invoices: Invoice[]
): string[] {
  const warnings: string[] = []
  const linkedPlans = spendingPlans.filter((plan) => plan.budgetId === budget.id)
  const budgetComponent = resolveBudgetFundingComponent(budget)

  for (const plan of linkedPlans) {
    if (budgetComponent) {
      const validation = validateChargeItemForBudgetComponent(plan.chargeItemNumber, charges, budgetComponent)
      if (!validation.valid && validation.message) warnings.push(`${plan.name}: ${validation.message}`)
    }
  }

  const plannedTotal = linkedPlans.reduce(
    (sum, plan) => sum + getSpendingPlanPeriodCost(plan, charges),
    0
  )
  const allocated = budget.allocatedAmount || getBudgetLineTotal(budget, charges)
  if (allocated > 0 && plannedTotal > allocated) {
    warnings.push(
      `Planned spending (${formatBudgetCurrency(plannedTotal)}) exceeds budget allocation (${formatBudgetCurrency(allocated)})`
    )
  }

  const currentPeriod = getCurrentReleasePeriod(budget)
  if (currentPeriod) {
    const periodPlanned = linkedPlans
      .filter((plan) => planOverlapsDateRange(plan, currentPeriod.startDate, currentPeriod.endDate))
      .reduce((sum, plan) => sum + getSpendingPlanPeriodCostInRange(plan, charges, currentPeriod.startDate, currentPeriod.endDate), 0)

    if (periodPlanned > currentPeriod.allocatedAmount) {
      warnings.push(
        `Planned spending this release period (${formatBudgetCurrency(periodPlanned)}) exceeds period allocation (${formatBudgetCurrency(currentPeriod.allocatedAmount)})`
      )
    }

    const periodUsed = getBudgetUsedAmountInPeriod(budget, invoices, currentPeriod)
    if (periodUsed > currentPeriod.allocatedAmount) {
      warnings.push(
        `Invoice usage this release period (${formatBudgetCurrency(periodUsed)}) exceeds period allocation (${formatBudgetCurrency(currentPeriod.allocatedAmount)})`
      )
    }
  }

  return warnings
}

function planOverlapsDateRange(plan: SpendingPlan, rangeStart: string, rangeEnd: string) {
  if (!plan.startDate || !plan.endDate) return true
  return plan.startDate <= rangeEnd && plan.endDate >= rangeStart
}

export function getSpendingPlanPeriodCostInRange(
  plan: SpendingPlan,
  charges: NdisChargeItem[],
  rangeStart: string,
  rangeEnd: string
) {
  const effectiveStart = plan.startDate > rangeStart ? plan.startDate : rangeStart
  const effectiveEnd = plan.endDate < rangeEnd ? plan.endDate : rangeEnd
  if (effectiveStart > effectiveEnd) return 0
  const charge = charges.find((c) => c.itemNumber === plan.chargeItemNumber)
  const rate = charge?.price ?? 0
  const periods = getPeriodsInBudgetWindow(plan.cadence, effectiveStart, effectiveEnd)
  return plan.quantity * rate * periods
}

function formatBudgetCurrency(value: number) {
  return `$${value.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function getBudgetUsedAmountInDateRange(
  budget: Budget,
  invoices: Invoice[],
  rangeStart: string | null,
  rangeEnd: string | null
) {
  let total = 0
  const start = rangeStart ? new Date(`${rangeStart}T00:00:00`) : null
  const end = rangeEnd ? new Date(`${rangeEnd}T00:00:00`) : null

  for (const inv of invoices) {
    if (inv.status === "void") continue
    for (const li of inv.lineItems) {
      if (!budget.chargeItems.includes(li.chargeItemNumber)) continue
      const dateStr = li.serviceDate || inv.issueDate?.slice(0, 10)
      if (!dateStr) continue
      const serviceDate = new Date(`${dateStr}T00:00:00`)
      if (start && serviceDate < start) continue
      if (end && serviceDate > end) continue
      total += li.amount
    }
  }
  return total
}

export function getBudgetUsedAmountInPeriod(
  budget: Budget,
  invoices: Invoice[],
  period: BudgetReleasePeriod | null
) {
  if (!period) return 0
  return getBudgetUsedAmountInDateRange(budget, invoices, period.startDate, period.endDate)
}

export function getBudgetUsedAmount(budget: Budget, invoices: Invoice[]) {
  return getBudgetUsedAmountInDateRange(budget, invoices, budget.startDate, budget.endDate)
}

export function getCurrentSpendingRate(invoices: Invoice[], chargeItemNumbers: string[], days = 30) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const from = new Date(now)
  from.setDate(from.getDate() - days)

  let total = 0
  for (const inv of invoices) {
    if (inv.status === "void") continue
    for (const li of inv.lineItems) {
      if (!chargeItemNumbers.includes(li.chargeItemNumber)) continue
      const dateStr = li.serviceDate || inv.issueDate?.slice(0, 10)
      if (!dateStr) continue
      const d = new Date(`${dateStr}T00:00:00`)
      if (d < from || d > now) continue
      total += li.amount
    }
  }

  return {
    total,
    dailyRate: total / days,
    weeklyRate: (total / days) * 7,
    monthlyRate: (total / days) * 30.44,
  }
}

export function getShiftProjectedCost(shift: RosterShift, charges: NdisChargeItem[]) {
  if (shift.status === "cancelled") return 0
  const hours = shiftDurationHours(shift.startTime, shift.endTime)
  let total = 0

  for (const itemNumber of shift.chargeTypes) {
    const catalogue = getNdisChargeByItemNumber(itemNumber)
    const enabled = charges.find((c) => c.itemNumber === itemNumber)
    const charge = enabled || catalogue
    if (!charge) continue

    if (charge.unit === "hour") total += hours * charge.price
    else total += charge.price
  }

  return total
}

export function getScheduledShiftProjection(
  shifts: RosterShift[],
  clientId: string,
  charges: NdisChargeItem[],
  options?: { fromDate?: string; budgetChargeItems?: string[] }
) {
  const from = options?.fromDate || new Date().toISOString().slice(0, 10)

  const scheduled = shifts.filter(
    (shift) =>
      shift.clientId === clientId &&
      shift.status === "scheduled" &&
      shift.date >= from
  )

  const projectedTotal = scheduled.reduce((sum, shift) => {
    if (options?.budgetChargeItems?.length) {
      const hasMatch = shift.chargeTypes.some((n) => options.budgetChargeItems!.includes(n))
      if (!hasMatch) return sum
    }
    return sum + getShiftProjectedCost(shift, charges)
  }, 0)

  return { shiftCount: scheduled.length, projectedTotal, shifts: scheduled }
}

function addMonths(dateStr: string, months: number) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setMonth(d.getMonth() + months)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function generateReleasePeriods(
  startDate: string,
  endDate: string,
  cadence: FundingReleaseCadence,
  totalAmount: number
): BudgetReleasePeriod[] {
  if (!startDate || !endDate || totalAmount <= 0) return []

  const monthStep =
    cadence === "monthly" ? 1
    : cadence === "quarterly" ? 3
    : cadence === "semi-annual" ? 6
    : 12

  if (cadence === "upfront" || cadence === "annual") {
    return [{
      id: crypto.randomUUID(),
      periodNumber: 1,
      startDate,
      endDate,
      allocatedAmount: totalAmount,
    }]
  }

  const periods: BudgetReleasePeriod[] = []
  let cursor = startDate
  let periodNumber = 1

  while (cursor <= endDate && periodNumber <= 24) {
    const nextStart = addMonths(cursor, monthStep)
    let periodEnd: string
    if (nextStart > endDate) {
      periodEnd = endDate
    } else {
      const d = new Date(`${nextStart}T00:00:00`)
      d.setDate(d.getDate() - 1)
      periodEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    }

    if (new Date(`${periodEnd}T00:00:00`) < new Date(`${cursor}T00:00:00`)) break

    periods.push({
      id: crypto.randomUUID(),
      periodNumber,
      startDate: cursor,
      endDate: periodEnd,
      allocatedAmount: 0,
    })

    if (periodEnd >= endDate) break
    cursor = nextStart
    periodNumber += 1
  }

  if (periods.length === 0) {
    return [{
      id: crypto.randomUUID(),
      periodNumber: 1,
      startDate,
      endDate,
      allocatedAmount: totalAmount,
    }]
  }

  const perPeriod = Math.round((totalAmount / periods.length) * 100) / 100
  return periods.map((period, index) => ({
    ...period,
    allocatedAmount:
      index === periods.length - 1
        ? Math.round((totalAmount - perPeriod * (periods.length - 1)) * 100) / 100
        : perPeriod,
  }))
}

export function getCurrentReleasePeriod(budget: Budget): BudgetReleasePeriod | null {
  if (!budget.releasePeriods?.length) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return (
    budget.releasePeriods.find((period) => {
      const start = new Date(`${period.startDate}T00:00:00`)
      const end = new Date(`${period.endDate}T00:00:00`)
      return start <= now && end >= now
    }) ?? null
  )
}

export function getBudgetAvailableNow(budget: Budget, invoices: Invoice[]) {
  const current = getCurrentReleasePeriod(budget)
  if (!current) {
    const total = budget.allocatedAmount || 0
    const used = getBudgetUsedAmount(budget, invoices)
    return Math.max(0, total - used)
  }
  const periodUsed = getBudgetUsedAmountInPeriod(budget, invoices, current)
  return Math.max(0, current.allocatedAmount - periodUsed)
}

export function getBudgetStatus(budget: Budget): { label: string; color: string } {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = budget.endDate ? new Date(`${budget.endDate}T00:00:00`) : null
  const start = budget.startDate ? new Date(`${budget.startDate}T00:00:00`) : null

  if (!start && !end) return { label: "Inactive", color: "bg-red-50 text-red-600" }
  if (end && end < now) return { label: "Expired", color: "bg-red-50 text-red-600" }
  if (start && start > now) return { label: "Upcoming", color: "bg-blue-50 text-blue-600" }
  return { label: "Active", color: "bg-green-100 text-green-700" }
}

export function getBudgetDaysRemaining(budget: Budget) {
  if (!budget.endDate) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = new Date(`${budget.endDate}T00:00:00`)
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000))
}

export interface BudgetRowMetrics {
  total: number
  used: number
  remaining: number
  usagePct: number
  periodUsed: number
  periodUsagePct: number
  periodRemaining: number
  status: { label: string; color: string }
  daysRemaining: number | null
  currentPeriod?: BudgetReleasePeriod | null
  availableNow?: number
  plannedTotal?: number
  shiftProjected?: number
  allocationWarnings?: string[]
}

export function getBudgetRowMetrics(
  budget: Budget,
  invoices: Invoice[],
  charges: NdisChargeItem[],
  options?: {
    spendingPlans?: SpendingPlan[]
    shifts?: RosterShift[]
    clientId?: string
  }
): BudgetRowMetrics {
  const total = getBudgetLineTotal(budget, charges)
  const used = getBudgetUsedAmount(budget, invoices)
  const remaining = Math.max(0, total - used)
  const usagePct = total > 0 ? (used / total) * 100 : 0
  const currentPeriod = getCurrentReleasePeriod(budget)
  const periodUsed = getBudgetUsedAmountInPeriod(budget, invoices, currentPeriod)
  const periodTotal = currentPeriod?.allocatedAmount ?? 0
  const periodRemaining = Math.max(0, periodTotal - periodUsed)
  const periodUsagePct = periodTotal > 0 ? (periodUsed / periodTotal) * 100 : 0
  const availableNow = getBudgetAvailableNow(budget, invoices)

  const linkedPlans = (options?.spendingPlans || []).filter((plan) => plan.budgetId === budget.id)
  const plannedTotal = linkedPlans.reduce(
    (sum, plan) => sum + getSpendingPlanPeriodCost(plan, charges),
    0
  )

  const allocationWarnings = options?.spendingPlans
    ? getSpendingPlanAllocationWarnings(budget, options.spendingPlans, charges, invoices)
    : []

  let shiftProjected = 0
  if (options?.shifts && options?.clientId) {
    shiftProjected = getScheduledShiftProjection(
      options.shifts,
      options.clientId,
      charges,
      { budgetChargeItems: budget.chargeItems }
    ).projectedTotal
  }

  return {
    total,
    used,
    remaining,
    usagePct,
    periodUsed,
    periodUsagePct,
    periodRemaining,
    status: getBudgetStatus(budget),
    daysRemaining: getBudgetDaysRemaining(budget),
    currentPeriod,
    availableNow,
    plannedTotal,
    shiftProjected,
    allocationWarnings,
  }
}

export const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, string> = {
  "per-week": "Per week",
  "per-fortnight": "Per fortnight",
  "per-month": "Per month",
  "per-year": "Per year",
  "per-plan": "Per plan",
}

export const RELEASE_CADENCE_LABELS: Record<FundingReleaseCadence, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  "semi-annual": "Semi-annual",
  annual: "Annual",
  upfront: "Up front",
}
