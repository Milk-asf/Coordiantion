"use client"

import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ListRemoveRecordButtonProps {
  onClick: () => void
  className?: string
}

/** Removes a record from the list membership — does not delete the underlying record. */
export function ListRemoveRecordButton({ onClick, className }: ListRemoveRecordButtonProps) {
  return (
    <button
      type="button"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={cn(
        "flex h-[22px] w-[22px] items-center justify-center rounded-[4px] text-folk-placeholder transition-colors hover:bg-folk-hover hover:text-folk-secondary",
        className,
      )}
      aria-label="Remove from list"
      tabIndex={0}
    >
      <X className="h-[13px] w-[13px]" strokeWidth={1.75} />
    </button>
  )
}
