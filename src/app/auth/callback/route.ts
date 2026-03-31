import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? "/tasks"
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/tasks"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user?.email) {
        const adminClient = createAdminClient()
        if (adminClient) {
          await adminClient
            .from("workspace_members")
            .update({ user_id: user.id, status: "active" })
            .eq("invited_email", user.email)
            .is("user_id", null)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
