"use client"

interface UsageBarProps {
  percent: number
  baseColor?: string
}

export function UsageBar({ percent, baseColor = "bg-[#2563EB]" }: UsageBarProps) {
  const pct = Math.max(0, Math.min(100, percent))
  const fillColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : baseColor

  return (
    <div className="flex items-center gap-[10px]">
      <div className="h-[12px] w-[80px] overflow-hidden rounded-full bg-[#f0f0f0]">
        <div className={`h-full rounded-full ${fillColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-medium text-[#888]">{Math.round(percent)}%</span>
    </div>
  )
}
