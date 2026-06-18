"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExpandableTableSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  ariaLabel?: string
  expandedWidthClassName?: string
}

export function ExpandableTableSearch({
  value,
  onChange,
  placeholder = "Search…",
  className,
  ariaLabel = "Search",
  expandedWidthClassName = "w-[260px]",
}: ExpandableTableSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isExpanded = isOpen || value.trim().length > 0

  useEffect(() => {
    if (!isExpanded) return
    const timeout = setTimeout(() => inputRef.current?.focus(), 180)
    return () => clearTimeout(timeout)
  }, [isExpanded])

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    }
  }, [])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    onChange("")
    setIsOpen(false)
  }, [onChange])

  const handleBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => {
      if (!value.trim()) setIsOpen(false)
    }, 120)
  }, [value])

  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    setIsOpen(true)
  }, [])

  const handleContainerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isExpanded && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault()
        handleOpen()
      }
    },
    [handleOpen, isExpanded]
  )

  return (
    <div className={cn("shrink-0", className)}>
      <div
        role={isExpanded ? undefined : "button"}
        tabIndex={isExpanded ? -1 : 0}
        aria-label={isExpanded ? undefined : ariaLabel}
        aria-expanded={isExpanded}
        onClick={!isExpanded ? handleOpen : undefined}
        onKeyDown={handleContainerKeyDown}
        className={cn(
          "folk-input-wrap flex h-[28px] items-center overflow-hidden border border-folk-border-strong bg-white transition-[width,border-radius,padding,background-color,border-color] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isExpanded
            ? cn("rounded-folk-input px-[10px]", expandedWidthClassName)
            : "w-[28px] cursor-pointer justify-center rounded-full px-0 hover:bg-folk-hover"
        )}
      >
        <Search
          className={cn(
            "shrink-0 text-folk-secondary transition-[margin,width,height] duration-300",
            isExpanded ? "mr-[8px] h-[13px] w-[13px]" : "h-[14px] w-[14px]"
          )}
          strokeWidth={1.75}
        />

        <div
          className={cn(
            "flex items-center gap-[8px] transition-opacity duration-200",
            isExpanded
              ? "min-w-0 flex-1 opacity-100 delay-75"
              : "pointer-events-none h-0 w-0 overflow-hidden opacity-0"
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={(event) => {
              if (event.key === "Escape") handleClose()
            }}
            placeholder={placeholder}
            aria-label={ariaLabel}
            tabIndex={isExpanded ? 0 : -1}
            className="min-w-0 flex-1 bg-transparent text-[13px] font-normal text-folk-text outline-none placeholder:text-folk-placeholder"
          />
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleClose}
            className="flex h-[16px] w-[16px] shrink-0 items-center justify-center text-folk-placeholder transition-colors hover:text-folk-text"
            tabIndex={0}
            aria-label="Close search"
          >
            <X className="h-[12px] w-[12px]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
