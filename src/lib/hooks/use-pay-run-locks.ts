"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"

export type PayRunAuditAction = "locked" | "unlocked" | "exported"

export interface PayRunAuditEntry {
  action: PayRunAuditAction
  at: string
  by: string
  reason?: string
}

export interface PayRunLock {
  key: string
  locked: boolean
  exportCount: number
  audit: PayRunAuditEntry[]
}

function periodKey(start: string, end: string): string {
  return `${start}_${end}`
}

function storageKey(workspaceId: string): string {
  return `payrun-locks-${workspaceId}`
}

function loadAll(workspaceId: string): Record<string, PayRunLock> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    return raw ? (JSON.parse(raw) as Record<string, PayRunLock>) : {}
  } catch {
    return {}
  }
}

function saveAll(workspaceId: string, value: Record<string, PayRunLock>) {
  if (typeof window === "undefined") return
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(value))
}

async function getCurrentUserName(): Promise<string> {
  if (!isSupabaseConfigured()) return "You"
  const supabase = createClient()
  if (!supabase) return "You"
  const { data: { user } } = await supabase.auth.getUser()
  return (user?.user_metadata?.full_name as string | undefined)?.trim() || user?.email || "You"
}

const EMPTY_LOCK: Omit<PayRunLock, "key"> = { locked: false, exportCount: 0, audit: [] }

export function usePayRunLocks() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id ?? null
  const [locks, setLocks] = useState<Record<string, PayRunLock>>({})

  useEffect(() => {
    if (!workspaceId) {
      setLocks({})
      return
    }
    setLocks(loadAll(workspaceId))
  }, [workspaceId])

  const getLock = useCallback(
    (start: string, end: string): PayRunLock => {
      const key = periodKey(start, end)
      return locks[key] ?? { key, ...EMPTY_LOCK }
    },
    [locks],
  )

  const mutate = useCallback(
    (start: string, end: string, entry: PayRunAuditEntry, updates: Partial<Pick<PayRunLock, "locked" | "exportCount">>) => {
      if (!workspaceId) return
      const key = periodKey(start, end)
      setLocks((prev) => {
        const current = prev[key] ?? { key, ...EMPTY_LOCK }
        const next: PayRunLock = {
          ...current,
          ...updates,
          key,
          audit: [entry, ...current.audit].slice(0, 50),
        }
        const all = { ...prev, [key]: next }
        saveAll(workspaceId, all)
        return all
      })
    },
    [workspaceId],
  )

  const lock = useCallback(
    async (start: string, end: string) => {
      const by = await getCurrentUserName()
      mutate(start, end, { action: "locked", at: new Date().toISOString(), by }, { locked: true })
    },
    [mutate],
  )

  const unlock = useCallback(
    async (start: string, end: string, reason: string) => {
      const by = await getCurrentUserName()
      mutate(start, end, { action: "unlocked", at: new Date().toISOString(), by, reason }, { locked: false })
    },
    [mutate],
  )

  const recordExport = useCallback(
    async (start: string, end: string) => {
      const by = await getCurrentUserName()
      const current = getLock(start, end)
      mutate(start, end, { action: "exported", at: new Date().toISOString(), by }, { exportCount: current.exportCount + 1 })
    },
    [getLock, mutate],
  )

  return { getLock, lock, unlock, recordExport }
}
