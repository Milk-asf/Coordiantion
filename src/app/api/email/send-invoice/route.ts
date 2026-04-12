import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Invoice, WorkspaceEmailSettings } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const {
    invoice,
    recipientEmail,
    recipientName,
    participantName,
    ndisNumber,
    orgSettings,
  } = body as {
    invoice: Invoice
    recipientEmail: string
    recipientName: string
    participantName: string
    ndisNumber: string
    orgSettings: Partial<WorkspaceEmailSettings>
  }

  if (!recipientEmail?.includes("@"))
    return NextResponse.json({ error: "Invalid recipient email" }, { status: 400 })
  if (!invoice?.invoiceNumber)
    return NextResponse.json({ error: "Invalid invoice data" }, { status: 400 })

  try {
    const { sendEmail } = await import("@/lib/email/send")
    const { generateInvoicePDF } = await import("@/lib/pdf/invoice-pdf")
    const { InvoiceEmail } = await import("@/lib/email/templates/invoice-email")

    const pdfBuffer = await generateInvoicePDF(invoice, orgSettings, ndisNumber)

    const issueDate = invoice.issueDate
      ? new Date(invoice.issueDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
      : ""
    const dueDate = invoice.dueDate
      ? new Date(invoice.dueDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
      : ""
    const total = `$${invoice.total.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    const lineItemsSummary = invoice.lineItems
      .map((li) => li.chargeName || li.description)
      .filter(Boolean)
      .join(", ")

    const orgName = orgSettings.orgName || "Organisation"

    await sendEmail({
      to: recipientEmail,
      subject: `Invoice ${invoice.invoiceNumber} — ${participantName} — ${orgName}`,
      fromName: orgName,
      replyTo: orgSettings.replyToEmail || orgSettings.orgEmail || undefined,
      react: InvoiceEmail({
        orgName,
        recipientName: recipientName || "Plan Manager",
        invoiceNumber: invoice.invoiceNumber,
        issueDate,
        dueDate,
        participantName,
        ndisNumber,
        total,
        lineItemsSummary,
        orgPhone: orgSettings.orgPhone,
        orgEmail: orgSettings.orgEmail,
        orgAddress: orgSettings.orgAddress,
        bankName: orgSettings.bankName,
        bankBsb: orgSettings.bankBsb,
        bankAccountNumber: orgSettings.bankAccountNumber,
        bankAccountName: orgSettings.bankAccountName,
        emailFooter: orgSettings.emailFooter,
      }),
      attachments: [
        {
          filename: `${invoice.invoiceNumber}_${participantName.replace(/\s+/g, "_")}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    })

    return NextResponse.json({
      success: true,
      sentTo: recipientEmail,
      sentAt: new Date().toISOString(),
    })
  } catch (err: unknown) {
    console.error("Failed to send invoice email:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send email" },
      { status: 500 },
    )
  }
}
