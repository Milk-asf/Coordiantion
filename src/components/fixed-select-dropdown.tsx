"use client"

import { type CSSProperties, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"
import { FIXED_DROPDOWN_BACKDROP_Z_CLASS, FIXED_DROPDOWN_MENU_Z_CLASS, type FixedDropdownAlign } from "@/lib/dropdown-utils"
import { useFixedDropdownPosition } from "@/lib/hooks/use-fixed-dropdown-position"
import { cn } from "@/lib/utils"

interface FixedSelectDropdownProps {
  isOpen: boolean
  anchorRef: RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
  estimatedHeight?: number
  minWidth?: number
  align?: FixedDropdownAlign
  menuClassName?: string
  emptyMessage?: string
  isEmpty?: boolean
}

export function FixedSelectDropdown({
  isOpen,
  anchorRef,
  onClose,
  children,
  estimatedHeight = 220,
  minWidth = 220,
  align = "match",
  menuClassName,
  emptyMessage,
  isEmpty = false,
}: FixedSelectDropdownProps) {
  const contentHeight = isEmpty ? 56 : estimatedHeight
  const menuStyle = useFixedDropdownPosition(isOpen, anchorRef, contentHeight, minWidth, align)

  if (!isOpen || !menuStyle) return null

  const maxHeight = typeof menuStyle.maxHeight === "number" ? menuStyle.maxHeight : contentHeight
  const menuDimensions: CSSProperties = {
    ...menuStyle,
    minHeight: Math.min(contentHeight, maxHeight),
  }

  return createPortal(
    <>
      <div
        className={cn("fixed inset-0", FIXED_DROPDOWN_BACKDROP_Z_CLASS)}
        data-floating-overlay
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "fixed rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-folk-sm",
          FIXED_DROPDOWN_MENU_Z_CLASS,
          menuClassName
        )}
        data-floating-overlay
        style={menuDimensions}
      >
        {isEmpty && emptyMessage ? (
          <FixedDropdownEmptyMessage>{emptyMessage}</FixedDropdownEmptyMessage>
        ) : (
          children
        )}
      </div>
    </>,
    document.body
  )
}

export function FixedDropdownEmptyMessage({ children }: { children: ReactNode }) {
  return (
    <p className="px-[12px] py-[10px] text-[12px] leading-[1.45] text-folk-secondary">
      {children}
    </p>
  )
}

interface FixedSelectOptionProps {
  children: ReactNode
  isActive?: boolean
  muted?: boolean
  onClick: () => void
}

export function FixedSelectOption({
  children,
  isActive = false,
  muted = false,
  onClick,
}: FixedSelectOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-[32px] w-full cursor-pointer items-center gap-[8px] px-[12px] text-left text-[13px] font-normal transition-colors hover:bg-folk-hover",
        muted ? "text-folk-secondary" : "text-folk-text",
        isActive && "bg-folk-hover"
      )}
      role="option"
      aria-selected={isActive}
      tabIndex={0}
    >
      {children}
    </button>
  )
}
