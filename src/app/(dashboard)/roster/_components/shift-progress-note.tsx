"use client"

import { AlertTriangle, ClipboardList, Target } from "lucide-react"
import { SignaturePad } from "@/components/signature-pad"
import { cn } from "@/lib/utils"

/** Editable fields of a progress note. Author and timestamps are stamped on save. */
export interface ProgressNoteDraft {
  supportProvided: string
  goalProgress: string
  observations: string
  concerns: string
  incidentOccurred: boolean
  followUp: string
  signature: string
}

export const EMPTY_PROGRESS_NOTE_DRAFT: ProgressNoteDraft = {
  supportProvided: "",
  goalProgress: "",
  observations: "",
  concerns: "",
  incidentOccurred: false,
  followUp: "",
  signature: "",
}

const FORM_LABEL_CLASS = "mb-[4px] block text-[12px] font-medium text-folk-secondary"
const HINT_CLASS = "mb-[6px] text-[11px] leading-snug text-folk-secondary"
const TEXTAREA_CLASS =
  "min-h-[84px] w-full resize-y rounded-none border border-folk-border bg-folk-page px-[12px] py-[8px] text-[13px] font-medium leading-[1.5] text-folk-text outline-none placeholder:text-folk-placeholder hover:border-[#bababa] focus:border-[#a3c4f3]"

interface ShiftProgressNoteEditorProps {
  value: ProgressNoteDraft
  onChange: (next: ProgressNoteDraft) => void
  clientName: string
  goalTitle?: string | null
  disabled?: boolean
  authorName?: string
  recordedAt?: string
}

const NOTE_FIELDS: {
  key: keyof Pick<ProgressNoteDraft, "supportProvided" | "goalProgress" | "observations" | "concerns" | "followUp">
  label: string
  hint: string
  placeholder: string
  required?: boolean
}[] = [
  {
    key: "supportProvided",
    label: "Support provided",
    hint: "Describe the supports and activities delivered this shift, in objective and factual terms.",
    placeholder: "e.g. Assisted with morning personal care, prepared breakfast, and supported a community access outing to the library.",
    required: true,
  },
  {
    key: "goalProgress",
    label: "Progress toward goals",
    hint: "How did the participant progress toward their NDIS goals during this support?",
    placeholder: "e.g. Practised ordering independently at the café, working toward the social participation goal.",
  },
  {
    key: "observations",
    label: "Observations",
    hint: "Note the participant's wellbeing, mood, behaviour, and any changes to health or presentation.",
    placeholder: "e.g. Presented as calm and engaged. Ate and drank well. No changes to physical health observed.",
  },
  {
    key: "concerns",
    label: "Concerns or changes",
    hint: "Record any concerns, risks, or changes in support needs. Flag anything that needs follow-up below.",
    placeholder: "e.g. Reported mild knee pain when walking. No falls. Family notified.",
  },
  {
    key: "followUp",
    label: "Follow-up / handover",
    hint: "Actions to carry into the next shift or matters to hand over to the team.",
    placeholder: "e.g. Monitor knee pain next shift. Restock continence aids.",
  },
]

export function ShiftProgressNoteEditor({
  value,
  onChange,
  clientName,
  goalTitle,
  disabled = false,
  authorName,
  recordedAt,
}: ShiftProgressNoteEditorProps) {
  const update = <K extends keyof ProgressNoteDraft>(key: K, next: ProgressNoteDraft[K]) =>
    onChange({ ...value, [key]: next })

  const recordedLabel = recordedAt
    ? new Date(recordedAt).toLocaleString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null

  return (
    <div className="space-y-[16px]">
      <div className="flex items-start gap-[8px] rounded-none border border-folk-border-subtle bg-folk-page px-[12px] py-[10px]">
        <ClipboardList className="mt-[1px] h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.75} />
        <p className="text-[12px] leading-snug text-folk-secondary">
          Progress note for <span className="font-semibold text-folk-text">{clientName || "this participant"}</span>.
          Keep it factual, objective, and written in plain language as required by the NDIS Practice Standards.
        </p>
      </div>

      {NOTE_FIELDS.map((field) => (
        <div key={field.key}>
          <label className={FORM_LABEL_CLASS} htmlFor={`note-${field.key}`}>
            {field.label}
            {field.required && <span className="ml-[3px] text-red-500">*</span>}
          </label>
          {field.key === "goalProgress" && goalTitle ? (
            <p className={cn(HINT_CLASS, "flex items-center gap-[5px]")}>
              <Target className="h-[12px] w-[12px] shrink-0 text-[#2563EB]" strokeWidth={1.75} />
              <span>
                Linked goal: <span className="font-medium text-folk-text">{goalTitle}</span>
              </span>
            </p>
          ) : (
            <p className={HINT_CLASS}>{field.hint}</p>
          )}
          <textarea
            id={`note-${field.key}`}
            value={value[field.key]}
            onChange={(event) => update(field.key, event.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={cn(TEXTAREA_CLASS, disabled && "cursor-not-allowed opacity-70")}
          />
        </div>
      ))}

      <label
        className={cn(
          "flex cursor-pointer items-start gap-[10px] rounded-none border px-[12px] py-[10px] transition-colors",
          value.incidentOccurred
            ? "border-amber-300 bg-amber-50"
            : "border-folk-border-subtle bg-folk-page hover:border-[#bababa]",
          disabled && "cursor-not-allowed opacity-70",
        )}
      >
        <input
          type="checkbox"
          checked={value.incidentOccurred}
          onChange={(event) => update("incidentOccurred", event.target.checked)}
          disabled={disabled}
          className="mt-[2px] h-[14px] w-[14px] shrink-0 accent-amber-500"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-[6px] text-[13px] font-semibold text-folk-text">
            <AlertTriangle className="h-[13px] w-[13px] shrink-0 text-amber-600" strokeWidth={2} />
            An incident occurred during this shift
          </span>
          <span className="mt-[2px] block text-[12px] leading-snug text-folk-secondary">
            Tick if something happened that needs a formal incident report. You&apos;ll still need to lodge the report
            from the Incidents area.
          </span>
        </span>
      </label>

      <div>
        <label className={FORM_LABEL_CLASS}>Signature</label>
        <p className={HINT_CLASS}>Sign to confirm this is an accurate record of the support delivered.</p>
        <SignaturePad
          value={value.signature}
          onChange={(dataUrl) => update("signature", dataUrl)}
          disabled={disabled}
          height={130}
        />
      </div>

      {(authorName || recordedLabel) && (
        <div className="border-t border-folk-border-subtle pt-[12px] text-[11px] leading-snug text-folk-secondary">
          {authorName && (
            <p>
              Recorded by <span className="font-medium text-folk-text">{authorName}</span>
            </p>
          )}
          {recordedLabel && <p className="mt-[2px]">First recorded {recordedLabel}</p>}
        </div>
      )}
    </div>
  )
}
