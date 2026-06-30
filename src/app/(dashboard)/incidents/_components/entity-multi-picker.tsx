"use client"

import { useMemo, useRef, useState } from "react"
import { Plus, X } from "lucide-react"
import { EntityNameRow, type EntityNameRowVariant } from "@/components/entity-name-row"
import { SearchableEntityDropdown } from "@/components/searchable-entity-dropdown"
import type { SearchableEntityOption } from "@/components/searchable-entity-dropdown"

interface EntityMultiPickerProps {
  label: string
  options: SearchableEntityOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  required?: boolean
  nameVariant?: EntityNameRowVariant
}

export function EntityMultiPicker({
  label,
  options,
  selectedIds,
  onChange,
  placeholder = "Add",
  required = false,
  nameVariant = "client",
}: EntityMultiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const selectedOptions = useMemo(
    () => selectedIds
      .map((id) => options.find((option) => option.id === id))
      .filter(Boolean) as SearchableEntityOption[],
    [options, selectedIds]
  )

  const availableOptions = useMemo(
    () => options.filter((option) => !selectedIds.includes(option.id)),
    [options, selectedIds]
  )

  const handleAdd = (id: string) => {
    if (!id || selectedIds.includes(id)) return
    onChange([...selectedIds, id])
    setIsOpen(false)
  }

  const handleRemove = (id: string) => {
    onChange(selectedIds.filter((item) => item !== id))
  }

  return (
    <div>
      <label className="mb-[6px] block text-[12px] font-medium text-folk-secondary">
        {label}
        {required && <span className="text-[#dc2626]"> *</span>}
      </label>
      <div className="min-h-[36px] rounded-none border border-folk-border bg-folk-surface px-[8px] py-[6px]">
        <div className="flex flex-wrap items-center gap-[6px]">
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className="inline-flex max-w-full items-center gap-[6px] rounded-none border border-folk-border bg-folk-surface py-[2px] pl-[6px] pr-[4px]"
            >
              <EntityNameRow
                name={option.label}
                iconText={option.iconText}
                variant={nameVariant}
              />
              <button
                type="button"
                onClick={() => handleRemove(option.id)}
                className="flex h-[14px] w-[14px] shrink-0 items-center justify-center text-folk-secondary transition-colors hover:text-folk-text"
                aria-label={`Remove ${option.label}`}
                tabIndex={0}
              >
                <X className="h-[10px] w-[10px]" strokeWidth={2} />
              </button>
            </span>
          ))}
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setIsOpen(true)}
            disabled={availableOptions.length === 0}
            className="inline-flex items-center gap-[4px] rounded-none border border-dashed border-folk-border px-[8px] py-[4px] text-[12px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text disabled:cursor-not-allowed disabled:opacity-45"
            tabIndex={0}
          >
            <Plus className="h-[11px] w-[11px]" strokeWidth={2} />
            {selectedOptions.length === 0 ? placeholder : "Add"}
          </button>
        </div>
      </div>
      <SearchableEntityDropdown
        isOpen={isOpen}
        anchorRef={buttonRef}
        options={availableOptions}
        selectedId=""
        searchPlaceholder={`Search ${label.toLowerCase()}…`}
        emptyMessage="No results found"
        allowNone={false}
        onSelect={handleAdd}
        onClose={() => setIsOpen(false)}
      />
    </div>
  )
}
