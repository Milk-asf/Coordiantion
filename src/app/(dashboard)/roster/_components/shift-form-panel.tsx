"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  ChevronDown,
  Clock,
  Copy,
  Link2,
  MapPin,
  Plus,
  Tag,
  Target,
  Trash2,
  User,
  X,
} from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { CancelShiftDialog } from "@/components/roster/cancel-shift-dialog"
import { IconButton } from "@/components/icon-button"
import { FormModal } from "@/components/form-modal"
import { FixedDatePickerDropdown } from "@/components/fixed-date-picker-dropdown"
import { FixedSelectDropdown, FixedSelectOption } from "@/components/fixed-select-dropdown"
import { FixedTimePickerDropdown } from "@/components/fixed-time-picker-dropdown"
import { CategoryChip } from "@/components/category-chip"
import { EntityIcon } from "@/components/entity-icon"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { SearchableEntityDropdown } from "@/components/searchable-entity-dropdown"
import { profileMainTabScrollClass, profilePageTabRowClass } from "@/components/tab-active-indicator"
import { useWorkspace } from "@/lib/workspace-context"
import { useCharges } from "@/lib/hooks/use-charges"
import { useSuitability } from "@/lib/hooks/use-suitability"
import { suitabilityStatusConfig } from "@/lib/suitability/config"
import { useClients } from "@/lib/hooks/use-clients"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useRosterSettings } from "@/lib/hooks/use-roster-settings"
import { useRosterContext } from "@/lib/roster-context"
import { buildSessionTypeToneMap, getSessionTypeLabel, getSessionTypeTone, resolveSessionType } from "@/lib/roster/settings"
import { getShiftSessionTypeChipClasses } from "@/lib/roster/shift-utils"
import { ShiftTagColorSwatch } from "@/components/roster/shift-tag-color-picker"
import { normalizeShiftChargeTypes } from "@/lib/roster/charge-utils"
import {
  buildStringSegmentDefaults,
  createShiftStringId,
  formatStringPartTabLabel,
  getStringPartTabMeta,
  getNextDayStringPartDefaultTimes,
  getNextStringOrder,
  isNextDayStringPart,
  sortShiftsBySchedule,
} from "@/lib/roster/shift-string-utils"
import { buildShiftGoalSnapshot, findAttachedGoalId, removeShiftFromGoals } from "@/lib/roster/goal-links"
import { syncShiftGoalLink } from "@/lib/roster/sync-shift-goal-link"
import { goalTypeConfig } from "@/app/(dashboard)/clients/[id]/_components/goals-tab"
import type { RosterShift, RosterShiftInput, ShiftFormContext, ShiftProgressNote } from "@/lib/roster/types"
import {
  EMPTY_PROGRESS_NOTE_DRAFT,
  ShiftProgressNoteEditor,
  type ProgressNoteDraft,
} from "./shift-progress-note"
import {
  getShiftComplianceIssues,
  hasBlockingComplianceIssues,
  complianceIssuesToMessages,
  getCancellationClaimSuggestion,
} from "@/lib/roster/compliance"
import { downloadSupportLog } from "@/lib/roster/support-log-export"
import {
  getShiftIssueDescriptions,
  getShiftCancelledByLabel,
  isShiftCancelled,
  normalizeTimeInput,
  validateShiftInput,
} from "@/lib/roster/shift-utils"
import {
  formatTimeLabel,
  getDayViewEndHour,
  minutesToTime,
  timeToMinutes,
} from "@/lib/roster/week-utils"
import { useToast } from "@/components/toast"
import { SuitabilityDisallowedChip } from "@/components/suitability-status-select"
import { FolkSidebarField, folkSidebarValueButtonClass } from "@/components/folk-sidebar"
import { cn } from "@/lib/utils"

const PANEL_WIDTH = 540
const FORM_LABEL_CLASS = "mb-[6px] block text-[13px] font-medium text-folk-text"
const FORM_INPUT_CLASS =
  "h-[38px] w-full rounded-[6px] border border-folk-border bg-white px-[12px] text-[13px] font-medium text-folk-text outline-none placeholder:text-folk-placeholder hover:border-[#bababa] focus:border-[#a3c4f3]"
const FORM_TEXTAREA_CLASS =
  "min-h-[76px] w-full resize-y rounded-[6px] border border-folk-border bg-white px-[12px] py-[8px] text-[13px] font-medium leading-[1.5] text-folk-text outline-none placeholder:text-folk-placeholder hover:border-[#bababa] focus:border-[#a3c4f3]"
const VALUE_BUTTON_CLASS = folkSidebarValueButtonClass()
const INLINE_INPUT_CLASS =
  "w-full bg-transparent text-[13px] font-medium text-folk-text placeholder-[#ccc] outline-none"

interface ShiftFormPanelProps {
  isOpen: boolean
  shift?: RosterShift | null
  defaults?: ShiftFormContext
  onClose: () => void
  onDraftChange?: (draft: ShiftFormContext) => void
  onContinueString?: (defaults: ShiftFormContext) => void
  onSelectShift?: (shift: RosterShift) => void
}

type ShiftDropdown =
  | "client"
  | "staff"
  | "date"
  | "startTime"
  | "endTime"
  | "charge"
  | "goal"
  | "sessionType"
  | null

export function ShiftFormPanel({
  isOpen,
  shift,
  defaults,
  onClose,
  onDraftChange,
  onContinueString,
  onSelectShift,
}: ShiftFormPanelProps) {
  const { toast } = useToast()
  const { currentUserName } = useWorkspace()
  const { activeStaff, activeClients, shifts, addShift, updateShift, updateShiftProgressNote, deleteShift, duplicateShift } =
    useRosterContext()
  const { clients, updateClient } = useClients()
  const { enabledCharges } = useCharges()
  const { isDisallowed } = useSuitability()
  const { canManageWorkspaceSettings, canManageRoster } = usePermissions()
  const canEditShift = canManageRoster
  const { settings: rosterSettings } = useRosterSettings()

  const [title, setTitle] = useState("")
  const [sessionType, setSessionType] = useState("none")
  const [staffId, setStaffId] = useState("")
  const [clientId, setClientId] = useState("")
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("12:00")
  const [notes, setNotes] = useState("")
  const [adminNotes, setAdminNotes] = useState("")
  const [location, setLocation] = useState("")
  const [chargeTypes, setChargeTypes] = useState<string[]>([])
  const [goalId, setGoalId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<ShiftDropdown>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isStringShift, setIsStringShift] = useState(false)
  const [startTimeFocused, setStartTimeFocused] = useState(false)
  const [endTimeFocused, setEndTimeFocused] = useState(false)
  const [activeTab, setActiveTab] = useState<"details" | "note">("details")
  const [noteDraft, setNoteDraft] = useState<ProgressNoteDraft>(EMPTY_PROGRESS_NOTE_DRAFT)
  const [isSavingNote, setIsSavingNote] = useState(false)

  const clientBtnRef = useRef<HTMLButtonElement>(null)
  const staffBtnRef = useRef<HTMLButtonElement>(null)
  const dateBtnRef = useRef<HTMLButtonElement>(null)
  const startTimeInputRef = useRef<HTMLInputElement>(null)
  const endTimeInputRef = useRef<HTMLInputElement>(null)
  const sessionTypeBtnRef = useRef<HTMLButtonElement>(null)
  const chargeBtnRef = useRef<HTMLButtonElement>(null)
  const goalBtnRef = useRef<HTMLButtonElement>(null)
  const pendingStringIdRef = useRef<string | null>(null)

  const isEditing = Boolean(shift)
  const isCancelledShift = shift ? isShiftCancelled(shift) : false
  const showNoteTab = isEditing && !isCancelledShift
  const hasSavedNote = Boolean(shift?.progressNote)
  const isAddingStringPart = Boolean(!isEditing && defaults?.shiftStringId)
  const hasStringLink = Boolean(shift?.shiftStringId || defaults?.shiftStringId || isStringShift)
  const activeStringId = shift?.shiftStringId ?? defaults?.shiftStringId ?? null
  const stringParts = useMemo(() => {
    if (!activeStringId) return []
    return sortShiftsBySchedule(shifts.filter((entry) => entry.shiftStringId === activeStringId))
  }, [activeStringId, shifts])
  const showStringPartsDropdown = Boolean(activeStringId && (stringParts.length > 0 || isAddingStringPart))
  const previousStringPart = useMemo(() => {
    if (!defaults?.shiftStringId || defaults.shiftStringOrder === undefined) return null
    return sortShiftsBySchedule(
      shifts.filter((entry) => entry.shiftStringId === defaults.shiftStringId)
    ).find((entry) => entry.shiftStringOrder === defaults.shiftStringOrder! - 1) ?? null
  }, [defaults?.shiftStringId, defaults?.shiftStringOrder, shifts])

  const selectedClient = useMemo(
    () => activeClients.find((client) => client.id === clientId),
    [activeClients, clientId]
  )

  const selectedStaff = useMemo(
    () => activeStaff.find((member) => member.id === staffId),
    [activeStaff, staffId]
  )

  const getChargeLabel = useCallback(
    (itemNumber: string) => {
      const charge = enabledCharges.find((entry) => entry.itemNumber === itemNumber)
      return charge?.shortName || charge?.itemNumber || itemNumber
    },
    [enabledCharges]
  )

  const availableCharges = useMemo(
    () => enabledCharges.filter((charge) => !chargeTypes.includes(charge.itemNumber)),
    [chargeTypes, enabledCharges]
  )

  const selectedClientRecord = useMemo(
    () => clients.find((client) => client.id === clientId),
    [clientId, clients]
  )

  const clientGoals = useMemo(
    () => selectedClientRecord?.participant.goals ?? [],
    [selectedClientRecord]
  )

  const selectedGoal = useMemo(
    () => clientGoals.find((goal) => goal.id === goalId) ?? null,
    [clientGoals, goalId]
  )

  const clientOptions = useMemo(
    () => activeClients.map((client) => {
      const disallowed = staffId ? isDisallowed(staffId, client.id) : false
      return {
        id: client.id,
        label: client.displayName,
        iconText: client.iconText,
        ...(disallowed
          ? {
              badge: "Disallowed",
              badgeClassName: suitabilityStatusConfig.disallowed.chipClassName,
            }
          : {}),
      }
    }),
    [activeClients, isDisallowed, staffId]
  )

  const staffOptions = useMemo(
    () => activeStaff.map((member) => {
      const disallowed = clientId ? isDisallowed(member.id, clientId) : false
      return {
        id: member.id,
        label: member.name,
        iconText: member.iconText,
        ...(disallowed
          ? {
              badge: "Disallowed",
              badgeClassName: suitabilityStatusConfig.disallowed.chipClassName,
            }
          : {}),
      }
    }),
    [activeStaff, clientId, isDisallowed]
  )

  const sessionTypeOptions = useMemo(() => {
    const options = [...rosterSettings.sessionTypes]
    if (sessionType && !options.some((item) => item.id === sessionType)) {
      options.push({
        id: sessionType,
        label: getSessionTypeLabel(sessionType),
        tone: getSessionTypeTone(sessionType, rosterSettings.sessionTypes),
      })
    }
    return options
  }, [rosterSettings.sessionTypes, sessionType])

  const normalizedStartTime = useMemo(() => normalizeTimeInput(startTime), [startTime])
  const normalizedEndTime = useMemo(() => normalizeTimeInput(endTime), [endTime])

  const endTimeMinMinutes = useMemo(() => {
    const startMinutes = timeToMinutes(normalizedStartTime)
    if (Number.isNaN(startMinutes)) return undefined
    return startMinutes + 15
  }, [normalizedStartTime])

  const startTimeInputValue =
    startTimeFocused || activeDropdown === "startTime"
      ? startTime
      : normalizedStartTime
        ? formatTimeLabel(normalizedStartTime)
        : startTime

  const endTimeInputValue =
    endTimeFocused || activeDropdown === "endTime"
      ? endTime
      : normalizedEndTime
        ? formatTimeLabel(normalizedEndTime)
        : endTime

  const commitStartTimeInput = () => {
    const normalized = normalizeTimeInput(startTime)
    if (normalized) handleStartTimeChange(normalized)
  }

  const commitEndTimeInput = () => {
    const normalized = normalizeTimeInput(endTime)
    if (normalized) setEndTime(normalized)
  }

  const handleStartTimeChange = (nextStartTime: string) => {
    setStartTime(nextStartTime)

    const nextStartMinutes = timeToMinutes(nextStartTime)
    const currentEndMinutes = timeToMinutes(normalizedEndTime)
    if (currentEndMinutes <= nextStartMinutes) {
      setEndTime(minutesToTime(Math.min(nextStartMinutes + 60, getDayViewEndHour() * 60)))
    }
  }

  const handleDateChange = (nextDate: string) => {
    setDate(nextDate)

    if (!isAddingStringPart || !previousStringPart) return

    if (isNextDayStringPart(previousStringPart, nextDate)) {
      const { startTime: defaultStartTime, endTime: defaultEndTime } = getNextDayStringPartDefaultTimes()
      setStartTime(defaultStartTime)
      setEndTime(defaultEndTime)
      return
    }

    if (nextDate === previousStringPart.date) {
      const startMinutes = timeToMinutes(previousStringPart.endTime)
      setStartTime(normalizeTimeInput(previousStringPart.endTime))
      setEndTime(minutesToTime(Math.min(startMinutes + 60, getDayViewEndHour() * 60)))
    }
  }

  useEffect(() => {
    if (!isOpen) return

    const nextDate = shift?.date ?? defaults?.date ?? ""
    let nextStart = normalizeTimeInput(shift?.startTime ?? defaults?.startTime ?? "09:00")
    let nextEnd = normalizeTimeInput(shift?.endTime ?? defaults?.endTime ?? "12:00")

    if (!shift && defaults?.shiftStringId && defaults.shiftStringOrder !== undefined) {
      const previousPart =
        sortShiftsBySchedule(shifts.filter((entry) => entry.shiftStringId === defaults.shiftStringId)).find(
          (entry) => entry.shiftStringOrder === defaults.shiftStringOrder! - 1
        ) ?? null

      if (previousPart && nextDate > previousPart.date) {
        const startMinutes = timeToMinutes(nextStart)
        const endMinutes = timeToMinutes(nextEnd)
        const inheritedSameDayStart = nextStart === normalizeTimeInput(previousPart.endTime)

        if (inheritedSameDayStart || Number.isNaN(startMinutes) || Number.isNaN(endMinutes) || endMinutes <= startMinutes) {
          const nextDayDefaults = getNextDayStringPartDefaultTimes()
          nextStart = nextDayDefaults.startTime
          nextEnd = nextDayDefaults.endTime
        }
      }
    }

    setTitle(shift?.title ?? "")
    setSessionType(resolveSessionType(shift?.sessionType, rosterSettings.sessionTypes))
    setStaffId(shift?.staffId ?? defaults?.staffId ?? activeStaff[0]?.id ?? "")
    setClientId(shift?.clientId ?? defaults?.clientId ?? activeClients[0]?.id ?? "")
    setDate(nextDate)
    setStartTime(nextStart)
    setEndTime(nextEnd)
    setNotes(shift?.notes ?? "")
    setAdminNotes(shift?.adminNotes ?? "")
    setLocation(shift?.location ?? "")
    setChargeTypes(normalizeShiftChargeTypes(shift?.chargeTypes))
    setIsStringShift(Boolean(shift?.shiftStringId || defaults?.shiftStringId))
    pendingStringIdRef.current = shift?.shiftStringId ?? defaults?.shiftStringId ?? null
    setGoalId("")
    setError(null)
    setActiveDropdown(null)
    // Non-admins can't edit details, so open them straight on the note tab.
    const canShowNote = Boolean(shift) && !(shift ? isShiftCancelled(shift) : false)
    setActiveTab(!canEditShift && canShowNote ? "note" : "details")
    setNoteDraft(
      shift?.progressNote
        ? {
            supportProvided: shift.progressNote.supportProvided,
            goalProgress: shift.progressNote.goalProgress,
            observations: shift.progressNote.observations,
            concerns: shift.progressNote.concerns,
            incidentOccurred: shift.progressNote.incidentOccurred,
            followUp: shift.progressNote.followUp,
            signature: shift.progressNote.signature,
          }
        : EMPTY_PROGRESS_NOTE_DRAFT
    )

    const initialClientId = shift?.clientId ?? defaults?.clientId ?? activeClients[0]?.id ?? ""
    if (shift?.id && initialClientId) {
      const client = clients.find((item) => item.id === initialClientId)
      setGoalId(findAttachedGoalId(client, shift.id) ?? "")
    }
  }, [activeClients, activeStaff, canEditShift, clients, defaults, isOpen, rosterSettings.sessionTypes, shift, shifts])

  useEffect(() => {
    if (!isOpen || !goalId) return
    if (!clientGoals.some((goal) => goal.id === goalId)) setGoalId("")
  }, [clientGoals, goalId, isOpen])

  useEffect(() => {
    if (!isOpen) return
    setSessionType((current) => resolveSessionType(current, rosterSettings.sessionTypes))
  }, [isOpen, rosterSettings.sessionTypes])

  useEffect(() => {
    if (!isOpen || isEditing || !onDraftChange) return
    onDraftChange({ staffId, clientId, date, startTime, endTime })
  }, [clientId, date, endTime, isEditing, isOpen, onDraftChange, staffId, startTime])

  const resolveStringFields = useCallback((): { shiftStringId: string | null; shiftStringOrder: number } => {
    const activeString = isStringShift || Boolean(shift?.shiftStringId) || Boolean(defaults?.shiftStringId)
    if (!activeString) {
      pendingStringIdRef.current = null
      return { shiftStringId: null, shiftStringOrder: 0 }
    }

    const stringId =
      shift?.shiftStringId ??
      defaults?.shiftStringId ??
      pendingStringIdRef.current ??
      (pendingStringIdRef.current = createShiftStringId())

    if (shift?.shiftStringId) {
      return { shiftStringId: shift.shiftStringId, shiftStringOrder: shift.shiftStringOrder }
    }

    const order =
      defaults?.shiftStringOrder ??
      (isStringShift && !defaults?.shiftStringId ? 0 : getNextStringOrder(shifts, stringId))

    return { shiftStringId: stringId, shiftStringOrder: order }
  }, [defaults?.shiftStringId, defaults?.shiftStringOrder, isStringShift, shift, shifts])

  const input = useMemo<RosterShiftInput>(() => {
    const stringFields = resolveStringFields()
    return {
      staffId,
      clientId,
      date,
      startTime,
      endTime,
      title,
      sessionType,
      notes,
      location,
      chargeTypes,
      ...(canManageWorkspaceSettings ? { adminNotes } : {}),
      status: shift?.status ?? "scheduled",
      ...stringFields,
    }
  }, [
    adminNotes,
    canManageWorkspaceSettings,
    chargeTypes,
    clientId,
    date,
    endTime,
    location,
    notes,
    resolveStringFields,
    sessionType,
    shift?.status,
    staffId,
    startTime,
    title,
  ])

  const durationLabel = useMemo(() => formatDuration(startTime, endTime), [endTime, startTime])

  const issueDescriptions = useMemo(() => {
    const conflicts = getShiftIssueDescriptions(shifts, { ...input, id: shift?.id })
    const complianceIssues = getShiftComplianceIssues(
      { ...input, id: shift?.id, progressNote: shift?.progressNote ?? undefined },
      {
        shifts,
        staff: selectedStaff,
        client: selectedClient ?? clients.find((c) => c.id === clientId),
        enabledCharges,
        isDisallowedPair: staffId && clientId ? isDisallowed(staffId, clientId) : false,
        compliance: rosterSettings.compliance,
      },
    )
    return [...conflicts, ...complianceIssuesToMessages(complianceIssues)]
  }, [
    shifts,
    input,
    shift?.id,
    shift?.progressNote,
    selectedStaff,
    selectedClient,
    clients,
    clientId,
    enabledCharges,
    staffId,
    isDisallowed,
    rosterSettings.compliance,
  ])

  const blockingComplianceIssues = useMemo(
    () =>
      getShiftComplianceIssues(
        { ...input, id: shift?.id, progressNote: shift?.progressNote ?? undefined },
        {
          shifts,
          staff: selectedStaff,
          client: selectedClient ?? clients.find((c) => c.id === clientId),
          enabledCharges,
          isDisallowedPair: staffId && clientId ? isDisallowed(staffId, clientId) : false,
          compliance: rosterSettings.compliance,
        },
      ),
    [
      shifts,
      input,
      shift?.id,
      shift?.progressNote,
      selectedStaff,
      selectedClient,
      clients,
      clientId,
      enabledCharges,
      staffId,
      isDisallowed,
      rosterSettings.compliance,
    ],
  )

  const hasBlockingIssues = hasBlockingComplianceIssues(blockingComplianceIssues)

  const handleSave = async (options?: { continueString?: boolean }) => {
    if (!canEditShift) return
    const validationError = validateShiftInput(input)
    if (validationError) {
      setError(validationError)
      return
    }

    if (hasBlockingIssues) {
      setError(blockingComplianceIssues.filter((i) => i.level === "block").map((i) => i.message).join(" "))
      return
    }

    setIsSaving(true)
    setError(null)

    const stringFields = resolveStringFields()
    const payload = {
      ...input,
      ...stringFields,
      startTime: normalizeTimeInput(input.startTime),
      endTime: normalizeTimeInput(input.endTime),
    }

    let savedShift: RosterShift | null = null

    if (isEditing && shift) {
      const success = await updateShift(shift.id, payload)
      if (!success) {
        setIsSaving(false)
        setError("Unable to save shift. Try again.")
        return
      }
      savedShift = { ...shift, ...payload, id: shift.id }
    } else {
      if (defaults?.linkAnchorShiftId && stringFields.shiftStringId) {
        const anchor = shifts.find((entry) => entry.id === defaults.linkAnchorShiftId)
        if (anchor && !anchor.shiftStringId) {
          const linked = await updateShift(anchor.id, {
            shiftStringId: stringFields.shiftStringId,
            shiftStringOrder: 0,
          })
          if (!linked) {
            setIsSaving(false)
            setError("Unable to link shift to string. Try again.")
            return
          }
        }
      }

      const created = await addShift(payload)
      if (!created) {
        setIsSaving(false)
        setError("Unable to save shift. Try again.")
        return
      }
      savedShift = created
    }

    if (savedShift && clientId) {
      await syncShiftGoalLink({
        clients,
        targetClientId: clientId,
        previousClientId: shift?.clientId,
        shiftId: savedShift.id,
        goalId: goalId || null,
        snapshot: buildShiftGoalSnapshot({
          id: savedShift.id,
          title: payload.title ?? "",
          date: payload.date,
          startTime: payload.startTime,
          endTime: payload.endTime,
          status: shift?.status ?? "scheduled",
        }),
        updateClient,
      })
    }

    setIsSaving(false)
    toast(isEditing ? "Shift updated" : "Shift created", "success")

    if (!isEditing && options?.continueString && savedShift.shiftStringId) {
      onContinueString?.(buildStringSegmentDefaults(savedShift, shifts))
      return
    }

    onClose()
  }

  const handleAddNextStringPart = async () => {
    if (!shift || !onContinueString) return

    let anchorShift = shift

    if (!shift.shiftStringId) {
      if (!isStringShift) {
        setError("Enable string shift to link this shift and add another part.")
        return
      }

      const validationError = validateShiftInput(input)
      if (validationError) {
        setError(validationError)
        return
      }

      const stringFields = resolveStringFields()
      const payload = {
        ...input,
        ...stringFields,
        startTime: normalizeTimeInput(input.startTime),
        endTime: normalizeTimeInput(input.endTime),
      }

      setIsSaving(true)
      setError(null)
      const success = await updateShift(shift.id, payload)
      setIsSaving(false)

      if (!success) {
        setError("Unable to save shift. Try again.")
        return
      }

      anchorShift = { ...shift, ...payload, id: shift.id }
      toast("Shift linked to string", "success")
    }

    onContinueString(buildStringSegmentDefaults(anchorShift, shifts))
  }

  const handleSaveNote = async () => {
    if (!shift) return

    if (!noteDraft.supportProvided.trim()) {
      setError("Describe the support provided before saving the shift note.")
      return
    }

    setIsSavingNote(true)
    setError(null)

    const now = new Date().toISOString()
    const note: ShiftProgressNote = {
      supportProvided: noteDraft.supportProvided.trim(),
      goalProgress: noteDraft.goalProgress.trim(),
      observations: noteDraft.observations.trim(),
      concerns: noteDraft.concerns.trim(),
      incidentOccurred: noteDraft.incidentOccurred,
      followUp: noteDraft.followUp.trim(),
      signature: noteDraft.signature,
      authorStaffId: shift.staffId || null,
      authorName: shift.progressNote?.authorName || currentUserName,
      recordedAt: shift.progressNote?.recordedAt || now,
      updatedAt: now,
    }

    const success = await updateShiftProgressNote(shift.id, note)
    setIsSavingNote(false)

    if (!success) {
      setError("Unable to save shift note. Try again.")
      return
    }

    toast(hasSavedNote ? "Shift note updated" : "Shift note saved", "success")
    onClose()
  }

  const handleDelete = async () => {
    if (!shift || !canEditShift) return

    const client = clients.find((item) => item.id === shift.clientId)
    if (client) {
      await updateClient(shift.clientId, {
        participant: {
          ...client.participant,
          goals: removeShiftFromGoals(client.participant.goals ?? [], shift.id),
        },
      })
    }

    await deleteShift(shift.id)
    toast("Shift deleted", "success")
    setIsDeleteOpen(false)
    onClose()
  }

  const handleDuplicate = async () => {
    if (!shift || !canEditShift) return
    const created = await duplicateShift(shift.id)
    if (!created) {
      toast("Unable to duplicate shift", "error")
      return
    }
    toast("Shift copied", "success")
    onClose()
  }

  const handleMarkComplete = async () => {
    if (!shift || !canEditShift || isCancelledShift) return

    const completeIssues = getShiftComplianceIssues(
      { ...input, id: shift.id, progressNote: shift.progressNote ?? undefined },
      {
        shifts,
        staff: selectedStaff,
        client: selectedClient ?? clients.find((c) => c.id === clientId),
        enabledCharges,
        isDisallowedPair: staffId && clientId ? isDisallowed(staffId, clientId) : false,
        targetStatus: "completed",
        compliance: rosterSettings.compliance,
      },
    )

    if (hasBlockingComplianceIssues(completeIssues)) {
      setError(completeIssues.filter((i) => i.level === "block").map((i) => i.message).join(" "))
      if (rosterSettings.compliance.progressNoteOnComplete !== "off" && !shift.progressNote?.supportProvided?.trim()) {
        setActiveTab("note")
      }
      return
    }

    setIsSaving(true)
    const success = await updateShift(shift.id, { status: "completed" })
    setIsSaving(false)

    if (!success) {
      setError("Unable to mark shift complete.")
      return
    }

    toast("Shift marked complete", "success")
    onClose()
  }

  const handleExportSupportLog = () => {
    if (!shift) return
    const client = clients.find((c) => c.id === shift.clientId)
    downloadSupportLog(shift, client)
    toast("Support log downloaded", "success")
  }

  const handleCancelShift = async (cancelledBy: "client" | "organisation", cancellationReason: string) => {
    if (!shift) return

    setIsCancelling(true)
    const success = await updateShift(shift.id, {
      status: "cancelled",
      cancelledBy,
      cancellationReason,
    })
    setIsCancelling(false)

    if (!success) {
      toast("Unable to cancel shift", "error")
      return
    }

    toast("Shift cancelled", "success")
    const suggestion = getCancellationClaimSuggestion(cancelledBy, shift)
    if (suggestion) toast(suggestion, "info")
    setIsCancelOpen(false)
    onClose()
  }

  const handleSelectStringPart = (part: RosterShift) => {
    if (part.id === shift?.id) return
    onSelectShift?.(part)
  }

  if (!isOpen) return null

  const formattedDate = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
    : "Empty"

  return (
    <>
      <FormModal onClose={onClose} width={PANEL_WIDTH} position="right">
        <div className="shrink-0 bg-white">
          <div className="flex items-start justify-between gap-[12px] px-[24px] pb-[14px] pt-[20px]">
            <h2 className="min-w-0 text-[18px] font-semibold leading-tight text-folk-text">
              {isEditing ? (shift?.title.trim() || "Shift") : "New shift"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="-mr-[6px] -mt-[2px] flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
              tabIndex={0}
              aria-label="Close shift"
            >
              <X className="h-[16px] w-[16px]" strokeWidth={1.5} />
            </button>
          </div>

          {showNoteTab && (
            <div className={profilePageTabRowClass("h-[40px] border-b-0")}>
              <div className={profileMainTabScrollClass("h-full w-full px-[12px]")}>
                {(
                  [
                    { id: "details" as const, label: "Details" },
                    { id: "note" as const, label: hasSavedNote ? "Shift note" : "Add note" },
                  ] as const
                ).map(({ id, label }) => (
                  <ProfileTabButton
                    key={id}
                    isActive={activeTab === id}
                    onClick={() => {
                      setActiveTab(id)
                      setError(null)
                      setActiveDropdown(null)
                    }}
                    label={label}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-[24px] py-[14px]">
            {error && (
              <div className="mb-[14px] rounded-[6px] border border-red-200 bg-red-50 px-[12px] py-[10px] text-[12px] font-medium text-red-600">
                {error}
              </div>
            )}

            {activeTab === "note" && shift ? (
              <ShiftProgressNoteEditor
                value={noteDraft}
                onChange={setNoteDraft}
                clientName={selectedClient?.displayName ?? shift.clientName}
                goalTitle={selectedGoal?.title}
                authorName={shift.progressNote?.authorName}
                recordedAt={shift.progressNote?.recordedAt}
              />
            ) : (
              <>
            {issueDescriptions.length > 0 && !isCancelledShift && (
              <div className="mb-[14px] rounded-[6px] border border-amber-200 bg-amber-50 px-[12px] py-[10px]">
                <div className="flex items-start gap-[8px]">
                  <AlertTriangle className="mt-[1px] h-[14px] w-[14px] shrink-0 text-amber-600" strokeWidth={2} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-amber-900">Scheduling & compliance</p>
                    <ul className="mt-[6px] space-y-[4px]">
                      {issueDescriptions.map((description) => (
                        <li key={description} className="text-[12px] font-medium leading-snug text-amber-800">
                          {description}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-[8px] text-[11px] font-medium text-amber-700">
                      You can still save this shift.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isCancelledShift && shift && (
              <div className="mb-[14px] rounded-[6px] border border-[#cbd5e1] bg-[repeating-linear-gradient(-45deg,#f8fafc_0px,#f8fafc_8px,#eef2f7_8px,#eef2f7_16px)] px-[12px] py-[10px]">
                <p className="text-[12px] font-semibold text-[#64748b]">Cancelled shift</p>
                {shift.cancelledBy && (
                  <p className="mt-[4px] text-[12px] font-medium text-folk-secondary">
                    {getShiftCancelledByLabel(shift.cancelledBy)}
                  </p>
                )}
                {shift.cancellationReason && (
                  <p className="mt-[6px] text-[12px] leading-snug text-folk-secondary">
                    {shift.cancellationReason}
                  </p>
                )}
              </div>
            )}

            {showStringPartsDropdown && (
              <StringShiftPartsTabBar
                parts={stringParts}
                activeShiftId={shift?.id}
                isAddingNewPart={isAddingStringPart}
                onSelectPart={handleSelectStringPart}
                onAddPart={isEditing && onContinueString && hasStringLink && !isAddingStringPart ? handleAddNextStringPart : undefined}
                isAddingPart={isSaving}
              />
            )}

            <fieldset disabled={!canEditShift} className="m-0 min-w-0 space-y-[14px] border-0 p-0">
              <div>
                <label className={FORM_LABEL_CLASS} htmlFor="shift-title">
                  Title
                </label>
                <input
                  id="shift-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Morning community access"
                  className={FORM_INPUT_CLASS}
                />
              </div>

              <div>
                <span className={FORM_LABEL_CLASS}>Tag</span>
                <button
                  ref={sessionTypeBtnRef}
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === "sessionType" ? null : "sessionType")}
                  className="flex h-[38px] w-full items-center justify-between gap-[8px] rounded-[6px] border border-folk-border bg-white px-[12px] text-[13px] font-medium outline-none transition-colors hover:border-[#bababa] focus:border-[#a3c4f3]"
                  tabIndex={0}
                  aria-expanded={activeDropdown === "sessionType"}
                >
                  <span className="flex min-w-0 items-center gap-[8px]">
                    <ShiftTagColorSwatch tone={getSessionTypeTone(sessionType, rosterSettings.sessionTypes)} />
                    <span className={getShiftSessionTypeChipClasses(sessionType, rosterSettings.sessionTypes, "sm")}>
                      {getSessionTypeLabel(sessionType, rosterSettings.sessionTypes)}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform",
                      activeDropdown === "sessionType" && "rotate-180"
                    )}
                    strokeWidth={1.5}
                  />
                </button>
              </div>

              <div className="border-t border-folk-border-subtle pt-[14px]">
                <div className="mb-[14px] text-[11px] font-semibold uppercase tracking-[0.08em] text-folk-placeholder">
                  Schedule
                </div>
                <div className="flex flex-col gap-[14px]">
              <PropertyRow label="Client">
                <button
                  ref={clientBtnRef}
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === "client" ? null : "client")}
                  className={VALUE_BUTTON_CLASS}
                  tabIndex={0}
                >
                  {selectedClient ? (
                    <>
                      <EntityIcon text={selectedClient.iconText} size="sm" />
                      <span className="truncate text-[13px] font-medium text-folk-text">
                        {selectedClient.displayName}
                      </span>
                      {staffId && isDisallowed(staffId, selectedClient.id) && <SuitabilityDisallowedChip />}
                    </>
                  ) : (
                    <>
                      <Building2 className="h-[13px] w-[13px] shrink-0 text-[#ccc]" strokeWidth={1.5} />
                      <span className="text-[13px] font-medium text-[#ccc]">Empty</span>
                    </>
                  )}
                </button>
              </PropertyRow>

              <PropertyRow label="Staff">
                <button
                  ref={staffBtnRef}
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === "staff" ? null : "staff")}
                  className={VALUE_BUTTON_CLASS}
                  tabIndex={0}
                >
                  {selectedStaff ? (
                    <>
                      <EntityIcon text={selectedStaff.iconText} size="sm" />
                      <span className="truncate text-[13px] font-medium text-folk-text">
                        {selectedStaff.name}
                      </span>
                      {clientId && isDisallowed(selectedStaff.id, clientId) && <SuitabilityDisallowedChip />}
                    </>
                  ) : (
                    <>
                      <User className="h-[13px] w-[13px] shrink-0 text-[#ccc]" strokeWidth={1.5} />
                      <span className="text-[13px] font-medium text-[#ccc]">Empty</span>
                    </>
                  )}
                </button>
              </PropertyRow>

              <PropertyRow label="Date">
                <button
                  ref={dateBtnRef}
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === "date" ? null : "date")}
                  className={VALUE_BUTTON_CLASS}
                  tabIndex={0}
                  aria-expanded={activeDropdown === "date"}
                >
                  <CalendarDays
                    className={cn("h-[13px] w-[13px] shrink-0", date ? "text-folk-secondary" : "text-[#ccc]")}
                    strokeWidth={1.5}
                  />
                  <span className={cn("truncate text-[13px] font-medium", date ? "text-folk-text" : "text-[#ccc]")}>
                    {formattedDate}
                  </span>
                </button>
              </PropertyRow>

              <PropertyRow label="Start">
                <div className={VALUE_BUTTON_CLASS}>
                  <Clock
                    className={cn("h-[13px] w-[13px] shrink-0", normalizedStartTime ? "text-folk-secondary" : "text-[#ccc]")}
                    strokeWidth={1.5}
                  />
                  <input
                    ref={startTimeInputRef}
                    type="text"
                    value={startTimeInputValue}
                    onChange={(event) => setStartTime(event.target.value)}
                    onFocus={() => {
                      setStartTimeFocused(true)
                      if (normalizedStartTime) setStartTime(normalizedStartTime)
                      setActiveDropdown("startTime")
                    }}
                    onBlur={() => {
                      setStartTimeFocused(false)
                      commitStartTimeInput()
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitStartTimeInput()
                        setActiveDropdown(null)
                      }
                      if (event.key === "Escape") setActiveDropdown(null)
                    }}
                    placeholder="9:00 am"
                    className={INLINE_INPUT_CLASS}
                    aria-expanded={activeDropdown === "startTime"}
                    aria-label="Start time"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="End">
                <div className={VALUE_BUTTON_CLASS}>
                  <Clock
                    className={cn("h-[13px] w-[13px] shrink-0", normalizedEndTime ? "text-folk-secondary" : "text-[#ccc]")}
                    strokeWidth={1.5}
                  />
                  <input
                    ref={endTimeInputRef}
                    type="text"
                    value={endTimeInputValue}
                    onChange={(event) => setEndTime(event.target.value)}
                    onFocus={() => {
                      setEndTimeFocused(true)
                      if (normalizedEndTime) setEndTime(normalizedEndTime)
                      setActiveDropdown("endTime")
                    }}
                    onBlur={() => {
                      setEndTimeFocused(false)
                      commitEndTimeInput()
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitEndTimeInput()
                        setActiveDropdown(null)
                      }
                      if (event.key === "Escape") setActiveDropdown(null)
                    }}
                    placeholder="12:00 pm"
                    className={INLINE_INPUT_CLASS}
                    aria-expanded={activeDropdown === "endTime"}
                    aria-label="End time"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Duration">
                <div className="flex min-w-0 items-center gap-[7px] px-[8px] py-[6px]">
                  <Clock
                    className={cn("h-[13px] w-[13px] shrink-0", durationLabel !== "Empty" ? "text-folk-secondary" : "text-[#ccc]")}
                    strokeWidth={1.5}
                  />
                  <span className={cn("text-[13px] font-medium", durationLabel !== "Empty" ? "text-folk-text" : "text-[#ccc]")}>
                    {durationLabel}
                  </span>
                </div>
              </PropertyRow>

              <PropertyRow label="Billables" align="start">
                <div className="flex min-w-0 flex-wrap items-center gap-[6px] px-[8px] py-[6px]">
                  {chargeTypes.map((itemNumber) => (
                    <span
                      key={itemNumber}
                      className="inline-flex max-w-full items-center gap-[4px] rounded-[6px] bg-[var(--folk-border-subtle)] py-[3px] pl-[8px] pr-[4px] text-[12px] font-semibold text-[#555]"
                    >
                      <span className="truncate">{getChargeLabel(itemNumber)}</span>
                      <button
                        type="button"
                        onClick={() => setChargeTypes((current) => current.filter((item) => item !== itemNumber))}
                        className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full text-folk-secondary transition-colors hover:text-folk-text"
                        tabIndex={0}
                        aria-label={`Remove ${getChargeLabel(itemNumber)}`}
                      >
                        <X className="h-[11px] w-[11px]" strokeWidth={2} />
                      </button>
                    </span>
                  ))}

                  <button
                    ref={chargeBtnRef}
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "charge" ? null : "charge")}
                    disabled={availableCharges.length === 0}
                    className={cn(
                      "inline-flex items-center gap-[4px] rounded-[6px] border border-dashed border-[#bababa] px-[8px] py-[4px] text-[12px] font-medium text-folk-secondary transition-colors hover:border-[#bbb] hover:text-folk-secondary",
                      availableCharges.length === 0 && "cursor-not-allowed opacity-50 hover:border-[#bababa] hover:text-folk-secondary"
                    )}
                    tabIndex={0}
                    aria-expanded={activeDropdown === "charge"}
                    aria-label={chargeTypes.length === 0 ? "Add billable" : "Add another billable"}
                  >
                    {chargeTypes.length === 0 ? (
                      <>
                        <Tag className="h-[13px] w-[13px] shrink-0 text-[#ccc]" strokeWidth={1.5} />
                        <span className="text-[13px] font-medium text-[#ccc]">Empty</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-[12px] w-[12px] shrink-0" strokeWidth={2} />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              </PropertyRow>

              <PropertyRow label="Goal">
                <button
                  ref={goalBtnRef}
                  type="button"
                  onClick={() => {
                    if (!clientId) return
                    setActiveDropdown(activeDropdown === "goal" ? null : "goal")
                  }}
                  disabled={!clientId}
                  className={cn(VALUE_BUTTON_CLASS, !clientId && "cursor-not-allowed opacity-60")}
                  tabIndex={0}
                  aria-expanded={activeDropdown === "goal"}
                >
                  {selectedGoal ? (
                    <>
                      <Target className="h-[13px] w-[13px] shrink-0 text-[#2563EB]" strokeWidth={1.5} />
                      <span className="truncate text-[13px] font-medium text-folk-text">
                        {selectedGoal.title || "Untitled goal"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Target className="h-[13px] w-[13px] shrink-0 text-[#ccc]" strokeWidth={1.5} />
                      <span className="text-[13px] font-medium text-[#ccc]">
                        {!clientId ? "Select client first" : "Empty"}
                      </span>
                    </>
                  )}
                </button>
              </PropertyRow>

              <PropertyRow label="Location">
                <InlineField icon={MapPin} hasValue={Boolean(location.trim())}>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Empty"
                    className={INLINE_INPUT_CLASS}
                  />
                </InlineField>
              </PropertyRow>
                </div>
              </div>

              <div>
                <label className={FORM_LABEL_CLASS} htmlFor="shift-plan">
                  Session plan
                </label>
                <textarea
                  id="shift-plan"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="What will be worked on during this shift?"
                  className={FORM_TEXTAREA_CLASS}
                />
              </div>

              {canManageWorkspaceSettings && (
                <div>
                  <label className={FORM_LABEL_CLASS} htmlFor="shift-admin-notes">
                    Notes
                  </label>
                  <p className="mb-[6px] text-[11px] text-folk-secondary">Only visible to admins</p>
                  <textarea
                    id="shift-admin-notes"
                    value={adminNotes}
                    onChange={(event) => setAdminNotes(event.target.value)}
                    placeholder="Internal notes for coordinators and admins"
                    className={FORM_TEXTAREA_CLASS}
                  />
                </div>
              )}
            </fieldset>

            {canEditShift && !isCancelledShift && !showStringPartsDropdown && (
              <div className="mt-[18px] border-t border-folk-border-subtle pt-[14px]">
                <div className="mb-[10px] flex items-center gap-[6px]">
                  <Link2 className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={2} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-folk-placeholder">
                    String shift
                  </span>
                </div>

                {!shift?.shiftStringId && (
                  <div className="rounded-[6px] border border-folk-border-subtle bg-folk-page px-[12px] py-[10px]">
                    <label className="flex cursor-pointer items-start gap-[10px]">
                      <input
                        type="checkbox"
                        checked={isStringShift}
                        onChange={(event) => {
                          const checked = event.target.checked
                          setIsStringShift(checked)
                          if (checked && !pendingStringIdRef.current) {
                            pendingStringIdRef.current = createShiftStringId()
                          }
                          if (!checked) {
                            pendingStringIdRef.current = null
                          }
                        }}
                        className="mt-[2px] h-[14px] w-[14px] shrink-0 accent-folk-text"
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-folk-text">
                          {isEditing ? "Link as string shift" : "String shift"}
                        </span>
                        <span className="mt-[2px] block text-[12px] leading-snug text-folk-secondary">
                          {isEditing
                            ? "Turn this shift into the first part of a string, then add more tagged periods such as sleepover."
                            : "Link multiple tagged periods into one shift, such as active hours and sleepover."}
                        </span>
                      </span>
                    </label>
                  </div>
                )}

                {isEditing && onContinueString && hasStringLink && (
                  <button
                    type="button"
                    onClick={handleAddNextStringPart}
                    disabled={isSaving}
                    className="mt-[10px] flex w-full items-center justify-center gap-[6px] rounded-[6px] border border-dashed border-folk-border bg-folk-page px-[12px] py-[10px] text-[12px] font-medium text-folk-secondary transition-colors hover:border-[#bbb] hover:bg-[var(--folk-border-subtle)] disabled:opacity-50"
                    tabIndex={0}
                  >
                    <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                    {isSaving ? "Saving…" : "Add next part"}
                  </button>
                )}
              </div>
            )}
              </>
            )}

          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-[8px] border-t border-folk-border-subtle px-[24px] py-[12px]">
          <div className="flex min-w-0 items-center gap-[8px]">
            {canEditShift && isEditing && !isCancelledShift && activeTab === "details" && (
              <>
                {shift?.status !== "completed" && (
                  <button
                    type="button"
                    onClick={handleMarkComplete}
                    disabled={isSaving}
                    className="outline-btn folk-pill-btn px-[12px] py-[6px] text-[12px] font-medium disabled:opacity-50"
                    tabIndex={0}
                  >
                    Mark complete
                  </button>
                )}
                <button
                type="button"
                onClick={() => setIsCancelOpen(true)}
                disabled={isCancelling || isSaving}
                className="folk-pill-btn border border-[#fdba74] px-[12px] py-[6px] text-[12px] font-medium text-[#c2410c] transition-colors hover:bg-[#fff7ed] disabled:opacity-50"
                tabIndex={0}
              >
                Cancel shift
              </button>
              </>
            )}
            {canEditShift && isEditing && (
              <>
                <IconButton
                  type="button"
                  onClick={handleDuplicate}
                  tooltip="Copy shift"
                  className="icon-btn shrink-0"
                  tabIndex={0}
                >
                  <Copy className="h-[14px] w-[14px]" strokeWidth={1.75} />
                </IconButton>
                <IconButton
                  type="button"
                  onClick={() => setIsDeleteOpen(true)}
                  tooltip="Delete shift"
                  className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full border border-red-200 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                  tabIndex={0}
                >
                  <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
                </IconButton>
              </>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-[8px]">
            {activeTab === "note" ? (
              <>
                {rosterSettings.compliance.enableSupportLogExport && shift && (
                  <button
                    type="button"
                    onClick={handleExportSupportLog}
                    className="outline-btn folk-pill-btn px-[12px] py-[7px] text-[13px] font-medium"
                    tabIndex={0}
                  >
                    Export log
                  </button>
                )}
                <button
                type="button"
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="primary-btn folk-pill-btn px-[16px] py-[7px] text-[13px] font-medium transition-colors disabled:opacity-50"
                tabIndex={0}
              >
                {isSavingNote ? "Saving…" : "Save note"}
              </button>
              </>
            ) : canEditShift ? (
              <>
                {!isEditing && isStringShift && !isCancelledShift && (
                  <button
                    type="button"
                    onClick={() => handleSave({ continueString: true })}
                    disabled={isSaving}
                    className="folk-pill-btn rounded-full border border-[#c7d2fe] bg-[#eef2ff] px-[16px] py-[7px] text-[13px] font-medium text-[#4338ca] transition-colors hover:bg-[#e0e7ff] disabled:opacity-50"
                    tabIndex={0}
                  >
                    {isSaving ? "Saving…" : "Create & add next part"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={isSaving || isCancelledShift}
                  className="primary-btn folk-pill-btn px-[16px] py-[7px] text-[13px] font-medium transition-colors disabled:opacity-50"
                  tabIndex={0}
                >
                  {isSaving ? "Saving…" : isEditing ? "Save changes" : isStringShift ? "Create part" : "Create shift"}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </FormModal>

      <FixedDatePickerDropdown
        isOpen={activeDropdown === "date"}
        anchorRef={dateBtnRef}
        value={date}
        onChange={handleDateChange}
        onClose={() => setActiveDropdown(null)}
      />

      <FixedTimePickerDropdown
        isOpen={activeDropdown === "startTime"}
        anchorRef={startTimeInputRef}
        value={normalizedStartTime}
        onChange={handleStartTimeChange}
        onClose={() => setActiveDropdown(null)}
      />

      <FixedTimePickerDropdown
        isOpen={activeDropdown === "endTime"}
        anchorRef={endTimeInputRef}
        value={normalizedEndTime}
        onChange={setEndTime}
        onClose={() => setActiveDropdown(null)}
        minMinutes={endTimeMinMinutes}
      />

      <FixedSelectDropdown
        isOpen={activeDropdown === "sessionType"}
        anchorRef={sessionTypeBtnRef}
        onClose={() => setActiveDropdown(null)}
        estimatedHeight={sessionTypeOptions.length * 40 + 8}
      >
        {sessionTypeOptions.map((option) => (
          <FixedSelectOption
            key={option.id}
            isActive={sessionType === option.id}
            onClick={() => {
              setSessionType(option.id)
              setActiveDropdown(null)
            }}
          >
            <span className="flex min-w-0 items-center gap-[8px]">
              <ShiftTagColorSwatch tone={option.tone ?? getSessionTypeTone(option.id, rosterSettings.sessionTypes)} />
              <span className={getShiftSessionTypeChipClasses(option.id, rosterSettings.sessionTypes, "sm")}>
                {option.label}
              </span>
            </span>
          </FixedSelectOption>
        ))}
      </FixedSelectDropdown>

      <SearchableEntityDropdown
        isOpen={activeDropdown === "client"}
        anchorRef={clientBtnRef}
        options={clientOptions}
        selectedId={clientId}
        searchPlaceholder="Search clients…"
        emptyMessage="No clients found"
        onSelect={setClientId}
        onClose={() => setActiveDropdown(null)}
      />

      <SearchableEntityDropdown
        isOpen={activeDropdown === "staff"}
        anchorRef={staffBtnRef}
        options={staffOptions}
        selectedId={staffId}
        searchPlaceholder="Search staff…"
        emptyMessage="No staff found"
        onSelect={setStaffId}
        onClose={() => setActiveDropdown(null)}
      />

      <FixedSelectDropdown
        isOpen={activeDropdown === "charge"}
        anchorRef={chargeBtnRef}
        onClose={() => setActiveDropdown(null)}
        estimatedHeight={Math.min(260, availableCharges.length * 34 + 8)}
      >
        {availableCharges.length === 0 ? (
          <div className="px-[12px] py-[10px] text-[12px] text-folk-placeholder">
            {enabledCharges.length === 0 ? "No charges configured" : "All billables added"}
          </div>
        ) : (
          availableCharges.map((charge) => (
            <FixedSelectOption
              key={charge.itemNumber}
              isActive={false}
              onClick={() => {
                setChargeTypes((current) => [...current, charge.itemNumber])
                setActiveDropdown(null)
              }}
            >
              <span className="rounded-[6px] bg-[var(--folk-border-subtle)] px-[6px] py-[2px] text-[11px] font-semibold text-[#555]">
                {charge.shortName || charge.itemNumber}
              </span>
              <span className="truncate text-folk-secondary">{charge.itemNumber}</span>
            </FixedSelectOption>
          ))
        )}
      </FixedSelectDropdown>

      <FixedSelectDropdown
        isOpen={activeDropdown === "goal"}
        anchorRef={goalBtnRef}
        onClose={() => setActiveDropdown(null)}
        estimatedHeight={Math.min(260, (clientGoals.length + 1) * 40 + 8)}
      >
        <FixedSelectOption
          muted
          isActive={!goalId}
          onClick={() => {
            setGoalId("")
            setActiveDropdown(null)
          }}
        >
          None
        </FixedSelectOption>
        {clientGoals.length === 0 ? (
          <div className="px-[12px] py-[10px] text-[12px] text-folk-placeholder">
            No goals for this participant yet
          </div>
        ) : (
          clientGoals.map((goal) => (
            <FixedSelectOption
              key={goal.id}
              isActive={goalId === goal.id}
              onClick={() => {
                setGoalId(goal.id)
                setActiveDropdown(null)
              }}
            >
              <Target className="h-[13px] w-[13px] shrink-0 text-[#2563EB]" strokeWidth={1.5} />
              <span className="min-w-0 flex-1 truncate">{goal.title || "Untitled goal"}</span>
              <span className="shrink-0 text-[11px] font-medium text-folk-secondary">
                {goalTypeConfig[goal.goalType]?.label ?? goal.goalType}
              </span>
            </FixedSelectOption>
          ))
        )}
      </FixedSelectDropdown>

      <CancelShiftDialog
        isOpen={isCancelOpen}
        shift={shift ?? undefined}
        onConfirm={handleCancelShift}
        onCancel={() => setIsCancelOpen(false)}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete shift?"
        description="This shift will be permanently removed from the roster."
        confirmLabel="Delete shift"
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </>
  )
}

function formatDuration(startTime: string, endTime: string): string {
  const start = normalizeTimeInput(startTime)
  const end = normalizeTimeInput(endTime)
  if (!start || !end) return "Empty"

  const minutes = timeToMinutes(end) - timeToMinutes(start)
  if (minutes <= 0) return "Empty"

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${remainder}m`
  if (remainder === 0) return `${hours}h`
  return `${hours}h ${remainder}m`
}

function StringShiftPartsTabBar({
  parts,
  activeShiftId,
  isAddingNewPart,
  onSelectPart,
  onAddPart,
  isAddingPart,
}: {
  parts: RosterShift[]
  activeShiftId?: string
  isAddingNewPart: boolean
  onSelectPart: (part: RosterShift) => void
  onAddPart?: () => void
  isAddingPart?: boolean
}) {
  const { settings: rosterSettings } = useRosterSettings()
  const sessionTypeToneMap = useMemo(
    () => buildSessionTypeToneMap(rosterSettings.sessionTypes),
    [rosterSettings.sessionTypes]
  )

  return (
    <div
      className={profilePageTabRowClass("-mx-[24px] mb-[14px]")}
      role="tablist"
      aria-label="Shift parts"
    >
      <div className={profileMainTabScrollClass("px-[16px]")}>
        {parts.map((part) => {
          const { weekday, sessionType, sessionLabel, timeRange } = getStringPartTabMeta(part)
          const isActive = !isAddingNewPart && part.id === activeShiftId

          return (
            <ProfileTabButton
              key={part.id}
              isActive={isActive}
              onClick={() => onSelectPart(part)}
              label={formatStringPartTabLabel(part)}
            >
              <span className="inline-flex items-center gap-[6px]">
                <span className="folk-tab-label">{weekday} ·</span>
                {sessionType && sessionLabel ? (
                  <CategoryChip
                    label={sessionLabel}
                    categoryKey={sessionType}
                    toneMap={sessionTypeToneMap}
                    size="sm"
                  />
                ) : (
                  <span className="folk-tab-label">{timeRange}</span>
                )}
              </span>
            </ProfileTabButton>
          )
        })}

        {isAddingNewPart && <ProfileTabButton isActive label="New" />}

        {onAddPart && !isAddingNewPart && (
          <ProfileTabButton
            isActive={false}
            onClick={isAddingPart ? undefined : onAddPart}
            icon={Plus}
            label={isAddingPart ? "Saving…" : "Add part"}
            className={isAddingPart ? "opacity-50" : undefined}
          />
        )}
      </div>
    </div>
  )
}

function PropertyRow({
  label,
  children,
  align = "center",
}: {
  label: string
  children: ReactNode
  align?: "center" | "start"
}) {
  return (
    <FolkSidebarField label={label} align={align === "start" ? "start" : "center"}>
      {children}
    </FolkSidebarField>
  )
}

function InlineField({
  icon: Icon,
  hasValue,
  children,
}: {
  icon: typeof Clock
  hasValue: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-[7px] rounded-[6px] px-[8px] py-[6px] transition-colors hover:bg-folk-page">
      <Icon className={cn("h-[13px] w-[13px] shrink-0", hasValue ? "text-folk-secondary" : "text-[#ccc]")} strokeWidth={1.5} />
      {children}
    </div>
  )
}
