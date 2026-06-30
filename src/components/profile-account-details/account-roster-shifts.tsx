"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays } from "lucide-react"
import { ShiftWorkspaceCard } from "@/components/shift-workspace-card"
import { useRoster } from "@/lib/hooks/use-roster"
import type { RosterShift } from "@/lib/roster/types"

interface AccountRosterShiftsProps {
  mode: "client" | "staff"
  entityId: string
  emptyMessage?: string
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
          className="outline-btn mt-[14px] flex items-center gap-[6px]"
          tabIndex={0}
        >
          <CalendarDays className="h-[14px] w-[14px]" strokeWidth={1.5} />
          Open roster
        </button>
      </div>
    )
  }

  const renderShift = (shift: RosterShift) => {
    const headerName = mode === "client" ? shift.staffName : shift.clientName
    const headerIconText = mode === "client" ? shift.staffIconText : shift.clientIconText

    return (
      <ShiftWorkspaceCard
        key={shift.id}
        shift={shift}
        headerName={headerName || shift.location || "Unassigned"}
        headerIconText={headerIconText}
        onClick={() => router.push("/roster")}
      />
    )
  }

  return (
    <div className="px-[16px] py-[12px]">
      {upcomingShifts.length > 0 && (
        <div className="mb-[16px]">
          <h4 className="mb-[8px] text-[11px] font-semibold uppercase tracking-wide text-folk-secondary">Upcoming</h4>
          <div className="grid gap-[12px] [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
            {upcomingShifts.map(renderShift)}
          </div>
        </div>
      )}
      {pastShifts.length > 0 && (
        <div>
          <h4 className="mb-[8px] text-[11px] font-semibold uppercase tracking-wide text-folk-secondary">Past</h4>
          <div className="grid gap-[12px] [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
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
