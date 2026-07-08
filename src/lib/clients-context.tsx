"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import { emptyParticipant } from "@/lib/types"
import type { Client, ParticipantDetails } from "@/lib/types"

interface ClientRow {
  id: string
  name: string
  icon_color: string | null
  icon_text: string | null
  icon_shape: "square" | "circle" | null
  participant: Partial<ParticipantDetails> | null
  industry: string[] | null
  last_interaction: string | null
  revenue: string | null
  headcount: string | null
  last_funding: string | null
  website: string | null
  owner: string | null
  assigned_to: string | null
  summary: string | null
  about: string | null
  status: string | null
}

interface ClientRowUpdate {
  name?: string
  icon_color?: string
  icon_text?: string
  icon_shape?: "square" | "circle"
  participant?: ParticipantDetails
  industry?: string[]
  owner?: string
  assigned_to?: string | null
  summary?: string
  about?: string
  revenue?: string
  headcount?: string
  website?: string
  status?: string
}

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

function dbToClient(row: ClientRow): Client {
  const participant = { ...emptyParticipant, ...(row.participant || {}) }
  return {
    id: row.id,
    name: row.name,
    displayName: deriveDisplayName(participant, row.name),
    iconColor: row.icon_color || "#6b7280",
    iconText: deriveInitials(participant, row.name),
    iconShape: row.icon_shape || "square",
    participant,
    industry: Array.isArray(row.industry) ? row.industry : [],
    lastInteraction: row.last_interaction || "",
    revenue: row.revenue || "",
    headcount: row.headcount || "",
    lastFunding: row.last_funding || "",
    website: row.website || "",
    owner: row.owner || "",
    assignedTo: row.assigned_to || null,
    summary: row.summary || "",
    about: row.about || "",
    status: (row.status === "archived" ? "archived" : "active") as "active" | "archived",
  }
}

const PAGE_SIZE = 50

function isTransientFetchError(message: string | undefined): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    m.includes("failed to fetch") ||
    m.includes("fetch failed") ||
    m.includes("network") ||
    m.includes("load failed") ||
    m.includes("timeout") ||
    m.includes("timed out")
  )
}

type SupabaseClientInstance = NonNullable<ReturnType<typeof createClient>>

async function updateClientRowWithRetry(
  supabase: SupabaseClientInstance,
  id: string,
  dbUpdates: Record<string, unknown>,
  attempts = 3,
): Promise<{ error: { message: string } | null; transient: boolean }> {
  let lastError: { message: string } | null = null
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const { error } = await supabase.from("clients").update(dbUpdates).eq("id", id)
      if (!error) return { error: null, transient: false }
      lastError = error
      if (!isTransientFetchError(error.message)) return { error, transient: false }
    } catch (err) {
      lastError = { message: err instanceof Error ? err.message : String(err) }
      if (!isTransientFetchError(lastError.message)) return { error: lastError, transient: false }
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 300 * attempt))
  }
  return { error: lastError, transient: true }
}

interface ClientsContextValue {
  clients: Client[]
  clientNames: string[]
  isLoading: boolean
  fetchError: string | null
  hasMore: boolean
  isLoadingMore: boolean
  loadMore: () => Promise<void>
  addClient: (input: {
    name: string
    iconColor?: string
    iconText?: string
    iconShape?: "square" | "circle"
    participant?: Partial<ParticipantDetails>
    industry?: string[]
  }) => Promise<Client | null>
  bulkAddClients: (inputs: { name: string; participant: Partial<ParticipantDetails> }[]) => Promise<Client[]>
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>
  updateParticipantField: (id: string, field: keyof ParticipantDetails, value: string) => Promise<void>
  updateParticipantFields: (id: string, fields: Partial<ParticipantDetails>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

const ClientsContext = createContext<ClientsContextValue | null>(null)

export function ClientsProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace } = useWorkspace()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const fetchClients = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
      setClients([])
      setIsLoading(false)
      setHasMore(false)
      return
    }
    const supabase = createClient()
    if (!supabase) { setClients([]); setIsLoading(false); setHasMore(false); return }

    setIsLoading(true)
    setFetchError(null)
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: true })
        .range(0, PAGE_SIZE - 1)

      if (error) {
        setFetchError(error.message)
        setClients([])
        setHasMore(false)
      } else {
        const rows = data || []
        setClients(rows.map(dbToClient))
        setHasMore(rows.length === PAGE_SIZE)
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load clients")
      setClients([])
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
      const offset = clients.length
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)

      if (!error && data) {
        setClients((prev) => [...prev, ...data.map(dbToClient)])
        setHasMore(data.length === PAGE_SIZE)
      }
    } catch {
      // silently fail on load-more
    }
    setIsLoadingMore(false)
  }, [activeWorkspace, hasMore, isLoadingMore, clients.length])

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

  const bulkAddClients = useCallback(async (inputs: { name: string; participant: Partial<ParticipantDetails> }[]): Promise<Client[]> => {
    if (!activeWorkspace || !isSupabaseConfigured() || inputs.length === 0) return []
    const supabase = createClient()
    if (!supabase) return []

    const rows = inputs.map((input) => {
      const participant = { ...emptyParticipant, ...(input.participant || {}) }
      const initials = (() => {
        const f = participant.firstName?.trim()
        const l = participant.lastName?.trim()
        if (f && l) return `${f[0]}${l[0]}`.toUpperCase()
        if (f) return f[0].toUpperCase()
        return input.name[0]?.toUpperCase() || "?"
      })()
      return {
        workspace_id: activeWorkspace.id,
        name: input.name,
        icon_color: "#6b7280",
        icon_text: initials,
        icon_shape: "square" as const,
        participant,
        industry: [],
      }
    })

    const { data, error } = await supabase.from("clients").insert(rows).select()

    if (error) {
      console.error("Bulk insert failed:", error.message)
      return []
    }

    const newClients = (data || []).map(dbToClient)
    setClients((prev) => [...prev, ...newClients])
    return newClients
  }, [activeWorkspace])

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    setClients((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const dbUpdates: ClientRowUpdate = {}
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
    if (updates.status !== undefined) dbUpdates.status = updates.status

    if (Object.keys(dbUpdates).length === 0) return

    const { error, transient } = await updateClientRowWithRetry(supabase, id, dbUpdates as Record<string, unknown>)
    if (error) {
      console.error("Failed to update client:", error.message)
      // Only re-sync from the server on real (non-transient) errors. On a transient
      // network failure we keep the optimistic update so the user's change isn't lost.
      if (!transient) fetchClients()
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

    const { error, transient } = await updateClientRowWithRetry(supabase, id, { participant: mergedParticipant })
    if (error) {
      console.error("Failed to update participant field:", error.message)
      if (!transient) fetchClients()
    }
  }, [fetchClients])

  const updateParticipantFields = useCallback(async (id: string, fields: Partial<ParticipantDetails>) => {
    let mergedParticipant: ParticipantDetails | null = null

    setClients((prev) => prev.map((c) => {
      if (c.id !== id) return c
      mergedParticipant = { ...c.participant, ...fields }
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

    const { error, transient } = await updateClientRowWithRetry(supabase, id, { participant: mergedParticipant })
    if (error) {
      console.error("Failed to update participant fields:", error.message)
      if (!transient) fetchClients()
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
    <ClientsContext.Provider value={{ clients, clientNames, isLoading, fetchError, hasMore, isLoadingMore, loadMore, addClient, bulkAddClients, updateClient, updateParticipantField, updateParticipantFields, deleteClient, refetch: fetchClients }}>
      {children}
    </ClientsContext.Provider>
  )
}

export function useClients() {
  const ctx = useContext(ClientsContext)
  if (!ctx) throw new Error("useClients must be used within ClientsProvider")
  return ctx
}
