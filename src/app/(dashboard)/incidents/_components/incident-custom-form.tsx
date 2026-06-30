"use client"

import { useMemo, useState } from "react"
import type { Client, StaffMember } from "@/lib/types"
import type { IncidentInput } from "@/lib/incidents-context"
import { INCIDENT_CATEGORIES, getDefaultReportableForCategory } from "@/lib/incident-definitions"
import { isContentField, type Form, type FormField } from "@/lib/form-definitions"
import { FieldRenderer, type AnswerValue } from "../../forms/_components/form-preview"
import { cn } from "@/lib/utils"

interface IncidentCustomFormProps {
  form: Form
  clients: Client[]
  staff: StaffMember[]
  initialClientIds: string[]
  isSaving: boolean
  onSubmit: (input: IncidentInput, answers: Record<string, unknown>) => void | Promise<void>
  onClose: () => void
}

function buildIncidentInput(
  form: Form,
  answers: Record<string, AnswerValue>,
  clients: Client[],
  staff: StaffMember[],
  initialClientIds: string[],
): IncidentInput {
  const byKey = new Map<string, FormField>()
  for (const field of form.schema.fields) {
    if (field.incidentKey) byKey.set(field.incidentKey, field)
  }

  const text = (key: string): string => {
    const field = byKey.get(key)
    if (!field) return ""
    const value = answers[field.id]
    if (value === null || value === undefined) return ""
    return Array.isArray(value) ? value.join(", ") : String(value)
  }

  const resolveStaff = (name: string): { id: string | null; name: string } => {
    if (!name) return { id: null, name: "" }
    const match = staff.find((member) => member.name === name)
    return { id: match?.id ?? null, name }
  }

  // Capture participants from any client-select field, falling back to query-param client.
  const clientNameAnswers = form.schema.fields
    .filter((field) => field.type === "client-select")
    .flatMap((field) => {
      const value = answers[field.id]
      if (Array.isArray(value)) return value.map(String)
      return value ? [String(value)] : []
    })
  const matchedClientIds = clientNameAnswers
    .map((name) => clients.find((client) => client.displayName === name)?.id)
    .filter((id): id is string => Boolean(id))
  const clientIds = matchedClientIds.length > 0 ? matchedClientIds : initialClientIds
  const clientNames = clientIds
    .map((id) => clients.find((client) => client.id === id)?.displayName)
    .filter(Boolean)
    .join(", ")

  const reportedBy = resolveStaff(text("reportedBy"))
  const assignedTo = resolveStaff(text("assignedTo"))
  const title = text("title")
  const priority = text("priority")
  const description = text("description")

  // The category field stores the display label; convert it back to the canonical slug value.
  const categoryLabel = text("category")
  const category = INCIDENT_CATEGORIES.find((item) => item.label === categoryLabel)?.value ?? categoryLabel
  const reportable = getDefaultReportableForCategory(category)

  // Title and priority have no dedicated incident columns; keep them in the description so nothing is lost.
  const descriptionParts = [
    title ? `Title: ${title}` : "",
    priority ? `Priority: ${priority}` : "",
    description,
  ].filter(Boolean)

  return {
    completedByStaffId: assignedTo.id,
    completedByName: assignedTo.name,
    reportedByStaffId: reportedBy.id,
    reportedByName: reportedBy.name,
    clientIds,
    clientNames,
    workerIds: [],
    workerNames: "",
    incidentDate: text("dateReported"),
    incidentStartTime: "",
    incidentEndTime: "",
    location: text("location"),
    otherParties: "",
    category,
    incidentStatus: "confirmed",
    isReportable: reportable.isReportable,
    ndisReportableCategory: reportable.ndisReportableCategory,
    description: descriptionParts.join("\n"),
    userActivities: text("userActivities"),
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
  }
}

export function IncidentCustomForm({
  form,
  clients,
  staff,
  initialClientIds,
  isSaving,
  onSubmit,
  onClose,
}: IncidentCustomFormProps) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [errors, setErrors] = useState<Set<string>>(new Set())

  const fields = form.schema.fields

  const setAnswer = (fieldId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }))
    setErrors((prev) => {
      if (!prev.has(fieldId)) return prev
      const next = new Set(prev)
      next.delete(fieldId)
      return next
    })
  }

  const isAnswered = (field: FormField): boolean => {
    const value = answers[field.id]
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === "boolean") return value
    if (typeof value === "number") return true
    return Boolean(value && String(value).trim())
  }

  const requiredFields = useMemo(
    () => fields.filter((field) => !isContentField(field.type) && field.required),
    [fields],
  )

  const handleSubmit = async () => {
    const missing = requiredFields.filter((field) => !isAnswered(field))
    if (missing.length > 0) {
      setErrors(new Set(missing.map((field) => field.id)))
      const firstMissing = fields.find((field) => missing.some((m) => m.id === field.id))
      if (firstMissing) {
        document.getElementById(`field-${firstMissing.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      return
    }
    const input = buildIncidentInput(form, answers, clients, staff, initialClientIds)
    await onSubmit(input, answers as Record<string, unknown>)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[760px] px-[24px] py-[28px]">
          {form.settings.showFormDescription && form.description && (
            <p className="mb-[20px] text-[13px] leading-[1.6] text-folk-secondary">{form.description}</p>
          )}

          <div className="flex flex-col gap-[18px]">
            {fields.length === 0 ? (
              <p className="text-[13px] text-folk-tertiary">This form has no fields yet.</p>
            ) : (
              fields.map((field) => (
                <div key={field.id} id={`field-${field.id}`}>
                  <FieldRenderer
                    field={field}
                    value={answers[field.id] ?? null}
                    onChange={(value) => setAnswer(field.id, value)}
                    hasError={errors.has(field.id)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[60px] shrink-0 items-center justify-between border-t border-folk-border bg-white px-[24px]">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[6px] px-[12px] py-[7px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className={cn(
            "rounded-[6px] bg-folk-text px-[16px] py-[8px] text-[13px] font-medium text-white transition-colors hover:bg-black disabled:opacity-60",
          )}
          tabIndex={0}
        >
          {isSaving ? "Submitting…" : "Submit report"}
        </button>
      </div>
    </div>
  )
}
