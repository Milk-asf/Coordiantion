import {
  getFormProcess,
  isContentField,
  type Form,
  type FormField,
  type FormProcessKey,
  type FormSubmission,
} from "@/lib/form-definitions"

export interface FormSubmissionRecord {
  submission: FormSubmission
  form: Form | null
  formName: string
  formStatus: string
  connectedProcess: string
  submittedByName: string
  submittedAt: string
}

export interface FormAnswerRecord {
  submissionId: string
  formName: string
  fieldLabel: string
  fieldType: string
  answer: string
  submittedByName: string
  submittedAt: string
}

const GROUPABLE_FIELD_TYPES = new Set([
  "dropdown",
  "single-select",
  "multi-select",
  "checkbox",
  "number",
  "rating",
  "linear-scale",
  "staff-select",
  "client-select",
])

function connectedProcessLabel(form: Form | null): string {
  if (!form?.settings.connectedProcess) return "Standalone"
  return getFormProcess(form.settings.connectedProcess)?.label ?? form.settings.connectedProcess
}

function formatAnswerValue(field: FormField, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") return String(value)
  if (Array.isArray(value)) {
    const labels = value
      .map((item) => formatAnswerValue(field, item))
      .filter((item): item is string => Boolean(item))
    return labels.length > 0 ? labels.join(", ") : null
  }
  const text = String(value).trim()
  if (!text) return null
  if (field.options?.length) {
    const match = field.options.find((option) => option.id === text || option.label === text)
    if (match) return match.label
  }
  return text
}

export function buildFormSubmissionRecords(
  forms: Form[],
  submissions: FormSubmission[],
  getProcessKey?: (formId: string) => FormProcessKey | null,
): FormSubmissionRecord[] {
  const formById = new Map(forms.map((form) => [form.id, form]))

  return submissions.map((submission) => {
    const form = formById.get(submission.formId) ?? null
    const processKey = form ? (getProcessKey?.(form.id) ?? form.settings.connectedProcess ?? null) : null
    const processLabel = processKey ? (getFormProcess(processKey)?.label ?? processKey) : connectedProcessLabel(form)

    return {
      submission,
      form,
      formName: form?.name || "Deleted form",
      formStatus: form?.status || "—",
      connectedProcess: processLabel,
      submittedByName: submission.submittedByName || "—",
      submittedAt: submission.createdAt,
    }
  })
}

export function flattenFormAnswerRecords(records: FormSubmissionRecord[]): FormAnswerRecord[] {
  return records.flatMap((record) => {
    const form = record.form
    if (!form) return []

    return form.schema.fields
      .filter((field) => !isContentField(field.type) && GROUPABLE_FIELD_TYPES.has(field.type))
      .flatMap((field) => {
        const raw = record.submission.answers[field.id]
        if (raw === null || raw === undefined || raw === "") return []

        if (Array.isArray(raw)) {
          return raw
            .map((value) => formatAnswerValue(field, value))
            .filter((answer): answer is string => Boolean(answer))
            .map((answer) => ({
              submissionId: record.submission.id,
              formName: record.formName,
              fieldLabel: field.label,
              fieldType: field.type,
              answer,
              submittedByName: record.submittedByName,
              submittedAt: record.submittedAt,
            }))
        }

        const answer = formatAnswerValue(field, raw)
        if (!answer) return []

        return [{
          submissionId: record.submission.id,
          formName: record.formName,
          fieldLabel: field.label,
          fieldType: field.type,
          answer,
          submittedByName: record.submittedByName,
          submittedAt: record.submittedAt,
        }]
      })
  })
}

export function countAnswerFields(form: Form): number {
  return form.schema.fields.filter((field) => !isContentField(field.type)).length
}
