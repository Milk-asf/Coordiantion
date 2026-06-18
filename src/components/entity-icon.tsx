"use client"

import { cn } from "@/lib/utils"

interface EntityIconProps {
  text: string
  size?: "xs" | "xsm" | "sm" | "md" | "base" | "lg" | "xl"
  className?: string
  backgroundClassName?: string
  textClassName?: string
}

const sizeConfig = {
  xs: {
    box: "h-[16px] w-[16px]",
    text: "text-[8px]",
  },
  xsm: {
    box: "h-[20px] w-[20px]",
    text: "text-[8px]",
  },
  sm: {
    box: "h-[24px] w-[24px]",
    text: "text-[10px]",
  },
  md: {
    box: "h-[28px] w-[28px]",
    text: "text-[11px]",
  },
  base: {
    box: "h-[32px] w-[32px]",
    text: "text-[11px]",
  },
  lg: {
    box: "h-[40px] w-[40px]",
    text: "text-[14px]",
  },
  xl: {
    box: "h-[52px] w-[52px]",
    text: "text-[18px]",
  },
} as const

/** Circular profile icon — white fill, gray border, black initials. */
export function EntityIcon({
  text,
  size = "md",
  className,
  backgroundClassName = "border border-folk-border bg-white",
  textClassName = "font-semibold text-folk-text",
}: EntityIconProps) {
  const config = sizeConfig[size]

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        config.box,
        config.text,
        backgroundClassName,
        textClassName,
        className
      )}
    >
      {text.slice(0, 2).toUpperCase()}
    </div>
  )
}
