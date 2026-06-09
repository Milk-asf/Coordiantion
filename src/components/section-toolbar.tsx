"use client"

import { ListFilter, Plus } from "lucide-react"

interface SectionToolbarProps {
  onFilter?: () => void
  onAddNew?: () => void
  addLabel?: string
  addDisabled?: boolean
}

export function SectionToolbar({ onFilter, onAddNew, addLabel = "Add new", addDisabled }: SectionToolbarProps) {
  return (
    <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-[#dcdcdc] px-[16px]">
      <button
        onClick={onFilter}
        className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
        tabIndex={0}
      >
        <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
        <span>Filter</span>
      </button>
      {onAddNew && (
        <button
          onClick={onAddNew}
          disabled={addDisabled}
          className="flex items-center gap-[5px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
          tabIndex={0}
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>{addLabel}</span>
        </button>
      )}
    </div>
  )
}
