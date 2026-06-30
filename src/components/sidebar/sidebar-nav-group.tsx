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
    <li className={cn("mx-1", isCollapsed && "mx-0")}>
      <button
        type="button"
        onClick={onTogglePanel}
        className={cn(
          "folk-sidebar-nav-item flex h-[32px] w-full items-center gap-2 rounded-[4px] px-[12px] text-[12px] font-normal leading-none transition-colors",
          isGroupActive || isPanelOpen
            ? "bg-sidebar-active font-medium text-sidebar-active-text"
            : "text-[#616161] hover:bg-sidebar-hover",
          isCollapsed && "relative justify-center px-0"
        )}
        aria-expanded={isPanelOpen}
        title={isCollapsed ? BUSINESS_NAV_GROUP.label : undefined}
        tabIndex={0}
      >
        <GroupIcon className="h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
        {!isCollapsed && <span className="truncate">{BUSINESS_NAV_GROUP.label}</span>}
      </button>
    </li>
  )
}
