"use client"

import { useMemo, useRef, useState } from "react"
import { Check, Plus, Search } from "lucide-react"
import { FixedSelectDropdown, FixedSelectOption } from "@/components/fixed-select-dropdown"
import { getListSource, getRecordId, listAddRecordsNoun } from "@/lib/lists/definitions"
import { cn } from "@/lib/utils"

interface ListAddRecordsDropdownProps {
  sourceKey: string
  allRecords: unknown[]
  memberIds: string[]
  onAdd: (recordId: string) => void
  onAddAll: () => void
  /** "icon" renders a compact round "+" — used in kanban stage headers. */
  variant?: "toolbar" | "inline" | "icon"
}

export function ListAddRecordsDropdown({
  sourceKey,
  allRecords,
  memberIds,
  onAdd,
  onAddAll,
  variant = "toolbar",
}: ListAddRecordsDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")

  const source = getListSource(sourceKey)
  const memberSet = useMemo(() => new Set(memberIds), [memberIds])

  const available = useMemo(() => {
    return allRecords
      .map((record, index) => ({
        record,
        id: getRecordId(record, index),
        label: String(source?.primary.get(record) ?? "—"),
      }))
      .filter((entry) => !memberSet.has(entry.id))
  }, [allRecords, memberSet, source])

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return available
    return available.filter((entry) => entry.label.toLowerCase().includes(trimmed))
  }, [available, query])

  const pluralNoun = listAddRecordsNoun(sourceKey, false)
  const sourceLabel = source?.label ?? "Records"

  const handleAdd = (recordId: string) => {
    onAdd(recordId)
    setQuery("")
    setIsOpen(false)
  }

  const handleAddAll = () => {
    onAddAll()
    setQuery("")
    setIsOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex items-center gap-[6px] transition-colors",
          variant === "toolbar" && "outline-btn folk-pill-btn px-[10px] py-[4px] text-[12px] font-medium",
          variant === "inline" && "text-[13px] text-folk-secondary hover:text-folk-text",
          variant === "icon" &&
            "h-[20px] w-[20px] justify-center rounded-[4px] text-folk-secondary hover:bg-folk-hover hover:text-folk-text",
        )}
        aria-label={`Add ${pluralNoun}`}
        tabIndex={0}
      >
        <Plus className={cn(variant === "inline" ? "h-[14px] w-[14px]" : "h-[13px] w-[13px]")} strokeWidth={1.75} />
        {variant !== "icon" && <span>{variant === "toolbar" ? `Add ${pluralNoun}` : "Add new"}</span>}
      </button>

      <FixedSelectDropdown
        isOpen={isOpen}
        anchorRef={triggerRef}
        onClose={() => {
          setIsOpen(false)
          setQuery("")
        }}
        minWidth={280}
        estimatedHeight={360}
        align={variant === "inline" ? "left" : "left"}
        menuClassName="py-0"
      >
        <div className="flex items-center gap-[8px] border-b border-folk-border px-[12px] py-[8px]">
          <Search className="h-[14px] w-[14px] shrink-0 text-folk-tertiary" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-folk-text outline-none placeholder:text-folk-placeholder"
            autoFocus
            aria-label={`Search ${pluralNoun}`}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto py-[4px]">
          {available.length === 0 ? (
            <p className="px-[12px] py-[10px] text-[12px] text-folk-secondary">All {pluralNoun} are already in this list.</p>
          ) : (
            <>
              <FixedSelectOption onClick={handleAddAll}>
                <span className="flex-1 text-[13px] font-medium text-folk-text">Select all</span>
                <span className="text-[11px] text-folk-tertiary">{available.length}</span>
              </FixedSelectOption>
              <p className="px-[12px] pb-[4px] pt-[8px] text-[11px] font-medium uppercase tracking-wide text-folk-tertiary">
                {sourceLabel}
              </p>
              {filtered.length === 0 ? (
                <p className="px-[12px] py-[8px] text-[12px] text-folk-secondary">No matches.</p>
              ) : (
                filtered.map((entry) => (
                  <FixedSelectOption key={entry.id} onClick={() => handleAdd(entry.id)}>
                    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-folk-hover text-[11px]">
                      {entry.label.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-folk-text">{entry.label}</span>
                    {memberSet.has(entry.id) && <Check className="h-[14px] w-[14px] text-folk-text" strokeWidth={2} />}
                  </FixedSelectOption>
                ))
              )}
            </>
          )}
        </div>
      </FixedSelectDropdown>
    </>
  )
}
