"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import { emptyParticipant } from "@/lib/types"
import { dummyClients } from "@/lib/dummy-data"
import type { Client, ParticipantDetails } from "@/lib/types"

/* eslint-disable @typescript-eslint/no-explicit-any */
function dbToClient(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    iconColor: row.icon_color || "#6b7280",
    iconText: row.icon_text || row.name?.[0]?.toUpperCase() || "?",
    iconShape: row.icon_shape || "square",
    participant: { ...emptyParticipant, ...(row.participant || {}) },
    industry: row.industry || [],
    lastInteraction: row.last_interaction || "",
    revenue: row.revenue || "",
    headcount: row.headcount || "",
    lastFunding: row.last_funding || "",
    website: row.website || "",
    owner: row.owner || "",
    summary: row.summary || "",
    about: row.about || "",
  }
}

interface ClientsContextValue {
  clients: Client[]
  clientNames: string[]
  isLoading: boolean
  addClient: (input: {
    name: string
    iconColor?: string
    iconText?: string
    iconShape?: "square" | "circle"
    participant?: Partial<ParticipantDetails>
    industry?: string[]
  }) => Promise<Client | null>
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

const ClientsContext = createContext<ClientsContextValue | null>(null)

export function ClientsProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace } = useWorkspace()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchClients = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
      setClients(dummyClients)
      setIsLoading(false)
      return
    }
    const supabase = createClient()
    if (!supabase) { setClients(dummyClients); setIsLoading(false); return }

    setIsLoading(true)
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("workspace_id", activeWorkspace.id)
      .order("created_at", { ascending: true })

    const fetched = (data || []).map(dbToClient)
    setClients(fetched.length > 0 ? fetched : dummyClients)
    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => { fetchClients() }, [fetchClients])

  const addClient = useCallback(async (input: {
    name: string
    iconColor?: string
    iconText?: string
    iconShape?: "square" | "circle"
    participant?: Partial<ParticipantDetails>
    industry?: string[]
  }) => {
    const participant = { ...emptyParticipant, ...(input.participant || {}) }
    const base = {
      name: input.name,
      iconColor: input.iconColor || "#6b7280",
      iconText: input.iconText || input.name[0]?.toUpperCase() || "?",
      iconShape: (input.iconShape || "square") as "square" | "circle",
      participant,
      industry: input.industry || [],
      lastInteraction: "",
      revenue: "",
      headcount: "",
      lastFunding: "",
      website: "",
      owner: "",
      summary: "",
      about: "",
    }

    if (activeWorkspace && isSupabaseConfigured()) {
      const supabase = createClient()
      if (supabase) {
        const { data, error } = await supabase
          .from("clients")
          .insert({
            workspace_id: activeWorkspace.id,
            name: input.name,
            icon_color: base.iconColor,
            icon_text: base.iconText,
            icon_shape: base.iconShape,
            participant,
            industry: base.industry,
          })
          .select()
          .single()

        if (!error && data) {
          const newClient = dbToClient(data)
          setClients((prev) => [...prev, newClient])
          return newClient
        }
      }
    }

    const localClient: Client = { id: crypto.randomUUID(), ...base }
    setClients((prev) => [...prev, localClient])
    return localClient
  }, [activeWorkspace])

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    setClients((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.iconColor !== undefined) dbUpdates.icon_color = updates.iconColor
    if (updates.iconText !== undefined) dbUpdates.icon_text = updates.iconText
    if (updates.iconShape !== undefined) dbUpdates.icon_shape = updates.iconShape
    if (updates.participant !== undefined) dbUpdates.participant = updates.participant
    if (updates.industry !== undefined) dbUpdates.industry = updates.industry
    if (updates.owner !== undefined) dbUpdates.owner = updates.owner
    if (updates.summary !== undefined) dbUpdates.summary = updates.summary
    if (updates.about !== undefined) dbUpdates.about = updates.about
    if (updates.revenue !== undefined) dbUpdates.revenue = updates.revenue
    if (updates.headcount !== undefined) dbUpdates.headcount = updates.headcount
    if (updates.website !== undefined) dbUpdates.website = updates.website

    await supabase.from("clients").update(dbUpdates).eq("id", id)
  }, [])

  const deleteClient = useCallback(async (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("clients").delete().eq("id", id)
  }, [])

  const clientNames = clients.map((c) => c.name)

  return (
    <ClientsContext.Provider value={{ clients, clientNames, isLoading, addClient, updateClient, deleteClient, refetch: fetchClients }}>
      {children}
    </ClientsContext.Provider>
  )
}

export function useClients() {
  const ctx = useContext(ClientsContext)
  if (!ctx) throw new Error("useClients must be used within ClientsProvider")
  return ctx
}
