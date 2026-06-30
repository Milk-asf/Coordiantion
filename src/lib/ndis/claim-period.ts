export type ClaimPeriodStatus = "draft" | "ready" | "exported" | "reconciled"

/** Payment status tracked after submitting the claim to the NDIA portal. */
export type ClaimPaymentStatus = "unpaid" | "paid"

export interface ClaimPeriod {
  id: string
  workspaceId: string
  name: string
  startDate: string
  endDate: string
  status: ClaimPeriodStatus
  paymentStatus: ClaimPaymentStatus
  /** A billable entry id for a single line, or "client:<clientId>" for a whole participant. */
  excludedKeys: string[]
  exportedAt: string | null
  exportCount: number
  createdByName: string
  createdAt: string
  updatedAt: string
}

export const CLAIM_PAYMENT_STATUS_LABELS: Record<ClaimPaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
}

export const CLAIM_PAYMENT_STATUS_THEME: Record<ClaimPaymentStatus, string> = {
  unpaid: "bg-[#fef3c7] text-[#b45309]",
  paid: "bg-[#e7f5ec] text-[#1a7f43]",
}

export interface ClaimPeriodInput {
  name: string
  startDate: string
  endDate: string
}

export const CLAIM_PERIOD_STATUS_LABELS: Record<ClaimPeriodStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  exported: "Exported",
  reconciled: "Reconciled",
}

export interface ClaimPeriodKanbanColumn {
  status: ClaimPeriodStatus
  label: string
}

export const CLAIM_PERIOD_KANBAN_COLUMNS: ClaimPeriodKanbanColumn[] = [
  { status: "draft", label: "Draft" },
  { status: "ready", label: "Ready" },
  { status: "exported", label: "Exported" },
  { status: "reconciled", label: "Reconciled" },
]

export const CLAIM_PERIOD_STATUS_THEME: Record<ClaimPeriodStatus, string> = {
  draft: "bg-[#eef2f7] text-[#475569]",
  ready: "bg-[#dbeafe] text-[#1d4ed8]",
  exported: "bg-[#e7f5ec] text-[#1a7f43]",
  reconciled: "bg-[#ede9fe] text-[#6d28d9]",
}

export function getClaimPeriodStatusClasses(status: ClaimPeriodStatus): string {
  return CLAIM_PERIOD_STATUS_THEME[status] ?? CLAIM_PERIOD_STATUS_THEME.draft
}

/** Stable key for an individual claimable line item. */
export function claimLineKey(invoiceId: string, lineItemId: string): string {
  return `${invoiceId}:${lineItemId}`
}

/** Key used to exclude an entire participant from a claim. */
export function claimParticipantKey(clientId: string): string {
  return `client:${clientId}`
}

export function formatClaimPeriodRange(startDate: string, endDate: string): string {
  const fmt = (value: string) =>
    value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : "—"
  return `${fmt(startDate)} → ${fmt(endDate)}`
}

/** Default name for a new claim period, e.g. "Claim 01 Jun – 23 Jun 2026". */
export function defaultClaimPeriodName(startDate: string, endDate: string): string {
  const short = (value: string) =>
    value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-AU", { day: "2-digit", month: "short" }) : ""
  const year = endDate ? new Date(`${endDate}T00:00:00`).getFullYear() : new Date().getFullYear()
  return `Claim ${short(startDate)} – ${short(endDate)} ${year}`.trim()
}
