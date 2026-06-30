"use client"

import { useDraggable } from "@dnd-kit/core"
import {
  FORM_FIELD_CATEGORY_LABELS,
  FORM_FIELD_CATEGORY_ORDER,
  FORM_FIELD_TYPES,
  type FormFieldType,
} from "@/lib/form-definitions"
import { cn } from "@/lib/utils"
import { FIELD_ICONS } from "./field-icons"

interface PaletteItemProps {
  type: FormFieldType
  label: string
  onAdd: (type: FormFieldType) => void
}

function PaletteItem({ type, label, onAdd }: PaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { kind: "palette", fieldType: type },
  })
  const Icon = FIELD_ICONS[type]

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onAdd(type)}
      className={cn(
        "flex w-full items-center gap-[8px] rounded-[6px] border border-folk-border bg-white px-[10px] py-[7px] text-left text-[13px] text-folk-text transition-colors hover:border-folk-border-strong hover:bg-folk-hover",
        isDragging && "opacity-40",
      )}
      {...listeners}
      {...attributes}
    >
      <Icon className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </button>
  )
}

interface FormFieldPaletteProps {
  onAddField: (type: FormFieldType) => void
}

export function FormFieldPalette({ onAddField }: FormFieldPaletteProps) {
  return (
    <div className="flex flex-col gap-[20px] p-[12px]">
      {FORM_FIELD_CATEGORY_ORDER.map((category) => {
        const items = FORM_FIELD_TYPES.filter((meta) => meta.category === category)
        if (items.length === 0) return null
        return (
          <div key={category}>
            <p className="mb-[8px] px-[2px] text-[11px] font-medium uppercase tracking-wide text-folk-tertiary">
              {FORM_FIELD_CATEGORY_LABELS[category]}
            </p>
            <div className="flex flex-col gap-[6px]">
              {items.map((meta) => (
                <PaletteItem key={meta.type} type={meta.type} label={meta.label} onAdd={onAddField} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
