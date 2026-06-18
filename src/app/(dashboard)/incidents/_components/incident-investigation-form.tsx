"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"
import { Button } from "@/components/button"
import { FixedSelectDropdown, FixedSelectOption } from "@/components/fixed-select-dropdown"
import { SearchableEntityDropdown } from "@/components/searchable-entity-dropdown"
import type { IncidentInvestigationInput } from "@/lib/hooks/use-incidents"
import type { Incident, IncidentInvestigationStatus, StaffMember } from "@/lib/types"
import { cn } from "@/lib/utils"

const SELECT_BUTTON_CLASS =
  "flex h-[36px] w-full items-center justify-between rounded-none border border-folk-border bg-folk-surface px-[10px] text-left text-[13px] font-medium transition-colors hover:bg-folk-hover"

const TEXTAREA_CLASS =
  "min-h-[96px] w-full resize-y rounded-none border border-folk-border bg-folk-surface px-[10px] py-[8px] text-[13px] text-folk-text outline-none"

const INVESTIGATION_STATUS_OPTIONS: { value: IncidentInvestigationStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
]

function incidentToInvestigation(incident: Incident): IncidentInvestigationInput {
  return {
    investigationStatus: incident.investigationStatus || "not_started",
    investigatedByStaffId: incident.investigatedByStaffId,
    investigatedByName: incident.investigatedByName,
    investigationSummary: incident.investigationSummary,
    investigationRootCause: incident.investigationRootCause,
    investigationCorrectiveActions: incident.investigationCorrectiveActions,
    investigationPreventativeActions: incident.investigationPreventativeActions,
    investigationCompletedAt: incident.investigationCompletedAt,
  }
}

function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-[6px] block text-[12px] font-medium text-folk-secondary">
      {children}
      {required && <span className="text-[#dc2626]"> *</span>}
    </label>
  )
}

interface IncidentInvestigationFormProps {
  incident: Incident
  staff: StaffMember[]
  isSaving: boolean
  onSubmit: (input: IncidentInvestigationInput) => Promise<void>
}

export function IncidentInvestigationForm({
  incident,
  staff,
  isSaving,
  onSubmit,
}: IncidentInvestigationFormProps) {
  const [form, setForm] = useState<IncidentInvestigationInput>(() => incidentToInvestigation(incident))
  const [isInvestigatorOpen, setIsInvestigatorOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const investigatorRef = useRef<HTMLButtonElement>(null)
  const statusRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setForm(incidentToInvestigation(incident))
  }, [incident])

  const staffOptions = useMemo(
    () => staff.map((member) => ({
      id: member.id,
      label: member.name,
      iconText: member.iconText,
    })),
    [staff]
  )

  const selectedInvestigator = staff.find((member) => member.id === form.investigatedByStaffId)
  const statusLabel = INVESTIGATION_STATUS_OPTIONS.find((option) => option.value === form.investigationStatus)?.label ?? "Select status"

  const handleSelectInvestigator = (staffId: string) => {
    const member = staff.find((item) => item.id === staffId)
    setForm((current) => ({
      ...current,
      investigatedByStaffId: staffId || null,
      investigatedByName: member?.name ?? "",
    }))
    setIsInvestigatorOpen(false)
  }

  const handleStatusChange = (status: IncidentInvestigationStatus) => {
    setForm((current) => ({
      ...current,
      investigationStatus: status,
      investigationCompletedAt: status === "completed"
        ? current.investigationCompletedAt ?? new Date().toISOString()
        : status === "not_started" ? null : current.investigationCompletedAt,
    }))
    setIsStatusOpen(false)
  }

  const handleSubmit = async () => {
    await onSubmit(form)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-[24px] py-[18px]">
        <section>
          <h3 className="mb-[14px] text-[12px] font-semibold uppercase tracking-[0.04em] text-folk-secondary">
            Investigation
          </h3>
          <p className="mb-[16px] text-[13px] text-folk-secondary">
            Admin-only investigation notes and follow-up actions for this incident report.
          </p>
          <div className="grid max-w-[720px] grid-cols-1 gap-[14px]">
            <div>
              <FieldLabel required>Investigation status</FieldLabel>
              <button
                ref={statusRef}
                type="button"
                onClick={() => setIsStatusOpen((open) => !open)}
                className={SELECT_BUTTON_CLASS}
                aria-expanded={isStatusOpen}
                tabIndex={0}
              >
                <span className="text-folk-text">{statusLabel}</span>
                <ChevronDown className={cn("ml-[8px] h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform", isStatusOpen && "rotate-180")} strokeWidth={1.5} />
              </button>
              <FixedSelectDropdown
                isOpen={isStatusOpen}
                anchorRef={statusRef}
                onClose={() => setIsStatusOpen(false)}
                estimatedHeight={120}
                minWidth={240}
              >
                {INVESTIGATION_STATUS_OPTIONS.map((option) => (
                  <FixedSelectOption
                    key={option.value}
                    isActive={form.investigationStatus === option.value}
                    onClick={() => handleStatusChange(option.value)}
                  >
                    {option.label}
                  </FixedSelectOption>
                ))}
              </FixedSelectDropdown>
            </div>

            <div>
              <FieldLabel>Investigator</FieldLabel>
              <button
                ref={investigatorRef}
                type="button"
                onClick={() => setIsInvestigatorOpen((open) => !open)}
                className={SELECT_BUTTON_CLASS}
                tabIndex={0}
              >
                <span className="flex min-w-0 items-center gap-[8px]">
                  {selectedInvestigator ? (
                    <>
                      <EntityIcon text={selectedInvestigator.iconText} size="xs" />
                      <span className="truncate">{selectedInvestigator.name}</span>
                    </>
                  ) : (
                    <span className="text-folk-placeholder">Assign investigator</span>
                  )}
                </span>
                <ChevronDown className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.75} />
              </button>
              <SearchableEntityDropdown
                isOpen={isInvestigatorOpen}
                anchorRef={investigatorRef}
                options={staffOptions}
                selectedId={form.investigatedByStaffId || ""}
                searchPlaceholder="Search staff…"
                emptyMessage="No staff found"
                onSelect={handleSelectInvestigator}
                onClose={() => setIsInvestigatorOpen(false)}
              />
            </div>

            <div>
              <FieldLabel required>Investigation summary</FieldLabel>
              <textarea
                value={form.investigationSummary}
                onChange={(event) => setForm((current) => ({ ...current, investigationSummary: event.target.value }))}
                className={TEXTAREA_CLASS}
                placeholder="Summarise what was investigated and the findings"
              />
            </div>

            <div>
              <FieldLabel>Root cause</FieldLabel>
              <textarea
                value={form.investigationRootCause}
                onChange={(event) => setForm((current) => ({ ...current, investigationRootCause: event.target.value }))}
                className={TEXTAREA_CLASS}
                placeholder="Identify contributing factors or root cause"
              />
            </div>

            <div>
              <FieldLabel>Corrective actions</FieldLabel>
              <textarea
                value={form.investigationCorrectiveActions}
                onChange={(event) => setForm((current) => ({ ...current, investigationCorrectiveActions: event.target.value }))}
                className={TEXTAREA_CLASS}
                placeholder="Actions taken to address this incident"
              />
            </div>

            <div>
              <FieldLabel>Preventative actions</FieldLabel>
              <textarea
                value={form.investigationPreventativeActions}
                onChange={(event) => setForm((current) => ({ ...current, investigationPreventativeActions: event.target.value }))}
                className={TEXTAREA_CLASS}
                placeholder="Steps to reduce the likelihood of recurrence"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="flex items-center justify-end border-t border-folk-border-subtle px-[24px] py-[14px]">
        <Button
          onClick={handleSubmit}
          disabled={isSaving || !form.investigationSummary.trim()}
          className="h-[34px] rounded-none px-[14px]"
        >
          {isSaving ? "Saving…" : "Save investigation"}
        </Button>
      </div>
    </div>
  )
}
