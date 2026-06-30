"use client"

import type { ComponentType, ReactNode } from "react"
import { Activity, CalendarDays, FileText } from "lucide-react"
import { PanelToggleButton } from "@/components/panel-toggle-button"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { profileMainTabScrollClass, profileTabBarClass } from "@/components/tab-active-indicator"
import { cn } from "@/lib/utils"

export type AccountDetailsTab = "details" | "activity" | "roster"

const accountDetailsTabs: Array<{
  key: AccountDetailsTab
  label: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}> = [
  { key: "details", label: "Details", icon: FileText },
  { key: "activity", label: "Activity", icon: Activity },
  { key: "roster", label: "Roster", icon: CalendarDays },
]

interface AccountDetailsSidebarToggleProps {
  isOpen: boolean
  onToggle: () => void
  openTooltip?: string
  closeTooltip?: string
  className?: string
}

/** Keeps the sidebar show/hide control aligned with the main sidebar collapse button. */
export function AccountDetailsSidebarToggle({
  isOpen,
  onToggle,
  openTooltip = "Show account details",
  closeTooltip = "Hide account details",
  className,
}: AccountDetailsSidebarToggleProps) {
  return (
    <div className={cn("flex shrink-0 items-center pl-[8px]", className)}>
      <PanelToggleButton
        side="right"
        isOpen={isOpen}
        onClick={onToggle}
        ariaLabel={isOpen ? closeTooltip : openTooltip}
        tooltip={isOpen ? closeTooltip : openTooltip}
      />
    </div>
  )
}

interface AccountDetailsTabBarProps {
  activeTab: AccountDetailsTab
  onTabChange: (tab: AccountDetailsTab) => void
  onHideSidebar?: () => void
  hideSidebarTooltip?: string
  className?: string
}

export function AccountDetailsTabBar({
  activeTab,
  onTabChange,
  onHideSidebar,
  hideSidebarTooltip = "Hide account details",
  className = "",
}: AccountDetailsTabBarProps) {
  return (
    <div className={cn(profileTabBarClass("h-full min-w-0 flex-1 justify-between bg-white px-[12px]"), className)}>
      <div className={profileMainTabScrollClass("h-full flex-1")}>
        {accountDetailsTabs.map(({ key, label, icon }) => (
          <ProfileTabButton
            key={key}
            isActive={activeTab === key}
            onClick={() => onTabChange(key)}
            icon={icon}
            label={label}
          />
        ))}
      </div>
      {onHideSidebar && (
        <AccountDetailsSidebarToggle
          isOpen
          onToggle={onHideSidebar}
          closeTooltip={hideSidebarTooltip}
        />
      )}
    </div>
  )
}

interface ProfileAccountDetailsPanelProps {
  activeTab: AccountDetailsTab
  onTabChange: (tab: AccountDetailsTab) => void
  onHideSidebar?: () => void
  hideTabBar?: boolean
  details: ReactNode
  activity: ReactNode
  roster: ReactNode
}

export function ProfileAccountDetailsPanel({
  activeTab,
  onTabChange,
  onHideSidebar,
  hideTabBar = false,
  details,
  activity,
  roster,
}: ProfileAccountDetailsPanelProps) {
  return (
    <>
      {!hideTabBar && (
        <AccountDetailsTabBar
          activeTab={activeTab}
          onTabChange={onTabChange}
          onHideSidebar={onHideSidebar}
        />
      )}
      {activeTab === "details" && details}
      {activeTab === "activity" && activity}
      {activeTab === "roster" && roster}
    </>
  )
}
