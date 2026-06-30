/**
 * Finance contacts are external people or organisations who receive invoices —
 * separate from participants (clients) and staff. A contact can be assigned as a
 * client's invoice recipient or "Send To" target when generating invoices.
 */

export type FinanceContactType = "person" | "company"

export interface FinanceContact {
  id: string
  workspaceId: string
  type: FinanceContactType
  name: string
  email: string
  phone: string
  abn: string
  address: string
  bsb: string
  accountNumber: string
  notes: string
  createdBy: string | null
  createdByName: string
  createdAt: string
  updatedAt: string
}

export interface FinanceContactInput {
  type: FinanceContactType
  name: string
  email: string
  phone?: string
  abn?: string
  address?: string
  bsb?: string
  accountNumber?: string
  notes?: string
}

export const FINANCE_CONTACT_TYPES: Array<{ value: FinanceContactType; label: string }> = [
  { value: "person", label: "Person" },
  { value: "company", label: "Company" },
]

export function getFinanceContactTypeLabel(type: FinanceContactType): string {
  return FINANCE_CONTACT_TYPES.find((option) => option.value === type)?.label ?? type
}
