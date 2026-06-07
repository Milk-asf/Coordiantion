"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { sanitizeHtml } from "@/lib/sanitize"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import {
  Plus,
  Trash2,
  X,
  Star,
  List,
  Paperclip,
  Check,
  FileText,
  Download,
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
import type { Attachment, Note } from "@/lib/types"

interface NoteEditorModalProps {
  note: Note
  editTitle: string
  editContent: string
  editAttachments: Attachment[]
  onEditTitle: (title: string) => void
  onEditContent: (content: string) => void
  onEditAttachments: (attachments: Attachment[]) => void
  onClose: () => void
  onSaveAndClose: () => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
  isFavorite: boolean
  currentUserName: string
  recordIcon: { iconText: string; name: string }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function NoteEditorModal({
  note,
  editTitle,
  editContent,
  editAttachments,
  onEditTitle,
  onEditContent,
  onEditAttachments,
  onClose,
  onSaveAndClose,
  onDelete,
  onToggleFavorite,
  isFavorite,
  currentUserName,
  recordIcon,
}: NoteEditorModalProps) {
  const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false)
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({})
  const [isUploading, setIsUploading] = useState(false)
  const formatMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const contentEditableRef = useRef<HTMLDivElement>(null)
  const initialContentRef = useRef(editContent)

  const isDirty =
    editTitle !== note.title ||
    editContent !== note.content ||
    JSON.stringify(editAttachments) !== JSON.stringify(note.attachments ?? [])

  useEffect(() => {
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = sanitizeHtml(initialContentRef.current || "")
    }
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (formatMenuRef.current && !formatMenuRef.current.contains(e.target as Node)) setIsFormatMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    e.target.value = ""
    if (files.length === 0) return

    setIsUploading(true)
    const supabase = isSupabaseConfigured() ? createClient() : null
    const newAttachments: Attachment[] = []

    for (const file of files) {
      const id = crypto.randomUUID()
      if (supabase) {
        const storagePath = `note-attachments/${note.id}/${id}-${file.name}`
        const { error } = await supabase.storage.from("documents").upload(storagePath, file)
        if (!error) {
          const { data: urlData } = supabase.storage.from("documents").getPublicUrl(storagePath)
          newAttachments.push({ id, name: file.name, size: file.size, storagePath, url: urlData.publicUrl })
        } else {
          newAttachments.push({ id, name: file.name, size: file.size })
        }
      } else {
        newAttachments.push({ id, name: file.name, size: file.size })
      }
    }

    onEditAttachments([...editAttachments, ...newAttachments])
    setIsUploading(false)
  }

  const handleRemoveAttachment = async (attachment: Attachment) => {
    if (attachment.storagePath && isSupabaseConfigured()) {
      const supabase = createClient()
      if (supabase) await supabase.storage.from("documents").remove([attachment.storagePath])
    }
    onEditAttachments(editAttachments.filter((a) => a.id !== attachment.id))
  }

  const updateActiveFormats = useCallback(() => {
    const editor = contentEditableRef.current
    if (!editor) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !sel.anchorNode || !editor.contains(sel.anchorNode)) return
    const formats: Record<string, boolean> = {}
    try {
      formats.bold = document.queryCommandState("bold")
      formats.italic = document.queryCommandState("italic")
      formats.underline = document.queryCommandState("underline")
      formats.strikeThrough = document.queryCommandState("strikeThrough")
      formats.insertUnorderedList = document.queryCommandState("insertUnorderedList")
      formats.insertOrderedList = document.queryCommandState("insertOrderedList")
      const block = (document.queryCommandValue("formatBlock") || "").toLowerCase()
      formats.h1 = block === "h1"
      formats.h2 = block === "h2"
      formats.blockquote = block === "blockquote"
      formats.pre = block === "pre"
    } catch {
      // queryCommand* can throw if the selection is detached; ignore
    }
    setActiveFormats(formats)
  }, [])

  useEffect(() => {
    document.addEventListener("selectionchange", updateActiveFormats)
    return () => document.removeEventListener("selectionchange", updateActiveFormats)
  }, [updateActiveFormats])

  const applyFormat = (command: string, value?: string) => {
    contentEditableRef.current?.focus()
    document.execCommand(command, false, value)
    if (contentEditableRef.current) {
      onEditContent(sanitizeHtml(contentEditableRef.current.innerHTML))
    }
    updateActiveFormats()
  }

  const formatBtnClass = (key: string) =>
    `flex h-[30px] w-[30px] items-center justify-center rounded-[4px] transition-colors ${activeFormats[key] ? "bg-[#eef4fd] text-[#2563EB]" : "text-[#555] hover:bg-[#f0f0f0]"}`

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
            <div className="flex items-center gap-[6px]">
              <button
                onClick={() => onToggleFavorite(note.id)}
                className={`flex h-[30px] items-center gap-[5px] rounded-[6px] border px-[10px] text-[12px] font-medium transition-colors ${isFavorite ? "border-amber-200 bg-amber-50 text-amber-600" : "border-[#e8e8e8] text-[#666] hover:bg-[#f5f5f5]"}`}
                tabIndex={0}
                aria-label={isFavorite ? "Unfavorite note" : "Favorite note"}
                aria-pressed={isFavorite}
              >
                <Star className="h-[14px] w-[14px]" strokeWidth={1.75} fill={isFavorite ? "currentColor" : "none"} />
                {isFavorite ? "Favorited" : "Favorite"}
              </button>
              <button
                onClick={() => onDelete(note.id)}
                className="flex h-[30px] items-center gap-[5px] rounded-[6px] border border-[#e8e8e8] px-[10px] text-[12px] font-medium text-[#666] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                tabIndex={0}
                aria-label="Delete note"
              >
                <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
                Delete
              </button>
              <div className="mx-[2px] h-[20px] w-[1px] bg-[#e8e8e8]" />
              <button
                onClick={onClose}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#999] transition-colors hover:bg-[#f0f0f0] hover:text-[#555]"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[15px] w-[15px]" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-[10px] px-[20px] py-[10px]">
            <div className="flex items-center gap-[8px]">
              <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-semibold text-white">
                {currentUserName ? currentUserName.split(" ").map((w) => w[0]).join("").slice(0, 1).toUpperCase() : "U"}
              </div>
              {isDirty && <span className="text-[12px] font-medium text-[#bbb]">Unsaved changes</span>}
            </div>
            <div className="flex items-center gap-[6px]">
              {isDirty ? (
                <button
                  onClick={onSaveAndClose}
                  className="primary-btn flex h-[30px] items-center gap-[5px] rounded-[6px] px-[12px] text-[12px] font-medium transition-colors"
                  tabIndex={0}
                >
                  <Check className="h-[14px] w-[14px]" strokeWidth={2} />
                  Save &amp; close
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex h-[30px] items-center rounded-[6px] border border-[#e8e8e8] px-[12px] text-[12px] font-medium text-[#666] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  Close
                </button>
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

            {editAttachments.length > 0 && (
              <div className="mt-[20px] flex flex-col gap-[6px]">
                <span className="text-[11px] font-medium uppercase tracking-[0.03em] text-[#a3a3a3]">Attachments</span>
                {editAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="group flex items-center gap-[10px] rounded-[8px] border border-[#eee] bg-[#fafafa] px-[12px] py-[8px]"
                  >
                    <FileText className="h-[16px] w-[16px] shrink-0 text-[#888]" strokeWidth={1.5} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-medium text-[#262626]">{attachment.name}</span>
                      <span className="text-[11px] text-[#999]">{formatFileSize(attachment.size)}</span>
                    </div>
                    {attachment.url && (
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-[26px] w-[26px] items-center justify-center rounded-[4px] text-[#999] transition-colors hover:bg-[#f0f0f0] hover:text-[#555]"
                        tabIndex={0}
                        aria-label={`Download ${attachment.name}`}
                      >
                        <Download className="h-[14px] w-[14px]" strokeWidth={1.5} />
                      </a>
                    )}
                    <button
                      onClick={() => handleRemoveAttachment(attachment)}
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-[4px] text-[#999] transition-colors hover:bg-red-50 hover:text-red-500"
                      tabIndex={0}
                      aria-label={`Remove ${attachment.name}`}
                    >
                      <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex items-center gap-[6px] border-t border-[#f0f0f0] px-[40px] py-[12px]" ref={formatMenuRef}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => setIsFormatMenuOpen(!isFormatMenuOpen)}
              className={`flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border transition-colors ${isFormatMenuOpen ? "border-[#d0d0d0] bg-[#f0f0f0] text-[#555]" : "border-[#e8e8e8] text-[#888] hover:border-[#d0d0d0] hover:bg-[#f5f5f5] hover:text-[#555]"}`}
              tabIndex={0}
              aria-label="Formatting options"
            >
              <Plus className="h-[14px] w-[14px]" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex h-[30px] items-center gap-[5px] rounded-[6px] border border-[#e8e8e8] px-[10px] text-[12px] font-medium text-[#666] transition-colors hover:border-[#d0d0d0] hover:bg-[#f5f5f5] hover:text-[#555] disabled:opacity-50"
              tabIndex={0}
              aria-label="Attach files"
            >
              <Paperclip className="h-[14px] w-[14px]" strokeWidth={1.75} />
              {isUploading ? "Uploading…" : "Attach"}
            </button>

            {isFormatMenuOpen && (
              <div className="absolute bottom-[52px] left-[40px] z-50 flex items-center gap-[2px] rounded-[8px] border border-[#e8e8e8] bg-white px-[6px] py-[6px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("bold") }} className={formatBtnClass("bold")} tabIndex={0} aria-label="Bold" aria-pressed={!!activeFormats.bold}>
                  <Bold className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("italic") }} className={formatBtnClass("italic")} tabIndex={0} aria-label="Italic" aria-pressed={!!activeFormats.italic}>
                  <Italic className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("underline") }} className={formatBtnClass("underline")} tabIndex={0} aria-label="Underline" aria-pressed={!!activeFormats.underline}>
                  <Underline className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("strikeThrough") }} className={formatBtnClass("strikeThrough")} tabIndex={0} aria-label="Strikethrough" aria-pressed={!!activeFormats.strikeThrough}>
                  <Strikethrough className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <div className="mx-[4px] h-[18px] w-[1px] bg-[#e8e8e8]" />
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("formatBlock", "h1") }} className={formatBtnClass("h1")} tabIndex={0} aria-label="Heading 1" aria-pressed={!!activeFormats.h1}>
                  <Heading1 className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("formatBlock", "h2") }} className={formatBtnClass("h2")} tabIndex={0} aria-label="Heading 2" aria-pressed={!!activeFormats.h2}>
                  <Heading2 className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <div className="mx-[4px] h-[18px] w-[1px] bg-[#e8e8e8]" />
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("insertUnorderedList") }} className={formatBtnClass("insertUnorderedList")} tabIndex={0} aria-label="Bullet list" aria-pressed={!!activeFormats.insertUnorderedList}>
                  <List className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("insertOrderedList") }} className={formatBtnClass("insertOrderedList")} tabIndex={0} aria-label="Numbered list" aria-pressed={!!activeFormats.insertOrderedList}>
                  <ListOrdered className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("formatBlock", "blockquote") }} className={formatBtnClass("blockquote")} tabIndex={0} aria-label="Quote" aria-pressed={!!activeFormats.blockquote}>
                  <Quote className="h-[14px] w-[14px]" strokeWidth={2} />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); applyFormat("formatBlock", "pre") }} className={formatBtnClass("pre")} tabIndex={0} aria-label="Code" aria-pressed={!!activeFormats.pre}>
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
