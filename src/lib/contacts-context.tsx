"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { Contact } from "@/lib/types"

/* eslint-disable @typescript-eslint/no-explicit-any */
function dbToContact(row: any): Contact {
  return {
    id: row.id,
    clientId: row.client_id || null,
    clientName: row.client_name || "",
    name: row.name,
    relationship: row.relationship || "",
    email: row.email || "",
    phone: row.phone || "",
  }
}

const PAGE_SIZE = 50

interface ContactsContextValue {
  contacts: Contact[]
  isLoading: boolean
  fetchError: string | null
  hasMore: boolean
  isLoadingMore: boolean
  loadMore: () => Promise<void>
  addContact: (input: Omit<Contact, "id">) => Promise<Contact | null>
  bulkAddContacts: (inputs: Omit<Contact, "id">[]) => Promise<Contact[]>
  updateContact: (id: string, updates: Partial<Contact>) => Promise<void>
  deleteContact: (id: string) => Promise<void>
  getContactsForClient: (clientName: string) => Contact[]
  refetch: () => Promise<void>
}

const ContactsContext = createContext<ContactsContextValue | null>(null)

export function ContactsProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace } = useWorkspace()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const fetchContacts = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
      setContacts([])
      setIsLoading(false)
      setHasMore(false)
      return
    }
    const supabase = createClient()
    if (!supabase) { setContacts([]); setIsLoading(false); setHasMore(false); return }

    setIsLoading(true)
    setFetchError(null)
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: true })
        .range(0, PAGE_SIZE - 1)

      if (error) {
        setFetchError(error.message)
        setContacts([])
        setHasMore(false)
      } else {
        const rows = data || []
        setContacts(rows.map(dbToContact))
        setHasMore(rows.length === PAGE_SIZE)
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load contacts")
      setContacts([])
      setHasMore(false)
    }
    setIsLoading(false)
  }, [activeWorkspace])

  const loadMore = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured() || !hasMore || isLoadingMore) return
    const supabase = createClient()
    if (!supabase) return

    setIsLoadingMore(true)
    try {
      const offset = contacts.length
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)

      if (!error && data) {
        setContacts((prev) => [...prev, ...data.map(dbToContact)])
        setHasMore(data.length === PAGE_SIZE)
      }
    } catch {
      // silently fail on load-more
    }
    setIsLoadingMore(false)
  }, [activeWorkspace, hasMore, isLoadingMore, contacts.length])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const addContact = useCallback(async (input: Omit<Contact, "id">) => {
    const base = {
      clientId: input.clientId || null,
      clientName: input.clientName,
      name: input.name,
      relationship: input.relationship,
      email: input.email,
      phone: input.phone,
    }

    if (!activeWorkspace || !isSupabaseConfigured()) return null
    const supabase = createClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        workspace_id: activeWorkspace.id,
        client_id: base.clientId,
        client_name: base.clientName,
        name: base.name,
        relationship: base.relationship,
        email: base.email,
        phone: base.phone,
      })
      .select()
      .single()

    if (!error && data) {
      const newContact = dbToContact(data)
      setContacts((prev) => [...prev, newContact])
      return newContact
    }
    return null
  }, [activeWorkspace])

  const bulkAddContacts = useCallback(async (inputs: Omit<Contact, "id">[]): Promise<Contact[]> => {
    if (!activeWorkspace || !isSupabaseConfigured() || inputs.length === 0) return []
    const supabase = createClient()
    if (!supabase) return []

    const rows = inputs.map((input) => ({
      workspace_id: activeWorkspace.id,
      client_id: input.clientId || null,
      client_name: input.clientName,
      name: input.name,
      relationship: input.relationship,
      email: input.email,
      phone: input.phone,
    }))

    const { data, error } = await supabase.from("contacts").insert(rows).select()
    if (error) {
      console.error("Bulk insert contacts failed:", error.message)
      return []
    }

    const newContacts = (data || []).map(dbToContact)
    setContacts((prev) => [...prev, ...newContacts])
    return newContacts
  }, [activeWorkspace])

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    setContacts((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const dbUpdates: Record<string, any> = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName
    if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId
    if (updates.relationship !== undefined) dbUpdates.relationship = updates.relationship
    if (updates.email !== undefined) dbUpdates.email = updates.email
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone

    await supabase.from("contacts").update(dbUpdates).eq("id", id)
  }, [])

  const deleteContact = useCallback(async (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("contacts").delete().eq("id", id)
  }, [])

  const getContactsForClient = useCallback((clientName: string) => {
    return contacts.filter((c) => c.clientName === clientName)
  }, [contacts])

  return (
    <ContactsContext.Provider value={{ contacts, isLoading, fetchError, hasMore, isLoadingMore, loadMore, addContact, bulkAddContacts, updateContact, deleteContact, getContactsForClient, refetch: fetchContacts }}>
      {children}
    </ContactsContext.Provider>
  )
}

export function useContacts() {
  const ctx = useContext(ContactsContext)
  if (!ctx) throw new Error("useContacts must be used within ContactsProvider")
  return ctx
}
