import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendInvoiceSchema } from "@/lib/validations"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import type { Invoice } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rl = rateLimit(`send-invoice:${user.id}`, { maxRequests: 10, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before sending another invoice." },
      { status: 429, headers: getRateLimitHeaders(rl) }
    )
  }

  const raw = await request.json()
  const parsed = sendInvoiceSchema.safeParse(raw)

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ")
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { invoice: invoiceData, recipientEmail, recipientName, participantName, ndisNumber, orgSettings, workspaceId } = parsed.data
  const invoice = invoiceData as unknown as Invoice

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .single()

  if (!membership) return NextResponse.json({ error: "Not a workspace member" }, { status: 403 })
  if (!["super-admin", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  if (invoice.id) {
    const { data: dbInvoice } = await supabase
      .from("invoices")
      .select("id, workspace_id")
      .eq("id", invoice.id)
      .eq("workspace_id", workspaceId)
      .single()
    if (!dbInvoice) {
      return NextResponse.json({ error: "Invoice not found in this workspace" }, { status: 404 })
    }
  }

  // Push to Xero first (when enabled) so a "Pay now" link can be embedded in
  // the PDF + email. Push failures are non-fatal: the email still goes out.
  let payNowUrl: string | undefined
  let xeroWarning: string | undefined
  if (invoice.id) {
    try {
      const { loadConnection, pushInvoiceToXero } = await import("@/lib/xero/client")
      const connection = await loadConnection(workspaceId)
      if (connection && (connection.auto_push_invoices || connection.include_pay_now)) {
        const result = await pushInvoiceToXero({
          workspaceId,
          invoiceId: invoice.id,
          contactEmail: recipientEmail,
          withOnlineUrl: connection.include_pay_now,
        })
        if (connection.include_pay_now && result.onlineInvoiceUrl) payNowUrl = result.onlineInvoiceUrl
      }
    } catch (xeroErr) {
      console.error("Xero push during invoice send failed:", xeroErr)
      xeroWarning = xeroErr instanceof Error ? xeroErr.message : "Failed to push invoice to Xero"
    }
  }

  try {
    const { sendEmail } = await import("@/lib/email/send")
    const { generateInvoicePDF } = await import("@/lib/pdf/invoice-pdf")
    const { InvoiceEmail } = await import("@/lib/email/templates/invoice-email")

    const pdfBuffer = await generateInvoicePDF(invoice, orgSettings, ndisNumber, payNowUrl)

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

    const sent = await sendEmail({
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
        payNowUrl,
      }),
      attachments: [
        {
          filename: `${invoice.invoiceNumber}_${participantName.replace(/\s+/g, "_")}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    })

    const sentMessageId = sent?.id ?? null

    // Store the rendered PDF and snapshot the org details / send metadata so
    // the issued document can be reproduced exactly later. Non-fatal: the
    // email has already been sent successfully at this point.
    let pdfPath: string | null = null
    try {
      const path = `${workspaceId}/${invoice.invoiceNumber}.pdf`
      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(path, pdfBuffer, { contentType: "application/pdf", upsert: true })
      if (!uploadError) pdfPath = path
      else console.error("Failed to store invoice PDF:", uploadError.message)

      if (invoice.id) {
        await supabase
          .from("invoices")
          .update({
            org_snapshot: orgSettings,
            sent_message_id: sentMessageId,
            ...(pdfPath ? { pdf_path: pdfPath } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoice.id)
          .eq("workspace_id", workspaceId)
      }
    } catch (storeErr) {
      console.error("Failed to persist invoice send metadata:", storeErr)
    }

    return NextResponse.json({
      success: true,
      sentTo: recipientEmail,
      sentAt: new Date().toISOString(),
      sentMessageId,
      pdfPath,
      ...(xeroWarning ? { xeroWarning } : {}),
    })
  } catch (err: unknown) {
    console.error("Failed to send invoice email:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send email" },
      { status: 500 },
    )
  }
}
