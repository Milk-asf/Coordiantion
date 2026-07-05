"use client"

import { useMemo } from "react"
import type { RosterShift } from "@/lib/roster/types"
import {
  buildYearHeatmap,
  formatHeatmapHours,
  heatmapBucket,
  type HeatmapBucket,
  type YearHeatmapDay,
} from "@/lib/roster/year-utils"
import { formatShortDateLabel, parseDateStr, toDateStr } from "@/lib/roster/week-utils"
import { FolkMetricCard } from "@/components/folk-metrics/folk-metric-card"
import { Tooltip } from "@/components/tooltip"
import { cn } from "@/lib/utils"

const CELL_PX = 16
const CELL_GAP_PX = 4

// Roster blue ramp drawn from the app accents (today chip, add-zone hover,
// focus borders) rather than the generic contribution-graph green.
const BUCKET_CLASSES: Record<HeatmapBucket, string> = {
  0: "bg-[#ececeb]",
  1: "bg-[#dbeafe]",
  2: "bg-[#a3c4f3]",
  3: "bg-[#8fa8e0]",
  4: "bg-[#1565c0]",
}

function cellLabel(day: YearHeatmapDay): string {
  if (day.count === 0) return `No shifts · ${formatShortDateLabel(day.dateStr)}`
  const noun = day.count === 1 ? "shift" : "shifts"
  return `${day.count} ${noun} · ${formatHeatmapHours(day.hours)} hrs · ${formatShortDateLabel(day.dateStr)}`
}

function YearHeatmapCell({
  day,
  maxCount,
  isToday,
  onSelectDate,
}: {
  day: YearHeatmapDay
  maxCount: number
  isToday: boolean
  onSelectDate: (dateStr: string) => void
}) {
  const label = cellLabel(day)

  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={() => onSelectDate(day.dateStr)}
        className={cn(
          "h-[16px] w-[16px] rounded-[4px] transition-shadow",
          BUCKET_CLASSES[heatmapBucket(day.count, maxCount)],
          "hover:shadow-[inset_0_0_0_1px_rgba(17,17,17,0.35)] focus-visible:shadow-[inset_0_0_0_1px_rgba(17,17,17,0.55)] focus-visible:outline-none",
          isToday && "shadow-[0_0_0_1px_#ffffff,0_0_0_2px_#1565c0]"
        )}
        aria-label={`${label}. Open day`}
        tabIndex={0}
      />
    </Tooltip>
  )
}

function YearStatCard({
  title,
  value,
  detail,
  onClick,
}: {
  title: string
  value: string | null
  detail?: string
  onClick?: () => void
}) {
  return (
    <FolkMetricCard
      title={title}
      onClick={value ? onClick : undefined}
      minHeightClassName="min-h-[88px]"
      contentClassName="px-[16px] pb-[14px] pt-[8px]"
    >
      {value ? (
        <span className="truncate text-[20px] font-semibold leading-none tracking-tight text-folk-text">
          {value}
        </span>
      ) : (
        <span className="text-[14px] font-normal text-folk-placeholder">—</span>
      )}
      {value && detail && (
        <span className="mt-[6px] truncate text-[12px] font-normal text-folk-secondary">{detail}</span>
      )}
    </FolkMetricCard>
  )
}

interface RosterYearViewProps {
  year: number
  shifts: RosterShift[]
  weekStartsOn: 0 | 1
  onSelectDate: (dateStr: string) => void
}

export function RosterYearView({ year, shifts, weekStartsOn, onSelectDate }: RosterYearViewProps) {
  const today = useMemo(() => new Date(), [])
  const todayStr = toDateStr(today)
  const isCurrentYear = today.getFullYear() === year

  const heatmap = useMemo(
    () => buildYearHeatmap(year, shifts, weekStartsOn, today),
    [year, shifts, weekStartsOn, today]
  )
  const { weeks, monthLabels, dayRowLabels, stats } = heatmap

  const shiftNoun = (count: number) => (count === 1 ? "shift" : "shifts")
  const coveragePct = stats.daysInYear > 0 ? Math.round((stats.daysWithShifts / stats.daysInYear) * 100) : 0
  const mostActiveDayLabel = stats.mostActiveDay
    ? parseDateStr(stats.mostActiveDay.dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
    : null

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="w-fit min-w-full px-[24px] py-[24px]">
        <div className="mx-auto w-fit">
          <div>
            <p className="text-[12px] font-normal text-folk-secondary">Shifts rostered</p>
            <p className="mt-[6px] flex items-baseline gap-[8px]">
              <span className="text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-folk-text">
                {stats.totalShifts.toLocaleString("en-AU")}
              </span>
              <span className="text-[13px] font-normal text-folk-secondary">
                {formatHeatmapHours(stats.totalHours)} hrs
              </span>
            </p>
          </div>

          {/* One grid holds month labels, day labels and cells so every track
              lines up exactly: row 1 = months, column 1 = weekdays. */}
          <div
            className="mt-[24px] grid w-fit"
            style={{
              gridTemplateColumns: `auto repeat(${weeks.length}, ${CELL_PX}px)`,
              gridTemplateRows: `auto repeat(7, ${CELL_PX}px)`,
              gap: `${CELL_GAP_PX}px`,
            }}
          >
            {monthLabels.map(({ weekIndex, span, label }) => (
              <div
                key={`${label}-${weekIndex}`}
                className="flex items-end overflow-hidden pb-[4px] text-[11px] font-medium leading-none text-folk-secondary"
                style={{ gridRow: 1, gridColumn: `${weekIndex + 2} / span ${span}` }}
              >
                {label}
              </div>
            ))}

            {dayRowLabels.map((label, row) =>
              label ? (
                <div
                  key={label}
                  className="flex items-center justify-end pr-[8px] text-[11px] font-medium leading-none text-folk-secondary"
                  style={{ gridRow: row + 2, gridColumn: 1 }}
                >
                  {label}
                </div>
              ) : null
            )}

            {weeks.map((week, weekIndex) =>
              week.map((day, dayIndex) =>
                day.inYear ? (
                  <div key={day.dateStr} style={{ gridRow: dayIndex + 2, gridColumn: weekIndex + 2 }}>
                    <YearHeatmapCell
                      day={day}
                      maxCount={stats.maxCount}
                      isToday={day.dateStr === todayStr}
                      onSelectDate={onSelectDate}
                    />
                  </div>
                ) : null
              )
            )}
          </div>

          <div className="mt-[14px] flex items-center gap-[6px] text-[12px] text-folk-secondary">
            <span>Fewer</span>
            {([0, 1, 2, 3, 4] as const).map((bucket) => (
              <span
                key={bucket}
                className={cn("h-[12px] w-[12px] rounded-[3px]", BUCKET_CLASSES[bucket])}
                aria-hidden
              />
            ))}
            <span>More</span>
          </div>

          <div className="mt-[24px] grid grid-cols-2 gap-[14px] sm:grid-cols-3 xl:grid-cols-6">
            <YearStatCard
              title="Busiest month"
              value={stats.mostActiveMonth?.label ?? null}
              detail={
                stats.mostActiveMonth
                  ? `${stats.mostActiveMonth.count} ${shiftNoun(stats.mostActiveMonth.count)} · ${formatHeatmapHours(stats.mostActiveMonth.hours)} hrs`
                  : undefined
              }
            />
            <YearStatCard
              title="Busiest day"
              value={mostActiveDayLabel}
              detail={
                stats.mostActiveDay
                  ? `${stats.mostActiveDay.count} ${shiftNoun(stats.mostActiveDay.count)} · ${formatHeatmapHours(stats.mostActiveDay.hours)} hrs`
                  : undefined
              }
              onClick={
                stats.mostActiveDay ? () => onSelectDate(stats.mostActiveDay!.dateStr) : undefined
              }
            />
            <YearStatCard
              title="Avg hours / week"
              value={stats.totalShifts > 0 ? `${formatHeatmapHours(stats.avgHoursPerWeek)} hrs` : null}
              detail={isCurrentYear ? "year to date" : undefined}
            />
            <YearStatCard
              title="Days covered"
              value={stats.totalShifts > 0 ? `${stats.daysWithShifts} of ${stats.daysInYear}` : null}
              detail={stats.totalShifts > 0 ? `${coveragePct}% of the year` : undefined}
            />
            <YearStatCard
              title="Staff rostered"
              value={stats.staffCount > 0 ? String(stats.staffCount) : null}
            />
            <YearStatCard
              title="Clients supported"
              value={stats.clientCount > 0 ? String(stats.clientCount) : null}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
