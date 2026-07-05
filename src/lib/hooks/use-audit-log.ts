"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"

export interface AuditLogEntry {
  id: number
  workspace_id: string
  actor_id: string | null
  actor_email: string | null
  actor_role: string | null
  action: "INSERT" | "UPDATE" | "DELETE"
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

export interface AuditLogFilters {
  action?: AuditLogEntry["action"]
  tableName?: string
  /** Only return entries newer than this many days. */
  sinceDays?: number
}

const PAGE_SIZE = 50

export function useAuditLog(filters: AuditLogFilters) {
  const { activeWorkspace } = useWorkspace()
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [tableNames, setTableNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(
    async (offset: number) => {
      if (!isSupabaseConfigured() || !activeWorkspace) return { rows: [] as AuditLogEntry[], more: false }
      const supabase = createClient()
      if (!supabase) return { rows: [] as AuditLogEntry[], more: false }

      let query = supabase
        .from("audit_log")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + PAGE_SIZE)

      if (filters.action) query = query.eq("action", filters.action)
      if (filters.tableName) query = query.eq("table_name", filters.tableName)
      if (filters.sinceDays) {
        const since = new Date(Date.now() - filters.sinceDays * 24 * 60 * 60 * 1000)
        query = query.gte("created_at", since.toISOString())
      }

      const { data, error: queryError } = await query
      if (queryError) throw new Error(queryError.message)

      const rows = (data ?? []) as AuditLogEntry[]
      // We fetch one extra row to know whether another page exists.
      return { rows: rows.slice(0, PAGE_SIZE), more: rows.length > PAGE_SIZE }
    },
    [activeWorkspace, filters.action, filters.tableName, filters.sinceDays],
  )

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetchPage(0)
      .then(({ rows, more }) => {
        if (cancelled) return
        setEntries(rows)
        setHasMore(more)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load audit log")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [fetchPage])

  // Distinct table names seen in this workspace's trail, for the filter menu.
  useEffect(() => {
    if (!isSupabaseConfigured() || !activeWorkspace) return
    const supabase = createClient()
    if (!supabase) return
    let cancelled = false

    supabase
      .from("audit_log")
      .select("table_name")
      .eq("workspace_id", activeWorkspace.id)
      .order("table_name")
      .limit(1000)
      .then(({ data }) => {
        if (cancelled || !data) return
        setTableNames([...new Set(data.map((row) => row.table_name as string))])
      })

    return () => { cancelled = true }
  }, [activeWorkspace])

  const loadMore = useCallback(async () => {
    try {
      const { rows, more } = await fetchPage(entries.length)
      setEntries((prev) => [...prev, ...rows])
      setHasMore(more)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log")
    }
  }, [entries.length, fetchPage])

  return { entries, tableNames, isLoading, hasMore, loadMore, error }
}
