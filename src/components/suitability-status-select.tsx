"use client"

import { useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { FixedSelectDropdown, FixedSelectOption } from "@/components/fixed-select-dropdown"
import { SUITABILITY_STATUSES, suitabilityStatusConfig } from "@/lib/suitability/config"
import type { SuitabilityStatus } from "@/lib/suitability/types"
import { cn } from "@/lib/utils"

interface SuitabilityStatusSelectProps {
  value: SuitabilityStatus
  onChange: (value: SuitabilityStatus) => void
  disabled?: boolean
  compact?: boolean
}

export function SuitabilityStatusSelect({
  value,
  onChange,
  disabled = false,
  compact = false,
}: SuitabilityStatusSelectProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const config = suitabilityStatusConfig[value]

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation()
          if (disabled) return
          setIsOpen((current) => !current)
        }}
        className={cn(
          "inline-flex items-center gap-[6px] rounded-none border border-folk-border bg-folk-surface px-[10px] py-[5px] text-[13px] font-medium transition-colors hover:bg-folk-page",
          compact && "px-[8px] py-[4px] text-[12px]",
          disabled && "cursor-not-allowed opacity-60 hover:bg-folk-surface",
          config.selectClassName
        )}
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label={`Suitability: ${config.label}`}
      >
        <span>{config.label}</span>
        <ChevronDown className="h-[12px] w-[12px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
      </button>

      <FixedSelectDropdown
        isOpen={isOpen}
        anchorRef={buttonRef}
        onClose={() => setIsOpen(false)}
        estimatedHeight={SUITABILITY_STATUSES.length * 40 + 8}
        minWidth={160}
      >
        {SUITABILITY_STATUSES.map((status) => (
          <FixedSelectOption
            key={status}
            isActive={value === status}
            onClick={() => {
              onChange(status)
              setIsOpen(false)
            }}
          >
            <span className={suitabilityStatusConfig[status].selectClassName}>
              {suitabilityStatusConfig[status].label}
            </span>
          </FixedSelectOption>
        ))}
      </FixedSelectDropdown>
    </>
  )
}

export function SuitabilityDisallowedChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-none px-[6px] py-[2px] text-[10px] font-semibold uppercase tracking-[0.04em]",
        suitabilityStatusConfig.disallowed.chipClassName,
        className
      )}
    >
      Disallowed
    </span>
  )
}
