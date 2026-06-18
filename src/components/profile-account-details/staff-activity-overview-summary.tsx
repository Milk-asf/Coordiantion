"use client"

import type { ComponentType, ReactNode } from "react"

interface StaffActivityOverviewSummaryProps {
  activities: Array<{
    id: string
    icon: ComponentType<{ className?: string; strokeWidth?: number }>
    content: ReactNode
    time: string
  }>
  limit?: number
  onViewAll?: () => void
}

export function StaffActivityOverviewSummary({
  activities,
  limit = 3,
  onViewAll,
}: StaffActivityOverviewSummaryProps) {
  const preview = activities.slice(0, limit)

  return (
    <div className="mt-[28px] w-full">
      <div className="mb-[10px] flex items-center justify-between gap-[8px]">
        <h3 className="text-[13px] font-medium text-folk-secondary">Activity</h3>
        {activities.length > 0 && onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[12px] font-medium text-[#555] transition-colors hover:text-folk-text"
            tabIndex={0}
          >
            View all
          </button>
        )}
      </div>
      <div className="w-full rounded-none border border-[#e2e2e2] bg-folk-surface px-[16px] py-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        {activities.length === 0 ? (
          <p className="text-[13px] text-folk-placeholder">No activity yet</p>
        ) : (
          <div className="space-y-[10px]">
            {preview.map((activity) => {
              const IconComp = activity.icon
              return (
                <div key={activity.id} className="flex items-start gap-[10px]">
                  <div className="mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-folk-page">
                    <IconComp className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
                  </div>
                  <p className="min-w-0 flex-1 truncate text-[13px] leading-[1.5] text-[#555]">
                    {activity.content}
                    <span className="ml-[6px] text-[12px] text-folk-placeholder">· {activity.time}</span>
                  </p>
                </div>
              )
            })}
            {activities.length > limit && (
              <p className="text-[12px] text-folk-placeholder">
                {activities.length - limit} more {activities.length - limit === 1 ? "update" : "updates"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
