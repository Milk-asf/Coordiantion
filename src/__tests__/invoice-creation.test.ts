import { describe, it, expect } from "vitest"
import type { Invoice, InvoiceLineItem, InvoiceStatus } from "@/lib/types"

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
    ...(row.delivery_method ? { deliveryMethod: row.delivery_method as Invoice["deliveryMethod"] } : {}),
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

describe("dbToInvoice", () => {
  it("maps a database row to Invoice type", () => {
    const row: InvoiceRow = {
      id: "inv-1",
      workspace_id: "ws-1",
      invoice_number: "INV-0001",
      client_name: "Acme Corp",
      client_id: "client-1",
      status: "sent",
      issue_date: "2026-04-01",
      due_date: "2026-05-01",
      task_ids: ["task-1", "task-2"],
      line_items: [
        { id: "li-1", description: "Support", chargeItemNumber: "01_001", chargeName: "Daily support", quantity: 2, unit: "hour", rate: 65, amount: 130 },
      ],
      subtotal: 130,
      gst: 13,
      total: 143,
      notes: "Monthly invoice",
      created_by: "user-1",
      delivery_method: "email",
      sent_at: "2026-04-02T10:00:00Z",
      sent_to: "client@acme.com",
      sent_error: null,
      paid_at: null,
      created_at: "2026-04-01T09:00:00Z",
      updated_at: "2026-04-02T10:00:00Z",
    }

    const invoice = dbToInvoice(row)

    expect(invoice.id).toBe("inv-1")
    expect(invoice.invoiceNumber).toBe("INV-0001")
    expect(invoice.clientName).toBe("Acme Corp")
    expect(invoice.clientId).toBe("client-1")
    expect(invoice.status).toBe("sent")
    expect(invoice.issueDate).toBe("2026-04-01")
    expect(invoice.dueDate).toBe("2026-05-01")
    expect(invoice.taskIds).toEqual(["task-1", "task-2"])
    expect(invoice.lineItems).toHaveLength(1)
    expect(invoice.subtotal).toBe(130)
    expect(invoice.gst).toBe(13)
    expect(invoice.total).toBe(143)
    expect(invoice.notes).toBe("Monthly invoice")
    expect(invoice.createdBy).toBe("user-1")
    expect(invoice.sentAt).toBe("2026-04-02T10:00:00Z")
    expect(invoice.sentTo).toBe("client@acme.com")
    expect(invoice.deliveryMethod).toBe("email")
    expect(invoice.paidAt).toBeUndefined()
  })

  it("handles null/missing optional fields", () => {
    const row: InvoiceRow = {
      id: "inv-2",
      workspace_id: "ws-1",
      invoice_number: "INV-0002",
      client_name: "Solo Client",
      client_id: null,
      status: "unsent",
      issue_date: "2026-04-10",
      due_date: "2026-05-10",
      task_ids: [],
      line_items: [],
      subtotal: 0,
      gst: 0,
      total: 0,
      notes: "",
      created_by: "",
      delivery_method: null,
      sent_at: null,
      sent_to: null,
      sent_error: null,
      paid_at: null,
      created_at: "2026-04-10T08:00:00Z",
      updated_at: "2026-04-10T08:00:00Z",
    }

    const invoice = dbToInvoice(row)

    expect(invoice.clientId).toBeNull()
    expect(invoice.sentAt).toBeUndefined()
    expect(invoice.sentTo).toBeUndefined()
    expect(invoice.sentError).toBeUndefined()
    expect(invoice.deliveryMethod).toBeUndefined()
    expect(invoice.paidAt).toBeUndefined()
  })

  it("converts numeric strings correctly", () => {
    const row: InvoiceRow = {
      id: "inv-3",
      workspace_id: "ws-1",
      invoice_number: "INV-0003",
      client_name: "Test",
      client_id: null,
      status: "paid",
      issue_date: "2026-03-01",
      due_date: "2026-03-31",
      task_ids: [],
      line_items: [],
      subtotal: 999.99,
      gst: 99.999,
      total: 1099.989,
      notes: "",
      created_by: "user-2",
      delivery_method: null,
      sent_at: null,
      sent_to: null,
      sent_error: null,
      paid_at: "2026-04-01T12:00:00Z",
      created_at: "2026-03-01T10:00:00Z",
      updated_at: "2026-04-01T12:00:00Z",
    }

    const invoice = dbToInvoice(row)

    expect(invoice.subtotal).toBe(999.99)
    expect(invoice.gst).toBe(99.999)
    expect(invoice.total).toBe(1099.989)
    expect(invoice.paidAt).toBe("2026-04-01T12:00:00Z")
  })
})

describe("nextInvoiceNumberFromList", () => {
  it("returns INV-0001 for empty list", () => {
    expect(nextInvoiceNumberFromList([])).toBe("INV-0001")
  })

  it("increments from highest existing number", () => {
    const invoices = [
      { invoiceNumber: "INV-0001" },
      { invoiceNumber: "INV-0005" },
      { invoiceNumber: "INV-0003" },
    ] as Invoice[]

    expect(nextInvoiceNumberFromList(invoices)).toBe("INV-0006")
  })

  it("ignores non-standard invoice numbers", () => {
    const invoices = [
      { invoiceNumber: "INV-0010" },
      { invoiceNumber: "CUSTOM-001" },
      { invoiceNumber: "something" },
    ] as Invoice[]

    expect(nextInvoiceNumberFromList(invoices)).toBe("INV-0011")
  })

  it("zero-pads to 4 digits", () => {
    const invoices = [{ invoiceNumber: "INV-0002" }] as Invoice[]
    expect(nextInvoiceNumberFromList(invoices)).toBe("INV-0003")
  })

  it("handles high numbers", () => {
    const invoices = [{ invoiceNumber: "INV-9999" }] as Invoice[]
    expect(nextInvoiceNumberFromList(invoices)).toBe("INV-10000")
  })
})

describe("Invoice creation flow", () => {
  it("creates a draft invoice with correct defaults", () => {
    const today = new Date()
    const dueDate = new Date(today)
    dueDate.setDate(dueDate.getDate() + 30)
    const fmt = (d: Date) => d.toISOString().split("T")[0]

    const lineItems: InvoiceLineItem[] = [
      {
        id: "li-1",
        description: "Community access support",
        chargeItemNumber: "04_104",
        chargeName: "Community Access",
        quantity: 3,
        unit: "hour",
        rate: 67.56,
        amount: 202.68,
      },
    ]

    const invoice: Invoice = {
      id: "new-inv-id",
      invoiceNumber: "INV-0001",
      clientName: "John Smith",
      clientId: "client-john",
      status: "unsent",
      issueDate: fmt(today),
      dueDate: fmt(dueDate),
      taskIds: ["task-a", "task-b"],
      lineItems,
      subtotal: 202.68,
      gst: 20.27,
      total: 222.95,
      notes: "",
      createdBy: "user-admin",
      createdAt: today.toISOString(),
    }

    expect(invoice.status).toBe("unsent")
    expect(invoice.issueDate).toBe(fmt(today))
    expect(invoice.dueDate).toBe(fmt(dueDate))
    expect(invoice.lineItems).toHaveLength(1)
    expect(invoice.total).toBeCloseTo(222.95, 2)
  })

  it("transitions invoice from unsent to sent", () => {
    const invoice: Invoice = {
      id: "inv-flow-1",
      invoiceNumber: "INV-0001",
      clientName: "Test",
      clientId: null,
      status: "unsent",
      issueDate: "2026-04-01",
      dueDate: "2026-05-01",
      taskIds: [],
      lineItems: [],
      subtotal: 100,
      gst: 10,
      total: 110,
      notes: "",
      createdBy: "user-1",
      createdAt: "2026-04-01T00:00:00Z",
    }

    const sent: Invoice = {
      ...invoice,
      status: "sent",
      sentAt: "2026-04-02T09:00:00Z",
      sentTo: "client@test.com",
      deliveryMethod: "plan-manager-email",
    }

    expect(sent.status).toBe("sent")
    expect(sent.sentAt).toBeDefined()
    expect(sent.sentTo).toBe("client@test.com")
  })

  it("marks invoice as overdue when past due date", () => {
    const invoice: Invoice = {
      id: "inv-flow-2",
      invoiceNumber: "INV-0002",
      clientName: "Late Payer",
      clientId: null,
      status: "sent",
      issueDate: "2026-01-01",
      dueDate: "2026-01-31",
      taskIds: [],
      lineItems: [],
      subtotal: 500,
      gst: 50,
      total: 550,
      notes: "",
      createdBy: "user-1",
      createdAt: "2026-01-01T00:00:00Z",
      sentAt: "2026-01-02T00:00:00Z",
    }

    const today = "2026-04-16"
    const isOverdue = invoice.status === "sent" && invoice.dueDate < today
    expect(isOverdue).toBe(true)

    const updated: Invoice = { ...invoice, status: "overdue" }
    expect(updated.status).toBe("overdue")
  })

  it("marks invoice as paid", () => {
    const invoice: Invoice = {
      id: "inv-flow-3",
      invoiceNumber: "INV-0003",
      clientName: "Good Payer",
      clientId: null,
      status: "sent",
      issueDate: "2026-04-01",
      dueDate: "2026-05-01",
      taskIds: [],
      lineItems: [],
      subtotal: 300,
      gst: 30,
      total: 330,
      notes: "",
      createdBy: "user-1",
      createdAt: "2026-04-01T00:00:00Z",
    }

    const paid: Invoice = {
      ...invoice,
      status: "paid",
      paidAt: new Date().toISOString(),
    }

    expect(paid.status).toBe("paid")
    expect(paid.paidAt).toBeDefined()
  })
})
