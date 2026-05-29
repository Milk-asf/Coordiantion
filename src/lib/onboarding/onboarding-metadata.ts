import type { OnboardingStepId } from "@/lib/onboarding/onboarding-steps"

// Pure helpers for reading onboarding state from Supabase user metadata.
// Kept free of "use client" so they can be called from server components
// (e.g. the /onboarding index route) as well as client code.

export interface OnboardingMetadata {
  step?: OnboardingStepId | "done"
  completedAt?: string
}

export function readOnboardingMetadata(
  metadata: Record<string, unknown> | undefined
): OnboardingMetadata {
  if (!metadata) return {}
  return {
    step: metadata.onboarding_step as OnboardingMetadata["step"],
    completedAt: metadata.onboarding_completed_at as string | undefined,
  }
}

export function isOnboardingComplete(
  metadata: Record<string, unknown> | undefined
): boolean {
  return Boolean(readOnboardingMetadata(metadata).completedAt)
}
