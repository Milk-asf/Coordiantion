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

interface ContactsContextValue {
  contacts: Contact[]
  isLoading: boolean
  addContact: (input: Omit<Contact, "id">) => Promise<Contact | null>
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

  const fetchContacts = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
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
    const base = {
      clientId: input.clientId || null,
      clientName: input.clientName,
      name: input.name,
      relationship: input.relationship,
      email: input.email,
      phone: input.phone,
    }

    if (activeWorkspace && isSupabaseConfigured()) {
      const supabase = createClient()
      if (supabase) {
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
      }
    }

    const localContact: Contact = { id: crypto.randomUUID(), ...base }
    setContacts((prev) => [...prev, localContact])
    return localContact
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
    <ContactsContext.Provider value={{ contacts, isLoading, addContact, updateContact, deleteContact, getContactsForClient, refetch: fetchContacts }}>
      {children}
    </ContactsContext.Provider>
  )
}

export function useContacts() {
  const ctx = useContext(ContactsContext)
  if (!ctx) throw new Error("useContacts must be used within ContactsProvider")
  return ctx
}
