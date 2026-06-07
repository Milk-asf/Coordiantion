"use client"

import { useState, useEffect, useCallback } from "react"
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
  attachments: Attachment[] | null
  created_by: string
  created_at: string
  updated_at: string
}

function dbToNote(row: NoteRow): Note {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    content: row.content,
    clientId: row.client_id,
    clientName: row.client_name,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function useNotes() {
  const { activeWorkspace } = useWorkspace()
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchNotes = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
      setNotes([])
      setIsLoading(false)
      return
    }
    const supabase = createClient()
    if (!supabase) { setNotes([]); setIsLoading(false); return }

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
        setNotes([])
        setIsLoading(false)
        return
      }

      setNotes((data as NoteRow[]).map(dbToNote))
    } catch (err) {
      console.error("Failed to fetch notes:", err)
      setFetchError(err instanceof Error ? err.message : "Failed to load notes")
      setNotes([])
    }
    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const addNote = useCallback(async (input: {
    title: string
    content: string
    clientId?: string | null
    clientName?: string
    createdBy: string
  }): Promise<Note | null> => {
    if (!activeWorkspace || !isSupabaseConfigured()) return null
    const supabase = createClient()
    if (!supabase) return null

    const now = new Date().toISOString()
    const row: Omit<NoteRow, "id"> = {
      workspace_id: activeWorkspace.id,
      title: input.title,
      content: input.content,
      client_id: input.clientId ?? null,
      client_name: input.clientName ?? "",
      attachments: [],
      created_by: input.createdBy,
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await supabase
      .from("notes")
      .insert(row)
      .select()
      .single()

    if (error || !data) return null

    const note = dbToNote(data as NoteRow)
    setNotes((prev) => [note, ...prev])
    return note
  }, [activeWorkspace])

  const updateNote = useCallback(async (id: string, updates: { title?: string; content?: string; clientId?: string | null; clientName?: string; attachments?: Attachment[] }) => {
    if (!activeWorkspace || !isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.content !== undefined) dbUpdates.content = updates.content
    if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId
    if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName
    if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments

    await supabase.from("notes").update(dbUpdates).eq("id", id)

    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, ...updates, updatedAt: dbUpdates.updated_at as string } : n))
  }, [activeWorkspace])

  const deleteNote = useCallback(async (id: string) => {
    if (!activeWorkspace || !isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    await supabase.from("notes").delete().eq("id", id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [activeWorkspace])

  return {
    notes,
    isLoading,
    fetchError,
    addNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes,
  }
}
