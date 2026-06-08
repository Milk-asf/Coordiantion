import { z } from "zod"

export const invoiceLineItemSchema = z.object({
  id: z.string(),
  description: z.string().optional().default(""),
  chargeItemNumber: z.string().optional().default(""),
  chargeName: z.string().optional().default(""),
  quantity: z.number(),
  unit: z.string().optional().default("hour"),
  rate: z.number(),
  amount: z.number(),
  serviceDate: z.string().optional(),
  gstCode: z.string().optional(),
  gstAmount: z.number().optional(),
  taskId: z.string().optional(),
  clientId: z.string().optional(),
})

export const invoiceSchema = z.object({
  id: z.string().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  clientName: z.string().default(""),
  clientId: z.string().nullable().optional(),
  status: z.enum(["unsent", "sent", "paid", "overdue", "void"]).optional(),
  issueDate: z.string().optional().default(""),
  dueDate: z.string().optional().default(""),
  taskIds: z.array(z.string()).optional().default([]),
  lineItems: z.array(invoiceLineItemSchema).optional().default([]),
  subtotal: z.number().default(0),
  gst: z.number().default(0),
  total: z.number().default(0),
  notes: z.string().optional().default(""),
  createdBy: z.string().optional().default(""),
  createdAt: z.string().optional().default(""),
  kind: z.enum(["invoice", "credit-note"]).optional(),
  creditOf: z.string().nullable().optional(),
  deliveryMethod: z.string().nullable().optional(),
  sentAt: z.string().nullable().optional(),
  sentTo: z.string().nullable().optional(),
  sentError: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  voidedAt: z.string().nullable().optional(),
  pdfPath: z.string().nullable().optional(),
  sentMessageId: z.string().nullable().optional(),
})

export const orgSettingsSchema = z.object({
  orgName: z.string().optional().default(""),
  orgAbn: z.string().optional().default(""),
  ndisNumber: z.string().optional().default(""),
  orgPhone: z.string().optional().default(""),
  orgEmail: z.string().optional().default(""),
  orgAddress: z.string().optional().default(""),
  bankName: z.string().optional().default(""),
  bankBsb: z.string().optional().default(""),
  bankAccountNumber: z.string().optional().default(""),
  bankAccountName: z.string().optional().default(""),
  logoUrl: z.string().optional().default(""),
  primaryColor: z.string().optional().default(""),
  replyToEmail: z.string().optional().default(""),
  emailFooter: z.string().optional().default(""),
})

const defaultOrgSettings = () => ({
  orgName: "",
  orgAbn: "",
  ndisNumber: "",
  orgPhone: "",
  orgEmail: "",
  orgAddress: "",
  bankName: "",
  bankBsb: "",
  bankAccountNumber: "",
  bankAccountName: "",
  logoUrl: "",
  primaryColor: "",
  replyToEmail: "",
  emailFooter: "",
})

export const sendInvoiceSchema = z.object({
  invoice: invoiceSchema,
  recipientEmail: z.string().email("A valid recipient email is required"),
  recipientName: z.string().default(""),
  participantName: z.string().default(""),
  ndisNumber: z.string().default(""),
  orgSettings: orgSettingsSchema.optional().default(defaultOrgSettings),
  workspaceId: z.string().uuid("A valid workspace ID is required"),
})

export const generatePdfSchema = z.object({
  invoice: invoiceSchema,
  orgSettings: orgSettingsSchema.optional().default(defaultOrgSettings),
  ndisNumber: z.string().optional().default(""),
  workspaceId: z.string().uuid("A valid workspace ID is required"),
})

export const inviteMemberSchema = z.object({
  email: z.string().email("A valid email address is required"),
  workspaceId: z.string().uuid("A valid workspace ID is required"),
  role: z.enum(["super-admin", "admin", "coordinator"]).optional().default("coordinator"),
})

export const xeroWorkspaceSchema = z.object({
  workspaceId: z.string().uuid("A valid workspace ID is required"),
})

export const xeroSettingsSchema = z.object({
  workspaceId: z.string().uuid("A valid workspace ID is required"),
  revenueAccountCode: z.string().min(1, "A revenue account code is required"),
  salesTaxType: z.string().min(1, "A tax type is required"),
})

export const pushInvoiceSchema = z.object({
  workspaceId: z.string().uuid("A valid workspace ID is required"),
  invoiceId: z.string().uuid("A valid invoice ID is required"),
  contactEmail: z.string().email("A valid contact email is required").optional(),
})
