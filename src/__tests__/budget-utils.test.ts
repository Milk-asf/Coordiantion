import { describe, expect, it, vi } from "vitest"
import type { Budget, Invoice, SpendingPlan } from "@/lib/types"
import {
  generateReleasePeriods,
  getBudgetUsedAmountInPeriod,
  getCurrentReleasePeriod,
  getReleaseScheduleWarning,
  getSpendingPlanAllocationWarnings,
  sumReleasePeriodAmounts,
  validateChargeItemForBudgetComponent,
} from "@/lib/budget-utils"

const mockBudget: Budget = {
  id: "budget-1",
  name: "Core Supports",
  startDate: "2025-01-01",
  endDate: "2025-12-31",
  fundingComponent: "core",
  allocatedAmount: 12000,
  releaseCadence: "quarterly",
  releasePeriods: [
    { id: "p1", periodNumber: 1, startDate: "2025-01-01", endDate: "2025-03-31", allocatedAmount: 3000 },
    { id: "p2", periodNumber: 2, startDate: "2025-04-01", endDate: "2025-06-30", allocatedAmount: 3000 },
    { id: "p3", periodNumber: 3, startDate: "2025-07-01", endDate: "2025-09-30", allocatedAmount: 3000 },
    { id: "p4", periodNumber: 4, startDate: "2025-10-01", endDate: "2025-12-31", allocatedAmount: 3000 },
  ],
  chargeItems: ["01_011_0107_1_1"],
  lineItems: [],
  createdAt: "2025-01-01T00:00:00.000Z",
}

describe("generateReleasePeriods", () => {
  it("splits total evenly across quarterly periods", () => {
    const periods = generateReleasePeriods("2025-01-01", "2025-12-31", "quarterly", 12000)
    expect(periods).toHaveLength(4)
    expect(sumReleasePeriodAmounts(periods)).toBe(12000)
  })

  it("supports manual override amounts via persisted periods", () => {
    const generated = generateReleasePeriods("2025-01-01", "2025-12-31", "quarterly", 12000)
    const overridden = generated.map((period, index) =>
      index === 0 ? { ...period, allocatedAmount: 5000 } : period
    )
    expect(overridden[0].allocatedAmount).toBe(5000)
    expect(getReleaseScheduleWarning(12000, overridden)).toContain("Release periods total")
  })
})

describe("getCurrentReleasePeriod", () => {
  it("returns the active period for a date within range", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-05-15T12:00:00"))
    const current = getCurrentReleasePeriod(mockBudget)
    expect(current?.periodNumber).toBe(2)
    vi.useRealTimers()
  })
})

describe("getBudgetUsedAmountInPeriod", () => {
  it("filters invoice line items to the release period date range", () => {
    const invoices: Invoice[] = [
      {
        id: "inv-1",
        invoiceNumber: "INV-001",
        clientId: "client-1",
        clientName: "Test Client",
        status: "sent",
        issueDate: "2025-05-10",
        dueDate: "2025-05-10",
        taskIds: [],
        lineItems: [
          {
            id: "li-1",
            description: "Support",
            chargeItemNumber: "01_011_0107_1_1",
            chargeName: "Support",
            quantity: 1,
            unit: "hour",
            rate: 100,
            amount: 100,
            serviceDate: "2025-05-10",
            gstCode: "P2",
            gstAmount: 0,
          },
        ],
        subtotal: 100,
        gst: 0,
        total: 100,
        notes: "",
        createdBy: "Test",
        createdAt: "2025-05-10T00:00:00.000Z",
      },
      {
        id: "inv-2",
        invoiceNumber: "INV-002",
        clientId: "client-1",
        clientName: "Test Client",
        status: "sent",
        issueDate: "2025-01-10",
        dueDate: "2025-01-10",
        taskIds: [],
        lineItems: [
          {
            id: "li-2",
            description: "Support",
            chargeItemNumber: "01_011_0107_1_1",
            chargeName: "Support",
            quantity: 1,
            unit: "hour",
            rate: 200,
            amount: 200,
            serviceDate: "2025-01-10",
            gstCode: "P2",
            gstAmount: 0,
          },
        ],
        subtotal: 200,
        gst: 0,
        total: 200,
        notes: "",
        createdBy: "Test",
        createdAt: "2025-01-10T00:00:00.000Z",
      },
    ]

    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-05-15T12:00:00"))
    const current = getCurrentReleasePeriod(mockBudget)
    const used = getBudgetUsedAmountInPeriod(mockBudget, invoices, current)
    expect(used).toBe(100)
    vi.useRealTimers()
  })
})

describe("validateChargeItemForBudgetComponent", () => {
  it("blocks support coordination item on core budget", () => {
    const result = validateChargeItemForBudgetComponent(
      "07_001_0106_8_3",
      [],
      "core"
    )
    expect(result.valid).toBe(false)
    expect(result.message).toContain("capacity building")
  })
})

describe("getSpendingPlanAllocationWarnings", () => {
  it("warns when planned total exceeds budget allocation", () => {
    const plans: SpendingPlan[] = [
      {
        id: "plan-1",
        name: "Weekly SC",
        budgetId: "budget-1",
        chargeItemNumber: "07_001_0106_8_3",
        serviceName: "Support Coordination",
        quantity: 10,
        unit: "hour",
        cadence: "per-week",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        description: "",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ]

    const warnings = getSpendingPlanAllocationWarnings(
      mockBudget,
      plans,
      [{ itemNumber: "07_001_0106_8_3", name: "SC", shortName: "SC", price: 200, unit: "hour", supportCategoryNumber: 7, registrationGroup: "", registrationGroupNumber: "", supportCategory: "", category: "", quoteRequired: false }],
      []
    )
    expect(warnings.length).toBeGreaterThan(0)
  })
})
