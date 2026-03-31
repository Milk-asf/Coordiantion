export interface NdisChargeItem {
  itemNumber: string
  name: string
  shortName: string
  registrationGroup: string
  unit: "hour" | "each"
  price: number
  category: "support-coordination" | "psychosocial-recovery" | "travel"
}

export const ndisCharges: NdisChargeItem[] = [
  {
    itemNumber: "07_001_0106_8_3",
    name: "Support Coordination Level 1: Support Connection",
    shortName: "SC-L1",
    registrationGroup: "Assistance In Coordinating Or Managing Life Stages, Transitions And Supports",
    unit: "hour",
    price: 80.06,
    category: "support-coordination",
  },
  {
    itemNumber: "07_002_0106_8_3",
    name: "Support Coordination Level 2: Coordination of Supports",
    shortName: "SC-L2",
    registrationGroup: "Assistance In Coordinating Or Managing Life Stages, Transitions And Supports",
    unit: "hour",
    price: 100.14,
    category: "support-coordination",
  },
  {
    itemNumber: "07_004_0132_8_3",
    name: "Support Coordination Level 3: Specialist Support Coordination",
    shortName: "SC-L3",
    registrationGroup: "Support Coordination",
    unit: "hour",
    price: 190.54,
    category: "support-coordination",
  },
  {
    itemNumber: "07_101_0106_6_3",
    name: "Psychosocial Recovery Coaching - Weekday Daytime",
    shortName: "PRC Weekday Day",
    registrationGroup: "Assistance In Coordinating Or Managing Life Stages, Transitions And Supports",
    unit: "hour",
    price: 105.43,
    category: "psychosocial-recovery",
  },
  {
    itemNumber: "07_102_0106_6_3",
    name: "Psychosocial Recovery Coaching - Weekday Evening",
    shortName: "PRC Weekday Evening",
    registrationGroup: "Assistance In Coordinating Or Managing Life Stages, Transitions And Supports",
    unit: "hour",
    price: 116.16,
    category: "psychosocial-recovery",
  },
  {
    itemNumber: "07_103_0106_6_3",
    name: "Psychosocial Recovery Coaching - Weekday Night",
    shortName: "PRC Weekday Night",
    registrationGroup: "Assistance In Coordinating Or Managing Life Stages, Transitions And Supports",
    unit: "hour",
    price: 118.31,
    category: "psychosocial-recovery",
  },
  {
    itemNumber: "07_104_0106_6_3",
    name: "Psychosocial Recovery Coaching - Saturday",
    shortName: "PRC Saturday",
    registrationGroup: "Assistance In Coordinating Or Managing Life Stages, Transitions And Supports",
    unit: "hour",
    price: 148.36,
    category: "psychosocial-recovery",
  },
  {
    itemNumber: "07_105_0106_6_3",
    name: "Psychosocial Recovery Coaching - Sunday",
    shortName: "PRC Sunday",
    registrationGroup: "Assistance In Coordinating Or Managing Life Stages, Transitions And Supports",
    unit: "hour",
    price: 191.29,
    category: "psychosocial-recovery",
  },
  {
    itemNumber: "07_106_0106_6_3",
    name: "Psychosocial Recovery Coaching - Public Holiday",
    shortName: "PRC Public Holiday",
    registrationGroup: "Assistance In Coordinating Or Managing Life Stages, Transitions And Supports",
    unit: "hour",
    price: 234.23,
    category: "psychosocial-recovery",
  },
  {
    itemNumber: "07_501_0106_6_3",
    name: "Activity Based Transport",
    shortName: "Activity Transport",
    registrationGroup: "Assistance In Coordinating Or Managing Life Stages, Transitions And Supports",
    unit: "each",
    price: 1.0,
    category: "travel",
  },
  {
    itemNumber: "07_799_0106_6_3",
    name: "Provider Travel - Non-labour Costs",
    shortName: "Travel (Non-labour)",
    registrationGroup: "Assistance In Coordinating Or Managing Life Stages, Transitions And Supports",
    unit: "each",
    price: 1.0,
    category: "travel",
  },
  {
    itemNumber: "07_799_0117_8_3",
    name: "Provider Travel - Non-labour Costs (Daily Living)",
    shortName: "Travel (Daily Living)",
    registrationGroup: "Development Of Daily Living And Life Skills",
    unit: "each",
    price: 1.0,
    category: "travel",
  },
  {
    itemNumber: "07_799_0132_8_3",
    name: "Provider Travel - Non-labour Costs (Support Coordination)",
    shortName: "Travel (SC)",
    registrationGroup: "Support Coordination",
    unit: "each",
    price: 1.0,
    category: "travel",
  },
]

export const chargeCategories: Record<NdisChargeItem["category"], string> = {
  "support-coordination": "Support Coordination",
  "psychosocial-recovery": "Psychosocial Recovery Coaching",
  "travel": "Travel & Transport",
}

export const serviceChargeTypes = [
  { value: "direct-service", label: "Direct Service" },
  { value: "cancellation", label: "Cancellation" },
  { value: "ndia-required-report", label: "NDIA Required Report" },
  { value: "provider-travel", label: "Provider Travel" },
  { value: "non-face-to-face", label: "Non-Face-to-Face Services" },
] as const

export type ServiceChargeType = (typeof serviceChargeTypes)[number]["value"]
