"use client"

import { SquarePen } from "lucide-react"
import type { Note } from "@/lib/types"
import { formatActivityTimeAgo } from "@/components/profile-account-details/activity-overview-summary"
import { OverviewSummarySection } from "@/components/profile-account-details/overview-summary-section"

interface NotesOverviewSummaryProps {
  notes: Note[]
  limit?: number
  onViewAll?: () => void
  onOpenNote?: (noteId: string) => void
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

export function NotesOverviewSummary({
  notes,
  limit = 3,
  onViewAll,
  onOpenNote,
}: NotesOverviewSummaryProps) {
  const sorted = [...notes].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt).getTime()
    const bTime = new Date(b.updatedAt || b.createdAt).getTime()
    return bTime - aTime
  })
  const preview = sorted.slice(0, limit)

  return (
    <OverviewSummarySection title="Notes" itemCount={notes.length} onViewAll={onViewAll}>
      {notes.length === 0 ? (
        <p className="text-[13px] text-folk-placeholder">No notes yet</p>
      ) : (
        <div className="space-y-[10px]">
          {preview.map((note) => {
            const previewText = stripHtml(note.content)
            const timeLabel = formatActivityTimeAgo(note.updatedAt || note.createdAt)

            return (
              <div
                key={note.id}
                role={onOpenNote ? "button" : undefined}
                tabIndex={onOpenNote ? 0 : undefined}
                onClick={onOpenNote ? () => onOpenNote(note.id) : undefined}
                onKeyDown={onOpenNote ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onOpenNote(note.id)
                  }
                } : undefined}
                className={onOpenNote ? "flex cursor-pointer items-start gap-[10px] rounded-[6px] transition-colors hover:opacity-80" : "flex items-start gap-[10px]"}
              >
                <span className="mt-[1px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[var(--folk-border-subtle)] text-folk-secondary">
                  <SquarePen className="h-[12px] w-[12px]" strokeWidth={1.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] leading-[1.5] text-[#555]">
                    <span className="font-semibold text-folk-text">{note.title || "Untitled"}</span>
                    {previewText && (
                      <>
                        {" "}
                        <span>{previewText}</span>
                      </>
                    )}
                    <span className="ml-[6px] text-[12px] text-folk-placeholder">· {timeLabel}</span>
                  </p>
                </div>
              </div>
            )
          })}
          {notes.length > limit && (
            <p className="text-[12px] text-folk-placeholder">
              {notes.length - limit} more {notes.length - limit === 1 ? "note" : "notes"}
            </p>
          )}
        </div>
      )}
    </OverviewSummarySection>
  )
}
