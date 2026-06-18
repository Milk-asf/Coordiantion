"use client"

import { Plus } from "lucide-react"
import type { ComponentType, MouseEvent } from "react"
import { motion } from "@/lib/motion"

interface EmptyStateAction {
  label: string
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>
  disabled?: boolean
}

interface EmptyStateProps {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  description?: string
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  const ActionIcon = action?.icon ?? Plus

  return (
    <div className={`flex flex-col items-center justify-center px-[24px] py-[56px] text-center ${motion.fadeIn} ${className ?? ""}`}>
      <div className="rounded-full bg-folk-hover p-[12px]">
        <Icon className="h-[20px] w-[20px] text-folk-secondary" strokeWidth={1.5} />
      </div>
      <h3 className="mt-[14px] text-[15px] font-semibold text-folk-text">{title}</h3>
      {description && <p className="mt-[6px] max-w-[320px] text-[13px] text-folk-secondary">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          disabled={action.disabled}
          className={`primary-btn mt-[16px] flex items-center gap-[6px] disabled:opacity-50 ${motion.interactive}`}
          tabIndex={0}
        >
          <ActionIcon className="h-[14px] w-[14px]" strokeWidth={1.75} />
          {action.label}
        </button>
      )}
    </div>
  )
}
