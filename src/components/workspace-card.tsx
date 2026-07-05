"use client"

import type { ComponentType, KeyboardEvent, ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface WorkspaceCardRow {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  content: ReactNode
}

interface WorkspaceCardProps {
  title: string
  avatar: ReactNode
  avatarBackground?: string
  rows: WorkspaceCardRow[]
  onClick: () => void
  actions?: ReactNode
  /** Always-visible element shown before the hover actions (e.g. a pin badge). */
  headerAccessory?: ReactNode
  className?: string
}

/** Folk-style workspace card — header avatar + title, divider, icon rows. */
export function WorkspaceCard({
  title,
  avatar,
  avatarBackground = "#ede9fe",
  rows,
  onClick,
  actions,
  headerAccessory,
  className,
}: WorkspaceCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group flex cursor-pointer flex-col overflow-hidden rounded-[6px] border border-[#d9d9d9] bg-white text-left transition-colors hover:border-[#bababa] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a3c4f3]/50",
        className,
      )}
    >
      <div className="flex items-center gap-[10px] border-b border-[#d9d9d9] px-[12px] py-[10px]">
        <span
          className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full text-[16px] leading-none"
          style={{ backgroundColor: avatarBackground }}
        >
          {avatar}
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-folk-text">{title}</h3>
        {headerAccessory ? <div className="shrink-0">{headerAccessory}</div> : null}
        {actions ? (
          <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" onClick={(event) => event.stopPropagation()}>
            {actions}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col px-[12px] py-[4px]">
        {rows.map((row, index) => {
          const Icon = row.icon
          return (
            <div key={index} className="flex min-h-[32px] items-center gap-[8px] py-[4px]">
              <Icon className="h-[15px] w-[15px] shrink-0 text-[#888888]" strokeWidth={1.5} />
              <div className="min-w-0 flex-1 truncate">{row.content}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type WorkspaceCardPillTone = "blue" | "purple" | "green" | "rose" | "neutral"

const pillToneClasses: Record<WorkspaceCardPillTone, string> = {
  blue: "bg-[#dbeafe] text-[#1d4ed8]",
  purple: "bg-[#ede9fe] text-[#6d28d9]",
  green: "bg-[#dcfce7] text-[#15803d]",
  rose: "bg-[#fee2e2] text-[#b91c1c]",
  neutral: "bg-[#f3f4f6] text-[#4b5563]",
}

export function WorkspaceCardPill({ label, tone = "blue" }: { label: string; tone?: WorkspaceCardPillTone }) {
  return (
    <span
      className={cn(
        "folk-chip inline-flex h-[22px] max-w-full items-center truncate px-[8px] text-[12px] font-normal leading-none",
        pillToneClasses[tone],
      )}
    >
      {label}
    </span>
  )
}

export function WorkspaceCardText({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <span className={cn("truncate text-[13px] font-normal leading-none", muted ? "text-[#888888]" : "text-folk-text")}>
      {children}
    </span>
  )
}

export function WorkspaceCardLinkText({ children }: { children: ReactNode }) {
  return (
    <span className="truncate text-[13px] font-normal leading-none text-folk-text underline decoration-[#d0d0d0] underline-offset-[3px]">
      {children}
    </span>
  )
}

export function pastelFromHex(hex: string, alpha = "22"): string {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return "#ede9fe"
  return `#${normalized}${alpha}`
}
