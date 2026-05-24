"use client"

import { ListFilter, Plus } from "lucide-react"
import type { NdisPlan } from "@/lib/types"

interface PlanTabProps {
  plans: NdisPlan[]
  onAddNew: () => void
  onEditPlan: (plan: NdisPlan) => void
}

export function PlanTab({ plans, onAddNew, onEditPlan }: PlanTabProps) {
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
              <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Plan period</th>
              <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Status</th>
              <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Services</th>
              <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Budget</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr>
                <td colSpan={4} className="h-[120px] text-center text-[13px] font-medium text-[#bbb]">No plans yet</td>
              </tr>
            ) : (
              [...plans].reverse().map((plan) => {
                const now = new Date()
                now.setHours(0, 0, 0, 0)
                const endDate = plan.endDate ? new Date(plan.endDate + "T00:00:00") : null
                const isExpired = endDate ? endDate < now : false
                const isActive = plan === plans[plans.length - 1] && !isExpired
                const startFmt = plan.startDate ? new Date(plan.startDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"
                const endFmt = plan.endDate ? new Date(plan.endDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"
                const services = plan.services || []
                const planTotal = services.reduce((sum, svc) => sum + svc.budget, 0)

                return (
                  <tr
                    key={plan.id}
                    onClick={() => onEditPlan(plan)}
                    className="cursor-pointer transition-colors hover:bg-[#f5f5f5]"
                  >
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{startFmt} – {endFmt}</td>
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">
                      <span className={`inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] px-[12px] text-[13px] font-medium ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {isActive ? "Active" : isExpired ? "Expired" : "Not active"}
                      </span>
                    </td>
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{services.length} {services.length === 1 ? "service" : "services"}</td>
                    <td className="h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{planTotal > 0 ? `$${planTotal.toLocaleString()}` : <span className="text-[#bbb]">—</span>}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
        <span className="text-[12px] font-medium text-[#999]">{plans.length} {plans.length === 1 ? "plan" : "plans"}</span>
      </div>
    </div>
  )
}
