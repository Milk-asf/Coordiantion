"use client"

import { SquarePen, Plus } from "lucide-react"
import type { Note } from "@/lib/types"

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
  if (notes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-[12px] px-[24px]">
        <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#f5f5f5]">
          <SquarePen className="h-[18px] w-[18px] text-[#bbb]" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-[14px] font-medium text-[#262626]">No notes yet</p>
          <p className="mt-[2px] text-[13px] text-[#999]">{emptyDescription}</p>
        </div>
        <button
          onClick={onCreateNote}
          disabled={isCreating}
          className="primary-btn mt-[2px] flex items-center gap-[6px] rounded-[8px] px-[14px] py-[8px] text-[13px] font-medium transition-colors disabled:opacity-50"
          tabIndex={0}
        >
          <Plus className="h-[14px] w-[14px]" strokeWidth={2} />
          {isCreating ? "Creating…" : "New note"}
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] px-[32px] py-[28px]">
      <div className="mb-[16px] flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-[#262626]">
          Notes <span className="ml-[4px] text-[13px] font-medium text-[#bbb]">{notes.length}</span>
        </h2>
        <button
          onClick={onCreateNote}
          disabled={isCreating}
          className="flex items-center gap-[6px] rounded-[8px] border border-[#dcdcdc] bg-white px-[12px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
          tabIndex={0}
        >
          <Plus className="h-[14px] w-[14px]" strokeWidth={1.75} />
          {isCreating ? "Creating…" : "New note"}
        </button>
      </div>
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
              className="group flex min-h-[150px] cursor-pointer flex-col rounded-[8px] border border-[#f0f0f0] bg-white p-[18px] text-left transition-all hover:border-[#e0e0e0] hover:shadow-sm"
            >
              <p className="truncate text-[14px] font-semibold text-[#262626]">{note.title || "Untitled"}</p>
              <p className="mt-[6px] line-clamp-4 flex-1 text-[13px] leading-[1.5] text-[#888]">{preview || "No content yet"}</p>
              <span className="mt-[10px] text-[11px] text-[#bbb]">{formatDate(note.updatedAt || note.createdAt)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
