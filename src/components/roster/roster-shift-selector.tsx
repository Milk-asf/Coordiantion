"use client"

import { Plus } from "lucide-react"
import {
  ROSTER_ADD_SHIFT_SURFACE_CLASSES,
  rosterAddShiftSizeClasses,
} from "@/components/roster/roster-add-shift-button"
import { cn } from "@/lib/utils"
import type { CSSProperties } from "react"

export const SHIFT_SELECTOR_SURFACE_CLASSES = ROSTER_ADD_SHIFT_SURFACE_CLASSES

export const SHIFT_SELECTOR_HOVER_CLASSES =
  "hover:border-[#8fa8e0] hover:bg-[#f8faff]"

export const SHIFT_SELECTOR_GROUP_HOVER_CLASSES =
  "group-hover/cell:border-[#8fa8e0] group-hover/cell:bg-[#f8faff]"

export const SHIFT_SELECTOR_ACTIVE_CLASSES =
  "border-[var(--primary-color)] bg-[color-mix(in_srgb,var(--primary-color)_8%,white)] text-[var(--primary-color)]"

export function shiftSelectorSizeClasses(compact = false, fullWidth = true) {
  return rosterAddShiftSizeClasses({ compact, fullWidth })
}

interface RosterShiftSelectorProps {
  compact?: boolean
  fullWidth?: boolean
  active?: boolean
  className?: string
  style?: CSSProperties
}

export function RosterShiftSelector({
  compact = false,
  fullWidth = true,
  active = false,
  className,
  style,
}: RosterShiftSelectorProps) {
  return (
    <div
      className={cn(
        SHIFT_SELECTOR_SURFACE_CLASSES,
        shiftSelectorSizeClasses(compact, fullWidth),
        !active && SHIFT_SELECTOR_HOVER_CLASSES,
        active && SHIFT_SELECTOR_ACTIVE_CLASSES,
        className
      )}
      style={style}
      aria-hidden="true"
    >
      <Plus className="h-[18px] w-[18px]" strokeWidth={1.5} />
    </div>
  )
}
