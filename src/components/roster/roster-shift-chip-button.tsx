"use client"

import type { Ref } from "react"
import { EntityIcon } from "@/components/entity-icon"
import { useRosterSettings } from "@/lib/hooks/use-roster-settings"
import { FOLK_CHIP_BASE, FOLK_CHIP_SIZES } from "@/lib/chip-colors"
import {
  cancelledShiftChipClasses,
  cancelledShiftSurfaceClasses,
  cancelledShiftTextClasses,
  getShiftCancelledByLabel,
  getShiftSessionTypeChipClasses,
  getShiftSessionTypeLabel,
  getShiftSessionTypeSurfaceClasses,
  isShiftCancelled,
} from "@/lib/roster/shift-utils"
import { formatShiftTime, parseDateStr } from "@/lib/roster/week-utils"
import type { RosterShift } from "@/lib/roster/types"
import { cn } from "@/lib/utils"

interface RosterShiftChipButtonProps {
  shift: RosterShift
  onClick?: () => void
  disabled?: boolean
  ariaExpanded?: boolean
  buttonRef?: Ref<HTMLButtonElement>
  /** Roster columns carry the date; standalone chips can show it inline. */
  showDate?: boolean
  /** Show the assigned staff member instead of the participant. */
  showStaffName?: boolean
  className?: string
}

/**
 * A linked shift rendered exactly like a shift card in the roster — session
 * tinted surface, time, assignee and session chip — as a button, so form
 * fields that reference a shift look like the roster they came from.
 */
export function RosterShiftChipButton({
  shift,
  onClick,
  disabled = false,
  ariaExpanded,
  buttonRef,
  showDate = false,
  showStaffName = false,
  className,
}: RosterShiftChipButtonProps) {
  const { settings } = useRosterSettings()
  const cancelled = isShiftCancelled(shift)
  const assigneeName = showStaffName ? shift.staffName : shift.clientName
  const assigneeIcon = showStaffName ? shift.staffIconText : shift.clientIconText
  const timeLabel = formatShiftTime(shift.startTime, shift.endTime)
  const dateLabel = showDate
    ? parseDateStr(shift.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
    : null

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full overflow-hidden rounded-[6px] border text-left outline-none transition-[filter] duration-150",
        cancelled
          ? cancelledShiftSurfaceClasses
          : cn("border-solid", getShiftSessionTypeSurfaceClasses(shift.sessionType, settings.sessionTypes)),
        disabled
          ? "cursor-not-allowed opacity-70"
          : "cursor-pointer hover:brightness-[0.96] focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]",
        className,
      )}
      tabIndex={0}
      aria-expanded={ariaExpanded}
      aria-label={`Linked shift: ${assigneeName || "Unassigned"}, ${dateLabel ? `${dateLabel}, ` : ""}${timeLabel}`}
    >
      <span className="flex flex-col gap-[8px] px-[10px] py-[8px]">
        <span className={cn("truncate text-[13px] font-semibold", cancelled ? cancelledShiftTextClasses : "text-folk-text")}>
          {dateLabel ? `${dateLabel} · ${timeLabel}` : timeLabel}
        </span>
        <span className="flex min-w-0 items-center gap-[6px]">
          <EntityIcon text={assigneeIcon} size="sm" />
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13px] font-medium",
              cancelled ? cancelledShiftTextClasses : "text-folk-text",
            )}
          >
            {assigneeName || "Unassigned"}
          </span>
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-[4px]">
          {cancelled ? (
            <span className={cn(FOLK_CHIP_BASE, FOLK_CHIP_SIZES.sm, cancelledShiftChipClasses)}>
              {shift.cancelledBy ? getShiftCancelledByLabel(shift.cancelledBy) : "Cancelled"}
            </span>
          ) : (
            <span className={getShiftSessionTypeChipClasses(shift.sessionType, settings.sessionTypes, "sm")}>
              {getShiftSessionTypeLabel(shift.sessionType)}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
