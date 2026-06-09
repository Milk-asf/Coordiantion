"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { Plus, X } from "lucide-react"

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
            ? "group/chip inline-flex items-center gap-[4px] rounded border border-[#dcdcdc] bg-transparent py-[2px] pl-[8px] pr-[4px] text-[12px] font-medium text-[#262626]"
            : "group/chip inline-flex items-center gap-[6px] rounded border border-[#dcdcdc] bg-transparent py-[4px] pl-[10px] pr-[6px] text-[13px] font-medium text-[#262626]"}
        >
          {item}
          <button
            type="button"
            onClick={() => removeItem(item)}
            className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full text-[#bbb] transition-colors hover:text-[#262626]"
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
          className={isCompact
            ? "w-[120px] rounded border border-[#a3c4f3] bg-[#fafafa] px-[8px] py-[3px] text-[12px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
            : "w-[140px] rounded border border-[#a3c4f3] bg-[#fafafa] px-[10px] py-[4px] text-[13px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"}
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className={isCompact
            ? "inline-flex items-center gap-[2px] rounded border border-dashed border-[#d0d0d0] bg-transparent px-[8px] py-[2px] text-[12px] font-medium text-[#bbb] transition-colors hover:border-[#999] hover:text-[#999]"
            : "inline-flex items-center gap-[3px] rounded border border-dashed border-[#d0d0d0] bg-transparent px-[10px] py-[4px] text-[13px] font-medium text-[#bbb] transition-colors hover:border-[#999] hover:text-[#999]"}
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
