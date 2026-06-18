"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useClients } from "@/lib/hooks/use-clients"
import { useCharges } from "@/lib/hooks/use-charges"
import {
  BUDGET_PERIOD_LABELS,
  getBudgetLineTotal,
  getBudgetStatus,
  getSpendingPlanCadenceCost,
  getSpendingPlanPeriodCost,
} from "@/lib/budget-utils"
import {
  getBudgetComponentLabel,
  NDIS_FUNDING_COMPONENT_LABELS,
  resolveBudgetFundingComponent,
} from "@/lib/ndis-funding-pools"
import { EntityIcon } from "@/components/entity-icon"
import { EmptyState } from "@/components/empty-state"
import { PageLoader, PageError } from "@/components/page-state"
import { ProfileViewToggle } from "@/components/profile-view-toggle"
import { useProfileViewMode } from "@/lib/hooks/use-profile-view-mode"
import type { Budget, SpendingPlan } from "@/lib/types"
import {
  CalendarClock,
  ListFilter,
  SlidersHorizontal,
  X,
  ChevronDown,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react"
import {
  TABLE_CELL_INNER,
  TABLE_CHIP,
  TABLE_FULL,
  TABLE_PANEL_HEADER_STICKY,
  TABLE_PANEL_HEADER_STICKY_LAST,
  TABLE_PROFILE_CELL,
  TABLE_PROFILE_CELL_LAST,
  TABLE_TEXT_CELL,
} from "@/lib/table-styles"

interface PlannedSpendingRow {
  clientId: string
  clientName: string
  clientIcon: string
  plan: SpendingPlan
  budget: Budget | null
  componentLabel: string
  periodCost: number
  totalCost: number
  budgetAllocated: number
  status: { label: string; color: string }
  overBudget: boolean
}

function formatCurrency(value: number) {
  if (value <= 0) return "—"
  return `$${value.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function getPlanStatus(plan: SpendingPlan): { label: string; color: string } {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const start = plan.startDate ? new Date(`${plan.startDate}T00:00:00`) : null
  const end = plan.endDate ? new Date(`${plan.endDate}T00:00:00`) : null
  if (end && end < now) return { label: "Expired", color: "bg-red-50 text-red-600" }
  if (start && start > now) return { label: "Upcoming", color: "bg-blue-50 text-blue-600" }
  return { label: "Active", color: "bg-green-100 text-green-700" }
}

export default function PlannedSpendingPage() {
  const { clients, isLoading, fetchError, refetch } = useClients()
  const { enabledCharges } = useCharges()
  const { viewMode, setViewMode } = useProfileViewMode()
  const [componentFilter, setComponentFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [clientFilter, setClientFilter] = useState<string[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const rows: PlannedSpendingRow[] = useMemo(() => {
    const result: PlannedSpendingRow[] = []
    for (const client of clients.filter((c) => c.status !== "archived")) {
      const budgets = client.participant.budgets || []
      const plans = client.participant.spendingPlans || []
      for (const plan of plans) {
        const budget = plan.budgetId ? budgets.find((b) => b.id === plan.budgetId) || null : null
        const periodCost = getSpendingPlanCadenceCost(plan, enabledCharges)
        const totalCost = getSpendingPlanPeriodCost(plan, enabledCharges)
        const budgetAllocated = budget ? getBudgetLineTotal(budget, enabledCharges) : 0
        const linkedPlans = plans.filter((p) => p.budgetId === plan.budgetId)
        const plannedForBudget = linkedPlans.reduce(
          (sum, p) => sum + getSpendingPlanPeriodCost(p, enabledCharges),
          0
        )
        result.push({
          clientId: client.id,
          clientName: client.displayName,
          clientIcon: client.iconText,
          plan,
          budget,
          componentLabel: budget ? getBudgetComponentLabel(budget) : "—",
          periodCost,
          totalCost,
          budgetAllocated,
          status: getPlanStatus(plan),
          overBudget: budgetAllocated > 0 && plannedForBudget > budgetAllocated,
        })
      }
    }
    return result.sort((a, b) => a.clientName.localeCompare(b.clientName) || a.plan.name.localeCompare(b.plan.name))
  }, [clients, enabledCharges])

  const displayRows = useMemo(() => {
    return rows.filter((row) => {
      if (componentFilter.length > 0) {
        const component = row.budget ? resolveBudgetFundingComponent(row.budget) : null
        if (!component || !componentFilter.includes(component)) return false
      }
      if (statusFilter.length > 0 && !statusFilter.includes(row.status.label)) return false
      if (clientFilter.length > 0 && !clientFilter.includes(row.clientName)) return false
      return true
    })
  }, [rows, componentFilter, statusFilter, clientFilter])

  const summary = useMemo(() => {
    const totalPlanned = displayRows.reduce((sum, row) => sum + row.totalCost, 0)
    const overBudgetCount = new Set(
      displayRows.filter((row) => row.overBudget && row.budget?.id).map((row) => row.budget!.id)
    ).size
    const participants = new Set(displayRows.map((row) => row.clientId)).size
    return { totalPlanned, planCount: displayRows.length, overBudgetCount, participants }
  }, [displayRows])

  const uniqueClients = useMemo(
    () => [...new Set(rows.map((row) => row.clientName))].sort(),
    [rows]
  )

  if (isLoading) return <PageLoader label="Loading planned spending…" />
  if (fetchError) return <PageError message={fetchError} onRetry={refetch} />

  return (
    <div className="flex h-full flex-col bg-folk-surface">
      <div className="flex h-[52px] shrink-0 items-center border-b border-folk-border bg-folk-nav px-[20px]">
        <h1 className="text-[15px] font-semibold text-folk-text">Planned Spending</h1>
        <span className="ml-[10px] text-[13px] font-medium text-folk-secondary">
          {displayRows.length} {displayRows.length === 1 ? "plan" : "plans"}
        </span>
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-[12px] border-b border-folk-border bg-folk-nav px-[20px] py-[16px] sm:grid-cols-4">
        <div className="rounded-none border border-[#e8e8e8] px-[16px] py-[12px]">
          <p className="text-[12px] font-medium text-folk-secondary">Total planned spend</p>
          <p className="mt-[6px] text-[20px] font-semibold text-[#7c3aed]">{formatCurrency(summary.totalPlanned)}</p>
        </div>
        <div className="rounded-none border border-[#e8e8e8] px-[16px] py-[12px]">
          <p className="text-[12px] font-medium text-folk-secondary">Spending plans</p>
          <p className="mt-[6px] text-[20px] font-semibold text-folk-text">{summary.planCount}</p>
        </div>
        <div className="rounded-none border border-[#e8e8e8] px-[16px] py-[12px]">
          <p className="text-[12px] font-medium text-folk-secondary">Participants</p>
          <p className="mt-[6px] text-[20px] font-semibold text-folk-text">{summary.participants}</p>
        </div>
        <div className="rounded-none border border-[#e8e8e8] px-[16px] py-[12px]">
          <p className="text-[12px] font-medium text-folk-secondary">Over-allocated budgets</p>
          <p className={`mt-[6px] text-[20px] font-semibold ${summary.overBudgetCount > 0 ? "text-amber-600" : "text-folk-text"}`}>
            {summary.overBudgetCount}
          </p>
        </div>
      </div>

      <div className="flex h-[44px] shrink-0 items-center justify-between gap-[8px] border-b border-folk-border bg-folk-nav px-[20px]">
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-[5px] rounded-none border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
            tabIndex={0}
          >
            <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Filter</span>
            {(componentFilter.length + statusFilter.length + clientFilter.length) > 0 && (
              <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#1a1a1a] px-[4px] text-[10px] font-semibold text-white">
                {componentFilter.length + statusFilter.length + clientFilter.length}
              </span>
            )}
          </button>
          {isFilterOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
              <div className="absolute left-0 top-full z-50 mt-[4px] w-[260px] rounded-none border border-folk-border bg-folk-surface py-[8px] shadow-folk">
                <p className="px-[12px] pb-[4px] text-[11px] font-semibold uppercase tracking-wide text-folk-secondary">Component</p>
                {Object.entries(NDIS_FUNDING_COMPONENT_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setComponentFilter((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])}
                    className="flex w-full px-[12px] py-[6px] text-left text-[13px] font-medium text-folk-text hover:bg-folk-hover"
                  >
                    {componentFilter.includes(key) ? "✓ " : ""}{label}
                  </button>
                ))}
                <p className="mt-[8px] px-[12px] pb-[4px] text-[11px] font-semibold uppercase tracking-wide text-folk-secondary">Status</p>
                {["Active", "Upcoming", "Expired"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status])}
                    className="flex w-full px-[12px] py-[6px] text-left text-[13px] font-medium text-folk-text hover:bg-folk-hover"
                  >
                    {statusFilter.includes(status) ? "✓ " : ""}{status}
                  </button>
                ))}
                {(componentFilter.length + statusFilter.length + clientFilter.length) > 0 && (
                  <button
                    type="button"
                    onClick={() => { setComponentFilter([]); setStatusFilter([]); setClientFilter([]) }}
                    className="mt-[8px] flex w-full items-center gap-[6px] px-[12px] py-[6px] text-[13px] font-medium text-folk-secondary hover:bg-folk-hover"
                  >
                    <X className="h-[12px] w-[12px]" /> Clear filters
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        {displayRows.length > 0 && (
          <ProfileViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        )}
      </div>

      {displayRows.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No spending plans yet"
          description="Spending plans created on participant profiles will appear here."
          className="flex-1"
        />
      ) : viewMode === "card" ? (
        <div className="flex-1 overflow-auto p-[16px]">
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
            {displayRows.map((row) => (
              <Link
                key={row.plan.id}
                href={`/clients/${row.clientId}?tab=spending-plan`}
                className="rounded-none border border-[#e2e2e2] bg-folk-surface p-[16px] transition-all hover:border-folk-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-center gap-[8px]">
                  <EntityIcon text={row.clientIcon} size="sm" />
                  <span className="truncate text-[13px] font-semibold text-folk-text">{row.clientName}</span>
                </div>
                <p className="mt-[10px] truncate text-[13px] font-medium text-folk-text">{row.plan.name}</p>
                <p className="mt-[4px] text-[12px] text-folk-secondary">{row.componentLabel}</p>
                <div className="mt-[12px] flex items-center justify-between">
                  <span className="text-[12px] text-folk-secondary">{formatCurrency(row.periodCost)}/{BUDGET_PERIOD_LABELS[row.plan.cadence].toLowerCase()}</span>
                  <span className="text-[13px] font-semibold text-[#7c3aed]">{formatCurrency(row.totalCost)}</span>
                </div>
                {row.overBudget && (
                  <p className="mt-[8px] flex items-center gap-[4px] text-[11px] font-medium text-amber-700">
                    <AlertTriangle className="h-[12px] w-[12px]" /> Exceeds budget allocation
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className={TABLE_FULL}>
            <thead>
              <tr>
                <th className={TABLE_PANEL_HEADER_STICKY}>Participant</th>
                <th className={TABLE_PANEL_HEADER_STICKY}>Plan</th>
                <th className={TABLE_PANEL_HEADER_STICKY}>Budget / component</th>
                <th className={TABLE_PANEL_HEADER_STICKY}>Service</th>
                <th className={TABLE_PANEL_HEADER_STICKY}>Cadence</th>
                <th className={TABLE_PANEL_HEADER_STICKY}>Period cost</th>
                <th className={TABLE_PANEL_HEADER_STICKY}>Total cost</th>
                <th className={TABLE_PANEL_HEADER_STICKY_LAST}>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => (
                <tr key={row.plan.id} className="transition-colors hover:bg-folk-hover">
                  <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                    <Link href={`/clients/${row.clientId}?tab=spending-plan`} className={`${TABLE_CELL_INNER} flex items-center gap-[8px]`}>
                      <EntityIcon text={row.clientIcon} size="sm" />
                      <span>{row.clientName}</span>
                      <ArrowUpRight className="h-[12px] w-[12px] text-[#ccc]" />
                    </Link>
                  </td>
                  <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                    <div className={TABLE_CELL_INNER}>{row.plan.name}</div>
                  </td>
                  <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                    <div className={TABLE_CELL_INNER}>
                      {row.budget?.name || "—"}
                      <span className="ml-[6px] text-folk-secondary">· {row.componentLabel}</span>
                    </div>
                  </td>
                  <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                    <div className={TABLE_CELL_INNER}>{row.plan.serviceName || row.plan.chargeItemNumber}</div>
                  </td>
                  <td className={TABLE_PROFILE_CELL}>
                    <div className={TABLE_CELL_INNER}>
                      <span className={TABLE_CHIP}>{BUDGET_PERIOD_LABELS[row.plan.cadence]}</span>
                    </div>
                  </td>
                  <td className={TABLE_PROFILE_CELL}>
                    <div className={TABLE_CELL_INNER}>
                      <span className={TABLE_CHIP}>{formatCurrency(row.periodCost)}</span>
                    </div>
                  </td>
                  <td className={TABLE_PROFILE_CELL}>
                    <div className={TABLE_CELL_INNER}>
                      <span className={TABLE_CHIP}>{formatCurrency(row.totalCost)}</span>
                      {row.overBudget && (
                        <AlertTriangle className="ml-[6px] inline h-[12px] w-[12px] text-amber-600" aria-label="Over budget allocation" />
                      )}
                    </div>
                  </td>
                  <td className={`${TABLE_PROFILE_CELL_LAST} ${TABLE_TEXT_CELL}`}>
                    <div className={TABLE_CELL_INNER}>
                      <span className={`inline-flex h-[20px] items-center rounded-none px-[6px] text-[10px] font-medium ${row.status.color}`}>
                        {row.status.label}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
