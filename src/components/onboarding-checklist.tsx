"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { CheckCircle2, Circle, Users, SquareCheck, Tag, Building2, X } from "lucide-react"

interface OnboardingChecklistProps {
  hasClients: boolean
  hasTasks: boolean
  hasCharges: boolean
}

const STORAGE_KEY = "onboarding-dismissed"

const checklistItems = [
  {
    id: "clients",
    label: "Add your first client",
    description: "Create a client profile to start tracking work and billing",
    icon: Users,
    href: "/clients",
    propKey: "hasClients" as const,
  },
  {
    id: "tasks",
    label: "Create a task",
    description: "Add tasks to track your work, time, and progress",
    icon: SquareCheck,
    href: null,
    propKey: "hasTasks" as const,
  },
  {
    id: "charges",
    label: "Set up your charges",
    description: "Configure your service charge types and rates",
    icon: Tag,
    href: "/settings/charges",
    propKey: "hasCharges" as const,
  },
  {
    id: "organisation",
    label: "Configure your organisation",
    description: "Set your business name, logo, and preferences",
    icon: Building2,
    href: "/settings/general",
    propKey: null,
  },
]

export function OnboardingChecklist({ hasClients, hasTasks, hasCharges }: OnboardingChecklistProps) {
  const [isDismissed, setIsDismissed] = useState(true)

  useEffect(() => {
    setIsDismissed(localStorage.getItem(STORAGE_KEY) === "true")
  }, [])

  if (isDismissed) return null

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true")
    setIsDismissed(true)
  }

  const propMap = { hasClients, hasTasks, hasCharges }
  const completedCount = checklistItems.filter((item) => {
    if (!item.propKey) return false
    return propMap[item.propKey]
  }).length

  return (
    <div className="flex items-center justify-center px-[24px] py-[40px]">
      <div className="w-full max-w-[520px] rounded-xl border border-[#e5e5e5] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between px-[24px] pt-[24px]">
          <div>
            <h2 className="text-[15px] font-semibold text-[#262626]">Getting started</h2>
            <p className="mt-[4px] text-[13px] font-medium text-[#888]">
              Complete these steps to set up your workspace
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-md text-[#bbb] transition-colors hover:bg-[#f5f5f5] hover:text-[#888]"
            aria-label="Dismiss onboarding checklist"
            tabIndex={0}
          >
            <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-[24px] pb-[6px] pt-[8px]">
          <div className="flex items-center gap-[8px]">
            <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-[#f0f0f0]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(completedCount / checklistItems.length) * 100}%`,
                  backgroundColor: "var(--primary-color, #2563eb)",
                }}
              />
            </div>
            <span className="text-[11px] font-medium text-[#bbb]">
              {completedCount}/{checklistItems.length}
            </span>
          </div>
        </div>

        <div className="px-[12px] pb-[16px] pt-[8px]">
          {checklistItems.map((item) => {
            const isCompleted = item.propKey ? propMap[item.propKey] : false
            const Icon = item.icon
            const content = (
              <div
                className={`group flex items-start gap-[12px] rounded-lg px-[12px] py-[12px] transition-colors ${
                  item.href && !isCompleted ? "cursor-pointer hover:bg-[#fafafa]" : ""
                }`}
              >
                <div className="mt-[1px] shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" strokeWidth={2} />
                  ) : (
                    <Circle className="h-[18px] w-[18px] text-[#d0d0d0]" strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-[8px]">
                    <Icon className="h-[14px] w-[14px] shrink-0 text-[#999]" strokeWidth={1.5} />
                    <span
                      className={`text-[13px] font-medium ${
                        isCompleted ? "text-[#bbb] line-through" : "text-[#262626]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  <p className={`mt-[2px] pl-[22px] text-[12px] font-medium ${isCompleted ? "text-[#ccc]" : "text-[#999]"}`}>
                    {item.description}
                  </p>
                </div>
              </div>
            )

            if (item.href && !isCompleted) {
              return (
                <Link key={item.id} href={item.href}>
                  {content}
                </Link>
              )
            }

            return <div key={item.id}>{content}</div>
          })}
        </div>

        <div className="border-t border-[#f0f0f0] px-[24px] py-[12px]">
          <button
            onClick={handleDismiss}
            className="text-[12px] font-medium text-[#bbb] transition-colors hover:text-[#888]"
            tabIndex={0}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
