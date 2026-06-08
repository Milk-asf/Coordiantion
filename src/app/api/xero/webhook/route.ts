import { NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { getXeroForWorkspace, xeroStatusToAppStatus } from "@/lib/xero/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface XeroWebhookEvent {
  resourceId: string
  tenantId: string
  eventCategory: string
  eventType: string
}

function signaturesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export async function POST(request: Request) {
  const key = process.env.XERO_WEBHOOK_KEY
  if (!key) return new NextResponse("Webhook not configured", { status: 500 })

  // Signature is computed over the exact raw request body.
  const rawBody = await request.text()
  const provided = request.headers.get("x-xero-signature") ?? ""
  const computed = createHmac("sha256", key).update(rawBody, "utf8").digest("base64")

  if (!provided || !signaturesMatch(provided, computed)) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // Valid signature: this covers Xero's "intent to receive" check (empty events).
  let events: XeroWebhookEvent[] = []
  try {
    events = (JSON.parse(rawBody)?.events ?? []) as XeroWebhookEvent[]
  } catch {
    return new NextResponse(null, { status: 200 })
  }

  const admin = createAdminClient()
  if (!admin) return new NextResponse(null, { status: 200 })

  for (const event of events) {
    if (event.eventCategory !== "INVOICE") continue

    try {
      const { data: conn } = await admin
        .from("integration_connections")
        .select("workspace_id")
        .eq("tenant_id", event.tenantId)
        .eq("provider", "xero")
        .maybeSingle()
      if (!conn) continue

      const { data: inv } = await admin
        .from("invoices")
        .select("id")
        .eq("xero_invoice_id", event.resourceId)
        .eq("workspace_id", conn.workspace_id)
        .maybeSingle()
      if (!inv) continue

      const { xero, tenantId } = await getXeroForWorkspace(conn.workspace_id)
      const res = await xero.accountingApi.getInvoice(tenantId, event.resourceId)
      const xeroStatus = res.body.invoices?.[0]?.status as string | undefined
      const now = new Date().toISOString()

      const updates: Record<string, unknown> = {
        xero_status: xeroStatus ?? null,
        xero_synced_at: now,
        updated_at: now,
      }
      const appStatus = xeroStatus ? xeroStatusToAppStatus(xeroStatus) : null
      if (appStatus) updates.status = appStatus
      if (appStatus === "paid") updates.paid_at = now

      await admin.from("invoices").update(updates).eq("id", inv.id)
    } catch (err) {
      console.error("Failed to process Xero webhook event:", err)
    }
  }

  return new NextResponse(null, { status: 200 })
}
