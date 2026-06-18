"use client"

import type { ComponentType, ReactNode } from "react"

interface StaffActivityFeedProps {
  activities: Array<{
    id: string
    icon: ComponentType<{ className?: string; strokeWidth?: number }>
    content: ReactNode
    time: string
  }>
  emptyMessage?: string
}

export function StaffActivityFeed({ activities, emptyMessage = "No activity yet" }: StaffActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="px-[16px] py-[16px]">
        <p className="text-[13px] text-folk-placeholder">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="px-[16px] py-[14px]">
      <div className="space-y-[10px]">
        {activities.map((activity) => {
          const IconComp = activity.icon
          return (
            <div key={activity.id} className="flex items-start gap-[10px]">
              <div className="mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-folk-page">
                <IconComp className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
              </div>
              <p className="min-w-0 flex-1 text-[13px] leading-[1.5] text-[#555]">
                {activity.content}
                <span className="ml-[6px] text-[12px] text-folk-placeholder">· {activity.time}</span>
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
