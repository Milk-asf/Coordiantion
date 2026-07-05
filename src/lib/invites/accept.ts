import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Claims every invited/pending workspace membership for the given email and
 * marks it active. Handles both membership shapes the invite flow can leave
 * behind: rows still waiting on a user (user_id null) and rows the invite API
 * already linked to the auth user it created (user_id = this user).
 *
 * Idempotent — safe to call from every post-auth landing path.
 *
 * @returns the number of memberships activated.
 */
export async function activateInvitedMemberships(
  email: string | null | undefined,
  userId: string
): Promise<number> {
  const adminClient = createAdminClient()
  if (!adminClient || !email) return 0

  const { data: rows } = await adminClient
    .from("workspace_members")
    .select("id, user_id, status")
    .eq("invited_email", email)
    .in("status", ["invited", "pending"])

  const claimable = (rows ?? []).filter((row) => !row.user_id || row.user_id === userId)
  if (claimable.length === 0) return 0

  const { error } = await adminClient
    .from("workspace_members")
    .update({ user_id: userId, status: "active" })
    .in("id", claimable.map((row) => row.id))

  return error ? 0 : claimable.length
}
