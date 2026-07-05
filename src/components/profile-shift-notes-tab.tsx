"use client"

import { useState } from "react"
import { AlertTriangle, ChevronRight, ClipboardList, ExternalLink } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { EntityIcon } from "@/components/entity-icon"
import { cn } from "@/lib/utils"
import type { RosterShift, ShiftProgressNote } from "@/lib/roster/types"

function formatShiftDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
}

function formatRecordedAt(value: string): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const NOTE_SECTIONS: { key: keyof Pick<ShiftProgressNote, "supportProvided" | "goalProgress" | "observations" | "concerns" | "followUp">; label: string }[] = [
  { key: "supportProvided", label: "Support provided" },
  { key: "goalProgress", label: "Progress toward goals" },
  { key: "observations", label: "Observations" },
  { key: "concerns", label: "Concerns or changes" },
  { key: "followUp", label: "Follow-up / handover" },
]

interface ProfileShiftNotesTabProps {
  /** Shifts that already have a progress note attached, newest first. */
  shifts: RosterShift[]
  /** Which counterpart to surface in each row: the participant or the staff member. */
  variant: "staff" | "client"
  onOpenShift?: (shift: RosterShift) => void
  emptyDescription?: string
}

export function ProfileShiftNotesTab({ shifts, variant, onOpenShift, emptyDescription }: ProfileShiftNotesTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (shifts.length === 0) {
    return (
      <div className="flex h-full flex-col bg-white">
        <EmptyState
          icon={ClipboardList}
          title="No shift notes yet"
          description={
            emptyDescription ??
            (variant === "staff"
              ? "Progress notes recorded by this staff member will appear here."
              : "Progress notes recorded for this participant will appear here.")
          }
          className="flex-1"
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex-1 overflow-y-auto bg-white">
        {shifts.map((shift) => {
          const note = shift.progressNote
          if (!note) return null
          const isExpanded = expandedId === shift.id
          const counterpartName = variant === "staff" ? shift.clientName : shift.staffName
          const counterpartIcon = variant === "staff" ? shift.clientIconText : shift.staffIconText
          const recordedLabel = formatRecordedAt(note.recordedAt)

          return (
            <div key={shift.id} className="border-b border-folk-border-subtle">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : shift.id)}
                className="flex w-full items-center gap-[12px] px-[16px] py-[12px] text-left transition-colors hover:bg-folk-hover"
                tabIndex={0}
                aria-expanded={isExpanded}
              >
                <ChevronRight
                  className={cn(
                    "h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform",
                    isExpanded && "rotate-90",
                  )}
                  strokeWidth={1.75}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-[8px]">
                    <span className="truncate text-[13px] font-medium text-folk-text">{formatShiftDate(shift.date)}</span>
                    <span className="shrink-0 text-[12px] text-folk-secondary">
                      {shift.startTime} – {shift.endTime}
                    </span>
                    {note.incidentOccurred && (
                      <span className="inline-flex h-[20px] shrink-0 items-center gap-[4px] rounded-full bg-amber-50 px-[8px] text-[11px] font-medium text-amber-700">
                        <AlertTriangle className="h-[11px] w-[11px]" strokeWidth={2} />
                        Incident
                      </span>
                    )}
                  </div>
                  <p className="mt-[3px] truncate text-[12px] text-folk-secondary">
                    {note.supportProvided || "No support summary recorded"}
                  </p>
                </div>
                {counterpartName && (
                  <span className="flex shrink-0 items-center gap-[6px]">
                    <EntityIcon text={counterpartIcon || counterpartName.slice(0, 2).toUpperCase()} size="xsm" />
                    <span className="max-w-[140px] truncate text-[12px] font-medium text-folk-secondary">{counterpartName}</span>
                  </span>
                )}
              </button>

              {isExpanded && (
                <div className="space-y-[14px] bg-folk-page px-[16px] pb-[16px] pt-[6px]">
                  {NOTE_SECTIONS.map((section) => {
                    const text = note[section.key]
                    if (!text) return null
                    return (
                      <div key={section.key}>
                        <p className="mb-[3px] text-[11px] font-medium uppercase tracking-normal text-folk-secondary">
                          {section.label}
                        </p>
                        <p className="whitespace-pre-wrap text-[13px] leading-[1.5] text-folk-text">{text}</p>
                      </div>
                    )
                  })}

                  {note.signature && (
                    <div>
                      <p className="mb-[4px] text-[11px] font-medium uppercase tracking-normal text-folk-secondary">Signature</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={note.signature}
                        alt="Shift note signature"
                        className="h-[80px] w-auto rounded-[6px] border border-folk-border bg-white"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-[12px] border-t border-folk-border-subtle pt-[10px]">
                    <div className="min-w-0 text-[11px] leading-snug text-folk-secondary">
                      {note.authorName && (
                        <p>
                          Recorded by <span className="font-medium text-folk-text">{note.authorName}</span>
                        </p>
                      )}
                      {recordedLabel && <p className="mt-[2px]">{recordedLabel}</p>}
                    </div>
                    {onOpenShift && (
                      <button
                        type="button"
                        onClick={() => onOpenShift(shift)}
                        className="flex shrink-0 items-center gap-[5px] rounded-[6px] border border-folk-border px-[8px] py-[4px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                        tabIndex={0}
                      >
                        <ExternalLink className="h-[12px] w-[12px]" strokeWidth={1.5} />
                        Open shift
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="shrink-0 border-t border-folk-border px-[16px] py-[10px]">
        <span className="text-[12px] font-medium text-folk-secondary">
          {shifts.length} {shifts.length === 1 ? "note" : "notes"}
        </span>
      </div>
    </div>
  )
}
