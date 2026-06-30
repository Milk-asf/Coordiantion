"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { motion } from "@/lib/motion"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"

const variantClasses: Record<ButtonVariant, string> = {
  primary: "primary-btn",
  secondary: "outline-btn",
  ghost: "text-folk-secondary hover:bg-folk-hover hover:text-folk-text border border-transparent",
  danger: "border border-red-200 bg-transparent text-red-500 hover:bg-red-50",
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", className, children, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "flex h-[29px] items-center justify-center gap-[5px] px-[12px] text-[13px] font-medium disabled:opacity-45",
        motion.interactive,
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
