import { NextResponse } from "next/server"
import { authorizeWorkspaceAdmin } from "@/lib/xero/route-helpers"
import { pushInvoiceToXero } from "@/lib/xero/client"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { pushInvoiceSchema } from "@/lib/validations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

  try {
    const result = await pushInvoiceToXero({ workspaceId, invoiceId, contactEmail })
    if (result.alreadyPushed) {
      return NextResponse.json({ error: "This invoice has already been sent to Xero" }, { status: 409 })
    }
    return NextResponse.json({
      success: true,
      xeroInvoiceId: result.xeroInvoiceId,
      xeroStatus: result.xeroStatus,
    })
  } catch (err) {
    console.error("Failed to push invoice to Xero:", err)
    const message = err instanceof Error ? err.message : "Failed to push invoice to Xero"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
