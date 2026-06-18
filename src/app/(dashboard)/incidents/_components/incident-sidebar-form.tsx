"use client"

import { useEffect, useMemo, useRef, useState, type RefObject } from "react"
import { CalendarDays, ChevronDown, Clock, Download, FileText, Upload, X } from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"
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
  getIncidentCategoryLabel,
  getTodayIsoDate,
  INCIDENT_CATEGORIES,
} from "@/lib/incident-definitions"
import type { IncidentInput } from "@/lib/hooks/use-incidents"
import { formatTimeLabel } from "@/lib/roster/week-utils"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import type { Attachment, Client, Incident, StaffMember } from "@/lib/types"
import { cn } from "@/lib/utils"
import { EntityMultiPicker } from "./entity-multi-picker"

const PICKER_BUTTON_CLASS =
  "flex h-[36px] w-full items-center gap-[8px] rounded-none border border-folk-border bg-folk-surface px-[10px] text-left text-[13px] font-medium transition-colors hover:bg-folk-hover"

const SELECT_BUTTON_CLASS =
  "flex h-[36px] w-full items-center justify-between rounded-none border border-folk-border bg-folk-surface px-[10px] text-left text-[13px] font-medium transition-colors hover:bg-folk-hover"

type FormSelectDropdown = "category" | "emergencyServices" | "organisationNotified"

const YES_NO_OPTIONS = [
  { value: "no" as const, label: "No" },
  { value: "yes" as const, label: "Yes" },
]

interface IncidentFormProps {
  mode: "add" | "view"
  layout?: "page" | "sidebar"
  incident?: Incident | null
  clients: Client[]
  staff: StaffMember[]
  initialClientIds?: string[]
  isSaving: boolean
  onSubmit: (input: IncidentInput) => Promise<void>
  onDelete?: () => Promise<void>
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
  witnessDetails: "",
  impactDetails: "",
  actionsTaken: "",
  emergencyServicesContacted: "no",
  organisationNotified: false,
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
    witnessDetails: incident.witnessDetails,
    impactDetails: incident.impactDetails,
    actionsTaken: incident.actionsTaken,
    emergencyServicesContacted: incident.emergencyServicesContacted,
    organisationNotified: incident.organisationNotified,
    attachments: incident.attachments,
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-[6px] block text-[12px] font-medium text-folk-secondary">
      {children}
      {required && <span className="text-[#dc2626]"> *</span>}
    </label>
  )
}

function ReadOnlyValue({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[36px] rounded-none border border-folk-border bg-folk-hover px-[10px] py-[8px] text-[13px] text-folk-text">
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
      <FixedSelectDropdown
        isOpen={isOpen}
        anchorRef={buttonRef}
        onClose={onClose}
        estimatedHeight={88}
        minWidth={120}
      >
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

export function IncidentForm({
  mode,
  layout = "page",
  incident,
  clients,
  staff,
  initialClientIds = [],
  isSaving,
  onSubmit,
  onDelete,
  onClose,
}: IncidentFormProps) {
  const isPageLayout = layout === "page"
  const isView = mode === "view"
  const [form, setForm] = useState<IncidentInput>(() => incident ? incidentToForm(incident) : emptyForm())
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false)
  const uploadSessionIdRef = useRef(incident?.id ?? crypto.randomUUID())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeDropdown, setActiveDropdown] = useState<"completedBy" | "reportedBy" | null>(null)
  const [activeDateTimeDropdown, setActiveDateTimeDropdown] = useState<"incidentDate" | "startTime" | "endTime" | null>(null)
  const [activeFormSelect, setActiveFormSelect] = useState<FormSelectDropdown | null>(null)
  const completedByRef = useRef<HTMLButtonElement>(null)
  const reportedByRef = useRef<HTMLButtonElement>(null)
  const categoryRef = useRef<HTMLButtonElement>(null)
  const emergencyServicesRef = useRef<HTMLButtonElement>(null)
  const organisationNotifiedRef = useRef<HTMLButtonElement>(null)
  const incidentDateRef = useRef<HTMLButtonElement>(null)
  const startTimeRef = useRef<HTMLButtonElement>(null)
  const endTimeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (incident) {
      uploadSessionIdRef.current = incident.id
      setForm(incidentToForm(incident))
      return
    }

    uploadSessionIdRef.current = crypto.randomUUID()
    setForm(emptyForm())
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
    () => clients.map((client) => ({
      id: client.id,
      label: client.displayName,
      iconText: client.iconText,
    })),
    [clients]
  )

  const staffOptions = useMemo(
    () => staff.map((member) => ({
      id: member.id,
      label: member.name,
      iconText: member.iconText,
    })),
    [staff]
  )

  const selectedClientsLabel = useMemo(() => {
    if (form.clientIds.length === 0) return ""
    return form.clientIds
      .map((id) => clients.find((client) => client.id === id)?.displayName)
      .filter(Boolean)
      .join(", ")
  }, [clients, form.clientIds])

  const selectedWorkersLabel = useMemo(() => {
    if (form.workerIds.length === 0) return ""
    return form.workerIds
      .map((id) => staff.find((member) => member.id === id)?.name)
      .filter(Boolean)
      .join(", ")
  }, [form.workerIds, staff])

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

  const handleWorkerChange = (workerIds: string[]) => {
    const workerNames = workerIds
      .map((id) => staff.find((member) => member.id === id)?.name)
      .filter(Boolean)
      .join(", ")
    setForm((current) => ({ ...current, workerIds, workerNames }))
  }

  const handleSelectStaff = (field: "completedByStaffId" | "reportedByStaffId", nameField: "completedByName" | "reportedByName", staffId: string) => {
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

  const openEndTimePicker = () => {
    setActiveDropdown(null)
    closeFormSelects()
    setForm((current) => ({
      ...current,
      incidentEndTime: current.incidentEndTime || getCurrentTimeValue(),
    }))
    setActiveDateTimeDropdown((current) => (current === "endTime" ? null : "endTime"))
  }

  const canSubmit =
    form.incidentDate.trim().length > 0 &&
    form.category.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.clientIds.length > 0 &&
    Boolean(form.completedByStaffId || form.completedByName.trim()) &&
    Boolean(form.reportedByStaffId || form.reportedByName.trim())

  const handleSubmit = async () => {
    if (!canSubmit || isView) return
    await onSubmit({
      ...form,
      clientNames: selectedClientsLabel,
      workerNames: selectedWorkersLabel,
      attachments: form.attachments ?? [],
    })
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isView || !event.target.files) return
    const files = Array.from(event.target.files)
    event.target.value = ""
    if (files.length === 0) return

    setIsUploadingAttachments(true)
    const supabase = isSupabaseConfigured() ? createClient() : null
    const newAttachments: Attachment[] = []
    const storagePrefix = uploadSessionIdRef.current

    for (const file of files) {
      const id = crypto.randomUUID()
      if (supabase) {
        const storagePath = `incident-attachments/${storagePrefix}/${id}-${file.name}`
        const { error } = await supabase.storage.from("documents").upload(storagePath, file)
        if (!error) {
          const { data: urlData } = supabase.storage.from("documents").getPublicUrl(storagePath)
          newAttachments.push({ id, name: file.name, size: file.size, storagePath, url: urlData.publicUrl })
        } else {
          newAttachments.push({ id, name: file.name, size: file.size })
        }
      } else {
        newAttachments.push({ id, name: file.name, size: file.size })
      }
    }

    setForm((current) => ({
      ...current,
      attachments: [...(current.attachments ?? []), ...newAttachments],
    }))
    setIsUploadingAttachments(false)
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
          <FieldLabel required={required}>{label}</FieldLabel>
          <ReadOnlyValue>{form[nameField] || selectedMember?.name}</ReadOnlyValue>
        </div>
      )
    }

    return (
      <div>
        <FieldLabel required={required}>{label}</FieldLabel>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            setActiveDateTimeDropdown(null)
            closeFormSelects()
            setActiveDropdown(activeDropdown === dropdownKey ? null : dropdownKey)
          }}
          className="flex h-[36px] w-full items-center justify-between rounded-none border border-folk-border bg-folk-surface px-[10px] text-left text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
          tabIndex={0}
        >
          <span className="flex min-w-0 items-center gap-[8px]">
            {selectedMember ? (
              <>
                <EntityIcon text={selectedMember.iconText} size="xs" />
                <span className="truncate">{selectedMember.name}</span>
              </>
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
            {isView ? "Incident report" : "Report incident"}
          </h2>
          {incident && (
            <p className="mt-[4px] text-[11px] text-folk-secondary">
              Recorded {formatIncidentDateTime(incident.createdAt)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-[28px] w-[28px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          aria-label="Close"
          tabIndex={0}
        >
          <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
        </button>
      </div>
      )}

      <div className={cn(
        "flex-1 overflow-y-auto py-[18px]",
        isPageLayout ? "px-[24px]" : "px-[20px]"
      )}>
        <section className="mb-[24px]">
          <h3 className="mb-[14px] text-[12px] font-semibold uppercase tracking-[0.04em] text-folk-secondary">
            Incident details
          </h3>
          <div className="grid grid-cols-1 gap-[14px]">
            {renderStaffPicker("Person completing report", "completedByStaffId", "completedByName", "completedBy", completedByRef, true)}
            {renderStaffPicker("Reported by", "reportedByStaffId", "reportedByName", "reportedBy", reportedByRef, true)}

            <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
              <div>
                <FieldLabel required>Date of incident</FieldLabel>
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
                  <FieldLabel>Date created</FieldLabel>
                  <ReadOnlyValue>{formatIncidentDateTime(incident.createdAt)}</ReadOnlyValue>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
              <div>
                <FieldLabel>Incident start time</FieldLabel>
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
              <div>
                <FieldLabel>Incident end time</FieldLabel>
                {isView ? (
                  <ReadOnlyValue>{form.incidentEndTime ? formatTimeLabel(form.incidentEndTime) : "—"}</ReadOnlyValue>
                ) : (
                  <>
                    <button
                      ref={endTimeRef}
                      type="button"
                      onClick={openEndTimePicker}
                      className={PICKER_BUTTON_CLASS}
                      aria-expanded={activeDateTimeDropdown === "endTime"}
                      tabIndex={0}
                    >
                      <Clock
                        className={cn("h-[14px] w-[14px] shrink-0", form.incidentEndTime ? "text-folk-secondary" : "text-folk-placeholder")}
                        strokeWidth={1.5}
                      />
                      <span className={cn("truncate", form.incidentEndTime ? "text-folk-text" : "text-folk-placeholder")}>
                        {form.incidentEndTime ? formatTimeLabel(form.incidentEndTime) : "Select time"}
                      </span>
                    </button>
                    <FixedTimePickerDropdown
                      isOpen={activeDateTimeDropdown === "endTime"}
                      anchorRef={endTimeRef}
                      value={form.incidentEndTime}
                      onChange={(value) => setForm((current) => ({ ...current, incidentEndTime: value }))}
                      onClose={() => setActiveDateTimeDropdown(null)}
                    />
                  </>
                )}
              </div>
            </div>

            <div>
              <FieldLabel>Location of incident</FieldLabel>
              {isView ? (
                <ReadOnlyValue>{form.location}</ReadOnlyValue>
              ) : (
                <input
                  type="text"
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  className="h-[36px] w-full rounded-none border border-folk-border bg-folk-surface px-[10px] text-[13px] text-folk-text outline-none"
                />
              )}
            </div>

            {isView ? (
              <>
                <div>
                  <FieldLabel required>Participant/s</FieldLabel>
                  <ReadOnlyValue>{form.clientNames}</ReadOnlyValue>
                </div>
                <div>
                  <FieldLabel>Workers on shift</FieldLabel>
                  <ReadOnlyValue>{form.workerNames}</ReadOnlyValue>
                </div>
              </>
            ) : (
              <>
                <EntityMultiPicker
                  label="Participant/s"
                  options={clientOptions}
                  selectedIds={form.clientIds}
                  onChange={handleClientChange}
                  placeholder="Add participant"
                  required
                />
                <EntityMultiPicker
                  label="Workers on shift"
                  options={staffOptions}
                  selectedIds={form.workerIds}
                  onChange={handleWorkerChange}
                  placeholder="Add worker"
                />
              </>
            )}

            <div>
              <FieldLabel>Other parties involved</FieldLabel>
              {isView ? (
                <ReadOnlyValue>{form.otherParties}</ReadOnlyValue>
              ) : (
                <input
                  type="text"
                  value={form.otherParties}
                  onChange={(event) => setForm((current) => ({ ...current, otherParties: event.target.value }))}
                  className="h-[36px] w-full rounded-none border border-folk-border bg-folk-surface px-[10px] text-[13px] text-folk-text outline-none"
                />
              )}
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-[14px] text-[12px] font-semibold uppercase tracking-[0.04em] text-folk-secondary">
            Incident summary
          </h3>
          <div className="grid grid-cols-1 gap-[14px]">
            <div>
              <FieldLabel required>Category</FieldLabel>
              {isView ? (
                <ReadOnlyValue>{getIncidentCategoryLabel(form.category)}</ReadOnlyValue>
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
                    <span className={cn("min-w-0 flex-1 truncate text-left", form.category ? "text-folk-text" : "text-folk-placeholder")}>
                      {form.category ? getIncidentCategoryLabel(form.category) : "Select category"}
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
                    {INCIDENT_CATEGORIES.map((category) => {
                      const isSelected = form.category === category.value
                      return (
                        <button
                          key={category.value}
                          type="button"
                          onClick={() => handleCategoryChange(category.value)}
                          className={cn(
                            "flex w-full px-[12px] py-[8px] text-left transition-colors hover:bg-folk-hover",
                            isSelected && "bg-[var(--folk-border-subtle)]"
                          )}
                          role="option"
                          aria-selected={isSelected}
                          tabIndex={0}
                        >
                          <span className="text-[12px] font-medium leading-[1.45] text-folk-text">{category.label}</span>
                        </button>
                      )
                    })}
                  </FixedSelectDropdown>
                </>
              )}
            </div>

            <div>
              <FieldLabel>Incident status</FieldLabel>
              {isView ? (
                <ReadOnlyValue>{form.incidentStatus === "alleged" ? "Alleged" : "Confirmed"}</ReadOnlyValue>
              ) : (
                <div className="flex gap-[8px]">
                  {(["confirmed", "alleged"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, incidentStatus: status }))}
                      className={cn(
                        "flex-1 rounded-none border px-[10px] py-[8px] text-[12px] font-medium transition-colors",
                        form.incidentStatus === status
                          ? "border-folk-border bg-folk-hover text-folk-text"
                          : "border-folk-border-subtle bg-folk-surface text-folk-secondary hover:bg-folk-hover"
                      )}
                      tabIndex={0}
                    >
                      {status === "alleged" ? "Alleged" : "Confirmed"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <FieldLabel required>Description of incident</FieldLabel>
              {isView ? (
                <ReadOnlyValue>{form.description}</ReadOnlyValue>
              ) : (
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={5}
                  placeholder="Provide relevant details of events prior, during and after the incident"
                  className="w-full rounded-none border border-folk-border bg-folk-surface px-[10px] py-[8px] text-[13px] text-folk-text outline-none"
                />
              )}
            </div>

            <div>
              <FieldLabel>Actions taken</FieldLabel>
              {isView ? (
                <ReadOnlyValue>{form.actionsTaken}</ReadOnlyValue>
              ) : (
                <textarea
                  value={form.actionsTaken}
                  onChange={(event) => setForm((current) => ({ ...current, actionsTaken: event.target.value }))}
                  rows={4}
                  placeholder="Describe action taken to ensure health, safety and wellbeing of all persons involved"
                  className="w-full rounded-none border border-folk-border bg-folk-surface px-[10px] py-[8px] text-[13px] text-folk-text outline-none"
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
              <div>
                <FieldLabel>Emergency services contacted</FieldLabel>
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
                <FieldLabel>Organisation notified</FieldLabel>
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
            </div>

            <div>
              <FieldLabel>Attachments</FieldLabel>
              {!isView && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAttachments}
                    className="flex h-[36px] w-full items-center justify-center gap-[6px] rounded-none border border-dashed border-folk-border-strong bg-folk-surface text-[13px] font-medium text-folk-secondary transition-colors hover:border-folk-border hover:bg-folk-hover hover:text-folk-text disabled:opacity-50"
                    tabIndex={0}
                    aria-label="Upload attachments"
                  >
                    <Upload className="h-[14px] w-[14px]" strokeWidth={1.5} />
                    {isUploadingAttachments ? "Uploading…" : "Upload attachments"}
                  </button>
                </>
              )}
              {attachments.length > 0 ? (
                <div className={cn("flex flex-col gap-[6px]", !isView && "mt-[8px]")}>
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-[10px] rounded-none border border-folk-border bg-folk-surface px-[10px] py-[8px]"
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
            className="rounded-none px-[10px] py-[6px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
            tabIndex={0}
          >
            Cancel
          </button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSaving || isUploadingAttachments} className="h-[34px] rounded-none px-[14px]">
            {isSaving ? "Submitting…" : "Submit report"}
          </Button>
        </div>
      )}

      {isView && onDelete && !isPageLayout && (
        <div className="flex items-center justify-between border-t border-folk-border-subtle px-[20px] py-[14px]">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-none px-[10px] py-[6px] text-[13px] font-medium text-[#dc2626] transition-colors hover:bg-[#fef2f2]"
            tabIndex={0}
          >
            Delete report
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-none px-[10px] py-[6px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
            tabIndex={0}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}

export const IncidentSidebarForm = IncidentForm
