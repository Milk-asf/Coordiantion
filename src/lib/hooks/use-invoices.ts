"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { Invoice, InvoiceStatus, InvoiceLineItem, InvoiceDeliveryMethod } from "@/lib/types"

interface InvoiceRow {
  id: string
  workspace_id: string
  invoice_number: string
  client_name: string
  client_id: string | null
  status: string
  issue_date: string
  due_date: string
  task_ids: string[]
  line_items: InvoiceLineItem[]
  subtotal: number
  gst: number
  total: number
  notes: string
  created_by: string
  delivery_method: string | null
  sent_at: string | null
  sent_to: string | null
  sent_error: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

function dbToInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    clientName: row.client_name,
    clientId: row.client_id,
    status: row.status as InvoiceStatus,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    taskIds: row.task_ids || [],
    lineItems: row.line_items || [],
    subtotal: Number(row.subtotal),
    gst: Number(row.gst),
    total: Number(row.total),
    notes: row.notes || "",
    createdBy: row.created_by || "",
    createdAt: row.created_at,
    ...(row.paid_at ? { paidAt: row.paid_at } : {}),
    ...(row.sent_at ? { sentAt: row.sent_at } : {}),
    ...(row.sent_to ? { sentTo: row.sent_to } : {}),
    ...(row.sent_error ? { sentError: row.sent_error } : {}),
    ...(row.delivery_method ? { deliveryMethod: row.delivery_method as InvoiceDeliveryMethod } : {}),
  }
}

function nextInvoiceNumberFromList(invoices: Invoice[]): string {
  let max = 0
  for (const inv of invoices) {
    const match = inv.invoiceNumber.match(/^INV-(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > max) max = num
    }
  }
  const next = max + 1
  return `INV-${String(next).padStart(4, "0")}`
}

export function useInvoices() {
  const { activeWorkspace } = useWorkspace()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchInvoices = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
      setInvoices([])
      setIsLoading(false)
      return
    }
    const supabase = createClient()
    if (!supabase) { setInvoices([]); setIsLoading(false); return }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: true })

      if (error || !data) {
        console.error("Failed to fetch invoices:", error?.message)
        setInvoices([])
        setIsLoading(false)
        return
      }

      const mapped = (data as InvoiceRow[]).map(dbToInvoice)

      const today = new Date().toISOString().split("T")[0]
      const overdueIds: string[] = []
      const withOverdue = mapped.map((inv) => {
        if (inv.status === "sent" && inv.dueDate < today) {
          overdueIds.push(inv.id)
          return { ...inv, status: "overdue" as InvoiceStatus }
        }
        return inv
      })

      if (overdueIds.length > 0) {
        await supabase
          .from("invoices")
          .update({ status: "overdue", updated_at: new Date().toISOString() })
          .in("id", overdueIds)
      }

      setInvoices(withOverdue)
    } catch (err) {
      console.error("Failed to fetch invoices:", err)
      setInvoices([])
    }
    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const addInvoice = useCallback(async (input: {
    clientName: string
    clientId: string | null
    taskIds: string[]
    lineItems: InvoiceLineItem[]
    subtotal: number
    gst: number
    total: number
    createdBy: string
    notes?: string
    id?: string
  }): Promise<Invoice | null> => {
    if (!activeWorkspace || !isSupabaseConfigured()) return null
    const supabase = createClient()
    if (!supabase) return null

    const today = new Date()
    const dueDate = new Date(today)
    dueDate.setDate(dueDate.getDate() + 30)
    const fmt = (d: Date) => d.toISOString().split("T")[0]

    const invoiceNumber = nextInvoiceNumberFromList(invoices)

    const invoice: Invoice = {
      id: input.id || crypto.randomUUID(),
      invoiceNumber,
      clientName: input.clientName,
      clientId: input.clientId,
      status: "unsent",
      issueDate: fmt(today),
      dueDate: fmt(dueDate),
      taskIds: input.taskIds,
      lineItems: input.lineItems,
      subtotal: input.subtotal,
      gst: input.gst,
      total: input.total,
      notes: input.notes || "",
      createdBy: input.createdBy,
      createdAt: today.toISOString(),
    }

    setInvoices((prev) => [...prev, invoice])

    const { data, error } = await supabase
      .from("invoices")
      .insert({
        id: invoice.id,
        workspace_id: activeWorkspace.id,
        invoice_number: invoice.invoiceNumber,
        client_name: invoice.clientName,
        client_id: invoice.clientId,
        status: invoice.status,
        issue_date: invoice.issueDate,
        due_date: invoice.dueDate,
        task_ids: invoice.taskIds,
        line_items: invoice.lineItems as unknown as Record<string, unknown>[],
        subtotal: invoice.subtotal,
        gst: invoice.gst,
        total: invoice.total,
        notes: invoice.notes,
        created_by: invoice.createdBy,
      })
      .select()
      .single()

    if (error) {
      console.error("Failed to add invoice:", error.message)
      setInvoices((prev) => prev.filter((i) => i.id !== invoice.id))
      return null
    }

    if (data) {
      const persisted = dbToInvoice(data as InvoiceRow)
      setInvoices((prev) => prev.map((i) => i.id === invoice.id ? persisted : i))
      return persisted
    }

    return invoice
  }, [activeWorkspace, invoices])

  const updateInvoiceStatus = useCallback(async (id: string, status: InvoiceStatus) => {
    const updates: Partial<Invoice> = { status }
    if (status === "paid") updates.paidAt = new Date().toISOString()

    setInvoices((prev) => prev.map((inv) =>
      inv.id === id ? { ...inv, ...updates } : inv
    ))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const dbUpdates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (status === "paid") dbUpdates.paid_at = updates.paidAt

    const { error } = await supabase.from("invoices").update(dbUpdates).eq("id", id)
    if (error) {
      console.error("Failed to update invoice status:", error.message)
      fetchInvoices()
    }
  }, [fetchInvoices])

  const markInvoiceSent = useCallback(async (id: string, params: { sentTo: string; deliveryMethod?: InvoiceDeliveryMethod }) => {
    const now = new Date().toISOString()
    setInvoices((prev) => prev.map((inv) => {
      if (inv.id !== id) return inv
      return {
        ...inv,
        status: "sent" as InvoiceStatus,
        sentAt: now,
        sentTo: params.sentTo,
        sentError: undefined,
        ...(params.deliveryMethod ? { deliveryMethod: params.deliveryMethod } : {}),
      }
    }))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const dbUpdates: Record<string, unknown> = {
      status: "sent",
      sent_at: now,
      sent_to: params.sentTo,
      sent_error: null,
      updated_at: now,
    }
    if (params.deliveryMethod) dbUpdates.delivery_method = params.deliveryMethod

    const { error } = await supabase.from("invoices").update(dbUpdates).eq("id", id)
    if (error) {
      console.error("Failed to mark invoice sent:", error.message)
      fetchInvoices()
    }
  }, [fetchInvoices])

  const markInvoiceSendError = useCallback(async (id: string, error: string) => {
    setInvoices((prev) => prev.map((inv) =>
      inv.id === id ? { ...inv, sentError: error } : inv
    ))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const { error: dbError } = await supabase
      .from("invoices")
      .update({ sent_error: error, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (dbError) {
      console.error("Failed to update send error:", dbError.message)
      fetchInvoices()
    }
  }, [fetchInvoices])

  const deleteInvoice = useCallback(async (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const { error } = await supabase.from("invoices").delete().eq("id", id)
    if (error) {
      console.error("Failed to delete invoice:", error.message)
      fetchInvoices()
    }
  }, [fetchInvoices])

  const exportInvoiceToCsv = useCallback((invoice: Invoice) => {
    const headers = [
      "Invoice Number", "Client", "Status", "Issue Date", "Due Date",
      "Description", "Charge Number", "Quantity", "Unit", "Rate", "Amount",
    ]
    const rows = invoice.lineItems.map((li) => [
      invoice.invoiceNumber,
      invoice.clientName,
      invoice.status,
      invoice.issueDate,
      invoice.dueDate,
      li.description,
      li.chargeItemNumber,
      String(li.quantity),
      li.unit,
      li.rate.toFixed(2),
      li.amount.toFixed(2),
    ])
    rows.push(["", "", "", "", "", "", "", "", "", "Subtotal", invoice.subtotal.toFixed(2)])
    rows.push(["", "", "", "", "", "", "", "", "", "GST", invoice.gst.toFixed(2)])
    rows.push(["", "", "", "", "", "", "", "", "", "Total", invoice.total.toFixed(2)])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${invoice.invoiceNumber}_${invoice.clientName.replace(/\s+/g, "_")}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  const exportAllToCsv = useCallback((invoiceList: Invoice[]) => {
    if (invoiceList.length === 0) return
    const headers = [
      "Invoice Number", "Client", "Status", "Issue Date", "Due Date",
      "Description", "Charge Number", "Quantity", "Unit", "Rate", "Amount",
      "Subtotal", "GST", "Total",
    ]
    const rows: string[][] = []
    for (const inv of invoiceList) {
      for (const li of inv.lineItems) {
        rows.push([
          inv.invoiceNumber, inv.clientName, inv.status, inv.issueDate, inv.dueDate,
          li.description, li.chargeItemNumber, String(li.quantity), li.unit,
          li.rate.toFixed(2), li.amount.toFixed(2),
          inv.subtotal.toFixed(2), inv.gst.toFixed(2), inv.total.toFixed(2),
        ])
      }
    }
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `invoices_export_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  return {
    invoices,
    isLoading,
    addInvoice,
    updateInvoiceStatus,
    markInvoiceSent,
    markInvoiceSendError,
    deleteInvoice,
    exportInvoiceToCsv,
    exportAllToCsv,
    refetch: fetchInvoices,
  }
}
