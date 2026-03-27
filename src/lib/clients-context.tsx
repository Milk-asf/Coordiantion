"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import { emptyParticipant } from "@/lib/types"
import type { Client, ParticipantDetails } from "@/lib/types"

/* eslint-disable @typescript-eslint/no-explicit-any */
function deriveDisplayName(participant: ParticipantDetails, fallbackName: string): string {
  const first = participant.firstName?.trim()
  const last = participant.lastName?.trim()
  if (first && last) return `${first} ${last}`
  if (first) return first
  return fallbackName || ""
}

function deriveInitials(participant: ParticipantDetails, fallbackName: string): string {
  const first = participant.firstName?.trim()
  const last = participant.lastName?.trim()
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
  if (first) return first[0].toUpperCase()
  const parts = fallbackName.split(" ").filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return fallbackName?.[0]?.toUpperCase() || "?"
}

function dbToClient(row: any): Client {
  const participant = { ...emptyParticipant, ...(row.participant || {}) }
  return {
    id: row.id,
    name: row.name,
    displayName: deriveDisplayName(participant, row.name),
    iconColor: row.icon_color || "#6b7280",
    iconText: deriveInitials(participant, row.name),
    iconShape: row.icon_shape || "square",
    participant,
    industry: row.industry || [],
    lastInteraction: row.last_interaction || "",
    revenue: row.revenue || "",
    headcount: row.headcount || "",
    lastFunding: row.last_funding || "",
    website: row.website || "",
    owner: row.owner || "",
    assignedTo: row.assigned_to || null,
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
  updateParticipantField: (id: string, field: keyof ParticipantDetails, value: string) => Promise<void>
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
      setClients([])
      setIsLoading(false)
      return
    }
    const supabase = createClient()
    if (!supabase) { setClients([]); setIsLoading(false); return }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: true })

      if (error || !data) {
        setClients([])
      } else {
        setClients(data.map(dbToClient))
      }
    } catch {
      setClients([])
    }
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
      assignedTo: null,
      summary: "",
      about: "",
    }

    if (!activeWorkspace || !isSupabaseConfigured()) return null
    const supabase = createClient()
    if (!supabase) return null

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
    return null
  }, [activeWorkspace])

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    setClients((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const dbUpdates: Record<string, any> = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.iconColor !== undefined) dbUpdates.icon_color = updates.iconColor
    if (updates.iconText !== undefined) dbUpdates.icon_text = updates.iconText
    if (updates.iconShape !== undefined) dbUpdates.icon_shape = updates.iconShape
    if (updates.participant !== undefined) dbUpdates.participant = updates.participant
    if (updates.industry !== undefined) dbUpdates.industry = updates.industry
    if (updates.owner !== undefined) dbUpdates.owner = updates.owner
    if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo
    if (updates.summary !== undefined) dbUpdates.summary = updates.summary
    if (updates.about !== undefined) dbUpdates.about = updates.about
    if (updates.revenue !== undefined) dbUpdates.revenue = updates.revenue
    if (updates.headcount !== undefined) dbUpdates.headcount = updates.headcount
    if (updates.website !== undefined) dbUpdates.website = updates.website

    if (Object.keys(dbUpdates).length === 0) return

    const { error } = await supabase.from("clients").update(dbUpdates).eq("id", id)
    if (error) {
      console.error("Failed to update client:", error.message)
      fetchClients()
    }
  }, [fetchClients])

  const updateParticipantField = useCallback(async (id: string, field: keyof ParticipantDetails, value: string) => {
    let mergedParticipant: ParticipantDetails | null = null

    setClients((prev) => prev.map((c) => {
      if (c.id !== id) return c
      mergedParticipant = { ...c.participant, [field]: value }
      return {
        ...c,
        participant: mergedParticipant,
        displayName: deriveDisplayName(mergedParticipant, c.name),
        iconText: deriveInitials(mergedParticipant, c.name),
      }
    }))

    if (!mergedParticipant || !isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const { error } = await supabase.from("clients").update({ participant: mergedParticipant }).eq("id", id)
    if (error) {
      console.error("Failed to update participant field:", error.message)
      fetchClients()
    }
  }, [fetchClients])

  const deleteClient = useCallback(async (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("clients").delete().eq("id", id)
  }, [])

  const clientNames = clients.map((c) => c.name)

  return (
    <ClientsContext.Provider value={{ clients, clientNames, isLoading, addClient, updateClient, updateParticipantField, deleteClient, refetch: fetchClients }}>
      {children}
    </ClientsContext.Provider>
  )
}

export function useClients() {
  const ctx = useContext(ClientsContext)
  if (!ctx) throw new Error("useClients must be used within ClientsProvider")
  return ctx
}
