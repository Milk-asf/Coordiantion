"use client"

import { useState, useEffect, useCallback } from "react"
import { MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/switch"

const STORAGE_KEY = "coordination:notification-preferences"

interface NotifPref {
  enabled: boolean
  email: boolean
  inApp: boolean
}

interface NotifItem {
  id: string
  label: string
  category: string
  channel: string
  timing?: string
  timingOptions?: string[]
}

const notificationItems: NotifItem[] = [
  { id: "overdue-task", label: "Overdue tasks", category: "Tasks", channel: "In-app + Email" },
  { id: "due-date", label: "Due date reminders", category: "Tasks", channel: "In-app + Email", timing: "24h before", timingOptions: ["1h before", "3h before", "12h before", "24h before", "48h before"] },
  { id: "task-completed", label: "Task completed", category: "Tasks", channel: "In-app" },
  { id: "task-assigned", label: "Task assigned to you", category: "Tasks", channel: "In-app + Email" },
  { id: "invoice-sent", label: "Invoice sent", category: "Invoices", channel: "In-app" },
  { id: "invoice-paid", label: "Invoice paid", category: "Invoices", channel: "In-app + Email" },
  { id: "invoice-overdue", label: "Invoice overdue", category: "Invoices", channel: "In-app + Email" },
  { id: "timesheet-returned", label: "Timesheet returned", category: "Timesheets", channel: "In-app" },
  { id: "timesheet-approved", label: "Timesheet approved", category: "Timesheets", channel: "In-app" },
  { id: "travel-claim-returned", label: "Travel claim returned", category: "Timesheets", channel: "In-app" },
  { id: "travel-claim-approved", label: "Travel claim approved", category: "Timesheets", channel: "In-app" },
  { id: "plan-expiring", label: "Plan expiring soon", category: "Participants", channel: "In-app + Email" },
  { id: "new-client", label: "New participant added", category: "Participants", channel: "In-app" },
  { id: "member-joined", label: "New member joined", category: "Team", channel: "In-app" },
  { id: "member-deactivated", label: "Member deactivated", category: "Team", channel: "In-app + Email" },
]

function getDefaults(): Record<string, NotifPref & { timing?: string }> {
  const defaults: Record<string, NotifPref & { timing?: string }> = {}
  for (const item of notificationItems) {
    defaults[item.id] = { enabled: true, email: true, inApp: true, timing: item.timing }
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
  return <Switch checked={checked} onChange={onChange} />
}

export default function NotificationsSettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, NotifPref & { timing?: string }>>(getDefaults)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

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

  return (
    <>
      <div className="mb-[32px]">
        <h1 className="text-[20px] font-bold text-folk-text">Notifications</h1>
        <p className="mt-[4px] text-[14px] text-folk-secondary">
          Choose which notifications you want to receive.
        </p>
      </div>

      <div className="w-full">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_140px_80px_40px] items-center border-b border-folk-border-subtle px-[20px] py-[12px]">
          <span className="text-[12px] font-medium text-folk-secondary">Name</span>
          <span className="text-[12px] font-medium text-folk-secondary">Channel</span>
          <span className="text-[12px] font-medium text-folk-secondary">Enabled</span>
          <span />
        </div>

        {/* Table rows */}
        {notificationItems.map((item) => {
          const pref = prefs[item.id] || { enabled: true, email: true, inApp: true }
          return (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_140px_80px_40px] items-center border-b border-[#f5f5f5] px-[20px] py-[10px] transition-colors hover:bg-folk-page"
            >
              <span className={cn("text-[14px] font-medium", pref.enabled ? "text-folk-text" : "text-folk-placeholder")}>
                {item.label}
              </span>
              <span className="text-[13px] text-folk-secondary">{item.channel}</span>
              <Toggle checked={pref.enabled} onChange={() => update(item.id, { enabled: !pref.enabled })} />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)}
                  className="icon-btn flex h-[28px] w-[28px] items-center justify-center text-folk-placeholder hover:text-folk-secondary"
                  tabIndex={0}
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-[16px] w-[16px]" />
                </button>
                {menuOpen === item.id && (
                  <>
                    <div className="fixed inset-0 z-[59]" onClick={() => setMenuOpen(null)} />
                    <div className="absolute right-0 top-full z-[60] mt-[4px] w-[160px] rounded-none border border-folk-border-subtle bg-folk-surface py-[4px] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                      <button
                        type="button"
                        onClick={() => { update(item.id, { enabled: !pref.enabled }); setMenuOpen(null) }}
                        className="flex w-full items-center px-[12px] py-[8px] text-left text-[13px] text-[#555] transition-colors hover:bg-folk-hover"
                        tabIndex={0}
                      >
                        {pref.enabled ? "Disable" : "Enable"}
                      </button>
                      {pref.enabled && item.channel.includes("Email") && (
                        <button
                          type="button"
                          onClick={() => { update(item.id, { email: !pref.email }); setMenuOpen(null) }}
                          className="flex w-full items-center px-[12px] py-[8px] text-left text-[13px] text-[#555] transition-colors hover:bg-folk-hover"
                          tabIndex={0}
                        >
                          {pref.email ? "Turn off email" : "Turn on email"}
                        </button>
                      )}
                      {pref.enabled && (
                        <button
                          type="button"
                          onClick={() => { update(item.id, { inApp: !pref.inApp }); setMenuOpen(null) }}
                          className="flex w-full items-center px-[12px] py-[8px] text-left text-[13px] text-[#555] transition-colors hover:bg-folk-hover"
                          tabIndex={0}
                        >
                          {pref.inApp ? "Turn off in-app" : "Turn on in-app"}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
