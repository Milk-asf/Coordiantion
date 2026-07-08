"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Link2, X } from "lucide-react"
import { FormModal } from "@/components/form-modal"
import { IconButton } from "@/components/icon-button"
import { FixedSelectDropdown, FixedSelectOption } from "@/components/fixed-select-dropdown"
import { RosterShiftChipButton } from "@/components/roster/roster-shift-chip-button"
import { useToast } from "@/components/toast"
import { useRosterContext } from "@/lib/roster-context"
import { useTimesheets } from "@/lib/timesheets-context"
import { useWorkspace } from "@/lib/workspace-context"
import {
  EMPTY_PROGRESS_NOTE_DRAFT,
  ShiftProgressNoteEditor,
  type ProgressNoteDraft,
} from "@/app/(dashboard)/roster/_components/shift-progress-note"
import { formatTimeLabel, parseDateStr, toDateStr } from "@/lib/roster/week-utils"
import type { RosterShift, ShiftProgressNote } from "@/lib/roster/types"
import { cn } from "@/lib/utils"

const PANEL_WIDTH = 440
const FORM_LABEL_CLASS = "mb-[6px] block text-[13px] font-medium text-folk-text"
const FIELD_BUTTON_CLASS =
  "flex h-[38px] w-full items-center justify-between gap-[8px] rounded-[6px] border border-folk-border bg-white px-[12px] text-[13px] font-medium text-folk-text outline-none transition-colors hover:border-[#bababa] focus:border-[#a3c4f3]"

interface ShiftNoteFormPanelProps {
  isOpen: boolean
  onClose: () => void
}

function formatShiftOptionDate(dateStr: string): string {
  return parseDateStr(dateStr).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
}

/**
 * Record a progress note from My work: pick one of your finished shifts that
 * is still missing a note, then fill in the NDIS-standard note fields.
 */
export function ShiftNoteFormPanel({ isOpen, onClose }: ShiftNoteFormPanelProps) {
  const { toast } = useToast()
  const { shifts, updateShiftProgressNote } = useRosterContext()
  const { currentStaffId } = useTimesheets()
  const { currentUserName } = useWorkspace()

  const [shiftId, setShiftId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ProgressNoteDraft>(EMPTY_PROGRESS_NOTE_DRAFT)
  const [isShiftDropdownOpen, setIsShiftDropdownOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shiftBtnRef = useRef<HTMLButtonElement>(null)

  // Your shifts up to today that don't have a note yet, most recent first.
  const eligibleShifts = useMemo(() => {
    if (!currentStaffId) return []
    const today = toDateStr(new Date())
    return shifts
      .filter(
        (shift) =>
          shift.staffId === currentStaffId &&
          shift.status !== "cancelled" &&
          !shift.progressNote &&
          shift.date <= today,
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
      .slice(0, 40)
  }, [shifts, currentStaffId])

  const selectedShift = useMemo(
    () => eligibleShifts.find((shift) => shift.id === shiftId) ?? null,
    [eligibleShifts, shiftId],
  )

  // Fresh form each time the panel opens, pre-picking the latest shift.
  useEffect(() => {
    if (!isOpen) return
    setDraft(EMPTY_PROGRESS_NOTE_DRAFT)
    setError(null)
    setIsShiftDropdownOpen(false)
    setShiftId((current) => current ?? null)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setShiftId((current) => {
      if (current && eligibleShifts.some((shift) => shift.id === current)) return current
      return eligibleShifts[0]?.id ?? null
    })
  }, [isOpen, eligibleShifts])

  const handleSelectShift = (shift: RosterShift) => {
    setShiftId(shift.id)
    setIsShiftDropdownOpen(false)
  }

  const handleSave = async () => {
    if (!selectedShift) {
      setError("Choose the shift this note is for.")
      return
    }
    if (!draft.supportProvided.trim()) {
      setError("Describe the support provided before saving the shift note.")
      return
    }

    setIsSaving(true)
    setError(null)

    const now = new Date().toISOString()
    const note: ShiftProgressNote = {
      supportProvided: draft.supportProvided.trim(),
      goalProgress: draft.goalProgress.trim(),
      observations: draft.observations.trim(),
      concerns: draft.concerns.trim(),
      incidentOccurred: draft.incidentOccurred,
      followUp: draft.followUp.trim(),
      signature: draft.signature,
      authorStaffId: selectedShift.staffId || currentStaffId || null,
      authorName: currentUserName,
      recordedAt: now,
      updatedAt: now,
    }

    const success = await updateShiftProgressNote(selectedShift.id, note)
    setIsSaving(false)

    if (!success) {
      setError("Unable to save shift note. Try again.")
      return
    }

    toast("Shift note saved", "success")
    setShiftId(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <FormModal onClose={onClose} width={PANEL_WIDTH}>
        <div className="flex h-[44px] shrink-0 items-center justify-between gap-[12px] border-b border-folk-border bg-white px-[12px]">
          <h2 className="min-w-0 truncate text-[13px] font-semibold text-folk-text">New shift note</h2>
          <IconButton
            type="button"
            onClick={onClose}
            tooltip="Close"
            className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
            tabIndex={0}
          >
            <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-[24px] py-[18px]">
            <div className="mb-[16px]">
              <span className={FORM_LABEL_CLASS}>Shift</span>
              {selectedShift ? (
                <RosterShiftChipButton
                  buttonRef={shiftBtnRef}
                  shift={selectedShift}
                  showDate
                  onClick={() => setIsShiftDropdownOpen((open) => !open)}
                  ariaExpanded={isShiftDropdownOpen}
                />
              ) : (
                <button
                  ref={shiftBtnRef}
                  type="button"
                  onClick={() => setIsShiftDropdownOpen((open) => !open)}
                  className={FIELD_BUTTON_CLASS}
                  tabIndex={0}
                  aria-expanded={isShiftDropdownOpen}
                >
                  <span className="flex min-w-0 items-center gap-[8px]">
                    <Link2 className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                    <span className="truncate text-folk-placeholder">
                      {!currentStaffId
                        ? "Your login isn't linked to a staff profile"
                        : eligibleShifts.length === 0
                          ? "All your finished shifts have notes"
                          : "Select a shift"}
                    </span>
                  </span>
                </button>
              )}
              {eligibleShifts.length > 0 && (
                <p className="mt-[6px] text-[11px] text-folk-secondary">
                  {eligibleShifts.length === 1
                    ? "1 shift is still missing a note"
                    : `${eligibleShifts.length} shifts are still missing notes`}
                </p>
              )}
            </div>

            <ShiftProgressNoteEditor
              value={draft}
              onChange={setDraft}
              clientName={selectedShift?.clientName ?? ""}
              disabled={!selectedShift}
            />

            {error && (
              <p className="mt-[14px] rounded-[6px] bg-red-50 px-[12px] py-[8px] text-[13px] font-medium text-red-600">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-[8px] border-t border-folk-border-subtle px-[24px] py-[12px]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="outline-btn folk-pill-btn h-[32px] px-[12px] text-[13px] font-medium transition-colors disabled:opacity-50"
            tabIndex={0}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !selectedShift}
            className="primary-btn folk-pill-btn h-[32px] px-[14px] text-[13px] font-medium transition-colors disabled:opacity-50"
            tabIndex={0}
          >
            {isSaving ? "Saving…" : "Save note"}
          </button>
        </div>
      </FormModal>

      <FixedSelectDropdown
        isOpen={isShiftDropdownOpen}
        anchorRef={shiftBtnRef}
        onClose={() => setIsShiftDropdownOpen(false)}
        estimatedHeight={Math.min(260, eligibleShifts.length * 40 + 8)}
      >
        {eligibleShifts.length === 0 ? (
          <div className="px-[12px] py-[10px] text-[12px] text-folk-placeholder">
            {!currentStaffId ? "Your login isn't linked to a staff profile" : "All your finished shifts have notes"}
          </div>
        ) : (
          eligibleShifts.map((shift) => (
            <FixedSelectOption key={shift.id} isActive={shiftId === shift.id} onClick={() => handleSelectShift(shift)}>
              <span className={cn("min-w-0 flex-1 truncate")}>
                {formatShiftOptionDate(shift.date)} · {shift.clientName || shift.title || "Shift"}
              </span>
              <span className="shrink-0 text-[11px] font-medium text-folk-secondary">
                {formatTimeLabel(shift.startTime)}–{formatTimeLabel(shift.endTime)}
              </span>
            </FixedSelectOption>
          ))
        )}
      </FixedSelectDropdown>
    </>
  )
}
