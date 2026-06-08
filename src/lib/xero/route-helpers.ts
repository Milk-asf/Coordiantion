import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"

interface AdminContext {
  userId: string
  admin: SupabaseClient
}

type AuthResult = { ok: true; ctx: AdminContext } | { ok: false; status: number; error: string }

/** Verifies the caller is an active admin of the workspace. Returns a service-role client on success. */
export async function authorizeWorkspaceAdmin(workspaceId: string): Promise<AuthResult> {
  if (!workspaceId) return { ok: false, status: 400, error: "A workspace ID is required" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, error: "Unauthorized" }

  const admin = createAdminClient()
  if (!admin) return { ok: false, status: 500, error: "Server is not configured for integrations" }

  const { data: membership } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle()

  if (!membership || !["super-admin", "admin"].includes(membership.role)) {
    return { ok: false, status: 403, error: "You don't have permission to manage integrations" }
  }

  return { ok: true, ctx: { userId: user.id, admin } }
}
