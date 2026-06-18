"use client"

import { ClipboardList, Plus } from "lucide-react"
import { EmptyState } from "@/components/empty-state"

export default function FormsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-folk-border-subtle bg-folk-nav px-[16px]">
        <span className="text-[13px] font-medium text-folk-text">Forms</span>
        <button
          type="button"
          disabled
          className="outline-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          tabIndex={0}
          aria-label="Create form"
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>Add new</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-folk-surface">
        <EmptyState
          icon={ClipboardList}
          title="No forms yet"
          description="Create forms to collect information from clients, staff, and contacts."
          className="h-full"
        />
      </div>
    </div>
  )
}
