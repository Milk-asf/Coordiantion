"use client"

import { useEffect, useMemo, useRef, useState, type RefObject } from "react"
import { CalendarDays, ChevronDown, Download, FileText } from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"
import { Button } from "@/components/button"
import { FileUploadControl } from "@/components/file-upload-control"
import { FixedDatePickerDropdown } from "@/components/fixed-date-picker-dropdown"
import { FixedSelectDropdown, FixedSelectOption } from "@/components/fixed-select-dropdown"
import { FixedTimePickerDropdown } from "@/components/fixed-time-picker-dropdown"
import { SearchableEntityDropdown } from "@/components/searchable-entity-dropdown"
import {
  formatIncidentDate,
  formatIncidentDateTime,
} from "@/lib/incident-definitions"
import type { IncidentClosureInput, IncidentInvestigationInput } from "@/lib/hooks/use-incidents"
import type { Attachment, Incident, IncidentInvestigationStatus, StaffMember } from "@/lib/types"
import { cn } from "@/lib/utils"
import { InvestigationStatusChip } from "./investigation-status-chip"
import {
  formatInvestigationFileSize,
  incidentToInvestigationInput,
  prepareInvestigationInputForSave,
  removeInvestigationAttachment,
  uploadInvestigationAttachments,
} from "./incident-investigation-helpers"

const SELECT_BUTTON_CLASS =
  "flex h-[36px] w-full items-center justify-between rounded-none border border-folk-border bg-folk-surface px-[10px] text-left text-[13px] font-medium transition-colors hover:bg-folk-hover"

const INPUT_CLASS =
  "h-[36px] w-full rounded-none border border-folk-border bg-folk-surface px-[10px] text-[13px] text-folk-text outline-none read-only:bg-folk-hover"

const TEXTAREA_CLASS =
  "min-h-[72px] w-full resize-y rounded-none border border-folk-border bg-folk-surface px-[10px] py-[8px] text-[13px] text-folk-text outline-none"

const READONLY_TEXTAREA_CLASS =
  "min-h-[72px] w-full rounded-none border border-folk-border bg-folk-hover px-[10px] py-[8px] text-[13px] text-folk-text"

const PICKER_BUTTON_CLASS =
  "flex h-[36px] w-full items-center gap-[8px] rounded-none border border-folk-border bg-folk-surface px-[10px] text-left text-[13px] font-medium transition-colors hover:bg-folk-hover read-only:pointer-events-none read-only:bg-folk-hover"

const INVESTIGATION_STATUS_OPTIONS: { value: Exclude<IncidentInvestigationStatus, "closed" | "sent">; label: string }[] = [
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "not_an_incident", label: "Not an incident" },
]

const YES_NO_OPTIONS = [
  { value: "no" as const, label: "No" },
  { value: "yes" as const, label: "Yes" },
]

type YesNoValue = "yes" | "no" | ""
type FormSelect = "investigationRequired" | "staffPerformance" | "qualityChecked"

function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-[6px] block text-[12px] font-medium text-folk-secondary">
      {children}
      {required && <span className="text-[#dc2626]"> *</span>}
    </label>
  )
}

function parseIsoDate(value: string | null | undefined): string {
  if (!value) return ""
  return value.slice(0, 10)
}

interface YesNoSelectProps {
  value: YesNoValue
  onChange: (value: YesNoValue) => void
  disabled?: boolean
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  buttonRef: RefObject<HTMLButtonElement | null>
}

function YesNoSelect({ value, onChange, disabled = false, isOpen, onToggle, onClose, buttonRef }: YesNoSelectProps) {
  const label = value === "yes" ? "Yes" : value === "no" ? "No" : "Select"

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
        className={cn(SELECT_BUTTON_CLASS, disabled && "cursor-default bg-folk-hover")}
        aria-expanded={isOpen}
        tabIndex={0}
      >
        <span className={cn(!value && "text-folk-placeholder")}>{label}</span>
        {!disabled && (
          <ChevronDown className={cn("ml-[8px] h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform", isOpen && "rotate-180")} strokeWidth={1.5} />
        )}
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

interface IncidentInvestigationFormProps {
  incident: Incident
  staff: StaffMember[]
  isSaving: boolean
  isClosing?: boolean
  layout?: "page" | "panel"
  onSubmit: (input: IncidentInvestigationInput) => Promise<boolean>
  onCloseIncident?: (input: IncidentClosureInput) => Promise<boolean>
  onClose?: () => void
}

export function IncidentInvestigationForm({
  incident,
  staff,
  isSaving,
  isClosing = false,
  layout = "page",
  onSubmit,
  onCloseIncident,
  onClose,
}: IncidentInvestigationFormProps) {
  const isPanelLayout = layout === "panel"
  const isClosed = incident.investigationStatus === "closed"
  const isNotAnIncident = incident.investigationStatus === "not_an_incident"
  const isInvestigationReadOnly = isClosed || isNotAnIncident

  const [form, setForm] = useState<IncidentInvestigationInput>(() => incidentToInvestigationInput(incident))
  const [qualityChecked, setQualityChecked] = useState<YesNoValue>(() => (incident.investigationStatus === "closed" ? "yes" : "no"))
  const [qualityCheckedByStaffId, setQualityCheckedByStaffId] = useState<string | null>(incident.closedByStaffId)
  const [qualityCheckedByName, setQualityCheckedByName] = useState(incident.closedByName)
  const [qualityCheckError, setQualityCheckError] = useState<string | null>(null)
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false)
  const [isInvestigatorOpen, setIsInvestigatorOpen] = useState(false)
  const [isResolverOpen, setIsResolverOpen] = useState(false)
  const [isQualityCheckerOpen, setIsQualityCheckerOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [activeYesNoSelect, setActiveYesNoSelect] = useState<FormSelect | null>(null)
  const [activeDatePicker, setActiveDatePicker] = useState<"actionsCompleted" | "resolved" | null>(null)
  const investigatorRef = useRef<HTMLButtonElement>(null)
  const resolverRef = useRef<HTMLButtonElement>(null)
  const qualityCheckerRef = useRef<HTMLButtonElement>(null)
  const statusRef = useRef<HTMLButtonElement>(null)
  const investigationRequiredRef = useRef<HTMLButtonElement>(null)
  const staffPerformanceRef = useRef<HTMLButtonElement>(null)
  const qualityCheckedRef = useRef<HTMLButtonElement>(null)
  const actionsCompletedDateRef = useRef<HTMLButtonElement>(null)
  const resolvedDateRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setForm(incidentToInvestigationInput(incident))
    setQualityChecked(incident.investigationStatus === "closed" ? "yes" : "no")
    setQualityCheckedByStaffId(incident.closedByStaffId)
    setQualityCheckedByName(incident.closedByName)
    setQualityCheckError(null)
  }, [incident])

  const staffOptions = useMemo(
    () => staff.map((member) => ({ id: member.id, label: member.name, iconText: member.iconText })),
    [staff]
  )

  const selectedInvestigator = staff.find((member) => member.id === form.investigatedByStaffId)
  const selectedResolver = staff.find((member) => member.id === form.resolvedByStaffId)
  const attachments = form.investigationAttachments ?? []
  const textareaClass = isInvestigationReadOnly ? READONLY_TEXTAREA_CLASS : TEXTAREA_CLASS
  const pairGridClass = cn("grid grid-cols-1 gap-[12px]", !isPanelLayout && "md:grid-cols-2")

  const canSaveInvestigation =
    form.investigationFindings.trim().length > 0 &&
    form.investigationIncidentDetails.trim().length > 0

  const saveBlockedReason = !form.investigationIncidentDetails.trim()
    ? "Add details of the incident before saving."
    : !form.investigationFindings.trim()
      ? "Add investigation findings before saving."
      : null

  const handleSelectInvestigator = (staffId: string) => {
    const member = staff.find((item) => item.id === staffId)
    setForm((current) => ({
      ...current,
      investigatedByStaffId: staffId || null,
      investigatedByName: member?.name ?? "",
    }))
    setIsInvestigatorOpen(false)
  }

  const handleSelectResolver = (staffId: string) => {
    const member = staff.find((item) => item.id === staffId)
    setForm((current) => ({
      ...current,
      resolvedByStaffId: staffId || null,
      resolvedByName: member?.name ?? "",
    }))
    setIsResolverOpen(false)
  }

  const handleSelectQualityChecker = (staffId: string) => {
    const member = staff.find((item) => item.id === staffId)
    setQualityCheckedByStaffId(staffId || null)
    setQualityCheckedByName(member?.name ?? "")
    setQualityCheckError(null)
    setIsQualityCheckerOpen(false)
  }

  const handleCloseDatePicker = () => {
    setActiveDatePicker(null)
  }

  const handleToggleDatePicker = (picker: "actionsCompleted" | "resolved") => {
    setActiveDatePicker((current) => (current === picker ? null : picker))
  }

  const handleStatusChange = (status: Exclude<IncidentInvestigationStatus, "closed" | "sent">) => {
    setForm((current) => ({
      ...current,
      investigationStatus: status,
      investigationCompletedAt: status === "completed"
        ? current.investigationCompletedAt ?? new Date().toISOString()
        : null,
    }))
    setIsStatusOpen(false)
  }

  const handleAttachmentUpload = async (
    files: File[],
    signal: AbortSignal,
    onProgress: (progress: { current: number; total: number; fileName: string }) => void,
  ) => {
    if (isInvestigationReadOnly) return

    const nextAttachments = await uploadInvestigationAttachments(incident.id, files, attachments, {
      signal,
      onProgress,
    })
    setForm((current) => ({ ...current, investigationAttachments: nextAttachments }))
  }

  const handleRemoveAttachment = async (attachment: Attachment) => {
    if (isInvestigationReadOnly) return
    const nextAttachments = await removeInvestigationAttachment(attachment, attachments)
    setForm((current) => ({ ...current, investigationAttachments: nextAttachments }))
  }

  const handleSubmit = async () => {
    if (isInvestigationReadOnly || !canSaveInvestigation) return

    const preparedInput = prepareInvestigationInputForSave(form)

    if (qualityChecked === "yes") {
      if (preparedInput.investigationStatus !== "completed") {
        setQualityCheckError("Set investigation status to Completed before quality checking.")
        return
      }
      if (!qualityCheckedByStaffId || !qualityCheckedByName.trim()) {
        setQualityCheckError("Select who completed the quality check.")
        return
      }
    }

    setQualityCheckError(null)

    const saveSucceeded = await onSubmit(preparedInput)
    if (!saveSucceeded) return

    if (qualityChecked === "yes" && !isClosed && onCloseIncident) {
      const archiveSucceeded = await onCloseIncident({
        closedByStaffId: qualityCheckedByStaffId,
        closedByName: qualityCheckedByName,
        closureNotes: "",
      })
      if (!archiveSucceeded) return
    }

    onClose?.()
  }

  const shouldArchive = qualityChecked === "yes" && form.investigationStatus === "completed"

  const renderStaffPicker = (
    label: string,
    selectedId: string | null,
    selectedName: string,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void,
    buttonRef: RefObject<HTMLButtonElement | null>,
    onSelect: (staffId: string) => void,
    placeholder: string,
  ) => {
    const selectedMember = staff.find((member) => member.id === selectedId)
    if (isInvestigationReadOnly) {
      return (
        <div>
          <FieldLabel>{label}</FieldLabel>
          <div className="flex h-[36px] items-center gap-[8px] rounded-none border border-folk-border bg-folk-hover px-[10px] text-[13px] text-folk-text">
            {selectedMember ? (
              <>
                <EntityIcon text={selectedMember.iconText} size="xs" />
                <span className="truncate">{selectedMember.name}</span>
              </>
            ) : (
              <span>{selectedName || "—"}</span>
            )}
          </div>
        </div>
      )
    }

    return (
      <div>
        <FieldLabel>{label}</FieldLabel>
        <button ref={buttonRef} type="button" onClick={() => setIsOpen(!isOpen)} className={SELECT_BUTTON_CLASS} tabIndex={0}>
          <span className="flex min-w-0 items-center gap-[8px]">
            {selectedMember ? (
              <>
                <EntityIcon text={selectedMember.iconText} size="xs" />
                <span className="truncate">{selectedMember.name}</span>
              </>
            ) : (
              <span className="text-folk-placeholder">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.75} />
        </button>
        <SearchableEntityDropdown
          isOpen={isOpen}
          anchorRef={buttonRef}
          options={staffOptions}
          selectedId={selectedId || ""}
          searchPlaceholder="Search staff…"
          emptyMessage="No staff found"
          onSelect={onSelect}
          onClose={() => setIsOpen(false)}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("flex-1 overflow-y-auto py-[18px]", isPanelLayout ? "px-[16px]" : "px-[24px]")}>
        {isClosed && (
          <div className="mb-[16px] rounded-none border border-[#bababa] bg-[#f9fafb] px-[12px] py-[10px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-folk-secondary">Quality checked</p>
            <p className="mt-[6px] text-[13px] text-folk-text">
              Checked by {incident.closedByName || "—"}
              {incident.closedAt ? ` · ${formatIncidentDateTime(incident.closedAt)}` : ""}
            </p>
            <p className="mt-[8px] text-[12px] text-folk-secondary">This incident is archived.</p>
          </div>
        )}

        <section>
          {!isPanelLayout && (
            <h3 className="mb-[14px] text-[12px] font-semibold uppercase tracking-[0.04em] text-folk-secondary">Investigation</h3>
          )}

          <div className={cn("grid grid-cols-1 gap-[12px]", !isPanelLayout && "max-w-[720px]")}>
            {renderStaffPicker(
              "Investigator",
              form.investigatedByStaffId,
              form.investigatedByName,
              isInvestigatorOpen,
              setIsInvestigatorOpen,
              investigatorRef,
              handleSelectInvestigator,
              "Assign investigator",
            )}

            <div>
              <FieldLabel>Additional wellbeing actions (investigation)</FieldLabel>
              <textarea
                value={form.investigationWellbeingActions}
                onChange={(event) => setForm((current) => ({ ...current, investigationWellbeingActions: event.target.value }))}
                readOnly={isInvestigationReadOnly}
                className={textareaClass}
                placeholder="Any further actions taken during the investigation beyond the initial report"
              />
            </div>

            <div>
              <FieldLabel>Investigation required</FieldLabel>
              <YesNoSelect
                value={form.investigationRequiredFlag}
                onChange={(value) => setForm((current) => ({ ...current, investigationRequiredFlag: value }))}
                disabled={isInvestigationReadOnly}
                isOpen={activeYesNoSelect === "investigationRequired"}
                onToggle={() => setActiveYesNoSelect((current) => (current === "investigationRequired" ? null : "investigationRequired"))}
                onClose={() => setActiveYesNoSelect(null)}
                buttonRef={investigationRequiredRef}
              />
            </div>

            <div>
              <FieldLabel required>Details of incident (what happened, causes etc)</FieldLabel>
              <textarea
                value={form.investigationIncidentDetails}
                onChange={(event) => setForm((current) => ({ ...current, investigationIncidentDetails: event.target.value }))}
                readOnly={isInvestigationReadOnly}
                className={textareaClass}
              />
            </div>

            <div>
              <FieldLabel required>Investigation findings</FieldLabel>
              <textarea
                value={form.investigationFindings}
                onChange={(event) => setForm((current) => ({ ...current, investigationFindings: event.target.value }))}
                readOnly={isInvestigationReadOnly}
                className={textareaClass}
              />
            </div>

            <div>
              <FieldLabel>Action taken to mitigate further incidents and/or ensure safety and wellbeing of staff and participants</FieldLabel>
              <textarea
                value={form.investigationMitigationActions}
                onChange={(event) => setForm((current) => ({ ...current, investigationMitigationActions: event.target.value }))}
                readOnly={isInvestigationReadOnly}
                className={textareaClass}
              />
            </div>

            <div className={pairGridClass}>
              <div>
                <FieldLabel>Investigation actions completed</FieldLabel>
                <input
                  type="text"
                  value={form.investigationActionsCompleted}
                  onChange={(event) => setForm((current) => ({ ...current, investigationActionsCompleted: event.target.value }))}
                  readOnly={isInvestigationReadOnly}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <FieldLabel>Date investigation action/s completed</FieldLabel>
                <button
                  ref={actionsCompletedDateRef}
                  type="button"
                  disabled={isInvestigationReadOnly}
                  onClick={() => handleToggleDatePicker("actionsCompleted")}
                  className={PICKER_BUTTON_CLASS}
                  aria-expanded={activeDatePicker === "actionsCompleted"}
                  tabIndex={0}
                >
                  <CalendarDays className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                  <span className={cn("truncate", !form.investigationActionsCompletedAt && "text-folk-placeholder")}>
                    {form.investigationActionsCompletedAt ? formatIncidentDate(parseIsoDate(form.investigationActionsCompletedAt)) : "Select date"}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <FieldLabel>Participant feedback on incident handling process</FieldLabel>
              <input
                type="text"
                value={form.participantFeedbackProcess}
                onChange={(event) => setForm((current) => ({ ...current, participantFeedbackProcess: event.target.value }))}
                readOnly={isInvestigationReadOnly}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <FieldLabel>Participant feedback comments</FieldLabel>
              <textarea
                value={form.participantFeedbackComments}
                onChange={(event) => setForm((current) => ({ ...current, participantFeedbackComments: event.target.value }))}
                readOnly={isInvestigationReadOnly}
                className={textareaClass}
              />
            </div>

            <div>
              <FieldLabel>Improvement actions</FieldLabel>
              <textarea
                value={form.improvementActions}
                onChange={(event) => setForm((current) => ({ ...current, improvementActions: event.target.value }))}
                readOnly={isInvestigationReadOnly}
                className={textareaClass}
              />
            </div>

            <div className={pairGridClass}>
              <div>
                <FieldLabel>Staff performance management required</FieldLabel>
                <YesNoSelect
                  value={form.staffPerformanceManagementRequired}
                  onChange={(value) => setForm((current) => ({ ...current, staffPerformanceManagementRequired: value }))}
                  disabled={isInvestigationReadOnly}
                  isOpen={activeYesNoSelect === "staffPerformance"}
                  onToggle={() => setActiveYesNoSelect((current) => (current === "staffPerformance" ? null : "staffPerformance"))}
                  onClose={() => setActiveYesNoSelect(null)}
                  buttonRef={staffPerformanceRef}
                />
              </div>
              <div>
                <FieldLabel>Improvement actions implemented</FieldLabel>
                <input
                  type="text"
                  value={form.improvementActionsImplemented}
                  onChange={(event) => setForm((current) => ({ ...current, improvementActionsImplemented: event.target.value }))}
                  readOnly={isInvestigationReadOnly}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className={pairGridClass}>
              <div>
                <FieldLabel>Date incident resolved</FieldLabel>
                <button
                  ref={resolvedDateRef}
                  type="button"
                  disabled={isInvestigationReadOnly}
                  onClick={() => handleToggleDatePicker("resolved")}
                  className={PICKER_BUTTON_CLASS}
                  aria-expanded={activeDatePicker === "resolved"}
                  tabIndex={0}
                >
                  <CalendarDays className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                  <span className={cn("truncate", !form.incidentResolvedAt && "text-folk-placeholder")}>
                    {form.incidentResolvedAt ? formatIncidentDate(parseIsoDate(form.incidentResolvedAt)) : "Select date"}
                  </span>
                </button>
              </div>
              {renderStaffPicker(
                "Resolved or completed by",
                form.resolvedByStaffId,
                form.resolvedByName,
                isResolverOpen,
                setIsResolverOpen,
                resolverRef,
                handleSelectResolver,
                "Select staff member",
              )}
            </div>

            <div>
              <FieldLabel>Upload documents</FieldLabel>
              {!isInvestigationReadOnly && (
                <FileUploadControl
                  buttonLabel="Upload documents"
                  ariaLabel="Upload documents"
                  onUploadingChange={setIsUploadingAttachments}
                  onUpload={handleAttachmentUpload}
                />
              )}
              {attachments.length > 0 ? (
                <div className={cn("flex flex-col gap-[6px]", !isInvestigationReadOnly && "mt-[8px]")}>
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-[8px] rounded-none border border-folk-border bg-folk-surface px-[10px] py-[8px]">
                      <FileText className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-folk-text">{attachment.name}</p>
                        <p className="text-[11px] text-folk-secondary">{formatInvestigationFileSize(attachment.size)}</p>
                      </div>
                      {attachment.url && (
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-folk-secondary hover:text-folk-text" aria-label={`Download ${attachment.name}`}>
                          <Download className="h-[14px] w-[14px]" strokeWidth={1.5} />
                        </a>
                      )}
                      {!isInvestigationReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(attachment)}
                          className="shrink-0 text-[12px] font-medium text-[#dc2626] hover:underline"
                          tabIndex={0}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : isInvestigationReadOnly ? (
                <p className="mt-[8px] text-[12px] text-folk-secondary">No documents uploaded.</p>
              ) : (
                <p className="mt-[8px] text-[12px] text-folk-secondary">Add photos, documents, or other files related to this investigation.</p>
              )}
            </div>

            <div className="border-t border-folk-border-subtle pt-[16px]">
              <FieldLabel required>Investigation status</FieldLabel>
              {isInvestigationReadOnly ? (
                <InvestigationStatusChip status={incident.investigationStatus} />
              ) : (
                <>
                  <button
                    ref={statusRef}
                    type="button"
                    onClick={() => setIsStatusOpen((open) => !open)}
                    className={SELECT_BUTTON_CLASS}
                    aria-expanded={isStatusOpen}
                    tabIndex={0}
                  >
                    <InvestigationStatusChip status={form.investigationStatus} />
                    <ChevronDown className={cn("ml-[8px] h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform", isStatusOpen && "rotate-180")} strokeWidth={1.5} />
                  </button>
                  <FixedSelectDropdown isOpen={isStatusOpen} anchorRef={statusRef} onClose={() => setIsStatusOpen(false)} estimatedHeight={160} minWidth={240}>
                    {INVESTIGATION_STATUS_OPTIONS.map((option) => (
                      <FixedSelectOption key={option.value} isActive={form.investigationStatus === option.value} onClick={() => handleStatusChange(option.value)}>
                        <InvestigationStatusChip status={option.value} />
                      </FixedSelectOption>
                    ))}
                  </FixedSelectDropdown>
                </>
              )}
            </div>

            {!isNotAnIncident && (
            <div className="border-t border-folk-border-subtle pt-[16px]">
              <FieldLabel required={!isInvestigationReadOnly}>Quality checked</FieldLabel>
              {isInvestigationReadOnly ? (
                <div className="grid grid-cols-1 gap-[12px]">
                  <div className="flex h-[36px] items-center rounded-none border border-folk-border bg-folk-hover px-[10px] text-[13px] text-folk-text">
                    Yes
                  </div>
                  {renderStaffPicker(
                    "Quality checked by",
                    qualityCheckedByStaffId,
                    qualityCheckedByName,
                    false,
                    () => {},
                    qualityCheckerRef,
                    handleSelectQualityChecker,
                    "Select staff member",
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-[12px]">
                  <YesNoSelect
                    value={qualityChecked}
                    onChange={(value) => {
                      setQualityChecked(value)
                      setQualityCheckError(null)
                      if (value !== "yes") {
                        setQualityCheckedByStaffId(null)
                        setQualityCheckedByName("")
                      }
                    }}
                    isOpen={activeYesNoSelect === "qualityChecked"}
                    onToggle={() => setActiveYesNoSelect((current) => (current === "qualityChecked" ? null : "qualityChecked"))}
                    onClose={() => setActiveYesNoSelect(null)}
                    buttonRef={qualityCheckedRef}
                  />
                  {qualityChecked === "yes" && renderStaffPicker(
                    "Quality checked by",
                    qualityCheckedByStaffId,
                    qualityCheckedByName,
                    isQualityCheckerOpen,
                    setIsQualityCheckerOpen,
                    qualityCheckerRef,
                    handleSelectQualityChecker,
                    "Select staff member",
                  )}
                  {qualityCheckError && <p className="text-[12px] font-medium text-[#dc2626]">{qualityCheckError}</p>}
                </div>
              )}
            </div>
            )}
          </div>
        </section>
      </div>

      <div className={cn(
        "flex items-center justify-end gap-[8px] border-t border-folk-border-subtle py-[14px]",
        isPanelLayout ? "px-[16px]" : "px-[24px]"
      )}>
        {!isInvestigationReadOnly && (
          <div className="flex flex-col items-end gap-[6px]">
            {saveBlockedReason && (
              <p className="text-[12px] font-medium text-[#dc2626]">{saveBlockedReason}</p>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSaving || isClosing || isUploadingAttachments || !canSaveInvestigation}
              className="h-[34px] rounded-none px-[14px]"
            >
              {isSaving || isClosing
                ? shouldArchive ? "Archiving…" : "Saving…"
                : shouldArchive
                  ? "Save and archive"
                  : form.investigationStatus === "completed"
                    ? "Complete investigation"
                    : "Save investigation"}
            </Button>
          </div>
        )}
      </div>

      <FixedDatePickerDropdown
        isOpen={activeDatePicker === "actionsCompleted"}
        anchorRef={actionsCompletedDateRef}
        align={isPanelLayout ? "left" : "match"}
        value={parseIsoDate(form.investigationActionsCompletedAt)}
        onChange={(value) => {
          setForm((current) => ({
            ...current,
            investigationActionsCompletedAt: value ? new Date(`${value}T00:00:00`).toISOString() : null,
          }))
          handleCloseDatePicker()
        }}
        onClose={handleCloseDatePicker}
      />
      <FixedDatePickerDropdown
        isOpen={activeDatePicker === "resolved"}
        anchorRef={resolvedDateRef}
        align={isPanelLayout ? "left" : "match"}
        value={parseIsoDate(form.incidentResolvedAt)}
        onChange={(value) => {
          setForm((current) => ({
            ...current,
            incidentResolvedAt: value ? new Date(`${value}T00:00:00`).toISOString() : null,
          }))
          handleCloseDatePicker()
        }}
        onClose={handleCloseDatePicker}
      />
    </div>
  )
}
