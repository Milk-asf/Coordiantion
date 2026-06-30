"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { PageError, PageLoader } from "@/components/page-state"
import { PageTitleBar, PageToolbarBar } from "@/components/page-title-bar"
import { formatClockElapsed } from "@/components/page-clock-button"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { ProfileTimesheetsTab } from "@/components/profile-timesheets-tab"
import { ProfileShiftNotesTab } from "@/components/profile-shift-notes-tab"
import {
  profileMainTabScrollClass,
  profilePageTabBarClass,
  profilePageTabRowClass,
} from "@/components/tab-active-indicator"
import { useTimesheets } from "@/lib/timesheets-context"
import { useRosterContext } from "@/lib/roster-context"
import { useWorkspace } from "@/lib/workspace-context"
import { type Timesheet } from "@/lib/timesheets/types"
import { folkAddBtnClass } from "@/lib/folk-ui"
import { TimesheetFormPanel } from "./_components/timesheet-form-panel"

type WorkTab = "timesheets" | "notes"

export default function MyWorkPage() {
  const { myTimesheets, currentStaffId, activeClock, isLoading, fetchError, refetch } = useTimesheets()
  const { shifts } = useRosterContext()
  const { currentUserName } = useWorkspace()
  const [activeTab, setActiveTab] = useState<WorkTab>("timesheets")
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [editing, setEditing] = useState<Timesheet | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Tick the live timer every second while clocked on.
  useEffect(() => {
    if (!activeClock) return
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [activeClock])

  const sortedTimesheets = useMemo(
    () =>
      myTimesheets
        .filter((timesheet) => !timesheet.clockActive)
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [myTimesheets],
  )

  // Shift notes the current user authored (or for shifts assigned to them).
  const myNoteShifts = useMemo(() => {
    const name = currentUserName.trim().toLowerCase()
    return shifts
      .filter((shift) => {
        const note = shift.progressNote
        if (!note) return false
        const byStaff = Boolean(currentStaffId) && (note.authorStaffId === currentStaffId || shift.staffId === currentStaffId)
        const byName = Boolean(name) && note.authorName.trim().toLowerCase() === name
        return byStaff || byName
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [shifts, currentStaffId, currentUserName])

  const elapsedMs = activeClock?.clockedInAt ? now - new Date(activeClock.clockedInAt).getTime() : 0

  const handleAdd = () => {
    setEditing(null)
    setIsPanelOpen(true)
  }

  const handleOpen = (timesheet: Timesheet) => {
    setEditing(timesheet)
    setIsPanelOpen(true)
  }

  const handleClose = () => {
    setIsPanelOpen(false)
    setEditing(null)
  }

  if (isLoading) return <PageLoader label="Loading your work…" />
  if (fetchError && myTimesheets.length === 0) return <PageError message={fetchError} onRetry={refetch} />

  const tabs: Array<{ key: WorkTab; label: string; badge: number }> = [
    { key: "timesheets", label: "Timesheets", badge: sortedTimesheets.length },
    { key: "notes", label: "Shift notes", badge: myNoteShifts.length },
  ]

  return (
    <div className="flex h-full">
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <PageTitleBar title="My work" />
        <PageToolbarBar>
          <button
            type="button"
            onClick={handleAdd}
            className={folkAddBtnClass("flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors")}
            tabIndex={0}
            aria-label="Add timesheet"
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Timesheet</span>
          </button>
        </PageToolbarBar>

        {activeClock && (
          <div className="flex shrink-0 items-center gap-[10px] border-b border-folk-border-subtle bg-[#f0fdf4] px-[16px] py-[10px]">
            <span className="relative flex h-[8px] w-[8px]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16a34a] opacity-75" />
              <span className="relative inline-flex h-[8px] w-[8px] rounded-full bg-[#16a34a]" />
            </span>
            <span className="text-[13px] font-medium text-[#166534]">Clocked on since {activeClock.startTime}</span>
            <span className="font-mono text-[13px] font-semibold tabular-nums text-[#166534]">{formatClockElapsed(elapsedMs)}</span>
          </div>
        )}

        <div className={profilePageTabRowClass()}>
          <div className={profilePageTabBarClass()}>
            <div className={profileMainTabScrollClass()}>
              {tabs.map((tab) => (
                <ProfileTabButton
                  key={tab.key}
                  isActive={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  label={tab.label}
                  badge={tab.badge}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden bg-folk-surface">
          {activeTab === "timesheets" ? (
            <ProfileTimesheetsTab
              timesheets={sortedTimesheets}
              onOpenTimesheet={handleOpen}
              emptyDescription="Log your worked hours, travel claims and notes, then submit them for approval."
            />
          ) : (
            <ProfileShiftNotesTab
              shifts={myNoteShifts}
              variant="staff"
              emptyDescription="Progress notes you record on your shifts will appear here."
            />
          )}
        </div>
      </div>

      <TimesheetFormPanel isOpen={isPanelOpen} timesheet={editing} onClose={handleClose} />
    </div>
  )
}
