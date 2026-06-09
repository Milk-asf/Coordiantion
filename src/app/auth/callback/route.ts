import { NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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

  let isInvitedMember = false

  if (user?.email) {
    const adminClient = createAdminClient()
    if (adminClient) {
      const { data: pending } = await adminClient
        .from("workspace_members")
        .select("id")
        .eq("invited_email", user.email)
        .is("user_id", null)
        .limit(1)
        .maybeSingle()

      if (pending) {
        isInvitedMember = true
        await adminClient
          .from("workspace_members")
          .update({ user_id: user.id, status: "active" })
          .eq("invited_email", user.email)
          .is("user_id", null)
      }
    }
  }

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
    return NextResponse.redirect(`${origin}/tasks`)
  }

  return NextResponse.redirect(`${origin}/onboarding`)
}
