"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Check,
  ChevronUp,
  X,
  Users,
  Building2,
  Tag,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useClients } from "@/lib/clients-context"
import { useWorkspaceSettings } from "@/lib/hooks/use-workspace-settings"
import { useCharges } from "@/lib/hooks/use-charges"

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
  const { chargeItems, isLoading: chargesLoading } = useCharges()
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
      label: "Set up NDIS price book",
      href: "/settings/charges",
      icon: Tag,
      isComplete: !chargesLoading && chargeItems.length > 0,
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
          className="flex h-7 w-full items-center justify-center rounded-none text-sidebar-text transition-colors hover:bg-sidebar-hover"
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
                stroke="var(--folk-border)"
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
      <div className="rounded-none border border-sidebar-border bg-folk-surface p-[8px]">
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="flex w-full items-center gap-[6px] rounded-none px-[4px] py-[4px] text-left transition-colors hover:bg-folk-page"
          aria-expanded={isExpanded}
          tabIndex={0}
        >
          <span className="text-[13px] font-semibold text-folk-text">Setup</span>
          <span className="rounded-full bg-[var(--folk-border-subtle)] px-[7px] py-[1px] text-[10px] font-semibold text-folk-secondary">
            {completedCount}/{items.length}
          </span>
          <span className="flex-1" />
          <ChevronUp
            className={cn(
              "h-[13px] w-[13px] shrink-0 text-folk-placeholder transition-transform",
              !isExpanded && "rotate-180"
            )}
            strokeWidth={1.75}
          />
        </button>

        {isExpanded && (
          <div className="mt-[6px] flex flex-col gap-[5px]">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-[8px] rounded-[7px] px-[9px] py-[8px] text-[12px] font-medium transition-colors",
                    item.isComplete
                      ? "bg-[#eaf1fe] text-[#2563EB]"
                      : "bg-folk-hover text-[#444] hover:bg-[#ededed] hover:text-folk-text"
                  )}
                  tabIndex={0}
                >
                  <Icon
                    className={cn(
                      "h-[14px] w-[14px] shrink-0",
                      item.isComplete ? "text-[#2563EB]" : "text-folk-secondary"
                    )}
                    strokeWidth={1.75}
                  />
                  <span className={cn("flex-1 truncate", item.isComplete && "line-through")}>
                    {item.label}
                  </span>
                  {item.isComplete && (
                    <Check className="h-[14px] w-[14px] shrink-0 text-[#2563EB]" strokeWidth={2.5} />
                  )}
                </Link>
              )
            })}
            <div className="mt-[1px] flex items-center justify-end">
              <button
                onClick={handleDismiss}
                className="flex items-center gap-[4px] px-[4px] py-[2px] text-[10px] font-medium text-folk-placeholder transition-colors hover:text-folk-secondary"
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
