import { NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { activateInvitedMemberships } from "@/lib/invites/accept"

function safeNext(raw: string | null, fallback = ""): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw
  return fallback
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const authError = searchParams.get("error")
  const authErrorDescription = searchParams.get("error_description")
  const explicitNext = safeNext(searchParams.get("next"))

  if (authError) {
    const url = new URL(`${origin}/login`)
    url.searchParams.set("error", authErrorDescription || authError)
    return NextResponse.redirect(url.toString())
  }

  const supabase = await createClient()
  let sessionError: string | null = null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) sessionError = error.message
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) sessionError = error.message
  } else {
    // Hash-based tokens (#access_token=…) are only readable client-side
    const qs = searchParams.toString()
    return NextResponse.redirect(`${origin}/auth/confirm${qs ? `?${qs}` : ""}`)
  }

  if (sessionError) {
    const url = new URL(`${origin}/login`)
    url.searchParams.set("error", sessionError)
    return NextResponse.redirect(url.toString())
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Claim any pending invitations. This must also match membership rows the
  // invite API already linked to this user (it sets user_id when the auth
  // account is created at invite time) — matching only user_id-is-null rows
  // left invited members stuck on "invited" and routed into onboarding.
  const isInvitedMember = user
    ? (await activateInvitedMemberships(user.email, user.id)) > 0
    : false

  // Invited members skip onboarding (workspace already exists; mark complete)
  // then go through the branded create-password flow before entering the app.
  if (isInvitedMember && user) {
    if (!user.user_metadata?.onboarding_completed_at) {
      await supabase.auth.updateUser({
        data: {
          onboarding_step: "done",
          onboarding_completed_at: new Date().toISOString(),
        },
      })
    }
    return NextResponse.redirect(`${origin}${explicitNext || "/create-password"}`)
  }

  if (explicitNext) return NextResponse.redirect(`${origin}${explicitNext}`)

  if (user?.user_metadata?.onboarding_completed_at) {
    return NextResponse.redirect(`${origin}/roster`)
  }

  return NextResponse.redirect(`${origin}/onboarding`)
}
