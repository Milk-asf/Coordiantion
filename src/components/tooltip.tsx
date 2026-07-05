"use client"

import {
  useCallback,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { motion } from "@/lib/motion"

interface TooltipProps {
  label: string
  children: ReactNode
  side?: "top" | "bottom"
  className?: string
}

export function Tooltip({ label, children, side = "top", className }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    const node = triggerRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    setPosition({
      top: side === "top" ? rect.top - 6 : rect.bottom + 6,
      left: rect.left + rect.width / 2,
    })
  }, [side])

  const show = useCallback(() => {
    updatePosition()
    setIsVisible(true)
  }, [updatePosition])

  const hide = useCallback(() => setIsVisible(false), [])

  const tooltipOffsetClass =
    side === "top"
      ? "-translate-x-1/2 -translate-y-[calc(100%+8px)]"
      : "-translate-x-1/2 translate-y-[8px]"

  return (
    <>
      <span
        ref={triggerRef}
        className={cn("inline-flex", className)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {isVisible && typeof document !== "undefined" && createPortal(
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none fixed z-[220] whitespace-nowrap rounded-[6px] bg-[#1a1a1a] px-[8px] py-[4px] text-[11px] font-medium leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]",
            motion.fadeIn,
            tooltipOffsetClass
          )}
          style={{ top: position.top, left: position.left }}
        >
          {label}
        </span>,
        document.body
      )}
    </>
  )
}

export type TooltipChildProps = HTMLAttributes<HTMLElement>
