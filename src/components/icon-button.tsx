"use client"

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { Tooltip } from "@/components/tooltip"
import { motion } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip: string
  children: ReactNode
  tooltipSide?: "top" | "bottom"
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { tooltip, children, tooltipSide = "top", type = "button", "aria-label": ariaLabel, className, ...props },
  ref
) {
  return (
    <Tooltip label={tooltip} side={tooltipSide}>
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel ?? tooltip}
        className={cn(motion.interactive, className)}
        {...props}
      >
        {children}
      </button>
    </Tooltip>
  )
})
