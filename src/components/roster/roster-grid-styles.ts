import { cn } from "@/lib/utils"

/**
 * Grid lines on cell edges so sticky rows/columns keep borders while content scrolls.
 * Use border-b + border-r only (never gap + border — that doubles lines).
 */
export const ROSTER_GRID_CELL_BORDER = "border-b border-r border-[var(--folk-border)]"

export const ROSTER_GRID_CELL = cn("bg-folk-surface", ROSTER_GRID_CELL_BORDER)

/** Scrolls under sticky left column — keep below ROSTER_STICKY_COL_Z. */
export const ROSTER_STICKY_TOP_Z = "z-10"

/** Sticky assignee / vacant sidebar column. */
export const ROSTER_STICKY_COL_Z = "z-20"

/** Top-left corner where row and column stickies meet. */
export const ROSTER_STICKY_CORNER_Z = "z-30"

/** Sticky left column inside a sticky row (e.g. vacant shifts sidebar). Must beat ROSTER_STICKY_COL_Z. */
export const ROSTER_STICKY_ROW_COL_Z = "z-30"

export function rosterStickyColClass(className?: string) {
  return cn(
    "relative sticky left-0 isolate bg-folk-surface",
    ROSTER_STICKY_COL_Z,
    className
  )
}

export function rosterStickyCornerClass(className?: string) {
  return cn(
    "relative sticky top-0 left-0 isolate bg-folk-surface",
    ROSTER_STICKY_CORNER_Z,
    className
  )
}

export function rosterStickyTopClass(className?: string, topClass = "top-0") {
  return cn("sticky isolate overflow-hidden bg-folk-surface", topClass, ROSTER_STICKY_TOP_Z, className)
}

/** Sticky row directly below the 44px calendar header row. */
export const ROSTER_STICKY_BELOW_HEADER = "top-[44px]" as const

/** Sticky staff-column cell in a sticky top row (vacant shifts). Keeps border-r above scrolling rows. */
export function rosterStickyRowColClass(className?: string, topClass = ROSTER_STICKY_BELOW_HEADER) {
  return cn(
    "relative sticky left-0 isolate overflow-hidden bg-folk-surface",
    topClass,
    ROSTER_STICKY_ROW_COL_Z,
    className
  )
}
