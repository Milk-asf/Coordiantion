"use client"

import { useEffect, useRef, type RefObject } from "react"
import { createPortal } from "react-dom"
import { DatePicker } from "@/components/date-picker"
import {
  DEFAULT_DATE_PICKER_HEIGHT,
  FIXED_DROPDOWN_BACKDROP_Z_CLASS,
  FIXED_DROPDOWN_MENU_Z_CLASS,
  getFixedDropdownStyle,
  type FixedDropdownAlign,
} from "@/lib/dropdown-utils"
import { useFixedDropdownPosition } from "@/lib/hooks/use-fixed-dropdown-position"
import { cn } from "@/lib/utils"

interface FixedDatePickerDropdownProps {
  isOpen: boolean
  anchorRef: RefObject<HTMLElement | null>
  anchorElement?: HTMLElement | null
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
  anchorElement = null,
  value,
  onChange,
  onClose,
  estimatedHeight = DEFAULT_DATE_PICKER_HEIGHT,
  minWidth = 260,
  align = "match",
}: FixedDatePickerDropdownProps) {
  const openedAtRef = useRef(0)
  const menuStyle = useFixedDropdownPosition(
    isOpen,
    anchorRef,
    estimatedHeight,
    minWidth,
    align,
    anchorElement,
  )

  useEffect(() => {
    if (isOpen) openedAtRef.current = Date.now()
  }, [isOpen])

  const handleBackdropClose = () => {
    if (Date.now() - openedAtRef.current < 200) return
    onClose()
  }

  const anchor = anchorRef.current ?? anchorElement
  const resolvedStyle =
    menuStyle ??
    (isOpen && anchor
      ? getFixedDropdownStyle(anchor.getBoundingClientRect(), estimatedHeight, minWidth, align)
      : null)

  if (!isOpen || !resolvedStyle) return null

  return createPortal(
    <>
      <div
        className={cn("fixed inset-0", FIXED_DROPDOWN_BACKDROP_Z_CLASS)}
        data-floating-overlay
        onClick={handleBackdropClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "fixed rounded-none border border-folk-border bg-folk-surface shadow-folk",
          FIXED_DROPDOWN_MENU_Z_CLASS,
        )}
        data-floating-overlay
        style={{
          ...resolvedStyle,
          overflow: "visible",
        }}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <DatePicker value={value} onChange={onChange} onClose={onClose} bare />
      </div>
    </>,
    document.body
  )
}
