"use client"

import { ListFilter, Plus } from "lucide-react"
import type { Budget } from "@/lib/types"
import { UsageBar } from "@/components/usage-bar"

interface BudgetsTabProps {
  budgets: Budget[]
  onAddNew: () => void
  onEditBudget: (budget: Budget) => void
  getBudgetTotal: (budget: Budget) => number
  getBudgetUsed: (budget: Budget) => number
}

export function BudgetsTab({ budgets, onAddNew, onEditBudget, getBudgetTotal, getBudgetUsed }: BudgetsTabProps) {
  return (
    <div className="relative flex h-full flex-col">
      <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-[#dcdcdc] px-[16px]">
        <button
          className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
          tabIndex={0}
        >
          <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>Filter</span>
        </button>
        <button
          onClick={onAddNew}
          className="primary-btn flex items-center gap-[5px] rounded-[4px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
          tabIndex={0}
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>Add new</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Name</th>
              <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Total</th>
              <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Usage</th>
              <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Period</th>
              <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Items</th>
            </tr>
          </thead>
          <tbody>
            {budgets.length === 0 ? (
              <tr>
                <td colSpan={5} className="h-[120px] text-center text-[13px] font-medium text-[#bbb]">No budgets yet</td>
              </tr>
            ) : (
              [...budgets].reverse().map((budget) => {
                const startFmt = budget.startDate ? new Date(budget.startDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"
                const endFmt = budget.endDate ? new Date(budget.endDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"
                const total = getBudgetTotal(budget)
                const used = getBudgetUsed(budget)
                const usagePct = total > 0 ? (used / total) * 100 : 0
                const itemCount = budget.lineItems.length

                return (
                  <tr
                    key={budget.id}
                    onClick={() => onEditBudget(budget)}
                    className="cursor-pointer transition-colors hover:bg-[#f5f5f5]"
                  >
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{budget.name}</td>
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px]">{total > 0 ? <span className="inline-flex h-[24px] items-center rounded-[6px] bg-[#e8edf2] px-[12px] text-[12px] font-medium text-[#334155]">${total.toLocaleString()}</span> : <span className="text-[13px] font-medium text-[#bbb]">—</span>}</td>
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px]"><UsageBar percent={usagePct} /></td>
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{startFmt} – {endFmt}</td>
                    <td className="h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{itemCount} {itemCount === 1 ? "item" : "items"}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
        <span className="text-[12px] font-medium text-[#999]">{budgets.length} {budgets.length === 1 ? "budget" : "budgets"}</span>
      </div>
    </div>
  )
}
