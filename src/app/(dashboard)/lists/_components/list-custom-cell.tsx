"use client"

import { useRef, useState } from "react"
import { CalendarDays, Paperclip, Plus } from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"
import { FolkMemberPill } from "@/components/folk-sidebar/folk-member-pill"
import { FixedSelectDropdown, FixedSelectOption } from "@/components/fixed-select-dropdown"
import { getFolkStatusClass } from "@/lib/folk-ui"
import type { ListCustomFieldDef } from "@/lib/lists/definitions"
import { TABLE_CHIP } from "@/lib/table-styles"
import { cn } from "@/lib/utils"
import { formatListDate } from "./list-cell"

interface ListCustomCellProps {
  def: ListCustomFieldDef
  value: unknown
  onChange: (value: unknown) => void
}

function attachmentNames(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item
        if (item && typeof item === "object" && "name" in item) return String((item as { name: string }).name)
        return ""
      })
      .filter(Boolean)
  }
  return []
}

function ListCustomDateCell({
  def,
  value,
  onChange,
}: {
  def: ListCustomFieldDef
  value: unknown
  onChange: (value: unknown) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dateValue = typeof value === "string" ? value : ""

  const handleOpenPicker = () => {
    const input = inputRef.current
    if (!input) return
    if (typeof input.showPicker === "function") input.showPicker()
    else input.click()
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpenPicker}
        className={cn(
          TABLE_CHIP,
          "gap-[4px] transition-colors hover:bg-folk-border-subtle",
          !dateValue && "text-folk-placeholder",
        )}
        tabIndex={0}
        aria-label={dateValue ? `Edit ${def.label}` : `Add ${def.label}`}
      >
        <CalendarDays className="h-[11px] w-[11px] shrink-0" strokeWidth={1.75} />
        {dateValue ? formatListDate(dateValue) : "Add date…"}
      </button>
      <input
        ref={inputRef}
        type="date"
        value={dateValue}
        onChange={(event) => onChange(event.target.value)}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />
    </>
  )
}

export function ListCustomCell({ def, value, onChange }: ListCustomCellProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectRef = useRef<HTMLButtonElement>(null)
  const [isSelectOpen, setIsSelectOpen] = useState(false)

  const inputClass =
    "h-[28px] w-full min-w-0 rounded-[4px] border border-transparent bg-transparent px-[4px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder hover:border-folk-border focus:border-folk-border-strong focus:bg-white"

  switch (def.kind) {
    case "text":
    case "long-text":
      return (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={def.kind === "long-text" ? "Add notes…" : "Add text…"}
          className={inputClass}
          aria-label={def.label}
        />
      )

    case "number":
      return (
        <input
          type="number"
          value={value === null || value === undefined || value === "" ? "" : Number(value)}
          onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
          placeholder="0"
          className={cn(inputClass, "tabular-nums")}
          aria-label={def.label}
        />
      )

    case "date":
      return <ListCustomDateCell def={def} value={value} onChange={onChange} />

    case "boolean": {
      const isYes = value === true || value === "yes" || value === "Yes"
      return (
        <div className="flex items-center gap-[4px]">
          {(["Yes", "No"] as const).map((option) => {
            const active = option === "Yes" ? isYes : !isYes && value !== undefined && value !== null && value !== ""
            return (
              <button
                key={option}
                type="button"
                onClick={() => onChange(option === "Yes")}
                className={cn(
                  "folk-chip inline-flex h-[20px] items-center px-[8px] text-[11px] font-medium transition-colors",
                  active ? getFolkStatusClass(option) : "border border-folk-border bg-white text-folk-secondary hover:bg-folk-hover",
                )}
                tabIndex={0}
              >
                {option}
              </button>
            )
          })}
        </div>
      )
    }

    case "select": {
      const selected = typeof value === "string" ? value : ""
      const options = def.options ?? []
      return (
        <>
          <button
            ref={selectRef}
            type="button"
            onClick={() => setIsSelectOpen((open) => !open)}
            className={cn(
              "flex h-[28px] w-full min-w-0 items-center rounded-[4px] px-[4px] text-left text-[13px] transition-colors hover:bg-folk-hover",
              selected ? "text-folk-text" : "text-folk-placeholder",
            )}
            tabIndex={0}
          >
            {selected ? (
              <span className={cn("folk-chip inline-flex h-[20px] items-center px-[8px] text-[11px] font-medium", getFolkStatusClass(selected))}>
                {selected}
              </span>
            ) : (
              "Select…"
            )}
          </button>
          <FixedSelectDropdown
            isOpen={isSelectOpen}
            anchorRef={selectRef}
            onClose={() => setIsSelectOpen(false)}
            minWidth={160}
            align="match"
          >
            {options.length === 0 ? (
              <FixedSelectOption muted onClick={() => setIsSelectOpen(false)}>
                Type options in column settings
              </FixedSelectOption>
            ) : (
              options.map((option) => (
                <FixedSelectOption
                  key={option}
                  isActive={option === selected}
                  onClick={() => {
                    onChange(option)
                    setIsSelectOpen(false)
                  }}
                >
                  {option}
                </FixedSelectOption>
              ))
            )}
          </FixedSelectDropdown>
        </>
      )
    }

    case "multi-select": {
      const selected = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
      const options = def.options ?? []
      return (
        <>
          <button
            ref={selectRef}
            type="button"
            onClick={() => setIsSelectOpen((open) => !open)}
            className="flex min-h-[28px] w-full flex-wrap items-center gap-[4px] rounded-[4px] px-[4px] text-left transition-colors hover:bg-folk-hover"
            tabIndex={0}
          >
            {selected.length === 0 ? (
              <span className="text-[13px] text-folk-placeholder">Add tags…</span>
            ) : (
              selected.map((item) => (
                <span
                  key={item}
                  className={cn("folk-chip inline-flex h-[20px] items-center px-[8px] text-[11px] font-medium", getFolkStatusClass(item))}
                >
                  {item}
                </span>
              ))
            )}
          </button>
          <FixedSelectDropdown
            isOpen={isSelectOpen}
            anchorRef={selectRef}
            onClose={() => setIsSelectOpen(false)}
            minWidth={180}
            align="match"
          >
            {options.length === 0 ? (
              <FixedSelectOption muted onClick={() => setIsSelectOpen(false)}>
                Type options in column settings
              </FixedSelectOption>
            ) : (
              options.map((option) => {
                const isActive = selected.includes(option)
                return (
                  <FixedSelectOption
                    key={option}
                    isActive={isActive}
                    onClick={() => {
                      onChange(isActive ? selected.filter((item) => item !== option) : [...selected, option])
                    }}
                  >
                    {option}
                  </FixedSelectOption>
                )
              })
            )}
          </FixedSelectDropdown>
        </>
      )
    }

    case "attachment": {
      const files = attachmentNames(value)
      return (
        <div className="flex min-h-[28px] items-center gap-[6px]">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              const picked = Array.from(event.target.files ?? []).map((file) => ({ name: file.name, size: file.size }))
              event.target.value = ""
              if (picked.length === 0) return
              onChange([...files.map((name) => ({ name })), ...picked])
            }}
            aria-label={`Upload ${def.label}`}
          />
          {files.length > 0 ? (
            <span className="truncate text-[13px] text-folk-text">{files.join(", ")}</span>
          ) : null}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex shrink-0 items-center gap-[4px] rounded-[4px] px-[4px] py-[2px] text-[12px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
            tabIndex={0}
          >
            {files.length === 0 ? <Paperclip className="h-[13px] w-[13px]" strokeWidth={1.75} /> : <Plus className="h-[12px] w-[12px]" strokeWidth={2} />}
            <span>{files.length === 0 ? "Add file" : "Add"}</span>
          </button>
        </div>
      )
    }

    case "member": {
      const name = typeof value === "string" ? value.trim() : ""
      return (
        <div className="flex min-w-0 items-center gap-[6px]">
          {name ? <FolkMemberPill name={name} size="sm" className="max-w-[120px] shrink-0" /> : <EntityIcon text="?" size="xsm" />}
          <input
            type="text"
            value={name}
            onChange={(event) => onChange(event.target.value)}
            placeholder={name ? "Edit member…" : "Add member…"}
            className={inputClass}
            aria-label={def.label}
          />
        </div>
      )
    }

    default:
      return <span className="text-[13px] text-folk-tertiary">—</span>
  }
}
