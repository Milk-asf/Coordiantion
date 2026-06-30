import catalogueData from "@/lib/data/ndis-pricing-catalogue.json"

export type ChargeUnit = "hour" | "each" | "km" | "day" | "week" | "month" | "year"

export interface NdisChargeItem {
  itemNumber: string
  name: string
  shortName: string
  registrationGroup: string
  registrationGroupNumber: string
  supportCategory: string
  supportCategoryNumber: number
  category: string
  unit: ChargeUnit
  price: number
  quoteRequired: boolean
}

export type BillableStatus = "active" | "inactive"

export const billableStatuses = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const

export interface ChargeItem {
  id: string
  name: string
  itemNumber: string
  claimType: string
  price: number
  unit: "hour" | "each" | "km"
  gstCode: string
  reference: string
  status: BillableStatus
}

export interface NdisPricingCatalogue {
  version: string
  effectiveFrom: string
  source: string
  sourceNote: string
  itemCount: number
  categories: Record<string, string>
  items: NdisChargeItem[]
}

export const ndisPricingCatalogue = catalogueData as NdisPricingCatalogue

export const ndisCharges: NdisChargeItem[] = ndisPricingCatalogue.items

export const ndisChargeCategories = ndisPricingCatalogue.categories

export const claimTypes = [
  { value: "direct-service", label: "Direct Service" },
  { value: "non-face-to-face", label: "Non-Face-to-Face" },
  { value: "provider-travel", label: "Provider Travel" },
  { value: "telehealth", label: "Telehealth Supports" },
  { value: "irregular-sil", label: "Irregular SIL Support" },
  { value: "cancellation", label: "Short Notice Cancellation" },
  { value: "ndia-required-report", label: "NDIA Requested Report" },
] as const

export const gstCodes = [
  { value: "P1", label: "P1: GST on Income" },
  { value: "P2", label: "P2: GST Free Income" },
  { value: "P5", label: "P5: GST out of Scope" },
] as const

export type LegacyChargeCategory = "support-coordination" | "travel"

export const chargeCategories: Record<LegacyChargeCategory, string> = {
  "support-coordination": "Support Coordination",
  travel: "Provider Travel",
}

export const serviceChargeTypes = [
  { value: "direct-service", label: "Direct Service" },
  { value: "non-face-to-face", label: "Non-Face-to-Face" },
  { value: "provider-travel", label: "Provider Travel" },
  { value: "telehealth", label: "Telehealth Supports" },
  { value: "irregular-sil", label: "Irregular SIL Support" },
  { value: "cancellation", label: "Short Notice Cancellation" },
  { value: "ndia-required-report", label: "NDIA Requested Report" },
] as const

export type ServiceChargeType = (typeof serviceChargeTypes)[number]["value"]

export function getNdisChargeByItemNumber(itemNumber: string): NdisChargeItem | undefined {
  return ndisCharges.find((item) => item.itemNumber === itemNumber)
}

export function getLegacyChargeCategory(item: NdisChargeItem): LegacyChargeCategory {
  if (
    item.unit === "km"
    || item.itemNumber.includes("_799_")
    || item.name.toLowerCase().includes("travel")
    || item.name.toLowerCase().includes("transport")
  ) {
    return "travel"
  }

  return "support-coordination"
}

export function formatChargeUnitLabel(unit: string): string {
  if (unit === "hour") return "Hour"
  if (unit === "km") return "Km"
  if (unit === "day") return "Day"
  if (unit === "week") return "Week"
  if (unit === "month") return "Month"
  if (unit === "year") return "Year"
  return "Each"
}

export function formatChargeUnitSuffix(unit: string): string {
  if (unit === "hour") return "hr"
  if (unit === "km") return "km"
  if (unit === "day") return "day"
  if (unit === "week") return "wk"
  if (unit === "month") return "mo"
  if (unit === "year") return "yr"
  return "ea"
}

export function formatChargePriceLabel(item: Pick<NdisChargeItem, "price" | "unit" | "quoteRequired">): string {
  if (item.quoteRequired && item.price <= 0) return "Quote required"
  return `$${item.price.toFixed(2)}/${formatChargeUnitSuffix(item.unit)}`
}

export function searchNdisCharges(
  query: string,
  options?: {
    category?: string
    excludeItemNumbers?: string[]
    limit?: number
  }
): NdisChargeItem[] {
  const normalizedQuery = query.trim().toLowerCase()
  const exclude = new Set(options?.excludeItemNumbers ?? [])
  const limit = options?.limit ?? (normalizedQuery ? 80 : 40)

  return ndisCharges
    .filter((item) => {
      if (exclude.has(item.itemNumber)) return false
      if (options?.category && item.category !== options.category) return false
      if (!normalizedQuery) return true

      return (
        item.name.toLowerCase().includes(normalizedQuery)
        || item.shortName.toLowerCase().includes(normalizedQuery)
        || item.itemNumber.toLowerCase().includes(normalizedQuery)
        || item.registrationGroup.toLowerCase().includes(normalizedQuery)
        || item.supportCategory.toLowerCase().includes(normalizedQuery)
      )
    })
    .slice(0, limit)
}

export function normalizeBillingUnit(unit: ChargeUnit): "hour" | "each" | "km" {
  if (unit === "hour" || unit === "km") return unit
  return "each"
}

export function isPerItemChargeUnit(unit: ChargeUnit | undefined): boolean {
  return unit !== "hour"
}

export function normalizeChargeItem(item: ChargeItem): ChargeItem {
  return {
    ...item,
    status: item.status === "inactive" ? "inactive" : "active",
  }
}

export function chargeItemFromNdis(item: NdisChargeItem): Omit<ChargeItem, "id"> {
  return {
    name: item.name,
    itemNumber: item.itemNumber,
    claimType: "direct-service",
    price: item.price,
    unit: normalizeBillingUnit(item.unit),
    gstCode: "P2",
    reference: item.shortName,
    status: "active",
  }
}
