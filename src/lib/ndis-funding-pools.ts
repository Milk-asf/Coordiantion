/** NDIS plan funding components and release cadence (PACE / Section 33 aligned). */

export type NdisFundingComponent = "core" | "capacity-building" | "capital"

export type FundingReleaseCadence = "monthly" | "quarterly" | "semi-annual" | "annual" | "upfront"

export interface NdisFundingComponentOption {
  id: NdisFundingComponent
  label: string
  description: string
}

export interface NdisFundingPool {
  id: string
  label: string
  component: NdisFundingComponent
  componentLabel: string
  /** NDIS support category numbers covered by this pool */
  supportCategoryNumbers: number[]
  description: string
}

export const NDIS_FUNDING_COMPONENT_LABELS: Record<NdisFundingComponent, string> = {
  core: "Core Supports",
  "capacity-building": "Capacity Building",
  capital: "Capital Supports",
}

export const NDIS_FUNDING_COMPONENTS: NdisFundingComponentOption[] = [
  {
    id: "core",
    label: NDIS_FUNDING_COMPONENT_LABELS.core,
    description: "Everyday supports, transport, consumables, and community participation",
  },
  {
    id: "capacity-building",
    label: NDIS_FUNDING_COMPONENT_LABELS["capacity-building"],
    description: "Therapy, support coordination, employment, and skill building",
  },
  {
    id: "capital",
    label: NDIS_FUNDING_COMPONENT_LABELS.capital,
    description: "Assistive technology, equipment, and home modifications",
  },
]

export const FUNDING_RELEASE_CADENCE_OPTIONS: Array<{
  value: FundingReleaseCadence
  label: string
  periodsPerYear: number
  description: string
}> = [
  {
    value: "monthly",
    label: "Monthly",
    periodsPerYear: 12,
    description: "12 releases per year — common for SIL and high-cost ongoing supports",
  },
  {
    value: "quarterly",
    label: "Quarterly",
    periodsPerYear: 4,
    description: "4 releases per year — default for most PACE plans from May 2025",
  },
  {
    value: "semi-annual",
    label: "Semi-annual",
    periodsPerYear: 2,
    description: "2 releases per year",
  },
  {
    value: "annual",
    label: "Annual",
    periodsPerYear: 1,
    description: "1 release per year — full component available for the period",
  },
  {
    value: "upfront",
    label: "Up front",
    periodsPerYear: 1,
    description: "Full amount released at plan start — typical for assistive technology",
  },
]

/** Legacy granular pools — used only to migrate existing budgets. */
const LEGACY_NDIS_FUNDING_POOLS: NdisFundingPool[] = [
  { id: "core-daily-life", label: "Assistance with Daily Life", component: "core", componentLabel: NDIS_FUNDING_COMPONENT_LABELS.core, supportCategoryNumbers: [1], description: "" },
  { id: "core-transport", label: "Transport", component: "core", componentLabel: NDIS_FUNDING_COMPONENT_LABELS.core, supportCategoryNumbers: [2], description: "" },
  { id: "core-consumables", label: "Consumables", component: "core", componentLabel: NDIS_FUNDING_COMPONENT_LABELS.core, supportCategoryNumbers: [3], description: "" },
  { id: "core-social", label: "Social & Community Participation", component: "core", componentLabel: NDIS_FUNDING_COMPONENT_LABELS.core, supportCategoryNumbers: [4], description: "" },
  { id: "capacity-support-coordination", label: "Support Coordination", component: "capacity-building", componentLabel: NDIS_FUNDING_COMPONENT_LABELS["capacity-building"], supportCategoryNumbers: [7], description: "" },
  { id: "capacity-daily-living", label: "Improved Daily Living", component: "capacity-building", componentLabel: NDIS_FUNDING_COMPONENT_LABELS["capacity-building"], supportCategoryNumbers: [15], description: "" },
  { id: "capacity-employment", label: "Finding & Keeping a Job", component: "capacity-building", componentLabel: NDIS_FUNDING_COMPONENT_LABELS["capacity-building"], supportCategoryNumbers: [10], description: "" },
  { id: "capacity-health", label: "Improved Health & Wellbeing", component: "capacity-building", componentLabel: NDIS_FUNDING_COMPONENT_LABELS["capacity-building"], supportCategoryNumbers: [12], description: "" },
  { id: "capacity-social", label: "Increased Social Participation", component: "capacity-building", componentLabel: NDIS_FUNDING_COMPONENT_LABELS["capacity-building"], supportCategoryNumbers: [9], description: "" },
  { id: "capital-at", label: "Assistive Technology", component: "capital", componentLabel: NDIS_FUNDING_COMPONENT_LABELS.capital, supportCategoryNumbers: [5], description: "" },
  { id: "capital-home", label: "Home Modifications & Living", component: "capital", componentLabel: NDIS_FUNDING_COMPONENT_LABELS.capital, supportCategoryNumbers: [6, 19], description: "" },
]

/** @deprecated Use NDIS_FUNDING_COMPONENTS — kept for legacy budget migration */
export const NDIS_FUNDING_POOLS = LEGACY_NDIS_FUNDING_POOLS

const CORE_SUPPORT_CATEGORIES = new Set([1, 2, 3, 4])
const CAPACITY_SUPPORT_CATEGORIES = new Set([7, 8, 9, 10, 11, 12, 14, 15])
const CAPITAL_SUPPORT_CATEGORIES = new Set([5, 6, 17, 18, 19, 20, 21])

export function mapSupportCategoryToComponent(supportCategoryNumber: number): NdisFundingComponent | null {
  if (CORE_SUPPORT_CATEGORIES.has(supportCategoryNumber)) return "core"
  if (CAPACITY_SUPPORT_CATEGORIES.has(supportCategoryNumber)) return "capacity-building"
  if (CAPITAL_SUPPORT_CATEGORIES.has(supportCategoryNumber)) return "capital"
  return null
}

export function getFundingComponentById(componentId: string): NdisFundingComponentOption | undefined {
  return NDIS_FUNDING_COMPONENTS.find((c) => c.id === componentId)
}

export function getFundingPoolById(poolId: string) {
  return LEGACY_NDIS_FUNDING_POOLS.find((pool) => pool.id === poolId)
}

export function getFundingPoolForCategory(supportCategoryNumber: number) {
  return LEGACY_NDIS_FUNDING_POOLS.find((pool) =>
    pool.supportCategoryNumbers.includes(supportCategoryNumber)
  )
}

export function resolveBudgetFundingComponent(budget: {
  fundingComponent?: NdisFundingComponent
  fundingPoolId?: string
  supportCategoryNumber?: number
}): NdisFundingComponent | null {
  if (budget.fundingComponent) return budget.fundingComponent
  if (budget.fundingPoolId) {
    const pool = getFundingPoolById(budget.fundingPoolId)
    if (pool) return pool.component
  }
  if (budget.supportCategoryNumber != null) {
    return mapSupportCategoryToComponent(budget.supportCategoryNumber)
  }
  return null
}

export function getBudgetComponentLabel(budget: {
  fundingComponent?: NdisFundingComponent
  fundingPoolId?: string
  name?: string
}): string {
  const component = resolveBudgetFundingComponent(budget)
  if (component) return NDIS_FUNDING_COMPONENT_LABELS[component]
  const pool = budget.fundingPoolId ? getFundingPoolById(budget.fundingPoolId) : null
  return pool?.label || budget.name || "—"
}

export function getDefaultReleaseCadenceForComponent(component: NdisFundingComponent): FundingReleaseCadence {
  if (component === "capital") return "upfront"
  return "quarterly"
}

/** @deprecated Use getDefaultReleaseCadenceForComponent */
export function getDefaultReleaseCadenceForPool(poolId: string): FundingReleaseCadence {
  const pool = getFundingPoolById(poolId)
  if (!pool) return "quarterly"
  return getDefaultReleaseCadenceForComponent(pool.component)
}
