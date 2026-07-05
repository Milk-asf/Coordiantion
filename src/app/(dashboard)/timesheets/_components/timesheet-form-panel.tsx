"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, Clock, Link2, MapPin, Plus, Trash2, X } from "lucide-react"
import { FormModal } from "@/components/form-modal"
import { IconButton } from "@/components/icon-button"
import { FixedDatePickerDropdown } from "@/components/fixed-date-picker-dropdown"
import { FixedSelectDropdown, FixedSelectOption } from "@/components/fixed-select-dropdown"
import { FixedTimePickerDropdown } from "@/components/fixed-time-picker-dropdown"
import { SignaturePad } from "@/components/signature-pad"
import { EntityMultiPicker } from "@/app/(dashboard)/incidents/_components/entity-multi-picker"
import { useToast } from "@/components/toast"
import { useClients } from "@/lib/hooks/use-clients"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useRosterContext } from "@/lib/roster-context"
import { useTimesheets } from "@/lib/timesheets-context"
import { normalizeTimeInput } from "@/lib/roster/shift-utils"
import { formatTimeLabel, timeToMinutes } from "@/lib/roster/week-utils"
import {
  computeWorkedMinutes,
  createTravelClaim,
  isOvernight,
  type Timesheet,
  type TimesheetStatus,
  type TravelClaim,
} from "@/lib/timesheets/types"
import type { RosterShift } from "@/lib/roster/types"
import { cn } from "@/lib/utils"

const PANEL_WIDTH = 440
const FORM_LABEL_CLASS = "mb-[6px] block text-[13px] font-medium text-folk-text"
const FORM_INPUT_CLASS =
  "h-[38px] w-full rounded-[6px] border border-folk-border bg-white px-[12px] text-[13px] font-medium text-folk-text outline-none placeholder:text-folk-placeholder hover:border-[#bababa] focus:border-[#a3c4f3]"
const FORM_TEXTAREA_CLASS =
  "min-h-[72px] w-full resize-y rounded-[6px] border border-folk-border bg-white px-[12px] py-[8px] text-[13px] font-medium leading-[1.5] text-folk-text outline-none placeholder:text-folk-placeholder hover:border-[#bababa] focus:border-[#a3c4f3]"
const FIELD_BUTTON_CLASS =
  "flex h-[38px] w-full items-center justify-between gap-[8px] rounded-[6px] border border-folk-border bg-white px-[12px] text-[13px] font-medium text-folk-text outline-none transition-colors hover:border-[#bababa] focus:border-[#a3c4f3]"

interface TimesheetFormPanelProps {
  isOpen: boolean
  timesheet?: Timesheet | null
  onClose: () => void
  /** Reviewer edits from Approvals — keeps the timesheet in the sent queue. */
  variant?: "worker" | "review"
  onSaved?: () => void
}

type ActiveDropdown = "startDate" | "startTime" | "endTime" | "shift" | null

function addDays(dateStr: string, days: number): string {
  if (!dateStr) return dateStr
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return "Empty"
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return "Empty"
  return date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
}

/** Render a minutes value as an editable hours string, e.g. 90 → "1.5". */
function minutesToHoursInput(minutes: number): string {
  if (!minutes || minutes <= 0) return ""
  return String(Number((minutes / 60).toFixed(2)))
}

function hoursInputToMinutes(value: string): number {
  const hours = parseFloat(value)
  if (Number.isNaN(hours) || hours <= 0) return 0
  return Math.round(hours * 60)
}

function shiftMatchesWindow(shift: RosterShift, date: string, startTime: string, endTime: string): boolean {
  if (shift.date !== date) return false
  const shiftStart = timeToMinutes(shift.startTime)
  const shiftEnd = timeToMinutes(shift.endTime)
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime) <= start ? timeToMinutes(endTime) + 24 * 60 : timeToMinutes(endTime)
  const normalizedShiftEnd = shiftEnd <= shiftStart ? shiftEnd + 24 * 60 : shiftEnd
  return start < normalizedShiftEnd && shiftStart < end
}

export function TimesheetFormPanel({
  isOpen,
  timesheet,
  onClose,
  variant = "worker",
  onSaved,
}: TimesheetFormPanelProps) {
  const { toast } = useToast()
  const { canManageTimesheets } = usePermissions()
  const { clients } = useClients()
  const { shifts } = useRosterContext()
  const { currentStaffId, addTimesheet, updateTimesheet, setStatus } = useTimesheets()

  const isReviewEdit = variant === "review"
  const isEditing = Boolean(timesheet)
  const isReadOnly = timesheet ? timesheet.status === "approved" : false
  const shiftStaffId = isReviewEdit && timesheet?.staffId ? timesheet.staffId : currentStaffId

  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [breakMinutes, setBreakMinutes] = useState(0)
  // Worked time is entered in hours; it defaults to the attached shift's
  // quantity (its rostered duration) rather than the literal clock times, and
  // can be overridden by the worker.
  const [workedHours, setWorkedHours] = useState("")
  const [manualWorked, setManualWorked] = useState(false)
  const [shiftId, setShiftId] = useState<string | null>(null)
  const [manualShift, setManualShift] = useState(false)
  const [travelClaims, setTravelClaims] = useState<TravelClaim[]>([])
  const [notes, setNotes] = useState("")
  const [signature, setSignature] = useState("")
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null)
  const [startTimeFocused, setStartTimeFocused] = useState(false)
  const [endTimeFocused, setEndTimeFocused] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const startDateBtnRef = useRef<HTMLButtonElement>(null)
  const startTimeRef = useRef<HTMLInputElement>(null)
  const endTimeRef = useRef<HTMLInputElement>(null)
  const shiftBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const today = new Date().toISOString().slice(0, 10)
    setStartDate(timesheet?.startDate ?? today)
    setStartTime(timesheet?.startTime ?? "09:00")
    setEndTime(timesheet?.endTime ?? "17:00")
    setBreakMinutes(timesheet?.breakMinutes ?? 0)
    setShiftId(timesheet?.shiftId ?? null)
    setManualShift(Boolean(timesheet?.shiftId))
    setTravelClaims(timesheet?.travelClaims ?? [])
    setNotes(timesheet?.notes ?? "")
    setSignature(timesheet?.signature ?? "")
    setActiveDropdown(null)
    // Editing keeps the saved worked time; a new timesheet tracks the shift.
    if (timesheet) {
      setWorkedHours(minutesToHoursInput(timesheet.workedMinutes))
      setManualWorked(true)
    } else {
      setWorkedHours("")
      setManualWorked(false)
    }
  }, [isOpen, timesheet])

  const normalizedStartTime = useMemo(() => normalizeTimeInput(startTime), [startTime])
  const normalizedEndTime = useMemo(() => normalizeTimeInput(endTime), [endTime])

  const overnight = isOvernight(normalizedStartTime, normalizedEndTime)
  const endDate = overnight ? addDays(startDate, 1) : startDate
  // Fallback worked time derived from the entered window, used only when no
  // rostered shift is attached.
  const computedWorkedMinutes = useMemo(
    () => computeWorkedMinutes(normalizedStartTime, normalizedEndTime, breakMinutes),
    [normalizedStartTime, normalizedEndTime, breakMinutes],
  )

  // Shifts belonging to the current worker that overlap the entered window.
  const matchingShifts = useMemo(() => {
    if (!startDate) return []
    return shifts.filter(
      (shift) =>
        (!shiftStaffId || shift.staffId === shiftStaffId) &&
        shiftMatchesWindow(shift, startDate, normalizedStartTime, normalizedEndTime),
    )
  }, [shifts, shiftStaffId, startDate, normalizedStartTime, normalizedEndTime])

  // Auto-select the best matching shift unless the user picked one manually.
  useEffect(() => {
    if (manualShift) return
    setShiftId(matchingShifts[0]?.id ?? null)
  }, [matchingShifts, manualShift])

  const selectedShift = useMemo(() => shifts.find((shift) => shift.id === shiftId) ?? null, [shifts, shiftId])

  // The rostered shift's quantity (its scheduled duration), in minutes.
  const shiftQuantityMinutes = useMemo(
    () => (selectedShift ? computeWorkedMinutes(selectedShift.startTime, selectedShift.endTime, 0) : 0),
    [selectedShift],
  )

  // What the worked time should default to: the attached shift's quantity, or
  // the entered window when there is no shift.
  const autoWorkedMinutes = selectedShift ? shiftQuantityMinutes : computedWorkedMinutes

  // Keep the worked-hours field in sync with the auto value until the worker
  // overrides it.
  useEffect(() => {
    if (manualWorked) return
    setWorkedHours(minutesToHoursInput(autoWorkedMinutes))
  }, [manualWorked, autoWorkedMinutes])

  const workedMinutes = manualWorked ? hoursInputToMinutes(workedHours) : autoWorkedMinutes

  const clientOptions = useMemo(
    () => clients.map((client) => ({ id: client.id, label: client.displayName, iconText: client.iconText })),
    [clients],
  )

  const startTimeValue =
    startTimeFocused || activeDropdown === "startTime"
      ? startTime
      : normalizedStartTime
        ? formatTimeLabel(normalizedStartTime)
        : startTime
  const endTimeValue =
    endTimeFocused || activeDropdown === "endTime"
      ? endTime
      : normalizedEndTime
        ? formatTimeLabel(normalizedEndTime)
        : endTime

  const updateTravelClaim = (id: string, patch: Partial<TravelClaim>) => {
    setTravelClaims((prev) => prev.map((claim) => (claim.id === id ? { ...claim, ...patch } : claim)))
  }

  const handleAddTravelClaim = () => setTravelClaims((prev) => [...prev, createTravelClaim()])
  const handleRemoveTravelClaim = (id: string) =>
    setTravelClaims((prev) => prev.filter((claim) => claim.id !== id))

  const handleSelectShift = (id: string | null) => {
    setManualShift(true)
    setShiftId(id)
    setActiveDropdown(null)
  }

  const handleSave = async (status: TimesheetStatus) => {
    if (isReviewEdit && !canManageTimesheets) {
      toast("Only admins can edit timesheets", "error")
      return
    }

    if (!startDate) {
      toast("Add a start date first", "error")
      return
    }

    // Resubmitting clears any prior "returned" flag on travel claims so they
    // re-enter the review queue as freshly submitted.
    const claimsForSave =
      status === "sent"
        ? travelClaims.map((claim) =>
            claim.status === "returned" ? { ...claim, status: "sent" as const, reviewNote: "" } : claim,
          )
        : travelClaims

    const payload = {
      startDate,
      endDate,
      startTime: normalizedStartTime,
      endTime: normalizedEndTime,
      breakMinutes,
      workedMinutes,
      shiftId,
      travelClaims: claimsForSave,
      notes,
      signature,
      status,
    }

    setIsSaving(true)
    if (isEditing && timesheet) {
      await updateTimesheet(timesheet.id, payload)
      if (isReviewEdit) {
        await setStatus(timesheet.id, "sent", "")
      }
    } else {
      const created = await addTimesheet(payload)
      if (!created) {
        setIsSaving(false)
        toast("Could not save timesheet", "error")
        return
      }
    }
    setIsSaving(false)
    if (isReviewEdit) {
      toast("Timesheet updated", "success")
      onSaved?.()
    } else {
      toast(status === "sent" ? "Timesheet submitted" : "Timesheet saved", "success")
    }
    onClose()
  }

  const handleSaveReview = async () => {
    if (!timesheet) return
    await handleSave("sent")
  }

  if (!isOpen) return null

  return (
    <>
      <FormModal onClose={onClose} width={PANEL_WIDTH}>
        <div className="flex h-[44px] shrink-0 items-center justify-between gap-[12px] border-b border-folk-border bg-white px-[12px]">
          <h2 className="min-w-0 truncate text-[13px] font-semibold text-folk-text">
            {isReviewEdit ? "Edit timesheet" : isEditing ? "Timesheet" : "New timesheet"}
          </h2>
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
          <div className="px-[24px] py-[16px]">
            {isReadOnly && (
              <div className="mb-[14px] rounded-[6px] border border-[#bbf7d0] bg-[#f0fdf4] px-[12px] py-[10px] text-[12px] font-medium text-[#166534]">
                This timesheet has been approved and can no longer be edited.
              </div>
            )}
            {timesheet?.status === "returned" && timesheet.reviewNote && (
              <div className="mb-[14px] rounded-[6px] border border-amber-200 bg-amber-50 px-[12px] py-[10px]">
                <p className="text-[12px] font-semibold text-amber-900">Returned for changes</p>
                <p className="mt-[4px] text-[12px] leading-snug text-amber-800">{timesheet.reviewNote}</p>
              </div>
            )}

            <div className="space-y-[14px]">
              <div>
                <span className={FORM_LABEL_CLASS}>Date</span>
                <button
                  ref={startDateBtnRef}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setActiveDropdown(activeDropdown === "startDate" ? null : "startDate")}
                  className={cn(FIELD_BUTTON_CLASS, isReadOnly && "cursor-not-allowed opacity-70")}
                  tabIndex={0}
                  aria-expanded={activeDropdown === "startDate"}
                >
                  <span className="flex min-w-0 items-center gap-[8px]">
                    <CalendarDays className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                    <span className="truncate">{formatDateLabel(startDate)}</span>
                  </span>
                </button>
                {overnight && (
                  <p className="mt-[6px] text-[11px] text-folk-secondary">
                    Overnight — ends {formatDateLabel(endDate)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-[12px]">
                <div>
                  <span className={FORM_LABEL_CLASS}>Start time</span>
                  <div className="flex h-[38px] items-center gap-[7px] rounded-[6px] border border-folk-border bg-white px-[12px] hover:border-[#bababa] focus-within:border-[#a3c4f3]">
                    <Clock className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                    <input
                      ref={startTimeRef}
                      type="text"
                      disabled={isReadOnly}
                      value={startTimeValue}
                      onChange={(event) => setStartTime(event.target.value)}
                      onFocus={() => {
                        setStartTimeFocused(true)
                        if (normalizedStartTime) setStartTime(normalizedStartTime)
                        setActiveDropdown("startTime")
                      }}
                      onBlur={() => {
                        setStartTimeFocused(false)
                        if (normalizedStartTime) setStartTime(normalizedStartTime)
                      }}
                      placeholder="9:00 am"
                      className="w-full bg-transparent text-[13px] font-medium text-folk-text outline-none placeholder:text-folk-placeholder"
                      aria-label="Start time"
                    />
                  </div>
                </div>
                <div>
                  <span className={FORM_LABEL_CLASS}>End time</span>
                  <div className="flex h-[38px] items-center gap-[7px] rounded-[6px] border border-folk-border bg-white px-[12px] hover:border-[#bababa] focus-within:border-[#a3c4f3]">
                    <Clock className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                    <input
                      ref={endTimeRef}
                      type="text"
                      disabled={isReadOnly}
                      value={endTimeValue}
                      onChange={(event) => setEndTime(event.target.value)}
                      onFocus={() => {
                        setEndTimeFocused(true)
                        if (normalizedEndTime) setEndTime(normalizedEndTime)
                        setActiveDropdown("endTime")
                      }}
                      onBlur={() => {
                        setEndTimeFocused(false)
                        if (normalizedEndTime) setEndTime(normalizedEndTime)
                      }}
                      placeholder="5:00 pm"
                      className="w-full bg-transparent text-[13px] font-medium text-folk-text outline-none placeholder:text-folk-placeholder"
                      aria-label="End time"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[12px]">
                <div>
                  <label className={FORM_LABEL_CLASS} htmlFor="timesheet-break">
                    Break (minutes)
                  </label>
                  <input
                    id="timesheet-break"
                    type="number"
                    min={0}
                    disabled={isReadOnly}
                    value={breakMinutes === 0 ? "" : breakMinutes}
                    onChange={(event) => setBreakMinutes(Math.max(0, Number(event.target.value) || 0))}
                    placeholder="0"
                    className={FORM_INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={FORM_LABEL_CLASS} htmlFor="timesheet-worked">
                    Time worked (hrs)
                  </label>
                  <input
                    id="timesheet-worked"
                    type="number"
                    min={0}
                    step="0.25"
                    disabled={isReadOnly}
                    value={workedHours}
                    onChange={(event) => {
                      setManualWorked(true)
                      setWorkedHours(event.target.value)
                    }}
                    placeholder="0"
                    className={FORM_INPUT_CLASS}
                  />
                  {selectedShift && !manualWorked && (
                    <p className="mt-[6px] text-[11px] text-folk-secondary">From rostered shift</p>
                  )}
                </div>
              </div>

              <div>
                <span className={FORM_LABEL_CLASS}>Rostered shift</span>
                <button
                  ref={shiftBtnRef}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setActiveDropdown(activeDropdown === "shift" ? null : "shift")}
                  className={cn(FIELD_BUTTON_CLASS, isReadOnly && "cursor-not-allowed opacity-70")}
                  tabIndex={0}
                  aria-expanded={activeDropdown === "shift"}
                >
                  <span className="flex min-w-0 items-center gap-[8px]">
                    <Link2 className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                    <span className={cn("truncate", !selectedShift && "text-folk-placeholder")}>
                      {selectedShift
                        ? `${selectedShift.clientName} · ${formatTimeLabel(selectedShift.startTime)}–${formatTimeLabel(selectedShift.endTime)}`
                        : matchingShifts.length === 0
                          ? "No matching shift"
                          : "Select shift"}
                    </span>
                  </span>
                </button>
                {!manualShift && selectedShift && (
                  <p className="mt-[6px] text-[11px] text-folk-secondary">Auto-matched from your roster</p>
                )}
              </div>
            </div>

            <div className="mt-[20px] border-t border-folk-border-subtle pt-[16px]">
              <div className="mb-[10px] flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-folk-placeholder">
                  Travel claims
                </span>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={handleAddTravelClaim}
                    className="outline-btn folk-pill-btn h-[28px] min-h-[28px] gap-[5px] px-[12px] text-[12px]"
                    tabIndex={0}
                  >
                    <Plus className="h-[12px] w-[12px]" strokeWidth={2} />
                    Add claim
                  </button>
                )}
              </div>

              {travelClaims.length === 0 ? (
                <p className="text-[12px] text-folk-tertiary">No travel claims added.</p>
              ) : (
                <div className="space-y-[12px]">
                  {travelClaims.map((claim, index) => (
                    <div key={claim.id} className="rounded-[6px] border border-folk-border-subtle bg-folk-page p-[12px]">
                      <div className="mb-[10px] flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-folk-text">Claim {index + 1}</span>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTravelClaim(claim.id)}
                            className="flex h-[24px] w-[24px] items-center justify-center rounded-full text-folk-secondary transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove claim ${index + 1}`}
                            tabIndex={0}
                          >
                            <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.75} />
                          </button>
                        )}
                      </div>

                      {claim.status === "returned" && claim.reviewNote && (
                        <div className="mb-[10px] rounded-[6px] border border-amber-200 bg-amber-50 px-[10px] py-[8px]">
                          <p className="text-[11px] font-semibold text-amber-900">Claim returned</p>
                          <p className="mt-[2px] text-[11px] leading-snug text-amber-800">{claim.reviewNote}</p>
                        </div>
                      )}

                      <div className="space-y-[12px]">
                        <EntityMultiPicker
                          label="Participants"
                          options={clientOptions}
                          selectedIds={claim.clientIds}
                          onChange={(ids) => updateTravelClaim(claim.id, { clientIds: ids })}
                          placeholder="Add participant"
                        />

                        <div className="grid grid-cols-2 gap-[12px]">
                          <div>
                            <span className={FORM_LABEL_CLASS}>Start location</span>
                            <div className="flex h-[38px] items-center gap-[7px] rounded-[6px] border border-folk-border bg-white px-[12px] hover:border-[#bababa] focus-within:border-[#a3c4f3]">
                              <MapPin className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={claim.startLocation}
                                onChange={(event) => updateTravelClaim(claim.id, { startLocation: event.target.value })}
                                placeholder="From"
                                className="w-full bg-transparent text-[13px] font-medium text-folk-text outline-none placeholder:text-folk-placeholder"
                              />
                            </div>
                          </div>
                          <div>
                            <span className={FORM_LABEL_CLASS}>End location</span>
                            <div className="flex h-[38px] items-center gap-[7px] rounded-[6px] border border-folk-border bg-white px-[12px] hover:border-[#bababa] focus-within:border-[#a3c4f3]">
                              <MapPin className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={claim.endLocation}
                                onChange={(event) => updateTravelClaim(claim.id, { endLocation: event.target.value })}
                                placeholder="To"
                                className="w-full bg-transparent text-[13px] font-medium text-folk-text outline-none placeholder:text-folk-placeholder"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-[12px]">
                          <div>
                            <label className={FORM_LABEL_CLASS} htmlFor={`claim-distance-${claim.id}`}>
                              Distance (km)
                            </label>
                            <input
                              id={`claim-distance-${claim.id}`}
                              type="number"
                              min={0}
                              step="0.1"
                              disabled={isReadOnly}
                              value={claim.distanceKm === 0 ? "" : claim.distanceKm}
                              onChange={(event) =>
                                updateTravelClaim(claim.id, { distanceKm: Math.max(0, Number(event.target.value) || 0) })
                              }
                              placeholder="0"
                              className={FORM_INPUT_CLASS}
                            />
                          </div>
                          <div>
                            <label className={FORM_LABEL_CLASS} htmlFor={`claim-purpose-${claim.id}`}>
                              Purpose
                            </label>
                            <input
                              id={`claim-purpose-${claim.id}`}
                              type="text"
                              disabled={isReadOnly}
                              value={claim.purpose}
                              onChange={(event) => updateTravelClaim(claim.id, { purpose: event.target.value })}
                              placeholder="e.g. Community access"
                              className={FORM_INPUT_CLASS}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={FORM_LABEL_CLASS} htmlFor={`claim-notes-${claim.id}`}>
                            Notes
                          </label>
                          <input
                            id={`claim-notes-${claim.id}`}
                            type="text"
                            disabled={isReadOnly}
                            value={claim.notes}
                            onChange={(event) => updateTravelClaim(claim.id, { notes: event.target.value })}
                            placeholder="Optional"
                            className={FORM_INPUT_CLASS}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-[20px] border-t border-folk-border-subtle pt-[16px]">
              <label className={FORM_LABEL_CLASS} htmlFor="timesheet-notes">
                Notes
              </label>
              <textarea
                id="timesheet-notes"
                disabled={isReadOnly}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Anything to add about this shift?"
                className={FORM_TEXTAREA_CLASS}
              />

              <div className="mt-[14px]">
                <span className={FORM_LABEL_CLASS}>Signature</span>
                <SignaturePad value={signature} onChange={setSignature} disabled={isReadOnly} />
              </div>
            </div>

          </div>
        </div>

        {!isReadOnly && (
          <div className="flex shrink-0 items-center justify-end gap-[8px] border-t border-folk-border-subtle px-[24px] py-[12px]">
            {isReviewEdit ? (
              <>
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
                  onClick={handleSaveReview}
                  disabled={isSaving}
                  className="primary-btn folk-pill-btn h-[32px] px-[14px] text-[13px] font-medium transition-colors disabled:opacity-50"
                  tabIndex={0}
                >
                  {isSaving ? "Saving…" : "Save changes"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSave("draft")}
                  disabled={isSaving}
                  className="outline-btn folk-pill-btn h-[32px] px-[12px] text-[13px] font-medium transition-colors disabled:opacity-50"
                  tabIndex={0}
                >
                  {isSaving ? "Saving…" : "Save draft"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSave("sent")}
                  disabled={isSaving}
                  className="primary-btn folk-pill-btn h-[32px] px-[14px] text-[13px] font-medium transition-colors disabled:opacity-50"
                  tabIndex={0}
                >
                  {isSaving ? "Submitting…" : "Submit"}
                </button>
              </>
            )}
          </div>
        )}
      </FormModal>

      <FixedDatePickerDropdown
        isOpen={activeDropdown === "startDate"}
        anchorRef={startDateBtnRef}
        value={startDate}
        onChange={(value) => {
          setStartDate(value)
          setActiveDropdown(null)
        }}
        onClose={() => setActiveDropdown(null)}
      />

      <FixedTimePickerDropdown
        isOpen={activeDropdown === "startTime"}
        anchorRef={startTimeRef}
        value={normalizedStartTime}
        onChange={setStartTime}
        onClose={() => setActiveDropdown(null)}
      />

      <FixedTimePickerDropdown
        isOpen={activeDropdown === "endTime"}
        anchorRef={endTimeRef}
        value={normalizedEndTime}
        onChange={setEndTime}
        onClose={() => setActiveDropdown(null)}
      />

      <FixedSelectDropdown
        isOpen={activeDropdown === "shift"}
        anchorRef={shiftBtnRef}
        onClose={() => setActiveDropdown(null)}
        estimatedHeight={Math.min(260, (matchingShifts.length + 1) * 40 + 8)}
      >
        <FixedSelectOption muted isActive={!shiftId} onClick={() => handleSelectShift(null)}>
          None
        </FixedSelectOption>
        {matchingShifts.length === 0 ? (
          <div className="px-[12px] py-[10px] text-[12px] text-folk-placeholder">
            No roster shifts match this date and time
          </div>
        ) : (
          matchingShifts.map((shift) => (
            <FixedSelectOption key={shift.id} isActive={shiftId === shift.id} onClick={() => handleSelectShift(shift.id)}>
              <span className="min-w-0 flex-1 truncate">{shift.clientName || shift.title || "Shift"}</span>
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
