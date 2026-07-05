"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  CalendarRange,
  ChevronRight,
  ClipboardList,
  Clock,
  Sun,
} from "lucide-react"
import { PageTitleBar } from "@/components/page-title-bar"
import { PageClockButton } from "@/components/page-clock-button"
import { PageLoader } from "@/components/page-state"
import { EntityIcon } from "@/components/entity-icon"
import { TimesheetStatusChip } from "@/components/timesheet-status-chip"
import { useRosterContext } from "@/lib/roster-context"
import { useTimesheets } from "@/lib/timesheets-context"
import { useClients } from "@/lib/hooks/use-clients"
import { useStaff } from "@/lib/hooks/use-staff"
import { useSuitabilityContext } from "@/lib/suitability-context"
import { useCurrentStaffId } from "@/lib/hooks/use-current-staff"
import { useWorkspace } from "@/lib/workspace-context"
import { getSessionTypeLabel } from "@/lib/roster/settings"
import { formatShiftTime, formatShortDateLabel, toDateStr } from "@/lib/roster/week-utils"
import type { RosterShift } from "@/lib/roster/types"
import { cn } from "@/lib/utils"

const CARD_CLASS = "rounded-[6px] border border-folk-border-subtle bg-folk-surface"
const CARD_HEADER_CLASS =
  "flex items-center justify-between gap-[12px] border-b border-[#f5f5f5] px-[16px] py-[12px]"
const CARD_TITLE_CLASS = "text-[13px] font-semibold text-folk-text"
const ROW_CLASS =
  "flex items-center gap-[12px] border-b border-[#f5f5f5] px-[16px] py-[10px] transition-colors last:border-b-0 hover:bg-folk-hover"

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function CountChip({ count, tone = "neutral" }: { count: number; tone?: "neutral" | "amber" }) {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[10px] font-medium tabular-nums",
        tone === "amber" ? "bg-[#fef3c7] text-[#b45309]" : "border border-folk-border-strong text-folk-secondary"
      )}
    >
      {count}
    </span>
  )
}

function shiftHasEnded(shift: RosterShift, todayStr: string, nowTime: string): boolean {
  if (shift.date < todayStr) return true
  return shift.date === todayStr && shift.endTime <= nowTime
}

export default function MyDayPage() {
  const { shifts, isLoading: rosterLoading } = useRosterContext()
  const { myTimesheets, activeClock, isLoading: timesheetsLoading } = useTimesheets()
  const { clients } = useClients()
  const { staff } = useStaff()
  const { getStatus: getSuitabilityStatus } = useSuitabilityContext()
  const { currentUserName } = useWorkspace()
  const currentStaffId = useCurrentStaffId()

  const now = new Date()
  const todayStr = toDateStr(now)
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

  // Defensive re-scope: the roster context already limits support workers to
  // their own shifts, but My Day is strictly "mine" for any role that opens it.
  const myShifts = useMemo(
    () => (currentStaffId ? shifts.filter((shift) => shift.staffId === currentStaffId) : []),
    [shifts, currentStaffId]
  )

  const todaysShifts = useMemo(
    () =>
      myShifts
        .filter((shift) => shift.date === todayStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [myShifts, todayStr]
  )

  const shiftsNeedingNotes = useMemo(
    () =>
      myShifts
        .filter(
          (shift) =>
            shift.status !== "cancelled" &&
            !shift.progressNote &&
            shiftHasEnded(shift, todayStr, nowTime)
        )
        .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)),
    [myShifts, todayStr, nowTime]
  )

  const unfinishedTimesheets = useMemo(
    () =>
      myTimesheets
        .filter((timesheet) => timesheet.status === "draft" || timesheet.status === "returned")
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [myTimesheets]
  )

  const myParticipants = useMemo(() => {
    if (!currentStaffId) return []
    return clients
      .filter(
        (client) =>
          client.status !== "archived" &&
          getSuitabilityStatus(currentStaffId, client.id) === "preferred"
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
  }, [clients, currentStaffId, getSuitabilityStatus])

  const staffMember = useMemo(
    () => staff.find((member) => member.id === currentStaffId) ?? null,
    [staff, currentStaffId]
  )
  const firstName =
    staffMember?.details.firstName ||
    (staffMember?.name || currentUserName || "").trim().split(/\s+/)[0] ||
    "there"

  const outstandingCount = shiftsNeedingNotes.length + unfinishedTimesheets.length

  if (rosterLoading || timesheetsLoading) return <PageLoader label="Loading your day…" />

  return (
    <div className="flex h-full flex-col bg-white">
      <PageTitleBar title="My Day" showBack={false} showClock={false} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[720px] px-[20px] py-[24px]">
          <div>
            <h1 className="text-[20px] font-bold text-folk-text">
              {greetingForHour(now.getHours())}, {firstName}
            </h1>
            <p className="mt-[4px] text-[14px] text-folk-secondary">
              {now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {!currentStaffId && (
            <div className="mt-[16px] rounded-[6px] border border-amber-200 bg-amber-50 px-[14px] py-[10px] text-[13px] text-amber-800">
              Your login isn&apos;t linked to a staff profile yet, so shifts and timesheets can&apos;t
              be shown. Ask your coordinator to link your email to your staff record.
            </div>
          )}

          {/* Clock */}
          <div className={cn(CARD_CLASS, "mt-[20px] flex items-center justify-between gap-[12px] px-[16px] py-[14px]")}>
            <div className="flex min-w-0 items-center gap-[10px]">
              <span
                className={cn(
                  "h-[8px] w-[8px] shrink-0 rounded-full",
                  activeClock ? "bg-[#16a34a]" : "bg-[var(--folk-border-strong)]"
                )}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-folk-text">
                  {activeClock ? "Clocked on" : "Off the clock"}
                </p>
                <p className="truncate text-[12px] text-folk-secondary">
                  {activeClock?.clockedInAt
                    ? `Since ${new Date(activeClock.clockedInAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`
                    : "Clock on when you start your shift"}
                </p>
              </div>
            </div>
            <PageClockButton />
          </div>

          {/* Today's shifts */}
          <div className={cn(CARD_CLASS, "mt-[16px]")}>
            <div className={CARD_HEADER_CLASS}>
              <span className="flex items-center gap-[8px]">
                <Sun className="h-[14px] w-[14px] text-folk-secondary" strokeWidth={1.75} />
                <h2 className={CARD_TITLE_CLASS}>Today&apos;s shifts</h2>
                {todaysShifts.length > 0 && <CountChip count={todaysShifts.length} />}
              </span>
              <Link href="/roster" className="text-[12px] font-medium text-folk-secondary transition-colors hover:text-folk-text" tabIndex={0}>
                Open roster
              </Link>
            </div>
            {todaysShifts.length === 0 ? (
              <p className="px-[16px] py-[16px] text-[13px] text-folk-secondary">
                No shifts rostered today.
              </p>
            ) : (
              todaysShifts.map((shift) => {
                const ended = shiftHasEnded(shift, todayStr, nowTime)
                return (
                  <Link key={shift.id} href="/roster" className={ROW_CLASS} tabIndex={0}>
                    <EntityIcon text={shift.clientIconText || "?"} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-folk-text">
                        {shift.clientName || "Unassigned"}
                      </span>
                      <span className="block truncate text-[12px] text-folk-secondary">
                        {formatShiftTime(shift.startTime, shift.endTime)}
                        {shift.sessionType && shift.sessionType !== "none"
                          ? ` · ${getSessionTypeLabel(shift.sessionType)}`
                          : ""}
                      </span>
                    </span>
                    {shift.status === "cancelled" ? (
                      <span className="inline-flex h-[20px] shrink-0 items-center rounded-full bg-[#fce4ec] px-[8px] text-[11px] font-medium text-[#c62828]">
                        Cancelled
                      </span>
                    ) : shift.progressNote ? (
                      <span className="inline-flex h-[20px] shrink-0 items-center rounded-full bg-[#e7f5ec] px-[8px] text-[11px] font-medium text-[#1a7f43]">
                        Note added
                      </span>
                    ) : ended ? (
                      <span className="inline-flex h-[20px] shrink-0 items-center rounded-full bg-[#fef3c7] px-[8px] text-[11px] font-medium text-[#b45309]">
                        Note needed
                      </span>
                    ) : null}
                    <ChevronRight className="h-[14px] w-[14px] shrink-0 text-folk-placeholder" strokeWidth={1.75} />
                  </Link>
                )
              })
            )}
          </div>

          {/* Still to do */}
          <div className={cn(CARD_CLASS, "mt-[16px]")}>
            <div className={CARD_HEADER_CLASS}>
              <span className="flex items-center gap-[8px]">
                <ClipboardList className="h-[14px] w-[14px] text-folk-secondary" strokeWidth={1.75} />
                <h2 className={CARD_TITLE_CLASS}>Still to do</h2>
                {outstandingCount > 0 && <CountChip count={outstandingCount} tone="amber" />}
              </span>
            </div>
            {outstandingCount === 0 ? (
              <p className="px-[16px] py-[16px] text-[13px] text-folk-secondary">
                Nothing outstanding — you&apos;re all caught up.
              </p>
            ) : (
              <>
                {shiftsNeedingNotes.slice(0, 5).map((shift) => (
                  <Link key={`note-${shift.id}`} href="/roster" className={ROW_CLASS} tabIndex={0}>
                    <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-[#d97706]" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-folk-text">
                        Shift note — {shift.clientName || "Unassigned"}
                      </span>
                      <span className="block text-[12px] text-folk-secondary">
                        {formatShortDateLabel(shift.date)} · {formatShiftTime(shift.startTime, shift.endTime)}
                      </span>
                    </span>
                    <ChevronRight className="h-[14px] w-[14px] shrink-0 text-folk-placeholder" strokeWidth={1.75} />
                  </Link>
                ))}
                {shiftsNeedingNotes.length > 5 && (
                  <p className="border-b border-[#f5f5f5] px-[16px] py-[8px] text-[12px] text-folk-secondary">
                    +{shiftsNeedingNotes.length - 5} more shift {shiftsNeedingNotes.length - 5 === 1 ? "note" : "notes"} on the roster
                  </p>
                )}
                {unfinishedTimesheets.slice(0, 5).map((timesheet) => (
                  <Link key={`ts-${timesheet.id}`} href="/timesheets" className={ROW_CLASS} tabIndex={0}>
                    <Clock className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-folk-text">
                        Timesheet — {formatShortDateLabel(timesheet.startDate)}
                      </span>
                      {timesheet.status === "returned" && timesheet.reviewNote ? (
                        <span className="block truncate text-[12px] text-folk-secondary">{timesheet.reviewNote}</span>
                      ) : null}
                    </span>
                    <TimesheetStatusChip status={timesheet.status} />
                    <ChevronRight className="h-[14px] w-[14px] shrink-0 text-folk-placeholder" strokeWidth={1.75} />
                  </Link>
                ))}
              </>
            )}
          </div>

          {/* Quick actions */}
          <div className="mt-[16px] grid gap-[12px] sm:grid-cols-2">
            <Link
              href="/incidents/new"
              className={cn(CARD_CLASS, "flex items-center gap-[12px] px-[16px] py-[14px] transition-colors hover:bg-folk-hover")}
              tabIndex={0}
            >
              <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[6px] bg-[#fce4ec]">
                <AlertTriangle className="h-[15px] w-[15px] text-[#c62828]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-folk-text">Report an incident</span>
                <span className="block text-[12px] text-folk-secondary">Lodge a report straight away</span>
              </span>
            </Link>
            <Link
              href="/roster"
              className={cn(CARD_CLASS, "flex items-center gap-[12px] px-[16px] py-[14px] transition-colors hover:bg-folk-hover")}
              tabIndex={0}
            >
              <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[6px] bg-[#e3f2fd]">
                <CalendarRange className="h-[15px] w-[15px] text-[#1565c0]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-folk-text">Open my roster</span>
                <span className="block text-[12px] text-folk-secondary">See the week ahead</span>
              </span>
            </Link>
          </div>

          {/* My participants */}
          <div className={cn(CARD_CLASS, "mt-[16px] mb-[24px]")}>
            <div className={CARD_HEADER_CLASS}>
              <h2 className={CARD_TITLE_CLASS}>My participants</h2>
              {myParticipants.length > 0 && <CountChip count={myParticipants.length} />}
            </div>
            {myParticipants.length === 0 ? (
              <p className="px-[16px] py-[16px] text-[13px] text-folk-secondary">
                No participants assigned to you yet.
              </p>
            ) : (
              myParticipants.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}`} className={ROW_CLASS} tabIndex={0}>
                  <EntityIcon text={client.iconText} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-folk-text">
                    {client.displayName}
                  </span>
                  <ChevronRight className="h-[14px] w-[14px] shrink-0 text-folk-placeholder" strokeWidth={1.75} />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
