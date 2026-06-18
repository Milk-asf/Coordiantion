import type { CSSProperties } from "react"

/** Above FloatingSidePanelHost (z-60) and roster toolbar menus (z-200). */
export const FIXED_DROPDOWN_BACKDROP_Z_CLASS = "z-[210]"
export const FIXED_DROPDOWN_MENU_Z_CLASS = "z-[211]"

export type FixedDropdownAlign = "left" | "right" | "match"

export const DEFAULT_DATE_PICKER_HEIGHT = 380

function getViewportSize() {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 }
  }

  const viewport = window.visualViewport
  return {
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  }
}

export function getFixedDropdownStyle(
  rect: DOMRect,
  estimatedHeight: number,
  minWidth: number,
  align: FixedDropdownAlign = "match"
): CSSProperties {
  const padding = 8
  const gap = 4
  const { width: viewportWidth, height: viewportHeight } = getViewportSize()

  const desiredWidth = align === "match" ? Math.max(rect.width, minWidth) : minWidth
  const menuWidth = Math.min(desiredWidth, Math.max(minWidth, viewportWidth - padding * 2))

  const spaceBelow = Math.max(0, viewportHeight - rect.bottom - padding)
  const spaceAbove = Math.max(0, rect.top - padding)
  const heightNeeded = estimatedHeight + gap

  const fitsBelow = spaceBelow >= heightNeeded
  const fitsAbove = spaceAbove >= heightNeeded

  let openUp: boolean
  if (fitsBelow && !fitsAbove) {
    openUp = false
  } else if (fitsAbove && !fitsBelow) {
    openUp = true
  } else if (fitsBelow && fitsAbove) {
    openUp = false
  } else {
    openUp = spaceAbove > spaceBelow
  }

  const available = Math.max(0, (openUp ? spaceAbove : spaceBelow) - gap)
  const maxHeight = Math.min(estimatedHeight, available || estimatedHeight)

  let left = rect.left
  if (align === "right") left = rect.right - menuWidth
  const maxLeft = Math.max(padding, viewportWidth - menuWidth - padding)
  left = Math.min(Math.max(padding, left), maxLeft)

  const base: CSSProperties = {
    left,
    minWidth: menuWidth,
    width: menuWidth,
    maxHeight,
    overflowY: "auto",
  }

  if (openUp) {
    return { ...base, bottom: viewportHeight - rect.top + gap }
  }

  const maxTop = Math.max(padding, viewportHeight - padding - maxHeight)
  const top = Math.min(Math.max(padding, rect.bottom + gap), maxTop)

  return { ...base, top }
}
