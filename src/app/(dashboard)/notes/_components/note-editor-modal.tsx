"use client"

import { useState, useRef, useEffect } from "react"
import { sanitizeHtml } from "@/lib/sanitize"
import {
  Plus,
  Trash2,
  X,
  Star,
  List,
  Minus,
  Maximize2,
  MoreVertical,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  ListOrdered,
  Quote,
  Code,
} from "lucide-react"
import type { Note } from "@/lib/types"

interface NoteEditorModalProps {
  note: Note
  editTitle: string
  editContent: string
  onEditTitle: (title: string) => void
  onEditContent: (content: string) => void
  onClose: () => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
  isFavorite: boolean
  currentUserName: string
  recordIcon: { iconText: string; name: string }
}

export function NoteEditorModal({
  note,
  editTitle,
  editContent,
  onEditTitle,
  onEditContent,
  onClose,
  onDelete,
  onToggleFavorite,
  isFavorite,
  currentUserName,
  recordIcon,
}: NoteEditorModalProps) {
  const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false)
  const [isNoteMenuOpen, setIsNoteMenuOpen] = useState(false)
  const formatMenuRef = useRef<HTMLDivElement>(null)
  const noteMenuRef = useRef<HTMLDivElement>(null)
  const contentEditableRef = useRef<HTMLDivElement>(null)
  const initialContentRef = useRef(editContent)

  useEffect(() => {
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = sanitizeHtml(initialContentRef.current || "")
    }
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (formatMenuRef.current && !formatMenuRef.current.contains(e.target as Node)) setIsFormatMenuOpen(false)
      if (noteMenuRef.current && !noteMenuRef.current.contains(e.target as Node)) setIsNoteMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const applyFormat = (command: string, value?: string) => {
    contentEditableRef.current?.focus()
    document.execCommand(command, false, value)
    if (contentEditableRef.current) {
      onEditContent(sanitizeHtml(contentEditableRef.current.innerHTML))
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="pointer-events-none absolute inset-0 opacity-40" />

      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/10">
        <div className="relative flex h-[85vh] w-[640px] flex-col rounded-[12px] border border-[#e8e8e8] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between border-b border-[#f0f0f0] px-[16px] py-[10px]">
            <div className="flex items-center gap-[8px]">
              <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[5px] bg-[#DBEAFE] text-[8px] font-semibold text-[#2563EB]">
                {recordIcon.iconText}
              </div>
              <span className="text-[13px] font-medium text-[#262626]">{recordIcon.name}</span>
            </div>
            <div className="flex items-center gap-[4px]">
              <button
                onClick={onClose}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-[4px] text-[#999] transition-colors hover:bg-[#f0f0f0] hover:text-[#555]"
                tabIndex={0}
                aria-label="Minimize"
              >
                <Minus className="h-[13px] w-[13px]" strokeWidth={1.5} />
              </button>
              <button
                className="flex h-[26px] w-[26px] items-center justify-center rounded-[4px] text-[#999] transition-colors hover:bg-[#f0f0f0] hover:text-[#555]"
                tabIndex={0}
                aria-label="Expand"
              >
                <Maximize2 className="h-[12px] w-[12px]" strokeWidth={1.5} />
              </button>
              <button
                onClick={onClose}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-[4px] text-[#999] transition-colors hover:bg-[#f0f0f0] hover:text-[#555]"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[13px] w-[13px]" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-[10px] px-[20px] py-[10px]">
            <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-semibold text-white">
              {currentUserName ? currentUserName.split(" ").map((w) => w[0]).join("").slice(0, 1).toUpperCase() : "U"}
            </div>
            <div className="relative" ref={noteMenuRef}>
              <button
                onClick={() => setIsNoteMenuOpen(!isNoteMenuOpen)}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-[4px] text-[#999] transition-colors hover:bg-[#f0f0f0] hover:text-[#555]"
                tabIndex={0}
                aria-label="More options"
              >
                <MoreVertical className="h-[14px] w-[14px]" strokeWidth={1.5} />
              </button>
              {isNoteMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-[4px] w-[180px] rounded-[8px] border border-[#e8e8e8] bg-white py-[4px] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                  <button
                    onClick={() => { onToggleFavorite(note.id); setIsNoteMenuOpen(false) }}
                    className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[12px] font-medium text-[#555] transition-colors hover:bg-[#f5f5f5]"
                    tabIndex={0}
                  >
                    <Star className="h-[13px] w-[13px]" strokeWidth={1.5} />
                    {isFavorite ? "Unfavorite" : "Favorite"}
                  </button>
                  <button
                    onClick={() => { setIsNoteMenuOpen(false); onDelete(note.id) }}
                    className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[12px] font-medium text-red-500 transition-colors hover:bg-red-50"
                    tabIndex={0}
                  >
                    <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.5} />
                    Delete note
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-[40px] pb-[24px]">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onEditTitle(e.target.value)}
              placeholder="Untitled note"
              className="mb-[8px] w-full text-[28px] font-semibold text-[#262626] outline-none placeholder:text-[#ccc]"
            />

            <div className="mb-[20px] flex items-center gap-[6px]">
              <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] bg-[#DBEAFE] text-[7px] font-semibold text-[#2563EB]">
                {recordIcon.iconText}
              </div>
              <span className="text-[13px] font-medium text-[#555]">{recordIcon.name}</span>
            </div>

            <div
              ref={contentEditableRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => onEditContent(sanitizeHtml((e.target as HTMLDivElement).innerHTML))}
              data-placeholder="Start typing, or create a template"
              className="note-editable min-h-[120px] w-full text-[14px] leading-[1.8] text-[#444] outline-none empty:before:text-[#bbb] empty:before:content-[attr(data-placeholder)]"
            />
          </div>

          <div className="relative border-t border-[#f0f0f0] px-[40px] py-[12px]" ref={formatMenuRef}>
            <button
              onClick={() => setIsFormatMenuOpen(!isFormatMenuOpen)}
              className={`flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border transition-colors ${isFormatMenuOpen ? "border-[#d0d0d0] bg-[#f0f0f0] text-[#555]" : "border-[#e8e8e8] text-[#888] hover:border-[#d0d0d0] hover:bg-[#f5f5f5] hover:text-[#555]"}`}
              tabIndex={0}
              aria-label="Formatting options"
            >
              <Plus className="h-[14px] w-[14px]" strokeWidth={1.5} />
            </button>

            {isFormatMenuOpen && (
              <div className="absolute bottom-[52px] left-[40px] z-50 flex items-center gap-[2px] rounded-[8px] border border-[#e8e8e8] bg-white px-[6px] py-[6px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("bold") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[4px] text-[#555] transition-colors hover:bg-[#f0f0f0]" tabIndex={0} aria-label="Bold">
                  <Bold className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("italic") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[4px] text-[#555] transition-colors hover:bg-[#f0f0f0]" tabIndex={0} aria-label="Italic">
                  <Italic className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("underline") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[4px] text-[#555] transition-colors hover:bg-[#f0f0f0]" tabIndex={0} aria-label="Underline">
                  <Underline className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("strikeThrough") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[4px] text-[#555] transition-colors hover:bg-[#f0f0f0]" tabIndex={0} aria-label="Strikethrough">
                  <Strikethrough className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <div className="mx-[4px] h-[18px] w-[1px] bg-[#e8e8e8]" />
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("formatBlock", "h1") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[4px] text-[#555] transition-colors hover:bg-[#f0f0f0]" tabIndex={0} aria-label="Heading 1">
                  <Heading1 className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("formatBlock", "h2") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[4px] text-[#555] transition-colors hover:bg-[#f0f0f0]" tabIndex={0} aria-label="Heading 2">
                  <Heading2 className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <div className="mx-[4px] h-[18px] w-[1px] bg-[#e8e8e8]" />
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("insertUnorderedList") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[4px] text-[#555] transition-colors hover:bg-[#f0f0f0]" tabIndex={0} aria-label="Bullet list">
                  <List className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("insertOrderedList") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[4px] text-[#555] transition-colors hover:bg-[#f0f0f0]" tabIndex={0} aria-label="Numbered list">
                  <ListOrdered className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("formatBlock", "blockquote") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[4px] text-[#555] transition-colors hover:bg-[#f0f0f0]" tabIndex={0} aria-label="Quote">
                  <Quote className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("formatBlock", "pre") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[4px] text-[#555] transition-colors hover:bg-[#f0f0f0]" tabIndex={0} aria-label="Code">
                  <Code className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
