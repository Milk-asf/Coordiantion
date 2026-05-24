"use client"

interface EntityIconProps {
  text: string
  size?: "sm" | "md" | "lg" | "xl"
  backgroundClassName?: string
  textClassName?: string
}

const sizeConfig = {
  sm: {
    box: "h-[22px] w-[22px] rounded-[6px]",
    text: "text-[10px]",
  },
  md: {
    box: "h-[28px] w-[28px] rounded-[8px]",
    text: "text-[12px]",
  },
  lg: {
    box: "h-[40px] w-[40px] rounded-[10px]",
    text: "text-[16px]",
  },
  xl: {
    box: "h-[48px] w-[48px] rounded-[12px]",
    text: "text-[18px]",
  },
} as const

export function EntityIcon({
  text,
  size = "md",
  backgroundClassName = "bg-[#DBEAFE]",
  textClassName = "text-[#2563EB]",
}: EntityIconProps) {
  const config = sizeConfig[size]

  return (
    <div
      className={`flex shrink-0 items-center justify-center font-semibold ${config.box} ${config.text} ${backgroundClassName} ${textClassName}`}
    >
      {text}
    </div>
  )
}
