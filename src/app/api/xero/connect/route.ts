import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { randomUUID } from "crypto"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { newXeroClient } from "@/lib/xero/client"
import { encryptSecret } from "@/lib/crypto/secure-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const OAUTH_COOKIE = "xero_oauth"

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const fail = (code: string) => NextResponse.redirect(`${origin}/settings/integrations?error=${code}`)

  const workspaceId = new URL(request.url).searchParams.get("workspaceId")
  if (!workspaceId) return fail("missing_workspace")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  const admin = createAdminClient()
  if (!admin) return fail("not_configured")

  const { data: membership } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle()

  if (!membership || !["super-admin", "admin"].includes(membership.role)) return fail("forbidden")

  const state = randomUUID()

  let consentUrl: string
  try {
    consentUrl = await newXeroClient(state).buildConsentUrl()
  } catch {
    return fail("not_configured")
  }

  const cookieStore = await cookies()
  cookieStore.set(OAUTH_COOKIE, encryptSecret(JSON.stringify({ state, workspaceId, userId: user.id })), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  })

  return NextResponse.redirect(consentUrl)
}
