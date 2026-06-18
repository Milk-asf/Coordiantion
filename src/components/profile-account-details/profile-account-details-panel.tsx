"use client"

import type { ComponentType, ReactNode } from "react"
import { Activity, CalendarDays, FileText, PanelRightClose } from "lucide-react"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { profileMainTabScrollClass, profileTabBarClass, folkNavIconButtonClass } from "@/components/tab-active-indicator"
import { IconButton } from "@/components/icon-button"
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
      <div className="flex shrink-0 items-center gap-[2px]">
        {onHideSidebar && (
          <IconButton
            type="button"
            onClick={onHideSidebar}
            tooltip={hideSidebarTooltip}
            className={cn(
              "flex h-[28px] w-[28px] items-center justify-center",
              folkNavIconButtonClass()
            )}
            tabIndex={0}
          >
            <PanelRightClose className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </IconButton>
        )}
      </div>
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
