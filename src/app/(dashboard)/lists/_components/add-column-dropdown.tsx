"use client"

import { useMemo, useRef, useState } from "react"
import { Search } from "lucide-react"
import { FixedSelectDropdown } from "@/components/fixed-select-dropdown"
import {
  CUSTOM_FIELD_TYPES,
  type CustomFieldKind,
  type CustomFieldTypeDef,
} from "@/lib/lists/custom-field-types"
import { getSourceColumns, listAddRecordsNoun, type ListColumn, type ListField } from "@/lib/lists/definitions"
import { cn } from "@/lib/utils"
import { FieldTypePreview } from "./field-type-preview"

interface AddColumnDropdownProps {
  sourceKey: string
  columns: ListColumn[]
  onAddSourceField: (fieldKey: string) => void
  onAddCustomField: (kind: CustomFieldKind) => void
  variant?: "header" | "cell"
}

export function AddColumnDropdown({
  sourceKey,
  columns,
  onAddSourceField,
  onAddCustomField,
  variant = "header",
}: AddColumnDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [hoveredCustom, setHoveredCustom] = useState<CustomFieldTypeDef | null>(null)
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null)

  const usedKeys = useMemo(() => new Set(columns.map((column) => column.fieldKey)), [columns])

  const hiddenFields = useMemo(() => {
    const all = getSourceColumns(sourceKey).filter((field) => field.key !== "__name" && !usedKeys.has(field.key))
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return all
    return all.filter((field) => field.label.toLowerCase().includes(trimmed))
  }, [sourceKey, usedKeys, query])

  const customTypes = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return CUSTOM_FIELD_TYPES
    return CUSTOM_FIELD_TYPES.filter(
      (item) =>
        item.label.toLowerCase().includes(trimmed) || item.description.toLowerCase().includes(trimmed),
    )
  }, [query])

  const handleClose = () => {
    setIsOpen(false)
    setQuery("")
    setHoveredCustom(null)
    setHoverRect(null)
  }

  const handleSelectSource = (field: ListField) => {
    onAddSourceField(field.key)
    handleClose()
  }

  const handleSelectCustom = (kind: CustomFieldKind) => {
    onAddCustomField(kind)
    handleClose()
  }

  const handleCustomHover = (fieldType: CustomFieldTypeDef, element: HTMLButtonElement) => {
    setHoveredCustom(fieldType)
    setHoverRect(element.getBoundingClientRect())
  }

  const showHidden = hiddenFields.length > 0
  const showCustom = customTypes.length > 0
  const isEmpty = !showHidden && !showCustom

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex items-center justify-center text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text",
          variant === "header" ? "h-[32px] w-[44px]" : "mx-auto h-[28px] w-[28px] rounded-[6px]",
        )}
        aria-label="Add field"
        tabIndex={0}
      >
        <span className="text-[18px] leading-none font-light">+</span>
      </button>

      <FixedSelectDropdown
        isOpen={isOpen}
        anchorRef={triggerRef}
        onClose={handleClose}
        align="right"
        minWidth={280}
        estimatedHeight={420}
        menuClassName="py-0"
      >
        <div className="flex items-center gap-[8px] border-b border-folk-border px-[12px] py-[10px]">
          <Search className="h-[14px] w-[14px] shrink-0 text-folk-tertiary" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-folk-text outline-none placeholder:text-folk-placeholder"
            autoFocus
            aria-label="Search fields"
          />
        </div>

        <div className="max-h-[360px] overflow-y-auto py-[4px]">
          {isEmpty ? (
            <p className="px-[12px] py-[10px] text-[12px] text-folk-secondary">No matching fields.</p>
          ) : (
            <>
              {showHidden && (
                <div>
                  <p className="px-[12px] pb-[4px] pt-[6px] text-[11px] font-medium capitalize text-folk-secondary">
                    {listAddRecordsNoun(sourceKey, true)} data
                  </p>
                  {hiddenFields.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => handleSelectSource(field)}
                      onMouseEnter={() => {
                        setHoveredCustom(null)
                        setHoverRect(null)
                      }}
                      className="flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-folk-hover"
                      tabIndex={0}
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] text-folk-text">{field.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {showCustom && showHidden && <div className="my-[4px] border-t border-folk-border-subtle" />}

              {showCustom && (
                <div>
                  <p className="px-[12px] pb-[4px] pt-[6px] text-[11px] font-medium text-folk-secondary">New field</p>
                  {customTypes.map((fieldType) => {
                    const Icon = fieldType.icon
                    return (
                      <button
                        key={fieldType.kind}
                        type="button"
                        onClick={() => handleSelectCustom(fieldType.kind)}
                        onMouseEnter={(event) => handleCustomHover(fieldType, event.currentTarget)}
                        onMouseLeave={() => {
                          setHoveredCustom(null)
                          setHoverRect(null)
                        }}
                        onFocus={(event) => handleCustomHover(fieldType, event.currentTarget)}
                        onBlur={() => {
                          setHoveredCustom(null)
                          setHoverRect(null)
                        }}
                        className="flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-folk-hover focus:bg-folk-hover"
                        tabIndex={0}
                      >
                        <Icon className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.75} />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-folk-text">{fieldType.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </FixedSelectDropdown>

      {isOpen && hoveredCustom && hoverRect && (
        <FieldTypePreview fieldType={hoveredCustom} anchorRect={hoverRect} />
      )}
    </>
  )
}
