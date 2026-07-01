"use client"

import { Plus } from "lucide-react"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { cn } from "@/lib/utils"

const HOVER_REVEAL_CLASSES =
  "opacity-0 pointer-events-none transition-all group-hover/cell:opacity-100 group-hover/cell:pointer-events-auto group-focus-within/cell:opacity-100 group-focus-within/cell:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto"

export const ROSTER_ADD_SHIFT_SURFACE_CLASSES =
  "flex items-center justify-center rounded-[4px] border border-dashed border-[#b8c9eb] bg-white text-folk-text transition-colors hover:border-[#8fa8e0] hover:bg-[#f8faff] focus-visible:border-[#8fa8e0]"

/** Dashed outline for unassigned / vacant shifts — matches add-shift hover styling. */
export const ROSTER_UNASSIGNED_SHIFT_BORDER_CLASSES =
  "border border-dashed border-[#8fa8e0] bg-[#f8faff]"

export function rosterAddShiftSizeClasses({
  compact = false,
  fullWidth = true,
}: {
  compact?: boolean
  fullWidth?: boolean
} = {}) {
  const height = compact ? "h-[29px]" : "h-[40px]"

  if (fullWidth) return cn("w-full", height)

  return cn("h-[24px] w-[24px] shrink-0", height)
}

interface RosterAddShiftButtonProps {
  onClick: () => void
  compact?: boolean
  fullWidth?: boolean
  className?: string
  label?: string
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void
}

export function RosterAddShiftButton({
  onClick,
  compact = false,
  fullWidth = true,
  className,
  label = "Add shift",
  onPointerDown,
}: RosterAddShiftButtonProps) {
  const { canManageRoster } = usePermissions()
  if (!canManageRoster) return null

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      data-roster-add-shift
      className={cn(
        "cursor-pointer",
        ROSTER_ADD_SHIFT_SURFACE_CLASSES,
        rosterAddShiftSizeClasses({ compact, fullWidth }),
        HOVER_REVEAL_CLASSES,
        className
      )}
      aria-label={label}
      tabIndex={0}
    >
      <Plus
        className={cn(fullWidth ? "h-[18px] w-[18px]" : "h-[12px] w-[12px]")}
        strokeWidth={1.5}
      />
    </button>
  )
}
