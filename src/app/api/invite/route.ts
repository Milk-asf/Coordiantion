import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { email, workspaceId, role } = await request.json()
  if (!email?.includes("@")) return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 })

  const adminClient = createAdminClient()
  if (!adminClient) return NextResponse.json({ error: "Server not configured for invites. Add SUPABASE_SERVICE_ROLE_KEY to environment." }, { status: 500 })

  const { data: callerMembership } = await adminClient
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", caller.id)
    .single()

  if (!callerMembership || !["super-admin", "admin"].includes(callerMembership.role)) {
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
        role: role || "coordinator",
        status: "invited",
      })
      .select()
      .single()

    if (insertError || !newMember) {
      return NextResponse.json({ error: insertError?.message || "Failed to create membership record" }, { status: 500 })
    }
    memberId = newMember.id
  }

  const origin = new URL(request.url).origin

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback`,
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
    } else {
      return NextResponse.json({ error: inviteError.message }, { status: 400 })
    }
  }

  if (userId && memberId) {
    await adminClient
      .from("workspace_members")
      .update({ user_id: userId })
      .eq("id", memberId)
      .is("user_id", null)
  }

  return NextResponse.json({ success: true, memberId, userId, emailSent })
}
