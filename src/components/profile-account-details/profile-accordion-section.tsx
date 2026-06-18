"use client"

import type { ReactNode } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

interface ProfileAccordionSectionProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}

export function ProfileAccordionSection({ title, isOpen, onToggle, children }: ProfileAccordionSectionProps) {
  return (
    <div className="border-b border-folk-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-[8px] px-[16px] py-[11px] text-left transition-colors hover:bg-folk-page"
        aria-expanded={isOpen}
        tabIndex={0}
      >
        {isOpen ? (
          <ChevronDown className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
        ) : (
          <ChevronRight className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
        )}
        <span className="text-[13px] font-semibold text-folk-text">{title}</span>
      </button>
      {isOpen && (
        <div className="px-[16px] pb-[14px] pt-[2px]">
          {children}
        </div>
      )}
    </div>
  )
}
