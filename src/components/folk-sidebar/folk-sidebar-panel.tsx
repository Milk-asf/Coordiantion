"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FolkSidebarPanelProps {
  children: ReactNode
  className?: string
}

/** Scrollable body for floating side panels and account detail tabs. */
export function FolkSidebarPanel({ children, className }: FolkSidebarPanelProps) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}>
      <div className="px-[24px] py-[14px]">{children}</div>
    </div>
  )
}

interface FolkSidebarSectionProps {
  title?: string
  children: ReactNode
  className?: string
}

/** Optional titled block within a sidebar (metadata, system fields). */
export function FolkSidebarSection({ title, children, className }: FolkSidebarSectionProps) {
  return (
    <div className={cn("border-t border-folk-border-subtle pt-[14px]", className)}>
      {title && (
        <p className="mb-[8px] text-[11px] font-semibold uppercase tracking-[0.08em] text-folk-placeholder">
          {title}
        </p>
      )}
      {children}
    </div>
  )
}
