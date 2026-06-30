"use client"

import { useMemo, useState } from "react"
import { Inbox, X } from "lucide-react"
import { isContentField, type Form, type FormField, type FormSubmission } from "@/lib/form-definitions"
import {
  TABLE_FULL,
  TABLE_PANEL_CELL,
  TABLE_PANEL_CELL_LAST,
  TABLE_PANEL_HEADER,
  TABLE_PANEL_HEADER_LAST,
} from "@/lib/table-styles"
import { cn } from "@/lib/utils"

interface FormSubmissionsTableProps {
  form: Form
  submissions: FormSubmission[]
}

function formatAnswer(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  return String(value)
}

function formatDateTime(value: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
}

export function FormSubmissionsTable({ form, submissions }: FormSubmissionsTableProps) {
  const [activeSubmission, setActiveSubmission] = useState<FormSubmission | null>(null)

  const dataFields = useMemo(() => form.schema.fields.filter((field) => !isContentField(field.type)), [form.schema.fields])
  const columnFields = dataFields.slice(0, 4)
  const totalColumns = columnFields.length + 2

  return (
    <div className="h-full overflow-auto bg-folk-surface">
      <table className={TABLE_FULL} style={{ tableLayout: "fixed", minWidth: 720 }}>
        <thead>
          <tr>
            {columnFields.map((field) => (
              <th key={field.id} className={cn(TABLE_PANEL_HEADER, "w-[200px]")}>
                <span className="block truncate">{field.label || "Field"}</span>
              </th>
            ))}
            <th className={cn(TABLE_PANEL_HEADER, "w-[160px]")}>Submitted by</th>
            <th className={cn(TABLE_PANEL_HEADER_LAST, "w-[180px]")}>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {submissions.length === 0 && (
            <tr>
              <td colSpan={totalColumns} className="px-[16px] py-[48px]">
                <div className="flex flex-col items-center gap-[8px] text-center">
                  <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-folk-hover text-folk-secondary">
                    <Inbox className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </div>
                  <p className="text-[13px] font-medium text-folk-text">No submissions yet</p>
                  <p className="max-w-[360px] text-[12px] leading-[1.5] text-folk-secondary">
                    Responses to this form will appear here. Attach the form to a process or share it to start collecting submissions.
                  </p>
                </div>
              </td>
            </tr>
          )}
          {submissions.map((submission) => (
            <tr
              key={submission.id}
              className="group cursor-pointer transition-colors hover:bg-folk-hover"
              onClick={() => setActiveSubmission(submission)}
            >
              {columnFields.map((field) => (
                <td key={field.id} className={TABLE_PANEL_CELL}>
                  <span className="block truncate text-[13px] text-folk-text">{formatAnswer(submission.answers[field.id])}</span>
                </td>
              ))}
              <td className={TABLE_PANEL_CELL}>
                <span className="text-[13px] text-folk-secondary">{submission.submittedByName || "—"}</span>
              </td>
              <td className={TABLE_PANEL_CELL_LAST}>
                <span className="text-[13px] text-folk-secondary">{formatDateTime(submission.createdAt)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {activeSubmission && (
        <SubmissionDetail form={form} submission={activeSubmission} onClose={() => setActiveSubmission(null)} />
      )}
    </div>
  )
}

function SubmissionDetail({ form, submission, onClose }: { form: Form; submission: FormSubmission; onClose: () => void }) {
  const fields: FormField[] = form.schema.fields.filter((field) => !isContentField(field.type))

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-[420px] flex-col bg-white shadow-folk"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-folk-border-subtle px-[20px]">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-folk-text">Submission</p>
            <p className="truncate text-[12px] text-folk-secondary">
              {submission.submittedByName || "Unknown"} · {formatDateTime(submission.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
            aria-label="Close"
            tabIndex={0}
          >
            <X className="h-[16px] w-[16px]" strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-[20px]">
          <div className="flex flex-col gap-[16px]">
            {fields.map((field) => (
              <div key={field.id}>
                <p className="text-[12px] font-medium text-folk-secondary">{field.label || "Field"}</p>
                <p className="mt-[4px] whitespace-pre-wrap text-[13px] text-folk-text">{formatAnswer(submission.answers[field.id])}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
