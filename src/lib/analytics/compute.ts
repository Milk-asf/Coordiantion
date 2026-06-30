import { getFolkMetricColor } from "@/components/folk-metrics/folk-metric-colors"
import {
  getDataSource,
  getDimension,
  getMeasure,
  getVisualization,
  type AnalyticsWidget,
  type DateGrain,
  type DimensionDef,
  type MeasureDef,
  type MeasureFormat,
} from "./definitions"

export interface ComputedSeries {
  name: string
  color: string
  values: number[]
}

export interface WidgetComputation {
  isEmpty: boolean
  total: number
  totalFormatted: string
  measureLabel: string
  format: MeasureFormat
  categories: string[]
  series: ComputedSeries[]
  /** Sum across series per category — used by pie / donut / funnel. */
  categoryTotals: number[]
}

const NONE_KEY = "__none__"

export function formatMeasure(value: number, format: MeasureFormat): string {
  if (format === "currency") {
    return `$${value.toLocaleString("en-AU", { maximumFractionDigits: value % 1 === 0 ? 0 : 2 })}`
  }
  if (format === "hours") {
    const rounded = Math.round(value * 10) / 10
    return `${rounded.toLocaleString("en-AU", { maximumFractionDigits: 1 })}h`
  }
  return value.toLocaleString("en-AU", { maximumFractionDigits: 1 })
}

function startOfWeek(date: Date): Date {
  const day = (date.getDay() + 6) % 7
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day)
}

function parseDate(value: string): Date | null {
  if (!value) return null
  const date = value.length <= 10 ? new Date(`${value}T00:00:00`) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function bucketDate(value: string, grain: DateGrain): { key: string; label: string } | null {
  const date = parseDate(value)
  if (!date) return null
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()
  switch (grain) {
    case "day": {
      const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      return { key, label: `${d} ${MONTHS[m]}` }
    }
    case "week": {
      const start = startOfWeek(date)
      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`
      return { key, label: `${start.getDate()} ${MONTHS[start.getMonth()]}` }
    }
    case "quarter": {
      const q = Math.floor(m / 3) + 1
      return { key: `${y}-Q${q}`, label: `Q${q} ${y}` }
    }
    case "year":
      return { key: String(y), label: String(y) }
    case "month":
    default:
      return { key: `${y}-${String(m + 1).padStart(2, "0")}`, label: `${MONTHS[m]} ${String(y).slice(2)}` }
  }
}

function groupValues(dim: DimensionDef, record: unknown, grain: DateGrain): { key: string; label: string }[] {
  const raw = dim.get(record)
  if (raw === null || raw === undefined) return [{ key: NONE_KEY, label: "None" }]
  if (dim.kind === "boolean") {
    return [raw ? { key: "yes", label: "Yes" } : { key: "no", label: "No" }]
  }
  if (dim.kind === "date") {
    const bucket = bucketDate(String(raw), grain)
    return bucket ? [bucket] : [{ key: NONE_KEY, label: "None" }]
  }
  if (Array.isArray(raw)) {
    if (raw.length === 0) return [{ key: NONE_KEY, label: "None" }]
    return raw.map((value) => ({ key: String(value), label: String(value) }))
  }
  const text = String(raw)
  return [{ key: text || NONE_KEY, label: text || "None" }]
}

function aggregateRecords(records: unknown[], widget: AnalyticsWidget, measure: MeasureDef | null): number {
  if (widget.aggregation === "count" || !measure) return records.length
  const values = records.map((record) => measure.get(record))
  if (values.length === 0) return 0
  switch (widget.aggregation) {
    case "sum":
      return values.reduce((sum, value) => sum + value, 0)
    case "avg":
      return values.reduce((sum, value) => sum + value, 0) / values.length
    case "min":
      return Math.min(...values)
    case "max":
      return Math.max(...values)
    default:
      return records.length
  }
}

interface CategoryBucket {
  key: string
  label: string
  records: unknown[]
  segments: Map<string, { label: string; records: unknown[] }>
}

export function computeWidget(widget: AnalyticsWidget, records: unknown[]): WidgetComputation {
  const source = getDataSource(widget.source)
  const measure = getMeasure(source, widget.measureField)
  const viz = getVisualization(widget.visualization)
  const measureLabel = widget.aggregation === "count" || !measure ? "Records" : measure.label
  const format: MeasureFormat = widget.aggregation === "count" || !measure ? "number" : measure.format

  const total = aggregateRecords(records, widget, measure)
  const totalFormatted = formatMeasure(total, format)

  // Metric ignores grouping entirely.
  if (!viz.needsGroup || !widget.groupBy) {
    return {
      isEmpty: records.length === 0,
      total,
      totalFormatted,
      measureLabel,
      format,
      categories: [],
      series: [],
      categoryTotals: [],
    }
  }

  const groupDim = getDimension(source, widget.groupBy)
  if (!groupDim) {
    return { isEmpty: true, total, totalFormatted, measureLabel, format, categories: [], series: [], categoryTotals: [] }
  }

  const segmentDim = viz.singleSeries ? null : getDimension(source, widget.segmentBy)

  const buckets = new Map<string, CategoryBucket>()
  for (const record of records) {
    const groups = groupValues(groupDim, record, widget.dateGrain)
    for (const group of groups) {
      let bucket = buckets.get(group.key)
      if (!bucket) {
        bucket = { key: group.key, label: group.label, records: [], segments: new Map() }
        buckets.set(group.key, bucket)
      }
      bucket.records.push(record)
      if (segmentDim) {
        const segGroups = groupValues(segmentDim, record, widget.dateGrain)
        for (const seg of segGroups) {
          let segBucket = bucket.segments.get(seg.key)
          if (!segBucket) {
            segBucket = { label: seg.label, records: [] }
            bucket.segments.set(seg.key, segBucket)
          }
          segBucket.records.push(record)
        }
      }
    }
  }

  let ordered = [...buckets.values()]
  const isDate = groupDim.kind === "date"
  ordered.sort((a, b) => {
    if (isDate) return a.key.localeCompare(b.key)
    if (widget.sort === "label-asc") return a.label.localeCompare(b.label)
    if (widget.sort === "label-desc") return b.label.localeCompare(a.label)
    const av = aggregateRecords(a.records, widget, measure)
    const bv = aggregateRecords(b.records, widget, measure)
    return widget.sort === "value-asc" ? av - bv : bv - av
  })

  // Time series stay chronological and complete; the limit only trims categorical rankings.
  if (!isDate && widget.limit > 0 && ordered.length > widget.limit) ordered = ordered.slice(0, widget.limit)

  const categories = ordered.map((bucket) => bucket.label)

  let series: ComputedSeries[]
  if (segmentDim) {
    const segOrder: { key: string; label: string }[] = []
    const seen = new Set<string>()
    for (const bucket of ordered) {
      for (const [key, value] of bucket.segments) {
        if (!seen.has(key)) {
          seen.add(key)
          segOrder.push({ key, label: value.label })
        }
      }
    }
    series = segOrder.map((seg, index) => ({
      name: seg.label,
      color: getFolkMetricColor(index),
      values: ordered.map((bucket) => {
        const segBucket = bucket.segments.get(seg.key)
        return segBucket ? aggregateRecords(segBucket.records, widget, measure) : 0
      }),
    }))
  } else {
    series = [
      {
        name: measureLabel,
        color: getFolkMetricColor(0),
        values: ordered.map((bucket) => aggregateRecords(bucket.records, widget, measure)),
      },
    ]
  }

  const categoryTotals = ordered.map((_, index) => series.reduce((sum, s) => sum + (s.values[index] ?? 0), 0))
  const isEmpty = categories.length === 0 || categoryTotals.every((value) => value === 0)

  return { isEmpty, total, totalFormatted, measureLabel, format, categories, series, categoryTotals }
}
