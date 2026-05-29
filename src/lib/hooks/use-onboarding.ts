"use client"

import { useCallback } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import type { OnboardingStepId } from "@/lib/onboarding/onboarding-steps"

export {
  readOnboardingMetadata,
  isOnboardingComplete,
  type OnboardingMetadata,
} from "@/lib/onboarding/onboarding-metadata"

export function useOnboarding() {
  const setStep = useCallback(async (step: OnboardingStepId | "done") => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.auth.updateUser({
      data: {
        onboarding_step: step,
        ...(step === "done" ? { onboarding_completed_at: new Date().toISOString() } : {}),
      },
    })
  }, [])

  const complete = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.auth.updateUser({
      data: {
        onboarding_step: "done",
        onboarding_completed_at: new Date().toISOString(),
      },
    })
  }, [])

  return { setStep, complete }
}
