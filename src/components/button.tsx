"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"

const variantClasses: Record<ButtonVariant, string> = {
  primary: "primary-btn",
  secondary: "border border-[#dcdcdc] bg-transparent text-[#262626] hover:bg-[#f5f5f5]",
  ghost: "text-[#888] hover:bg-[#f5f5f5] hover:text-[#262626]",
  danger: "border border-red-200 bg-transparent text-red-500 hover:bg-red-50",
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className, children, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "flex items-center justify-center gap-[5px] rounded-[4px] px-[8px] py-[4px] text-[13px] font-medium transition-colors disabled:opacity-50",
        variantClasses[variant],
        className
      )}
      tabIndex={0}
      {...props}
    >
      {children}
    </button>
  )
})
