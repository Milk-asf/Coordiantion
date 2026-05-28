import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isOnboardingComplete, readOnboardingMetadata } from "@/lib/hooks/use-onboarding"

export default async function OnboardingIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  if (isOnboardingComplete(user.user_metadata)) {
    redirect("/tasks")
  }

  const meta = readOnboardingMetadata(user.user_metadata)
  const step = meta.step ?? "profile"

  if (step === "workspace") redirect("/onboarding/workspace")
  if (step === "team") redirect("/onboarding/team")
  redirect("/onboarding/profile")
}
