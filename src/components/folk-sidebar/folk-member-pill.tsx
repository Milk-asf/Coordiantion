"use client"

import { EntityIcon } from "@/components/entity-icon"
import { cn } from "@/lib/utils"

interface FolkMemberPillProps {
  name: string
  onClick?: () => void
  className?: string
  size?: "sm" | "md"
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"
}

/** Grey pill with avatar + name — Folk "Created by" / member assignee pattern. */
export function FolkMemberPill({ name, onClick, className, size = "md" }: FolkMemberPillProps) {
  const content = (
    <>
      <EntityIcon text={getInitials(name)} size={size === "sm" ? "xsm" : "sm"} />
      <span className="truncate">{name}</span>
    </>
  )

  const pillClass = cn(
    "folk-chip inline-flex max-w-full items-center gap-[6px] border border-folk-border bg-folk-hover py-[3px] pl-[4px] pr-[10px] text-[13px] font-medium text-folk-text",
    size === "sm" && "gap-[5px] py-[2px] pl-[3px] pr-[8px] text-[12px]",
    onClick && "cursor-pointer transition-colors hover:bg-[#efefef]",
    className
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={pillClass} tabIndex={0}>
        {content}
      </button>
    )
  }

  return <span className={pillClass}>{content}</span>
}
