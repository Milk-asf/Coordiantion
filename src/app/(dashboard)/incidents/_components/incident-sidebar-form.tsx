"use client"

import { useEffect, useMemo, useRef, useState, type RefObject } from "react"
import { CalendarDays, ChevronDown, Clock, Download, FileText, X } from "lucide-react"
import { EntityNameRow } from "@/components/entity-name-row"
import { FileUploadControl } from "@/components/file-upload-control"
import { FixedDatePickerDropdown } from "@/components/fixed-date-picker-dropdown"
import { FixedSelectDropdown, FixedSelectOption } from "@/components/fixed-select-dropdown"
import { FixedTimePickerDropdown } from "@/components/fixed-time-picker-dropdown"
import { SearchableEntityDropdown } from "@/components/searchable-entity-dropdown"
import { Button } from "@/components/button"
import {
  formatIncidentDate,
  formatIncidentDateTime,
  formatIncidentPickerDate,
  getCurrentTimeValue,
  getDefaultReportableForCategory,
  getIncidentDisplayId,
  getIncidentStatusLabel,
  getNdisNotificationDeadlineHint,
  getNdisReportableTypeLabel,
  getTodayIsoDate,
  INCIDENT_CATEGORIES,
} from "@/lib/incident-definitions"
import type { IncidentInput } from "@/lib/hooks/use-incidents"
import { formatTimeLabel } from "@/lib/roster/week-utils"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import type { Attachment, Client, Incident, StaffMember } from "@/lib/types"
import { uploadAttachments } from "@/lib/upload-attachments"
import { cn } from "@/lib/utils"
import { EntityMultiPicker } from "./entity-multi-picker"
import { IncidentCategoryChip } from "./incident-category-chip"
import { IncidentParticipantChips, IncidentStaffChip } from "./incident-entity-chips"

// Matches the forms feature's field styling (see forms/_components/form-preview.tsx).
const PICKER_BUTTON_CLASS =
  "flex h-[38px] w-full items-center gap-[8px] rounded-[6px] border border-folk-border bg-white px-[12px] text-left text-[13px] text-folk-text transition-colors hover:border-folk-border-strong"

const SELECT_BUTTON_CLASS =
  "flex h-[38px] w-full items-center justify-between rounded-[6px] border border-folk-border bg-white px-[12px] text-left text-[13px] text-folk-text transition-colors hover:border-folk-border-strong"

type FormSelectDropdown = "category" | "emergencyServices" | "organisationNotified" | "isReportable" | "familyNotified"

const YES_NO_EMPTY_OPTIONS = [
  { value: "" as const, label: "Select" },
  { value: "no" as const, label: "No" },
  { value: "yes" as const, label: "Yes" },
]

const YES_NO_OPTIONS = [
  { value: "no" as const, label: "No" },
  { value: "yes" as const, label: "Yes" },
]

function parseIsoDate(value: string | null | undefined): string {
  if (!value) return ""
  return value.slice(0, 10)
}

function parseIsoTime(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function combineDateAndTime(date: string, time: string): string | null {
  if (!date) return null
  const safeTime = time || "00:00"
  return new Date(`${date}T${safeTime}:00`).toISOString()
}

interface IncidentFormProps {
  mode: "add" | "view" | "edit"
  layout?: "page" | "profile" | "sidebar"
  incident?: Incident | null
  clients: Client[]
  staff: StaffMember[]
  initialClientIds?: string[]
  isSaving: boolean
  onSubmit: (input: IncidentInput) => Promise<void>
  onClose: () => void
}

const emptyForm = (): IncidentInput => ({
  completedByStaffId: null,
  completedByName: "",
  reportedByStaffId: null,
  reportedByName: "",
  clientIds: [],
  clientNames: "",
  workerIds: [],
  workerNames: "",
  incidentDate: "",
  incidentStartTime: "",
  incidentEndTime: "",
  location: "",
  otherParties: "",
  category: "",
  incidentStatus: "confirmed",
  isReportable: false,
  ndisReportableCategory: null,
  description: "",
  userActivities: "",
  witnessDetails: "",
  impactDetails: "",
  actionsTaken: "",
  emergencyServicesContacted: "no",
  organisationNotified: false,
  providerAwareAt: null,
  contributingFactors: "",
  preventativeMeasures: "",
  referredToNotifier: "",
  commissionAdvisedAt: null,
  familyCarerGuardianNotified: "",
  attachments: [],
})

function incidentToForm(incident: Incident): IncidentInput {
  return {
    completedByStaffId: incident.completedByStaffId,
    completedByName: incident.completedByName,
    reportedByStaffId: incident.reportedByStaffId,
    reportedByName: incident.reportedByName,
    clientIds: incident.clientIds,
    clientNames: incident.clientNames,
    workerIds: incident.workerIds,
    workerNames: incident.workerNames,
    incidentDate: incident.incidentDate,
    incidentStartTime: incident.incidentStartTime,
    incidentEndTime: incident.incidentEndTime,
    location: incident.location,
    otherParties: incident.otherParties,
    category: incident.category,
    incidentStatus: incident.incidentStatus,
    isReportable: incident.isReportable,
    ndisReportableCategory: incident.ndisReportableCategory,
    description: incident.description,
    userActivities: incident.userActivities,
    witnessDetails: incident.witnessDetails,
    impactDetails: incident.impactDetails,
    actionsTaken: incident.actionsTaken,
    emergencyServicesContacted: incident.emergencyServicesContacted,
    organisationNotified: incident.organisationNotified,
    providerAwareAt: incident.providerAwareAt,
    contributingFactors: incident.contributingFactors,
    preventativeMeasures: incident.preventativeMeasures,
    referredToNotifier: incident.referredToNotifier,
    commissionAdvisedAt: incident.commissionAdvisedAt,
    familyCarerGuardianNotified: incident.familyCarerGuardianNotified,
    attachments: incident.attachments,
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FieldLabel({
  children,
  required = false,
  compact = false,
}: {
  children: React.ReactNode
  required?: boolean
  compact?: boolean
}) {
  return (
    <label className={cn("mb-[6px] block text-[13px] font-medium text-folk-text", compact && "mb-[4px]")}>
      {children}
      {required && <span className="ml-[2px] text-red-500">*</span>}
    </label>
  )
}

function ReadOnlyValue({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[38px] rounded-[6px] border border-folk-border bg-folk-hover px-[12px] py-[8px] text-[13px] text-folk-text">
      {children || "—"}
    </div>
  )
}

interface YesNoSelectProps {
  value: "yes" | "no"
  onChange: (value: "yes" | "no") => void
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  buttonRef: RefObject<HTMLButtonElement | null>
}

function YesNoSelect({ value, onChange, isOpen, onToggle, onClose, buttonRef }: YesNoSelectProps) {
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        className={SELECT_BUTTON_CLASS}
        aria-expanded={isOpen}
        tabIndex={0}
      >
        <span className="text-folk-text">{value === "yes" ? "Yes" : "No"}</span>
        <ChevronDown
          className={cn("ml-[8px] h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform", isOpen && "rotate-180")}
          strokeWidth={1.5}
        />
      </button>
      <FixedSelectDropdown isOpen={isOpen} anchorRef={buttonRef} onClose={onClose} estimatedHeight={88} minWidth={120}>
        {YES_NO_OPTIONS.map((option) => (
          <FixedSelectOption
            key={option.value}
            isActive={value === option.value}
            onClick={() => {
              onChange(option.value)
              onClose()
            }}
          >
            {option.label}
          </FixedSelectOption>
        ))}
      </FixedSelectDropdown>
    </>
  )
}

interface YesNoEmptySelectProps {
  value: "yes" | "no" | ""
  onChange: (value: "yes" | "no" | "") => void
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  buttonRef: RefObject<HTMLButtonElement | null>
}

function YesNoEmptySelect({ value, onChange, isOpen, onToggle, onClose, buttonRef }: YesNoEmptySelectProps) {
  const label = value === "yes" ? "Yes" : value === "no" ? "No" : "Select"

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        className={SELECT_BUTTON_CLASS}
        aria-expanded={isOpen}
        tabIndex={0}
      >
        <span className={cn(!value && "text-folk-placeholder")}>{label}</span>
        <ChevronDown
          className={cn("ml-[8px] h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform", isOpen && "rotate-180")}
          strokeWidth={1.5}
        />
      </button>
      <FixedSelectDropdown isOpen={isOpen} anchorRef={buttonRef} onClose={onClose} estimatedHeight={120} minWidth={120}>
        {YES_NO_EMPTY_OPTIONS.map((option) => (
          <FixedSelectOption
            key={option.value || "empty"}
            isActive={value === option.value}
            onClick={() => {
              onChange(option.value)
              onClose()
            }}
          >
            {option.label}
          </FixedSelectOption>
        ))}
      </FixedSelectDropdown>
    </>
  )
}

export function IncidentForm({
  mode,
  layout = "page",
  incident,
  clients,
  staff,
  initialClientIds = [],
  isSaving,
  onSubmit,
  onClose,
}: IncidentFormProps) {
  const isPageLayout = layout === "page" || layout === "profile"
  const isProfileLayout = layout === "profile"
  const isView = mode === "view"
  const isEdit = mode === "edit"
  const [form, setForm] = useState<IncidentInput>(() => incident ? incidentToForm(incident) : emptyForm())
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false)
  const uploadSessionIdRef = useRef(incident?.id ?? crypto.randomUUID())
  const [activeDropdown, setActiveDropdown] = useState<"completedBy" | "reportedBy" | null>(null)
  const [activeDateTimeDropdown, setActiveDateTimeDropdown] = useState<
    "incidentDate" | "startTime" | "commissionAdvisedDate" | "commissionAdvisedTime" | null
  >(null)
  const [activeFormSelect, setActiveFormSelect] = useState<FormSelectDropdown | null>(null)
  const [commissionAdvisedTime, setCommissionAdvisedTime] = useState(() => parseIsoTime(incident?.commissionAdvisedAt))
  const completedByRef = useRef<HTMLButtonElement>(null)
  const reportedByRef = useRef<HTMLButtonElement>(null)
  const categoryRef = useRef<HTMLButtonElement>(null)
  const emergencyServicesRef = useRef<HTMLButtonElement>(null)
  const organisationNotifiedRef = useRef<HTMLButtonElement>(null)
  const isReportableRef = useRef<HTMLButtonElement>(null)
  const familyNotifiedRef = useRef<HTMLButtonElement>(null)
  const incidentDateRef = useRef<HTMLButtonElement>(null)
  const startTimeRef = useRef<HTMLButtonElement>(null)
  const commissionAdvisedDateRef = useRef<HTMLButtonElement>(null)
  const commissionAdvisedTimeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (incident) {
      uploadSessionIdRef.current = incident.id
      setForm(incidentToForm(incident))
      setCommissionAdvisedTime(parseIsoTime(incident.commissionAdvisedAt))
      return
    }

    uploadSessionIdRef.current = crypto.randomUUID()
    setForm(emptyForm())
    setCommissionAdvisedTime("")
  }, [incident, mode])

  useEffect(() => {
    if (incident || initialClientIds.length === 0) return

    setForm((prev) => {
      if (prev.clientIds.length > 0) return prev
      const clientNames = initialClientIds
        .map((clientId) => clients.find((client) => client.id === clientId)?.displayName)
        .filter(Boolean)
        .join(", ")
      return {
        ...prev,
        clientIds: initialClientIds,
        clientNames,
      }
    })
  }, [clients, incident, initialClientIds])

  const clientOptions = useMemo(
    () => clients.map((client) => ({ id: client.id, label: client.displayName, iconText: client.iconText })),
    [clients]
  )

  const staffOptions = useMemo(
    () => staff.map((member) => ({ id: member.id, label: member.name, iconText: member.iconText })),
    [staff]
  )

  const selectedClientsLabel = useMemo(() => {
    if (form.clientIds.length === 0) return ""
    return form.clientIds
      .map((id) => clients.find((client) => client.id === id)?.displayName)
      .filter(Boolean)
      .join(", ")
  }, [clients, form.clientIds])

  const handleCategoryChange = (category: string) => {
    const defaults = getDefaultReportableForCategory(category)
    setForm((current) => ({
      ...current,
      category,
      isReportable: defaults.isReportable,
      ndisReportableCategory: defaults.ndisReportableCategory,
    }))
    setActiveFormSelect(null)
  }

  const handleReportableChange = (isReportable: boolean) => {
    setForm((current) => ({
      ...current,
      isReportable,
      ndisReportableCategory: isReportable
        ? current.ndisReportableCategory ?? getDefaultReportableForCategory(current.category).ndisReportableCategory
        : null,
    }))
    setActiveFormSelect(null)
  }

  const handleCommissionAdvisedDateChange = (date: string) => {
    setForm((current) => ({
      ...current,
      commissionAdvisedAt: combineDateAndTime(date, commissionAdvisedTime || getCurrentTimeValue()),
    }))
    setActiveDateTimeDropdown(null)
  }

  const handleCommissionAdvisedTimeChange = (time: string) => {
    setCommissionAdvisedTime(time)
    setForm((current) => ({
      ...current,
      commissionAdvisedAt: combineDateAndTime(parseIsoDate(current.commissionAdvisedAt) || getTodayIsoDate(), time),
    }))
    setActiveDateTimeDropdown(null)
  }

  const notificationDeadlineHint = getNdisNotificationDeadlineHint(form.ndisReportableCategory)
  const ndisTypeLabel = form.isReportable ? getNdisReportableTypeLabel(form.ndisReportableCategory) : ""

  const toggleFormSelect = (select: FormSelectDropdown) => {
    setActiveDropdown(null)
    setActiveDateTimeDropdown(null)
    setActiveFormSelect((current) => (current === select ? null : select))
  }

  const closeFormSelects = () => setActiveFormSelect(null)

  const handleClientChange = (clientIds: string[]) => {
    const clientNames = clientIds
      .map((id) => clients.find((client) => client.id === id)?.displayName)
      .filter(Boolean)
      .join(", ")
    setForm((current) => ({ ...current, clientIds, clientNames }))
  }

  const handleSelectStaff = (
    field: "completedByStaffId" | "reportedByStaffId",
    nameField: "completedByName" | "reportedByName",
    staffId: string,
  ) => {
    const member = staff.find((item) => item.id === staffId)
    setForm((current) => ({
      ...current,
      [field]: staffId || null,
      [nameField]: member?.name || "",
    }))
    setActiveDropdown(null)
  }

  const openIncidentDatePicker = () => {
    setActiveDropdown(null)
    closeFormSelects()
    setForm((current) => ({
      ...current,
      incidentDate: current.incidentDate || getTodayIsoDate(),
    }))
    setActiveDateTimeDropdown((current) => (current === "incidentDate" ? null : "incidentDate"))
  }

  const openStartTimePicker = () => {
    setActiveDropdown(null)
    closeFormSelects()
    setForm((current) => ({
      ...current,
      incidentStartTime: current.incidentStartTime || getCurrentTimeValue(),
    }))
    setActiveDateTimeDropdown((current) => (current === "startTime" ? null : "startTime"))
  }

  const canSubmit =
    form.incidentDate.trim().length > 0 &&
    form.category.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.actionsTaken.trim().length > 0 &&
    form.clientIds.length > 0 &&
    Boolean(form.completedByStaffId || form.completedByName.trim())

  const handleSubmit = async () => {
    if (!canSubmit || isView) return
    await onSubmit({
      ...form,
      clientNames: selectedClientsLabel,
      attachments: form.attachments ?? [],
    })
  }

  const handleAttachmentUpload = async (
    files: File[],
    signal: AbortSignal,
    onProgress: (progress: { current: number; total: number; fileName: string }) => void,
  ) => {
    if (isView) return

    const newAttachments = await uploadAttachments({
      files,
      getStoragePath: (id, file) => `incident-attachments/${uploadSessionIdRef.current}/${id}-${file.name}`,
      signal,
      onProgress,
    })

    setForm((current) => ({
      ...current,
      attachments: [...(current.attachments ?? []), ...newAttachments],
    }))
  }

  const handleRemoveAttachment = async (attachment: Attachment) => {
    if (isView) return
    if (attachment.storagePath && isSupabaseConfigured()) {
      const supabase = createClient()
      if (supabase) await supabase.storage.from("documents").remove([attachment.storagePath])
    }
    setForm((current) => ({
      ...current,
      attachments: (current.attachments ?? []).filter((item) => item.id !== attachment.id),
    }))
  }

  const attachments = form.attachments ?? []
  const fieldGap = "gap-[18px]"
  const sectionGap = isPageLayout ? "mb-[18px]" : "mb-[24px]"
  // Forms render one question per row; keep every incident form the same.
  const pairGridClass = cn("grid grid-cols-1", fieldGap)
  const spanFullClass = ""
  const labelCompact = isPageLayout

  const renderStaffPicker = (
    label: string,
    field: "completedByStaffId" | "reportedByStaffId",
    nameField: "completedByName" | "reportedByName",
    dropdownKey: "completedBy" | "reportedBy",
    buttonRef: React.RefObject<HTMLButtonElement | null>,
    required = false,
  ) => {
    const selectedId = form[field] || ""
    const selectedMember = staff.find((member) => member.id === selectedId)

    if (isView) {
      return (
        <div>
          <FieldLabel required={required} compact={labelCompact}>{label}</FieldLabel>
          <div className="min-h-[38px] rounded-[6px] border border-folk-border bg-folk-hover px-[12px] py-[8px]">
            <IncidentStaffChip staffId={form[field]} name={form[nameField]} staff={staff} />
          </div>
        </div>
      )
    }

    return (
      <div>
        <FieldLabel required={required} compact={labelCompact}>{label}</FieldLabel>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            setActiveDateTimeDropdown(null)
            closeFormSelects()
            setActiveDropdown(activeDropdown === dropdownKey ? null : dropdownKey)
          }}
          className="flex h-[38px] w-full items-center justify-between rounded-[6px] border border-folk-border bg-white px-[12px] text-left text-[13px] text-folk-text transition-colors hover:border-folk-border-strong"
          tabIndex={0}
        >
          <span className="flex min-w-0 items-center gap-[10px]">
            {selectedMember ? (
              <EntityNameRow name={selectedMember.name} iconText={selectedMember.iconText} variant="staff" />
            ) : (
              <span className="text-folk-placeholder">Select staff member</span>
            )}
          </span>
          <ChevronDown className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.75} />
        </button>
        <SearchableEntityDropdown
          isOpen={activeDropdown === dropdownKey}
          anchorRef={buttonRef}
          options={staffOptions}
          selectedId={selectedId}
          searchPlaceholder="Search staff…"
          emptyMessage="No staff found"
          onSelect={(id) => handleSelectStaff(field, nameField, id)}
          onClose={() => setActiveDropdown(null)}
        />
      </div>
    )
  }

  return (
    <div className={cn("flex min-h-0 flex-col", isPageLayout ? "flex-1" : "h-full")}>
      {!isPageLayout && (
        <div className="flex items-center justify-between border-b border-folk-border-subtle px-[20px] py-[14px]">
          <div>
            <h2 className="text-[13px] font-semibold text-folk-text">
              {isView ? "Incident report" : isEdit ? "Edit incident report" : "Report incident"}
            </h2>
            {incident && (
              <p className="mt-[4px] text-[11px] text-folk-secondary">
                {getIncidentDisplayId(incident)} · Recorded {formatIncidentDateTime(incident.createdAt)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
            aria-label="Close"
            tabIndex={0}
          >
            <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
          </button>
        </div>
      )}

      <div className={cn(
        "flex-1 overflow-y-auto py-[18px]",
        isPageLayout ? "px-[24px]" : "px-[20px]",
        layout === "page" && "mx-auto w-full max-w-[560px]",
        isProfileLayout && "px-[16px]"
      )}>
        <section className={sectionGap}>
          <div className={pairGridClass}>
            {isView ? (
              <div className={spanFullClass}>
                <FieldLabel required compact={labelCompact}>Participant/s</FieldLabel>
                <div className="min-h-[38px] rounded-[6px] border border-folk-border bg-folk-hover px-[12px] py-[8px]">
                  <IncidentParticipantChips clientIds={form.clientIds} clientNames={form.clientNames} clients={clients} />
                </div>
              </div>
            ) : (
              <div className={spanFullClass}>
                <EntityMultiPicker
                  label="Participant/s"
                  options={clientOptions}
                  selectedIds={form.clientIds}
                  onChange={handleClientChange}
                  placeholder="Add participant"
                  required
                />
              </div>
            )}

            <div className={cn(spanFullClass, "grid grid-cols-1", fieldGap)}>
              <div>
                <FieldLabel required compact={labelCompact}>Date of incident</FieldLabel>
                {isView ? (
                  <ReadOnlyValue>{formatIncidentDate(form.incidentDate)}</ReadOnlyValue>
                ) : (
                  <>
                    <button
                      ref={incidentDateRef}
                      type="button"
                      onClick={openIncidentDatePicker}
                      className={PICKER_BUTTON_CLASS}
                      aria-expanded={activeDateTimeDropdown === "incidentDate"}
                      tabIndex={0}
                    >
                      <CalendarDays
                        className={cn("h-[14px] w-[14px] shrink-0", form.incidentDate ? "text-folk-secondary" : "text-folk-placeholder")}
                        strokeWidth={1.5}
                      />
                      <span className={cn("truncate", form.incidentDate ? "text-folk-text" : "text-folk-placeholder")}>
                        {form.incidentDate ? formatIncidentPickerDate(form.incidentDate) : "Select date"}
                      </span>
                    </button>
                    <FixedDatePickerDropdown
                      isOpen={activeDateTimeDropdown === "incidentDate"}
                      anchorRef={incidentDateRef}
                      value={form.incidentDate}
                      onChange={(value) => setForm((current) => ({ ...current, incidentDate: value }))}
                      onClose={() => setActiveDateTimeDropdown(null)}
                    />
                  </>
                )}
              </div>
              {isView && incident && (
                <div>
                  <FieldLabel compact={labelCompact}>Date created</FieldLabel>
                  <ReadOnlyValue>{formatIncidentDateTime(incident.createdAt)}</ReadOnlyValue>
                </div>
              )}
              <div>
                <FieldLabel compact={labelCompact}>Incident start time</FieldLabel>
                {isView ? (
                  <ReadOnlyValue>{form.incidentStartTime ? formatTimeLabel(form.incidentStartTime) : "—"}</ReadOnlyValue>
                ) : (
                  <>
                    <button
                      ref={startTimeRef}
                      type="button"
                      onClick={openStartTimePicker}
                      className={PICKER_BUTTON_CLASS}
                      aria-expanded={activeDateTimeDropdown === "startTime"}
                      tabIndex={0}
                    >
                      <Clock
                        className={cn("h-[14px] w-[14px] shrink-0", form.incidentStartTime ? "text-folk-secondary" : "text-folk-placeholder")}
                        strokeWidth={1.5}
                      />
                      <span className={cn("truncate", form.incidentStartTime ? "text-folk-text" : "text-folk-placeholder")}>
                        {form.incidentStartTime ? formatTimeLabel(form.incidentStartTime) : "Select time"}
                      </span>
                    </button>
                    <FixedTimePickerDropdown
                      isOpen={activeDateTimeDropdown === "startTime"}
                      anchorRef={startTimeRef}
                      value={form.incidentStartTime}
                      onChange={(value) => setForm((current) => ({ ...current, incidentStartTime: value }))}
                      onClose={() => setActiveDateTimeDropdown(null)}
                    />
                  </>
                )}
              </div>
            </div>

            <div>
              <FieldLabel required compact={labelCompact}>Category</FieldLabel>
              {isView ? (
                <div className="min-h-[38px] rounded-[6px] border border-folk-border bg-folk-hover px-[12px] py-[8px]">
                  <IncidentCategoryChip category={form.category} />
                </div>
              ) : (
                <>
                  <button
                    ref={categoryRef}
                    type="button"
                    onClick={() => toggleFormSelect("category")}
                    className={SELECT_BUTTON_CLASS}
                    aria-expanded={activeFormSelect === "category"}
                    tabIndex={0}
                  >
                    <span className={cn("min-w-0 flex-1 truncate text-left", !form.category && "text-folk-placeholder")}>
                      {form.category ? <IncidentCategoryChip category={form.category} /> : "Select category"}
                    </span>
                    <ChevronDown
                      className={cn("ml-[8px] h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform", activeFormSelect === "category" && "rotate-180")}
                      strokeWidth={1.5}
                    />
                  </button>
                  <FixedSelectDropdown
                    isOpen={activeFormSelect === "category"}
                    anchorRef={categoryRef}
                    onClose={closeFormSelects}
                    estimatedHeight={Math.min(INCIDENT_CATEGORIES.length * 44 + 8, 320)}
                    minWidth={360}
                  >
                    {INCIDENT_CATEGORIES.map((category) => (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => handleCategoryChange(category.value)}
                        className={cn(
                          "flex w-full px-[12px] py-[8px] text-left transition-colors hover:bg-folk-hover",
                          form.category === category.value && "bg-[var(--folk-border-subtle)]"
                        )}
                        role="option"
                        aria-selected={form.category === category.value}
                        tabIndex={0}
                      >
                        <span className="text-[12px] font-medium leading-[1.45] text-folk-text">{category.label}</span>
                      </button>
                    ))}
                  </FixedSelectDropdown>
                </>
              )}
            </div>

            {renderStaffPicker("Person completing report", "completedByStaffId", "completedByName", "completedBy", completedByRef, true)}

            <div className={spanFullClass}>
              <FieldLabel required compact={labelCompact}>Description of incident</FieldLabel>
              {isView ? (
                <ReadOnlyValue>{form.description}</ReadOnlyValue>
              ) : (
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={isPageLayout ? 4 : 5}
                  placeholder="What happened — include events before, during and after the incident"
                  className="w-full rounded-[6px] border border-folk-border bg-white px-[12px] py-[10px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
                />
              )}
            </div>

            <div className={spanFullClass}>
              <FieldLabel compact={labelCompact}>User activities</FieldLabel>
              {isView ? (
                <ReadOnlyValue>{form.userActivities}</ReadOnlyValue>
              ) : (
                <textarea
                  value={form.userActivities}
                  onChange={(event) => setForm((current) => ({ ...current, userActivities: event.target.value }))}
                  rows={isPageLayout ? 3 : 4}
                  placeholder="What were participants doing at the time of the incident?"
                  className="w-full rounded-[6px] border border-folk-border bg-white px-[12px] py-[10px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
                />
              )}
            </div>

            <div className={spanFullClass}>
              <FieldLabel required compact={labelCompact}>Actions taken</FieldLabel>
              {isView ? (
                <ReadOnlyValue>{form.actionsTaken}</ReadOnlyValue>
              ) : (
                <textarea
                  value={form.actionsTaken}
                  onChange={(event) => setForm((current) => ({ ...current, actionsTaken: event.target.value }))}
                  rows={isPageLayout ? 3 : 4}
                  placeholder="Describe action taken to ensure health, safety and wellbeing of all persons involved"
                  className="w-full rounded-[6px] border border-folk-border bg-white px-[12px] py-[10px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
                />
              )}
            </div>
          </div>
        </section>

        <section className={sectionGap}>
          <h3 className="mb-[4px] text-[16px] font-semibold text-folk-text">
            NDIS notification
          </h3>
          <p className="mb-[12px] text-[11px] text-folk-secondary">
            Reportable incidents must be notified to the NDIS Commission within the required timeframe.
          </p>
          <div className={pairGridClass}>
            <div className={spanFullClass}>
              <FieldLabel compact={labelCompact}>Reportable to NDIS Commission</FieldLabel>
              {isView ? (
                <ReadOnlyValue>{form.isReportable ? "Yes" : "No"}</ReadOnlyValue>
              ) : (
                <YesNoSelect
                  value={form.isReportable ? "yes" : "no"}
                  onChange={(value) => handleReportableChange(value === "yes")}
                  isOpen={activeFormSelect === "isReportable"}
                  onToggle={() => toggleFormSelect("isReportable")}
                  onClose={closeFormSelects}
                  buttonRef={isReportableRef}
                />
              )}
            </div>

            {form.isReportable && (
              <>
                <div className={spanFullClass}>
                  <div className="rounded-[8px] border border-[#bfdbfe] bg-[#eef4fc] px-[12px] py-[10px]">
                    <p className="text-[12px] font-semibold text-[#1e40af]">NDIS reportable incident</p>
                    <p className="mt-[4px] text-[13px] text-folk-text">{ndisTypeLabel || "Select a category that maps to a reportable incident type"}</p>
                    {notificationDeadlineHint && (
                      <p className="mt-[6px] text-[11px] text-folk-secondary">{notificationDeadlineHint}</p>
                    )}
                  </div>
                </div>

                <div className={spanFullClass}>
                  <FieldLabel compact={labelCompact}>Referred to authorised notifier / approver</FieldLabel>
                  {isView ? (
                    <ReadOnlyValue>{form.referredToNotifier}</ReadOnlyValue>
                  ) : (
                    <input
                      type="text"
                      value={form.referredToNotifier}
                      onChange={(event) => setForm((current) => ({ ...current, referredToNotifier: event.target.value }))}
                      placeholder="Name of internal authorised reportable incidents notifier"
                      className="h-[38px] w-full rounded-[6px] border border-folk-border bg-white px-[12px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
                    />
                  )}
                </div>

                <div>
                  <FieldLabel compact={labelCompact}>Commission notified — date and time</FieldLabel>
                  {isView ? (
                    <ReadOnlyValue>{form.commissionAdvisedAt ? formatIncidentDateTime(form.commissionAdvisedAt) : "—"}</ReadOnlyValue>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-[8px]">
                        <button
                          ref={commissionAdvisedDateRef}
                          type="button"
                          onClick={() => {
                            setActiveDropdown(null)
                            closeFormSelects()
                            setActiveDateTimeDropdown((current) => (current === "commissionAdvisedDate" ? null : "commissionAdvisedDate"))
                          }}
                          className={PICKER_BUTTON_CLASS}
                          tabIndex={0}
                        >
                          <CalendarDays className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                          <span className={cn("truncate", !form.commissionAdvisedAt && "text-folk-placeholder")}>
                            {form.commissionAdvisedAt ? formatIncidentPickerDate(parseIsoDate(form.commissionAdvisedAt)) : "Select date"}
                          </span>
                        </button>
                        <button
                          ref={commissionAdvisedTimeRef}
                          type="button"
                          onClick={() => {
                            setActiveDropdown(null)
                            closeFormSelects()
                            setActiveDateTimeDropdown((current) => (current === "commissionAdvisedTime" ? null : "commissionAdvisedTime"))
                          }}
                          className={PICKER_BUTTON_CLASS}
                          tabIndex={0}
                        >
                          <Clock className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                          <span className={cn("truncate", !commissionAdvisedTime && "text-folk-placeholder")}>
                            {commissionAdvisedTime ? formatTimeLabel(commissionAdvisedTime) : "Select time"}
                          </span>
                        </button>
                      </div>
                      <FixedDatePickerDropdown
                        isOpen={activeDateTimeDropdown === "commissionAdvisedDate"}
                        anchorRef={commissionAdvisedDateRef}
                        value={parseIsoDate(form.commissionAdvisedAt)}
                        onChange={handleCommissionAdvisedDateChange}
                        onClose={() => setActiveDateTimeDropdown(null)}
                      />
                      <FixedTimePickerDropdown
                        isOpen={activeDateTimeDropdown === "commissionAdvisedTime"}
                        anchorRef={commissionAdvisedTimeRef}
                        value={commissionAdvisedTime}
                        onChange={handleCommissionAdvisedTimeChange}
                        onClose={() => setActiveDateTimeDropdown(null)}
                      />
                    </>
                  )}
                </div>

                <div>
                  <FieldLabel compact={labelCompact}>Family, carer, guardian or OPG notified</FieldLabel>
                  {isView ? (
                    <ReadOnlyValue>
                      {form.familyCarerGuardianNotified === "yes" ? "Yes" : form.familyCarerGuardianNotified === "no" ? "No" : "—"}
                    </ReadOnlyValue>
                  ) : (
                    <YesNoEmptySelect
                      value={form.familyCarerGuardianNotified}
                      onChange={(value) => setForm((current) => ({ ...current, familyCarerGuardianNotified: value }))}
                      isOpen={activeFormSelect === "familyNotified"}
                      onToggle={() => toggleFormSelect("familyNotified")}
                      onClose={closeFormSelects}
                      buttonRef={familyNotifiedRef}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        <section>
          <div className={pairGridClass}>
            {renderStaffPicker("Reported by", "reportedByStaffId", "reportedByName", "reportedBy", reportedByRef)}

            <div>
              <FieldLabel compact={labelCompact}>Emergency services contacted</FieldLabel>
              {isView ? (
                <ReadOnlyValue>{form.emergencyServicesContacted === "yes" ? "Yes" : "No"}</ReadOnlyValue>
              ) : (
                <YesNoSelect
                  value={form.emergencyServicesContacted}
                  onChange={(value) => setForm((current) => ({ ...current, emergencyServicesContacted: value }))}
                  isOpen={activeFormSelect === "emergencyServices"}
                  onToggle={() => toggleFormSelect("emergencyServices")}
                  onClose={closeFormSelects}
                  buttonRef={emergencyServicesRef}
                />
              )}
            </div>

            <div>
              <FieldLabel compact={labelCompact}>Agency contacted</FieldLabel>
              {isView ? (
                <ReadOnlyValue>{form.organisationNotified ? "Yes" : "No"}</ReadOnlyValue>
              ) : (
                <YesNoSelect
                  value={form.organisationNotified ? "yes" : "no"}
                  onChange={(value) => setForm((current) => ({ ...current, organisationNotified: value === "yes" }))}
                  isOpen={activeFormSelect === "organisationNotified"}
                  onToggle={() => toggleFormSelect("organisationNotified")}
                  onClose={closeFormSelects}
                  buttonRef={organisationNotifiedRef}
                />
              )}
            </div>

            <div>
              <FieldLabel compact={labelCompact}>Incident status</FieldLabel>
              {isView ? (
                <ReadOnlyValue>{getIncidentStatusLabel(form.incidentStatus)}</ReadOnlyValue>
              ) : (
                <div className="flex flex-wrap gap-[8px]">
                  {(["confirmed", "alleged", "not_an_incident"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, incidentStatus: status }))}
                      className={cn(
                        "min-w-0 flex-1 rounded-[6px] border px-[12px] py-[8px] text-[12px] font-medium transition-colors",
                        form.incidentStatus === status
                          ? "border-folk-border bg-folk-hover text-folk-text"
                          : "border-folk-border-subtle bg-folk-surface text-folk-secondary hover:bg-folk-hover"
                      )}
                      tabIndex={0}
                    >
                      {getIncidentStatusLabel(status)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={spanFullClass}>
              <FieldLabel compact={labelCompact}>Attachments</FieldLabel>
              {!isView && (
                <FileUploadControl
                  buttonLabel="Upload attachments"
                  ariaLabel="Upload attachments"
                  onUploadingChange={setIsUploadingAttachments}
                  onUpload={handleAttachmentUpload}
                />
              )}
              {attachments.length > 0 ? (
                <div className={cn("flex flex-col gap-[6px]", !isView && "mt-[8px]")}>
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-[10px] rounded-[6px] border border-folk-border bg-white px-[12px] py-[8px]"
                    >
                      <FileText className="h-[16px] w-[16px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[13px] font-medium text-folk-text">{attachment.name}</span>
                        <span className="text-[11px] text-folk-secondary">{formatFileSize(attachment.size)}</span>
                      </div>
                      {attachment.url && (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-folk-input text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
                          tabIndex={0}
                          aria-label={`Download ${attachment.name}`}
                        >
                          <Download className="h-[14px] w-[14px]" strokeWidth={1.5} />
                        </a>
                      )}
                      {!isView && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(attachment)}
                          className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-folk-input text-folk-secondary transition-colors hover:bg-red-50 hover:text-red-500"
                          tabIndex={0}
                          aria-label={`Remove ${attachment.name}`}
                        >
                          <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : isView ? (
                <ReadOnlyValue>—</ReadOnlyValue>
              ) : (
                <p className="mt-[8px] text-[12px] text-folk-secondary">
                  Add photos, documents, or other files related to this incident.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      {!isView && (
        <div className={cn(
          "flex items-center justify-between border-t border-folk-border-subtle py-[14px]",
          isPageLayout ? "px-[24px]" : "px-[20px]"
        )}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[6px] px-[12px] py-[7px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
            tabIndex={0}
          >
            Cancel
          </button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSaving || isUploadingAttachments} className="h-[36px] rounded-[6px] px-[16px]">
            {isSaving ? (isEdit ? "Saving…" : "Submitting…") : isEdit ? "Save changes" : "Submit report"}
          </Button>
        </div>
      )}
    </div>
  )
}

export const IncidentSidebarForm = IncidentForm
