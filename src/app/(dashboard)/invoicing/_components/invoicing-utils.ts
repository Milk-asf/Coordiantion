import type { ChargeUnit } from "@/lib/ndis-charges"
import { isPerItemChargeUnit } from "@/lib/ndis-charges"
import type { FundingType, Task } from "@/lib/types"

export function formatTime(minutes: number): string {
  if (minutes === 0) return "0m"
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDecimal(value: number): string {
  return value.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function formatInvoiceQuantity(task: Task, unit: ChargeUnit | undefined): number {
  if (isPerItemChargeUnit(unit)) return task.timeSpent > 0 ? task.timeSpent : 1
  if (task.timeSpent <= 0) return 0
  return Number((task.timeSpent / 60).toFixed(2))
}

// Round a monetary value to 2 decimal places, avoiding float drift.
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

// NDIS price-guide rates are GST-inclusive when GST applies.
// P1 (GST on income) -> GST = amount / 11. P2/P5/blank -> GST free.
export function computeGstAmount(amount: number, gstCode: string | undefined): number {
  if (gstCode === "P1") return roundMoney(amount / 11)
  return 0
}

export function formatFundingType(fundingType: FundingType): string {
  if (!fundingType) return "Unknown"
  if (fundingType === "plan-managed") return "Plan managed"
  if (fundingType === "ndia-managed") return "Agency managed"
  return "Self managed"
}

export function formatBillingType(fundingType: FundingType): string {
  if (fundingType === "plan-managed") return "Plan"
  if (fundingType === "ndia-managed") return "Agency"
  if (fundingType === "self-managed") return "Self"
  return "Unknown"
}

export function formatInvoiceDate(dateStr: string | null): string {
  if (!dateStr) return ""
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function getPortalClaimTarget() {
  return "NDIA myplace provider portal"
}

export function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function getStartOfWeek(offset = 0): Date {
  const today = new Date()
  const start = new Date(today)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff + offset * 7)
  start.setHours(0, 0, 0, 0)
  return start
}

export function sortTasksByDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return b.dueDate.localeCompare(a.dueDate)
  })
}
