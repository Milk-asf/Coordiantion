"use client"

import { useMemo } from "react"
import { CalendarRange, Check, ClipboardList } from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"
import { EmptyState } from "@/components/empty-state"
import { TimesheetStatusChip } from "@/components/timesheet-status-chip"
import { useTimesheets } from "@/lib/timesheets-context"
import { formatTimeLabel } from "@/lib/roster/week-utils"
import type { RosterShift, RosterShiftStatus } from "@/lib/roster/types"
import {
  TABLE_CELL_BASE,
  TABLE_CELL_INNER,
  TABLE_CELL_LAST,
  TABLE_FULL,
  TABLE_HEADER_CELL,
  TABLE_HEADER_CELL_LAST,
  TABLE_STAFF_NAME_CELL,
  TABLE_TEXT_CELL,
} from "@/lib/table-styles"
import { cn } from "@/lib/utils"

const STATUS_CHIP_CLASS: Record<RosterShiftStatus, string> = {
  scheduled: "bg-[#dbeafe] text-[#1d4ed8]",
  completed: "bg-[#e7f5ec] text-[#1a7f43]",
  cancelled: "bg-folk-hover text-folk-secondary",
}

const STATUS_LABEL: Record<RosterShiftStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
}

function formatShiftDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
}

interface RosterTableViewProps {
  shifts: RosterShift[]
  searchQuery: string
  onEditShift: (shift: RosterShift) => void
}

export function RosterTableView({ shifts, searchQuery, onEditShift }: RosterTableViewProps) {
  const { timesheets } = useTimesheets()

  const timesheetByShift = useMemo(() => {
    const map = new Map<string, (typeof timesheets)[number]>()
    for (const timesheet of timesheets) {
      if (timesheet.shiftId) map.set(timesheet.shiftId, timesheet)
    }
    return map
  }, [timesheets])

  const rows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const filtered = query
      ? shifts.filter(
          (shift) =>
            shift.staffName.toLowerCase().includes(query) ||
            shift.clientName.toLowerCase().includes(query) ||
            shift.title.toLowerCase().includes(query),
        )
      : shifts
    return [...filtered].sort((a, b) => {
      const byDate = a.date.localeCompare(b.date)
      if (byDate !== 0) return byDate
      return a.startTime.localeCompare(b.startTime)
    })
  }, [shifts, searchQuery])

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="No shifts this week"
        description="Shifts scheduled for the selected week will appear here."
        className="flex-1"
      />
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
      <table className={TABLE_FULL}>
        <thead>
          <tr>
            <th className={cn(TABLE_HEADER_CELL, "sticky top-0 z-10")}>Date</th>
            <th className={cn(TABLE_HEADER_CELL, "sticky top-0 z-10")}>Time</th>
            <th className={cn(TABLE_HEADER_CELL, "sticky top-0 z-10")}>Staff</th>
            <th className={cn(TABLE_HEADER_CELL, "sticky top-0 z-10")}>Participant</th>
            <th className={cn(TABLE_HEADER_CELL, "sticky top-0 z-10")}>Status</th>
            <th className={cn(TABLE_HEADER_CELL, "sticky top-0 z-10")}>Timesheet</th>
            <th className={cn(TABLE_HEADER_CELL_LAST, "sticky top-0 z-10")}>Shift note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((shift) => {
            const timesheet = timesheetByShift.get(shift.id) ?? null
            const hasNote = Boolean(shift.progressNote)
            return (
              <tr
                key={shift.id}
                className="group cursor-pointer transition-colors hover:bg-folk-hover"
                onClick={() => onEditShift(shift)}
                tabIndex={0}
                role="button"
                aria-label={`Open shift on ${formatShiftDate(shift.date)}`}
              >
                <td className={TABLE_CELL_BASE}>
                  <div className={TABLE_CELL_INNER}>
                    <span className={TABLE_TEXT_CELL}>{formatShiftDate(shift.date)}</span>
                  </div>
                </td>
                <td className={TABLE_CELL_BASE}>
                  <div className={TABLE_CELL_INNER}>
                    <span className={TABLE_TEXT_CELL}>
                      {formatTimeLabel(shift.startTime)} – {formatTimeLabel(shift.endTime)}
                    </span>
                  </div>
                </td>
                <td className={TABLE_CELL_BASE}>
                  <div className={TABLE_CELL_INNER}>
                    {shift.staffId ? (
                      <>
                        <EntityIcon text={shift.staffIconText} size="xsm" />
                        <span className={TABLE_STAFF_NAME_CELL}>{shift.staffName}</span>
                      </>
                    ) : (
                      <span className="text-[13px] font-medium text-folk-placeholder">Unassigned</span>
                    )}
                  </div>
                </td>
                <td className={TABLE_CELL_BASE}>
                  <div className={TABLE_CELL_INNER}>
                    {shift.clientId ? (
                      <>
                        <EntityIcon text={shift.clientIconText} size="xsm" />
                        <span className={TABLE_STAFF_NAME_CELL}>{shift.clientName}</span>
                      </>
                    ) : (
                      <span className="text-[13px] font-medium text-folk-placeholder">—</span>
                    )}
                  </div>
                </td>
                <td className={TABLE_CELL_BASE}>
                  <div className={TABLE_CELL_INNER}>
                    <span
                      className={cn(
                        "inline-flex h-[20px] items-center rounded-full px-[8px] text-[11px] font-medium",
                        STATUS_CHIP_CLASS[shift.status],
                      )}
                    >
                      {STATUS_LABEL[shift.status]}
                    </span>
                  </div>
                </td>
                <td className={TABLE_CELL_BASE} onClick={(event) => event.stopPropagation()}>
                  <div className={TABLE_CELL_INNER}>
                    {timesheet ? (
                      <TimesheetStatusChip status={timesheet.status} />
                    ) : (
                      <span className="text-[12px] font-medium text-folk-placeholder">No timesheet</span>
                    )}
                  </div>
                </td>
                <td className={TABLE_CELL_LAST}>
                  <div className={TABLE_CELL_INNER}>
                    {hasNote ? (
                      <span className="inline-flex h-[20px] items-center gap-[4px] rounded-full bg-[#e7f5ec] px-[8px] text-[11px] font-medium text-[#1a7f43]">
                        <Check className="h-[11px] w-[11px]" strokeWidth={2.5} />
                        Recorded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-[4px] text-[12px] font-medium text-folk-placeholder">
                        <ClipboardList className="h-[12px] w-[12px]" strokeWidth={1.75} />
                        No note
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
