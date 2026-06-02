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
        "flex h-[36px] items-center gap-[7px] rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[11px] transition-colors focus-within:border-[#bbb]",
        className
      )}
    >
      <Search className="h-[14px] w-[14px] shrink-0 text-[#bbb]" strokeWidth={1.75} />
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
          "min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none",
          inputClassName
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="shrink-0 text-[#bbb] transition-colors hover:text-[#888]"
          tabIndex={0}
          aria-label="Clear search"
        >
          <X className="h-[13px] w-[13px]" strokeWidth={2} />
        </button>
      )}
    </div>
  )
})
