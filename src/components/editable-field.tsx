"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import { ChevronDown, X } from "lucide-react"

interface EditableFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: "text" | "select" | "date"
  options?: string[]
  size?: "default" | "compact"
  offsetClassName?: string
  displayClassName?: string
  inputClassName?: string
  dropdownButtonClassName?: string
  dropdownItemClassName?: string
  dropdownWrapperClassName?: string
  clearButtonClassName?: string
  emptyLabel?: string
}

export function EditableField({
  value,
  onChange,
  placeholder,
  type = "text",
  options,
  size = "default",
  offsetClassName,
  displayClassName,
  inputClassName,
  dropdownButtonClassName,
  dropdownItemClassName,
  dropdownWrapperClassName,
  clearButtonClassName,
  emptyLabel = "—",
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [dropUp, setDropUp] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (!isEditing) return
    if (type !== "select") inputRef.current?.focus()
  }, [isEditing, type])

  useLayoutEffect(() => {
    if (!isEditing || type !== "select" || !dropdownRef.current) return
    const optionCount = (options?.length ?? 0) + 1
    const estimatedHeight = Math.min(204, optionCount * 32 + 8)
    const rect = dropdownRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    setDropUp(spaceBelow < estimatedHeight + 8 && spaceAbove > spaceBelow)
  }, [isEditing, type, options])

  useEffect(() => {
    if (!isEditing || type !== "select") return

    function handleMouseDown(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsEditing(false)
        setDraft(value)
      }
    }

    document.addEventListener("mousedown", handleMouseDown)

    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [isEditing, type, value])

  const handleSave = useCallback(() => {
    setIsEditing(false)
    onChange(draft)
  }, [draft, onChange])

  const handleCancel = useCallback(() => {
    setIsEditing(false)
    setDraft(value)
  }, [value])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") handleSave()
    if (event.key === "Escape") handleCancel()
  }, [handleCancel, handleSave])

  const displayValue = type === "date" && value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : value

  const baseOffsetClassName = offsetClassName ?? (size === "compact" ? "" : "-ml-[9px]")
  const baseDisplayClassName = size === "compact"
    ? "block cursor-default rounded-none px-[8px] py-[5px] transition-colors hover:bg-folk-hover"
    : "block cursor-default rounded-none px-[10px] py-[7px] transition-colors hover:bg-folk-hover"
  const baseInputClassName = size === "compact"
    ? "w-full rounded-none border border-[#a3c4f3] bg-folk-page px-[8px] py-[5px] pr-[28px] text-[13px] font-medium text-folk-text shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
    : "w-full rounded-none border border-[#a3c4f3] bg-folk-page px-[10px] py-[7px] pr-[32px] text-[13px] font-medium text-folk-text shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
  const baseDropdownButtonClassName = size === "compact"
    ? "flex w-full items-center justify-between rounded-none border border-[#a3c4f3] bg-folk-page px-[8px] py-[5px] text-left text-[13px] font-medium text-folk-text shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
    : "flex w-full items-center justify-between rounded-none border border-[#a3c4f3] bg-folk-page px-[10px] py-[7px] text-left text-[13px] font-medium text-folk-text shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
  const baseDropdownItemClassName = size === "compact"
    ? "flex w-full items-center px-[8px] py-[6px] text-left text-[13px] font-medium transition-colors hover:bg-folk-hover"
    : "flex w-full items-center px-[10px] py-[6px] text-left text-[13px] font-medium transition-colors hover:bg-folk-hover"
  const baseClearButtonClassName = size === "compact"
    ? "absolute right-[8px] top-1/2 -translate-y-1/2 text-folk-placeholder transition-colors hover:text-folk-secondary"
    : "absolute right-[10px] top-1/2 -translate-y-1/2 text-folk-placeholder transition-colors hover:text-folk-secondary"

  if (isEditing) {
    if (type === "select" && options) {
      return (
        <div className={`relative ${baseOffsetClassName} ${dropdownWrapperClassName || ""}`.trim()} ref={dropdownRef}>
          <button
            type="button"
            className={dropdownButtonClassName || baseDropdownButtonClassName}
            tabIndex={0}
            onClick={() => {
              setIsEditing(false)
              setDraft(value)
            }}
          >
            <span className={draft ? "text-folk-text" : "text-folk-placeholder"}>{draft || emptyLabel}</span>
            <ChevronDown className="h-[12px] w-[12px] rotate-180 text-folk-secondary" strokeWidth={1.5} />
          </button>
          <div className={`absolute left-0 z-[60] max-h-[200px] w-full min-w-[160px] overflow-y-auto rounded-none border border-folk-border bg-folk-surface py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.1)] ${dropUp ? "bottom-full mb-[4px]" : "top-full mt-[4px]"}`}>
            <button
              type="button"
              onClick={() => {
                setDraft("")
                onChange("")
                setIsEditing(false)
              }}
              className={`${dropdownItemClassName || baseDropdownItemClassName} ${!draft ? "bg-[var(--folk-border-subtle)] text-folk-text" : "text-folk-placeholder"}`}
              tabIndex={0}
            >
              {emptyLabel}
            </button>
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setDraft(option)
                  onChange(option)
                  setIsEditing(false)
                }}
                className={`${dropdownItemClassName || baseDropdownItemClassName} ${option === draft ? "bg-[var(--folk-border-subtle)] text-folk-text" : "text-[#555]"}`}
                tabIndex={0}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className={`relative ${baseOffsetClassName}`.trim()}>
        <input
          ref={inputRef}
          type={type === "date" ? "date" : "text"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClassName || baseInputClassName}
        />
        {draft && (
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault()
              setDraft("")
              onChange("")
              setIsEditing(false)
            }}
            className={clearButtonClassName || baseClearButtonClassName}
            tabIndex={-1}
            aria-label="Clear field"
          >
            <X className={size === "compact" ? "h-[13px] w-[13px]" : "h-[14px] w-[14px]"} strokeWidth={1.5} />
          </button>
        )}
      </div>
    )
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={displayClassName || `${baseOffsetClassName} ${baseDisplayClassName}`.trim()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") setIsEditing(true)
      }}
      aria-label={`Click to edit ${placeholder || "field"}`}
    >
      {displayValue || <span className="text-folk-placeholder">{placeholder || emptyLabel}</span>}
    </span>
  )
}
