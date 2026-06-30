"use client"

import { EntityIcon } from "@/components/entity-icon"
import { TABLE_NAME_CELL, TABLE_STAFF_NAME_CELL } from "@/lib/table-styles"
import { cn } from "@/lib/utils"

export type EntityNameRowVariant = "client" | "staff"

function getNameInitials(name: string, iconText?: string): string {
  if (iconText) return iconText
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface EntityNameRowProps {
  name: string
  iconText?: string
  variant?: EntityNameRowVariant
  className?: string
}

/** Matches Clients / Staff people list name rows — sm avatar + 13px name. */
export function EntityNameRow({
  name,
  iconText,
  variant = "client",
  className,
}: EntityNameRowProps) {
  if (!name.trim()) return null

  const nameClass = variant === "staff"
    ? TABLE_STAFF_NAME_CELL
    : `truncate ${TABLE_NAME_CELL}`

  return (
    <span className={cn("inline-flex min-w-0 max-w-full items-center gap-[10px]", className)}>
      <EntityIcon text={getNameInitials(name, iconText)} size="sm" />
      <span className={nameClass}>{name}</span>
    </span>
  )
}
