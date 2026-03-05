"use client"

import { useState, useEffect, useCallback } from "react"
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

export function useContacts() {
  const { activeWorkspace } = useWorkspace()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchContacts = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
      setContacts([])
      setIsLoading(false)
      return
    }
    const supabase = createClient()
    if (!supabase) { setIsLoading(false); return }

    setIsLoading(true)
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("workspace_id", activeWorkspace.id)
      .order("created_at", { ascending: true })

    setContacts((data || []).map(dbToContact))
    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const addContact = useCallback(async (input: Omit<Contact, "id">) => {
    if (!activeWorkspace || !isSupabaseConfigured()) return null
    const supabase = createClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        workspace_id: activeWorkspace.id,
        client_id: input.clientId || null,
        client_name: input.clientName,
        name: input.name,
        relationship: input.relationship,
        email: input.email,
        phone: input.phone,
      })
      .select()
      .single()

    if (error || !data) return null
    const newContact = dbToContact(data)
    setContacts((prev) => [...prev, newContact])
    return newContact
  }, [activeWorkspace])

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
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
    setContacts((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c))
  }, [])

  const deleteContact = useCallback(async (id: string) => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("contacts").delete().eq("id", id)
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const getContactsForClient = useCallback((clientName: string) => {
    return contacts.filter((c) => c.clientName === clientName)
  }, [contacts])

  return { contacts, isLoading, addContact, updateContact, deleteContact, getContactsForClient, refetch: fetchContacts }
}
