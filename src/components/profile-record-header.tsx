"use client"

import { ChevronLeft } from "lucide-react"
import type { ComponentType, ReactNode, ButtonHTMLAttributes } from "react"
import { IconButton } from "@/components/icon-button"
import { cn } from "@/lib/utils"
import {
  folkNavActionLinkClass,
  folkNavBarClass,
  folkNavDividerClass,
  folkNavIconButtonClass,
  folkNavPrimaryTextClass,
} from "@/components/tab-active-indicator"

export interface ProfileMetadataItem {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
}

interface ProfileRecordHeaderProps {
  name: string
  metadata?: ProfileMetadataItem[]
  actions?: ReactNode
  onBack?: () => void
  backLabel?: string
}

export function ProfileMetadataPill({ icon: Icon, label }: ProfileMetadataItem) {
  return (
    <span className="inline-flex h-[26px] max-w-full items-center gap-[6px] rounded-[8px] border border-[#e0e0e0] bg-white px-[8px] text-[12px] font-normal text-[var(--folk-nav-secondary)]">
      <Icon className="h-[12px] w-[12px] shrink-0 text-[var(--folk-nav-secondary)]" strokeWidth={1.5} />
      <span className="truncate">{label}</span>
    </span>
  )
}

export function ProfileNavTextAction({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={folkNavActionLinkClass(className)} tabIndex={0} {...props}>
      {children}
    </button>
  )
}

export function ProfileRecordHeader({
  name,
  metadata = [],
  actions,
  onBack,
  backLabel = "Back",
}: ProfileRecordHeaderProps) {
  return (
    <div className={folkNavBarClass("justify-between px-[12px]")}>
      <div className="flex min-w-0 flex-1 items-center gap-[10px]">
        {onBack && (
          <>
            <IconButton
              type="button"
              onClick={onBack}
              tooltip={backLabel}
              className={cn(
                "flex h-[24px] w-[24px] shrink-0 items-center justify-center",
                folkNavIconButtonClass()
              )}
              tabIndex={0}
            >
              <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={1.75} />
            </IconButton>
            <div className={folkNavDividerClass()} aria-hidden="true" />
          </>
        )}
        <span className={folkNavPrimaryTextClass("min-w-0 truncate")}>{name}</span>
        {metadata.length > 0 && (
          <div className="hidden min-w-0 flex-wrap items-center gap-[6px] lg:flex">
            {metadata.map((item) => (
              <ProfileMetadataPill key={item.label} icon={item.icon} label={item.label} />
            ))}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-[12px]">{actions}</div>}
    </div>
  )
}
