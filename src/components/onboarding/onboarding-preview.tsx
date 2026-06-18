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
      <div className="flex h-[420px] w-full max-w-[480px] overflow-hidden rounded-none border border-[#e2e2e2] bg-folk-surface shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        <div className="flex w-[160px] shrink-0 flex-col gap-[8px] border-folk-border-subtle bg-folk-page p-[12px]">
          <div className="flex items-center gap-[6px]">
            <div className="flex h-[20px] w-[20px] items-center justify-center rounded-[5px] bg-green-600 text-[9px] font-semibold text-white">
              C
            </div>
            <div className="h-[8px] w-[60px] rounded-none bg-[var(--folk-border)]" />
          </div>
          <div className="mt-[8px] flex items-center gap-[8px] rounded-none px-[6px] py-[4px]">
            <Search className="h-[10px] w-[10px] text-folk-placeholder" strokeWidth={1.5} />
            <div className="h-[6px] w-[60px] rounded-none bg-[var(--folk-border)]" />
          </div>
          <PreviewNavItem icon={SquareCheck} active />
          <PreviewNavItem icon={StickyNote} />
          <PreviewNavItem icon={User} />
          <PreviewNavItem icon={CircleDollarSign} />
        </div>
        <div className="flex-1 p-[16px]">
          <div className="mb-[14px] h-[10px] w-[120px] rounded-none bg-[var(--folk-border)]" />
          <div className="space-y-[8px]">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-[8px]">
                <div className="h-[8px] w-[8px] rounded-none border border-[#ddd]" />
                <div
                  className="h-[6px] rounded-none bg-[#eee]"
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
      <div className="flex h-[420px] w-full max-w-[480px] flex-col overflow-hidden rounded-none border border-[#e2e2e2] bg-folk-surface shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-[8px] border-b border-folk-border-subtle px-[16px] py-[12px]">
          <div className="h-[8px] w-[80px] rounded-none bg-[var(--folk-border)]" />
          <div className="ml-auto h-[8px] w-[40px] rounded-none bg-[var(--folk-border)]" />
        </div>
        <div className="flex-1 p-[16px]">
          <div className="space-y-[10px]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-[10px]">
                <div className="h-[20px] w-[20px] rounded-full bg-[var(--folk-border)]" />
                <div className="h-[8px] flex-1 rounded-none bg-[#eee]" />
                <div className="h-[8px] w-[60px] rounded-none bg-[#eee]" />
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
      className={`flex items-center gap-[8px] rounded-none px-[6px] py-[4px] ${active ? "bg-folk-surface" : ""}`}
    >
      <Icon className="h-[10px] w-[10px] text-folk-secondary" strokeWidth={1.5} />
      <div className="h-[6px] w-[64px] rounded-none bg-[var(--folk-border)]" />
    </div>
  )
}
