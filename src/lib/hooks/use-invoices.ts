"use client"

import { useState, useEffect, useCallback } from "react"
import type { Invoice, InvoiceStatus, InvoiceLineItem, InvoiceDeliveryMethod } from "@/lib/types"

const STORAGE_KEY = "coordination:invoices"
const COUNTER_KEY = "coordination:invoice-counter"
type StoredInvoice = Omit<Invoice, "status"> & { status: InvoiceStatus | "draft" }

function isInvoiceStatus(value: unknown): value is InvoiceStatus {
  return value === "unsent" || value === "sent" || value === "paid" || value === "overdue" || value === "draft"
}

function isInvoiceDeliveryMethod(value: unknown): value is InvoiceDeliveryMethod {
  return value === "plan-manager-email" || value === "participant-email" || value === "ndia-portal"
}

function isInvoiceLineItem(value: unknown): value is InvoiceLineItem {
  if (!value || typeof value !== "object") return false

  const lineItem = value as Partial<InvoiceLineItem>

  return typeof lineItem.id === "string"
    && typeof lineItem.description === "string"
    && typeof lineItem.chargeItemNumber === "string"
    && typeof lineItem.chargeName === "string"
    && typeof lineItem.quantity === "number"
    && (lineItem.unit === "hour" || lineItem.unit === "each")
    && typeof lineItem.rate === "number"
    && typeof lineItem.amount === "number"
}

function isStoredInvoice(value: unknown): value is StoredInvoice {
  if (!value || typeof value !== "object") return false

  const invoice = value as Partial<StoredInvoice>

  return typeof invoice.id === "string"
    && typeof invoice.invoiceNumber === "string"
    && typeof invoice.clientName === "string"
    && (typeof invoice.clientId === "string" || invoice.clientId === null)
    && isInvoiceStatus(invoice.status)
    && typeof invoice.issueDate === "string"
    && typeof invoice.dueDate === "string"
    && Array.isArray(invoice.taskIds)
    && invoice.taskIds.every((taskId) => typeof taskId === "string")
    && Array.isArray(invoice.lineItems)
    && invoice.lineItems.every(isInvoiceLineItem)
    && typeof invoice.subtotal === "number"
    && typeof invoice.gst === "number"
    && typeof invoice.total === "number"
    && typeof invoice.notes === "string"
    && typeof invoice.createdBy === "string"
    && typeof invoice.createdAt === "string"
    && (invoice.deliveryMethod === undefined || isInvoiceDeliveryMethod(invoice.deliveryMethod))
}

function loadInvoices(): Invoice[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) return []

      return parsed
        .filter(isStoredInvoice)
        .map((invoice) => ({
          ...invoice,
          status: invoice.status === "draft" ? "unsent" : invoice.status,
        }))
    } catch {
      /* fall through */
    }
  }
  return []
}

function saveInvoices(invoices: Invoice[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices))
  window.dispatchEvent(new Event("invoices-updated"))
}

function nextInvoiceNumber(): string {
  if (typeof window === "undefined") return "INV-0001"
  const current = parseInt(localStorage.getItem(COUNTER_KEY) || "0", 10)
  const next = current + 1
  localStorage.setItem(COUNTER_KEY, String(next))
  return `INV-${String(next).padStart(4, "0")}`
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])

  useEffect(() => {
    setInvoices(loadInvoices())

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setInvoices(loadInvoices())
    }
    const handleCustom = () => setInvoices(loadInvoices())

    window.addEventListener("storage", handleStorage)
    window.addEventListener("invoices-updated", handleCustom)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("invoices-updated", handleCustom)
    }
  }, [])

  const addInvoice = useCallback((input: {
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
  }): Invoice => {
    const today = new Date()
    const dueDate = new Date(today)
    dueDate.setDate(dueDate.getDate() + 30)
    const fmt = (d: Date) => d.toISOString().split("T")[0]

    const invoice: Invoice = {
      id: input.id || crypto.randomUUID(),
      invoiceNumber: nextInvoiceNumber(),
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

    setInvoices((prev) => {
      const next = [...prev, invoice]
      saveInvoices(next)
      return next
    })
    return invoice
  }, [])

  const updateInvoiceStatus = useCallback((id: string, status: InvoiceStatus) => {
    setInvoices((prev) => {
      const next = prev.map((inv) => {
        if (inv.id !== id) return inv
        const updates: Partial<Invoice> = { status }
        if (status === "paid") updates.paidAt = new Date().toISOString()
        return { ...inv, ...updates }
      })
      saveInvoices(next)
      return next
    })
  }, [])

  const markInvoiceSent = useCallback((id: string, params: { sentTo: string; deliveryMethod?: InvoiceDeliveryMethod }) => {
    setInvoices((prev) => {
      const next = prev.map((inv) => {
        if (inv.id !== id) return inv
        return {
          ...inv,
          status: "sent" as InvoiceStatus,
          sentAt: new Date().toISOString(),
          sentTo: params.sentTo,
          sentError: undefined,
          ...(params.deliveryMethod ? { deliveryMethod: params.deliveryMethod } : {}),
        }
      })
      saveInvoices(next)
      return next
    })
  }, [])

  const markInvoiceSendError = useCallback((id: string, error: string) => {
    setInvoices((prev) => {
      const next = prev.map((inv) => {
        if (inv.id !== id) return inv
        return { ...inv, sentError: error }
      })
      saveInvoices(next)
      return next
    })
  }, [])

  const deleteInvoice = useCallback((id: string) => {
    setInvoices((prev) => {
      const next = prev.filter((inv) => inv.id !== id)
      saveInvoices(next)
      return next
    })
  }, [])

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
    addInvoice,
    updateInvoiceStatus,
    markInvoiceSent,
    markInvoiceSendError,
    deleteInvoice,
    exportInvoiceToCsv,
    exportAllToCsv,
  }
}
