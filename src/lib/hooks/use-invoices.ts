"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { Invoice, InvoiceStatus, InvoiceKind, InvoiceLineItem, InvoiceDeliveryMethod } from "@/lib/types"

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
  kind: string | null
  credit_of: string | null
  delivery_method: string | null
  sent_at: string | null
  sent_to: string | null
  sent_error: string | null
  paid_at: string | null
  voided_at: string | null
  pdf_path: string | null
  sent_message_id: string | null
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
    kind: (row.kind as InvoiceKind) || "invoice",
    ...(row.credit_of ? { creditOf: row.credit_of } : {}),
    ...(row.paid_at ? { paidAt: row.paid_at } : {}),
    ...(row.sent_at ? { sentAt: row.sent_at } : {}),
    ...(row.sent_to ? { sentTo: row.sent_to } : {}),
    ...(row.sent_error ? { sentError: row.sent_error } : {}),
    ...(row.voided_at ? { voidedAt: row.voided_at } : {}),
    ...(row.pdf_path ? { pdfPath: row.pdf_path } : {}),
    ...(row.sent_message_id ? { sentMessageId: row.sent_message_id } : {}),
    ...(row.delivery_method ? { deliveryMethod: row.delivery_method as InvoiceDeliveryMethod } : {}),
  }
}

export function useInvoices() {
  const { activeWorkspace } = useWorkspace()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
      setInvoices([])
      setIsLoading(false)
      return
    }
    const supabase = createClient()
    if (!supabase) { setInvoices([]); setIsLoading(false); return }

    setIsLoading(true)
    setFetchError(null)
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: true })

      if (error || !data) {
        setFetchError(error?.message || "Failed to load invoices")
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
      setFetchError(err instanceof Error ? err.message : "Failed to load invoices")
      setInvoices([])
    }
    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  useEffect(() => {
    if (!activeWorkspace || !isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel(`invoices-${activeWorkspace.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'invoices',
        filter: `workspace_id=eq.${activeWorkspace.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newInvoice = dbToInvoice(payload.new as InvoiceRow)
          setInvoices((prev) => {
            if (prev.some((i) => i.id === newInvoice.id)) return prev
            return [...prev, newInvoice]
          })
        } else if (payload.eventType === 'UPDATE') {
          const updated = dbToInvoice(payload.new as InvoiceRow)
          setInvoices((prev) => prev.map((i) => i.id === updated.id ? updated : i))
        } else if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as { id: string }).id
          setInvoices((prev) => prev.filter((i) => i.id !== oldId))
        }
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [activeWorkspace])

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
    kind?: InvoiceKind
    creditOf?: string
  }): Promise<Invoice | null> => {
    if (!activeWorkspace || !isSupabaseConfigured()) return null
    const supabase = createClient()
    if (!supabase) return null

    const today = new Date()
    const dueDate = new Date(today)
    dueDate.setDate(dueDate.getDate() + 30)
    const fmt = (d: Date) => d.toISOString().split("T")[0]

    const { data: numberData, error: numberError } = await supabase.rpc("next_invoice_number", {
      ws_id: activeWorkspace.id,
    })

    if (numberError || !numberData) {
      console.error("Failed to generate invoice number:", numberError?.message)
      return null
    }

    const invoiceNumber = numberData as string
    const kind: InvoiceKind = input.kind || "invoice"

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
      kind,
      ...(input.creditOf ? { creditOf: input.creditOf } : {}),
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
        kind: invoice.kind,
        credit_of: invoice.creditOf ?? null,
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
  }, [activeWorkspace])

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
    // Only draft (unsent) invoices may be deleted. Issued invoices are
    // immutable for audit purposes and must be voided or credited instead.
    const target = invoices.find((inv) => inv.id === id)
    if (target && target.status !== "unsent") {
      console.warn("Only unsent invoices can be deleted. Void or issue a credit note instead.")
      return
    }

    setInvoices((prev) => prev.filter((inv) => inv.id !== id))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const { error } = await supabase.from("invoices").delete().eq("id", id)
    if (error) {
      console.error("Failed to delete invoice:", error.message)
      fetchInvoices()
    }
  }, [fetchInvoices, invoices])

  const voidInvoice = useCallback(async (id: string) => {
    const now = new Date().toISOString()
    setInvoices((prev) => prev.map((inv) =>
      inv.id === id ? { ...inv, status: "void" as InvoiceStatus, voidedAt: now } : inv
    ))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const { error } = await supabase
      .from("invoices")
      .update({ status: "void", voided_at: now, updated_at: now })
      .eq("id", id)

    if (error) {
      console.error("Failed to void invoice:", error.message)
      fetchInvoices()
    }
  }, [fetchInvoices])

  const createCreditNote = useCallback(async (invoice: Invoice): Promise<Invoice | null> => {
    const creditLineItems: InvoiceLineItem[] = invoice.lineItems.map((li) => ({
      ...li,
      id: crypto.randomUUID(),
      quantity: -li.quantity,
      amount: -li.amount,
      ...(li.gstAmount != null ? { gstAmount: -li.gstAmount } : {}),
    }))

    return addInvoice({
      clientName: invoice.clientName,
      clientId: invoice.clientId,
      taskIds: invoice.taskIds,
      lineItems: creditLineItems,
      subtotal: -invoice.subtotal,
      gst: -invoice.gst,
      total: -invoice.total,
      createdBy: invoice.createdBy || "Team Leader",
      notes: `Credit note for ${invoice.invoiceNumber}`,
      kind: "credit-note",
      creditOf: invoice.id,
    })
  }, [addInvoice])

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
    fetchError,
    addInvoice,
    updateInvoiceStatus,
    markInvoiceSent,
    markInvoiceSendError,
    deleteInvoice,
    voidInvoice,
    createCreditNote,
    exportInvoiceToCsv,
    exportAllToCsv,
    refetch: fetchInvoices,
  }
}
