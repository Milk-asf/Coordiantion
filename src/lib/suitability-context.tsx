"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import { DEFAULT_SUITABILITY_STATUS, isDisallowedStatus } from "@/lib/suitability/config"
import type { StaffClientSuitability, SuitabilityStatus } from "@/lib/suitability/types"

interface SuitabilityRow {
  id: string
  workspace_id: string
  staff_id: string
  client_id: string
  status: SuitabilityStatus
}

function storageKey(workspaceId: string | undefined) {
  return workspaceId ? `workspace-suitability-${workspaceId}` : "workspace-suitability"
}

function pairKey(staffId: string, clientId: string) {
  return `${staffId}:${clientId}`
}

function normalizeStatus(value: unknown): SuitabilityStatus {
  if (value === "preferred" || value === "disallowed" || value === "suitable") return value
  return DEFAULT_SUITABILITY_STATUS
}

function rowToRecord(row: SuitabilityRow): StaffClientSuitability {
  return {
    id: row.id,
    staffId: row.staff_id,
    clientId: row.client_id,
    status: normalizeStatus(row.status),
  }
}

function loadLocalRecords(workspaceId: string | undefined): StaffClientSuitability[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as StaffClientSuitability[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((entry) => ({
      id: String(entry.id),
      staffId: String(entry.staffId),
      clientId: String(entry.clientId),
      status: normalizeStatus(entry.status),
    }))
  } catch {
    return []
  }
}

function saveLocalRecords(workspaceId: string | undefined, records: StaffClientSuitability[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(records))
}

interface SuitabilityContextValue {
  isLoading: boolean
  getStatus: (staffId: string, clientId: string) => SuitabilityStatus
  isDisallowed: (staffId: string, clientId: string) => boolean
  setStatus: (staffId: string, clientId: string, status: SuitabilityStatus) => Promise<void>
  refetch: () => Promise<void>
}

const SuitabilityContext = createContext<SuitabilityContextValue | null>(null)

export function SuitabilityProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace } = useWorkspace()
  const [records, setRecords] = useState<StaffClientSuitability[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const recordMap = useMemo(() => {
    const map = new Map<string, StaffClientSuitability>()
    for (const record of records) {
      map.set(pairKey(record.staffId, record.clientId), record)
    }
    return map
  }, [records])

  const persistLocal = useCallback((next: StaffClientSuitability[]) => {
    setRecords(next)
    saveLocalRecords(activeWorkspace?.id, next)
  }, [activeWorkspace?.id])

  const fetchRecords = useCallback(async () => {
    if (!activeWorkspace) {
      setRecords([])
      setIsLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setRecords(loadLocalRecords(activeWorkspace.id))
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    if (!supabase) {
      setRecords(loadLocalRecords(activeWorkspace.id))
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const { data, error } = await supabase
      .from("staff_client_suitability")
      .select("*")
      .eq("workspace_id", activeWorkspace.id)

    if (error) {
      setRecords(loadLocalRecords(activeWorkspace.id))
    } else {
      setRecords((data as SuitabilityRow[] | null)?.map(rowToRecord) ?? [])
    }

    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const getStatus = useCallback((staffId: string, clientId: string): SuitabilityStatus => {
    return recordMap.get(pairKey(staffId, clientId))?.status ?? DEFAULT_SUITABILITY_STATUS
  }, [recordMap])

  const isDisallowed = useCallback((staffId: string, clientId: string) => {
    return isDisallowedStatus(getStatus(staffId, clientId))
  }, [getStatus])

  const setStatus = useCallback(async (staffId: string, clientId: string, status: SuitabilityStatus) => {
    if (!activeWorkspace) return

    const existing = recordMap.get(pairKey(staffId, clientId))
    const nextRecord: StaffClientSuitability = {
      id: existing?.id ?? crypto.randomUUID(),
      staffId,
      clientId,
      status,
    }

    const nextRecords = existing
      ? records.map((record) =>
          record.staffId === staffId && record.clientId === clientId ? nextRecord : record
        )
      : [...records, nextRecord]

    if (!isSupabaseConfigured()) {
      persistLocal(nextRecords)
      return
    }

    const supabase = createClient()
    if (!supabase) {
      persistLocal(nextRecords)
      return
    }

    const { data, error } = await supabase
      .from("staff_client_suitability")
      .upsert(
        {
          id: nextRecord.id,
          workspace_id: activeWorkspace.id,
          staff_id: staffId,
          client_id: clientId,
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,staff_id,client_id" }
      )
      .select("*")
      .single()

    if (error || !data) {
      persistLocal(nextRecords)
      return
    }

    const saved = rowToRecord(data as SuitabilityRow)
    setRecords((current) => {
      const without = current.filter(
        (record) => !(record.staffId === staffId && record.clientId === clientId)
      )
      return [...without, saved]
    })
  }, [activeWorkspace, persistLocal, recordMap, records])

  return (
    <SuitabilityContext.Provider
      value={{
        isLoading,
        getStatus,
        isDisallowed,
        setStatus,
        refetch: fetchRecords,
      }}
    >
      {children}
    </SuitabilityContext.Provider>
  )
}

export function useSuitabilityContext() {
  const ctx = useContext(SuitabilityContext)
  if (!ctx) throw new Error("useSuitabilityContext must be used within SuitabilityProvider")
  return ctx
}
