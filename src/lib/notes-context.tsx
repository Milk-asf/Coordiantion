"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { Attachment, Note } from "@/lib/types"

interface NoteRow {
  id: string
  workspace_id: string
  title: string
  content: string
  client_id: string | null
  client_name: string
  staff_id: string | null
  attachments: Attachment[] | null
  created_by: string
  created_at: string
  updated_at: string
}

function storageKey(workspaceId: string | undefined) {
  return workspaceId ? `workspace-notes-${workspaceId}` : "workspace-notes"
}

function dbToNote(row: NoteRow): Note {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    content: row.content,
    clientId: row.client_id,
    clientName: row.client_name,
    staffId: row.staff_id ?? null,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function migrateLegacyNote(raw: Record<string, unknown>, workspaceId: string): Note {
  return {
    id: String(raw.id),
    workspaceId: typeof raw.workspaceId === "string" ? raw.workspaceId : workspaceId,
    title: typeof raw.title === "string" ? raw.title : "",
    content: typeof raw.content === "string" ? raw.content : "",
    clientId: typeof raw.clientId === "string" ? raw.clientId : null,
    clientName: typeof raw.clientName === "string" ? raw.clientName : "",
    staffId: typeof raw.staffId === "string" ? raw.staffId : null,
    attachments: Array.isArray(raw.attachments) ? (raw.attachments as Attachment[]) : [],
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : "",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  }
}

function loadLocalNotes(workspaceId: string | undefined): Note[] {
  if (typeof window === "undefined" || !workspaceId) return []
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Record<string, unknown>[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((entry) => migrateLegacyNote(entry, workspaceId))
  } catch {
    return []
  }
}

function saveLocalNotes(workspaceId: string | undefined, notes: Note[]) {
  if (typeof window === "undefined" || !workspaceId) return
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(notes))
}

interface NotesContextValue {
  notes: Note[]
  isLoading: boolean
  fetchError: string | null
  addNote: (input: {
    title: string
    content: string
    clientId?: string | null
    clientName?: string
    staffId?: string | null
    createdBy: string
  }) => Promise<Note | null>
  updateNote: (
    id: string,
    updates: {
      title?: string
      content?: string
      clientId?: string | null
      clientName?: string
      staffId?: string | null
      attachments?: Attachment[]
    }
  ) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

const NotesContext = createContext<NotesContextValue | null>(null)

export function NotesProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace } = useWorkspace()
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const persistLocal = useCallback((updater: Note[] | ((prev: Note[]) => Note[])) => {
    setNotes((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater
      saveLocalNotes(activeWorkspace?.id, next)
      return next
    })
  }, [activeWorkspace?.id])

  const fetchNotes = useCallback(async () => {
    if (!activeWorkspace) {
      setNotes([])
      setIsLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setNotes(loadLocalNotes(activeWorkspace.id))
      setFetchError(null)
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    if (!supabase) {
      setNotes(loadLocalNotes(activeWorkspace.id))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setFetchError(null)

    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("updated_at", { ascending: false })

      if (error || !data) {
        setFetchError(error?.message || "Failed to load notes")
        setNotes(loadLocalNotes(activeWorkspace.id))
      } else {
        setNotes((data as NoteRow[]).map(dbToNote))
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load notes")
      setNotes(loadLocalNotes(activeWorkspace.id))
    }

    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const addNote = useCallback(async (input: {
    title: string
    content: string
    clientId?: string | null
    clientName?: string
    staffId?: string | null
    createdBy: string
  }): Promise<Note | null> => {
    if (!activeWorkspace) return null

    const now = new Date().toISOString()
    const localNote: Note = {
      id: crypto.randomUUID(),
      workspaceId: activeWorkspace.id,
      title: input.title,
      content: input.content,
      clientId: input.clientId ?? null,
      clientName: input.clientName ?? "",
      staffId: input.staffId ?? null,
      attachments: [],
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    }

    if (!isSupabaseConfigured()) {
      persistLocal((prev) => [localNote, ...prev])
      return localNote
    }

    const supabase = createClient()
    if (!supabase) {
      persistLocal((prev) => [localNote, ...prev])
      return localNote
    }

    const row = {
      workspace_id: activeWorkspace.id,
      title: input.title,
      content: input.content,
      client_id: input.clientId ?? null,
      client_name: input.clientName ?? "",
      staff_id: input.staffId ?? null,
      attachments: [],
      created_by: input.createdBy,
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await supabase
      .from("notes")
      .insert(row)
      .select("*")
      .single()

    if (error || !data) {
      persistLocal((prev) => [localNote, ...prev])
      return localNote
    }

    const note = dbToNote(data as NoteRow)
    setNotes((prev) => [note, ...prev])
    return note
  }, [activeWorkspace, persistLocal])

  const updateNote = useCallback(async (
    id: string,
    updates: {
      title?: string
      content?: string
      clientId?: string | null
      clientName?: string
      staffId?: string | null
      attachments?: Attachment[]
    }
  ) => {
    if (!activeWorkspace) return

    const updatedAt = new Date().toISOString()
    const applyUpdates = (note: Note): Note => ({
      ...note,
      ...updates,
      updatedAt,
    })

    if (!isSupabaseConfigured()) {
      persistLocal((prev) => prev.map((note) => (note.id === id ? applyUpdates(note) : note)))
      return
    }

    const supabase = createClient()
    if (!supabase) {
      persistLocal((prev) => prev.map((note) => (note.id === id ? applyUpdates(note) : note)))
      return
    }

    const dbUpdates: Record<string, unknown> = { updated_at: updatedAt }
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.content !== undefined) dbUpdates.content = updates.content
    if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId
    if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName
    if (updates.staffId !== undefined) dbUpdates.staff_id = updates.staffId
    if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments

    const { error } = await supabase.from("notes").update(dbUpdates).eq("id", id)

    if (error) {
      persistLocal((prev) => prev.map((note) => (note.id === id ? applyUpdates(note) : note)))
      return
    }

    setNotes((prev) => prev.map((note) => (note.id === id ? applyUpdates(note) : note)))
  }, [activeWorkspace, persistLocal])

  const deleteNote = useCallback(async (id: string) => {
    if (!activeWorkspace) return

    if (!isSupabaseConfigured()) {
      persistLocal((prev) => prev.filter((note) => note.id !== id))
      return
    }

    const supabase = createClient()
    if (!supabase) {
      persistLocal((prev) => prev.filter((note) => note.id !== id))
      return
    }

    const { error } = await supabase.from("notes").delete().eq("id", id)

    if (error) {
      persistLocal((prev) => prev.filter((note) => note.id !== id))
      return
    }

    setNotes((prev) => prev.filter((note) => note.id !== id))
  }, [activeWorkspace, persistLocal])

  return (
    <NotesContext.Provider
      value={{
        notes,
        isLoading,
        fetchError,
        addNote,
        updateNote,
        deleteNote,
        refetch: fetchNotes,
      }}
    >
      {children}
    </NotesContext.Provider>
  )
}

export function useNotesContext() {
  const ctx = useContext(NotesContext)
  if (!ctx) throw new Error("useNotesContext must be used within NotesProvider")
  return ctx
}
