"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import { emptyParticipant } from "@/lib/types"
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

export function useClients() {
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
    if (!supabase) { setIsLoading(false); return }

    setIsLoading(true)
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("workspace_id", activeWorkspace.id)
      .order("created_at", { ascending: true })

    setClients((data || []).map(dbToClient))
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
    if (!activeWorkspace || !isSupabaseConfigured()) return null
    const supabase = createClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from("clients")
      .insert({
        workspace_id: activeWorkspace.id,
        name: input.name,
        icon_color: input.iconColor || "#6b7280",
        icon_text: input.iconText || input.name[0]?.toUpperCase() || "?",
        icon_shape: input.iconShape || "square",
        participant: { ...emptyParticipant, ...(input.participant || {}) },
        industry: input.industry || [],
      })
      .select()
      .single()

    if (error || !data) return null
    const newClient = dbToClient(data)
    setClients((prev) => [...prev, newClient])
    return newClient
  }, [activeWorkspace])

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
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
    setClients((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c))
  }, [])

  const deleteClient = useCallback(async (id: string) => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("clients").delete().eq("id", id)
    setClients((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const clientNames = clients.map((c) => c.name)

  return { clients, clientNames, isLoading, addClient, updateClient, deleteClient, refetch: fetchClients }
}
