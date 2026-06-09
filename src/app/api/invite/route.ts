import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { inviteMemberSchema } from "@/lib/validations"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { getAuthCallbackUrl } from "@/lib/get-site-url"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rl = rateLimit(`invite:${caller.id}`, { maxRequests: 5, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many invite requests. Please wait a moment." },
      { status: 429, headers: getRateLimitHeaders(rl) }
    )
  }

  const raw = await request.json()
  const parsed = inviteMemberSchema.safeParse(raw)

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ")
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { email, workspaceId, role } = parsed.data

  const adminClient = createAdminClient()
  if (!adminClient) return NextResponse.json({ error: "Server not configured for invites. Add SUPABASE_SERVICE_ROLE_KEY to environment." }, { status: 500 })

  const { data: callerMembership } = await adminClient
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", caller.id)
    .maybeSingle()

  const { data: workspace } = await adminClient
    .from("workspaces")
    .select("created_by")
    .eq("id", workspaceId)
    .maybeSingle()

  const isOwner = !!workspace && workspace.created_by === caller.id
  const isAdmin = !!callerMembership && ["super-admin", "admin"].includes(callerMembership.role)

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "You don't have permission to invite members" }, { status: 403 })
  }

  const { data: existingMember } = await adminClient
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("invited_email", email)
    .maybeSingle()

  let memberId: string | null = existingMember?.id ?? null

  if (!existingMember) {
    const { data: newMember, error: insertError } = await adminClient
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        invited_email: email,
        role,
        status: "invited",
      })
      .select()
      .single()

    if (insertError || !newMember) {
      return NextResponse.json({ error: insertError?.message || "Failed to create membership record" }, { status: 500 })
    }
    memberId = newMember.id
  }

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: getAuthCallbackUrl("/create-password"),
  })

  let userId: string | null = null
  let emailSent = true

  if (inviteData?.user) {
    userId = inviteData.user.id
  } else if (inviteError) {
    emailSent = false

    const { data: listData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = listData?.users?.find((u) => u.email === email)

    if (existing) {
      userId = existing.id
    }
    // Otherwise the membership row still stands — the person is invited to the
    // workspace even though the invite email couldn't be sent (e.g. the email
    // provider isn't configured or hit a rate limit). The admin can resend.
  }

  if (userId && memberId) {
    await adminClient
      .from("workspace_members")
      .update({ user_id: userId })
      .eq("id", memberId)
      .is("user_id", null)
  }

  return NextResponse.json({
    success: true,
    memberId,
    userId,
    emailSent,
    warning: emailSent ? null : (inviteError?.message ?? "The invite email could not be sent. You can resend it later."),
  })
}
