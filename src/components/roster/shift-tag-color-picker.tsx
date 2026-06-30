"use client"

import type { SessionTypeTone } from "@/lib/roster/types"
import { FOLK_CHIP_SURFACE_PALETTE, FOLK_CHIP_TONE_OPTIONS, type FolkChipTone } from "@/lib/chip-colors"
import { cn } from "@/lib/utils"

interface ShiftTagColorPickerProps {
  value: SessionTypeTone
  onChange: (tone: SessionTypeTone) => void
  className?: string
}

export function ShiftTagColorPicker({ value, onChange, className }: ShiftTagColorPickerProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-[6px]", className)}
      role="radiogroup"
      aria-label="Tag colour"
    >
      {FOLK_CHIP_TONE_OPTIONS.map(({ tone, label }) => {
        const isSelected = value === tone
        return (
          <button
            key={tone}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={label}
            onClick={() => onChange(tone)}
            className={cn(
              "h-[22px] w-[22px] shrink-0 rounded-full border transition-shadow",
              FOLK_CHIP_SURFACE_PALETTE[tone as FolkChipTone],
              isSelected
                ? "border-folk-text ring-2 ring-folk-text ring-offset-1"
                : "border-[#bababa] hover:ring-1 hover:ring-[#bbb]"
            )}
            tabIndex={0}
          />
        )
      })}
    </div>
  )
}

export function ShiftTagColorSwatch({ tone, className }: { tone: FolkChipTone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-[10px] w-[10px] shrink-0 rounded-full border border-[#bababa]",
        FOLK_CHIP_SURFACE_PALETTE[tone],
        className
      )}
      aria-hidden="true"
    />
  )
}
