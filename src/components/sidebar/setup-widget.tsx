"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  Circle,
  ChevronUp,
  X,
  Users,
  Building2,
  Tag,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useClients } from "@/lib/clients-context"
import { useWorkspaceSettings } from "@/lib/hooks/use-workspace-settings"

const STORAGE_KEY = "setup-widget-dismissed"

interface SetupItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  isComplete: boolean
}

interface SetupWidgetProps {
  isCollapsed: boolean
}

export function SetupWidget({ isCollapsed }: SetupWidgetProps) {
  const { clients } = useClients()
  const { settings } = useWorkspaceSettings()
  const [isDismissed, setIsDismissed] = useState(true)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    setIsDismissed(localStorage.getItem(STORAGE_KEY) === "true")
  }, [])

  const items: SetupItem[] = [
    {
      id: "client",
      label: "Add your first client",
      href: "/clients",
      icon: Users,
      isComplete: clients.length > 0,
    },
    {
      id: "org",
      label: "Add organisation details",
      href: "/settings/general",
      icon: Building2,
      isComplete: Boolean(settings.orgAbn) && Boolean(settings.orgEmail),
    },
    {
      id: "charges",
      label: "Set up your charges",
      href: "/settings/charges",
      icon: Tag,
      isComplete: false,
    },
  ]

  const completedCount = items.filter((i) => i.isComplete).length
  const allDone = completedCount === items.length

  if (isDismissed || allDone) return null

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true")
    setIsDismissed(true)
  }

  const nextItem = items.find((i) => !i.isComplete)
  const percent = Math.round((completedCount / items.length) * 100)

  if (isCollapsed) {
    return (
      <div className="px-2 pb-2">
        <Link
          href={nextItem?.href ?? "/clients"}
          className="flex h-7 w-full items-center justify-center rounded text-sidebar-text transition-colors hover:bg-sidebar-hover"
          aria-label={`Setup: ${completedCount} of ${items.length} complete`}
          tabIndex={0}
          title={`Setup ${completedCount}/${items.length}`}
        >
          <div className="relative flex h-[18px] w-[18px] items-center justify-center">
            <svg className="absolute inset-0" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="#e5e5e5"
                strokeWidth="3"
              />
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="#16a34a"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(percent / 100) * 62.83} 62.83`}
                transform="rotate(-90 12 12)"
              />
            </svg>
          </div>
        </Link>
      </div>
    )
  }

  return (
    <div className="px-2 pb-2">
      <div className="rounded-[8px] border border-sidebar-border bg-white">
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="flex w-full items-center gap-2 px-2 py-[7px] text-left transition-colors hover:bg-[#fafafa]"
          aria-expanded={isExpanded}
          tabIndex={0}
        >
          <div className="flex flex-1 flex-col gap-[4px]">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#262626]">Setup</span>
              <span className="text-[11px] font-medium text-[#888]">
                {completedCount}/{items.length}
              </span>
            </div>
            <div className="h-[3px] overflow-hidden rounded-full bg-[#eee]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${percent}%`, backgroundColor: "#16a34a" }}
              />
            </div>
          </div>
          <ChevronUp
            className={cn(
              "h-[12px] w-[12px] shrink-0 text-[#bbb] transition-transform",
              !isExpanded && "rotate-180"
            )}
            strokeWidth={1.75}
          />
        </button>

        {isExpanded && (
          <div className="border-t border-sidebar-border">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-2 py-[6px] text-[12px] font-medium transition-colors",
                    item.isComplete
                      ? "text-[#bbb]"
                      : "text-[#555] hover:bg-[#fafafa] hover:text-[#262626]"
                  )}
                  tabIndex={0}
                >
                  {item.isComplete ? (
                    <CheckCircle2 className="h-[13px] w-[13px] shrink-0 text-emerald-500" strokeWidth={2} />
                  ) : (
                    <Circle className="h-[13px] w-[13px] shrink-0 text-[#d0d0d0]" strokeWidth={1.5} />
                  )}
                  <Icon className="h-[12px] w-[12px] shrink-0 text-[#999]" strokeWidth={1.5} />
                  <span className={cn("flex-1 truncate", item.isComplete && "line-through")}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
            <div className="flex items-center justify-end border-t border-sidebar-border px-2 py-[5px]">
              <button
                onClick={handleDismiss}
                className="flex items-center gap-[4px] text-[10px] font-medium text-[#bbb] transition-colors hover:text-[#666]"
                tabIndex={0}
                aria-label="Dismiss setup"
              >
                <X className="h-[10px] w-[10px]" strokeWidth={1.75} />
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
