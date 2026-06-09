"use client"

import { Plus } from "lucide-react"
import type { ComponentType, MouseEvent } from "react"

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
    <div className={`flex flex-col items-center justify-center px-[24px] py-[56px] text-center ${className ?? ""}`}>
      <div className="rounded-full bg-[#f5f5f5] p-[12px]">
        <Icon className="h-[20px] w-[20px] text-[#999]" strokeWidth={1.5} />
      </div>
      <h3 className="mt-[14px] text-[15px] font-semibold text-[#262626]">{title}</h3>
      {description && <p className="mt-[6px] max-w-[320px] text-[13px] text-[#888]">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          disabled={action.disabled}
          className="primary-btn mt-[16px] flex items-center gap-[6px] rounded-[8px] px-[14px] py-[8px] text-[13px] font-medium transition-colors disabled:opacity-50"
          tabIndex={0}
        >
          <ActionIcon className="h-[14px] w-[14px]" strokeWidth={1.75} />
          {action.label}
        </button>
      )}
    </div>
  )
}
