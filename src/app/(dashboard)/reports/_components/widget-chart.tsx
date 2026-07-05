"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, BarChart3 } from "lucide-react"
import { getFolkMetricColor } from "@/components/folk-metrics/folk-metric-colors"
import { formatMeasure, type WidgetComputation } from "@/lib/analytics/compute"
import { getDataSource, getListMeta, type AnalyticsWidget } from "@/lib/analytics/definitions"
import { cn } from "@/lib/utils"

interface WidgetChartProps {
  widget: AnalyticsWidget
  computation: WidgetComputation
  /** When false (builder preview), record-list rows don't navigate. */
  interactive?: boolean
}

export function WidgetChart({ widget, computation, interactive = true }: WidgetChartProps) {
  if (widget.visualization === "metric") return <MetricChart computation={computation} />
  if (widget.visualization === "list") return <ListChart widget={widget} computation={computation} interactive={interactive} />

  if (computation.isEmpty) return <ChartEmpty />

  switch (widget.visualization) {
    case "bar":
      return <BarChart widget={widget} computation={computation} />
    case "line":
    case "area":
      return <LineChart widget={widget} computation={computation} area={widget.visualization === "area"} />
    case "pie":
    case "donut":
      return <PieChart widget={widget} computation={computation} donut={widget.visualization === "donut"} />
    case "funnel":
      return <FunnelChart widget={widget} computation={computation} />
    case "table":
      return <TableChart widget={widget} computation={computation} />
    default:
      return <ChartEmpty />
  }
}

function ChartEmpty() {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-[8px] text-center">
      <BarChart3 className="h-[22px] w-[22px] text-folk-placeholder" strokeWidth={1.5} />
      <span className="text-[13px] text-folk-placeholder">No data for this selection</span>
    </div>
  )
}

function MetricChart({ computation }: { computation: WidgetComputation }) {
  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-[6px] py-[12px]">
      <span className="text-[40px] font-semibold leading-none tracking-[-0.02em] text-folk-text">
        {computation.totalFormatted}
      </span>
      <span className="text-[12px] font-medium text-folk-secondary">{computation.measureLabel}</span>
    </div>
  )
}

function niceMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[4px] px-[4px] pt-[10px]">
      {items.map((item) => (
        <div key={item.name} className="flex min-w-0 items-center gap-[6px]">
          <span className="h-[9px] w-[9px] shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
          <span className="truncate text-[11px] text-folk-secondary">{item.name}</span>
        </div>
      ))}
    </div>
  )
}

function BarChart({ widget, computation }: WidgetChartProps) {
  const { categories, series, categoryTotals, format } = computation
  const max = niceMax(Math.max(...categoryTotals, 0))
  const stacked = series.length > 1
  const showValues = widget.showValues && categories.length <= 12

  return (
    <div className="flex h-full min-h-[180px] flex-col">
      <div className="flex min-h-0 flex-1 items-end gap-[8px] overflow-x-auto px-[2px] pb-[2px] pt-[18px]">
        {categories.map((category, index) => {
          const total = categoryTotals[index] ?? 0
          const heightPct = max > 0 ? (total / max) * 100 : 0
          return (
            <div key={`${category}-${index}`} className="flex min-w-[28px] flex-1 flex-col items-center gap-[6px]">
              <div className="relative flex h-full w-full max-w-[44px] flex-col justify-end">
                {showValues && total > 0 && (
                  <span className="mb-[3px] text-center text-[10px] font-medium tabular-nums text-folk-secondary">
                    {formatMeasure(total, format)}
                  </span>
                )}
                <div className="flex w-full flex-col-reverse overflow-hidden rounded-[3px]" style={{ height: `${heightPct}%`, minHeight: total > 0 ? 3 : 0 }}>
                  {(stacked ? series : [series[0]]).map((s, sIndex) => {
                    const value = s.values[index] ?? 0
                    const segPct = total > 0 ? (value / total) * 100 : 0
                    return <div key={s.name + sIndex} style={{ height: `${segPct}%`, backgroundColor: s.color }} />
                  })}
                </div>
              </div>
              <span className="line-clamp-1 w-full text-center text-[10px] leading-tight text-folk-secondary" title={category}>
                {category}
              </span>
            </div>
          )
        })}
      </div>
      {widget.showLegend && stacked && <Legend items={series.map((s) => ({ name: s.name, color: s.color }))} />}
    </div>
  )
}

function LineChart({ widget, computation, area }: WidgetChartProps & { area: boolean }) {
  const { categories, series, categoryTotals } = computation
  const max = niceMax(Math.max(...categoryTotals, 0))
  const VB_W = 300
  const VB_H = 120
  const stepX = categories.length > 1 ? VB_W / (categories.length - 1) : 0
  const pointFor = (value: number, index: number) => {
    const x = categories.length > 1 ? stepX * index : VB_W / 2
    const y = VB_H - (max > 0 ? (value / max) * VB_H : 0)
    return { x, y }
  }

  return (
    <div className="flex h-full min-h-[180px] flex-col">
      <div className="relative min-h-0 flex-1 pt-[10px]">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <line key={tick} x1={0} x2={VB_W} y1={VB_H * tick} y2={VB_H * tick} stroke="#E5E7EB" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
          ))}
          {series.map((s) => {
            const points = s.values.map((value, index) => pointFor(value, index))
            const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
            const areaPath = `${line} L${points[points.length - 1]?.x ?? 0},${VB_H} L${points[0]?.x ?? 0},${VB_H} Z`
            return (
              <g key={s.name}>
                {area && <path d={areaPath} fill={s.color} fillOpacity={0.14} />}
                <path d={line} fill="none" stroke={s.color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
              </g>
            )
          })}
        </svg>
      </div>
      <div className="flex items-center justify-between gap-[4px] px-[2px] pt-[6px]">
        {categories.map((category, index) => (
          <span key={`${category}-${index}`} className="line-clamp-1 min-w-0 flex-1 text-center text-[10px] leading-tight text-folk-secondary" title={category}>
            {category}
          </span>
        ))}
      </div>
      {widget.showLegend && series.length > 1 && <Legend items={series.map((s) => ({ name: s.name, color: s.color }))} />}
    </div>
  )
}

const PIE_SIZE = 132
const PIE_R = 56
const PIE_C = PIE_SIZE / 2

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function PieChart({ widget, computation, donut }: WidgetChartProps & { donut: boolean }) {
  const { categories, categoryTotals } = computation
  const total = categoryTotals.reduce((sum, value) => sum + value, 0)
  const slices = categories
    .map((label, index) => ({ label, value: categoryTotals[index] ?? 0, color: getFolkMetricColor(index) }))
    .filter((slice) => slice.value > 0)

  let cursor = 0
  const paths = slices.map((slice) => {
    const fraction = total > 0 ? slice.value / total : 0
    const startAngle = cursor * 360
    cursor += fraction
    const endAngle = cursor * 360
    const start = polar(PIE_C, PIE_C, PIE_R, endAngle)
    const end = polar(PIE_C, PIE_C, PIE_R, startAngle)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    const d = `M${PIE_C},${PIE_C} L${start.x},${start.y} A${PIE_R},${PIE_R} 0 ${largeArc} 0 ${end.x},${end.y} Z`
    return { d, color: slice.color }
  })

  return (
    <div className="flex h-full min-h-[180px] items-center gap-[16px] py-[8px]">
      <div className="relative shrink-0">
        <svg width={PIE_SIZE} height={PIE_SIZE} viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`} aria-hidden="true">
          {paths.map((path, index) => (
            <path key={index} d={path.d} fill={path.color} stroke="#fff" strokeWidth={1.5} />
          ))}
          {donut && <circle cx={PIE_C} cy={PIE_C} r={PIE_R * 0.58} fill="#fff" />}
          {donut && (
            <text x={PIE_C} y={PIE_C} textAnchor="middle" dominantBaseline="central" className="fill-folk-text text-[20px] font-semibold">
              {computation.totalFormatted}
            </text>
          )}
        </svg>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
        {slices.map((slice) => (
          <div key={slice.label} className="flex min-w-0 items-center gap-[8px]">
            <span className="h-[10px] w-[10px] shrink-0 rounded-[2px]" style={{ backgroundColor: slice.color }} />
            <span className="truncate text-[12px] text-folk-text">{slice.label}</span>
            <span className="ml-auto shrink-0 text-[12px] font-medium tabular-nums text-folk-secondary">
              {formatMeasure(slice.value, computation.format)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FunnelChart({ computation }: WidgetChartProps) {
  const { categories, categoryTotals, format } = computation
  const max = Math.max(...categoryTotals, 0)
  return (
    <div className="flex h-full min-h-[180px] flex-col justify-center gap-[8px] py-[8px]">
      {categories.map((category, index) => {
        const value = categoryTotals[index] ?? 0
        const widthPct = max > 0 ? Math.max(6, (value / max) * 100) : 0
        return (
          <div key={`${category}-${index}`} className="flex items-center gap-[10px]">
            <span className="w-[88px] shrink-0 truncate text-[11px] text-folk-secondary" title={category}>
              {category}
            </span>
            <div className="flex h-[24px] min-w-0 flex-1 items-center">
              <div
                className="flex h-full items-center justify-end rounded-[3px] px-[8px]"
                style={{ width: `${widthPct}%`, backgroundColor: getFolkMetricColor(index) }}
              >
                <span className="text-[11px] font-medium tabular-nums text-white">{formatMeasure(value, format)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const LIST_ROW_CAP = 50

function ListChart({ widget, computation, interactive }: { widget: AnalyticsWidget; computation: WidgetComputation; interactive: boolean }) {
  const router = useRouter()
  const entity = getDataSource(widget.source)
  const meta = getListMeta(entity)

  const rows = useMemo(() => {
    const sorted = [...computation.records]
    if (meta.getDate) {
      const direction = meta.dateSort === "asc" ? 1 : -1
      sorted.sort((a, b) => {
        const dateA = meta.getDate!(a)
        const dateB = meta.getDate!(b)
        if (!dateA && !dateB) return 0
        // Records without a date sink to the bottom either way.
        if (!dateA) return 1
        if (!dateB) return -1
        return dateA.localeCompare(dateB) * direction
      })
    }
    return sorted
  }, [computation.records, meta])

  if (rows.length === 0) return <ChartEmpty />

  const limit = widget.limit > 0 ? widget.limit : LIST_ROW_CAP
  const visible = rows.slice(0, limit)
  const hasLinks = Boolean(meta.getHref)

  const handleOpen = (record: unknown) => {
    if (!interactive) return
    const href = meta.getHref?.(record)
    if (href) router.push(href)
  }

  return (
    <div className="flex min-h-[160px] flex-col">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-folk-border-subtle text-left text-[11px] font-medium uppercase tracking-wide text-folk-tertiary">
              {meta.columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap py-[6px] pr-[12px] font-medium last:pr-0">
                  {column.label}
                </th>
              ))}
              {hasLinks && <th className="w-[20px] py-[6px]" aria-label="Open record" />}
            </tr>
          </thead>
          <tbody>
            {visible.map((record, index) => {
              const href = meta.getHref?.(record) ?? null
              const clickable = interactive && Boolean(href)
              return (
                <tr
                  key={index}
                  onClick={() => handleOpen(record)}
                  className={cn(
                    "group/row border-b border-folk-border-subtle last:border-0",
                    clickable && "cursor-pointer transition-colors hover:bg-folk-hover",
                  )}
                  title={clickable ? "Open record" : undefined}
                >
                  {meta.columns.map((column, columnIndex) => (
                    <td
                      key={column.key}
                      className={cn(
                        "max-w-[220px] truncate py-[7px] pr-[12px] last:pr-0",
                        columnIndex === 0 ? "font-medium text-folk-text" : "text-folk-secondary",
                      )}
                      title={column.get(record)}
                    >
                      {column.get(record)}
                    </td>
                  ))}
                  {hasLinks && (
                    <td className="py-[7px] text-right">
                      {href ? (
                        <ArrowUpRight className="ml-auto h-[13px] w-[13px] text-folk-placeholder opacity-0 transition-opacity group-hover/row:opacity-100" strokeWidth={1.75} />
                      ) : null}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {rows.length > visible.length && (
        <p className="pt-[8px] text-[11px] font-medium text-folk-tertiary">
          Showing {visible.length} of {rows.length} {entity.noun}
        </p>
      )}
    </div>
  )
}

function TableChart({ computation }: WidgetChartProps) {
  const { categories, series, categoryTotals, format } = computation
  const multi = series.length > 1
  return (
    <div className="min-h-[160px] overflow-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-folk-border-subtle text-left text-[11px] font-medium uppercase tracking-wide text-folk-tertiary">
            <th className="py-[6px] pr-[8px] font-medium">Group</th>
            {multi && series.map((s) => <th key={s.name} className="py-[6px] px-[8px] text-right font-medium">{s.name}</th>)}
            <th className="py-[6px] pl-[8px] text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category, index) => (
            <tr key={`${category}-${index}`} className="border-b border-folk-border-subtle last:border-0">
              <td className="py-[7px] pr-[8px] text-folk-text">{category}</td>
              {multi && series.map((s) => (
                <td key={s.name} className="py-[7px] px-[8px] text-right tabular-nums text-folk-secondary">
                  {formatMeasure(s.values[index] ?? 0, format)}
                </td>
              ))}
              <td className="py-[7px] pl-[8px] text-right font-medium tabular-nums text-folk-text">
                {formatMeasure(categoryTotals[index] ?? 0, format)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
