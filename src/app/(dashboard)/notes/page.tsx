"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import {
  Plus,
  Trash2,
  X,
  FileText,
  ChevronDown,
  Star,
  LayoutGrid,
  List,
  ListFilter,
  SlidersHorizontal,
  ChevronLeft,
  User,
  Users,
} from "lucide-react"
import { useNotes } from "@/lib/hooks/use-notes"
import { useClients } from "@/lib/hooks/use-clients"
import { useContacts } from "@/lib/hooks/use-contacts"
import { useStaff } from "@/lib/hooks/use-staff"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { PageLoader, PageError } from "@/components/page-state"
import { useToast } from "@/components/toast"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { RecordPickerModal } from "./_components/record-picker-modal"
import { NoteEditorModal } from "./_components/note-editor-modal"
import type { RecordItem } from "./_components/record-picker-modal"
import type { Attachment, Note } from "@/lib/types"

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text
  return text.slice(0, max) + "…"
}

function getTimeGroup(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const thisYear = now.getFullYear()
  const noteYear = d.getFullYear()
  if (noteYear === thisYear) return "Created this year"
  if (noteYear === thisYear - 1) return "Created last year"
  return `Created in ${noteYear}`
}

export default function NotesPage() {
  const { toast } = useToast()
  const { notes, isLoading, fetchError, addNote, updateNote, deleteNote, refetch } = useNotes()
  const { clients } = useClients()
  const { contacts } = useContacts()
  const { staff } = useStaff()

  const [searchQuery] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([])
  const [currentUserName, setCurrentUserName] = useState("")
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const displayBtnRef = useRef<HTMLButtonElement>(null)
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null)
  const [clientFilter, setClientFilter] = useState<string[]>([])
  const [creatorFilter, setCreatorFilter] = useState<string[]>([])
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const filterPillRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try { return JSON.parse(localStorage.getItem("note-favorites") || "[]") } catch { return [] }
  })

  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("note-favorites", JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserName(user.user_metadata?.full_name || user.email || "")
    })
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setIsSortOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const perPageOptions = [10, 25, 50]
  const [perPage, setPerPage] = useState(10)

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id])
  }

  const uniqueNoteClients = useMemo(() => Array.from(new Set(notes.map((n) => n.clientName).filter(Boolean))).sort(), [notes])
  const uniqueNoteCreators = useMemo(() => Array.from(new Set(notes.map((n) => n.createdBy).filter(Boolean))).sort(), [notes])

  const sortedNotes = useMemo(() => {
    let filtered = notes
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.clientName.toLowerCase().includes(q)
      )
    }
    if (clientFilter.length > 0) filtered = filtered.filter((n) => clientFilter.includes(n.clientName))
    if (creatorFilter.length > 0) filtered = filtered.filter((n) => creatorFilter.includes(n.createdBy))
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [notes, searchQuery, clientFilter, creatorFilter])

  const favoriteNotes = useMemo(() => sortedNotes.filter((n) => favorites.includes(n.id)), [sortedNotes, favorites])
  const nonFavoriteNotes = useMemo(() => sortedNotes.filter((n) => !favorites.includes(n.id)), [sortedNotes, favorites])

  const groupedNotes = useMemo(() => {
    const groups: { label: string; notes: Note[] }[] = []
    const map = new Map<string, Note[]>()
    nonFavoriteNotes.forEach((n) => {
      const group = getTimeGroup(n.createdAt)
      if (!map.has(group)) map.set(group, [])
      map.get(group)!.push(n)
    })
    map.forEach((notes, label) => groups.push({ label, notes }))
    return groups
  }, [nonFavoriteNotes])

  const selectedNote = useMemo(() => notes.find((n) => n.id === selectedNoteId) ?? null, [notes, selectedNoteId])
  const activeClients = useMemo(() => clients.filter((c) => c.status === "active"), [clients])

  const allRecords: RecordItem[] = useMemo(() => {
    const records: RecordItem[] = []
    activeClients.forEach((c) => records.push({
      id: c.id,
      name: c.name,
      subtitle: c.participant?.email || "",
      type: "Client",
      iconText: c.iconText,
    }))
    contacts.forEach((c) => records.push({
      id: c.id,
      name: c.name,
      subtitle: c.email || c.phone || "",
      type: "Contact",
      iconText: c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    }))
    staff.forEach((s) => records.push({
      id: s.id,
      name: s.name,
      subtitle: s.details?.email || s.invitedEmail || "",
      type: "Staff",
      iconText: s.iconText,
    }))
    return records
  }, [activeClients, contacts, staff])

  const handleSelectRecord = async (record: RecordItem) => {
    const clientId = record.type === "Client" ? record.id : null
    await addNote({
      title: "Untitled",
      content: "",
      clientId,
      clientName: record.name,
      createdBy: currentUserName,
    })
    setIsModalOpen(false)
    await refetch()
    const latest = notes[0]
    if (latest) handleSelectNote(latest)
  }

  const handleSelectNote = (note: Note) => {
    setSelectedNoteId(note.id)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditAttachments(note.attachments ?? [])
  }

  const handleCloseEditor = () => {
    setSelectedNoteId(null)
    setEditTitle("")
    setEditContent("")
    setEditAttachments([])
  }

  const handleSaveNote = useCallback(async () => {
    if (!selectedNoteId) return
    await updateNote(selectedNoteId, { title: editTitle, content: editContent, attachments: editAttachments })
  }, [selectedNoteId, editTitle, editContent, editAttachments, updateNote])

  const handleSaveAndClose = useCallback(async () => {
    await handleSaveNote()
    handleCloseEditor()
  }, [handleSaveNote])

  const handleDeleteNote = (id: string) => {
    setDeleteConfirmId(id)
  }

  const confirmDeleteNote = async () => {
    if (!deleteConfirmId) return
    await deleteNote(deleteConfirmId)
    toast("Note deleted", "success")
    if (selectedNoteId === deleteConfirmId) {
      setSelectedNoteId(null)
      setEditTitle("")
      setEditContent("")
      setEditAttachments([])
    }
    setDeleteConfirmId(null)
  }

  useEffect(() => {
    if (!selectedNoteId) return
    const timeout = setTimeout(() => { handleSaveNote() }, 800)
    return () => clearTimeout(timeout)
  }, [editTitle, editContent, editAttachments, selectedNoteId, handleSaveNote])

  // Open a specific note when deep-linked from a profile (e.g. /notes?note=<id>)
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null)
  useEffect(() => {
    const noteId = new URLSearchParams(window.location.search).get("note")
    if (noteId) setPendingNoteId(noteId)
  }, [])
  useEffect(() => {
    if (!pendingNoteId || notes.length === 0) return
    const note = notes.find((n) => n.id === pendingNoteId)
    if (note) {
      setSelectedNoteId(note.id)
      setEditTitle(note.title)
      setEditContent(note.content)
      setEditAttachments(note.attachments ?? [])
    }
    setPendingNoteId(null)
  }, [pendingNoteId, notes])

  if (isLoading) return <PageLoader label="Loading notes…" />
  if (fetchError) return <PageError message={fetchError} onRetry={refetch} />

  const getClientIcon = (note: Note) => {
    const client = clients.find((c) => c.id === note.clientId)
    if (!client) return null
    return (
      <div className="flex items-center gap-[6px]">
        <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-[#DBEAFE] text-[7px] font-semibold text-[#2563EB]">
          {client.iconText}
        </div>
        <span className="truncate text-[12px] text-[#555]">{client.name}</span>
      </div>
    )
  }

  if (selectedNoteId && selectedNote) {
    const noteRecordIcon = (() => {
      const client = clients.find((c) => c.id === selectedNote.clientId)
      if (client) return { iconText: client.iconText, name: client.name }
      return { iconText: selectedNote.clientName?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?", name: selectedNote.clientName || "Unknown" }
    })()

    return (
      <NoteEditorModal
        note={selectedNote}
        editTitle={editTitle}
        editContent={editContent}
        editAttachments={editAttachments}
        onEditTitle={setEditTitle}
        onEditContent={setEditContent}
        onEditAttachments={setEditAttachments}
        onClose={handleCloseEditor}
        onSaveAndClose={handleSaveAndClose}
        onDelete={handleDeleteNote}
        onToggleFavorite={toggleFavorite}
        isFavorite={favorites.includes(selectedNote.id)}
        currentUserName={currentUserName}
        recordIcon={noteRecordIcon}
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header row */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[20px] py-[10px]">
        <div className="flex items-center gap-[8px]">
          <span className="text-[14px] font-medium text-[#262626]">Notes</span>
          <div className="flex items-center gap-[4px] rounded-[4px] border border-[#e8e8e8] bg-[#fafafa] px-[8px] py-[4px] text-[12px] font-medium text-[#262626]">
            All
          </div>
          <button
            className="flex h-[24px] w-[24px] items-center justify-center rounded-[4px] text-[#999] transition-colors hover:bg-[#f0f0f0] hover:text-[#555]"
            tabIndex={0}
            aria-label="Add view"
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          </button>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="primary-btn flex items-center gap-[5px] rounded-[6px] px-[12px] py-[6px] text-[13px] font-medium transition-colors"
          tabIndex={0}
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          Add new
        </button>
      </div>

      {/* Filter / display bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[20px] py-[8px]">
        <div className="flex items-center gap-[8px]">
          <div className="relative">
            <button
              ref={filterBtnRef}
              onClick={() => { setIsFilterMenuOpen(!isFilterMenuOpen); setActiveFilterDropdown(null) }}
              className="flex h-[30px] items-center gap-[5px] rounded-[6px] border border-[#e8e8e8] px-[10px] text-[12px] font-medium text-[#555] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <ListFilter className="h-[12px] w-[12px]" strokeWidth={1.5} />
              Filter
            </button>
            {isFilterMenuOpen && (
              <>
                <div className="fixed inset-0 z-[55]" onClick={() => setIsFilterMenuOpen(false)} />
                <div className="absolute left-0 top-full z-[60] mt-[4px] w-[180px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                  <p className="px-[16px] py-[6px] text-[11px] font-medium text-[#888]">Filter by</p>
                  <button
                    onClick={() => { setActiveFilterDropdown("client"); setIsFilterMenuOpen(false) }}
                    className="flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                    tabIndex={0}
                  >
                    <Users className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                    Client
                  </button>
                  <button
                    onClick={() => { setActiveFilterDropdown("creator"); setIsFilterMenuOpen(false) }}
                    className="flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                    tabIndex={0}
                  >
                    <User className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                    Created by
                  </button>
                </div>
              </>
            )}
          </div>
          {clientFilter.length > 0 && (
            <div className="flex items-center gap-[6px] rounded-[6px] border border-[#e8e8e8] px-[8px] py-[4px] text-[12px] font-medium text-[#555]">
              <Users className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
              <button ref={(el) => { filterPillRefs.current["client"] = el }} onClick={() => setActiveFilterDropdown(activeFilterDropdown === "client" ? null : "client")} className="hover:underline" tabIndex={0}>Client</button>
              <span className="text-[#888]">is</span>
              <span>{clientFilter.length} {clientFilter.length === 1 ? "value" : "values"}</span>
              <button onClick={() => setClientFilter([])} className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded text-[#888] transition-colors hover:text-[#262626]" tabIndex={0} aria-label="Clear client filter"><X className="h-[11px] w-[11px]" strokeWidth={1.5} /></button>
            </div>
          )}
          {creatorFilter.length > 0 && (
            <div className="flex items-center gap-[6px] rounded-[6px] border border-[#e8e8e8] px-[8px] py-[4px] text-[12px] font-medium text-[#555]">
              <User className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
              <button ref={(el) => { filterPillRefs.current["creator"] = el }} onClick={() => setActiveFilterDropdown(activeFilterDropdown === "creator" ? null : "creator")} className="hover:underline" tabIndex={0}>Created by</button>
              <span className="text-[#888]">is</span>
              <span>{creatorFilter.length} {creatorFilter.length === 1 ? "value" : "values"}</span>
              <button onClick={() => setCreatorFilter([])} className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded text-[#888] transition-colors hover:text-[#262626]" tabIndex={0} aria-label="Clear creator filter"><X className="h-[11px] w-[11px]" strokeWidth={1.5} /></button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-[8px]">
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex h-[30px] items-center gap-[4px] rounded-[6px] border border-[#e8e8e8] px-[10px] text-[12px] font-medium text-[#555] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              {perPage} per page
              <ChevronDown className="h-[11px] w-[11px] text-[#999]" strokeWidth={1.5} />
            </button>
            {isSortOpen && (
              <div className="absolute right-0 top-full z-50 mt-[4px] w-[120px] rounded-[8px] border border-[#e8e8e8] bg-white py-[4px] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                {perPageOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setPerPage(opt); setIsSortOpen(false) }}
                    className={`flex w-full items-center px-[12px] py-[8px] text-[12px] font-medium transition-colors hover:bg-[#f5f5f5] ${perPage === opt ? "text-[#2563EB]" : "text-[#555]"}`}
                    tabIndex={0}
                  >
                    {opt} per page
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              ref={displayBtnRef}
              onClick={() => setIsDisplayOpen(!isDisplayOpen)}
              className="flex h-[30px] items-center gap-[5px] rounded-[6px] border border-[#e8e8e8] px-[10px] text-[12px] font-medium text-[#555] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <SlidersHorizontal className="h-[12px] w-[12px]" strokeWidth={1.5} />
              Display
            </button>
            {isDisplayOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDisplayOpen(false)} />
                <div
                  className="fixed z-50 w-[380px] rounded-[10px] border border-[#e8e8e8] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                  style={(() => {
                    const rect = displayBtnRef.current?.getBoundingClientRect()
                    if (!rect) return {}
                    return { top: rect.bottom + 4, right: window.innerWidth - rect.right }
                  })()}
                >
                  <div className="border-b border-[#f0f0f0] px-[20px] py-[14px]">
                    <div className="flex items-center gap-[8px]">
                      <button
                        onClick={() => setViewMode("list")}
                        className={`flex flex-1 flex-col items-center gap-[8px] rounded-[12px] border py-[16px] transition-colors ${viewMode === "list" ? "border-[#c0c0c0] bg-white text-[#262626]" : "border-[#e8e8e8] bg-[#fafafa] text-[#bbb] hover:border-[#d0d0d0]"}`}
                        tabIndex={0}
                        aria-label="List view"
                      >
                        <List className="h-[20px] w-[20px]" strokeWidth={1.5} />
                        <span className="text-[13px] font-medium">List</span>
                      </button>
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`flex flex-1 flex-col items-center gap-[8px] rounded-[12px] border py-[16px] transition-colors ${viewMode === "grid" ? "border-[#c0c0c0] bg-white text-[#262626]" : "border-[#e8e8e8] bg-[#fafafa] text-[#bbb] hover:border-[#d0d0d0]"}`}
                        tabIndex={0}
                        aria-label="Card view"
                      >
                        <LayoutGrid className="h-[20px] w-[20px]" strokeWidth={1.5} />
                        <span className="text-[13px] font-medium">Card</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center px-[20px] py-[12px]">
                    <button
                      onClick={() => { setViewMode("grid"); setPerPage(10) }}
                      className="text-[13px] font-medium text-[#bbb] transition-colors hover:text-[#262626]"
                      tabIndex={0}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-[24px] py-[20px]">
        <div className="mb-[24px]">
          <p className="mb-[8px] text-[12px] font-medium text-[#888]">Favorites</p>
          {favoriteNotes.length === 0 ? (
            <div className="flex items-center justify-center rounded-[8px] border border-dashed border-[#dcdcdc] py-[32px]">
              <div className="text-center">
                <p className="text-[14px] font-semibold text-[#262626]">Favorites</p>
                <p className="mt-[4px] text-[12px] text-[#999]">Notes that you favorite will appear here</p>
              </div>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3" : "space-y-[8px]"}>
              {favoriteNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  viewMode={viewMode}
                  isFavorite={true}
                  onSelect={handleSelectNote}
                  onToggleFavorite={toggleFavorite}
                  onDelete={handleDeleteNote}
                  getClientIcon={getClientIcon}
                />
              ))}
            </div>
          )}
        </div>

        {groupedNotes.map((group) => (
          <div key={group.label} className="mb-[24px]">
            <div className="mb-[12px] flex items-center gap-[8px]">
              <p className="text-[12px] font-medium text-[#888]">{group.label}</p>
              <span className="text-[12px] text-[#bbb]">{group.notes.length}</span>
            </div>
            <div className={viewMode === "grid" ? "grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3" : "space-y-[8px]"}>
              {group.notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  viewMode={viewMode}
                  isFavorite={favorites.includes(note.id)}
                  onSelect={handleSelectNote}
                  onToggleFavorite={toggleFavorite}
                  onDelete={handleDeleteNote}
                  getClientIcon={getClientIcon}
                />
              ))}
            </div>
          </div>
        ))}

        {sortedNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-[80px]">
            <FileText className="h-[32px] w-[32px] text-[#ddd]" strokeWidth={1.5} />
            <p className="mt-[12px] text-[14px] font-medium text-[#999]">
              {searchQuery ? "No notes found" : "No notes yet"}
            </p>
            <p className="mt-[4px] text-[12px] text-[#bbb]">
              {searchQuery ? "Try a different search term" : "Create a note to get started"}
            </p>
          </div>
        )}
      </div>

      {/* Filter value dropdowns */}
      {activeFilterDropdown && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setActiveFilterDropdown(null)} />
          {(() => {
            const anchor = filterPillRefs.current[activeFilterDropdown] || filterBtnRef.current
            const rect = anchor?.getBoundingClientRect()
            if (!rect) return null
            const dropdownStyle = { top: rect.bottom + 4, left: rect.left, minWidth: 200 }

            if (activeFilterDropdown === "client") return (
              <div className="fixed z-[60] max-h-[280px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]" style={dropdownStyle}>
                <button onClick={() => { setActiveFilterDropdown(null); setIsFilterMenuOpen(true) }} className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
                  <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
                  <span>Back</span>
                </button>
                <p className="px-[16px] py-[4px] text-[11px] font-medium text-[#888]">Filter by client</p>
                {uniqueNoteClients.map((name) => {
                  const isActive = clientFilter.includes(name)
                  return (
                    <button key={name} onClick={() => setClientFilter((prev) => isActive ? prev.filter((f) => f !== name) : [...prev, name])} className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-[#f5f5f5]" : ""}`} tabIndex={0}>
                      <div className={`flex h-[16px] w-[16px] items-center justify-center rounded border ${isActive ? "border-[#2563EB] bg-[#2563EB]" : "border-[#d0d0d0]"}`}>
                        {isActive && <span className="text-[10px] text-white">✓</span>}
                      </div>
                      <span className="text-[#262626]">{name}</span>
                    </button>
                  )
                })}
                {uniqueNoteClients.length === 0 && <p className="px-[16px] py-[8px] text-[13px] text-[#888]">No clients</p>}
                <div className="border-t border-[#f0f0f0] px-[8px] py-[4px]">
                  <button onClick={() => { setClientFilter([]); setActiveFilterDropdown(null) }} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>Clear</button>
                </div>
              </div>
            )

            if (activeFilterDropdown === "creator") return (
              <div className="fixed z-[60] max-h-[280px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]" style={dropdownStyle}>
                <button onClick={() => { setActiveFilterDropdown(null); setIsFilterMenuOpen(true) }} className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
                  <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
                  <span>Back</span>
                </button>
                <p className="px-[16px] py-[4px] text-[11px] font-medium text-[#888]">Filter by creator</p>
                {uniqueNoteCreators.map((name) => {
                  const isActive = creatorFilter.includes(name)
                  return (
                    <button key={name} onClick={() => setCreatorFilter((prev) => isActive ? prev.filter((f) => f !== name) : [...prev, name])} className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-[#f5f5f5]" : ""}`} tabIndex={0}>
                      <div className={`flex h-[16px] w-[16px] items-center justify-center rounded border ${isActive ? "border-[#2563EB] bg-[#2563EB]" : "border-[#d0d0d0]"}`}>
                        {isActive && <span className="text-[10px] text-white">✓</span>}
                      </div>
                      <span className="text-[#262626]">{name}</span>
                    </button>
                  )
                })}
                {uniqueNoteCreators.length === 0 && <p className="px-[16px] py-[8px] text-[13px] text-[#888]">No creators</p>}
                <div className="border-t border-[#f0f0f0] px-[8px] py-[4px]">
                  <button onClick={() => { setCreatorFilter([]); setActiveFilterDropdown(null) }} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>Clear</button>
                </div>
              </div>
            )

            return null
          })()}
        </>
      )}

      {isModalOpen && (
        <RecordPickerModal
          records={allRecords}
          onSelect={handleSelectRecord}
          onClose={() => setIsModalOpen(false)}
        />
      )}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Delete note"
        description="This note will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDeleteNote}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  )
}

function NoteCard({ note, viewMode, isFavorite, onSelect, onToggleFavorite, onDelete, getClientIcon }: {
  note: Note
  viewMode: "grid" | "list"
  isFavorite: boolean
  onSelect: (note: Note) => void
  onToggleFavorite: (id: string) => void
  onDelete: (id: string) => void
  getClientIcon: (note: Note) => React.ReactNode
}) {
  if (viewMode === "list") {
    return (
      <div
        role="button"
        onClick={() => onSelect(note)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(note) } }}
        className="group flex w-full cursor-pointer items-center gap-[16px] rounded-[8px] border border-[#f0f0f0] bg-white px-[16px] py-[12px] text-left transition-all hover:border-[#e0e0e0] hover:shadow-sm"
        tabIndex={0}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[8px]">
            {getClientIcon(note)}
          </div>
          <p className="mt-[4px] truncate text-[13px] font-semibold text-[#262626]">{note.title || "Untitled note"}</p>
          <p className="mt-[2px] truncate text-[12px] text-[#999]">{note.content || "This note has no content."}</p>
        </div>
        <div className="flex shrink-0 items-center gap-[12px]">
          <div className="flex items-center gap-[6px]">
            <div className="h-[6px] w-[6px] rounded-full bg-[#34d399]" />
            <span className="text-[11px] text-[#888]">{note.createdBy || "Unknown"}</span>
          </div>
          <span className="text-[11px] text-[#bbb]">{formatDate(note.createdAt)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(note.id) }}
            className={`flex h-[24px] w-[24px] items-center justify-center rounded-[4px] transition-colors ${isFavorite ? "text-amber-400" : "text-[#ddd] opacity-0 group-hover:opacity-100"} hover:text-amber-400`}
            tabIndex={-1}
            aria-label="Toggle favorite"
          >
            <Star className="h-[12px] w-[12px]" strokeWidth={1.5} fill={isFavorite ? "#fbbf24" : "none"} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(note.id) }}
            className="flex h-[24px] w-[24px] items-center justify-center rounded-[4px] text-[#ddd] opacity-0 transition-colors hover:text-red-400 group-hover:opacity-100"
            tabIndex={-1}
            aria-label="Delete note"
          >
            <Trash2 className="h-[12px] w-[12px]" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      role="button"
      onClick={() => onSelect(note)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(note) } }}
      className="group flex min-h-[180px] w-full cursor-pointer flex-col rounded-[8px] border border-[#f0f0f0] bg-white p-[20px] text-left transition-all hover:border-[#e0e0e0] hover:shadow-sm"
      tabIndex={0}
    >
      <div className="mb-[10px] flex items-center justify-between">
        <div className="min-w-0 flex-1">
          {getClientIcon(note) || <div className="h-[18px]" />}
        </div>
        <div className="flex items-center gap-[2px]">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(note.id) }}
            className={`flex h-[22px] w-[22px] items-center justify-center rounded-[4px] transition-colors ${isFavorite ? "text-amber-400" : "text-[#ddd] opacity-0 group-hover:opacity-100"} hover:text-amber-400`}
            tabIndex={-1}
            aria-label="Toggle favorite"
          >
            <Star className="h-[11px] w-[11px]" strokeWidth={1.5} fill={isFavorite ? "#fbbf24" : "none"} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(note.id) }}
            className="flex h-[22px] w-[22px] items-center justify-center rounded-[4px] text-[#ddd] opacity-0 transition-colors hover:text-red-400 group-hover:opacity-100"
            tabIndex={-1}
            aria-label="Delete note"
          >
            <Trash2 className="h-[11px] w-[11px]" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <p className="text-[13px] font-semibold text-[#262626]">{note.title || "Untitled note"}</p>
      <p className="mt-[4px] text-[12px] leading-[1.5] text-[#999]">
        {truncate(note.content || "This note has no content.", 80)}
      </p>

      <div className="mt-auto flex items-center justify-between pt-[14px]">
        <div className="flex items-center gap-[6px]">
          <div className="h-[6px] w-[6px] rounded-full bg-[#34d399]" />
          <span className="text-[11px] text-[#888]">{note.createdBy || "Unknown"}</span>
        </div>
        <span className="text-[11px] text-[#bbb]">{formatDate(note.createdAt)}</span>
      </div>
    </div>
  )
}
