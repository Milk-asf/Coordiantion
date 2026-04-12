"use client"

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react"
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
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (!isEditing) return
    if (type !== "select") inputRef.current?.focus()
  }, [isEditing, type])

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
    ? "block cursor-default rounded-lg px-[8px] py-[5px] transition-colors hover:bg-[#f5f5f5]"
    : "block cursor-default rounded-lg px-[10px] py-[7px] transition-colors hover:bg-[#f5f5f5]"
  const baseInputClassName = size === "compact"
    ? "w-full rounded-lg border border-[#a3c4f3] bg-white px-[8px] py-[5px] pr-[28px] text-[13px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
    : "w-full rounded-lg border border-[#a3c4f3] bg-white px-[10px] py-[7px] pr-[32px] text-[13px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
  const baseDropdownButtonClassName = size === "compact"
    ? "flex w-full items-center justify-between rounded-lg border border-[#a3c4f3] bg-white px-[8px] py-[5px] text-left text-[13px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
    : "flex w-full items-center justify-between rounded-lg border border-[#a3c4f3] bg-white px-[10px] py-[7px] text-left text-[13px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
  const baseDropdownItemClassName = size === "compact"
    ? "flex w-full items-center px-[8px] py-[6px] text-left text-[13px] font-medium transition-colors hover:bg-[#f5f5f5]"
    : "flex w-full items-center px-[10px] py-[6px] text-left text-[13px] font-medium transition-colors hover:bg-[#f5f5f5]"
  const baseClearButtonClassName = size === "compact"
    ? "absolute right-[8px] top-1/2 -translate-y-1/2 text-[#bbb] transition-colors hover:text-[#888]"
    : "absolute right-[10px] top-1/2 -translate-y-1/2 text-[#bbb] transition-colors hover:text-[#888]"

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
            <span className={draft ? "text-[#262626]" : "text-[#bbb]"}>{draft || emptyLabel}</span>
            <ChevronDown className="h-[12px] w-[12px] rotate-180 text-[#999]" strokeWidth={1.5} />
          </button>
          <div className="absolute left-0 top-full z-[60] mt-[4px] max-h-[200px] w-full min-w-[160px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
            <button
              type="button"
              onClick={() => {
                setDraft("")
                onChange("")
                setIsEditing(false)
              }}
              className={`${dropdownItemClassName || baseDropdownItemClassName} ${!draft ? "bg-[#f0f0f0] text-[#262626]" : "text-[#bbb]"}`}
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
                className={`${dropdownItemClassName || baseDropdownItemClassName} ${option === draft ? "bg-[#f0f0f0] text-[#262626]" : "text-[#555]"}`}
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
      {displayValue || <span className="text-[#bbb]">{placeholder || emptyLabel}</span>}
    </span>
  )
}
