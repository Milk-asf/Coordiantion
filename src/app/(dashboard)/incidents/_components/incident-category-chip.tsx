"use client"

import { CategoryChip } from "@/components/category-chip"
import { getIncidentCategoryLabel } from "@/lib/incident-definitions"
import { cn } from "@/lib/utils"

interface IncidentCategoryChipProps {
  category: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function IncidentCategoryChip({ category, size = "sm", className }: IncidentCategoryChipProps) {
  if (!category.trim()) {
    return <span className="text-[13px] text-folk-secondary">—</span>
  }

  return (
    <CategoryChip
      label={getIncidentCategoryLabel(category)}
      categoryKey={category}
      size={size}
      className={cn("max-w-full truncate", className)}
    />
  )
}
