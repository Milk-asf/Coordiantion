"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FolkPageHeaderProps {
  groupLabel: string
  viewLabel: string
  title: string
  actions?: ReactNode
  className?: string
}

/** Folk central pane header: breadcrumb → title → action row */
export function FolkPageHeader({ groupLabel, viewLabel, title, actions, className }: FolkPageHeaderProps) {
  return (
    <div className={cn("shrink-0 border-b border-folk-border bg-folk-nav px-[24px] pb-[16px] pt-[20px]", className)}>
      <div className="mb-[8px] flex items-center gap-[6px] text-[12px] font-normal text-folk-secondary">
        <span>{groupLabel}</span>
        <span className="text-folk-border">/</span>
        <span className="text-folk-secondary">{viewLabel}</span>
      </div>
      <h1 className="mb-[16px] text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-folk-text">
        {title}
      </h1>
      {actions && (
        <div className="flex flex-wrap items-center gap-[8px]">{actions}</div>
      )}
    </div>
  )
}

interface FolkOutlineButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function FolkOutlineButton({ children, className, ...props }: FolkOutlineButtonProps) {
  return (
    <button type="button" className={cn("outline-btn px-[12px] py-[6px]", className)} {...props}>
      {children}
    </button>
  )
}

interface FolkCheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
  ariaLabel: string
}

export function FolkCheckbox({ checked, indeterminate, onChange, ariaLabel }: FolkCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      onClick={(e) => { e.stopPropagation(); onChange() }}
      className={cn(
        "flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-none border transition-colors",
        checked || indeterminate
          ? "border-folk-text bg-folk-text text-white"
          : "border-folk-border bg-white hover:border-folk-text"
      )}
      tabIndex={0}
    >
      {checked && !indeterminate && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
          <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {indeterminate && (
        <span className="h-[2px] w-[8px] rounded-full bg-white" aria-hidden="true" />
      )}
    </button>
  )
}
