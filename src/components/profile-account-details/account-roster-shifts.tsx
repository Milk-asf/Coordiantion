"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, Clock } from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"
import { useRoster } from "@/lib/hooks/use-roster"
import { formatShiftTime } from "@/lib/roster/week-utils"
import type { RosterShift } from "@/lib/roster/types"

interface AccountRosterShiftsProps {
  mode: "client" | "staff"
  entityId: string
  emptyMessage?: string
}

function formatShiftDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
}

function sortShifts(shifts: RosterShift[]) {
  return [...shifts].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return a.startTime.localeCompare(b.startTime)
  })
}

export function AccountRosterShifts({
  mode,
  entityId,
  emptyMessage = "No shifts assigned yet",
}: AccountRosterShiftsProps) {
  const router = useRouter()
  const { shifts } = useRoster()

  const entityShifts = useMemo(() => {
    const filtered = shifts.filter((shift) => {
      if (shift.status === "cancelled") return false
      return mode === "client" ? shift.clientId === entityId : shift.staffId === entityId
    })
    return sortShifts(filtered)
  }, [shifts, mode, entityId])

  const upcomingShifts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return entityShifts.filter((shift) => shift.date >= today)
  }, [entityShifts])

  const pastShifts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return entityShifts.filter((shift) => shift.date < today)
  }, [entityShifts])

  if (entityShifts.length === 0) {
    return (
      <div className="px-[16px] py-[20px]">
        <p className="text-[13px] font-medium text-folk-placeholder">{emptyMessage}</p>
        <button
          type="button"
          onClick={() => router.push("/roster")}
          className="mt-[14px] flex items-center gap-[6px] rounded-none border border-folk-border px-[10px] py-[6px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
          tabIndex={0}
        >
          <CalendarDays className="h-[14px] w-[14px]" strokeWidth={1.5} />
          Open roster
        </button>
      </div>
    )
  }

  const renderShift = (shift: RosterShift) => {
    const counterpartName = mode === "client" ? shift.staffName : shift.clientName
    const counterpartIcon = mode === "client" ? shift.staffIconText : shift.clientIconText

    return (
      <button
        key={shift.id}
        type="button"
        onClick={() => router.push("/roster")}
        className="flex w-full items-start gap-[10px] rounded-none border border-folk-border px-[12px] py-[10px] text-left transition-colors hover:border-folk-border hover:bg-folk-page"
        tabIndex={0}
      >
        <EntityIcon text={counterpartIcon || "?"} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-folk-text">
            {shift.title.trim() || formatShiftTime(shift.startTime, shift.endTime)}
          </p>
          <p className="mt-[2px] truncate text-[12px] text-folk-secondary">{counterpartName}</p>
          <div className="mt-[6px] flex flex-wrap items-center gap-[8px] text-[11px] text-folk-secondary">
            <span className="inline-flex items-center gap-[4px]">
              <CalendarDays className="h-[11px] w-[11px]" strokeWidth={1.5} />
              {formatShiftDate(shift.date)}
            </span>
            <span className="inline-flex items-center gap-[4px]">
              <Clock className="h-[11px] w-[11px]" strokeWidth={1.5} />
              {formatShiftTime(shift.startTime, shift.endTime)}
            </span>
          </div>
        </div>
        <span className={`shrink-0 rounded-none px-[8px] py-[2px] text-[10px] font-medium capitalize ${
          shift.status === "completed"
            ? "bg-[#ecfdf3] text-[#15803d]"
            : "bg-[#eff6ff] text-[#2563EB]"
        }`}>
          {shift.status}
        </span>
      </button>
    )
  }

  return (
    <div className="px-[16px] py-[12px]">
      {upcomingShifts.length > 0 && (
        <div className="mb-[16px]">
          <h4 className="mb-[8px] text-[11px] font-semibold uppercase tracking-wide text-folk-secondary">Upcoming</h4>
          <div className="space-y-[8px]">
            {upcomingShifts.map(renderShift)}
          </div>
        </div>
      )}
      {pastShifts.length > 0 && (
        <div>
          <h4 className="mb-[8px] text-[11px] font-semibold uppercase tracking-wide text-folk-secondary">Past</h4>
          <div className="space-y-[8px]">
            {pastShifts.slice(0, 10).map(renderShift)}
          </div>
          {pastShifts.length > 10 && (
            <p className="mt-[8px] text-[12px] text-folk-placeholder">{pastShifts.length - 10} more past shifts</p>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => router.push("/roster")}
        className="mt-[14px] flex items-center gap-[6px] text-[12px] font-medium text-[#555] transition-colors hover:text-folk-text"
        tabIndex={0}
      >
        <CalendarDays className="h-[13px] w-[13px]" strokeWidth={1.5} />
        Open full roster
      </button>
    </div>
  )
}
