"use client"

import type { ComponentType } from "react"
import { tabButtonClass } from "@/components/tab-active-indicator"

interface ProfileTabMeasurerProps {
  tabs: Array<{
    key: string
    label: string
    icon: ComponentType<{ className?: string; strokeWidth?: number }>
  }>
  getTabBadge?: (tabKey: string) => number | undefined
}

export function ProfileTabMeasurer({ tabs, getTabBadge }: ProfileTabMeasurerProps) {
  return (
    <div
      data-tab-measurer
      className="pointer-events-none invisible absolute flex items-center gap-[4px]"
      aria-hidden="true"
    >
      {tabs.map((tab) => {
        const badge = getTabBadge?.(tab.key)
        return (
          <div key={tab.key} data-tab-measure className={tabButtonClass(true)}>
            <span className="inline-flex min-h-[18px] items-center gap-[6px]">
              <span className="folk-tab-label text-[13px] font-normal leading-none">{tab.label}</span>
              {badge !== undefined && (
                <span className="folk-tab-badge inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full border px-[5px] text-[11px] font-normal leading-none tabular-nums">
                  {badge}
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
