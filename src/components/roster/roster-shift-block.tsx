"use client"

import { useMemo } from "react"
import type { RosterShift } from "@/lib/roster/types"
import { useRosterContext } from "@/lib/roster-context"
import { useRosterSettings } from "@/lib/hooks/use-roster-settings"
import {
  getShiftIssuesForShift,
  getShiftCancelledByLabel,
  getShiftSessionTypeChipClasses,
  getShiftSessionTypeLabel,
  getShiftSessionTypeSurfaceClasses,
  cancelledShiftChipClasses,
  cancelledShiftSurfaceClasses,
  cancelledShiftTextClasses,
  isShiftCancelled,
} from "@/lib/roster/shift-utils"
import { formatShiftTime } from "@/lib/roster/week-utils"
import {
  getShiftHoverTarget,
  shouldClearShiftHover,
  useRosterShiftHover,
} from "@/components/roster/roster-shift-hover-context"
import { FOLK_CHIP_BASE, FOLK_CHIP_PALETTE, FOLK_CHIP_SIZES } from "@/lib/chip-colors"
import { EntityIcon } from "@/components/entity-icon"
import { ROSTER_UNASSIGNED_SHIFT_BORDER_CLASSES } from "@/components/roster/roster-add-shift-button"
import { cn } from "@/lib/utils"

interface RosterShiftBlockProps {
  shift: RosterShift
  /** When true, roster rows are clients — show assigned staff. Otherwise show assigned client. */
  showStaffName?: boolean
  layout?: "default" | "hour-grid"
  className?: string
  onClick?: (shift: RosterShift) => void
  isDragging?: boolean
  isOverlay?: boolean
  issueDescriptions?: string[]
}

function getShiftCommunication(shift: RosterShift): string {
  return shift.notes.trim()
}

export function RosterShiftBlock({
  shift,
  showStaffName = false,
  layout = "default",
  className,
  onClick,
  isDragging = false,
  isOverlay = false,
  issueDescriptions,
}: RosterShiftBlockProps) {
  const { shifts } = useRosterContext()
  const { settings } = useRosterSettings()
  const sessionTypes = settings.sessionTypes
  const issues = useMemo(
    () => issueDescriptions ?? getShiftIssuesForShift(shift, shifts),
    [issueDescriptions, shift, shifts]
  )
  const hasIssue = issues.length > 0
  const isUnassigned = !shift.staffId
  const assigneeName = showStaffName ? shift.staffName : shift.clientName
  const assigneeIcon = showStaffName ? shift.staffIconText : shift.clientIconText
  const timeLabel = formatShiftTime(shift.startTime, shift.endTime)
  const sessionTypeLabel = getShiftSessionTypeLabel(shift.sessionType)
  const communication = getShiftCommunication(shift)
  const ariaLabel = hasIssue
    ? `${timeLabel}, ${assigneeName}, ${sessionTypeLabel}${communication ? `, ${communication}` : ""}. ${issues.join(" ")}`
    : `${timeLabel}, ${assigneeName}, ${sessionTypeLabel}${communication ? `, ${communication}` : ""}`

  const handleClick = () => onClick?.(shift)

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onClick?.(shift)
    }
  }

  const isHourGrid = layout === "hour-grid"
  const isCancelled = isShiftCancelled(shift)
  const showIssue = hasIssue && !isCancelled
  const issueChipLabel = issues.length > 1 ? `${issues.length} conflicts` : "Conflict"
  const tagSurfaceClasses = getShiftSessionTypeSurfaceClasses(shift.sessionType, sessionTypes)
  const tagChipClasses = getShiftSessionTypeChipClasses(shift.sessionType, sessionTypes, "sm")
  const shiftHover = useRosterShiftHover()
  const isHighlighted = shiftHover?.isShiftHighlighted(shift) ?? false

  const handleMouseEnter = () => {
    if (isOverlay || !shiftHover || !onClick) return
    shiftHover.setHoverTarget(getShiftHoverTarget(shift))
  }

  const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isOverlay || !shiftHover || !onClick) return
    if (!shouldClearShiftHover(shift, event.relatedTarget)) return
    shiftHover.setHoverTarget(null)
  }

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-shift-id={shift.id}
      data-shift-string-id={shift.shiftStringId ?? undefined}
      className={cn(
        "relative overflow-hidden rounded-[6px] border transition-[filter] duration-150",
        isCancelled
          ? cancelledShiftSurfaceClasses
          : isUnassigned
            ? ROSTER_UNASSIGNED_SHIFT_BORDER_CLASSES
            : cn("border-solid", tagSurfaceClasses),
        showIssue && "border-l-[3px] border-l-[#e65100]",
        isHighlighted && "brightness-[0.94]",
        onClick && !isDragging && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]",
        isDragging && "cursor-grabbing",
        isDragging && "shadow-[0_8px_20px_rgba(0,0,0,0.12)]",
        isOverlay && "rotate-[1deg] scale-[1.02] shadow-[0_12px_28px_rgba(0,0,0,0.16)]",
        isHourGrid && "h-full min-h-0",
        className
      )}
      aria-label={onClick ? `Edit shift: ${ariaLabel}` : ariaLabel}
    >
      <div
        className={cn(
          "flex min-h-0 flex-col overflow-hidden",
          isHourGrid ? "h-full gap-[4px] px-[8px] py-[6px]" : "gap-[8px] px-[10px] py-[8px]"
        )}
      >
        <p
          className={cn(
            "shrink-0 truncate font-semibold",
            isCancelled ? cancelledShiftTextClasses : "text-folk-text",
            isHourGrid ? "text-[12px] leading-tight" : "text-[13px]"
          )}
        >
          {timeLabel}
        </p>

        <div className="flex min-w-0 shrink-0 items-center gap-[6px]">
          <EntityIcon text={assigneeIcon} size="sm" />
          <p
            className={cn(
              "min-w-0 flex-1 truncate font-medium",
              isCancelled ? cancelledShiftTextClasses : "text-folk-text",
              isHourGrid ? "text-[12px] leading-tight" : "text-[13px]"
            )}
          >
            {assigneeName || "Unassigned"}
          </p>
        </div>

        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-[4px]">
          {isCancelled ? (
            <span className={cn(FOLK_CHIP_BASE, FOLK_CHIP_SIZES.sm, cancelledShiftChipClasses)}>
              {shift.cancelledBy ? getShiftCancelledByLabel(shift.cancelledBy) : "Cancelled"}
            </span>
          ) : (
            <span className={tagChipClasses}>
              {sessionTypeLabel}
            </span>
          )}

          {showIssue && (
            <span
              className={cn(FOLK_CHIP_BASE, FOLK_CHIP_SIZES.sm, FOLK_CHIP_PALETTE.orange)}
              title={issues.join(" ")}
            >
              {isHourGrid ? "Conflict" : issueChipLabel}
            </span>
          )}
        </div>

        {showIssue && !isHourGrid && (
          <p className="min-h-0 truncate text-[11px] leading-snug text-folk-secondary" title={issues.join(" ")}>
            {issues[0]}
          </p>
        )}

        {communication && !isCancelled && (
          <p
            className={cn(
              "min-h-0 text-folk-secondary",
              isHourGrid
                ? "truncate text-[11px] leading-tight"
                : "line-clamp-3 text-[12px] leading-snug"
            )}
          >
            {communication}
          </p>
        )}

        {isCancelled && shift.cancellationReason && (
          <p
            className={cn(
              "min-h-0 text-folk-secondary",
              isHourGrid
                ? "truncate text-[11px] leading-tight"
                : "line-clamp-2 text-[12px] leading-snug"
            )}
            title={shift.cancellationReason}
          >
            {shift.cancellationReason}
          </p>
        )}
      </div>
    </div>
  )
}
