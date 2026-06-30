"use client"

import { CalendarClock, ListFilter, Plus, CalendarDays } from "lucide-react"
import type { Budget, SpendingPlan } from "@/lib/types"
import { EmptyState } from "@/components/empty-state"
import { ProfileViewToggle } from "@/components/profile-view-toggle"
import { useProfileViewMode } from "@/lib/hooks/use-profile-view-mode"
import { BUDGET_PERIOD_LABELS, RELEASE_CADENCE_LABELS } from "@/lib/budget-utils"
import { getBudgetComponentLabel } from "@/lib/ndis-funding-pools"
import {
  TABLE_FULL,
  TABLE_PANEL_CELL,
  TABLE_PANEL_CELL_LAST,
  TABLE_PANEL_HEADER_STICKY,
  TABLE_PANEL_HEADER_STICKY_LAST,
  TABLE_PANEL_TEXT,
  TABLE_CELL_INNER,
  TABLE_CHIP,
  TABLE_PROFILE_CELL,
  TABLE_PROFILE_CELL_LAST,
  TABLE_TEXT_CELL,
} from "@/lib/table-styles"

interface SpendingPlanTabProps {
  spendingPlans: SpendingPlan[]
  budgets: Budget[]
  shiftCount: number
  shiftProjectedTotal: number
  onAddNew: () => void
  onEditPlan: (plan: SpendingPlan) => void
  getPlanPeriodCost: (plan: SpendingPlan) => number
  getPlanTotalCost: (plan: SpendingPlan) => number
}

function formatCurrency(value: number) {
  if (value <= 0) return "—"
  return `$${value.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatPeriod(startDate: string, endDate: string) {
  const startFmt = startDate
    ? new Date(`${startDate}T00:00:00`).toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—"
  const endFmt = endDate
    ? new Date(`${endDate}T00:00:00`).toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—"
  return `${startFmt} – ${endFmt}`
}

export function SpendingPlanTab({
  spendingPlans,
  budgets,
  shiftCount,
  shiftProjectedTotal,
  onAddNew,
  onEditPlan,
  getPlanPeriodCost,
  getPlanTotalCost,
}: SpendingPlanTabProps) {
  const { viewMode, setViewMode } = useProfileViewMode()
  const hasShiftProjection = shiftCount > 0

  const getBudgetName = (budgetId?: string) => {
    if (!budgetId) return "—"
    return budgets.find((b) => b.id === budgetId)?.name || "—"
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-folk-border bg-white px-[16px]">
        <button
          type="button"
          className="flex items-center gap-[6px] folk-pill-btn border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
          tabIndex={0}
        >
          <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>Filter</span>
        </button>
        <div className="flex shrink-0 items-center gap-[8px]">
          {spendingPlans.length > 0 && (
            <ProfileViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          )}
          <button
            type="button"
            onClick={onAddNew}
            className="primary-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
            tabIndex={0}
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Add new</span>
          </button>
        </div>
      </div>

      {hasShiftProjection && (
        <div className="shrink-0 border-b border-folk-border bg-white px-[16px] py-[14px]">
          <div className="rounded-none border border-[#d9d9d9] bg-folk-surface p-[14px] sm:max-w-[320px]">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-folk-secondary">Scheduled shifts</span>
              <CalendarDays className="h-[14px] w-[14px] text-folk-placeholder" strokeWidth={1.5} />
            </div>
            <p className="mt-[10px] text-[18px] font-semibold text-folk-text">
              {formatCurrency(shiftProjectedTotal)}
            </p>
            <p className="mt-[4px] text-[12px] text-folk-secondary">
              Projected from {shiftCount} upcoming {shiftCount === 1 ? "shift" : "shifts"}
            </p>
          </div>
        </div>
      )}

      {spendingPlans.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No spending plans yet"
          description="Plan expected NDIS spending by service, quantity, and cadence. Compare against scheduled shifts and current invoice rates."
          action={{ label: "Add spending plan", onClick: onAddNew }}
          className="flex-1"
        />
      ) : viewMode === "card" ? (
        <>
          <div className="flex-1 overflow-auto p-[16px]">
            <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...spendingPlans].reverse().map((plan) => {
                const periodCost = getPlanPeriodCost(plan)
                const totalCost = getPlanTotalCost(plan)

                return (
                  <div
                    key={plan.id}
                    role="button"
                    onClick={() => onEditPlan(plan)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onEditPlan(plan)
                      }
                    }}
                    className="group flex cursor-pointer flex-col rounded-none border border-[#d9d9d9] bg-folk-surface p-[20px] text-left transition-all hover:border-folk-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                    tabIndex={0}
                  >
                    <CalendarClock className="h-[20px] w-[20px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                    <p className="mt-[12px] truncate text-[13px] font-semibold text-folk-text">{plan.name}</p>
                    <p className="mt-[4px] truncate text-[12px] text-folk-secondary">{plan.serviceName}</p>
                    <div className="mt-[16px] grid grid-cols-2 gap-[12px]">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-folk-secondary">Per period</p>
                        <p className="mt-[2px] text-[13px] font-semibold text-[#7c3aed]">
                          {formatCurrency(periodCost)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-folk-secondary">Plan total</p>
                        <p className="mt-[2px] text-[13px] font-semibold text-folk-text">
                          {formatCurrency(totalCost)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-[12px] text-[12px] text-folk-secondary">
                      {plan.quantity} {plan.unit} · {BUDGET_PERIOD_LABELS[plan.cadence].toLowerCase()}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-folk-secondary">
              {spendingPlans.length} {spendingPlans.length === 1 ? "plan" : "plans"}
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-auto">
            <table className={TABLE_FULL}>
              <thead>
                <tr>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Name</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Service</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Quantity</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Cadence</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Per period</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Plan total</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Budget</th>
                  <th className={TABLE_PANEL_HEADER_STICKY_LAST}>Period</th>
                </tr>
              </thead>
              <tbody>
                {[...spendingPlans].reverse().map((plan) => {
                  const periodCost = getPlanPeriodCost(plan)
                  const totalCost = getPlanTotalCost(plan)

                  return (
                    <tr
                      key={plan.id}
                      onClick={() => onEditPlan(plan)}
                      className="cursor-pointer transition-colors hover:bg-folk-hover"
                    >
                      <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                        <div className={TABLE_CELL_INNER}>{plan.name}</div>
                      </td>
                      <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                        <div className={TABLE_CELL_INNER}>{plan.serviceName}</div>
                      </td>
                      <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                        <div className={TABLE_CELL_INNER}>
                          {plan.quantity} {plan.unit}
                        </div>
                      </td>
                      <td className={TABLE_PROFILE_CELL}>
                        <div className={TABLE_CELL_INNER}>
                          <span className={TABLE_CHIP}>{BUDGET_PERIOD_LABELS[plan.cadence]}</span>
                        </div>
                      </td>
                      <td className={TABLE_PROFILE_CELL}>
                        <div className={TABLE_CELL_INNER}>
                          <span className={TABLE_CHIP}>{formatCurrency(periodCost)}</span>
                        </div>
                      </td>
                      <td className={TABLE_PROFILE_CELL}>
                        <div className={TABLE_CELL_INNER}>
                          {totalCost > 0 ? (
                            <span className={TABLE_CHIP}>{formatCurrency(totalCost)}</span>
                          ) : (
                            <span className={`${TABLE_TEXT_CELL} text-folk-placeholder`}>—</span>
                          )}
                        </div>
                      </td>
                      <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                        <div className={TABLE_CELL_INNER}>{getBudgetName(plan.budgetId)}</div>
                      </td>
                      <td className={`${TABLE_PROFILE_CELL_LAST} ${TABLE_TEXT_CELL}`}>
                        <div className={TABLE_CELL_INNER}>
                          {formatPeriod(plan.startDate, plan.endDate)}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-folk-secondary">
              {spendingPlans.length} {spendingPlans.length === 1 ? "plan" : "plans"}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
