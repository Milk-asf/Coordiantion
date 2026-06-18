"use client"

import { ListFilter, Plus, DollarSign } from "lucide-react"
import type { Budget } from "@/lib/types"
import type { BudgetRowMetrics } from "@/lib/budget-utils"
import { RELEASE_CADENCE_LABELS } from "@/lib/budget-utils"
import { getBudgetComponentLabel } from "@/lib/ndis-funding-pools"
import { EmptyState } from "@/components/empty-state"
import { ProfileViewToggle } from "@/components/profile-view-toggle"
import { useProfileViewMode } from "@/lib/hooks/use-profile-view-mode"
import { UsageBar } from "@/components/usage-bar"
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

interface BudgetsTabProps {
  budgets: Budget[]
  onAddNew: () => void
  onEditBudget: (budget: Budget) => void
  getBudgetMetrics: (budget: Budget) => BudgetRowMetrics
}

function formatPeriod(startDate: string, endDate: string) {
  const startFmt = startDate
    ? new Date(`${startDate}T00:00:00`).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—"
  const endFmt = endDate
    ? new Date(`${endDate}T00:00:00`).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—"
  return `${startFmt} – ${endFmt}`
}

function formatCurrency(value: number) {
  if (value <= 0) return "—"
  return `$${value.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatShortDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function BudgetsTab({ budgets, onAddNew, onEditBudget, getBudgetMetrics }: BudgetsTabProps) {
  const { viewMode, setViewMode } = useProfileViewMode()

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-folk-border bg-folk-nav px-[16px]">
        <button
          className="flex items-center gap-[6px] rounded-none border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
          tabIndex={0}
        >
          <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>Filter</span>
        </button>
        <div className="flex shrink-0 items-center gap-[8px]">
          {budgets.length > 0 && (
            <ProfileViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          )}
          <button
            onClick={onAddNew}
            className="outline-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
            tabIndex={0}
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Add new</span>
          </button>
        </div>
      </div>

      {budgets.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No budgets yet"
          description="Create NDIS funding pool budgets with release schedules to track allocated funding, planned spending, and invoice usage."
          action={{ label: "Add budget", onClick: onAddNew }}
          className="flex-1"
        />
      ) : viewMode === "card" ? (
        <>
          <div className="flex-1 overflow-auto p-[16px]">
            <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...budgets].reverse().map((budget) => {
                const metrics = getBudgetMetrics(budget)
                const componentLabel = getBudgetComponentLabel(budget)

                return (
                  <div
                    key={budget.id}
                    role="button"
                    onClick={() => onEditBudget(budget)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onEditBudget(budget)
                      }
                    }}
                    className="group flex cursor-pointer flex-col rounded-none border border-[#e2e2e2] bg-folk-surface p-[20px] text-left transition-all hover:border-folk-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                    tabIndex={0}
                  >
                    <DollarSign className="h-[20px] w-[20px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                    <p className="mt-[12px] truncate text-[13px] font-semibold text-folk-text">{budget.name}</p>
                    <p className="mt-[4px] truncate text-[12px] text-folk-secondary">
                      {componentLabel}
                    </p>
                    <div className="mt-[16px] grid grid-cols-2 gap-[12px]">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-folk-secondary">Total</p>
                        <p className="mt-[2px] text-[13px] font-semibold text-[#7c3aed]">
                          {formatCurrency(metrics.total)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-folk-secondary">Available this period</p>
                        <p className="mt-[2px] text-[13px] font-semibold text-folk-text">
                          {formatCurrency(metrics.availableNow ?? metrics.periodRemaining)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-[12px]">
                      <p className="mb-[4px] text-[11px] font-medium text-folk-secondary">Plan usage</p>
                      <UsageBar
                        percent={metrics.usagePct}
                        tooltip={`$${metrics.used.toLocaleString()} of $${metrics.total.toLocaleString()} used`}
                      />
                    </div>
                    {metrics.currentPeriod && (
                      <div className="mt-[10px]">
                        <p className="mb-[4px] text-[11px] font-medium text-folk-secondary">This release period</p>
                        <UsageBar
                          percent={metrics.periodUsagePct}
                          tooltip={`$${metrics.periodUsed.toLocaleString()} of $${metrics.currentPeriod.allocatedAmount.toLocaleString()} used this period`}
                        />
                      </div>
                    )}
                    {budget.releaseCadence && (
                      <p className="mt-[10px] text-[11px] text-folk-secondary">
                        {RELEASE_CADENCE_LABELS[budget.releaseCadence]} release
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-folk-secondary">
              {budgets.length} {budgets.length === 1 ? "budget" : "budgets"}
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
                  <th className={TABLE_PANEL_HEADER_STICKY}>Component</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Total</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Plan usage</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Period usage</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Available</th>
                  <th className={TABLE_PANEL_HEADER_STICKY_LAST}>Plan period</th>
                </tr>
              </thead>
              <tbody>
                {[...budgets].reverse().map((budget) => {
                  const metrics = getBudgetMetrics(budget)
                  const componentLabel = getBudgetComponentLabel(budget)
                  const currentPeriod = metrics.currentPeriod

                  return (
                    <tr
                      key={budget.id}
                      onClick={() => onEditBudget(budget)}
                      className="cursor-pointer transition-colors hover:bg-folk-hover"
                    >
                      <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                        <div className={TABLE_CELL_INNER}>
                          <span>{budget.name}</span>
                          {metrics.status && (
                            <span className={`ml-[8px] inline-flex h-[20px] items-center rounded-none px-[6px] text-[10px] font-medium ${metrics.status.color}`}>
                              {metrics.status.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                        <div className={TABLE_CELL_INNER}>
                          {componentLabel}
                        </div>
                      </td>
                      <td className={TABLE_PROFILE_CELL}>
                        <div className={TABLE_CELL_INNER}>
                          <span className={TABLE_CHIP}>{formatCurrency(metrics.total)}</span>
                        </div>
                      </td>
                      <td className={TABLE_PROFILE_CELL}>
                        <div className={TABLE_CELL_INNER}>
                          <UsageBar
                            percent={metrics.usagePct}
                            tooltip={`$${metrics.used.toLocaleString()} of $${metrics.total.toLocaleString()} used`}
                          />
                        </div>
                      </td>
                      <td className={TABLE_PROFILE_CELL}>
                        <div className={TABLE_CELL_INNER}>
                          {currentPeriod ? (
                            <UsageBar
                              percent={metrics.periodUsagePct}
                              tooltip={`$${metrics.periodUsed.toLocaleString()} of $${currentPeriod.allocatedAmount.toLocaleString()} this period`}
                            />
                          ) : (
                            <span className="text-folk-placeholder">—</span>
                          )}
                        </div>
                      </td>
                      <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                        <div className={TABLE_CELL_INNER}>
                          {formatCurrency(metrics.availableNow ?? metrics.periodRemaining)}
                        </div>
                      </td>
                      <td className={`${TABLE_PROFILE_CELL_LAST} ${TABLE_TEXT_CELL}`}>
                        <div className={TABLE_CELL_INNER}>
                          {formatPeriod(budget.startDate, budget.endDate)}
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
              {budgets.length} {budgets.length === 1 ? "budget" : "budgets"}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
