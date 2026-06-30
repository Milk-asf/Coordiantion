"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { usePermissions } from "@/lib/hooks/use-permissions"
import type { RosterShift, ShiftFormContext } from "@/lib/roster/types"
import { ShiftFormPanel } from "@/app/(dashboard)/roster/_components/shift-form-panel"
import { ClockLogPanel } from "@/components/roster/clock-log-panel"
import { FloatingSidePanelHost } from "@/components/floating-side-panel"
import { RosterCalendar } from "@/components/roster/roster-week-view"
import { RosterShiftHoverProvider } from "@/components/roster/roster-shift-hover-context"

function getTodayDateStr() {
  return new Date().toISOString().slice(0, 10)
}

export function RosterShell() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { canManageRoster } = usePermissions()
  const handledCreateFromQueryRef = useRef(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isClockLogOpen, setIsClockLogOpen] = useState(false)
  const [clockLogPeriod, setClockLogPeriod] = useState<{ start: string; end: string } | undefined>()
  const [editingShift, setEditingShift] = useState<RosterShift | null>(null)
  const [defaults, setDefaults] = useState<ShiftFormContext | undefined>()
  const [pendingShiftPreview, setPendingShiftPreview] = useState<ShiftFormContext | null>(null)

  const openCreateShift = useCallback((nextDefaults?: ShiftFormContext) => {
    // Only admins can create shifts; everyone else opens shifts read-only to add notes.
    if (!canManageRoster) return
    setEditingShift(null)
    setDefaults(nextDefaults)
    setPendingShiftPreview(nextDefaults ?? null)
    setIsOpen(true)
  }, [canManageRoster])

  useEffect(() => {
    if (handledCreateFromQueryRef.current) return
    if (searchParams.get("createShift") !== "1") return

    handledCreateFromQueryRef.current = true

    const clientId = searchParams.get("clientId") ?? undefined
    const staffId = searchParams.get("staffId") ?? undefined
    const date = searchParams.get("date") ?? getTodayDateStr()

    openCreateShift({
      ...(clientId ? { clientId } : {}),
      ...(staffId ? { staffId } : {}),
      date,
    })

    router.replace("/roster", { scroll: false })
  }, [searchParams, router, openCreateShift])

  const openEditShift = useCallback((shift: RosterShift) => {
    setEditingShift(shift)
    setDefaults(undefined)
    setPendingShiftPreview(null)
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setEditingShift(null)
    setDefaults(undefined)
    setPendingShiftPreview(null)
  }, [])

  const handleOpenClockLog = useCallback((period: { start: string; end: string }) => {
    setClockLogPeriod(period)
    setIsClockLogOpen(true)
  }, [])

  const handleCloseClockLog = useCallback(() => {
    setIsClockLogOpen(false)
    setClockLogPeriod(undefined)
  }, [])

  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element

      if (target.closest("[data-shift-form-panel]")) return
      if (target.closest("[data-clock-log-panel]")) return
      if (target.closest("[data-shift-block]")) return
      if (target.closest("[data-shift-string-group]")) return
      if (target.closest("[data-roster-add-shift]")) return
      if (target.closest("[role='dialog']")) return
      if (target.closest("[data-floating-overlay]")) return
      if (!calendarRef.current?.contains(target)) return

      handleClose()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [handleClose, isOpen])

  const handleDraftChange = useCallback((draft: ShiftFormContext) => {
    setPendingShiftPreview(draft)
  }, [])

  const handleContinueString = useCallback((nextDefaults: ShiftFormContext) => {
    setEditingShift(null)
    setDefaults(nextDefaults)
    setPendingShiftPreview(nextDefaults)
    setIsOpen(true)
  }, [])

  return (
    <div className="relative flex h-full min-h-0">
      <div ref={calendarRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <RosterShiftHoverProvider>
          <RosterCalendar
            onCreateShift={openCreateShift}
            onEditShift={openEditShift}
            pendingShiftPreview={pendingShiftPreview}
            onOpenClockLog={handleOpenClockLog}
          />
        </RosterShiftHoverProvider>
      </div>
      {(isOpen || isClockLogOpen) && (
        <FloatingSidePanelHost>
          {isClockLogOpen && (
            <ClockLogPanel
              isOpen={isClockLogOpen}
              onClose={handleCloseClockLog}
              periodStart={clockLogPeriod?.start}
              periodEnd={clockLogPeriod?.end}
            />
          )}
          {isOpen && (
            <div data-shift-form-panel className="flex h-full">
              <ShiftFormPanel
                isOpen={isOpen}
                shift={editingShift}
                defaults={defaults}
                onClose={handleClose}
                onDraftChange={editingShift ? undefined : handleDraftChange}
                onContinueString={handleContinueString}
                onSelectShift={openEditShift}
              />
            </div>
          )}
        </FloatingSidePanelHost>
      )}
    </div>
  )
}
