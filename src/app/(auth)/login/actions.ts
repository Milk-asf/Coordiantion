"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export interface LoginActionState {
  error?: string
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Add your credentials to .env.local" }
  }

  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  // Users with an enrolled second factor must complete the TOTP challenge
  // before the session reaches AAL2 and the app becomes available.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
    redirect("/login/mfa")
  }

  // Support workers land on My Day — a simpler home built around their own
  // shifts, notes and timesheets. Everyone else keeps the full app.
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("user_id", user.id)
    const roles = (memberships ?? []).map((member) => String(member.role))
    if (roles.length > 0 && roles.every((role) => role === "support-worker")) {
      redirect("/my-day")
    }
  }

  redirect("/roster")
}
