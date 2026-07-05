"use client"

import { useRef } from "react"
import {
  Building2,
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Table2,
  Users,
} from "lucide-react"
import { ASSIGNEE_VIEW_LABELS, type RosterAssigneeView, type RosterViewMode } from "@/lib/roster/types"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { PageTitleBar } from "@/components/page-title-bar"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { Switch } from "@/components/switch"
import { DisplayPopoverPanel, DisplayPopoverTrigger } from "@/components/display-popover"
import { folkPrimaryAddBtnClass } from "@/lib/folk-ui"
import { cn } from "@/lib/utils"

const dropdownBackdropClass = "fixed inset-0 z-[199]"
const dropdownPanelClass =
  "fixed z-[200] rounded-[6px] border border-folk-border bg-folk-surface shadow-folk"

const VIEW_MODE_OPTIONS = [
  { key: "week" as const, label: "Week", Icon: CalendarRange },
  { key: "day" as const, label: "Day", Icon: CalendarDays },
  { key: "table" as const, label: "Table", Icon: Table2 },
  { key: "year" as const, label: "Year", Icon: Calendar },
]

const viewModeCardClass = (isActive: boolean) =>
  cn(
    "flex flex-1 flex-col items-center justify-center gap-[6px] rounded-[6px] border py-[14px] transition-colors",
    isActive
      ? "border-[#bababa] bg-folk-surface text-folk-text shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      : "border-transparent bg-folk-page text-folk-secondary hover:bg-[var(--folk-border-subtle)]"
  )

const weekNavButtonClass = "icon-btn folk-pill-btn"

interface RosterPageHeaderProps {
  toolbarLabel: string
  viewMode: RosterViewMode
  isTodayActive: boolean
  onToday: () => void
  onPrevious: () => void
  onNext: () => void
  onCreateShift: () => void
}

export function RosterPageHeader({
  toolbarLabel,
  viewMode,
  isTodayActive,
  onToday,
  onPrevious,
  onNext,
  onCreateShift,
}: RosterPageHeaderProps) {
  const isDayView = viewMode === "day"
  const previousLabel =
    viewMode === "year" ? "Previous year" : isDayView ? "Previous day" : "Previous week"
  const nextLabel = viewMode === "year" ? "Next year" : isDayView ? "Next day" : "Next week"

  return (
    <>
      <PageTitleBar
        title="Roster"
        trailing={
          <button
            type="button"
            onClick={onCreateShift}
            className={folkPrimaryAddBtnClass()}
            tabIndex={0}
            aria-label="Add shift"
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Add shift</span>
          </button>
        }
      />
      {/* Toolbar */}
      <div className="relative z-50 flex h-[44px] shrink-0 items-center justify-end gap-[8px] border-b border-folk-border-subtle bg-white px-[16px]">
        <div className="relative z-[2] flex shrink-0 items-center gap-[8px]">
        <div
          className={cn(
            "hidden items-center gap-x-[4px] sm:grid",
            isDayView ? "grid-cols-[28px_26ch_28px]" : "grid-cols-[28px_22ch_28px]"
          )}
        >
          <button
            type="button"
            onClick={onPrevious}
            className={weekNavButtonClass}
            aria-label={previousLabel}
            tabIndex={0}
          >
            <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={1.75} />
          </button>
          <span
            className="min-w-0 truncate text-center text-[13px] font-semibold text-folk-text"
            title={toolbarLabel}
          >
            {toolbarLabel}
          </span>
          <button
            type="button"
            onClick={onNext}
            className={weekNavButtonClass}
            aria-label={nextLabel}
            tabIndex={0}
          >
            <ChevronRight className="h-[14px] w-[14px]" strokeWidth={1.75} />
          </button>
        </div>
        <button
          type="button"
          onClick={onToday}
          disabled={isTodayActive}
          className={cn(
            "hidden outline-btn folk-pill-btn px-[8px] py-[4px] text-[13px] font-medium transition-colors sm:inline-flex",
            isTodayActive && "cursor-default border-[#d9d9d9] text-[#ccc] hover:bg-folk-surface"
          )}
          tabIndex={0}
        >
          Today
        </button>
        </div>
      </div>
    </>
  )
}

const ASSIGNEE_VIEW_OPTIONS = [
  { key: "employees" as const, label: ASSIGNEE_VIEW_LABELS.employees, Icon: Users },
  { key: "clients" as const, label: ASSIGNEE_VIEW_LABELS.clients, Icon: Building2 },
]

function RosterAssigneeSwitch({
  value,
  onChange,
}: {
  value: RosterAssigneeView
  onChange: (view: RosterAssigneeView) => void
}) {
  return (
    <div className="folk-tab-bar flex shrink-0 items-stretch self-stretch" role="group" aria-label="Roster view">
      {ASSIGNEE_VIEW_OPTIONS.map(({ key, label, Icon }) => (
        <ProfileTabButton
          key={key}
          variant="toolbar"
          isActive={value === key}
          onClick={() => onChange(key)}
          icon={Icon}
          label={label}
        />
      ))}
    </div>
  )
}

interface RosterFilterBarProps {
  viewMode: RosterViewMode
  assigneeView: RosterAssigneeView
  searchQuery: string
  isDisplayOpen: boolean
  isVacantRowOpen: boolean
  vacantShiftCount: number
  onSearchQueryChange: (value: string) => void
  onViewModeChange: (mode: RosterViewMode) => void
  onAssigneeViewChange: (view: RosterAssigneeView) => void
  onDisplayOpenChange: (open: boolean) => void
  onToggleVacantRow: () => void
  onOpenClockLog?: () => void
}

export function RosterFilterBar({
  viewMode,
  assigneeView,
  searchQuery,
  isDisplayOpen,
  isVacantRowOpen,
  vacantShiftCount,
  onSearchQueryChange,
  onViewModeChange,
  onAssigneeViewChange,
  onDisplayOpenChange,
  onToggleVacantRow,
  onOpenClockLog,
}: RosterFilterBarProps) {
  const displayBtnRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <div className="relative z-40 flex h-[41px] shrink-0 items-center gap-[8px] overflow-x-auto border-b border-folk-border-subtle bg-white px-[16px]">
        <div className="flex shrink-0 items-center gap-[6px]">
          <RosterAssigneeSwitch value={assigneeView} onChange={onAssigneeViewChange} />
          {onOpenClockLog && (
            <>
              <span className="h-[16px] w-px shrink-0 bg-folk-border-subtle" aria-hidden="true" />
              <button
                type="button"
                onClick={onOpenClockLog}
                className="folk-pill-btn inline-flex h-[28px] shrink-0 items-center gap-[5px] border border-transparent px-[10px] text-[12px] font-medium leading-none text-folk-text transition-[border-color,background-color,box-shadow] duration-fast ease-in-out hover:border-folk-border hover:bg-folk-hover"
                tabIndex={0}
                aria-label="Open clock log"
              >
                <Clock className="h-[13px] w-[13px] shrink-0" strokeWidth={1.75} />
                <span>Clock log</span>
              </button>
            </>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-[8px]">
          <ExpandableTableSearch
            value={searchQuery}
            onChange={onSearchQueryChange}
            placeholder={`Search ${ASSIGNEE_VIEW_LABELS[assigneeView].toLowerCase()}…`}
            ariaLabel={`Search ${ASSIGNEE_VIEW_LABELS[assigneeView].toLowerCase()}`}
          />

          <div className="relative">
            <DisplayPopoverTrigger
              hiddenCount={0}
              showLabel
              isOpen={isDisplayOpen}
              onClick={() => onDisplayOpenChange(!isDisplayOpen)}
              buttonRef={displayBtnRef}
            />
            <DisplayPopoverPanel
              isOpen={isDisplayOpen}
              onClose={() => onDisplayOpenChange(false)}
              buttonRef={displayBtnRef}
              widthClassName="w-[280px]"
            >
              <div className="flex gap-[8px] px-[12px] py-[12px]">
                {VIEW_MODE_OPTIONS.map(({ key, label, Icon }) => {
                  const isActive = viewMode === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onViewModeChange(key)}
                      className={viewModeCardClass(isActive)}
                      tabIndex={0}
                      aria-label={`${label} view`}
                      aria-pressed={isActive}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                      <span className="text-[12px] font-medium">{label}</span>
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center justify-between gap-[8px] border-t border-folk-border-subtle px-[12px] py-[10px]">
                <div className="flex min-w-0 items-center gap-[6px]">
                  <span className="text-[13px] font-normal text-folk-text">Vacant shifts</span>
                  {vacantShiftCount > 0 && (
                    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-folk-border-strong px-[5px] text-[10px] font-normal tabular-nums text-folk-secondary">
                      {vacantShiftCount}
                    </span>
                  )}
                </div>
                <Switch
                  checked={isVacantRowOpen}
                  onChange={onToggleVacantRow}
                  ariaLabel={isVacantRowOpen ? "Hide vacant shifts row" : "Show vacant shifts row"}
                />
              </div>
            </DisplayPopoverPanel>
          </div>
        </div>
      </div>
    </>
  )
}
