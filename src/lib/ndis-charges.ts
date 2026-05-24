export interface NdisChargeItem {
  itemNumber: string
  name: string
  shortName: string
  registrationGroup: string
  unit: "hour" | "each" | "km"
  price: number
  category: "support-coordination" | "travel"
}

export interface ChargeItem {
  id: string
  name: string
  itemNumber: string
  claimType: string
  price: number
  unit: "hour" | "each" | "km"
  gstCode: string
  reference: string
}

export const claimTypes = [
  { value: "direct-service", label: "Direct Service" },
  { value: "non-face-to-face", label: "Non-Face-to-Face" },
  { value: "provider-travel", label: "Provider Travel" },
  { value: "cancellation", label: "Short Notice Cancellation" },
  { value: "ndia-required-report", label: "NDIA Requested Report" },
] as const

export const gstCodes = [
  { value: "P1", label: "P1: GST on Income" },
  { value: "P2", label: "P2: GST Free Income" },
  { value: "P5", label: "P5: GST out of Scope" },
] as const

export const ndisCharges: NdisChargeItem[] = [
  {
    itemNumber: "07_001_0106_8_3",
    name: "Level 1: Support Connection",
    shortName: "SC Level 1",
    registrationGroup: "Support Coordination",
    unit: "hour",
    price: 80.06,
    category: "support-coordination",
  },
  {
    itemNumber: "07_002_0106_8_3",
    name: "Level 2: Coordination of Supports",
    shortName: "SC Level 2",
    registrationGroup: "Support Coordination",
    unit: "hour",
    price: 100.14,
    category: "support-coordination",
  },
  {
    itemNumber: "07_004_0132_8_3",
    name: "Level 3: Specialist Support Coordination",
    shortName: "SC Level 3",
    registrationGroup: "Support Coordination",
    unit: "hour",
    price: 190.54,
    category: "support-coordination",
  },
  {
    itemNumber: "07_799_0106_6_3",
    name: "Provider Travel — Non-Labour Costs",
    shortName: "Travel (Non-Labour)",
    registrationGroup: "Support Coordination",
    unit: "each",
    price: 1.0,
    category: "travel",
  },
  {
    itemNumber: "07_799_0132_8_3",
    name: "Provider Travel — Non-Labour Costs (Specialist SC)",
    shortName: "Travel (Specialist)",
    registrationGroup: "Support Coordination",
    unit: "each",
    price: 1.0,
    category: "travel",
  },
  {
    itemNumber: "07_799_0106_6_3_KM",
    name: "Provider Travel — Kilometres",
    shortName: "Travel (km)",
    registrationGroup: "Support Coordination",
    unit: "km",
    price: 0.99,
    category: "travel",
  },
]

export const chargeCategories: Record<NdisChargeItem["category"], string> = {
  "support-coordination": "Support Coordination",
  "travel": "Provider Travel",
}

export const serviceChargeTypes = [
  { value: "direct-service", label: "Direct Service" },
  { value: "non-face-to-face", label: "Non-Face-to-Face" },
  { value: "provider-travel", label: "Provider Travel" },
  { value: "cancellation", label: "Short Notice Cancellation" },
  { value: "ndia-required-report", label: "NDIA Requested Report" },
] as const

export type ServiceChargeType = (typeof serviceChargeTypes)[number]["value"]
