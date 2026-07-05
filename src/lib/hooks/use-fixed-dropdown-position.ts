"use client"

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react"
import { getFixedDropdownStyle, type FixedDropdownAlign } from "@/lib/dropdown-utils"

export function useFixedDropdownPosition(
  isOpen: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  estimatedHeight: number,
  minWidth: number,
  align: FixedDropdownAlign = "match",
  anchorElement?: HTMLElement | null,
  scrollable = true
) {
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuStyle(null)
      return
    }

    let frame = 0

    const updatePosition = () => {
      const anchor = anchorRef.current ?? anchorElement
      if (!anchor || anchor.getBoundingClientRect().height === 0) {
        frame = requestAnimationFrame(updatePosition)
        return
      }

      setMenuStyle(
        getFixedDropdownStyle(anchor.getBoundingClientRect(), estimatedHeight, minWidth, align, { scrollable })
      )
    }

    updatePosition()

    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    window.visualViewport?.addEventListener("resize", updatePosition)
    window.visualViewport?.addEventListener("scroll", updatePosition)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
      window.visualViewport?.removeEventListener("resize", updatePosition)
      window.visualViewport?.removeEventListener("scroll", updatePosition)
    }
  }, [align, anchorElement, anchorRef, estimatedHeight, isOpen, minWidth, scrollable])

  return menuStyle
}
