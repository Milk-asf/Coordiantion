/**
 * Widget scoping: relative date windows and field filters. Pure helpers so
 * both the compute pipeline and the builder UI share one implementation.
 */

export type DateWindowKey =
  | "all"
  | "last7"
  | "last30"
  | "last90"
  | "thisWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisQuarter"
  | "thisYear"

export const DATE_WINDOWS: { key: DateWindowKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "last7", label: "Last 7 days" },
  { key: "last30", label: "Last 30 days" },
  { key: "last90", label: "Last 90 days" },
  { key: "thisWeek", label: "This week" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "thisQuarter", label: "This quarter" },
  { key: "thisYear", label: "This year" },
]

export const DATE_WINDOW_LABELS: Record<DateWindowKey, string> = DATE_WINDOWS.reduce(
  (acc, window) => {
    acc[window.key] = window.label
    return acc
  },
  {} as Record<DateWindowKey, string>,
)

/** A widget-level filter: keep records whose dimension matches any selected value. */
export interface WidgetFilter {
  id: string
  dimension: string
  values: string[]
}

export interface DateRange {
  /** Inclusive start. */
  start: Date
  /** Exclusive end. */
  end: Date
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Resolves a window key to a concrete range, or null for "all time". */
export function resolveDateWindow(key: DateWindowKey | undefined, now: Date = new Date()): DateRange | null {
  const today = startOfDay(now)
  const tomorrow = addDays(today, 1)
  switch (key) {
    case "last7":
      return { start: addDays(today, -6), end: tomorrow }
    case "last30":
      return { start: addDays(today, -29), end: tomorrow }
    case "last90":
      return { start: addDays(today, -89), end: tomorrow }
    case "thisWeek": {
      // Monday-start week, consistent with the rest of the app.
      const day = (today.getDay() + 6) % 7
      const monday = addDays(today, -day)
      return { start: monday, end: addDays(monday, 7) }
    }
    case "thisMonth":
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 1, 1),
      }
    case "lastMonth":
      return {
        start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        end: new Date(today.getFullYear(), today.getMonth(), 1),
      }
    case "thisQuarter": {
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3
      return {
        start: new Date(today.getFullYear(), quarterStartMonth, 1),
        end: new Date(today.getFullYear(), quarterStartMonth + 3, 1),
      }
    }
    case "thisYear":
      return {
        start: new Date(today.getFullYear(), 0, 1),
        end: new Date(today.getFullYear() + 1, 0, 1),
      }
    case "all":
    default:
      return null
  }
}

export function parseRecordDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = value.length <= 10 ? new Date(`${value}T00:00:00`) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** True when the ISO date/datetime falls inside the range (records without a date fail). */
export function isDateInRange(value: string | null | undefined, range: DateRange): boolean {
  const date = parseRecordDate(value)
  if (!date) return false
  return date >= range.start && date < range.end
}

export function createFilterId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `flt_${crypto.randomUUID().slice(0, 8)}`
  }
  return `flt_${Math.random().toString(36).slice(2, 10)}`
}
