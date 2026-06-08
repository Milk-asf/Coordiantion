import { NextResponse } from "next/server"
import { authorizeWorkspaceAdmin } from "@/lib/xero/route-helpers"
import { getXeroForWorkspace } from "@/lib/xero/client"
import { xeroWorkspaceSchema } from "@/lib/validations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const raw = await request.json()
  const parsed = xeroWorkspaceSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 })
  }

  const { workspaceId } = parsed.data
  const auth = await authorizeWorkspaceAdmin(workspaceId)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // Best-effort token revocation at Xero; proceed with local delete regardless.
  try {
    const { xero } = await getXeroForWorkspace(workspaceId)
    await xero.revokeToken()
  } catch (err) {
    console.error("Xero token revoke failed (continuing):", err)
  }

  const { error } = await auth.ctx.admin
    .from("integration_connections")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("provider", "xero")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
