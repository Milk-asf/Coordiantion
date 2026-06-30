"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { FinanceContact, FinanceContactInput } from "@/lib/finance-contacts/types"

/* eslint-disable @typescript-eslint/no-explicit-any */
function dbToContact(row: any): FinanceContact {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: row.type || "person",
    name: row.name || "",
    email: row.email || "",
    phone: row.phone || "",
    abn: row.abn || "",
    address: row.address || "",
    bsb: row.bsb || "",
    accountNumber: row.account_number || "",
    notes: row.notes || "",
    createdBy: row.created_by || null,
    createdByName: row.created_by_name || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  }
}

function inputToDb(input: FinanceContactInput) {
  return {
    type: input.type,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: (input.phone ?? "").trim(),
    abn: (input.abn ?? "").trim(),
    address: (input.address ?? "").trim(),
    bsb: (input.bsb ?? "").trim(),
    account_number: (input.accountNumber ?? "").trim(),
    notes: (input.notes ?? "").trim(),
    updated_at: new Date().toISOString(),
  }
}

function storageKey(workspaceId: string) {
  return `finance-contacts-${workspaceId}`
}

function loadLocal(workspaceId: string): FinanceContact[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    return raw ? (JSON.parse(raw) as FinanceContact[]) : []
  } catch {
    return []
  }
}

function saveLocal(workspaceId: string, items: FinanceContact[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(items))
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const message = (error.message || "").toLowerCase()
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes("finance_contacts") &&
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

function buildContact(input: FinanceContactInput, workspaceId: string, user: { id: string | null; name: string }): FinanceContact {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    workspaceId,
    type: input.type,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: (input.phone ?? "").trim(),
    abn: (input.abn ?? "").trim(),
    address: (input.address ?? "").trim(),
    bsb: (input.bsb ?? "").trim(),
    accountNumber: (input.accountNumber ?? "").trim(),
    notes: (input.notes ?? "").trim(),
    createdBy: user.id,
    createdByName: user.name,
    createdAt: now,
    updatedAt: now,
  }
}

export function useFinanceContacts() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id ?? null
  const [financeContacts, setFinanceContacts] = useState<FinanceContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [useLocalOnly, setUseLocalOnly] = useState(false)

  const persist = useCallback(
    (updater: FinanceContact[] | ((prev: FinanceContact[]) => FinanceContact[])) => {
      setFinanceContacts((prev) => {
        const next = typeof updater === "function" ? (updater as (p: FinanceContact[]) => FinanceContact[])(prev) : updater
        if (workspaceId) saveLocal(workspaceId, next)
        return next
      })
    },
    [workspaceId],
  )

  const fetchContacts = useCallback(async () => {
    if (!workspaceId) {
      setFinanceContacts([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setFetchError(null)
    setUseLocalOnly(false)

    const supabase = isSupabaseConfigured() ? createClient() : null
    if (!supabase) {
      setUseLocalOnly(true)
      setFinanceContacts(loadLocal(workspaceId))
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("finance_contacts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })

      if (error) {
        setFinanceContacts(loadLocal(workspaceId))
        if (isMissingTableError(error)) setUseLocalOnly(true)
        else setFetchError(error.message)
      } else {
        setFinanceContacts((data || []).map(dbToContact))
      }
    } catch (err) {
      setUseLocalOnly(true)
      setFinanceContacts(loadLocal(workspaceId))
      setFetchError(err instanceof Error ? err.message : null)
    }

    setIsLoading(false)
  }, [workspaceId])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const shouldUseLocal = !isSupabaseConfigured() || useLocalOnly

  const addFinanceContact = useCallback(
    async (input: FinanceContactInput): Promise<FinanceContact | null> => {
      if (!workspaceId) return null
      const user = await getCurrentUserMeta()
      const contact = buildContact(input, workspaceId, user)

      if (shouldUseLocal) {
        persist((prev) => [contact, ...prev])
        return contact
      }

      const supabase = createClient()
      if (!supabase) return null
      const { data, error } = await supabase
        .from("finance_contacts")
        .insert({ ...inputToDb(input), workspace_id: workspaceId, created_by: user.id, created_by_name: user.name })
        .select()
        .single()

      if (error || !data) {
        if (isMissingTableError(error)) {
          setUseLocalOnly(true)
          persist((prev) => [contact, ...prev])
          return contact
        }
        throw new Error(error?.message || "Unable to create finance contact")
      }

      const saved = dbToContact(data)
      setFinanceContacts((prev) => [saved, ...prev])
      return saved
    },
    [persist, shouldUseLocal, workspaceId],
  )

  const updateFinanceContact = useCallback(
    async (id: string, input: FinanceContactInput): Promise<boolean> => {
      if (!workspaceId) return false
      const applyLocal = () =>
        persist((prev) =>
          prev.map((contact) =>
            contact.id === id
              ? {
                  ...contact,
                  type: input.type,
                  name: input.name.trim(),
                  email: input.email.trim(),
                  phone: (input.phone ?? "").trim(),
                  abn: (input.abn ?? "").trim(),
                  address: (input.address ?? "").trim(),
                  bsb: (input.bsb ?? "").trim(),
                  accountNumber: (input.accountNumber ?? "").trim(),
                  notes: (input.notes ?? "").trim(),
                  updatedAt: new Date().toISOString(),
                }
              : contact,
          ),
        )

      if (shouldUseLocal) {
        applyLocal()
        return true
      }

      const supabase = createClient()
      if (!supabase) return false
      const { error } = await supabase.from("finance_contacts").update(inputToDb(input)).eq("id", id)
      if (error) {
        if (isMissingTableError(error)) {
          setUseLocalOnly(true)
          applyLocal()
          return true
        }
        throw new Error(error.message || "Unable to update finance contact")
      }
      applyLocal()
      return true
    },
    [persist, shouldUseLocal, workspaceId],
  )

  const deleteFinanceContact = useCallback(
    async (id: string): Promise<boolean> => {
      if (!workspaceId) return false
      const applyLocal = () => persist((prev) => prev.filter((contact) => contact.id !== id))

      if (shouldUseLocal) {
        applyLocal()
        return true
      }

      const supabase = createClient()
      if (!supabase) return false
      const { error } = await supabase.from("finance_contacts").delete().eq("id", id)
      if (error) {
        if (isMissingTableError(error)) {
          setUseLocalOnly(true)
          applyLocal()
          return true
        }
        throw new Error(error.message || "Unable to delete finance contact")
      }
      applyLocal()
      return true
    },
    [persist, shouldUseLocal, workspaceId],
  )

  const getFinanceContact = useCallback(
    (id: string) => financeContacts.find((contact) => contact.id === id) ?? null,
    [financeContacts],
  )

  return {
    financeContacts,
    isLoading,
    fetchError,
    addFinanceContact,
    updateFinanceContact,
    deleteFinanceContact,
    getFinanceContact,
    refetch: fetchContacts,
  }
}
