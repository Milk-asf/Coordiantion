import { describe, it, expect } from "vitest"
import {
  invoiceLineItemSchema,
  invoiceSchema,
  sendInvoiceSchema,
  generatePdfSchema,
  inviteMemberSchema,
} from "@/lib/validations"

describe("invoiceLineItemSchema", () => {
  it("accepts a valid line item", () => {
    const result = invoiceLineItemSchema.safeParse({
      id: "item-1",
      description: "Support work",
      chargeItemNumber: "01_002",
      chargeName: "Assistance with daily life",
      quantity: 2,
      unit: "hour",
      rate: 65.09,
      amount: 130.18,
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing required fields", () => {
    const result = invoiceLineItemSchema.safeParse({
      description: "Support work",
    })
    expect(result.success).toBe(false)
  })

  it("applies defaults for optional fields", () => {
    const result = invoiceLineItemSchema.safeParse({
      id: "item-2",
      quantity: 1,
      rate: 50,
      amount: 50,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe("")
      expect(result.data.unit).toBe("hour")
      expect(result.data.chargeItemNumber).toBe("")
    }
  })
})

describe("invoiceSchema", () => {
  it("accepts a valid invoice", () => {
    const result = invoiceSchema.safeParse({
      invoiceNumber: "INV-0001",
      clientName: "John Smith",
      subtotal: 100,
      gst: 10,
      total: 110,
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invoice without invoice number", () => {
    const result = invoiceSchema.safeParse({
      invoiceNumber: "",
      clientName: "John",
    })
    expect(result.success).toBe(false)
  })

  it("applies default values", () => {
    const result = invoiceSchema.safeParse({
      invoiceNumber: "INV-0005",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.clientName).toBe("")
      expect(result.data.lineItems).toEqual([])
      expect(result.data.taskIds).toEqual([])
      expect(result.data.notes).toBe("")
    }
  })
})

describe("sendInvoiceSchema", () => {
  const validPayload = {
    invoice: {
      invoiceNumber: "INV-0001",
      clientName: "Jane",
      subtotal: 200,
      gst: 20,
      total: 220,
    },
    recipientEmail: "jane@example.com",
    recipientName: "Jane Doe",
    participantName: "Jane",
    ndisNumber: "123456789",
    workspaceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  }

  it("accepts a valid send invoice payload", () => {
    const result = sendInvoiceSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it("rejects invalid email", () => {
    const result = sendInvoiceSchema.safeParse({
      ...validPayload,
      recipientEmail: "not-an-email",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid workspace UUID", () => {
    const result = sendInvoiceSchema.safeParse({
      ...validPayload,
      workspaceId: "not-a-uuid",
    })
    expect(result.success).toBe(false)
  })

  it("provides default orgSettings when omitted", () => {
    const result = sendInvoiceSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.orgSettings.orgName).toBe("")
      expect(result.data.orgSettings.bankBsb).toBe("")
    }
  })
})

describe("generatePdfSchema", () => {
  const validPayload = {
    invoice: {
      invoiceNumber: "INV-0010",
      subtotal: 500,
      gst: 50,
      total: 550,
    },
    workspaceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  }

  it("accepts a valid generate PDF payload", () => {
    const result = generatePdfSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it("rejects missing workspaceId", () => {
    const { workspaceId, ...noWs } = validPayload
    const result = generatePdfSchema.safeParse(noWs)
    expect(result.success).toBe(false)
  })
})

describe("inviteMemberSchema", () => {
  it("accepts a valid invite", () => {
    const result = inviteMemberSchema.safeParse({
      email: "team@example.com",
      workspaceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      role: "admin",
    })
    expect(result.success).toBe(true)
  })

  it("defaults role to coordinator", () => {
    const result = inviteMemberSchema.safeParse({
      email: "new@example.com",
      workspaceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBe("coordinator")
    }
  })

  it("rejects invalid role value", () => {
    const result = inviteMemberSchema.safeParse({
      email: "a@b.com",
      workspaceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      role: "owner",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid email", () => {
    const result = inviteMemberSchema.safeParse({
      email: "bademail",
      workspaceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    })
    expect(result.success).toBe(false)
  })
})
