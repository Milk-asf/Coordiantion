import type { RosterShift } from "@/lib/roster/types"
import { shiftDurationHours, startOfWeek, toDateStr } from "@/lib/roster/week-utils"

export type YearHeatmapShift = Pick<
  RosterShift,
  "date" | "startTime" | "endTime" | "status" | "staffId" | "clientId"
>

export interface YearHeatmapDay {
  dateStr: string
  count: number
  hours: number
  inYear: boolean
}

export interface YearHeatmapMonthLabel {
  weekIndex: number
  /** How many week columns this month's label may span before the next month starts. */
  span: number
  label: string
}

export interface YearHeatmapStats {
  totalShifts: number
  totalHours: number
  maxCount: number
  mostActiveMonth: { label: string; count: number; hours: number } | null
  mostActiveDay: YearHeatmapDay | null
  /** Days in the year with at least one shift. */
  daysWithShifts: number
  daysInYear: number
  /** Hours per week — over the year to date for the current year, else the whole year. */
  avgHoursPerWeek: number
  /** Distinct staff rostered (unassigned/vacant shifts excluded). */
  staffCount: number
  /** Distinct clients with rostered support. */
  clientCount: number
}

export interface YearHeatmap {
  year: number
  /** Columns of the heatmap — one entry per week, each with exactly 7 days. */
  weeks: YearHeatmapDay[][]
  monthLabels: YearHeatmapMonthLabel[]
  /** Row labels for the 7 weekday rows (Mon/Wed/Fri, null elsewhere). */
  dayRowLabels: (string | null)[]
  stats: YearHeatmapStats
}

export type HeatmapBucket = 0 | 1 | 2 | 3 | 4

/** Maps a day's shift count to one of five intensity buckets (0 = none). */
export function heatmapBucket(count: number, maxCount: number): HeatmapBucket {
  if (count <= 0 || maxCount <= 0) return 0
  if (maxCount <= 4) return Math.min(count, 4) as HeatmapBucket
  const ratio = count / maxCount
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

export function formatHeatmapHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function buildDayRowLabels(weekStartsOn: 0 | 1): (string | null)[] {
  const labels: Record<number, string> = { 1: "Mon", 3: "Wed", 5: "Fri" }
  return Array.from({ length: 7 }, (_, row) => labels[(weekStartsOn + row) % 7] ?? null)
}

export function buildYearHeatmap(
  year: number,
  shifts: YearHeatmapShift[],
  weekStartsOn: 0 | 1 = 1,
  today: Date = new Date()
): YearHeatmap {
  const yearStartStr = `${year}-01-01`
  const yearEndStr = `${year}-12-31`

  const totals = new Map<string, { count: number; hours: number }>()
  const staffIds = new Set<string>()
  const clientIds = new Set<string>()
  for (const shift of shifts) {
    if (shift.status === "cancelled") continue
    if (shift.date < yearStartStr || shift.date > yearEndStr) continue
    const entry = totals.get(shift.date) ?? { count: 0, hours: 0 }
    entry.count += 1
    entry.hours += shiftDurationHours(shift.startTime, shift.endTime)
    totals.set(shift.date, entry)
    if (shift.staffId?.trim()) staffIds.add(shift.staffId)
    if (shift.clientId?.trim()) clientIds.add(shift.clientId)
  }

  const weeks: YearHeatmapDay[][] = []
  const monthStarts: { weekIndex: number; label: string }[] = []
  const seenMonths = new Set<number>()
  const cursor = new Date(startOfWeek(new Date(year, 0, 1), weekStartsOn))

  do {
    const week: YearHeatmapDay[] = []
    for (let i = 0; i < 7; i += 1) {
      const dateStr = toDateStr(cursor)
      const inYear = cursor.getFullYear() === year
      const entry = inYear ? totals.get(dateStr) : undefined
      week.push({ dateStr, count: entry?.count ?? 0, hours: entry?.hours ?? 0, inYear })

      if (inYear && !seenMonths.has(cursor.getMonth())) {
        seenMonths.add(cursor.getMonth())
        monthStarts.push({
          weekIndex: weeks.length,
          label: cursor.toLocaleDateString("en-AU", { month: "short" }),
        })
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  } while (cursor.getFullYear() <= year)

  const monthLabels: YearHeatmapMonthLabel[] = monthStarts.map((entry, index) => ({
    ...entry,
    span: (monthStarts[index + 1]?.weekIndex ?? weeks.length) - entry.weekIndex,
  }))

  const daysInYear = weeks.flat().filter((day) => day.inYear)

  let totalShifts = 0
  let totalHours = 0
  let maxCount = 0
  let daysWithShifts = 0
  let mostActiveDay: YearHeatmapDay | null = null
  const monthCounts = new Array<number>(12).fill(0)
  const monthHours = new Array<number>(12).fill(0)

  for (const day of daysInYear) {
    totalShifts += day.count
    totalHours += day.hours
    const monthIndex = Number(day.dateStr.slice(5, 7)) - 1
    monthCounts[monthIndex] += day.count
    monthHours[monthIndex] += day.hours
    if (day.count > maxCount) maxCount = day.count
    if (day.count > 0) {
      daysWithShifts += 1
      if (!mostActiveDay || day.count > mostActiveDay.count) mostActiveDay = day
    }
  }

  let mostActiveMonth: YearHeatmapStats["mostActiveMonth"] = null
  if (totalShifts > 0) {
    const topMonth = monthCounts.indexOf(Math.max(...monthCounts))
    mostActiveMonth = {
      label: new Date(year, topMonth, 1).toLocaleDateString("en-AU", { month: "long" }),
      count: monthCounts[topMonth],
      hours: monthHours[topMonth],
    }
  }

  // Average over the elapsed part of the current year so a half-finished year
  // isn't diluted; past (and fully planned future) years use all their weeks.
  const todayStr = toDateStr(today)
  let elapsedDays = daysInYear.length
  if (todayStr >= yearStartStr && todayStr <= yearEndStr) {
    elapsedDays = daysInYear.filter((day) => day.dateStr <= todayStr).length
  }
  const avgHoursPerWeek = elapsedDays > 0 ? totalHours / (elapsedDays / 7) : 0

  return {
    year,
    weeks,
    monthLabels,
    dayRowLabels: buildDayRowLabels(weekStartsOn),
    stats: {
      totalShifts,
      totalHours,
      maxCount,
      mostActiveMonth,
      mostActiveDay,
      daysWithShifts,
      daysInYear: daysInYear.length,
      avgHoursPerWeek,
      staffCount: staffIds.size,
      clientCount: clientIds.size,
    },
  }
}
