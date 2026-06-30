"use client"

import type { ComponentType, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FolkEntityLinkProps {
  label: string
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>
  onClick?: () => void
  href?: string
  trailing?: ReactNode
  className?: string
}

/** Icon + underlined entity name — Folk company / record link row. */
export function FolkEntityLink({
  label,
  icon: Icon,
  onClick,
  href,
  trailing,
  className,
}: FolkEntityLinkProps) {
  const content = (
    <>
      {Icon && <Icon className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />}
      <span className="truncate text-[13px] font-medium text-[#2563EB] underline decoration-[#2563EB]/30 underline-offset-2">
        {label}
      </span>
      {trailing}
    </>
  )

  const rowClass = cn(
    "flex min-w-0 items-center gap-[8px]",
    (onClick || href) && "cursor-pointer transition-opacity hover:opacity-80",
    className
  )

  if (href) {
    return (
      <a href={href} className={rowClass} tabIndex={0}>
        {content}
      </a>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(rowClass, "text-left")} tabIndex={0}>
        {content}
      </button>
    )
  }

  return <div className={rowClass}>{content}</div>
}
