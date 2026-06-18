"use client"

interface UsageBarProps {
  percent: number
  baseColor?: string
  tooltip?: string
}

export function UsageBar({ percent, baseColor = "bg-[#2563EB]", tooltip }: UsageBarProps) {
  const pct = Math.max(0, Math.min(100, percent))
  const fillColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : baseColor

  return (
    <div className="flex items-center gap-[10px]" title={tooltip}>
      <div className="h-[8px] w-[80px] overflow-hidden rounded-none bg-folk-border-subtle">
        <div className={`h-full rounded-none ${fillColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-medium tabular-nums text-folk-secondary">{Math.round(percent)}%</span>
    </div>
  )
}
