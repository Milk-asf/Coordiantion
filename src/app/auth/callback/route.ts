import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? ""
  const explicitNext =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : ""

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${origin}/login`)

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

  if (explicitNext) return NextResponse.redirect(`${origin}${explicitNext}`)

  // Invited members skip onboarding (workspace already exists; mark complete)
  if (isInvitedMember && user) {
    if (!user.user_metadata?.onboarding_completed_at) {
      await supabase.auth.updateUser({
        data: {
          onboarding_step: "done",
          onboarding_completed_at: new Date().toISOString(),
        },
      })
    }
    return NextResponse.redirect(`${origin}/tasks`)
  }

  if (user?.user_metadata?.onboarding_completed_at) {
    return NextResponse.redirect(`${origin}/tasks`)
  }

  return NextResponse.redirect(`${origin}/onboarding`)
}
