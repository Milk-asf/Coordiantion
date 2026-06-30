"use client"

import { LayoutGrid, List } from "lucide-react"
import type { ProfileViewMode } from "@/lib/hooks/use-profile-view-mode"

interface ProfileViewToggleProps {
  viewMode: ProfileViewMode
  onViewModeChange: (mode: ProfileViewMode) => void
}

export function ProfileViewToggle({ viewMode, onViewModeChange }: ProfileViewToggleProps) {
  const buttonClass = (isActive: boolean) =>
    `flex h-[28px] w-[28px] items-center justify-center rounded-none transition-colors ${
      isActive ? "bg-[var(--folk-border-subtle)] text-folk-text" : "text-folk-secondary hover:text-folk-text"
    }`

  return (
    <div className="flex items-center rounded-none border border-folk-border p-[2px]">
      <button
        type="button"
        onClick={() => onViewModeChange("table")}
        className={buttonClass(viewMode === "table")}
        tabIndex={0}
        aria-label="Table view"
        aria-pressed={viewMode === "table"}
      >
        <List className="h-[13px] w-[13px]" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange("card")}
        className={buttonClass(viewMode === "card")}
        tabIndex={0}
        aria-label="Card view"
        aria-pressed={viewMode === "card"}
      >
        <LayoutGrid className="h-[13px] w-[13px]" strokeWidth={1.5} />
      </button>
    </div>
  )
}
