"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { ClaimPaymentStatus, ClaimPeriod, ClaimPeriodInput, ClaimPeriodStatus } from "@/lib/ndis/claim-period"

/* eslint-disable @typescript-eslint/no-explicit-any */
function dbToClaimPeriod(row: any): ClaimPeriod {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name || "",
    startDate: row.start_date || "",
    endDate: row.end_date || "",
    status: (row.status as ClaimPeriodStatus) || "draft",
    paymentStatus: (row.payment_status as ClaimPaymentStatus) || "unpaid",
    excludedKeys: Array.isArray(row.excluded_keys) ? row.excluded_keys : [],
    exportedAt: row.exported_at || null,
    exportCount: row.export_count || 0,
    createdByName: row.created_by_name || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  }
}

function getStorageKey(workspaceId: string) {
  return `claim-periods-${workspaceId}`
}

function loadLocal(workspaceId: string): ClaimPeriod[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(getStorageKey(workspaceId))
    return raw ? (JSON.parse(raw) as ClaimPeriod[]) : []
  } catch {
    return []
  }
}

function saveLocal(workspaceId: string, items: ClaimPeriod[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(getStorageKey(workspaceId), JSON.stringify(items))
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const message = (error.message || "").toLowerCase()
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes("claim_periods") &&
      (message.includes("does not exist") ||
        message.includes("could not find") ||
        message.includes("schema cache")))
  )
}

function shouldUseLocal(useLocalOnly: boolean) {
  return !isSupabaseConfigured() || useLocalOnly
}

async function getCurrentUserMeta() {
  if (!isSupabaseConfigured()) return { id: null as string | null, name: "Unknown" }
  const supabase = createClient()
  if (!supabase) return { id: null as string | null, name: "Unknown" }
  const { data: { user } } = await supabase.auth.getUser()
  const name = (user?.user_metadata?.full_name as string | undefined)?.trim() || user?.email || "Unknown"
  return { id: user?.id ?? null, name }
}

function createLocalClaimPeriod(workspaceId: string, input: ClaimPeriodInput, user: { id: string | null; name: string }): ClaimPeriod {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    workspaceId,
    name: input.name.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    status: "draft",
    paymentStatus: "unpaid",
    excludedKeys: [],
    exportedAt: null,
    exportCount: 0,
    createdByName: user.name,
    createdAt: now,
    updatedAt: now,
  }
}

export function useClaimPeriods() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id ?? null
  const [claimPeriods, setClaimPeriods] = useState<ClaimPeriod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [useLocalOnly, setUseLocalOnly] = useState(false)

  const fetchClaimPeriods = useCallback(async () => {
    if (!workspaceId) {
      setClaimPeriods([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setFetchError(null)
    setUseLocalOnly(false)

    if (!isSupabaseConfigured()) {
      setUseLocalOnly(true)
      setClaimPeriods(loadLocal(workspaceId))
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    if (!supabase) {
      setUseLocalOnly(true)
      setClaimPeriods(loadLocal(workspaceId))
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("claim_periods")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })

      if (error) {
        setClaimPeriods(loadLocal(workspaceId))
        if (isMissingTableError(error)) setUseLocalOnly(true)
        else setFetchError(error.message)
      } else {
        setClaimPeriods((data || []).map(dbToClaimPeriod))
      }
    } catch {
      setUseLocalOnly(true)
      setClaimPeriods(loadLocal(workspaceId))
    }

    setIsLoading(false)
  }, [workspaceId])

  useEffect(() => {
    fetchClaimPeriods()
  }, [fetchClaimPeriods])

  const addClaimPeriod = useCallback(async (input: ClaimPeriodInput): Promise<ClaimPeriod | null> => {
    if (!workspaceId) return null
    const user = await getCurrentUserMeta()

    if (shouldUseLocal(useLocalOnly)) {
      const item = createLocalClaimPeriod(workspaceId, input, user)
      setClaimPeriods((prev) => {
        const next = [item, ...prev]
        saveLocal(workspaceId, next)
        return next
      })
      return item
    }

    const supabase = createClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from("claim_periods")
      .insert({
        workspace_id: workspaceId,
        name: input.name.trim(),
        start_date: input.startDate,
        end_date: input.endDate,
        status: "draft",
        excluded_keys: [],
        created_by: user.id,
        created_by_name: user.name,
      })
      .select()
      .single()

    if (error || !data) {
      if (isMissingTableError(error)) {
        setUseLocalOnly(true)
        const item = createLocalClaimPeriod(workspaceId, input, user)
        setClaimPeriods((prev) => {
          const next = [item, ...prev]
          saveLocal(workspaceId, next)
          return next
        })
        return item
      }
      throw new Error(error?.message || "Unable to create claim period")
    }

    const item = dbToClaimPeriod(data)
    setClaimPeriods((prev) => [item, ...prev])
    return item
  }, [useLocalOnly, workspaceId])

  const updateClaimPeriod = useCallback(
    async (id: string, updates: Partial<Pick<ClaimPeriod, "name" | "status" | "paymentStatus" | "excludedKeys" | "exportedAt" | "exportCount">>) => {
      if (!workspaceId) return false
      const now = new Date().toISOString()

      const applyLocal = () => {
        setClaimPeriods((prev) => {
          const next = prev.map((item) => (item.id === id ? { ...item, ...updates, updatedAt: now } : item))
          saveLocal(workspaceId, next)
          return next
        })
      }

      // Optimistic update keeps the board/review snappy.
      setClaimPeriods((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates, updatedAt: now } : item)))

      if (shouldUseLocal(useLocalOnly)) {
        applyLocal()
        return true
      }

      const supabase = createClient()
      if (!supabase) return false

      const dbUpdates: Record<string, unknown> = { updated_at: now }
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.status !== undefined) dbUpdates.status = updates.status
      if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus
      if (updates.excludedKeys !== undefined) dbUpdates.excluded_keys = updates.excludedKeys
      if (updates.exportedAt !== undefined) dbUpdates.exported_at = updates.exportedAt
      if (updates.exportCount !== undefined) dbUpdates.export_count = updates.exportCount

      const { error } = await supabase.from("claim_periods").update(dbUpdates).eq("id", id)
      if (error) {
        if (isMissingTableError(error)) {
          setUseLocalOnly(true)
          applyLocal()
          return true
        }
        throw new Error(error.message || "Unable to update claim period")
      }
      return true
    },
    [useLocalOnly, workspaceId],
  )

  const deleteClaimPeriod = useCallback(async (id: string) => {
    if (!workspaceId) return false

    const applyLocal = () => {
      setClaimPeriods((prev) => {
        const next = prev.filter((item) => item.id !== id)
        saveLocal(workspaceId, next)
        return next
      })
    }

    setClaimPeriods((prev) => prev.filter((item) => item.id !== id))

    if (shouldUseLocal(useLocalOnly)) {
      applyLocal()
      return true
    }

    const supabase = createClient()
    if (!supabase) return false

    const { error } = await supabase.from("claim_periods").delete().eq("id", id)
    if (error) {
      if (isMissingTableError(error)) {
        setUseLocalOnly(true)
        applyLocal()
        return true
      }
      throw new Error(error.message || "Unable to delete claim period")
    }
    return true
  }, [useLocalOnly, workspaceId])

  return {
    claimPeriods,
    isLoading,
    fetchError,
    addClaimPeriod,
    updateClaimPeriod,
    deleteClaimPeriod,
    refetch: fetchClaimPeriods,
  }
}
