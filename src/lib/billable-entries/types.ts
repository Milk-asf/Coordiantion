/**
 * Billable entries are the atom of the finance system: a single delivered,
 * chargeable service for a participant. They are produced from completed shifts,
 * billable tasks, approved travel-with-client, or manual entry, and are then
 * consumed by NDIS claims and bulk invoicing.
 *
 * Lifecycle (status):
 *  - unpaid     Available — not yet in a claim or invoice draft.
 *  - draft      Pulled into an in-progress bulk-invoice draft.
 *  - ndis-draft Pulled into an NDIS claim generation that hasn't been submitted.
 *  - exported   Submitted to the NDIA portal via a bulk payment request CSV.
 */

export type BillableEntrySource = "shift" | "task" | "travel" | "manual"

export type BillableEntryStatus = "unpaid" | "draft" | "ndis-draft" | "exported"

export type BillableEntryUnit = "hour" | "each" | "km"

export interface BillableEntry {
  id: string
  workspaceId: string
  clientId: string | null
  clientName: string
  staffId: string | null
  staffName: string
  source: BillableEntrySource
  /** Originating shift/task/travel-claim id — used to dedupe on re-sync. */
  sourceId: string | null
  serviceDate: string
  chargeItemNumber: string
  chargeName: string
  claimType: string
  unit: BillableEntryUnit
  quantity: number
  rate: number
  amount: number
  gstCode: string
  gstAmount: number
  description: string
  status: BillableEntryStatus
  /** Set when rolled into an invoice. */
  invoiceId: string | null
  /** Set when added to a claim period. */
  claimPeriodId: string | null
  createdBy: string | null
  createdByName: string
  createdAt: string
  updatedAt: string
}

export interface BillableEntryInput {
  clientId: string | null
  clientName?: string
  staffId?: string | null
  staffName?: string
  source?: BillableEntrySource
  sourceId?: string | null
  serviceDate: string
  chargeItemNumber: string
  chargeName?: string
  claimType?: string
  unit: BillableEntryUnit
  quantity: number
  rate: number
  gstCode?: string
  description?: string
  status?: BillableEntryStatus
}

export const BILLABLE_ENTRY_SOURCE_LABELS: Record<BillableEntrySource, string> = {
  shift: "Shift",
  task: "Task",
  travel: "Travel",
  manual: "Manual",
}

export const billableEntryStatuses: Array<{ value: BillableEntryStatus; label: string }> = [
  { value: "unpaid", label: "Unpaid" },
  { value: "draft", label: "Draft" },
  { value: "ndis-draft", label: "NDIS Draft" },
  { value: "exported", label: "Exported CSV" },
]

export const BILLABLE_ENTRY_STATUS_LABELS: Record<BillableEntryStatus, string> = {
  unpaid: "Unpaid",
  draft: "Draft",
  "ndis-draft": "NDIS Draft",
  exported: "Exported CSV",
}

export const BILLABLE_ENTRY_STATUS_CLASSES: Record<BillableEntryStatus, string> = {
  unpaid: "bg-folk-hover text-folk-secondary",
  draft: "bg-[#fef3c7] text-[#b45309]",
  "ndis-draft": "bg-[#dbeafe] text-[#1d4ed8]",
  exported: "bg-[#e7f5ec] text-[#1a7f43]",
}

export function getBillableEntryStatusLabel(status: BillableEntryStatus): string {
  return BILLABLE_ENTRY_STATUS_LABELS[status] ?? status
}

export function getBillableEntryStatusClasses(status: BillableEntryStatus): string {
  return BILLABLE_ENTRY_STATUS_CLASSES[status] ?? BILLABLE_ENTRY_STATUS_CLASSES.unpaid
}

/** A billable entry can only be edited/removed before it is locked into a claim or invoice. */
export function isBillableEntryEditable(status: BillableEntryStatus): boolean {
  return status === "unpaid"
}

/** Stable dedupe key so re-syncing a period never double-creates the same line. */
export function billableEntryDedupeKey(
  source: BillableEntrySource,
  sourceId: string | null,
  chargeItemNumber: string,
): string {
  return `${source}:${sourceId ?? ""}:${chargeItemNumber}`
}

export function computeBillableAmount(quantity: number, rate: number): number {
  return Number((Math.max(0, quantity) * Math.max(0, rate)).toFixed(2))
}

/** GST per the entry's GST code: only P1 (taxable) attracts 10% GST. */
export function computeBillableGst(amount: number, gstCode: string): number {
  if (gstCode !== "P1") return 0
  return Number((amount / 11).toFixed(2))
}

export function formatBillableAmount(amount: number): string {
  return `$${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatBillableQuantity(quantity: number, unit: BillableEntryUnit): string {
  const suffix = unit === "hour" ? "hr" : unit === "km" ? "km" : "ea"
  return `${quantity} ${suffix}`
}

export function formatBillableDate(value?: string | null): string {
  if (!value) return "—"
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}
