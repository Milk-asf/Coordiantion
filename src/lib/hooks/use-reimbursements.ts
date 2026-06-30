"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { Reimbursement, ReimbursementCategory, ReimbursementStatus } from "@/lib/types"

export interface ReimbursementInput {
  title: string
  amount: number
  category: ReimbursementCategory
  clientId: string | null
  clientName: string
  shiftId: string | null
  dateIncurred: string | null
  description: string
  /** Status is applied via the dedicated status updater so approval metadata stays correct. */
  status: ReimbursementStatus
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function dbToReimbursement(row: any): Reimbursement {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title || "",
    amount: Number(row.amount) || 0,
    category: row.category || "other",
    clientId: row.client_id || null,
    clientName: row.client_name || "",
    shiftId: row.shift_id || null,
    dateIncurred: row.date_incurred || null,
    description: row.description || "",
    attachmentName: row.attachment_name || "",
    attachmentStoragePath: row.attachment_storage_path || "",
    attachmentMimeType: row.attachment_mime_type || "",
    attachmentSize: row.attachment_size || 0,
    status: row.status || "draft",
    reviewNote: row.review_note || "",
    createdBy: row.created_by || null,
    createdByName: row.created_by_name || "",
    approvedBy: row.approved_by || null,
    approvedByName: row.approved_by_name || "",
    approvedAt: row.approved_at || null,
    paidAt: row.paid_at || null,
    paidByName: row.paid_by_name || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  }
}

function reimbursementToDb(input: ReimbursementInput, workspaceId: string, extras: Partial<Record<string, unknown>> = {}) {
  return {
    workspace_id: workspaceId,
    title: input.title.trim(),
    amount: input.amount,
    category: input.category,
    client_id: input.clientId || null,
    client_name: input.clientName.trim(),
    shift_id: input.shiftId || null,
    date_incurred: input.dateIncurred || null,
    description: input.description.trim(),
    updated_at: new Date().toISOString(),
    ...extras,
  }
}

function getStorageKey(workspaceId: string) {
  return `reimbursements-${workspaceId}`
}

function loadLocal(workspaceId: string): Reimbursement[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(getStorageKey(workspaceId))
    return raw ? (JSON.parse(raw) as Reimbursement[]) : []
  } catch {
    return []
  }
}

function saveLocal(workspaceId: string, items: Reimbursement[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(getStorageKey(workspaceId), JSON.stringify(items))
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const message = (error.message || "").toLowerCase()
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes("reimbursements") &&
      (message.includes("does not exist") ||
        message.includes("could not find") ||
        message.includes("schema cache")))
  )
}

function shouldUseLocal(useLocalOnly: boolean) {
  return !isSupabaseConfigured() || useLocalOnly
}

function createLocalReimbursement(
  workspaceId: string,
  input: ReimbursementInput,
  attachment: {
    attachment_name: string
    attachment_storage_path: string
    attachment_mime_type: string
    attachment_size: number
  },
  user: { id: string | null; name: string },
): Reimbursement {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    workspaceId,
    title: input.title.trim(),
    amount: input.amount,
    category: input.category,
    clientId: input.clientId || null,
    clientName: input.clientName.trim(),
    shiftId: input.shiftId || null,
    dateIncurred: input.dateIncurred || null,
    description: input.description.trim(),
    attachmentName: attachment.attachment_name,
    attachmentStoragePath: attachment.attachment_storage_path,
    attachmentMimeType: attachment.attachment_mime_type,
    attachmentSize: attachment.attachment_size,
    status: "draft",
    reviewNote: "",
    createdBy: user.id,
    createdByName: user.name,
    approvedBy: null,
    approvedByName: "",
    approvedAt: null,
    paidAt: null,
    paidByName: "",
    createdAt: now,
    updatedAt: now,
  }
}

async function getCurrentUserMeta() {
  if (!isSupabaseConfigured()) return { id: null, name: "Unknown" }
  const supabase = createClient()
  if (!supabase) return { id: null, name: "Unknown" }
  const { data: { user } } = await supabase.auth.getUser()
  const name = (user?.user_metadata?.full_name as string | undefined)?.trim() || user?.email || "Unknown"
  return { id: user?.id ?? null, name }
}

export function useReimbursements() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id ?? null
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [useLocalOnly, setUseLocalOnly] = useState(false)

  const fetchReimbursements = useCallback(async () => {
    if (!workspaceId) {
      setReimbursements([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setFetchError(null)
    setUseLocalOnly(false)

    if (!isSupabaseConfigured()) {
      setUseLocalOnly(true)
      setReimbursements(loadLocal(workspaceId))
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    if (!supabase) {
      setUseLocalOnly(true)
      setReimbursements(loadLocal(workspaceId))
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("reimbursements")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })

      if (error) {
        setReimbursements(loadLocal(workspaceId))
        if (isMissingTableError(error)) setUseLocalOnly(true)
        else setFetchError(error.message)
      } else {
        setReimbursements((data || []).map(dbToReimbursement))
      }
    } catch {
      setUseLocalOnly(true)
      setReimbursements(loadLocal(workspaceId))
    }

    setIsLoading(false)
  }, [workspaceId])

  useEffect(() => {
    fetchReimbursements()
  }, [fetchReimbursements])

  const uploadAttachment = useCallback(async (file: File, existingPath?: string) => {
    if (!workspaceId || !isSupabaseConfigured()) {
      return {
        attachmentName: file.name,
        attachmentStoragePath: "",
        attachmentMimeType: file.type || "application/octet-stream",
        attachmentSize: file.size,
      }
    }

    const supabase = createClient()
    if (!supabase) {
      return {
        attachmentName: file.name,
        attachmentStoragePath: "",
        attachmentMimeType: file.type || "application/octet-stream",
        attachmentSize: file.size,
      }
    }

    if (existingPath) await supabase.storage.from("documents").remove([existingPath])

    const fileExt = file.name.split(".").pop() || "bin"
    const storagePath = `${workspaceId}/reimbursements/${crypto.randomUUID()}.${fileExt}`
    const { error } = await supabase.storage.from("documents").upload(storagePath, file)
    if (error) throw new Error(error.message || "Unable to upload attachment")

    return {
      attachmentName: file.name,
      attachmentStoragePath: storagePath,
      attachmentMimeType: file.type || "application/octet-stream",
      attachmentSize: file.size,
    }
  }, [workspaceId])

  const addReimbursement = useCallback(async (input: ReimbursementInput, file?: File | null) => {
    if (!workspaceId) return null

    const user = await getCurrentUserMeta()
    let attachment = {
      attachment_name: "",
      attachment_storage_path: "",
      attachment_mime_type: "",
      attachment_size: 0,
    }

    if (file) {
      const uploaded = await uploadAttachment(file)
      attachment = {
        attachment_name: uploaded.attachmentName,
        attachment_storage_path: uploaded.attachmentStoragePath,
        attachment_mime_type: uploaded.attachmentMimeType,
        attachment_size: uploaded.attachmentSize,
      }
    }

    if (shouldUseLocal(useLocalOnly)) {
      const item = createLocalReimbursement(workspaceId, input, attachment, user)
      setReimbursements((prev) => {
        const next = [item, ...prev]
        saveLocal(workspaceId, next)
        return next
      })
      return item
    }

    const supabase = createClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from("reimbursements")
      .insert({
        ...reimbursementToDb(input, workspaceId),
        ...attachment,
        status: "draft",
        created_by: user.id,
        created_by_name: user.name,
      })
      .select()
      .single()

    if (error || !data) {
      if (isMissingTableError(error)) {
        setUseLocalOnly(true)
        const item = createLocalReimbursement(workspaceId, input, attachment, user)
        setReimbursements((prev) => {
          const next = [item, ...prev]
          saveLocal(workspaceId, next)
          return next
        })
        return item
      }
      throw new Error(error?.message || "Unable to create reimbursement")
    }

    const item = dbToReimbursement(data)
    setReimbursements((prev) => [item, ...prev])
    return item
  }, [uploadAttachment, useLocalOnly, workspaceId])

  const updateReimbursement = useCallback(async (id: string, input: ReimbursementInput, file?: File | null) => {
    if (!workspaceId) return false

    const existing = reimbursements.find((item) => item.id === id)
    if (!existing) return false

    let attachmentUpdate: Record<string, string | number> = {}
    if (file) {
      const uploaded = await uploadAttachment(file, existing.attachmentStoragePath || undefined)
      attachmentUpdate = {
        attachment_name: uploaded.attachmentName,
        attachment_storage_path: uploaded.attachmentStoragePath,
        attachment_mime_type: uploaded.attachmentMimeType,
        attachment_size: uploaded.attachmentSize,
      }
    }

    const applyLocalUpdate = () => {
      setReimbursements((prev) => {
        const next = prev.map((item) => {
          if (item.id !== id) return item
          return {
            ...item,
            title: input.title.trim(),
            amount: input.amount,
            category: input.category,
            clientId: input.clientId || null,
            clientName: input.clientName.trim(),
            shiftId: input.shiftId || null,
            dateIncurred: input.dateIncurred || null,
            description: input.description.trim(),
            ...(file
              ? {
                  attachmentName: attachmentUpdate.attachment_name as string,
                  attachmentStoragePath: attachmentUpdate.attachment_storage_path as string,
                  attachmentMimeType: attachmentUpdate.attachment_mime_type as string,
                  attachmentSize: attachmentUpdate.attachment_size as number,
                }
              : {}),
            updatedAt: new Date().toISOString(),
          }
        })
        saveLocal(workspaceId, next)
        return next
      })
    }

    if (shouldUseLocal(useLocalOnly)) {
      applyLocalUpdate()
      return true
    }

    const supabase = createClient()
    if (!supabase) return false

    const { error } = await supabase
      .from("reimbursements")
      .update({ ...reimbursementToDb(input, workspaceId), ...attachmentUpdate })
      .eq("id", id)

    if (error) {
      if (isMissingTableError(error)) {
        setUseLocalOnly(true)
        applyLocalUpdate()
        return true
      }
      throw new Error(error.message || "Unable to update reimbursement")
    }

    await fetchReimbursements()
    return true
  }, [fetchReimbursements, reimbursements, uploadAttachment, useLocalOnly, workspaceId])

  const updateReimbursementStatus = useCallback(async (id: string, status: ReimbursementStatus, reviewNote?: string) => {
    if (!workspaceId) return false

    const user = await getCurrentUserMeta()
    const now = new Date().toISOString()
    const nextReviewNote = status === "returned" ? reviewNote ?? "" : ""

    const applyLocalStatusUpdate = () => {
      setReimbursements((prev) => {
        const next = prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                reviewNote: nextReviewNote,
                approvedBy: status === "approved" ? user.id : null,
                approvedByName: status === "approved" ? user.name : "",
                approvedAt: status === "approved" ? now : null,
                paidAt: status === "approved" ? item.paidAt : null,
                paidByName: status === "approved" ? item.paidByName : "",
                updatedAt: now,
              }
            : item,
        )
        saveLocal(workspaceId, next)
        return next
      })
    }

    if (shouldUseLocal(useLocalOnly)) {
      applyLocalStatusUpdate()
      return true
    }

    const supabase = createClient()
    if (!supabase) return false

    const { error } = await supabase
      .from("reimbursements")
      .update({
        status,
        review_note: nextReviewNote,
        updated_at: now,
        approved_by: status === "approved" ? user.id : null,
        approved_by_name: status === "approved" ? user.name : "",
        approved_at: status === "approved" ? now : null,
        ...(status === "approved" ? {} : { paid_at: null, paid_by_name: "" }),
      })
      .eq("id", id)

    if (error) {
      if (isMissingTableError(error)) {
        setUseLocalOnly(true)
        applyLocalStatusUpdate()
        return true
      }
      throw new Error(error.message || "Unable to update reimbursement status")
    }

    await fetchReimbursements()
    return true
  }, [fetchReimbursements, useLocalOnly, workspaceId])

  const markReimbursementsPaid = useCallback(async (ids: string[]) => {
    if (!workspaceId || ids.length === 0) return false

    const user = await getCurrentUserMeta()
    const now = new Date().toISOString()
    const idSet = new Set(ids)

    const applyLocalPaid = () => {
      setReimbursements((prev) => {
        const next = prev.map((item) =>
          idSet.has(item.id) ? { ...item, paidAt: now, paidByName: user.name, updatedAt: now } : item,
        )
        saveLocal(workspaceId, next)
        return next
      })
    }

    if (shouldUseLocal(useLocalOnly)) {
      applyLocalPaid()
      return true
    }

    const supabase = createClient()
    if (!supabase) return false

    const { error } = await supabase
      .from("reimbursements")
      .update({ paid_at: now, paid_by_name: user.name, updated_at: now })
      .in("id", ids)

    if (error) {
      if (isMissingTableError(error)) {
        setUseLocalOnly(true)
        applyLocalPaid()
        return true
      }
      throw new Error(error.message || "Unable to mark reimbursements paid")
    }

    setReimbursements((prev) =>
      prev.map((item) => (idSet.has(item.id) ? { ...item, paidAt: now, paidByName: user.name, updatedAt: now } : item)),
    )
    return true
  }, [useLocalOnly, workspaceId])

  const deleteReimbursement = useCallback(async (id: string) => {
    if (!workspaceId) return false

    const existing = reimbursements.find((item) => item.id === id)

    const applyLocalDelete = () => {
      setReimbursements((prev) => {
        const next = prev.filter((item) => item.id !== id)
        saveLocal(workspaceId, next)
        return next
      })
    }

    if (shouldUseLocal(useLocalOnly)) {
      applyLocalDelete()
      return true
    }

    const supabase = createClient()
    if (!supabase) return false

    if (existing?.attachmentStoragePath) {
      await supabase.storage.from("documents").remove([existing.attachmentStoragePath])
    }

    const { error } = await supabase.from("reimbursements").delete().eq("id", id)
    if (error) {
      if (isMissingTableError(error)) {
        setUseLocalOnly(true)
        applyLocalDelete()
        return true
      }
      throw new Error(error.message || "Unable to delete reimbursement")
    }

    setReimbursements((prev) => prev.filter((item) => item.id !== id))
    return true
  }, [reimbursements, useLocalOnly, workspaceId])

  const getAttachmentUrl = useCallback(async (storagePath: string) => {
    if (!storagePath || !isSupabaseConfigured()) return null
    const supabase = createClient()
    if (!supabase) return null
    const { data } = await supabase.storage.from("documents").createSignedUrl(storagePath, 3600)
    return data?.signedUrl ?? null
  }, [])

  return {
    reimbursements,
    isLoading,
    fetchError,
    addReimbursement,
    updateReimbursement,
    updateReimbursementStatus,
    markReimbursementsPaid,
    deleteReimbursement,
    getAttachmentUrl,
    refetch: fetchReimbursements,
  }
}
