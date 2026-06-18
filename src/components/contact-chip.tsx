"use client"

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react"
import { Check, Copy } from "lucide-react"
import { folkInlineAddButtonClass, folkInlineAddInputClass } from "@/lib/folk-ui"
import { cn } from "@/lib/utils"

interface ContactChipProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  variant?: "grey" | "white"
  size?: "default" | "compact"
  emptyPrefix?: string
  enableCopy?: boolean
}

export function ContactChip({
  value,
  onChange,
  placeholder,
  variant = "grey",
  size = "default",
  emptyPrefix,
  enableCopy = true,
}: ContactChipProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [isCopied, setIsCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  function handleSave() {
    setIsEditing(false)
    onChange(draft)
  }

  function handleCancel() {
    setIsEditing(false)
    setDraft(value)
  }

  function handleCopy(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    navigator.clipboard.writeText(value).catch(() => {})
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 1500)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") handleSave()
    if (event.key === "Escape") handleCancel()
  }

  const isWhite = variant === "white"
  const chipBg = isWhite ? "bg-transparent" : "bg-folk-hover"
  const chipHover = isWhite ? "hover:bg-folk-hover" : "hover:bg-[#efefef]"
  const copyHoverBg = isWhite ? "hover:bg-[var(--folk-border-subtle)]" : "hover:bg-[var(--folk-border)]"

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={folkInlineAddInputClass(size === "compact" ? "compact" : "default")}
      />
    )
  }

  if (!value) {
    const emptyLabel = emptyPrefix ? `${emptyPrefix} ${placeholder}` : placeholder

    return (
      <span
        onClick={() => setIsEditing(true)}
        className={folkInlineAddButtonClass(
          size === "compact" ? "compact" : "default",
          cn(isWhite ? "bg-folk-hover hover:bg-[#efefef]" : size !== "compact" && chipBg)
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter") setIsEditing(true)
        }}
        aria-label={`Click to add ${placeholder}`}
      >
        {emptyLabel}
      </span>
    )
  }

  return (
    <span
      className={size === "compact"
        ? `group/chip inline-flex cursor-default items-center gap-[4px] rounded-none border border-folk-border ${chipBg} py-[2px] pl-[8px] pr-[4px] text-[12px] font-medium text-folk-text transition-colors ${chipHover}`
        : `group/chip inline-flex cursor-default items-center gap-[6px] rounded-none border border-folk-border ${chipBg} py-[4px] pl-[10px] pr-[6px] text-[13px] font-medium text-folk-text transition-colors ${chipHover}`}
    >
      <span
        onClick={() => setIsEditing(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter") setIsEditing(true)
        }}
        aria-label={`Click to edit ${placeholder}`}
      >
        {value}
      </span>
      {enableCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className={size === "compact"
            ? `shrink-0 rounded-none p-[2px] transition-all ${isCopied ? "text-[#2563EB]" : `text-folk-placeholder opacity-0 group-hover/chip:opacity-100 ${copyHoverBg} hover:text-folk-secondary`}`
            : `shrink-0 rounded-none p-[3px] transition-all ${isCopied ? "text-[#2563EB]" : `text-folk-placeholder opacity-0 group-hover/chip:opacity-100 ${copyHoverBg} hover:text-folk-secondary`}`}
          tabIndex={0}
          aria-label={`Copy ${placeholder}`}
        >
          {isCopied
            ? <Check className={size === "compact" ? "h-[11px] w-[11px]" : "h-[12px] w-[12px]"} strokeWidth={2} />
            : <Copy className={size === "compact" ? "h-[11px] w-[11px]" : "h-[12px] w-[12px]"} strokeWidth={1.5} />}
        </button>
      )}
    </span>
  )
}
