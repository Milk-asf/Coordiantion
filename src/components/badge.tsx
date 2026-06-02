"use client"

import { cn } from "@/lib/utils"

type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info" | "purple"

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "border-gray-200 bg-gray-50 text-gray-600",
  success: "border-green-100 bg-green-50 text-green-600",
  warning: "border-amber-100 bg-amber-50 text-amber-600",
  danger: "border-red-100 bg-red-50 text-red-600",
  info: "border-blue-100 bg-blue-50 text-blue-600",
  purple: "border-purple-100 bg-purple-50 text-purple-600",
}

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[4px] rounded-[6px] border px-[8px] py-[2px] text-[11px] font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
