"use client"

import { cn } from "@/lib/utils"
import { getCategoryChipClasses, type FolkChipTone } from "@/lib/chip-colors"

interface CategoryChipProps {
  label: string
  categoryKey?: string
  toneMap?: Record<string, FolkChipTone>
  size?: "sm" | "md" | "lg"
  className?: string
}

export function CategoryChip({ label, categoryKey, toneMap, size = "md", className }: CategoryChipProps) {
  return (
    <span className={cn(getCategoryChipClasses(categoryKey ?? label, { toneMap, size }), className)}>
      {label}
    </span>
  )
}
