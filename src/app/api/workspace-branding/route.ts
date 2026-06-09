import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Returns the workspace name + logo for the currently authenticated user.
 * Used by the create-password page to brand the screen for invited staff.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const adminClient = createAdminClient()
  if (!adminClient) return NextResponse.json({ name: "", logoUrl: "" })

  const { data: member } = await adminClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  const workspaceId = member?.workspace_id
  if (!workspaceId) return NextResponse.json({ name: "", logoUrl: "" })

  const [{ data: workspace }, { data: settings }] = await Promise.all([
    adminClient.from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
    adminClient.from("workspace_settings").select("org_name, logo_url").eq("workspace_id", workspaceId).maybeSingle(),
  ])

  return NextResponse.json({
    name: settings?.org_name || workspace?.name || "",
    logoUrl: settings?.logo_url || "",
  })
}
