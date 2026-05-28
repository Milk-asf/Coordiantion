"use client"

import { useCallback } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import type { OnboardingStepId } from "@/lib/onboarding/onboarding-steps"

interface OnboardingMetadata {
  step?: OnboardingStepId | "done"
  completedAt?: string
}

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

export function readOnboardingMetadata(metadata: Record<string, unknown> | undefined): OnboardingMetadata {
  if (!metadata) return {}
  return {
    step: metadata.onboarding_step as OnboardingMetadata["step"],
    completedAt: metadata.onboarding_completed_at as string | undefined,
  }
}

export function isOnboardingComplete(metadata: Record<string, unknown> | undefined): boolean {
  return Boolean(readOnboardingMetadata(metadata).completedAt)
}
