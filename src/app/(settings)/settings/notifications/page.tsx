"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, Bell } from "lucide-react"

const STORAGE_KEY = "coordination:notification-preferences"

interface NotifPref {
  enabled: boolean
  email: boolean
  inApp: boolean
}

interface NotifItem {
  id: string
  label: string
  description: string
  timing?: string
  timingOptions?: string[]
}

interface NotifCategory {
  title: string
  description: string
  items: NotifItem[]
}

const categories: NotifCategory[] = [
  {
    title: "Tasks",
    description: "Notifications about tasks assigned to you or due soon.",
    items: [
      { id: "overdue-task", label: "Overdue tasks", description: "When a task passes its due date without being completed." },
      { id: "due-date", label: "Due date reminders", description: "Get reminded before a task is due.", timing: "24h before", timingOptions: ["1h before", "3h before", "12h before", "24h before", "48h before"] },
      { id: "task-completed", label: "Task completed", description: "When a task is marked as complete." },
      { id: "task-assigned", label: "Task assigned to you", description: "When someone assigns you a task." },
    ],
  },
  {
    title: "Invoices",
    description: "Notifications about invoice status changes.",
    items: [
      { id: "invoice-sent", label: "Invoice sent", description: "When an invoice is sent to a participant or plan manager." },
      { id: "invoice-paid", label: "Invoice paid", description: "When an invoice is marked as paid." },
      { id: "invoice-overdue", label: "Invoice overdue", description: "When an invoice passes its due date without payment." },
    ],
  },
  {
    title: "Participants",
    description: "Notifications about participant events and plan changes.",
    items: [
      { id: "plan-expiring", label: "Plan expiring soon", description: "When a participant's NDIS plan is ending within 30 days." },
      { id: "new-client", label: "New participant added", description: "When a new participant is added to the workspace." },
    ],
  },
  {
    title: "Team",
    description: "Notifications about workspace membership changes.",
    items: [
      { id: "member-joined", label: "New member joined", description: "When a new team member joins the workspace." },
      { id: "member-deactivated", label: "Member deactivated", description: "When a team member is deactivated." },
    ],
  },
]

function getDefaults(): Record<string, NotifPref & { timing?: string }> {
  const defaults: Record<string, NotifPref & { timing?: string }> = {}
  for (const cat of categories) {
    for (const item of cat.items) {
      defaults[item.id] = { enabled: true, email: true, inApp: true, timing: item.timing }
    }
  }
  return defaults
}

function loadPrefs(): Record<string, NotifPref & { timing?: string }> {
  if (typeof window === "undefined") return getDefaults()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const defaults = getDefaults()
      return { ...defaults, ...parsed }
    }
  } catch { /* fall through */ }
  return getDefaults()
}

function savePrefs(prefs: Record<string, NotifPref & { timing?: string }>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors"
      style={{ backgroundColor: checked ? "var(--primary-color)" : "#d4d4d4" }}
      tabIndex={0}
      role="switch"
      aria-checked={checked}
    >
      <span className={cn(
        "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform",
        checked ? "left-[20px]" : "left-[2px]"
      )} />
    </button>
  )
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "flex h-[20px] w-[20px] items-center justify-center rounded-[5px] border-[1.5px] transition-colors",
        checked
          ? "border-blue-400 bg-blue-400 text-white"
          : "border-[#d4d4d4] bg-white hover:border-[#aaa]"
      )}
      tabIndex={0}
      role="checkbox"
      aria-checked={checked}
    >
      {checked && <Check className="h-[12px] w-[12px]" strokeWidth={3} />}
    </button>
  )
}

function TimingSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-[4px] rounded-[6px] border border-[#e0e0e0] bg-white px-[10px] py-[5px] text-[12px] font-medium text-[#555] transition-colors hover:border-[#ccc]"
        tabIndex={0}
      >
        {value}
        <ChevronDown className="h-[10px] w-[10px] text-[#999]" strokeWidth={2} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[59]" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-[60] mt-[4px] w-[140px] rounded-[8px] border border-[#f0f0f0] bg-white py-[4px] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setIsOpen(false) }}
                className={cn(
                  "flex w-full items-center px-[12px] py-[7px] text-left text-[12px] transition-colors hover:bg-[#f5f5f5]",
                  opt === value ? "font-medium text-[#262626]" : "text-[#555]"
                )}
                tabIndex={0}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function NotificationsSettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, NotifPref & { timing?: string }>>(getDefaults)

  useEffect(() => {
    setPrefs(loadPrefs())
  }, [])

  const update = useCallback((id: string, patch: Partial<NotifPref & { timing?: string }>) => {
    setPrefs((prev) => {
      const updated = { ...prev, [id]: { ...prev[id], ...patch } }
      savePrefs(updated)
      return updated
    })
  }, [])

  const enabledCount = Object.values(prefs).filter((p) => p.enabled).length
  const totalCount = Object.keys(prefs).length

  return (
    <>
      <div className="mb-[32px]">
        <h1 className="text-[20px] font-bold text-[#262626]">Notifications</h1>
        <p className="mt-[4px] text-[14px] text-[#888]">
          Choose which notifications you want to receive. Turn off anything you don&apos;t need.
        </p>
      </div>

      {/* Summary */}
      <div className="mb-[28px] flex items-center justify-between px-[20px] py-[14px]">
        <div className="flex items-center gap-[12px]">
          <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-[#f0f0f0]">
            <Bell className="h-[16px] w-[16px] text-[#888]" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#262626]">{enabledCount} of {totalCount} notifications enabled</p>
            <p className="text-[13px] text-[#888]">Disabled notifications won&apos;t appear in your inbox or be sent via email.</p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-[28px]">
        {categories.map((category) => (
          <div key={category.title}>
            <div className="mb-[8px]">
              <h2 className="text-[15px] font-bold text-[#262626]">{category.title}</h2>
              <p className="mt-[2px] text-[13px] text-[#888]">{category.description}</p>
            </div>

            <div className="overflow-hidden">
              {category.items.map((item, itemIdx) => {
                const pref = prefs[item.id] || { enabled: true, email: true, inApp: true }
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "px-[20px] py-[16px]",
                      itemIdx < category.items.length - 1 && "border-b border-[#efefef]"
                    )}
                  >
                    <div className="flex items-center gap-[16px]">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-[10px]">
                          <p className={cn("text-[14px] font-semibold", pref.enabled ? "text-[#262626]" : "text-[#bbb]")}>{item.label}</p>
                          {item.timing && item.timingOptions && pref.enabled && (
                            <TimingSelect
                              value={pref.timing || item.timing}
                              options={item.timingOptions}
                              onChange={(v) => update(item.id, { timing: v })}
                            />
                          )}
                        </div>
                        <p className={cn("mt-[2px] text-[13px]", pref.enabled ? "text-[#888]" : "text-[#ccc]")}>{item.description}</p>
                      </div>
                      <Toggle checked={pref.enabled} onChange={() => update(item.id, { enabled: !pref.enabled })} />
                    </div>

                    {pref.enabled && (
                      <div className="mt-[12px] flex items-center gap-[20px] pl-[2px]">
                        <label className="flex cursor-pointer items-center gap-[8px]">
                          <Checkbox checked={pref.inApp} onChange={() => update(item.id, { inApp: !pref.inApp })} />
                          <span className="text-[12px] font-medium text-[#666]">In-app</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-[8px]">
                          <Checkbox checked={pref.email} onChange={() => update(item.id, { email: !pref.email })} />
                          <span className="text-[12px] font-medium text-[#666]">Email</span>
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
