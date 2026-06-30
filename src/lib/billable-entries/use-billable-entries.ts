"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import {
  billableEntryDedupeKey,
  computeBillableAmount,
  computeBillableGst,
  type BillableEntry,
  type BillableEntryInput,
  type BillableEntryStatus,
} from "@/lib/billable-entries/types"

/* eslint-disable @typescript-eslint/no-explicit-any */
function dbToEntry(row: any): BillableEntry {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id || null,
    clientName: row.client_name || "",
    staffId: row.staff_id || null,
    staffName: row.staff_name || "",
    source: row.source || "manual",
    sourceId: row.source_id || null,
    serviceDate: row.service_date || "",
    chargeItemNumber: row.charge_item_number || "",
    chargeName: row.charge_name || "",
    claimType: row.claim_type || "direct-service",
    unit: row.unit || "hour",
    quantity: Number(row.quantity) || 0,
    rate: Number(row.rate) || 0,
    amount: Number(row.amount) || 0,
    gstCode: row.gst_code || "P2",
    gstAmount: Number(row.gst_amount) || 0,
    description: row.description || "",
    status: row.status || "unpaid",
    invoiceId: row.invoice_id || null,
    claimPeriodId: row.claim_period_id || null,
    createdBy: row.created_by || null,
    createdByName: row.created_by_name || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  }
}

function entryToDb(entry: BillableEntry) {
  return {
    id: entry.id,
    workspace_id: entry.workspaceId,
    client_id: entry.clientId,
    client_name: entry.clientName,
    staff_id: entry.staffId,
    staff_name: entry.staffName,
    source: entry.source,
    source_id: entry.sourceId,
    service_date: entry.serviceDate,
    charge_item_number: entry.chargeItemNumber,
    charge_name: entry.chargeName,
    claim_type: entry.claimType,
    unit: entry.unit,
    quantity: entry.quantity,
    rate: entry.rate,
    amount: entry.amount,
    gst_code: entry.gstCode,
    gst_amount: entry.gstAmount,
    description: entry.description,
    status: entry.status,
    invoice_id: entry.invoiceId,
    claim_period_id: entry.claimPeriodId,
    created_by: entry.createdBy,
    created_by_name: entry.createdByName,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  }
}

function storageKey(workspaceId: string) {
  return `billable-entries-${workspaceId}`
}

function loadLocal(workspaceId: string): BillableEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    return raw ? (JSON.parse(raw) as BillableEntry[]) : []
  } catch {
    return []
  }
}

function saveLocal(workspaceId: string, items: BillableEntry[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(items))
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const message = (error.message || "").toLowerCase()
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes("billable_entries") &&
      (message.includes("does not exist") ||
        message.includes("could not find") ||
        message.includes("schema cache")))
  )
}

async function getCurrentUserMeta() {
  if (!isSupabaseConfigured()) return { id: null, name: "You" }
  const supabase = createClient()
  if (!supabase) return { id: null, name: "You" }
  const { data: { user } } = await supabase.auth.getUser()
  const name = (user?.user_metadata?.full_name as string | undefined)?.trim() || user?.email || "You"
  return { id: user?.id ?? null, name }
}

function buildEntry(
  input: BillableEntryInput,
  workspaceId: string,
  user: { id: string | null; name: string },
): BillableEntry {
  const now = new Date().toISOString()
  const amount = computeBillableAmount(input.quantity, input.rate)
  const gstCode = input.gstCode || "P2"
  return {
    id: crypto.randomUUID(),
    workspaceId,
    clientId: input.clientId ?? null,
    clientName: input.clientName ?? "",
    staffId: input.staffId ?? null,
    staffName: input.staffName ?? "",
    source: input.source ?? "manual",
    sourceId: input.sourceId ?? null,
    serviceDate: input.serviceDate,
    chargeItemNumber: input.chargeItemNumber,
    chargeName: input.chargeName ?? "",
    claimType: input.claimType ?? "direct-service",
    unit: input.unit,
    quantity: input.quantity,
    rate: input.rate,
    amount,
    gstCode,
    gstAmount: computeBillableGst(amount, gstCode),
    description: input.description ?? "",
    status: input.status ?? "unpaid",
    invoiceId: null,
    claimPeriodId: null,
    createdBy: user.id,
    createdByName: user.name,
    createdAt: now,
    updatedAt: now,
  }
}

export function useBillableEntries() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id ?? null
  const [billableEntries, setBillableEntries] = useState<BillableEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [useLocalOnly, setUseLocalOnly] = useState(false)

  const persist = useCallback(
    (updater: BillableEntry[] | ((prev: BillableEntry[]) => BillableEntry[])) => {
      setBillableEntries((prev) => {
        const next = typeof updater === "function" ? (updater as (p: BillableEntry[]) => BillableEntry[])(prev) : updater
        if (workspaceId) saveLocal(workspaceId, next)
        return next
      })
    },
    [workspaceId],
  )

  const fetchEntries = useCallback(async () => {
    if (!workspaceId) {
      setBillableEntries([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setFetchError(null)
    setUseLocalOnly(false)

    const supabase = isSupabaseConfigured() ? createClient() : null
    if (!supabase) {
      setUseLocalOnly(true)
      setBillableEntries(loadLocal(workspaceId))
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("billable_entries")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("service_date", { ascending: false })

      if (error) {
        setBillableEntries(loadLocal(workspaceId))
        if (isMissingTableError(error)) setUseLocalOnly(true)
        else setFetchError(error.message)
      } else {
        setBillableEntries((data || []).map(dbToEntry))
      }
    } catch (err) {
      setUseLocalOnly(true)
      setBillableEntries(loadLocal(workspaceId))
      setFetchError(err instanceof Error ? err.message : null)
    }

    setIsLoading(false)
  }, [workspaceId])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const shouldUseLocal = !isSupabaseConfigured() || useLocalOnly

  const addBillableEntry = useCallback(
    async (input: BillableEntryInput): Promise<BillableEntry | null> => {
      if (!workspaceId) return null
      const user = await getCurrentUserMeta()
      const entry = buildEntry(input, workspaceId, user)

      if (shouldUseLocal) {
        persist((prev) => [entry, ...prev])
        return entry
      }

      const supabase = createClient()
      if (!supabase) return null

      const { data, error } = await supabase.from("billable_entries").insert(entryToDb(entry)).select().single()
      if (error || !data) {
        if (isMissingTableError(error)) {
          setUseLocalOnly(true)
          persist((prev) => [entry, ...prev])
          return entry
        }
        throw new Error(error?.message || "Unable to create billable entry")
      }

      const saved = dbToEntry(data)
      setBillableEntries((prev) => [saved, ...prev])
      return saved
    },
    [persist, shouldUseLocal, workspaceId],
  )

  const updateBillableEntry = useCallback(
    async (id: string, input: BillableEntryInput): Promise<boolean> => {
      if (!workspaceId) return false
      const updatedAt = new Date().toISOString()
      const amount = computeBillableAmount(input.quantity, input.rate)
      const gstCode = input.gstCode || "P2"
      const patch = {
        client_id: input.clientId ?? null,
        client_name: input.clientName ?? "",
        staff_id: input.staffId ?? null,
        staff_name: input.staffName ?? "",
        service_date: input.serviceDate,
        charge_item_number: input.chargeItemNumber,
        charge_name: input.chargeName ?? "",
        claim_type: input.claimType ?? "direct-service",
        unit: input.unit,
        quantity: input.quantity,
        rate: input.rate,
        amount,
        gst_code: gstCode,
        gst_amount: computeBillableGst(amount, gstCode),
        description: input.description ?? "",
        updated_at: updatedAt,
      }

      const applyLocal = () =>
        persist((prev) =>
          prev.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  clientId: input.clientId ?? null,
                  clientName: input.clientName ?? entry.clientName,
                  staffId: input.staffId ?? entry.staffId,
                  staffName: input.staffName ?? entry.staffName,
                  serviceDate: input.serviceDate,
                  chargeItemNumber: input.chargeItemNumber,
                  chargeName: input.chargeName ?? entry.chargeName,
                  claimType: input.claimType ?? entry.claimType,
                  unit: input.unit,
                  quantity: input.quantity,
                  rate: input.rate,
                  amount,
                  gstCode,
                  gstAmount: computeBillableGst(amount, gstCode),
                  description: input.description ?? entry.description,
                  updatedAt,
                }
              : entry,
          ),
        )

      if (shouldUseLocal) {
        applyLocal()
        return true
      }

      const supabase = createClient()
      if (!supabase) return false
      const { error } = await supabase.from("billable_entries").update(patch).eq("id", id)
      if (error) {
        if (isMissingTableError(error)) {
          setUseLocalOnly(true)
          applyLocal()
          return true
        }
        throw new Error(error.message || "Unable to update billable entry")
      }
      applyLocal()
      return true
    },
    [persist, shouldUseLocal, workspaceId],
  )

  const setBillableEntryStatus = useCallback(
    async (
      ids: string[],
      status: BillableEntryStatus,
      links?: { invoiceId?: string | null; claimPeriodId?: string | null },
    ): Promise<boolean> => {
      if (!workspaceId || ids.length === 0) return false
      const updatedAt = new Date().toISOString()
      const idSet = new Set(ids)

      const applyLocal = () =>
        persist((prev) =>
          prev.map((entry) =>
            idSet.has(entry.id)
              ? {
                  ...entry,
                  status,
                  invoiceId: links?.invoiceId !== undefined ? links.invoiceId : entry.invoiceId,
                  claimPeriodId: links?.claimPeriodId !== undefined ? links.claimPeriodId : entry.claimPeriodId,
                  updatedAt,
                }
              : entry,
          ),
        )

      if (shouldUseLocal) {
        applyLocal()
        return true
      }

      const supabase = createClient()
      if (!supabase) return false
      const patch: Record<string, unknown> = { status, updated_at: updatedAt }
      if (links?.invoiceId !== undefined) patch.invoice_id = links.invoiceId
      if (links?.claimPeriodId !== undefined) patch.claim_period_id = links.claimPeriodId

      const { error } = await supabase.from("billable_entries").update(patch).in("id", ids)
      if (error) {
        if (isMissingTableError(error)) {
          setUseLocalOnly(true)
          applyLocal()
          return true
        }
        throw new Error(error.message || "Unable to update billable entries")
      }
      applyLocal()
      return true
    },
    [persist, shouldUseLocal, workspaceId],
  )

  const deleteBillableEntry = useCallback(
    async (id: string): Promise<boolean> => {
      if (!workspaceId) return false
      const applyLocal = () => persist((prev) => prev.filter((entry) => entry.id !== id))

      if (shouldUseLocal) {
        applyLocal()
        return true
      }

      const supabase = createClient()
      if (!supabase) return false
      const { error } = await supabase.from("billable_entries").delete().eq("id", id)
      if (error) {
        if (isMissingTableError(error)) {
          setUseLocalOnly(true)
          applyLocal()
          return true
        }
        throw new Error(error.message || "Unable to delete billable entry")
      }
      applyLocal()
      return true
    },
    [persist, shouldUseLocal, workspaceId],
  )

  /**
   * Dedupe-aware sourcing: inserts only entries whose (source, sourceId,
   * chargeItemNumber) is not already present. Returns the number added so the
   * caller can surface a "synced N entries" message. Existing entries are left
   * untouched so a re-sync never duplicates or overwrites edited lines.
   */
  const syncEntries = useCallback(
    async (inputs: BillableEntryInput[]): Promise<number> => {
      if (!workspaceId || inputs.length === 0) return 0
      const user = await getCurrentUserMeta()

      const existingKeys = new Set(
        billableEntries
          .filter((entry) => entry.sourceId)
          .map((entry) => billableEntryDedupeKey(entry.source, entry.sourceId, entry.chargeItemNumber)),
      )

      const fresh: BillableEntry[] = []
      const seen = new Set(existingKeys)
      for (const input of inputs) {
        const source = input.source ?? "manual"
        const key = billableEntryDedupeKey(source, input.sourceId ?? null, input.chargeItemNumber)
        if (input.sourceId && seen.has(key)) continue
        if (input.sourceId) seen.add(key)
        fresh.push(buildEntry(input, workspaceId, user))
      }

      if (fresh.length === 0) return 0

      if (shouldUseLocal) {
        persist((prev) => [...fresh, ...prev])
        return fresh.length
      }

      const supabase = createClient()
      if (!supabase) return 0
      const { data, error } = await supabase.from("billable_entries").insert(fresh.map(entryToDb)).select()
      if (error) {
        if (isMissingTableError(error)) {
          setUseLocalOnly(true)
          persist((prev) => [...fresh, ...prev])
          return fresh.length
        }
        throw new Error(error.message || "Unable to sync billable entries")
      }
      const saved = (data || []).map(dbToEntry)
      setBillableEntries((prev) => [...saved, ...prev])
      return saved.length
    },
    [billableEntries, persist, shouldUseLocal, workspaceId],
  )

  const getEntriesForClient = useCallback(
    (clientId: string) => billableEntries.filter((entry) => entry.clientId === clientId),
    [billableEntries],
  )

  const unpaidEntries = useMemo(
    () => billableEntries.filter((entry) => entry.status === "unpaid"),
    [billableEntries],
  )

  return {
    billableEntries,
    unpaidEntries,
    isLoading,
    fetchError,
    addBillableEntry,
    updateBillableEntry,
    setBillableEntryStatus,
    deleteBillableEntry,
    syncEntries,
    getEntriesForClient,
    refetch: fetchEntries,
  }
}
