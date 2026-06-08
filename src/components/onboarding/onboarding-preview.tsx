import { SquareCheck, User, StickyNote, CircleDollarSign, Search } from "lucide-react"
import type { OnboardingStepId } from "@/lib/onboarding/onboarding-steps"

interface OnboardingPreviewProps {
  step: OnboardingStepId
}

export function OnboardingPreview({ step }: OnboardingPreviewProps) {
  if (step === "team") {
    return <TablePreview />
  }
  return <SidebarPreview />
}

function SidebarPreview() {
  return (
    <div className="pointer-events-none flex h-full w-full select-none items-center justify-center">
      <div className="flex h-[420px] w-full max-w-[480px] overflow-hidden rounded-[12px] border border-[#e2e2e2] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        <div className="flex w-[160px] shrink-0 flex-col gap-[8px] border-r border-[#f0f0f0] bg-[#fafafa] p-[12px]">
          <div className="flex items-center gap-[6px]">
            <div className="flex h-[20px] w-[20px] items-center justify-center rounded-[5px] bg-green-600 text-[9px] font-semibold text-white">
              C
            </div>
            <div className="h-[8px] w-[60px] rounded bg-[#e5e5e5]" />
          </div>
          <div className="mt-[8px] flex items-center gap-[8px] rounded px-[6px] py-[4px]">
            <Search className="h-[10px] w-[10px] text-[#bbb]" strokeWidth={1.5} />
            <div className="h-[6px] w-[60px] rounded bg-[#e5e5e5]" />
          </div>
          <PreviewNavItem icon={SquareCheck} active />
          <PreviewNavItem icon={StickyNote} />
          <PreviewNavItem icon={User} />
          <PreviewNavItem icon={CircleDollarSign} />
        </div>
        <div className="flex-1 p-[16px]">
          <div className="mb-[14px] h-[10px] w-[120px] rounded bg-[#e5e5e5]" />
          <div className="space-y-[8px]">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-[8px]">
                <div className="h-[8px] w-[8px] rounded-sm border border-[#ddd]" />
                <div
                  className="h-[6px] rounded bg-[#eee]"
                  style={{ width: `${50 + ((i * 17) % 40)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TablePreview() {
  return (
    <div className="pointer-events-none flex h-full w-full select-none items-center justify-center">
      <div className="flex h-[420px] w-full max-w-[480px] flex-col overflow-hidden rounded-[12px] border border-[#e2e2e2] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-[8px] border-b border-[#f0f0f0] px-[16px] py-[12px]">
          <div className="h-[8px] w-[80px] rounded bg-[#e5e5e5]" />
          <div className="ml-auto h-[8px] w-[40px] rounded bg-[#e5e5e5]" />
        </div>
        <div className="flex-1 p-[16px]">
          <div className="space-y-[10px]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-[10px]">
                <div className="h-[20px] w-[20px] rounded-full bg-[#e5e5e5]" />
                <div className="h-[8px] flex-1 rounded bg-[#eee]" />
                <div className="h-[8px] w-[60px] rounded bg-[#eee]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewNavItem({
  icon: Icon,
  active,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  active?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-[8px] rounded px-[6px] py-[4px] ${active ? "bg-white" : ""}`}
    >
      <Icon className="h-[10px] w-[10px] text-[#888]" strokeWidth={1.5} />
      <div className="h-[6px] w-[64px] rounded bg-[#e5e5e5]" />
    </div>
  )
}
