"use client"

import type { ComponentType, KeyboardEvent, ReactNode } from "react"
import { Briefcase, CircleChevronDown, Clock, MessageSquare } from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"
import { WorkspaceCardPill, WorkspaceCardText } from "@/components/workspace-card"
import { getShiftSessionTypeLabel } from "@/lib/roster/shift-utils"
import { formatShiftTime } from "@/lib/roster/week-utils"
import type { RosterShift } from "@/lib/roster/types"
import { cn } from "@/lib/utils"

interface ShiftWorkspaceCardProps {
  shift: RosterShift
  /** Person shown in the card header — typically the assigned worker or participant. */
  headerName: string
  headerIconText: string
  onClick?: () => void
  className?: string
}

function formatShiftDateShort(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
}

/** Folk-style shift card — assignee header, divider, icon rows for time, type, note and session plan. */
export function ShiftWorkspaceCard({ shift, headerName, headerIconText, onClick, className }: ShiftWorkspaceCardProps) {
  const hasShiftNote = Boolean(shift.progressNote)
  const hasSessionPlan = Boolean(shift.notes?.trim())
  const sessionLabel = getShiftSessionTypeLabel(shift.sessionType)
  const timeLabel = formatShiftTime(shift.startTime, shift.endTime)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-[6px] border border-[#d9d9d9] bg-white text-left transition-colors",
        onClick && "cursor-pointer hover:border-[#bababa] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a3c4f3]/50",
        className,
      )}
      aria-label={onClick ? `Open shift with ${headerName}` : undefined}
    >
      <div className="flex items-center gap-[10px] border-b border-[#d9d9d9] px-[12px] py-[10px]">
        <EntityIcon
          text={headerIconText || "?"}
          size="base"
          backgroundClassName="border border-[#d9d9d9] bg-[#fef9c3]"
        />
        <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-folk-text">
          {headerName || "Unassigned"}
        </h3>
      </div>

      <div className="flex flex-col px-[12px] py-[4px]">
        <ShiftCardRow icon={Clock}>
          <WorkspaceCardText>
            {formatShiftDateShort(shift.date)} · {timeLabel}
          </WorkspaceCardText>
        </ShiftCardRow>

        <ShiftCardRow icon={Briefcase}>
          <WorkspaceCardText>{sessionLabel}</WorkspaceCardText>
        </ShiftCardRow>

        <ShiftCardRow icon={CircleChevronDown}>
          <WorkspaceCardPill
            label={hasShiftNote ? "Shift note complete" : "Shift note incomplete"}
            tone={hasShiftNote ? "green" : "rose"}
          />
        </ShiftCardRow>

        <ShiftCardRow icon={MessageSquare} iconMuted={!hasSessionPlan}>
          <WorkspaceCardText muted={!hasSessionPlan}>
            {hasSessionPlan ? "Session plan added" : "No session plan"}
          </WorkspaceCardText>
        </ShiftCardRow>
      </div>
    </div>
  )
}

function ShiftCardRow({
  icon: Icon,
  iconMuted = false,
  children,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  iconMuted?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-h-[32px] items-center gap-[8px] py-[4px]">
      <Icon
        className={cn("h-[15px] w-[15px] shrink-0", iconMuted ? "text-[#cccccc]" : "text-[#888888]")}
        strokeWidth={1.5}
      />
      <div className="min-w-0 flex-1 truncate">{children}</div>
    </div>
  )
}
