"use client"

import { Wallet, Plus } from "lucide-react"

export default function BudgetsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#f0f0f0] bg-white px-[20px]">
        <h1 className="text-[14px] font-semibold text-[#262626]">Budgets</h1>
        <button
          className="flex items-center gap-[5px] rounded border border-[#dcdcdc] bg-white px-[10px] py-[5px] text-[14px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
          tabIndex={0}
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>Create budget</span>
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-[12px]">
          <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#f0f0f0]">
            <Wallet className="h-[22px] w-[22px] text-[#bbb]" strokeWidth={1.5} />
          </div>
          <h2 className="text-[15px] font-semibold text-[#262626]">No budgets yet</h2>
          <p className="max-w-[280px] text-center text-[13px] font-medium leading-[20px] text-[#888]">
            Create a budget to track funding, allocations, and spending across your participants.
          </p>
          <button
            className="mt-[4px] flex items-center gap-[5px] rounded bg-[#262626] px-[14px] py-[7px] text-[13px] font-medium text-white transition-colors hover:bg-[#3d3d3d]"
            tabIndex={0}
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Create budget</span>
          </button>
        </div>
      </div>
    </div>
  )
}
