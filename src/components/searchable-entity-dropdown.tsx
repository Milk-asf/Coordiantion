"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react"
import { createPortal } from "react-dom"
import { EntityIcon } from "@/components/entity-icon"
import { FIXED_DROPDOWN_BACKDROP_Z_CLASS, FIXED_DROPDOWN_MENU_Z_CLASS } from "@/lib/dropdown-utils"
import { useFixedDropdownPosition } from "@/lib/hooks/use-fixed-dropdown-position"
import { cn } from "@/lib/utils"

export interface SearchableEntityOption {
  id: string
  label: string
  iconText: string
  badge?: string
  badgeClassName?: string
}

interface SearchableEntityDropdownProps {
  isOpen: boolean
  anchorRef: RefObject<HTMLElement | null>
  options: SearchableEntityOption[]
  selectedId: string
  searchPlaceholder: string
  onSelect: (id: string) => void
  onClose: () => void
  allowNone?: boolean
  noneLabel?: string
  emptyMessage?: string
}

export function SearchableEntityDropdown({
  isOpen,
  anchorRef,
  options,
  selectedId,
  searchPlaceholder,
  onSelect,
  onClose,
  allowNone = true,
  noneLabel = "None",
  emptyMessage = "No results found",
}: SearchableEntityDropdownProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState("")
  const [highlightIdx, setHighlightIdx] = useState(-1)

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return options
    return options.filter((option) => option.label.toLowerCase().includes(query))
  }, [options, search])

  const totalItems = filteredOptions.length + (allowNone ? 1 : 0)
  const estimatedHeight = Math.min(260, totalItems * 34 + 52)
  const menuStyle = useFixedDropdownPosition(
    isOpen,
    anchorRef,
    estimatedHeight,
    Math.max(anchorRef.current?.getBoundingClientRect().width ?? 0, 220)
  )

  useEffect(() => {
    if (!isOpen) return
    setSearch("")
    setHighlightIdx(-1)
    const timer = window.setTimeout(() => searchRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  if (!isOpen || !menuStyle) return null

  const handleSelect = (id: string) => {
    onSelect(id)
    onClose()
    setSearch("")
    setHighlightIdx(-1)
  }

  const handleClose = () => {
    onClose()
    setSearch("")
    setHighlightIdx(-1)
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setHighlightIdx((prev) => (prev + 1) % totalItems)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setHighlightIdx((prev) => (prev - 1 + totalItems) % totalItems)
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      if (allowNone && highlightIdx === 0) {
        handleSelect("")
        return
      }

      const optionIndex = allowNone ? highlightIdx - 1 : highlightIdx
      const option = filteredOptions[optionIndex >= 0 ? optionIndex : 0]
      if (option) handleSelect(option.id)
      return
    }

    if (event.key === "Escape") {
      event.stopPropagation()
      handleClose()
    }
  }

  return createPortal(
    <>
      <div className={cn("fixed inset-0 z-[210]", FIXED_DROPDOWN_BACKDROP_Z_CLASS)} data-floating-overlay onClick={handleClose} />
      <div
        className={cn(
          "fixed z-[211] flex max-h-[260px] flex-col rounded-none border border-folk-border bg-folk-surface shadow-folk",
          FIXED_DROPDOWN_MENU_Z_CLASS
        )}
        data-floating-overlay
        style={menuStyle}
      >
        <div className="border-b border-folk-border-subtle p-[6px]">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setHighlightIdx(-1)
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder={searchPlaceholder}
            className="w-full rounded-none border border-folk-border bg-folk-page px-[10px] py-[6px] text-[13px] text-folk-text outline-none transition-colors focus:border-[#bbb]"
          />
        </div>

        <div className="overflow-y-auto">
          {allowNone && (
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={cn(
                "flex w-full cursor-pointer items-center px-[12px] py-[8px] text-left text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover",
                highlightIdx === 0 && "bg-blue-50 text-blue-600"
              )}
              role="option"
              aria-selected={!selectedId}
              tabIndex={0}
            >
              {noneLabel}
            </button>
          )}

          {filteredOptions.map((option, index) => {
            const itemIndex = allowNone ? index + 1 : index
            const isHighlighted = highlightIdx === itemIndex
            const isSelected = option.id === selectedId

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[8px] text-left text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover",
                  (isHighlighted || isSelected) && "bg-folk-hover",
                  isHighlighted && "bg-blue-50"
                )}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
              >
                <EntityIcon text={option.iconText} size="sm" />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.badge && (
                  <span
                    className={cn(
                      "shrink-0 rounded-none px-[6px] py-[2px] text-[10px] font-semibold uppercase tracking-[0.04em]",
                      option.badgeClassName ?? "bg-[#FEE2E2] text-[#991B1B]"
                    )}
                  >
                    {option.badge}
                  </span>
                )}
              </button>
            )
          })}

          {filteredOptions.length === 0 && (
            <div className="px-[12px] py-[10px] text-[13px] text-folk-placeholder">{emptyMessage}</div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
