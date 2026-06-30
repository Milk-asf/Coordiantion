"use client"

import { SquarePen } from "lucide-react"
import type { Note } from "@/lib/types"
import { EmptyState } from "@/components/empty-state"
import { SectionToolbar } from "@/components/section-toolbar"

interface ProfileNotesTabProps {
  notes: Note[]
  onOpenNote: (noteId: string) => void
  onCreateNote: () => void
  isCreating?: boolean
  emptyDescription?: string
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function formatDate(dateStr: string) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}

export function ProfileNotesTab({ notes, onOpenNote, onCreateNote, isCreating = false, emptyDescription = "Notes linked here will appear in this section." }: ProfileNotesTabProps) {
  return (
    <div className="flex h-full flex-col bg-white">
      <SectionToolbar onAddNew={onCreateNote} addDisabled={isCreating} />
      {notes.length === 0 ? (
        <EmptyState
          icon={SquarePen}
          title="No notes yet"
          description={emptyDescription}
          action={{ label: isCreating ? "Creating…" : "New note", onClick: onCreateNote, disabled: isCreating }}
          className="flex-1"
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1120px] px-[32px] py-[28px]">
            <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
              {notes.map((note) => {
                const preview = stripHtml(note.content)
                return (
                  <div
                    key={note.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenNote(note.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenNote(note.id) } }}
                    className="group flex min-h-[150px] cursor-pointer flex-col rounded-none border border-[#d9d9d9] bg-folk-surface p-[18px] text-left transition-all hover:border-folk-border hover:shadow-sm"
                  >
                    <p className="truncate text-[14px] font-semibold text-folk-text">{note.title || "Untitled"}</p>
                    <p className="mt-[6px] line-clamp-4 flex-1 text-[13px] leading-[1.5] text-folk-secondary">{preview || "No content yet"}</p>
                    <span className="mt-[10px] text-[11px] text-folk-placeholder">{formatDate(note.updatedAt || note.createdAt)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
