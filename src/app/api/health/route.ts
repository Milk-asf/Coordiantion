import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabasePublicEnv } from "@/lib/supabase/config"

export const dynamic = "force-dynamic"

/**
 * Unauthenticated liveness/readiness probe for uptime monitors and load
 * balancers. Reports reachability only — never data or configuration values.
 */
export async function GET() {
  const checks: Record<string, "ok" | "error" | "not_configured"> = {}
  let healthy = true

  const supabaseEnv = getSupabasePublicEnv()
  if (!supabaseEnv) {
    checks.database = "not_configured"
    healthy = false
  } else {
    try {
      const supabase = createClient(supabaseEnv.url, supabaseEnv.key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      // Cheapest possible round-trip: HEAD count under RLS returns no rows,
      // but proves the database answers.
      const { error } = await supabase
        .from("workspaces")
        .select("id", { count: "exact", head: true })
      checks.database = error ? "error" : "ok"
      if (error) healthy = false
    } catch {
      checks.database = "error"
      healthy = false
    }
  }

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  )
}
