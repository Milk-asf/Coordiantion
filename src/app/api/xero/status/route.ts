import { NextResponse } from "next/server"
import { authorizeWorkspaceAdmin } from "@/lib/xero/route-helpers"
import { xeroSettingsSchema } from "@/lib/validations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Returns non-secret connection status for the workspace.
export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? ""
  const auth = await authorizeWorkspaceAdmin(workspaceId)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { data } = await auth.ctx.admin
    .from("integration_connections")
    .select("tenant_id, scopes, expires_at, revenue_account_code, sales_tax_type, auto_push_invoices, include_pay_now, connected_by, created_at")
    .eq("workspace_id", workspaceId)
    .eq("provider", "xero")
    .maybeSingle()

  if (!data) return NextResponse.json({ connected: false })

  return NextResponse.json({
    connected: true,
    tenantId: data.tenant_id,
    revenueAccountCode: data.revenue_account_code,
    salesTaxType: data.sales_tax_type,
    autoPush: data.auto_push_invoices,
    includePayNow: data.include_pay_now,
    connectedAt: data.created_at,
  })
}

// Updates connection mapping settings (revenue account code + tax type).
export async function PUT(request: Request) {
  const raw = await request.json()
  const parsed = xeroSettingsSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 })
  }

  const { workspaceId, revenueAccountCode, salesTaxType, autoPush, includePayNow } = parsed.data
  const auth = await authorizeWorkspaceAdmin(workspaceId)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { error } = await auth.ctx.admin
    .from("integration_connections")
    .update({
      revenue_account_code: revenueAccountCode,
      sales_tax_type: salesTaxType,
      auto_push_invoices: autoPush,
      include_pay_now: includePayNow,
    })
    .eq("workspace_id", workspaceId)
    .eq("provider", "xero")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
