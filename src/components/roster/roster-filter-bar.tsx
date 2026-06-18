"use client"

import { useRef } from "react"
import {
  Building2,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
} from "lucide-react"
import { ASSIGNEE_VIEW_LABELS, type RosterAssigneeView, type RosterViewMode } from "@/lib/roster/types"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { DisplayPopoverPanel, DisplayPopoverTrigger } from "@/components/display-popover"
import { cn } from "@/lib/utils"

const dropdownBackdropClass = "fixed inset-0 z-[199]"
const dropdownPanelClass =
  "fixed z-[200] rounded-none border border-folk-border bg-folk-surface shadow-folk"

const VIEW_MODE_OPTIONS = [
  { key: "week" as const, label: "Week", Icon: CalendarRange },
  { key: "day" as const, label: "Day", Icon: CalendarDays },
]

const viewModeCardClass = (isActive: boolean) =>
  cn(
    "flex flex-1 flex-col items-center justify-center gap-[6px] rounded-none border py-[14px] transition-colors",
    isActive
      ? "border-[#d0d0d0] bg-folk-surface text-folk-text shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      : "border-transparent bg-folk-page text-folk-secondary hover:bg-[var(--folk-border-subtle)]"
  )

const weekNavButtonClass =
  "flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full border border-folk-border bg-folk-surface text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"

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
  const previousLabel = isDayView ? "Previous day" : "Previous week"
  const nextLabel = isDayView ? "Next day" : "Next week"

  return (
    <div className="relative z-50 flex h-[44px] shrink-0 items-center justify-between gap-[8px] border-b border-folk-border-subtle bg-folk-nav px-[16px]">
      <div className="flex min-w-0 flex-1 items-center gap-[8px] overflow-x-auto">
        <span className="shrink-0 text-[13px] font-medium text-folk-text">Roster</span>
      </div>

      <div
        className={cn(
          "pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex",
          "z-[1]"
        )}
      >
        <div
          className={cn(
            "pointer-events-auto grid items-center gap-x-[4px]",
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
      </div>

      <div className="relative z-[2] flex shrink-0 items-center gap-[8px]">
        <div className="hidden items-center gap-[8px] sm:flex">
          <button
            type="button"
            onClick={onToday}
            disabled={isTodayActive}
            className={cn(
              "outline-btn px-[8px] py-[4px] text-[13px] font-medium transition-colors",
              isTodayActive && "cursor-default border-[#e8e8e8] text-[#ccc] hover:bg-folk-surface"
            )}
            tabIndex={0}
          >
            Today
          </button>
        </div>
        <button
          type="button"
          onClick={onCreateShift}
          className="outline-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
          tabIndex={0}
          aria-label="Add shift"
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span className="hidden sm:inline">Add shift</span>
        </button>
      </div>
    </div>
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
    <div className="flex shrink-0 items-center gap-[2px]" role="group" aria-label="Roster view">
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

function RosterVacantToggle({
  isOpen,
  vacantCount,
  onToggle,
}: {
  isOpen: boolean
  vacantCount: number
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isOpen}
      aria-label={isOpen ? "Hide vacant shifts row" : "Show vacant shifts row"}
      className={cn(
        "inline-flex h-[28px] shrink-0 items-center gap-[5px] rounded-folk-btn border px-[10px] text-[12px] font-medium leading-none text-folk-text",
        "transition-[border-color,background-color,box-shadow] duration-fast ease-in-out",
        isOpen
          ? "border-folk-border-strong bg-folk-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          : "border-transparent bg-transparent hover:border-folk-border hover:bg-folk-hover"
      )}
      tabIndex={0}
    >
      <span>Vacant shifts</span>
      {vacantCount > 0 && (
        <span
          className={cn(
            "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border px-[5px] text-[10px] font-normal tabular-nums text-folk-text",
            "transition-[border-color] duration-fast ease-in-out",
            isOpen ? "border-folk-text" : "border-folk-border-strong"
          )}
        >
          {vacantCount}
        </span>
      )}
      <ChevronDown
        className={cn(
          "h-[13px] w-[13px] shrink-0 text-folk-text transition-transform duration-fast ease-in-out",
          !isOpen && "-rotate-90"
        )}
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </button>
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
}: RosterFilterBarProps) {
  const displayBtnRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <div className="relative z-40 flex h-[41px] shrink-0 items-center gap-[8px] overflow-x-auto border-b border-folk-border-subtle bg-folk-nav px-[16px]">
        <div className="flex shrink-0 items-center gap-[6px]">
          <RosterAssigneeSwitch value={assigneeView} onChange={onAssigneeViewChange} />
          <span className="h-[16px] w-px shrink-0 bg-folk-border-subtle" aria-hidden="true" />
          <RosterVacantToggle
            isOpen={isVacantRowOpen}
            vacantCount={vacantShiftCount}
            onToggle={onToggleVacantRow}
          />
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
            </DisplayPopoverPanel>
          </div>
        </div>
      </div>
    </>
  )
}
