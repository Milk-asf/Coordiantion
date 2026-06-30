"use client"

import { GripVertical, Plus, Trash2, X } from "lucide-react"
import {
  fieldTypeHasOptions,
  getFieldTypeLabel,
  isContentField,
  type FormField,
  type FormFieldOption,
} from "@/lib/form-definitions"
import { Switch } from "@/components/switch"
import { FIELD_ICONS } from "./field-icons"

interface FormFieldSettingsProps {
  field: FormField
  onChange: (updates: Partial<FormField>) => void
  onClose: () => void
}

const labelClass = "text-[12px] font-medium text-folk-secondary"
const inputClass =
  "mt-[6px] h-[34px] w-full rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"

function generateOptionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `opt_${crypto.randomUUID()}`
  return `opt_${Math.random().toString(36).slice(2, 10)}`
}

export function FormFieldSettings({ field, onChange, onClose }: FormFieldSettingsProps) {
  const Icon = FIELD_ICONS[field.type]
  const isContent = isContentField(field.type)
  const hasOptions = fieldTypeHasOptions(field.type)
  const isScale = field.type === "linear-scale" || field.type === "rating"

  const updateOption = (id: string, label: string) => {
    onChange({ options: field.options.map((option) => (option.id === id ? { ...option, label } : option)) })
  }

  const addOption = () => {
    const next: FormFieldOption = { id: generateOptionId(), label: `Option ${field.options.length + 1}` }
    onChange({ options: [...field.options, next] })
  }

  const removeOption = (id: string) => {
    onChange({ options: field.options.filter((option) => option.id !== id) })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[44px] shrink-0 items-center gap-[8px] border-b border-folk-border-subtle px-[16px]">
        <Icon className="h-[14px] w-[14px] text-folk-secondary" strokeWidth={1.75} />
        <span className="text-[13px] font-semibold text-folk-text">{getFieldTypeLabel(field.type)}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          aria-label="Close field settings"
          tabIndex={0}
        >
          <X className="h-[15px] w-[15px]" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-[16px]">
        <div>
          <label className={labelClass} htmlFor="field-label">
            {isContent ? "Text" : "Label"}
          </label>
          <input
            id="field-label"
            value={field.label}
            onChange={(event) => onChange({ label: event.target.value })}
            className={inputClass}
            placeholder={isContent ? "Enter text" : "Field label"}
            tabIndex={0}
          />
        </div>

        {!isContent && (
          <div className="mt-[16px]">
            <label className={labelClass} htmlFor="field-description">Helper text</label>
            <input
              id="field-description"
              value={field.description}
              onChange={(event) => onChange({ description: event.target.value })}
              className={inputClass}
              placeholder="Optional description shown under the label"
              tabIndex={0}
            />
          </div>
        )}

        {!isContent && !hasOptions && !isScale && field.type !== "checkbox" && (
          <div className="mt-[16px]">
            <label className={labelClass} htmlFor="field-placeholder">Placeholder</label>
            <input
              id="field-placeholder"
              value={field.placeholder}
              onChange={(event) => onChange({ placeholder: event.target.value })}
              className={inputClass}
              placeholder="Placeholder text"
              tabIndex={0}
            />
          </div>
        )}

        {hasOptions && (
          <div className="mt-[16px]">
            <span className={labelClass}>Options</span>
            <div className="mt-[8px] flex flex-col gap-[6px]">
              {field.options.map((option) => (
                <div key={option.id} className="flex items-center gap-[6px]">
                  <GripVertical className="h-[14px] w-[14px] shrink-0 text-folk-placeholder" strokeWidth={1.75} />
                  <input
                    value={option.label}
                    onChange={(event) => updateOption(option.id, event.target.value)}
                    className="h-[32px] flex-1 rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] text-folk-text outline-none transition-colors focus:border-[#a3c4f3]"
                    tabIndex={0}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(option.id)}
                    className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[6px] text-folk-placeholder transition-colors hover:bg-red-50 hover:text-red-500"
                    aria-label="Remove option"
                    tabIndex={0}
                  >
                    <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addOption}
              className="mt-[8px] flex items-center gap-[6px] text-[13px] font-medium text-[#2563EB] transition-colors hover:text-[#1d4ed8]"
              tabIndex={0}
            >
              <Plus className="h-[13px] w-[13px]" strokeWidth={1.75} />
              Add option
            </button>
          </div>
        )}

        {isScale && (
          <div className="mt-[16px] grid grid-cols-2 gap-[10px]">
            <div>
              <label className={labelClass} htmlFor="field-min">Min</label>
              <input
                id="field-min"
                type="number"
                value={field.min ?? 1}
                onChange={(event) => onChange({ min: Number(event.target.value) })}
                className={inputClass}
                tabIndex={0}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="field-max">Max</label>
              <input
                id="field-max"
                type="number"
                value={field.max ?? 5}
                onChange={(event) => onChange({ max: Number(event.target.value) })}
                className={inputClass}
                tabIndex={0}
              />
            </div>
          </div>
        )}

        {!isContent && (
          <div className="mt-[20px] flex items-center justify-between border-t border-folk-border-subtle pt-[16px]">
            <div className="min-w-0">
              <span className="text-[13px] font-medium text-folk-text">Required</span>
              {field.system && <p className="mt-[2px] text-[12px] text-folk-tertiary">Required incident field</p>}
            </div>
            <Switch
              checked={field.required}
              onChange={() => onChange({ required: !field.required })}
              ariaLabel="Toggle required"
              disabled={field.system}
            />
          </div>
        )}
      </div>
    </div>
  )
}
