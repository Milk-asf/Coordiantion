"use client"

import type { ComponentType, RefObject } from "react"
import { IconButton } from "@/components/icon-button"
import { useFixedDropdownPosition } from "@/lib/hooks/use-fixed-dropdown-position"
import { FIXED_DROPDOWN_BACKDROP_Z_CLASS, FIXED_DROPDOWN_MENU_Z_CLASS } from "@/lib/dropdown-utils"
import { cn } from "@/lib/utils"

interface ProfileTabOverflowMenuProps {
  tabs: Array<{
    key: string
    label: string
    icon: ComponentType<{ className?: string; strokeWidth?: number }>
  }>
  overflowIndices: number[]
  activeTabKey: string
  isOpen: boolean
  overflowBtnRef: RefObject<HTMLButtonElement | null>
  onToggle: () => void
  onClose: () => void
  onSelectTab: (tabKey: string) => void
  getTabBadge?: (tabKey: string) => number | undefined
}

export function ProfileTabOverflowMenu({
  tabs,
  overflowIndices,
  activeTabKey,
  isOpen,
  overflowBtnRef,
  onToggle,
  onClose,
  onSelectTab,
  getTabBadge,
}: ProfileTabOverflowMenuProps) {
  const estimatedHeight = Math.min(320, overflowIndices.length * 36 + 8)
  const menuStyle = useFixedDropdownPosition(isOpen, overflowBtnRef, estimatedHeight, 180)

  if (overflowIndices.length === 0) return null

  return (
    <>
      <IconButton
        ref={overflowBtnRef}
        type="button"
        onClick={onToggle}
        tooltip="More tabs"
        className={`relative flex shrink-0 items-center justify-center px-[8px] py-[4px] text-[16px] leading-none tracking-wider transition-colors ${isOpen ? "text-folk-text" : "text-[var(--folk-nav-muted)] hover:text-folk-text"}`}
        tabIndex={0}
        aria-expanded={isOpen}
      >
        &middot;&middot;&middot;
      </IconButton>
      {isOpen && menuStyle && (
        <>
          <div className={cn("fixed inset-0", FIXED_DROPDOWN_BACKDROP_Z_CLASS)} onClick={onClose} />
          <div
            className={cn(
              "fixed w-[180px] overflow-hidden rounded-none border border-folk-border bg-folk-surface py-[4px] shadow-folk",
              FIXED_DROPDOWN_MENU_Z_CLASS
            )}
            style={menuStyle}
          >
            {overflowIndices.map((index) => {
              const tab = tabs[index]
              if (!tab) return null
              const TabIcon = tab.icon
              const isActive = activeTabKey === tab.key
              const badge = getTabBadge?.(tab.key)

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onSelectTab(tab.key)}
                  className={cn(
                    "flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover",
                    isActive && "bg-folk-hover"
                  )}
                  tabIndex={0}
                  aria-current={isActive ? "page" : undefined}
                >
                  <TabIcon className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1 truncate text-left">{tab.label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-[6px] py-[1px] text-[11px] font-medium tabular-nums",
                        isActive
                          ? "border-folk-text text-folk-text"
                          : "border-[var(--folk-nav-bar-border)] bg-folk-hover text-folk-secondary"
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
