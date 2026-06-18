export type SuitabilityStatus = "suitable" | "preferred" | "disallowed"

export interface StaffClientSuitability {
  id: string
  staffId: string
  clientId: string
  status: SuitabilityStatus
}
