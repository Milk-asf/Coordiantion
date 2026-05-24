"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import { emptyStaffDetails } from "@/lib/types"
import type { StaffMember, StaffDetails } from "@/lib/types"

/* eslint-disable @typescript-eslint/no-explicit-any */
function dbToStaff(row: any): StaffMember {
  return {
    id: row.id,
    name: row.name,
    iconText: row.icon_text || row.name?.[0]?.toUpperCase() || "?",
    details: { ...emptyStaffDetails, ...(row.details || {}) },
    status: row.status || "active",
    invitedEmail: row.invited_email || "",
  }
}

interface StaffContextValue {
  staff: StaffMember[]
  staffNames: string[]
  isLoading: boolean
  fetchError: string | null
  addStaff: (input: {
    name: string
    iconText?: string
    details?: Partial<StaffDetails>
    status?: string
    invitedEmail?: string
  }) => Promise<StaffMember | null>
  bulkAddStaff: (inputs: { name: string; details: Partial<StaffDetails> }[]) => Promise<StaffMember[]>
  updateStaff: (id: string, updates: Partial<StaffMember>) => Promise<void>
  deleteStaff: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

const StaffContext = createContext<StaffContextValue | null>(null)

export function StaffProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace } = useWorkspace()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchStaff = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
      setStaff([])
      setIsLoading(false)
      return
    }
    const supabase = createClient()
    if (!supabase) { setStaff([]); setIsLoading(false); return }

    setIsLoading(true)
    setFetchError(null)
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: true })

      if (error) {
        setFetchError(error.message)
        setStaff([])
      } else {
        setStaff((data || []).map(dbToStaff))
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load staff")
      setStaff([])
    }
    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  const addStaff = useCallback(async (input: {
    name: string
    iconText?: string
    details?: Partial<StaffDetails>
    status?: string
    invitedEmail?: string
  }) => {
    const details = { ...emptyStaffDetails, ...(input.details || {}) }
    const base = {
      name: input.name,
      iconText: input.iconText || input.name[0]?.toUpperCase() || "?",
      details,
      status: (input.status || "active") as StaffMember["status"],
      invitedEmail: input.invitedEmail || "",
    }

    if (!activeWorkspace || !isSupabaseConfigured()) return null
    const supabase = createClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from("staff")
      .insert({
        workspace_id: activeWorkspace.id,
        name: input.name,
        icon_text: base.iconText,
        details,
        status: base.status,
        invited_email: base.invitedEmail,
      })
      .select()
      .single()

    if (!error && data) {
      const newStaff = dbToStaff(data)
      setStaff((prev) => [...prev, newStaff])
      return newStaff
    }
    return null
  }, [activeWorkspace])

  const bulkAddStaff = useCallback(async (inputs: { name: string; details: Partial<StaffDetails> }[]): Promise<StaffMember[]> => {
    if (!activeWorkspace || !isSupabaseConfigured() || inputs.length === 0) return []
    const supabase = createClient()
    if (!supabase) return []

    const rows = inputs.map((input) => {
      const details = { ...emptyStaffDetails, ...(input.details || {}) }
      return {
        workspace_id: activeWorkspace.id,
        name: input.name,
        icon_text: input.name[0]?.toUpperCase() || "?",
        details,
        status: "active",
        invited_email: details.email || "",
      }
    })

    const { data, error } = await supabase.from("staff").insert(rows).select()
    if (error) {
      console.error("Bulk insert staff failed:", error.message)
      return []
    }

    const newStaff = (data || []).map(dbToStaff)
    setStaff((prev) => [...prev, ...newStaff])
    return newStaff
  }, [activeWorkspace])

  const updateStaff = useCallback(async (id: string, updates: Partial<StaffMember>) => {
    setStaff((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const dbUpdates: Record<string, any> = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.iconText !== undefined) dbUpdates.icon_text = updates.iconText
    if (updates.details !== undefined) dbUpdates.details = updates.details
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.invitedEmail !== undefined) dbUpdates.invited_email = updates.invitedEmail

    if (Object.keys(dbUpdates).length === 0) return

    const { error } = await supabase.from("staff").update(dbUpdates).eq("id", id)
    if (error) {
      console.error("Failed to update staff:", error.message)
      fetchStaff()
    }
  }, [fetchStaff])

  const deleteStaff = useCallback(async (id: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== id))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("staff").delete().eq("id", id)
  }, [])

  const staffNames = staff.map((s) => s.name)

  return (
    <StaffContext.Provider value={{ staff, staffNames, isLoading, fetchError, addStaff, bulkAddStaff, updateStaff, deleteStaff, refetch: fetchStaff }}>
      {children}
    </StaffContext.Provider>
  )
}

export function useStaff() {
  const ctx = useContext(StaffContext)
  if (!ctx) throw new Error("useStaff must be used within StaffProvider")
  return ctx
}
