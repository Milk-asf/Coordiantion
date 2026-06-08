import { NextResponse } from "next/server"
import { authorizeWorkspaceAdmin } from "@/lib/xero/route-helpers"
import { getXeroForWorkspace, toXeroInvoice } from "@/lib/xero/client"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { pushInvoiceSchema } from "@/lib/validations"
import type { Invoice as AppInvoice, InvoiceLineItem } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Escapes a value for use inside a Xero `where` string filter.
function escapeForWhere(value: string): string {
  return value.replace(/"/g, '\\"')
}

export async function POST(request: Request) {
  const raw = await request.json()
  const parsed = pushInvoiceSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 })
  }

  const { workspaceId, invoiceId, contactEmail } = parsed.data
  const auth = await authorizeWorkspaceAdmin(workspaceId)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rl = rateLimit(`xero-push:${auth.ctx.userId}`, { maxRequests: 20, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before pushing another invoice." },
      { status: 429, headers: getRateLimitHeaders(rl) },
    )
  }

  const { data: row } = await auth.ctx.admin
    .from("invoices")
    .select("id, invoice_number, client_name, issue_date, due_date, line_items, xero_invoice_id")
    .eq("id", invoiceId)
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  if (!row) return NextResponse.json({ error: "Invoice not found in this workspace" }, { status: 404 })
  if (row.xero_invoice_id) {
    return NextResponse.json({ error: "This invoice has already been sent to Xero" }, { status: 409 })
  }

  const appInvoice = {
    invoiceNumber: row.invoice_number,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    clientName: row.client_name,
    lineItems: (row.line_items ?? []) as InvoiceLineItem[],
  } as AppInvoice

  if (appInvoice.lineItems.length === 0) {
    return NextResponse.json({ error: "Invoice has no line items to send" }, { status: 400 })
  }

  try {
    const { xero, tenantId, connection } = await getXeroForWorkspace(workspaceId)

    // Find or create the Xero contact for this client.
    const clientName = (row.client_name || "Participant").trim()
    let contactID: string | undefined
    const existing = await xero.accountingApi.getContacts(tenantId, undefined, `Name=="${escapeForWhere(clientName)}"`)
    contactID = existing.body.contacts?.[0]?.contactID
    if (!contactID) {
      const created = await xero.accountingApi.createContacts(tenantId, {
        contacts: [{ name: clientName, ...(contactEmail ? { emailAddress: contactEmail } : {}) }],
      })
      contactID = created.body.contacts?.[0]?.contactID
    }
    if (!contactID) throw new Error("Could not resolve a Xero contact for this client")

    const result = await xero.accountingApi.createInvoices(tenantId, {
      invoices: [toXeroInvoice(appInvoice, contactID, connection)],
    })

    const xeroInvoice = result.body.invoices?.[0]
    if (!xeroInvoice?.invoiceID) throw new Error("Xero did not return an invoice id")

    await auth.ctx.admin
      .from("invoices")
      .update({
        xero_invoice_id: xeroInvoice.invoiceID,
        xero_status: xeroInvoice.status ?? null,
        xero_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .eq("workspace_id", workspaceId)

    return NextResponse.json({
      success: true,
      xeroInvoiceId: xeroInvoice.invoiceID,
      xeroStatus: xeroInvoice.status ?? null,
    })
  } catch (err) {
    console.error("Failed to push invoice to Xero:", err)
    const message = err instanceof Error ? err.message : "Failed to push invoice to Xero"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
