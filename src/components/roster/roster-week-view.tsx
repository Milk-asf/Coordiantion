"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CalendarRange, Loader2 } from "lucide-react"
import { useRosterSettings } from "@/lib/hooks/use-roster-settings"
import { useWorkspace } from "@/lib/workspace-context"
import { useRosterContext } from "@/lib/roster-context"
import { ASSIGNEE_VIEW_LABELS, type RosterAssigneeView, type RosterShift, type RosterShiftInput, type RosterViewMode, type ShiftFormContext } from "@/lib/roster/types"
import {
  parseCellDropId,
  parseHourDropId,
  parseShiftDragId,
  parseVacantDropId,
  setRosterDragCursor,
  shiftTimesFromHourDrop,
} from "@/lib/roster/dnd-utils"
import {
  addWeeks,
  DAY_VIEW_HOUR_WIDTH,
  formatCompactHourLabel,
  formatWeekRange,
  getDayLabel,
  getDayViewHours,
  getShiftHourGridStyle,
  getWeekDays,
  isSameDay,
  startOfWeek,
  toDateStr,
} from "@/lib/roster/week-utils"
import {
  getUnassignedShifts,
  isShiftUnassigned,
  loadVacantRowOpen,
  saveVacantRowOpen,
} from "@/lib/roster/vacant-shift-utils"
import { RosterAddShiftButton } from "@/components/roster/roster-add-shift-button"
import { RosterCellShiftItem } from "@/components/roster/roster-cell-shift-item"
import { RosterDayHourRow } from "@/components/roster/roster-day-hour-row"
import { RosterDropCell } from "@/components/roster/roster-drop-cell"
import { RosterFilterBar, RosterPageHeader } from "@/components/roster/roster-filter-bar"
import { RosterShiftBlock } from "@/components/roster/roster-shift-block"
import { RosterTableView } from "@/components/roster/roster-table-view"
import { RosterVacantShiftsRow } from "@/components/roster/roster-vacant-shifts-row"
import {
  rosterStickyColClass,
  rosterStickyCornerClass,
  rosterStickyTopClass,
  ROSTER_GRID_CELL,
} from "@/components/roster/roster-grid-styles"
import { EmptyState } from "@/components/empty-state"
import { useToast } from "@/components/toast"
import { cn } from "@/lib/utils"
import { FOLK_CHIP_BASE, FOLK_CHIP_PALETTE } from "@/lib/chip-colors"
import { groupShiftsForCell } from "@/lib/roster/shift-string-utils"

const ASSIGNEE_COL_BASELINE_PX = 200
const ASSIGNEE_COL_PX = 96
const DAY_COL_BASE_PX = 148
const ASSIGNEE_COL_SAVINGS_PX = ASSIGNEE_COL_BASELINE_PX - ASSIGNEE_COL_PX

function getDayColumnWidth(dayCount: number): number {
  if (dayCount <= 0) return DAY_COL_BASE_PX
  return DAY_COL_BASE_PX + Math.floor(ASSIGNEE_COL_SAVINGS_PX / dayCount)
}
const ROW_HEIGHT = "min-h-[96px]"
const CALENDAR_HEADER_HEIGHT = "h-[44px]"
const GRID_CELL = ROSTER_GRID_CELL

interface RosterRow {
  id: string
  name: string
  iconText: string
  hours: number
}

function getGridTemplateColumns(isDayView: boolean, dayCount: number): string {
  if (isDayView) {
    return `${ASSIGNEE_COL_PX}px repeat(${getDayViewHours().length}, minmax(${DAY_VIEW_HOUR_WIDTH}px, 1fr))`
  }

  const dayColPx = getDayColumnWidth(dayCount)
  return `${ASSIGNEE_COL_PX}px repeat(${dayCount}, minmax(${dayColPx}px, 1fr))`
}

function getGridMinWidth(isDayView: boolean, dayCount: number): number {
  if (isDayView) {
    return ASSIGNEE_COL_PX + getDayViewHours().length * DAY_VIEW_HOUR_WIDTH
  }

  return ASSIGNEE_COL_PX + dayCount * getDayColumnWidth(dayCount)
}

const DAY_VIEW_ROW_CLASS = "h-[96px] overflow-hidden"

function AssigneeSidebarCell({ row, className }: { row: RosterRow; className?: string }) {
  return (
    <div
      className={cn(
        rosterStickyColClass("flex items-center py-[10px] pl-[10px] pr-[6px]"),
        GRID_CELL,
        ROW_HEIGHT,
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold leading-tight text-folk-text">{row.name}</p>
        <p className="mt-[2px] text-[10px] font-medium text-folk-secondary">{row.hours.toFixed(1)} hrs</p>
      </div>
    </div>
  )
}

interface RosterCalendarProps {
  onCreateShift: (defaults?: ShiftFormContext) => void
  onEditShift: (shift: RosterShift) => void
  pendingShiftPreview?: ShiftFormContext | null
  onOpenClockLog?: (period: { start: string; end: string }) => void
}

function RosterDayTitle({ day, isToday = false }: { day: Date; isToday?: boolean }) {
  return (
    <span
      className={cn(
        FOLK_CHIP_BASE,
        "h-[24px] px-[10px] text-[12px] font-medium",
        isToday
          ? FOLK_CHIP_PALETTE.blue
          : "border border-folk-border bg-white text-folk-text"
      )}
    >
      {getDayLabel(day)} {day.getDate()}
    </span>
  )
}

function RosterDayHeader({ day, isToday = false }: { day: Date; isToday?: boolean }) {
  return (
    <div className="flex w-full items-center px-[8px]">
      <RosterDayTitle day={day} isToday={isToday} />
    </div>
  )
}

export function RosterCalendar({ onCreateShift, onEditShift, pendingShiftPreview, onOpenClockLog }: RosterCalendarProps) {
  const { toast } = useToast()
  const { activeWorkspace } = useWorkspace()
  const {
    shifts,
    activeStaff,
    activeClients,
    getShiftsForWeek,
    getStaffHoursForWeek,
    getClientHoursForWeek,
    updateShift,
    isLoading,
    fetchError,
  } = useRosterContext()
  const { settings: rosterSettings } = useRosterSettings()

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), rosterSettings.weekStartsOn))
  const [focusDate, setFocusDate] = useState(() => new Date())
  const [viewMode, setViewMode] = useState<RosterViewMode>(rosterSettings.defaultViewMode)
  const [assigneeView, setAssigneeView] = useState<RosterAssigneeView>(rosterSettings.defaultAssigneeView)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const [isVacantRowOpen, setIsVacantRowOpen] = useState(true)
  const [activeShift, setActiveShift] = useState<RosterShift | null>(null)
  const suppressClickRef = useRef(false)
  const bodyScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsVacantRowOpen(loadVacantRowOpen(activeWorkspace?.id))
  }, [activeWorkspace?.id])

  const handleToggleVacantRow = useCallback(() => {
    setIsVacantRowOpen((current) => {
      const next = !current
      saveVacantRowOpen(activeWorkspace?.id, next)
      return next
    })
  }, [activeWorkspace?.id])

  const openVacantRow = useCallback(() => {
    setIsVacantRowOpen(true)
    saveVacantRowOpen(activeWorkspace?.id, true)
  }, [activeWorkspace?.id])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const today = useMemo(() => new Date(), [])
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const visibleDays = useMemo(() => {
    if (viewMode === "day") return [focusDate]
    return weekDays
  }, [focusDate, viewMode, weekDays])

  const weekShifts = useMemo(() => getShiftsForWeek(weekStart), [getShiftsForWeek, weekStart])
  const vacantShifts = useMemo(() => getUnassignedShifts(weekShifts), [weekShifts])
  const visibleDayDates = useMemo(() => visibleDays.map((day) => toDateStr(day)), [visibleDays])

  const employeeRows = useMemo<RosterRow[]>(
    () =>
      activeStaff.map((member) => ({
        id: member.id,
        name: member.name,
        iconText: member.iconText,
        hours: getStaffHoursForWeek(weekStart, member.id),
      })),
    [activeStaff, getStaffHoursForWeek, weekStart]
  )

  const clientRows = useMemo<RosterRow[]>(
    () =>
      activeClients.map((client) => ({
        id: client.id,
        name: client.displayName,
        iconText: client.iconText,
        hours: getClientHoursForWeek(weekStart, client.id),
      })),
    [activeClients, getClientHoursForWeek, weekStart]
  )

  const rows = assigneeView === "employees" ? employeeRows : clientRows
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredRows = normalizedQuery
    ? rows.filter((row) => row.name.toLowerCase().includes(normalizedQuery))
    : rows

  const isDayView = viewMode === "day"
  const gridTemplateColumns = getGridTemplateColumns(isDayView, visibleDays.length)
  const gridMinWidth = getGridMinWidth(isDayView, visibleDays.length)
  const vacantRowHeight = isDayView ? "96px" : "minmax(96px, auto)"
  const bodyGridRows = filteredRows.length === 0
    ? "auto minmax(96px, 1fr)"
    : `repeat(${filteredRows.length}, auto) minmax(96px, 1fr)`
  const gridTemplateRows = isVacantRowOpen
    ? `44px ${vacantRowHeight} ${bodyGridRows}`
    : `44px ${bodyGridRows}`

  const toolbarLabel = viewMode === "day"
    ? focusDate.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : formatWeekRange(weekStart)

  const isTodayActive = viewMode === "day"
    ? isSameDay(focusDate, today)
    : isSameDay(weekStart, startOfWeek(today, rosterSettings.weekStartsOn))

  const handleViewModeChange = (mode: RosterViewMode) => {
    setViewMode(mode)
    if (mode === "day") setFocusDate(weekStart)
  }

  const getShiftsForCell = (rowId: string, dateStr: string): RosterShift[] =>
    weekShifts.filter((shift) => {
      if (isShiftUnassigned(shift)) return false
      if (shift.date !== dateStr) return false
      return assigneeView === "employees" ? shift.staffId === rowId : shift.clientId === rowId
    })

  const buildCellDefaults = (rowId: string, dateStr: string): ShiftFormContext => ({
    date: dateStr,
    ...(assigneeView === "employees" ? { staffId: rowId } : { clientId: rowId }),
  })

  const getPendingPreviewForCell = (rowId: string, dateStr: string): ShiftFormContext | null => {
    if (!pendingShiftPreview?.startTime || !pendingShiftPreview.endTime) return null
    if (pendingShiftPreview.date !== dateStr) return null
    if (assigneeView === "employees") {
      return pendingShiftPreview.staffId === rowId ? pendingShiftPreview : null
    }
    return pendingShiftPreview.clientId === rowId ? pendingShiftPreview : null
  }

  const applyShiftUpdate = useCallback(async (
    shift: RosterShift,
    updates: Partial<RosterShiftInput>
  ) => {
    const success = await updateShift(shift.id, updates)
    if (!success) {
      toast("Unable to update shift", "error")
      return false
    }

    return true
  }, [toast, updateShift])

  const handleShiftClick = useCallback((shift: RosterShift) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onEditShift(shift)
  }, [onEditShift])

  const handleTimeChange = useCallback(async (
    shift: RosterShift,
    startTime: string,
    endTime: string
  ) => {
    if (shift.startTime === startTime && shift.endTime === endTime) return
    const success = await applyShiftUpdate(shift, { startTime, endTime })
    if (success) toast("Shift updated", "success")
  }, [applyShiftUpdate, toast])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const shift = event.active.data.current?.shift as RosterShift | undefined
    if (shift) {
      setActiveShift(shift)
      setRosterDragCursor(true)
    }
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveShift(null)
    setRosterDragCursor(false)

    if (!over) return

    const shiftId = parseShiftDragId(String(active.id))
    if (!shiftId) return

    const shift = shifts.find((entry) => entry.id === shiftId)
    if (!shift || shift.status === "cancelled") return

    const wasUnassigned = isShiftUnassigned(shift)
    suppressClickRef.current = true

    const vacantTarget = parseVacantDropId(String(over.id))
    if (vacantTarget) {
      if (wasUnassigned && shift.date === vacantTarget.dateStr) return

      const updates: Partial<RosterShiftInput> = {
        date: vacantTarget.dateStr,
        staffId: "",
      }

      const success = await applyShiftUpdate(shift, updates)
      if (success) {
        openVacantRow()
        toast(wasUnassigned ? "Shift moved" : "Shift unassigned", "success")
      }
      return
    }

    const cellTarget = parseCellDropId(String(over.id))
    if (cellTarget) {
      const updates: Partial<RosterShiftInput> = { date: cellTarget.dateStr }
      if (assigneeView === "employees") updates.staffId = cellTarget.rowId
      else updates.clientId = cellTarget.rowId

      const unchanged =
        shift.date === updates.date &&
        (assigneeView === "employees"
          ? shift.staffId === updates.staffId
          : shift.clientId === updates.clientId)

      if (unchanged) return

      const success = await applyShiftUpdate(shift, updates)
      if (success) {
        const staffAssigned = wasUnassigned && assigneeView === "employees" && Boolean(updates.staffId)
        toast(staffAssigned ? "Shift assigned" : "Shift moved", "success")
      }
      return
    }

    const hourTarget = parseHourDropId(String(over.id))
    if (hourTarget) {
      const timeUpdates = shiftTimesFromHourDrop(shift.startTime, shift.endTime, hourTarget.hour)
      const updates: Partial<RosterShiftInput> = {
        date: hourTarget.dateStr,
        ...timeUpdates,
        ...(assigneeView === "employees"
          ? { staffId: hourTarget.rowId }
          : { clientId: hourTarget.rowId }),
      }

      const unchanged =
        shift.date === updates.date &&
        shift.startTime === updates.startTime &&
        shift.endTime === updates.endTime &&
        (assigneeView === "employees"
          ? shift.staffId === updates.staffId
          : shift.clientId === updates.clientId)

      if (unchanged) return

      const success = await applyShiftUpdate(shift, updates)
      if (success) {
        const staffAssigned = wasUnassigned && assigneeView === "employees" && Boolean(updates.staffId)
        toast(staffAssigned ? "Shift assigned" : "Shift moved", "success")
      }
    }
  }, [applyShiftUpdate, assigneeView, openVacantRow, shifts, toast])

  const handleDragCancel = useCallback(() => {
    setActiveShift(null)
    setRosterDragCursor(false)
  }, [])

  const handleToday = () => {
    const now = new Date()
    setFocusDate(now)
    setWeekStart(startOfWeek(now, rosterSettings.weekStartsOn))
  }

  const handlePrevious = () => {
    if (viewMode === "day") {
      const next = new Date(focusDate)
      next.setDate(next.getDate() - 1)
      setFocusDate(next)
      setWeekStart(startOfWeek(next, rosterSettings.weekStartsOn))
      return
    }
    setWeekStart((current) => addWeeks(current, -1))
  }

  const handleNext = () => {
    if (viewMode === "day") {
      const next = new Date(focusDate)
      next.setDate(next.getDate() + 1)
      setFocusDate(next)
      setWeekStart(startOfWeek(next, rosterSettings.weekStartsOn))
      return
    }
    setWeekStart((current) => addWeeks(current, 1))
  }

  const rosterChrome = (
    <>
      <RosterPageHeader
        toolbarLabel={toolbarLabel}
        viewMode={viewMode}
        isTodayActive={isTodayActive}
        onToday={handleToday}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onCreateShift={() => onCreateShift({ date: toDateStr(viewMode === "day" ? focusDate : today) })}
      />
      <RosterFilterBar
        viewMode={viewMode}
        assigneeView={assigneeView}
        searchQuery={searchQuery}
        isDisplayOpen={isDisplayOpen}
        isVacantRowOpen={isVacantRowOpen}
        vacantShiftCount={vacantShifts.length}
        onSearchQueryChange={setSearchQuery}
        onViewModeChange={handleViewModeChange}
        onAssigneeViewChange={setAssigneeView}
        onDisplayOpenChange={setIsDisplayOpen}
        onToggleVacantRow={handleToggleVacantRow}
        onOpenClockLog={
          onOpenClockLog
            ? () =>
                onOpenClockLog({
                  start: toDateStr(visibleDays[0]),
                  end: toDateStr(visibleDays[visibleDays.length - 1]),
                })
            : undefined
        }
      />
    </>
  )

  if (isLoading) {
    return (
      <div className="flex h-full flex-col bg-white">
        {rosterChrome}
        <div className="flex flex-1 flex-col items-center justify-center gap-[10px]">
          <Loader2 className="h-[24px] w-[24px] animate-spin text-folk-secondary" strokeWidth={1.75} />
          <p className="text-[13px] text-folk-secondary">Loading roster…</p>
        </div>
      </div>
    )
  }

  if (viewMode === "table") {
    return (
      <div className="flex h-full flex-col bg-white">
        {fetchError && (
          <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-[16px] py-[8px] text-[12px] text-amber-800">
            Unable to sync roster from server. Showing local data.
          </div>
        )}
        <div className="shrink-0">{rosterChrome}</div>
        <RosterTableView shifts={weekShifts} searchQuery={searchQuery} onEditShift={onEditShift} />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-full flex-col bg-white">
        {rosterChrome}
        <EmptyState
          icon={CalendarRange}
          title={assigneeView === "employees" ? "No staff to roster" : "No clients to roster"}
          description="Add staff or clients to start building your roster."
          className="flex-1"
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {fetchError && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-[16px] py-[8px] text-[12px] text-amber-800">
          Unable to sync roster from server. Showing local data.
        </div>
      )}

      <div className="shrink-0">{rosterChrome}</div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
        <div
          ref={bodyScrollRef}
          className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]"
        >
          <div
            className="grid min-h-full w-full"
            style={{
              gridTemplateColumns,
              gridTemplateRows,
              minWidth: gridMinWidth,
            }}
          >
            <div
              className={cn(
                rosterStickyCornerClass("flex items-center py-0 pl-[10px] pr-[6px]"),
                GRID_CELL,
                CALENDAR_HEADER_HEIGHT
              )}
            >
              <span className="text-[13px] font-semibold text-folk-text">
                {ASSIGNEE_VIEW_LABELS[assigneeView]}
              </span>
            </div>

            {isDayView ? (
              getDayViewHours().map((hour) => (
                <div
                  key={`hour-header-${hour}`}
                  className={cn(
                    rosterStickyTopClass("flex items-center justify-center"),
                    GRID_CELL,
                    CALENDAR_HEADER_HEIGHT
                  )}
                >
                  <span className="text-[11px] font-medium text-folk-secondary">
                    {formatCompactHourLabel(hour)}
                  </span>
                </div>
              ))
            ) : (
              visibleDays.map((day) => {
                const isTodayHeader = isSameDay(day, today)
                return (
                  <div
                    key={`header-${toDateStr(day)}`}
                    className={cn(rosterStickyTopClass("flex items-center"), GRID_CELL, CALENDAR_HEADER_HEIGHT)}
                  >
                    <RosterDayHeader day={day} isToday={isTodayHeader} />
                  </div>
                )
              })
            )}

            {isVacantRowOpen && (
              <RosterVacantShiftsRow
                isDayView={isDayView}
                focusDateStr={toDateStr(focusDate)}
                visibleDayDates={visibleDayDates}
                vacantShifts={vacantShifts}
                onShiftClick={handleShiftClick}
                onTimeChange={handleTimeChange}
              />
            )}

            {filteredRows.length === 0 ? (
              <div
                className={cn(
                  "sticky left-0 flex items-center py-0 pl-[10px] pr-[6px] text-[12px] text-folk-secondary",
                  GRID_CELL,
                  ROW_HEIGHT
                )}
                style={{ gridColumn: "1 / -1" }}
              >
                No results found
              </div>
            ) : isDayView ? (
              filteredRows.map((row) => {
                const dateStr = toDateStr(focusDate)
                const cellShifts = getShiftsForCell(row.id, dateStr)

                return (
                  <div key={row.id} className="contents">
                    <AssigneeSidebarCell row={row} className={DAY_VIEW_ROW_CLASS} />
                    <div
                      className={cn(GRID_CELL, DAY_VIEW_ROW_CLASS)}
                      style={{ gridColumn: "2 / -1" }}
                    >
                      <RosterDayHourRow
                        rowId={row.id}
                        dateStr={dateStr}
                        shifts={cellShifts}
                        showStaffName={assigneeView === "clients"}
                        isToday={isSameDay(focusDate, today)}
                        pendingShiftPreview={getPendingPreviewForCell(row.id, dateStr)}
                        onShiftClick={handleShiftClick}
                        onCreateShift={(startTime, endTime) =>
                          onCreateShift({ ...buildCellDefaults(row.id, dateStr), startTime, endTime })
                        }
                        onTimeChange={handleTimeChange}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              filteredRows.map((row) => (
                <div key={row.id} className="contents">
                  <AssigneeSidebarCell row={row} />
                  {visibleDays.map((day) => {
                    const dateStr = toDateStr(day)
                    const cellShifts = getShiftsForCell(row.id, dateStr)

                    const cellDefaults = buildCellDefaults(row.id, dateStr)
                    const handleAddToCell = () => onCreateShift(cellDefaults)

                    return (
                      <RosterDropCell
                        key={`${row.id}-${dateStr}`}
                        rowId={row.id}
                        dateStr={dateStr}
                        onAddShift={handleAddToCell}
                        className={cn(
                          "flex flex-col gap-[6px] p-[8px]",
                          GRID_CELL,
                          ROW_HEIGHT
                        )}
                      >
                        {cellShifts.length === 0 ? (
                          <div className="flex min-h-[80px] w-full flex-1 items-stretch">
                            <RosterAddShiftButton
                              label="Add shift"
                              onClick={handleAddToCell}
                            />
                          </div>
                        ) : (
                          <>
                            {groupShiftsForCell(cellShifts, weekShifts).map((item) => (
                              <RosterCellShiftItem
                                key={item.kind === "string" ? item.stringId : item.shift.id}
                                item={item}
                                showStaffName={assigneeView === "clients"}
                                disabled={
                                  item.kind === "string"
                                    ? item.shifts.every((shift) => shift.status === "cancelled")
                                    : item.shift.status === "cancelled"
                                }
                                onClick={handleShiftClick}
                              />
                            ))}
                            <div className="sticky bottom-0 z-[1] mt-auto bg-folk-surface pt-[4px]">
                              <RosterAddShiftButton
                                compact
                                label="Add another shift"
                                onClick={handleAddToCell}
                              />
                            </div>
                          </>
                        )}
                      </RosterDropCell>
                    )
                  })}
                </div>
              ))
            )}

            <div className={cn(GRID_CELL)} style={{ gridColumn: "1 / -1" }} />
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeShift ? (
            <div
              className="cursor-grabbing"
              style={
                isDayView
                  ? { width: getShiftHourGridStyle(activeShift.startTime, activeShift.endTime).width }
                  : { width: getDayColumnWidth(visibleDays.length) }
              }
            >
              <RosterShiftBlock
                shift={activeShift}
                showStaffName={assigneeView === "clients"}
                isOverlay
                className="w-full"
              />
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
