"use client"

import type { ActivityEntry } from "@/lib/types"
import { EntityIcon } from "@/components/entity-icon"

export function formatActivityTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

export function renderActivityMessage(message: string) {
  const parts = message.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} className="font-semibold text-folk-text">{part}</span>
      : <span key={i}>{part}</span>
  )
}

interface ActivityOverviewSummaryProps {
  entries: ActivityEntry[]
  currentUserName?: string
  limit?: number
  onViewAll?: () => void
}

export function ActivityOverviewSummary({
  entries,
  currentUserName = "",
  limit = 3,
  onViewAll,
}: ActivityOverviewSummaryProps) {
  const preview = entries.slice(0, limit)

  return (
    <div className="mt-[28px] w-full">
      <div className="mb-[10px] flex items-center justify-between gap-[8px]">
        <h3 className="text-[13px] font-medium text-folk-secondary">Activity</h3>
        {entries.length > 0 && onViewAll && (
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
        {entries.length === 0 ? (
          <p className="text-[13px] text-folk-placeholder">No activity yet</p>
        ) : (
          <div className="space-y-[10px]">
            {preview.map((entry) => {
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
                    <p className="truncate text-[13px] leading-[1.5] text-[#555]">
                      <span className="font-semibold text-folk-text">{displayName}</span>
                      {" "}
                      {renderActivityMessage(entry.message)}
                      <span className="ml-[6px] text-[12px] text-folk-placeholder">· {formatActivityTimeAgo(entry.createdAt)}</span>
                    </p>
                  </div>
                </div>
              )
            })}
            {entries.length > limit && (
              <p className="text-[12px] text-folk-placeholder">
                {entries.length - limit} more {entries.length - limit === 1 ? "update" : "updates"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
