"use client"

import { Ellipsis } from "lucide-react"
import { FolkMetricCard } from "@/components/folk-metrics/folk-metric-card"
import { FOLK_METRIC_COLOR_CYCLE, getFolkMetricColor } from "@/components/folk-metrics/folk-metric-colors"

export interface FolkMetricDonutSegment {
  label: string
  value: number
  color?: string
}

interface FolkMetricDonutChartProps {
  title: string
  segments: FolkMetricDonutSegment[]
  emptyLabel?: string
  showActions?: boolean
  onEdit?: () => void
  compactLegend?: boolean
}

const DONUT_SIZE = 112
const DONUT_CENTER = DONUT_SIZE / 2
const DONUT_RADIUS = 36
const DONUT_STROKE = 12
const SEGMENT_GAP = 2

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  }
}

export function FolkMetricDonutChart({
  title,
  segments,
  emptyLabel = "No data yet",
  showActions = false,
  onEdit,
  compactLegend = false,
}: FolkMetricDonutChartProps) {
  const filtered = segments.filter((item) => item.value > 0)
  const total = filtered.reduce((sum, item) => sum + item.value, 0)
  const circumference = 2 * Math.PI * DONUT_RADIUS

  let cumulativeLength = 0
  const arcs = filtered.map((segment, index) => {
    const color = segment.color ?? getFolkMetricColor(index)
    const fraction = total > 0 ? segment.value / total : 0
    const rawLength = fraction * circumference
    const gap = filtered.length > 1 ? SEGMENT_GAP : circumference * 0.02
    const arcLength = Math.max(0, rawLength - gap)
    const startAngle = total > 0 ? (cumulativeLength / circumference) * 360 : 0
    const midAngle = startAngle + (arcLength / circumference) * 180
    const labelPoint = polarToCartesian(DONUT_CENTER, DONUT_CENTER, DONUT_RADIUS + 16, midAngle)
    const dashOffset = -cumulativeLength
    cumulativeLength += arcLength + (filtered.length > 1 ? SEGMENT_GAP : 0)

    return {
      ...segment,
      color,
      arcLength,
      dashOffset,
      labelPoint,
    }
  })

  const headerActions = showActions ? (
    <div className="flex shrink-0 items-center gap-[6px]">
      {onEdit && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onEdit()
          }}
          className="rounded-full border border-folk-border bg-folk-surface px-[10px] py-[4px] text-[12px] font-normal text-folk-text transition-colors hover:bg-folk-hover"
          tabIndex={0}
        >
          Edit
        </button>
      )}
      <button
        type="button"
        className="flex h-[24px] w-[28px] items-center justify-center rounded-full border border-folk-border bg-folk-surface text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
        tabIndex={0}
        aria-label="More chart options"
      >
        <Ellipsis className="h-[14px] w-[14px]" strokeWidth={1.75} />
      </button>
    </div>
  ) : undefined

  return (
    <FolkMetricCard
      title={title}
      headerActions={headerActions}
      minHeightClassName="min-h-[220px]"
      contentClassName="px-[12px] pb-[16px] pt-[4px]"
    >
      {filtered.length === 0 || total === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="text-[14px] font-normal text-folk-placeholder">{emptyLabel}</span>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center gap-[12px]">
          <div className="flex shrink-0 flex-col items-center">
            <svg
              width={DONUT_SIZE}
              height={DONUT_SIZE}
              viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
              aria-hidden="true"
            >
              {arcs.map((arc, index) => (
                <g key={`${arc.label}-${index}`}>
                  <circle
                    cx={DONUT_CENTER}
                    cy={DONUT_CENTER}
                    r={DONUT_RADIUS}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={DONUT_STROKE}
                    strokeLinecap="butt"
                    strokeDasharray={`${arc.arcLength} ${circumference - arc.arcLength}`}
                    strokeDashoffset={arc.dashOffset}
                    transform={`rotate(-90 ${DONUT_CENTER} ${DONUT_CENTER})`}
                  />
                  {!compactLegend && (
                    <text
                      x={arc.labelPoint.x}
                      y={arc.labelPoint.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-folk-text text-[11px] font-normal"
                    >
                      {arc.value}
                    </text>
                  )}
                </g>
              ))}
              <text
                x={DONUT_CENTER}
                y={DONUT_CENTER}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-folk-text text-[18px] font-semibold"
              >
                {total}
              </text>
            </svg>
            {compactLegend && filtered.length === 1 && (
              <span className="mt-[2px] text-[12px] font-normal text-folk-text">{filtered[0].value}</span>
            )}
          </div>
          <div className={compactLegend ? "min-w-0 flex-1" : "min-w-0 flex-1 space-y-[8px]"}>
            {filtered.map((segment, index) => {
              const color = segment.color ?? FOLK_METRIC_COLOR_CYCLE[index % FOLK_METRIC_COLOR_CYCLE.length]
              return (
                <div key={`${segment.label}-${index}`} className="flex min-w-0 items-center gap-[8px]">
                  <span
                    className="h-[10px] w-[10px] shrink-0 rounded-[2px]"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate text-[12px] font-normal text-folk-text">{segment.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </FolkMetricCard>
  )
}
