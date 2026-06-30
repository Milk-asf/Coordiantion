"use client"

import { Clock } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { TimesheetStatusChip } from "@/components/timesheet-status-chip"
import { formatDuration, type Timesheet } from "@/lib/timesheets/types"

function formatDateRange(timesheet: Timesheet): string {
  const start = new Date(`${timesheet.startDate}T00:00:00`)
  if (Number.isNaN(start.getTime())) return "—"
  const startLabel = start.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
  if (timesheet.endDate && timesheet.endDate !== timesheet.startDate) {
    const end = new Date(`${timesheet.endDate}T00:00:00`)
    const endLabel = end.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
    return `${startLabel} → ${endLabel}`
  }
  return startLabel
}

interface ProfileTimesheetsTabProps {
  timesheets: Timesheet[]
  onOpenTimesheet?: (timesheet: Timesheet) => void
  emptyDescription?: string
}

export function ProfileTimesheetsTab({ timesheets, onOpenTimesheet, emptyDescription }: ProfileTimesheetsTabProps) {
  if (timesheets.length === 0) {
    return (
      <div className="flex h-full flex-col bg-white">
        <EmptyState
          icon={Clock}
          title="No timesheets yet"
          description={emptyDescription ?? "Timesheets submitted by this staff member will appear here."}
          className="flex-1"
        />
      </div>
    )
  }

  const rowClass =
    "grid w-full grid-cols-[1.4fr_1fr_0.8fr_1.2fr_0.9fr] items-center gap-[12px] border-b border-folk-border-subtle px-[16px] py-[10px] text-left"

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="grid grid-cols-[1.4fr_1fr_0.8fr_1.2fr_0.9fr] items-center gap-[12px] border-b border-folk-border bg-white px-[16px] py-[8px] text-[11px] font-medium uppercase tracking-normal text-folk-secondary">
          <span>Date</span>
          <span>Time</span>
          <span>Hours</span>
          <span>Travel</span>
          <span>Status</span>
        </div>
        {timesheets.map((timesheet) =>
          onOpenTimesheet ? (
            <button
              key={timesheet.id}
              type="button"
              onClick={() => onOpenTimesheet(timesheet)}
              className={`${rowClass} bg-white transition-colors hover:bg-folk-hover`}
              tabIndex={0}
            >
              <TimesheetRowContent timesheet={timesheet} />
            </button>
          ) : (
            <div key={timesheet.id} className={`${rowClass} bg-white`}>
              <TimesheetRowContent timesheet={timesheet} />
            </div>
          ),
        )}
      </div>
      <div className="shrink-0 border-t border-folk-border px-[16px] py-[10px]">
        <span className="text-[12px] font-medium text-folk-secondary">
          {timesheets.length} {timesheets.length === 1 ? "timesheet" : "timesheets"}
        </span>
      </div>
    </div>
  )
}

function TimesheetRowContent({ timesheet }: { timesheet: Timesheet }) {
  return (
    <>
      <span className="truncate text-[13px] font-medium text-folk-text">{formatDateRange(timesheet)}</span>
      <span className="truncate text-[13px] text-folk-secondary">
        {timesheet.startTime} – {timesheet.endTime}
      </span>
      <span className="text-[13px] text-folk-secondary">{formatDuration(timesheet.workedMinutes)}</span>
      <span className="truncate text-[13px] text-folk-secondary">
        {timesheet.travelClaims.length > 0 ? (
          <span className="inline-flex h-[20px] items-center rounded-full bg-folk-hover px-[8px] text-[11px] font-medium text-folk-secondary">
            {timesheet.travelClaims.length} travel
          </span>
        ) : (
          <span className="text-folk-placeholder">—</span>
        )}
      </span>
      <span className="flex items-center">
        <TimesheetStatusChip status={timesheet.status} />
      </span>
    </>
  )
}
