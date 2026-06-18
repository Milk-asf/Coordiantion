"use client"

import { FolkMetricCard } from "@/components/folk-metrics/folk-metric-card"
import { FOLK_METRIC_COLORS } from "@/components/folk-metrics/folk-metric-colors"

export interface FolkMetricBarDatum {
  label: string
  value: number
  color?: string
}

interface FolkMetricBarChartProps {
  title: string
  data: FolkMetricBarDatum[]
  emptyLabel?: string
}

function buildYTicks(maxValue: number) {
  if (maxValue <= 0) return [0, 5, 10, 15]
  const ceiling = Math.max(15, Math.ceil(maxValue / 5) * 5)
  const step = ceiling <= 15 ? 5 : Math.ceil(ceiling / 3 / 5) * 5
  const ticks: number[] = []
  for (let value = 0; value <= ceiling; value += step) ticks.push(value)
  return ticks.length >= 2 ? ticks : [0, 5, 10, 15]
}

export function FolkMetricBarChart({ title, data, emptyLabel = "No data yet" }: FolkMetricBarChartProps) {
  const filtered = data.filter((item) => item.value > 0)
  const maxValue = Math.max(...filtered.map((item) => item.value), 0)
  const yTicks = buildYTicks(maxValue)
  const yMax = yTicks[yTicks.length - 1] ?? 15

  const chartHeight = 96
  const barWidth = 28
  const plotWidth = Math.max(filtered.length * 56, 120)

  return (
    <FolkMetricCard title={title} minHeightClassName="min-h-[220px]">
      {filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-[16px] pb-[20px]">
          <span className="text-[14px] font-normal text-folk-placeholder">{emptyLabel}</span>
        </div>
      ) : (
        <div className="flex flex-1 px-[12px] pb-[16px] pt-[6px]">
          <div className="flex w-[24px] shrink-0 flex-col justify-between pb-[22px] pt-[2px]">
            {[...yTicks].reverse().map((tick) => (
              <span key={tick} className="text-[11px] font-normal leading-none text-folk-secondary">
                {tick}
              </span>
            ))}
          </div>
          <div className="relative min-w-0 flex-1 overflow-x-auto">
            <svg
              viewBox={`0 0 ${plotWidth} ${chartHeight + 24}`}
              className="h-[120px] w-full min-w-[140px]"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              {yTicks.map((tick) => {
                const y = chartHeight - (tick / yMax) * chartHeight
                return (
                  <line
                    key={tick}
                    x1={0}
                    y1={y}
                    x2={plotWidth}
                    y2={y}
                    stroke="#E5E7EB"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                )
              })}
              <line x1={0} y1={chartHeight} x2={plotWidth} y2={chartHeight} stroke="#E5E7EB" strokeWidth={1} />
              {filtered.map((item, index) => {
                const slotWidth = plotWidth / filtered.length
                const x = slotWidth * index + slotWidth / 2 - barWidth / 2
                const barHeight = Math.max(2, (item.value / yMax) * chartHeight)
                const y = chartHeight - barHeight
                return (
                  <g key={`${item.label}-${index}`}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={item.color ?? FOLK_METRIC_COLORS.blue}
                      rx={1}
                    />
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight + 16}
                      textAnchor="middle"
                      className="fill-folk-secondary text-[11px]"
                    >
                      {item.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      )}
    </FolkMetricCard>
  )
}
