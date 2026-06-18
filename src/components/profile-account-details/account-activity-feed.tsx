"use client"

import type { ActivityEntry } from "@/lib/types"
import { EntityIcon } from "@/components/entity-icon"
import { formatActivityTimeAgo, renderActivityMessage } from "@/components/profile-account-details/activity-overview-summary"

interface AccountActivityFeedProps {
  entries: ActivityEntry[]
  currentUserName?: string
  emptyMessage?: string
}

export function AccountActivityFeed({
  entries,
  currentUserName = "",
  emptyMessage = "No activity yet",
}: AccountActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="px-[16px] py-[16px]">
        <p className="text-[13px] text-folk-placeholder">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="px-[16px] py-[14px]">
      <div className="space-y-[10px]">
        {entries.map((entry) => {
          const displayName = entry.user || currentUserName
          const userInitials = displayName
            .split(" ")
            .filter(Boolean)
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?"

          return (
            <div key={entry.id} className="flex items-start gap-[10px]">
              <EntityIcon text={userInitials} size="sm" className="mt-[1px]" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-[1.5] text-[#555]">
                  <span className="font-semibold text-folk-text">{displayName}</span>
                  {" "}
                  {renderActivityMessage(entry.message)}
                  <span className="ml-[6px] text-[12px] text-folk-placeholder">· {formatActivityTimeAgo(entry.createdAt)}</span>
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
