import { totalSteps } from "@/lib/onboarding/onboarding-steps"

interface OnboardingProgressProps {
  current: number
}

export function OnboardingProgress({ current }: OnboardingProgressProps) {
  const percent = Math.round((current / totalSteps) * 100)
  return (
    <div className="flex items-center gap-[10px]">
      <span className="text-[12px] font-medium text-[#888]">
        {current}/{totalSteps}
      </span>
      <div className="h-[3px] w-[80px] overflow-hidden rounded-full bg-[#eee]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: "#16a34a" }}
        />
      </div>
    </div>
  )
}
