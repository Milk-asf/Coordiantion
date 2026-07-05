"use client"

import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react"
import { Tooltip } from "@/components/tooltip"
import { cn } from "@/lib/utils"

interface PanelToggleButtonProps {
  /** Which edge the panel attaches to. */
  side: "left" | "right"
  /** Whether the panel is currently open/visible. */
  isOpen: boolean
  onClick: () => void
  ariaLabel: string
  tooltip?: string
  className?: string
  iconClassName?: string
  tabIndex?: number
}

function getPanelToggleIcon(side: "left" | "right", isOpen: boolean) {
  if (side === "left") return isOpen ? PanelLeftClose : PanelLeftOpen
  return isOpen ? PanelRightClose : PanelRightOpen
}

/** Shared chrome for sidebar / account-details panel collapse controls. */
export function panelToggleButtonClass(className?: string) {
  return cn(
    "flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[6px] border border-folk-border-strong bg-white text-folk-secondary transition-colors hover:border-folk-text hover:text-folk-text",
    className,
  )
}

/** Bordered panel show/hide control — rectangle + chevron icon for collapsible side panels. */
export function PanelToggleButton({
  side,
  isOpen,
  onClick,
  ariaLabel,
  tooltip,
  className,
  iconClassName,
  tabIndex = 0,
}: PanelToggleButtonProps) {
  const Icon = getPanelToggleIcon(side, isOpen)

  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={isOpen}
      tabIndex={tabIndex}
      className={panelToggleButtonClass(className)}
    >
      <Icon className={cn("h-[14px] w-[14px]", iconClassName)} strokeWidth={1.75} />
    </button>
  )

  if (!tooltip) return button

  return (
    <Tooltip label={tooltip} side="top">
      {button}
    </Tooltip>
  )
}
