import type { ReimbursementCategory, ReimbursementStatus } from "@/lib/types"

export const reimbursementCategories: Array<{ value: ReimbursementCategory; label: string }> = [
  { value: "travel", label: "Travel" },
  { value: "meals", label: "Meals" },
  { value: "equipment", label: "Equipment & supplies" },
  { value: "training", label: "Training" },
  { value: "phone", label: "Phone & internet" },
  { value: "accommodation", label: "Accommodation" },
  { value: "other", label: "Other" },
]

export const reimbursementStatuses: Array<{ value: ReimbursementStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "returned", label: "Returned" },
  { value: "approved", label: "Approved" },
]

export function getReimbursementCategoryLabel(value: ReimbursementCategory): string {
  return reimbursementCategories.find((category) => category.value === value)?.label ?? value
}

export function getReimbursementStatusLabel(value: ReimbursementStatus): string {
  return reimbursementStatuses.find((status) => status.value === value)?.label ?? value
}

export function getReimbursementStatusClasses(status: ReimbursementStatus): string {
  if (status === "approved") return "bg-green-50 text-green-700"
  if (status === "sent") return "bg-[#eef4fc] text-[#2563EB]"
  if (status === "returned") return "bg-amber-50 text-amber-700"
  return "bg-[var(--folk-border-subtle)] text-folk-secondary"
}

export function formatReimbursementAmount(amount: number): string {
  return `$${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatReimbursementDate(value?: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function isReimbursementEditable(status: ReimbursementStatus): boolean {
  return status === "draft" || status === "returned"
}
