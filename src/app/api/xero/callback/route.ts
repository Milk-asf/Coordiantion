import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { newXeroClient, upsertConnection } from "@/lib/xero/client"
import { decryptSecret } from "@/lib/crypto/secure-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const OAUTH_COOKIE = "xero_oauth"

interface OAuthState {
  state: string
  workspaceId: string
  userId: string
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const done = (params: string) => NextResponse.redirect(`${origin}/settings/integrations?${params}`)

  const returnedState = new URL(request.url).searchParams.get("state")
  const cookieStore = await cookies()
  const raw = cookieStore.get(OAUTH_COOKIE)?.value
  cookieStore.delete(OAUTH_COOKIE)

  if (!raw || !returnedState) return done("error=invalid_state")

  let parsed: OAuthState
  try {
    parsed = JSON.parse(decryptSecret(raw)) as OAuthState
  } catch {
    return done("error=invalid_state")
  }

  if (parsed.state !== returnedState) return done("error=invalid_state")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== parsed.userId) return done("error=forbidden")

  try {
    const xero = newXeroClient(returnedState)
    const tokenSet = await xero.apiCallback(request.url)
    await xero.updateTenants(false)
    const tenantId = xero.tenants?.[0]?.tenantId as string | undefined
    if (!tenantId) throw new Error("No Xero organisation was connected")

    await upsertConnection({
      workspaceId: parsed.workspaceId,
      tokenSet,
      tenantId,
      connectedBy: user.id,
    })
  } catch (err) {
    console.error("Xero connect failed:", err)
    return done("error=connect_failed")
  }

  return done("connected=xero")
}
