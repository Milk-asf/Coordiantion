"use client"

import { ChevronDown, Star } from "lucide-react"
import type { FormField } from "@/lib/form-definitions"
import { cn } from "@/lib/utils"

interface FormFieldPreviewProps {
  field: FormField
}

const fauxInputClass =
  "mt-[6px] flex h-[36px] w-full items-center rounded-[6px] border border-folk-border bg-white px-[12px] text-[13px] text-folk-placeholder"

export function FormFieldPreview({ field }: FormFieldPreviewProps) {
  if (field.type === "heading") {
    return <p className="text-[16px] font-semibold text-folk-text">{field.label || "Heading"}</p>
  }

  if (field.type === "paragraph") {
    return <p className="text-[13px] leading-[1.6] text-folk-secondary">{field.label || "Paragraph text"}</p>
  }

  if (field.type === "divider") {
    return <div className="my-[2px] h-px w-full bg-folk-border" />
  }

  return (
    <div>
      <Label field={field} />
      {field.description && <p className="mt-[2px] text-[12px] text-folk-tertiary">{field.description}</p>}
      <FieldControl field={field} />
    </div>
  )
}

function Label({ field }: { field: FormField }) {
  return (
    <label className="text-[13px] font-medium text-folk-text">
      {field.label || "Untitled field"}
      {field.required && <span className="ml-[2px] text-red-500">*</span>}
    </label>
  )
}

function FieldControl({ field }: { field: FormField }) {
  switch (field.type) {
    case "long-text":
    case "rich-text":
      return (
        <div className={cn(fauxInputClass, "h-[72px] items-start py-[8px]")}>
          {field.placeholder || "Long answer text"}
        </div>
      )
    case "checkbox":
      return (
        <div className="mt-[8px] flex items-center gap-[8px]">
          <span className="h-[16px] w-[16px] rounded-[4px] border border-folk-border-strong" aria-hidden="true" />
          <span className="text-[13px] text-folk-secondary">{field.placeholder || "Checkbox option"}</span>
        </div>
      )
    case "dropdown":
    case "single-select":
    case "multi-select":
    case "staff-select":
    case "client-select":
      return (
        <div className={cn(fauxInputClass, "justify-between")}>
          <span>{field.placeholder || "Select an option"}</span>
          <ChevronDown className="h-[14px] w-[14px] text-folk-secondary" strokeWidth={1.75} />
        </div>
      )
    case "rating":
      return (
        <div className="mt-[8px] flex items-center gap-[4px]">
          {Array.from({ length: field.max ?? 5 }).map((_, index) => (
            <Star key={index} className="h-[18px] w-[18px] text-folk-border-strong" strokeWidth={1.5} />
          ))}
        </div>
      )
    case "linear-scale":
      return (
        <div className="mt-[8px] flex items-center gap-[6px]">
          {Array.from({ length: (field.max ?? 5) - (field.min ?? 1) + 1 }).map((_, index) => (
            <span
              key={index}
              className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-folk-border text-[12px] text-folk-secondary"
            >
              {(field.min ?? 1) + index}
            </span>
          ))}
        </div>
      )
    case "tags":
      return (
        <div className={cn(fauxInputClass)}>{field.placeholder || "Add tags…"}</div>
      )
    case "file-upload":
      return (
        <div className="mt-[6px] flex h-[64px] items-center justify-center rounded-[6px] border border-dashed border-folk-border text-[13px] text-folk-tertiary">
          {field.placeholder || "Click or drag a file to upload"}
        </div>
      )
    case "signature":
      return (
        <div className="mt-[6px] flex h-[80px] items-center justify-center rounded-[6px] border border-dashed border-folk-border text-[13px] italic text-folk-tertiary">
          Signature
        </div>
      )
    default:
      return <div className={fauxInputClass}>{field.placeholder || "Short answer text"}</div>
  }
}
