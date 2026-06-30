"use client"

import { useMemo, useState } from "react"
import { Check, ChevronLeft, ChevronRight, Star, Upload, X } from "lucide-react"
import { useClients } from "@/lib/hooks/use-clients"
import { useStaff } from "@/lib/hooks/use-staff"
import { isContentField, type Form, type FormField } from "@/lib/form-definitions"
import { cn } from "@/lib/utils"

interface FormPreviewModalProps {
  form: Form
  isOpen: boolean
  onClose: () => void
}

export type AnswerValue = string | string[] | number | boolean | null

interface VirtualPage {
  id: string
  title: string
}

export function FormPreviewModal({ form, isOpen, onClose }: FormPreviewModalProps) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [pageIndex, setPageIndex] = useState(0)
  const [errors, setErrors] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)

  const { steps, fields } = form.schema

  const pages: VirtualPage[] = useMemo(
    () => (steps.length ? steps : [{ id: "__all__", title: "" }]),
    [steps],
  )

  const questionNumbers = useMemo(() => {
    if (!form.settings.showQuestionNumbers) return {}
    const map: Record<string, number> = {}
    let counter = 0
    for (const field of fields) {
      if (isContentField(field.type)) continue
      counter += 1
      map[field.id] = counter
    }
    return map
  }, [fields, form.settings.showQuestionNumbers])

  const getPageFields = (pageId: string): FormField[] => {
    if (!steps.length) return fields
    return fields.filter((field) => (field.stepId ?? steps[0].id) === pageId)
  }

  if (!isOpen) return null

  const currentPage = pages[Math.min(pageIndex, pages.length - 1)]
  const pageFields = getPageFields(currentPage.id)
  const isLastPage = pageIndex >= pages.length - 1

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

  const validatePage = (): boolean => {
    const missing = pageFields.filter((field) => !isContentField(field.type) && field.required && !isAnswered(field))
    if (missing.length === 0) return true
    setErrors(new Set(missing.map((field) => field.id)))
    return false
  }

  const handleNext = () => {
    if (!validatePage()) return
    if (isLastPage) {
      setSubmitted(true)
      return
    }
    setPageIndex((index) => index + 1)
  }

  const handleBack = () => setPageIndex((index) => Math.max(0, index - 1))

  const resetForm = () => {
    setAnswers({})
    setErrors(new Set())
    setPageIndex(0)
    setSubmitted(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-[24px]" role="dialog" aria-modal="true">
      <div className="flex h-[680px] max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[12px] bg-white shadow-folk">
        <div className="flex h-[48px] shrink-0 items-center justify-between border-b border-folk-border-subtle px-[16px]">
          <div className="flex items-center gap-[8px]">
            <span className="rounded-full bg-folk-hover px-[8px] py-[3px] text-[11px] font-semibold uppercase tracking-wide text-folk-secondary">Preview</span>
            <span className="text-[12px] text-folk-tertiary">Responses aren&apos;t saved in preview</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
            aria-label="Close preview"
            tabIndex={0}
          >
            <X className="h-[16px] w-[16px]" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {submitted ? (
            <SuccessScreen form={form} onSubmitAnother={form.settings.successScreen.allowSubmitAnother ? resetForm : undefined} />
          ) : (
            <div className="mx-auto w-full max-w-[560px] px-[24px] py-[28px]">
              {form.settings.showCover && (
                <div
                  className="mb-[16px] h-[120px] rounded-[8px] bg-folk-hover"
                  style={
                    form.settings.coverImage
                      ? { backgroundImage: `url(${form.settings.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : { backgroundColor: form.settings.coverColor }
                  }
                />
              )}

              <div className="flex items-center gap-[10px]">
                {form.settings.showIcon && <span className="text-[24px]">{form.icon}</span>}
                <h1 className="text-[22px] font-bold text-folk-text">{form.name || "Untitled form"}</h1>
              </div>
              {form.settings.showFormDescription && form.description && (
                <p className="mt-[6px] text-[13px] leading-[1.6] text-folk-secondary">{form.description}</p>
              )}

              {pages.length > 1 && (
                <div className="mt-[16px] flex items-center gap-[8px]">
                  {pages.map((page, index) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => form.settings.allowStepNavigation && setPageIndex(index)}
                      disabled={!form.settings.allowStepNavigation}
                      className={cn(
                        "flex items-center gap-[6px] text-[12px] transition-colors",
                        index === pageIndex ? "font-semibold text-folk-text" : "text-folk-tertiary",
                        form.settings.allowStepNavigation && "hover:text-folk-text",
                      )}
                      tabIndex={0}
                    >
                      <span
                        className={cn(
                          "flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px]",
                          index === pageIndex ? "bg-folk-text text-white" : "bg-folk-hover text-folk-secondary",
                        )}
                      >
                        {index + 1}
                      </span>
                      {page.title}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-[20px] flex flex-col gap-[18px]">
                {pageFields.length === 0 ? (
                  <p className="text-[13px] text-folk-tertiary">This {pages.length > 1 ? "step" : "form"} has no fields yet.</p>
                ) : (
                  pageFields.map((field) => (
                    <FieldRenderer
                      key={field.id}
                      field={field}
                      value={answers[field.id] ?? null}
                      onChange={(value) => setAnswer(field.id, value)}
                      hasError={errors.has(field.id)}
                      number={questionNumbers[field.id]}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {!submitted && (
          <div className="flex h-[60px] shrink-0 items-center justify-between border-t border-folk-border-subtle px-[24px]">
            <button
              type="button"
              onClick={handleBack}
              disabled={pageIndex === 0}
              className="flex items-center gap-[6px] rounded-[6px] px-[12px] py-[7px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text disabled:invisible"
              tabIndex={0}
            >
              <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={1.75} />
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-[6px] rounded-[6px] bg-folk-text px-[14px] py-[7px] text-[13px] font-medium text-white transition-colors hover:bg-black"
              tabIndex={0}
            >
              {isLastPage ? form.settings.submitButtonText || "Submit" : "Next"}
              {!isLastPage && <ChevronRight className="h-[14px] w-[14px]" strokeWidth={1.75} />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SuccessScreen({ form, onSubmitAnother }: { form: Form; onSubmitAnother?: () => void }) {
  const message = form.settings.successScreen.customMessage || "Thanks! Your response has been recorded."
  return (
    <div className="flex h-full flex-col items-center justify-center px-[24px] text-center">
      <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#e7f5ec] text-[#1a7f43]">
        <Check className="h-[24px] w-[24px]" strokeWidth={2} />
      </div>
      <h2 className="mt-[16px] text-[18px] font-semibold text-folk-text">Submitted</h2>
      <p className="mt-[6px] max-w-[360px] text-[13px] text-folk-secondary">{message}</p>
      {onSubmitAnother && (
        <button
          type="button"
          onClick={onSubmitAnother}
          className="mt-[18px] rounded-[6px] border border-folk-border px-[14px] py-[7px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
          tabIndex={0}
        >
          Submit another response
        </button>
      )}
    </div>
  )
}

export interface FieldRendererProps {
  field: FormField
  value: AnswerValue
  onChange: (value: AnswerValue) => void
  hasError: boolean
  number?: number
}

const baseInputClass =
  "h-[38px] w-full rounded-[6px] border bg-white px-[12px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"

export function FieldRenderer({ field, value, onChange, hasError, number }: FieldRendererProps) {
  const { staff } = useStaff()
  const { clients } = useClients()

  if (field.type === "heading") return <h3 className="text-[16px] font-semibold text-folk-text">{field.label}</h3>
  if (field.type === "paragraph") return <p className="text-[13px] leading-[1.6] text-folk-secondary">{field.label}</p>
  if (field.type === "divider") return <div className="h-px w-full bg-folk-border" />

  const borderClass = hasError ? "border-red-400" : "border-folk-border"
  const selectedValues = Array.isArray(value) ? value : []

  const renderControl = () => {
    switch (field.type) {
      case "long-text":
      case "rich-text":
        return (
          <textarea
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder || "Your answer"}
            rows={4}
            className={cn(baseInputClass, "h-auto resize-y py-[10px]", borderClass)}
            tabIndex={0}
          />
        )
      case "number":
        return (
          <input
            type="number"
            value={typeof value === "number" || typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
            placeholder={field.placeholder || "0"}
            className={cn(baseInputClass, borderClass)}
            tabIndex={0}
          />
        )
      case "email":
      case "phone":
      case "url":
      case "tags":
      case "short-text":
        return (
          <input
            type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "url" ? "url" : "text"}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder || "Your answer"}
            className={cn(baseInputClass, borderClass)}
            tabIndex={0}
          />
        )
      case "date":
        return (
          <input type="date" value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} className={cn(baseInputClass, borderClass)} tabIndex={0} />
        )
      case "time":
        return (
          <input type="time" value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} className={cn(baseInputClass, borderClass)} tabIndex={0} />
        )
      case "datetime":
        return (
          <input type="datetime-local" value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} className={cn(baseInputClass, borderClass)} tabIndex={0} />
        )
      case "dropdown":
        return (
          <select
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
            className={cn(baseInputClass, borderClass)}
            tabIndex={0}
          >
            <option value="">{field.placeholder || "Select an option"}</option>
            {field.options.map((option) => (
              <option key={option.id} value={option.label}>{option.label}</option>
            ))}
          </select>
        )
      case "staff-select":
        return (
          <select value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} className={cn(baseInputClass, borderClass)} tabIndex={0}>
            <option value="">Select a staff member</option>
            {staff.map((member) => (
              <option key={member.id} value={member.name}>{member.name}</option>
            ))}
          </select>
        )
      case "client-select":
        return (
          <select value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} className={cn(baseInputClass, borderClass)} tabIndex={0}>
            <option value="">Select a participant</option>
            {clients.map((client) => (
              <option key={client.id} value={client.displayName}>{client.displayName}</option>
            ))}
          </select>
        )
      case "single-select":
        return (
          <div className="flex flex-col gap-[8px]">
            {field.options.map((option) => (
              <label key={option.id} className="flex cursor-pointer items-center gap-[8px] text-[13px] text-folk-text">
                <input
                  type="radio"
                  name={field.id}
                  checked={value === option.label}
                  onChange={() => onChange(option.label)}
                  className="h-[15px] w-[15px] accent-folk-text"
                  tabIndex={0}
                />
                {option.label}
              </label>
            ))}
          </div>
        )
      case "multi-select":
        return (
          <div className="flex flex-col gap-[8px]">
            {field.options.map((option) => {
              const checked = selectedValues.includes(option.label)
              return (
                <label key={option.id} className="flex cursor-pointer items-center gap-[8px] text-[13px] text-folk-text">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange(checked ? selectedValues.filter((item) => item !== option.label) : [...selectedValues, option.label])
                    }
                    className="h-[15px] w-[15px] accent-folk-text"
                    tabIndex={0}
                  />
                  {option.label}
                </label>
              )
            })}
          </div>
        )
      case "checkbox":
        return (
          <label className="flex cursor-pointer items-center gap-[8px] text-[13px] text-folk-text">
            <input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} className="h-[15px] w-[15px] accent-folk-text" tabIndex={0} />
            {field.placeholder || "Yes"}
          </label>
        )
      case "rating": {
        const max = field.max ?? 5
        const current = typeof value === "number" ? value : 0
        return (
          <div className="flex items-center gap-[4px]">
            {Array.from({ length: max }).map((_, index) => (
              <button key={index} type="button" onClick={() => onChange(index + 1)} aria-label={`${index + 1} star`} tabIndex={0}>
                <Star className={cn("h-[22px] w-[22px]", index < current ? "fill-[#f59e0b] text-[#f59e0b]" : "text-folk-border-strong")} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        )
      }
      case "linear-scale": {
        const min = field.min ?? 1
        const max = field.max ?? 5
        return (
          <div className="flex flex-wrap items-center gap-[6px]">
            {Array.from({ length: max - min + 1 }).map((_, index) => {
              const scaleValue = min + index
              const active = value === scaleValue
              return (
                <button
                  key={scaleValue}
                  type="button"
                  onClick={() => onChange(scaleValue)}
                  className={cn(
                    "flex h-[34px] w-[34px] items-center justify-center rounded-full border text-[13px] transition-colors",
                    active ? "border-folk-text bg-folk-text text-white" : "border-folk-border text-folk-secondary hover:border-folk-border-strong",
                  )}
                  tabIndex={0}
                >
                  {scaleValue}
                </button>
              )
            })}
          </div>
        )
      }
      case "file-upload": {
        const fileName = typeof value === "string" ? value : ""
        return (
          <label
            className={cn(
              "flex h-[80px] cursor-pointer flex-col items-center justify-center gap-[6px] rounded-[6px] border border-dashed text-[13px] transition-colors hover:bg-folk-hover",
              hasError ? "border-red-400" : "border-folk-border",
            )}
          >
            <Upload className="h-[16px] w-[16px] text-folk-tertiary" strokeWidth={1.75} />
            <span className="text-folk-secondary">{fileName || "Choose file"}</span>
            <input
              type="file"
              onChange={(event) => onChange(event.target.files?.[0]?.name ?? null)}
              className="hidden"
              tabIndex={0}
            />
          </label>
        )
      }
      case "signature":
        return (
          <div className="flex h-[80px] items-center justify-center rounded-[6px] border border-dashed border-folk-border text-[13px] italic text-folk-tertiary">
            Sign here
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div>
      <label className="text-[13px] font-medium text-folk-text">
        {number != null && <span className="mr-[4px] text-folk-tertiary">{number}.</span>}
        {field.label || "Untitled field"}
        {field.required && <span className="ml-[2px] text-red-500">*</span>}
      </label>
      {field.description && <p className="mb-[6px] mt-[2px] text-[12px] text-folk-tertiary">{field.description}</p>}
      <div className="mt-[6px]">{renderControl()}</div>
      {hasError && <p className="mt-[4px] text-[12px] text-red-500">This field is required.</p>}
    </div>
  )
}
