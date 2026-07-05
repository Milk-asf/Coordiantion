import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const querySchema = z.object({ workspaceId: z.uuid() })

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Exports are heavy; a handful per hour is plenty for legitimate use.
  const rl = await checkRateLimit(`export:${user.id}`, { maxRequests: 3, windowMs: 3_600_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many export requests. Please try again later." },
      { status: 429, headers: getRateLimitHeaders(rl) }
    )
  }

  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({ workspaceId: searchParams.get("workspaceId") })
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid workspaceId is required" }, { status: 400 })
  }

  // Runs as the caller — export_workspace_json raises unless they are a
  // workspace admin, and the AAL2 policy applies to the membership check.
  const { data, error } = await supabase.rpc("export_workspace_json", {
    ws_id: parsed.data.workspaceId,
  })

  if (error) {
    const denied = error.message.includes("admins")
    return NextResponse.json(
      { error: denied ? "Only workspace admins can export workspace data" : "Export failed" },
      { status: denied ? 403 : 500 }
    )
  }

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="coordination-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  })
}
