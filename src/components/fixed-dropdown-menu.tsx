"use client"

import { type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"
import {
  FIXED_DROPDOWN_BACKDROP_Z_CLASS,
  FIXED_DROPDOWN_MENU_Z_CLASS,
  type FixedDropdownAlign,
} from "@/lib/dropdown-utils"
import { useFixedDropdownPosition } from "@/lib/hooks/use-fixed-dropdown-position"
import { cn } from "@/lib/utils"

interface FixedDropdownMenuProps {
  isOpen: boolean
  anchorRef: RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
  estimatedHeight?: number
  minWidth?: number
  align?: FixedDropdownAlign
  className?: string
  backdropClassName?: string
  showBackdrop?: boolean
  anchorElement?: HTMLElement | null
}

export function FixedDropdownMenu({
  isOpen,
  anchorRef,
  onClose,
  children,
  estimatedHeight = 220,
  minWidth = 200,
  align = "match",
  className,
  backdropClassName,
  showBackdrop = true,
  anchorElement,
}: FixedDropdownMenuProps) {
  const menuStyle = useFixedDropdownPosition(isOpen, anchorRef, estimatedHeight, minWidth, align, anchorElement)

  if (!isOpen || !menuStyle) return null

  return createPortal(
    <>
      {showBackdrop && (
        <div
          className={cn("fixed inset-0 z-[55]", backdropClassName ?? FIXED_DROPDOWN_BACKDROP_Z_CLASS)}
          data-floating-overlay
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          "fixed z-[60] rounded-none border border-folk-border bg-folk-surface shadow-folk",
          FIXED_DROPDOWN_MENU_Z_CLASS,
          className
        )}
        data-floating-overlay
        style={menuStyle}
      >
        {children}
      </div>
    </>,
    document.body
  )
}
