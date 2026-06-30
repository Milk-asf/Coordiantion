"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { Order, OrderFundingSource, OrderStatus } from "@/lib/types"

export interface OrderInput {
  clientId: string | null
  clientName: string
  title: string
  amount: number
  fundingSource: OrderFundingSource
  description: string
  /** Status is applied via the dedicated status updater so approval metadata stays correct. */
  status: OrderStatus
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function dbToOrder(row: any): Order {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id || null,
    clientName: row.client_name || "",
    title: row.title || "",
    amount: Number(row.amount) || 0,
    fundingSource: row.funding_source || "none",
    description: row.description || "",
    attachmentName: row.attachment_name || "",
    attachmentStoragePath: row.attachment_storage_path || "",
    attachmentMimeType: row.attachment_mime_type || "",
    attachmentSize: row.attachment_size || 0,
    status: row.status || "draft",
    createdBy: row.created_by || null,
    createdByName: row.created_by_name || "",
    approvedBy: row.approved_by || null,
    approvedByName: row.approved_by_name || "",
    approvedAt: row.approved_at || null,
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  }
}

function orderToDb(input: OrderInput, workspaceId: string, extras: Partial<Record<string, unknown>> = {}) {
  return {
    workspace_id: workspaceId,
    client_id: input.clientId,
    client_name: input.clientName,
    title: input.title.trim(),
    amount: input.amount,
    funding_source: input.fundingSource,
    description: input.description.trim(),
    updated_at: new Date().toISOString(),
    ...extras,
  }
}

function getStorageKey(workspaceId: string) {
  return `orders-${workspaceId}`
}

function loadLocalOrders(workspaceId: string): Order[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(getStorageKey(workspaceId))
    return raw ? JSON.parse(raw) as Order[] : []
  } catch {
    return []
  }
}

function saveLocalOrders(workspaceId: string, orders: Order[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(getStorageKey(workspaceId), JSON.stringify(orders))
}

function isMissingOrdersTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const message = (error.message || "").toLowerCase()
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes("orders") &&
      (message.includes("does not exist") ||
        message.includes("could not find") ||
        message.includes("schema cache")))
  )
}

function shouldUseLocalOrders(useLocalOnly: boolean) {
  return !isSupabaseConfigured() || useLocalOnly
}

function createLocalOrder(
  workspaceId: string,
  input: OrderInput,
  attachment: {
    attachment_name: string
    attachment_storage_path: string
    attachment_mime_type: string
    attachment_size: number
  },
  user: { id: string | null; name: string }
): Order {
  return {
    id: crypto.randomUUID(),
    workspaceId,
    clientId: input.clientId,
    clientName: input.clientName,
    title: input.title.trim(),
    amount: input.amount,
    fundingSource: input.fundingSource,
    description: input.description.trim(),
    attachmentName: attachment.attachment_name,
    attachmentStoragePath: attachment.attachment_storage_path,
    attachmentMimeType: attachment.attachment_mime_type,
    attachmentSize: attachment.attachment_size,
    status: "draft",
    createdBy: user.id,
    createdByName: user.name,
    approvedBy: null,
    approvedByName: "",
    approvedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

async function getCurrentUserMeta() {
  if (!isSupabaseConfigured()) return { id: null, name: "Unknown" }
  const supabase = createClient()
  if (!supabase) return { id: null, name: "Unknown" }
  const { data: { user } } = await supabase.auth.getUser()
  const name = (user?.user_metadata?.full_name as string | undefined)?.trim()
    || user?.email
    || "Unknown"
  return { id: user?.id ?? null, name }
}

export function useOrders() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id ?? null
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [useLocalOnly, setUseLocalOnly] = useState(false)

  const fetchOrders = useCallback(async () => {
    if (!workspaceId) {
      setOrders([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setFetchError(null)
    setUseLocalOnly(false)

    if (!isSupabaseConfigured()) {
      setUseLocalOnly(true)
      setOrders(loadLocalOrders(workspaceId))
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    if (!supabase) {
      setUseLocalOnly(true)
      setOrders(loadLocalOrders(workspaceId))
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })

      if (error) {
        setOrders(loadLocalOrders(workspaceId))
        if (isMissingOrdersTableError(error)) {
          setUseLocalOnly(true)
        } else {
          setFetchError(error.message)
        }
      } else {
        setOrders((data || []).map(dbToOrder))
      }
    } catch {
      setUseLocalOnly(true)
      setOrders(loadLocalOrders(workspaceId))
    }

    setIsLoading(false)
  }, [workspaceId])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

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

    if (existingPath) {
      await supabase.storage.from("documents").remove([existingPath])
    }

    const fileExt = file.name.split(".").pop() || "bin"
    const storagePath = `${workspaceId}/orders/${crypto.randomUUID()}.${fileExt}`
    const { error } = await supabase.storage.from("documents").upload(storagePath, file)
    if (error) throw new Error(error.message || "Unable to upload attachment")

    return {
      attachmentName: file.name,
      attachmentStoragePath: storagePath,
      attachmentMimeType: file.type || "application/octet-stream",
      attachmentSize: file.size,
    }
  }, [workspaceId])

  const addOrder = useCallback(async (input: OrderInput, file?: File | null) => {
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

    if (shouldUseLocalOrders(useLocalOnly)) {
      const order = createLocalOrder(workspaceId, input, attachment, user)
      setOrders((prev) => {
        const next = [order, ...prev]
        saveLocalOrders(workspaceId, next)
        return next
      })
      return order
    }

    const supabase = createClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from("orders")
      .insert({
        ...orderToDb(input, workspaceId),
        ...attachment,
        status: "draft",
        created_by: user.id,
        created_by_name: user.name,
      })
      .select()
      .single()

    if (error || !data) {
      if (isMissingOrdersTableError(error)) {
        setUseLocalOnly(true)
        const order = createLocalOrder(workspaceId, input, attachment, user)
        setOrders((prev) => {
          const next = [order, ...prev]
          saveLocalOrders(workspaceId, next)
          return next
        })
        return order
      }
      throw new Error(error?.message || "Unable to create order")
    }

    const order = dbToOrder(data)
    setOrders((prev) => [order, ...prev])
    return order
  }, [uploadAttachment, useLocalOnly, workspaceId])

  const updateOrder = useCallback(async (id: string, input: OrderInput, file?: File | null) => {
    if (!workspaceId) return false

    const existing = orders.find((order) => order.id === id)
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
      setOrders((prev) => {
        const next = prev.map((order) => {
          if (order.id !== id) return order
          return {
            ...order,
            clientId: input.clientId,
            clientName: input.clientName,
            title: input.title.trim(),
            amount: input.amount,
            fundingSource: input.fundingSource,
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
        saveLocalOrders(workspaceId, next)
        return next
      })
    }

    if (shouldUseLocalOrders(useLocalOnly)) {
      applyLocalUpdate()
      return true
    }

    const supabase = createClient()
    if (!supabase) return false

    const { error } = await supabase
      .from("orders")
      .update({
        ...orderToDb(input, workspaceId),
        ...attachmentUpdate,
      })
      .eq("id", id)

    if (error) {
      if (isMissingOrdersTableError(error)) {
        setUseLocalOnly(true)
        applyLocalUpdate()
        return true
      }
      throw new Error(error.message || "Unable to update order")
    }

    await fetchOrders()
    return true
  }, [fetchOrders, orders, uploadAttachment, useLocalOnly, workspaceId])

  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus) => {
    if (!workspaceId) return false

    const user = await getCurrentUserMeta()
    const now = new Date().toISOString()
    const approvalFields =
      status === "approved"
        ? {
            approved_by: user.id,
            approved_by_name: user.name,
            approved_at: now,
          }
        : status === "returned" || status === "sent" || status === "draft"
          ? {
              approved_by: null,
              approved_by_name: "",
              approved_at: null,
            }
          : {}

    const applyLocalStatusUpdate = () => {
      setOrders((prev) => {
        const next = prev.map((order) =>
          order.id === id
            ? {
                ...order,
                status,
                approvedBy: status === "approved" ? user.id : null,
                approvedByName: status === "approved" ? user.name : "",
                approvedAt: status === "approved" ? now : null,
                updatedAt: now,
              }
            : order
        )
        saveLocalOrders(workspaceId, next)
        return next
      })
    }

    if (shouldUseLocalOrders(useLocalOnly)) {
      applyLocalStatusUpdate()
      return true
    }

    const supabase = createClient()
    if (!supabase) return false

    const { error } = await supabase
      .from("orders")
      .update({
        status,
        updated_at: now,
        ...approvalFields,
      })
      .eq("id", id)

    if (error) {
      if (isMissingOrdersTableError(error)) {
        setUseLocalOnly(true)
        applyLocalStatusUpdate()
        return true
      }
      throw new Error(error.message || "Unable to update order status")
    }

    await fetchOrders()
    return true
  }, [fetchOrders, useLocalOnly, workspaceId])

  const deleteOrder = useCallback(async (id: string) => {
    if (!workspaceId) return false

    const existing = orders.find((order) => order.id === id)

    const applyLocalDelete = () => {
      setOrders((prev) => {
        const next = prev.filter((order) => order.id !== id)
        saveLocalOrders(workspaceId, next)
        return next
      })
    }

    if (shouldUseLocalOrders(useLocalOnly)) {
      applyLocalDelete()
      return true
    }

    const supabase = createClient()
    if (!supabase) return false

    if (existing?.attachmentStoragePath) {
      await supabase.storage.from("documents").remove([existing.attachmentStoragePath])
    }

    const { error } = await supabase.from("orders").delete().eq("id", id)
    if (error) {
      if (isMissingOrdersTableError(error)) {
        setUseLocalOnly(true)
        applyLocalDelete()
        return true
      }
      throw new Error(error.message || "Unable to delete order")
    }

    setOrders((prev) => prev.filter((order) => order.id !== id))
    return true
  }, [orders, useLocalOnly, workspaceId])

  const getAttachmentUrl = useCallback(async (storagePath: string) => {
    if (!storagePath || !isSupabaseConfigured()) return null
    const supabase = createClient()
    if (!supabase) return null
    const { data } = await supabase.storage.from("documents").createSignedUrl(storagePath, 3600)
    return data?.signedUrl ?? null
  }, [])

  return {
    orders,
    isLoading,
    fetchError,
    addOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    getAttachmentUrl,
    refetch: fetchOrders,
  }
}
