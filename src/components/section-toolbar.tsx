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
    <div className="flex h-[40px] shrink-0 items-center justify-between border-b border-folk-border bg-white px-[20px]">
      <button
        onClick={onFilter}
        className="outline-btn"
        tabIndex={0}
      >
        <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
        <span>Filter</span>
      </button>
      {onAddNew && (
        <button
          onClick={onAddNew}
          disabled={addDisabled}
          className="outline-btn disabled:opacity-45"
          tabIndex={0}
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>{addLabel}</span>
        </button>
      )}
    </div>
  )
}
