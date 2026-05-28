export type OnboardingStepId = "profile" | "workspace" | "team"

export interface OnboardingStep {
  id: OnboardingStepId
  index: number
  route: string
  title: string
  description: string
  required: boolean
}

export const onboardingSteps: readonly OnboardingStep[] = [
  {
    id: "profile",
    index: 1,
    route: "/onboarding/profile",
    title: "Let's get to know you",
    description: "Add your name and a profile photo so your team knows who's who.",
    required: true,
  },
  {
    id: "workspace",
    index: 2,
    route: "/onboarding/workspace",
    title: "Create your workspace",
    description: "Set up the organisation details that will appear on invoices and emails.",
    required: true,
  },
  {
    id: "team",
    index: 3,
    route: "/onboarding/team",
    title: "Invite your team",
    description: "Bring teammates in to collaborate. You can always do this later.",
    required: false,
  },
] as const

export const totalSteps = onboardingSteps.length

export function getStep(id: OnboardingStepId): OnboardingStep {
  const step = onboardingSteps.find((s) => s.id === id)
  if (!step) throw new Error(`Unknown onboarding step: ${id}`)
  return step
}

export function getNextStep(id: OnboardingStepId): OnboardingStep | null {
  const current = getStep(id)
  return onboardingSteps[current.index] ?? null
}

export function getPrevStep(id: OnboardingStepId): OnboardingStep | null {
  const current = getStep(id)
  return onboardingSteps[current.index - 2] ?? null
}
