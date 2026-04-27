"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import {
  StickyNote,
  Plus,
  Trash2,
  X,
  Search,
  FileText,
  ChevronDown,
} from "lucide-react"
import { useNotes } from "@/lib/hooks/use-notes"
import { useClients } from "@/lib/hooks/use-clients"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { PageLoader, PageError } from "@/components/page-state"
import type { Note } from "@/lib/types"

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text
  return text.slice(0, max) + "…"
}

export default function NotesPage() {
  const { notes, isLoading, fetchError, addNote, updateNote, deleteNote, refetch } = useNotes()
  const { clients } = useClients()

  const [searchQuery, setSearchQuery] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newClientId, setNewClientId] = useState<string | null>(null)
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState("")
  const clientSearchRef = useRef<HTMLInputElement>(null)

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [currentUserName, setCurrentUserName] = useState("")

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserName(user.user_metadata?.full_name || user.email || "")
    })
  }, [])

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes
    const q = searchQuery.toLowerCase()
    return notes.filter((n) =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.clientName.toLowerCase().includes(q)
    )
  }, [notes, searchQuery])

  const selectedNote = useMemo(() => notes.find((n) => n.id === selectedNoteId) ?? null, [notes, selectedNoteId])

  const activeClients = useMemo(() => clients.filter((c) => c.status === "active"), [clients])

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return activeClients
    const q = clientSearch.toLowerCase()
    return activeClients.filter((c) => c.name.toLowerCase().includes(q))
  }, [activeClients, clientSearch])

  const handleCreateNote = async () => {
    if (!newTitle.trim()) return
    const selectedClient = activeClients.find((c) => c.id === newClientId)
    await addNote({
      title: newTitle.trim(),
      content: newContent,
      clientId: newClientId,
      clientName: selectedClient?.name ?? "",
      createdBy: currentUserName,
    })
    setIsModalOpen(false)
    setNewTitle("")
    setNewContent("")
    setNewClientId(null)
  }

  const handleSelectNote = (note: Note) => {
    setSelectedNoteId(note.id)
    setEditTitle(note.title)
    setEditContent(note.content)
  }

  const handleSaveNote = useCallback(async () => {
    if (!selectedNoteId) return
    await updateNote(selectedNoteId, { title: editTitle, content: editContent })
  }, [selectedNoteId, editTitle, editContent, updateNote])

  const handleDeleteNote = async (id: string) => {
    await deleteNote(id)
    if (selectedNoteId === id) {
      setSelectedNoteId(null)
      setEditTitle("")
      setEditContent("")
    }
  }

  useEffect(() => {
    if (!selectedNoteId) return
    const timeout = setTimeout(() => { handleSaveNote() }, 800)
    return () => clearTimeout(timeout)
  }, [editTitle, editContent, selectedNoteId, handleSaveNote])

  if (isLoading) return <PageLoader label="Loading notes…" />
  if (fetchError) return <PageError message={fetchError} onRetry={refetch} />

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
        <div className="flex items-center gap-[8px]">
          <StickyNote className="h-[15px] w-[15px] text-[#888]" strokeWidth={1.75} />
          <span className="text-[13px] font-medium text-[#262626]">Notes</span>
          <div className="h-[16px] w-px bg-[#e5e5e5]" />
          <span className="text-[12px] font-medium text-[#888]">{notes.length} {notes.length === 1 ? "note" : "notes"}</span>
        </div>
        <div className="flex items-center gap-[8px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-[8px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#bbb]" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes…"
              className="h-[30px] w-[180px] rounded-[6px] border border-[#e0e0e0] bg-[#fafafa] pl-[28px] pr-[8px] text-[12px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3] focus:bg-white"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="primary-btn flex items-center gap-[5px] rounded-[4px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
            tabIndex={0}
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span className="hidden sm:inline">New note</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Note list */}
        <div className="flex w-[320px] shrink-0 flex-col border-r border-[#ebebeb] bg-[#fafafa]">
          <div className="flex-1 overflow-y-auto">
            {filteredNotes.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-[13px] text-[#bbb]">{searchQuery ? "No notes found" : "No notes yet"}</p>
              </div>
            ) : (
              <div className="divide-y divide-[#f0f0f0]">
                {filteredNotes.map((note) => {
                  const isActive = selectedNoteId === note.id
                  return (
                    <button
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      className={`flex w-full flex-col gap-[4px] px-[16px] py-[12px] text-left transition-colors ${isActive ? "bg-white" : "hover:bg-[#f5f5f5]"}`}
                      tabIndex={0}
                    >
                      <div className="flex items-start justify-between gap-[8px]">
                        <span className={`truncate text-[13px] font-medium ${isActive ? "text-[#262626]" : "text-[#555]"}`}>{note.title || "Untitled"}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id) }}
                          className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px] text-[#ccc] opacity-0 transition-all hover:bg-[#fee2e2] hover:text-red-400 group-hover:opacity-100 [button:hover>&]:opacity-100"
                          tabIndex={-1}
                          aria-label="Delete note"
                        >
                          <Trash2 className="h-[11px] w-[11px]" strokeWidth={1.5} />
                        </button>
                      </div>
                      <span className="truncate text-[11px] text-[#999]">
                        {truncate(note.content || "No content", 60)}
                      </span>
                      <div className="flex items-center gap-[6px]">
                        <span className="text-[10px] text-[#bbb]">{formatDate(note.updatedAt)}</span>
                        {note.clientName && (
                          <>
                            <span className="text-[10px] text-[#ddd]">·</span>
                            <span className="truncate text-[10px] text-[#bbb]">{note.clientName}</span>
                          </>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Note editor */}
        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          {selectedNote ? (
            <>
              <div className="flex items-center justify-between border-b border-[#f0f0f0] px-[24px] py-[12px]">
                <div className="flex items-center gap-[8px] text-[11px] text-[#bbb]">
                  <span>{formatDate(selectedNote.updatedAt)} at {formatTime(selectedNote.updatedAt)}</span>
                  {selectedNote.clientName && (
                    <>
                      <span>·</span>
                      <span className="inline-flex h-[22px] items-center rounded border border-[#dcdcdc] px-[6px] text-[11px] font-medium text-[#888]">{selectedNote.clientName}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteNote(selectedNote.id)}
                  className="flex h-[24px] w-[24px] items-center justify-center rounded-[4px] text-[#ccc] transition-colors hover:bg-[#fee2e2] hover:text-red-400"
                  tabIndex={0}
                  aria-label="Delete note"
                >
                  <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-[24px] py-[16px]">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Note title"
                  className="mb-[12px] w-full text-[20px] font-semibold text-[#262626] outline-none placeholder:text-[#ccc]"
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Start writing…"
                  className="min-h-[300px] w-full resize-none text-[14px] leading-[1.7] text-[#444] outline-none placeholder:text-[#ccc]"
                />
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-[8px] text-center">
                <FileText className="h-[28px] w-[28px] text-[#ddd]" strokeWidth={1.5} />
                <p className="text-[13px] text-[#bbb]">Select a note or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create note modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => { setIsModalOpen(false); setNewTitle(""); setNewContent(""); setNewClientId(null); setIsClientDropdownOpen(false) }} />
          <div className="relative z-10 w-[480px] rounded-lg bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between px-[24px] pt-[20px]">
              <div className="flex items-center gap-[8px]">
                <StickyNote className="h-[16px] w-[16px] text-[#555]" strokeWidth={1.5} />
                <h2 className="text-[15px] font-semibold text-[#262626]">New note</h2>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setNewTitle(""); setNewContent(""); setNewClientId(null); setIsClientDropdownOpen(false) }}
                className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-[14px] px-[24px] py-[20px]">
              <div>
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Note title"
                  className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Content</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Write something…"
                  rows={4}
                  className="w-full resize-none rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] py-[10px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"
                />
              </div>

              <div className="relative">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Link to client (optional)</label>
                <button
                  onClick={() => { setIsClientDropdownOpen(!isClientDropdownOpen); setTimeout(() => clientSearchRef.current?.focus(), 50) }}
                  className="flex h-[36px] w-full items-center justify-between rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] transition-colors hover:border-[#ccc]"
                  tabIndex={0}
                >
                  <span className={newClientId ? "text-[#262626]" : "text-[#bbb]"}>
                    {newClientId ? activeClients.find((c) => c.id === newClientId)?.name ?? "Select client" : "Select client"}
                  </span>
                  <ChevronDown className="h-[12px] w-[12px] text-[#999]" strokeWidth={1.5} />
                </button>
                {isClientDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[59]" onClick={() => setIsClientDropdownOpen(false)} />
                    <div className="absolute left-0 top-full z-[60] mt-[4px] max-h-[200px] w-full overflow-y-auto rounded-[8px] border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                      <div className="sticky top-0 border-b border-[#f0f0f0] bg-white px-[10px] py-[6px]">
                        <input
                          ref={clientSearchRef}
                          type="text"
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          placeholder="Search clients…"
                          className="w-full text-[12px] text-[#262626] outline-none placeholder:text-[#bbb]"
                        />
                      </div>
                      {newClientId && (
                        <button
                          onClick={() => { setNewClientId(null); setIsClientDropdownOpen(false); setClientSearch("") }}
                          className="flex w-full items-center px-[12px] py-[7px] text-[12px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5]"
                          tabIndex={0}
                        >
                          No client
                        </button>
                      )}
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setNewClientId(c.id); setIsClientDropdownOpen(false); setClientSearch("") }}
                          className={`flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[12px] font-medium transition-colors hover:bg-[#f5f5f5] ${newClientId === c.id ? "bg-[#f0f0f0] text-[#262626]" : "text-[#555]"}`}
                          tabIndex={0}
                        >
                          <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px] text-[8px] font-semibold text-white" style={{ backgroundColor: c.iconColor }}>{c.iconText}</div>
                          <span className="truncate">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-[8px] border-t border-[#f0f0f0] px-[24px] py-[14px]">
              <button
                onClick={() => { setIsModalOpen(false); setNewTitle(""); setNewContent(""); setNewClientId(null); setIsClientDropdownOpen(false) }}
                className="rounded-[8px] border border-[#e0e0e0] bg-white px-[16px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNote}
                disabled={!newTitle.trim()}
                className="primary-btn rounded-[8px] px-[16px] py-[7px] text-[13px] font-medium text-white transition-colors disabled:opacity-40"
                tabIndex={0}
              >
                Create note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
