"use client"

import { cn } from "@/lib/utils"

type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info" | "purple"

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "border-transparent bg-[#eef2f6] text-[#334155]",
  success: "border-transparent bg-[#e8f5e9] text-[#2e7d32]",
  warning: "border-transparent bg-[#fff8e1] text-[#f57f17]",
  danger: "border-transparent bg-[#fce4ec] text-[#c62828]",
  info: "border-transparent bg-[#fff3e0] text-[#e65100]",
  purple: "border-transparent bg-[#f3e5f5] text-[#7b1fa2]",
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
        "inline-flex items-center gap-[4px] rounded-none border px-[8px] py-[2px] text-[11px] font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
