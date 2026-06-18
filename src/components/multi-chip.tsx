"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { Plus, X } from "lucide-react"
import { getCategoryChipClasses } from "@/lib/chip-colors"
import { folkInlineAddButtonClass, folkInlineAddInputClass } from "@/lib/folk-ui"

interface MultiChipProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  size?: "default" | "compact"
}

function parseItems(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export function MultiChip({ value, onChange, placeholder, size = "default" }: MultiChipProps) {
  const items = parseItems(value)
  const [isAdding, setIsAdding] = useState(false)
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdding) inputRef.current?.focus()
  }, [isAdding])

  const isCompact = size === "compact"

  function commitDraft() {
    const next = parseItems(`${value}${value ? "," : ""}${draft}`)
    const deduped = next.filter((item, idx) => next.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === idx)
    onChange(deduped.join(", "))
    setDraft("")
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      if (draft.trim()) commitDraft()
    }
    if (event.key === "Escape") {
      event.preventDefault()
      setDraft("")
      setIsAdding(false)
    }
    if (event.key === "Backspace" && !draft && items.length > 0) {
      event.preventDefault()
      onChange(items.slice(0, -1).join(", "))
    }
  }

  function handleBlur() {
    if (draft.trim()) commitDraft()
    setIsAdding(false)
  }

  function removeItem(target: string) {
    onChange(items.filter((item) => item !== target).join(", "))
  }

  return (
    <div className="flex flex-1 flex-wrap items-center gap-[4px]">
      {items.map((item) => (
        <span
          key={item}
          className={isCompact
            ? `group/chip inline-flex items-center gap-[4px] pr-[4px] ${getCategoryChipClasses(item, { size: "sm" })}`
            : `group/chip inline-flex items-center gap-[6px] pr-[6px] ${getCategoryChipClasses(item)}`}
        >
          {item}
          <button
            type="button"
            onClick={() => removeItem(item)}
            className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full text-folk-placeholder transition-colors hover:text-folk-text"
            tabIndex={0}
            aria-label={`Remove ${item}`}
          >
            <X className={isCompact ? "h-[10px] w-[10px]" : "h-[11px] w-[11px]"} strokeWidth={2} />
          </button>
        </span>
      ))}

      {isAdding ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={folkInlineAddInputClass(isCompact ? "compact" : "default")}
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className={folkInlineAddButtonClass(isCompact ? "compact" : "default")}
          tabIndex={0}
          aria-label={placeholder}
        >
          <Plus className={isCompact ? "h-[11px] w-[11px]" : "h-[12px] w-[12px]"} strokeWidth={2} />
          {items.length === 0 && <span>{placeholder}</span>}
        </button>
      )}
    </div>
  )
}
