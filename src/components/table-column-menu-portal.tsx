"use client"

import { createPortal } from "react-dom"
import type { ReactNode } from "react"
import { FIXED_DROPDOWN_BACKDROP_Z_CLASS, FIXED_DROPDOWN_MENU_Z_CLASS } from "@/lib/dropdown-utils"
import { cn } from "@/lib/utils"

interface TableColumnMenuPortalProps {
  isOpen: boolean
  position: { top: number; left: number } | null
  onClose: () => void
  children: ReactNode
}

export function TableColumnMenuPortal({ isOpen, position, onClose, children }: TableColumnMenuPortalProps) {
  if (!isOpen || !position || typeof document === "undefined") return null

  return createPortal(
    <>
      <div
        className={cn("fixed inset-0", FIXED_DROPDOWN_BACKDROP_Z_CLASS)}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "fixed w-[200px] overflow-hidden rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-folk",
          FIXED_DROPDOWN_MENU_Z_CLASS
        )}
        style={{ top: position.top, left: position.left }}
      >
        {children}
      </div>
    </>,
    document.body
  )
}
