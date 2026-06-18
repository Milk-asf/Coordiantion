"use client"

import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react"
import { createPortal } from "react-dom"
import { DatePicker } from "@/components/date-picker"
import {
  DEFAULT_DATE_PICKER_HEIGHT,
  FIXED_DROPDOWN_BACKDROP_Z_CLASS,
  FIXED_DROPDOWN_MENU_Z_CLASS,
  getFixedDropdownStyle,
  type FixedDropdownAlign,
} from "@/lib/dropdown-utils"
import { cn } from "@/lib/utils"

interface FixedDatePickerDropdownProps {
  isOpen: boolean
  anchorRef: RefObject<HTMLElement | null>
  value: string
  onChange: (value: string) => void
  onClose: () => void
  estimatedHeight?: number
  minWidth?: number
  align?: FixedDropdownAlign
}

export function FixedDatePickerDropdown({
  isOpen,
  anchorRef,
  value,
  onChange,
  onClose,
  estimatedHeight = DEFAULT_DATE_PICKER_HEIGHT,
  minWidth = 260,
  align = "match",
}: FixedDatePickerDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuStyle(null)
      return
    }

    let frame = 0

    const updatePosition = () => {
      const anchor = anchorRef.current
      if (!anchor) return

      const rect = anchor.getBoundingClientRect()
      const measuredHeight = Math.max(
        menuRef.current?.scrollHeight ?? 0,
        menuRef.current?.offsetHeight ?? 0,
        estimatedHeight
      )
      setMenuStyle(getFixedDropdownStyle(rect, measuredHeight, minWidth, align))
    }

    updatePosition()
    frame = requestAnimationFrame(updatePosition)

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(updatePosition) : null
    if (menuRef.current) observer?.observe(menuRef.current)

    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [align, anchorRef, estimatedHeight, isOpen, minWidth, value])

  if (!isOpen) return null

  const anchor = anchorRef.current
  const style =
    menuStyle ??
    (anchor
      ? getFixedDropdownStyle(anchor.getBoundingClientRect(), estimatedHeight, minWidth, align)
      : null)

  if (!style) return null

  return createPortal(
    <>
      <div className={cn("fixed inset-0", FIXED_DROPDOWN_BACKDROP_Z_CLASS)} data-floating-overlay onClick={onClose} aria-hidden="true" />
      <div
        ref={menuRef}
        className={cn("fixed overscroll-contain", FIXED_DROPDOWN_MENU_Z_CLASS)}
        data-floating-overlay
        style={style}
      >
        <DatePicker value={value} onChange={onChange} onClose={onClose} />
      </div>
    </>,
    document.body
  )
}
