"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { motion } from "@/lib/motion"

interface FloatingSidePanelProps {
  children: ReactNode
  width?: number
  className?: string
}

/** Folk flush right detail pane — full height, left border only. */
export function FloatingSidePanel({ children, width = 440, className }: FloatingSidePanelProps) {
  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden border-l border-folk-border bg-white",
        motion.slideInRight,
        className
      )}
      style={{ width }}
    >
      {children}
    </aside>
  )
}

export function FloatingSidePanelHost({ children }: { children: ReactNode }) {
  return <div className="flex h-full shrink-0">{children}</div>
}
