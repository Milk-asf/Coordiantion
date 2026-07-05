"use client"

import { useMemo } from "react"
import { useAnalyticsSourceData } from "@/lib/analytics/use-source-data"
import { resolveEntityRecords } from "@/lib/analytics/definitions"
import { useDocuments } from "@/lib/documents-context"
import { useForms } from "@/lib/hooks/use-forms"
import { useClients } from "@/lib/hooks/use-clients"
import { useInvoices } from "@/lib/hooks/use-invoices"
import { useCharges } from "@/lib/hooks/use-charges"
import {
  RELEASE_CADENCE_LABELS,
  BUDGET_PERIOD_LABELS,
  getBudgetLineTotal,
  getBudgetRowMetrics,
  getSpendingPlanPeriodCost,
  getSpendingPlanCadenceCost,
} from "@/lib/budget-utils"
import { getBudgetComponentLabel } from "@/lib/ndis-funding-pools"
import type { Timesheet } from "@/lib/timesheets/types"
import type { BudgetListRecord, SpendingPlanListRecord } from "@/lib/lists/definitions"

export interface ListSourceData {
  records: Record<string, unknown[]>
  isLoading: boolean
}

function getPlanStatus(startDate?: string | null, endDate?: string | null): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null
  if (end && end < now) return "Expired"
  if (start && start > now) return "Upcoming"
  return "Active"
}

/**
 * Live records for every list data source. Reuses the analytics source hook for
 * the shared domains and adds documents, forms, and the participant-financial
 * sources (budgets + spending plans) flattened from client records.
 */
export function useListSourceData(): ListSourceData {
  const { data, isLoading } = useAnalyticsSourceData()
  const { documents } = useDocuments()
  const { forms } = useForms()
  const { clients } = useClients()
  const { invoices } = useInvoices()
  const { enabledCharges } = useCharges()

  const budgets = useMemo<BudgetListRecord[]>(() => {
    const rows: BudgetListRecord[] = []
    for (const client of clients.filter((c) => c.status !== "archived")) {
      const clientInvoices = invoices.filter(
        (inv) => inv.clientId === client.id || inv.clientName === client.name || inv.clientName === client.displayName,
      )
      for (const budget of client.participant.budgets || []) {
        const metrics = getBudgetRowMetrics(budget, clientInvoices, enabledCharges)
        rows.push({
          id: budget.id,
          clientId: client.id,
          clientName: client.displayName,
          name: budget.name,
          pool: getBudgetComponentLabel(budget),
          status: metrics.status.label,
          total: metrics.total,
          used: metrics.used,
          remaining: metrics.remaining,
          usagePct: metrics.usagePct,
          release: budget.releaseCadence ? RELEASE_CADENCE_LABELS[budget.releaseCadence] : "—",
          startDate: budget.startDate || null,
          endDate: budget.endDate || null,
          items: budget.lineItems.length,
          daysRemaining: metrics.daysRemaining,
        })
      }
    }
    return rows
  }, [clients, invoices, enabledCharges])

  const spendingPlans = useMemo<SpendingPlanListRecord[]>(() => {
    const rows: SpendingPlanListRecord[] = []
    for (const client of clients.filter((c) => c.status !== "archived")) {
      const clientBudgets = client.participant.budgets || []
      const plans = client.participant.spendingPlans || []
      for (const plan of plans) {
        const budget = plan.budgetId ? clientBudgets.find((b) => b.id === plan.budgetId) || null : null
        const budgetAllocated = budget ? getBudgetLineTotal(budget, enabledCharges) : 0
        const plannedForBudget = plans
          .filter((p) => p.budgetId === plan.budgetId)
          .reduce((sum, p) => sum + getSpendingPlanPeriodCost(p, enabledCharges), 0)
        rows.push({
          id: plan.id,
          clientId: client.id,
          clientName: client.displayName,
          name: plan.name,
          budgetName: budget?.name || "—",
          component: budget ? getBudgetComponentLabel(budget) : "—",
          service: plan.serviceName || plan.chargeItemNumber || "—",
          cadence: BUDGET_PERIOD_LABELS[plan.cadence],
          status: getPlanStatus(plan.startDate, plan.endDate),
          periodCost: getSpendingPlanCadenceCost(plan, enabledCharges),
          totalCost: getSpendingPlanPeriodCost(plan, enabledCharges),
          overBudget: budgetAllocated > 0 && plannedForBudget > budgetAllocated,
        })
      }
    }
    return rows
  }, [clients, enabledCharges])

  // Travel claims flattened from timesheets, joined to their parent timesheet.
  const travelClaims = useMemo(
    () =>
      ((data.timesheets as Timesheet[]) ?? []).flatMap((timesheet) =>
        (timesheet.travelClaims ?? []).map((claim) => ({ claim, timesheet })),
      ),
    [data.timesheets],
  )

  // Timesheet list fields come from the analytics entity, which now joins each
  // timesheet to its rostered shift — resolve through it so shapes match.
  const timesheetRecords = useMemo(() => resolveEntityRecords("timesheets", data), [data])

  return useMemo<ListSourceData>(
    () => ({
      records: {
        ...data,
        timesheets: timesheetRecords,
        documents,
        forms,
        budgets,
        "spending-plans": spendingPlans,
        "timesheets.travelClaims": travelClaims,
      },
      isLoading,
    }),
    [data, timesheetRecords, documents, forms, budgets, spendingPlans, travelClaims, isLoading],
  )
}
