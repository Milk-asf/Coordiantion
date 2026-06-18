"use client"

import { cn } from "@/lib/utils"
import { BUSINESS_NAV_GROUP } from "@/lib/business-nav"

interface SidebarBusinessNavGroupProps {
  isCollapsed: boolean
  isPanelOpen: boolean
  isGroupActive: boolean
  onTogglePanel: () => void
}

export function SidebarBusinessNavGroup({
  isCollapsed,
  isPanelOpen,
  isGroupActive,
  onTogglePanel,
}: SidebarBusinessNavGroupProps) {
  const GroupIcon = BUSINESS_NAV_GROUP.icon

  return (
    <li>
      <button
        type="button"
        onClick={onTogglePanel}
        className={cn(
          "flex w-full items-center gap-2 rounded-none px-2 py-[6px] text-[13px] font-medium transition-colors",
          isGroupActive || isPanelOpen
            ? "bg-sidebar-active text-sidebar-text"
            : "text-sidebar-text hover:bg-sidebar-hover",
          isCollapsed && "justify-center px-0"
        )}
        aria-expanded={isPanelOpen}
        title={isCollapsed ? BUSINESS_NAV_GROUP.label : undefined}
        tabIndex={0}
      >
        <GroupIcon className="h-[16px] w-[16px] shrink-0" strokeWidth={1.75} />
        {!isCollapsed && <span className="truncate">{BUSINESS_NAV_GROUP.label}</span>}
      </button>
    </li>
  )
}
