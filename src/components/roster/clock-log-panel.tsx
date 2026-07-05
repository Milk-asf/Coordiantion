"use client"

import { useMemo } from "react"
import { Clock, MapPin, X } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { FloatingSidePanel } from "@/components/floating-side-panel"
import { IconButton } from "@/components/icon-button"
import { mapsUrlForCoordinates } from "@/lib/geolocation"
import { useStaff } from "@/lib/staff-context"
import { useTimesheets } from "@/lib/timesheets-context"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { CLOCK_EVENT_LABELS, type ClockEvent, type ClockEventType } from "@/lib/timesheets/types"
import { getToneChipClasses } from "@/lib/chip-colors"
import {
  TABLE_CELL_BASE,
  TABLE_CELL_INNER,
  TABLE_CELL_LAST,
  TABLE_GRID,
  TABLE_HEADER_CELL,
  TABLE_HEADER_CELL_LAST,
  TABLE_TEXT_CELL,
} from "@/lib/table-styles"
import { cn } from "@/lib/utils"

function formatRecordedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}

function resolveStaffName(event: ClockEvent, staffNameById: Map<string, string>): string {
  if (event.staffId) {
    const name = staffNameById.get(event.staffId)
    if (name) return name
  }
  return event.submittedByName.trim() || "Unknown"
}

function ClockEventChip({ eventType }: { eventType: ClockEventType }) {
  const tone = eventType === "clock_on" ? "green" : "rose"
  return (
    <span className={getToneChipClasses(tone, "md")}>
      {CLOCK_EVENT_LABELS[eventType]}
    </span>
  )
}

interface ClockLogPanelProps {
  isOpen: boolean
  onClose: () => void
  periodStart?: string
  periodEnd?: string
}

export function ClockLogPanel({ isOpen, onClose, periodStart, periodEnd }: ClockLogPanelProps) {
  const { clockEvents, isLoading, currentStaffId } = useTimesheets()
  const { staff } = useStaff()
  const { isSupportWorker } = usePermissions()

  const staffNameById = useMemo(
    () => new Map(staff.map((member) => [member.id, member.name])),
    [staff],
  )

  const filteredEvents = useMemo(() => {
    // Support workers only ever see their own clock records.
    let events = isSupportWorker
      ? clockEvents.filter((event) => Boolean(currentStaffId) && event.staffId === currentStaffId)
      : clockEvents
    if (periodStart) {
      events = events.filter((event) => event.recordedAt.slice(0, 10) >= periodStart)
    }
    if (periodEnd) {
      events = events.filter((event) => event.recordedAt.slice(0, 10) <= periodEnd)
    }
    return events
  }, [clockEvents, currentStaffId, isSupportWorker, periodEnd, periodStart])

  if (!isOpen) return null

  return (
    <FloatingSidePanel width={480} className="z-20" data-clock-log-panel>
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-folk-border-subtle px-[16px]">
        <div className="flex min-w-0 items-center gap-[8px]">
          <Clock className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.75} />
          <span className="truncate text-[13px] font-medium text-folk-text">Clock log</span>
        </div>
        <IconButton tooltip="Close clock log" onClick={onClose}>
          <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading ? (
          <p className="px-[16px] py-[24px] text-[13px] text-folk-secondary">Loading clock log…</p>
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No clock events"
            description={
              periodStart && periodEnd
                ? "No one has clocked on or off during this roster period."
                : "Clock on or off to start building the log."
            }
          />
        ) : (
          <table className={cn("w-full", TABLE_GRID)}>
            <thead className="sticky top-0 z-[1]">
              <tr>
                <th className={TABLE_HEADER_CELL}>Staff</th>
                <th className={cn(TABLE_HEADER_CELL, "min-w-[92px]")}>Event</th>
                <th className={TABLE_HEADER_CELL}>Time</th>
                <th className={TABLE_HEADER_CELL_LAST}>Location</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id}>
                  <td className={TABLE_CELL_BASE}>
                    <div className={TABLE_CELL_INNER}>
                      <span className={TABLE_TEXT_CELL}>{resolveStaffName(event, staffNameById)}</span>
                    </div>
                  </td>
                  <td className={cn(TABLE_CELL_BASE, "min-w-[92px]")}>
                    <div className={TABLE_CELL_INNER}>
                      <ClockEventChip eventType={event.eventType} />
                    </div>
                  </td>
                  <td className={TABLE_CELL_BASE}>
                    <div className={TABLE_CELL_INNER}>
                      <span className={cn(TABLE_TEXT_CELL, "tabular-nums")}>{formatRecordedAt(event.recordedAt)}</span>
                    </div>
                  </td>
                  <td className={TABLE_CELL_LAST}>
                    <div className={TABLE_CELL_INNER}>
                      {event.latitude != null && event.longitude != null ? (
                        <a
                          href={mapsUrlForCoordinates(event.latitude, event.longitude)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-w-0 items-center gap-[6px] text-[13px] text-folk-text hover:underline"
                          title="Open in maps"
                        >
                          <MapPin className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.75} />
                          <span className="truncate">{event.locationLabel}</span>
                        </a>
                      ) : (
                        <span className="inline-flex min-w-0 items-center gap-[6px] text-[13px] text-folk-secondary">
                          <MapPin className="h-[13px] w-[13px] shrink-0" strokeWidth={1.75} />
                          <span className="truncate">{event.locationLabel || "Location unavailable"}</span>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </FloatingSidePanel>
  )
}
