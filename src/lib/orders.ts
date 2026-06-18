import type { OrderFundingSource, OrderStatus } from "@/lib/types"

export const orderFundingSources: Array<{ value: OrderFundingSource; label: string }> = [
  { value: "none", label: "No funding" },
  { value: "ndis", label: "NDIS" },
  { value: "private", label: "Private" },
  { value: "other", label: "Other" },
]

export const orderStatuses: Array<{ value: OrderStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "returned", label: "Returned" },
  { value: "approved", label: "Approved" },
]

export function getOrderFundingSourceLabel(value: OrderFundingSource): string {
  return orderFundingSources.find((source) => source.value === value)?.label ?? value
}

export function getOrderStatusLabel(value: OrderStatus): string {
  return orderStatuses.find((status) => status.value === value)?.label ?? value
}

export function getOrderStatusClasses(status: OrderStatus): string {
  if (status === "approved") return "bg-green-50 text-green-700"
  if (status === "sent") return "bg-[#eef4fc] text-[#2563EB]"
  if (status === "returned") return "bg-amber-50 text-amber-700"
  return "bg-[var(--folk-border-subtle)] text-folk-secondary"
}

export function formatOrderAmount(amount: number): string {
  return `$${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatOrderDate(value?: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function isOrderEditable(status: OrderStatus): boolean {
  return status === "draft" || status === "returned"
}
