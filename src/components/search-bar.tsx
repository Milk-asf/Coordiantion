"use client"

import { forwardRef } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  ariaLabel?: string
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onFocus?: () => void
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { value, onChange, placeholder = "Search…", className, inputClassName, ariaLabel, autoFocus, onKeyDown, onFocus },
  ref
) {
  return (
    <div
      className={cn(
        "folk-input-wrap flex h-[32px] items-center gap-[7px] rounded-folk-input border border-folk-border-strong bg-folk-surface px-[11px] transition-[border-color] duration-fast ease-in-out",
        className
      )}
    >
      <Search className="h-[14px] w-[14px] shrink-0 text-folk-placeholder" strokeWidth={1.75} />
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-[13px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none",
          inputClassName
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="shrink-0 text-folk-placeholder transition-colors hover:text-folk-secondary"
          tabIndex={0}
          aria-label="Clear search"
        >
          <X className="h-[13px] w-[13px]" strokeWidth={2} />
        </button>
      )}
    </div>
  )
})
