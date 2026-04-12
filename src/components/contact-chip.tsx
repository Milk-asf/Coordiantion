"use client"

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react"
import { Check, Copy } from "lucide-react"

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
  const chipBg = isWhite ? "bg-transparent" : "bg-[#f5f5f5]"
  const chipHover = isWhite ? "hover:bg-[#f5f5f5]" : "hover:bg-[#efefef]"
  const copyHoverBg = isWhite ? "hover:bg-[#f0f0f0]" : "hover:bg-[#e5e5e5]"

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={size === "compact"
          ? "rounded border border-[#a3c4f3] bg-[#fafafa] px-[8px] py-[3px] text-[12px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
          : "rounded border border-[#a3c4f3] bg-[#fafafa] px-[10px] py-[4px] text-[13px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"}
      />
    )
  }

  if (!value) {
    const emptyLabel = emptyPrefix ? `${emptyPrefix} ${placeholder}` : placeholder

    return (
      <span
        onClick={() => setIsEditing(true)}
        className={size === "compact"
          ? "inline-flex cursor-default items-center rounded border border-dashed border-[#d0d0d0] bg-transparent px-[8px] py-[2px] text-[12px] font-medium text-[#bbb] transition-colors hover:border-[#999] hover:text-[#999]"
          : `inline-flex cursor-default items-center rounded border border-dashed border-[#d0d0d0] ${chipBg} px-[10px] py-[4px] text-[13px] font-medium text-[#bbb] transition-colors hover:border-[#999] hover:text-[#999]`}
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
        ? `group/chip inline-flex cursor-default items-center gap-[4px] rounded border border-[#dcdcdc] ${chipBg} py-[2px] pl-[8px] pr-[4px] text-[12px] font-medium text-[#262626] transition-colors ${chipHover}`
        : `group/chip inline-flex cursor-default items-center gap-[6px] rounded border border-[#dcdcdc] ${chipBg} py-[4px] pl-[10px] pr-[6px] text-[13px] font-medium text-[#262626] transition-colors ${chipHover}`}
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
            ? `shrink-0 rounded p-[2px] transition-all ${isCopied ? "text-green-600" : `text-[#bbb] opacity-0 group-hover/chip:opacity-100 ${copyHoverBg} hover:text-[#666]`}`
            : `shrink-0 rounded p-[3px] transition-all ${isCopied ? "text-green-600" : `text-[#bbb] opacity-0 group-hover/chip:opacity-100 ${copyHoverBg} hover:text-[#666]`}`}
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
