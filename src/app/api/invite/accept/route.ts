import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { activateInvitedMemberships } from "@/lib/invites/accept"

/**
 * Claims any pending workspace invitations for the signed-in user. Called from
 * the client-side auth landing pages (/auth/confirm, /create-password) so the
 * membership flips to active no matter which token flow the invite email used.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const activated = await activateInvitedMemberships(user.email, user.id)

  // Invited members join an existing workspace — never send them through the
  // create-a-workspace onboarding flow.
  if (activated > 0 && !user.user_metadata?.onboarding_completed_at) {
    await supabase.auth.updateUser({
      data: {
        onboarding_step: "done",
        onboarding_completed_at: new Date().toISOString(),
      },
    })
  }

  return NextResponse.json({ activated })
}
