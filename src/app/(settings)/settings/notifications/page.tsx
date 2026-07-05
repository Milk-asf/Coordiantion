"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/switch"
import { FixedSelectDropdown, FixedSelectOption } from "@/components/fixed-select-dropdown"
import { SETTINGS_SECTION_CLASS } from "@/components/settings-ui"

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

interface NotificationRowProps {
  item: NotifItem
  pref: NotifPref & { timing?: string }
  isMenuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
  onUpdate: (patch: Partial<NotifPref & { timing?: string }>) => void
}

function NotificationRow({ item, pref, isMenuOpen, onMenuOpenChange, onUpdate }: NotificationRowProps) {
  const menuAnchorRef = useRef<HTMLButtonElement>(null)

  const closeAnd = (patch: Partial<NotifPref & { timing?: string }>) => {
    onUpdate(patch)
    onMenuOpenChange(false)
  }

  return (
    <div className="grid grid-cols-[1fr_140px_80px_40px] items-center border-b border-[#f5f5f5] px-[20px] py-[10px] transition-colors last:border-b-0 hover:bg-folk-page">
      <span className={cn("text-[13px] font-medium", pref.enabled ? "text-folk-text" : "text-folk-placeholder")}>
        {item.label}
      </span>
      <span className="text-[13px] text-folk-secondary">{item.channel}</span>
      <Switch
        checked={pref.enabled}
        onChange={() => onUpdate({ enabled: !pref.enabled })}
        ariaLabel={`${pref.enabled ? "Disable" : "Enable"} ${item.label}`}
      />
      <div>
        <button
          ref={menuAnchorRef}
          type="button"
          onClick={() => onMenuOpenChange(!isMenuOpen)}
          className="icon-btn flex h-[28px] w-[28px] items-center justify-center text-folk-placeholder hover:text-folk-secondary"
          tabIndex={0}
          aria-label="More options"
        >
          <MoreHorizontal className="h-[16px] w-[16px]" />
        </button>
        <FixedSelectDropdown
          isOpen={isMenuOpen}
          anchorRef={menuAnchorRef}
          onClose={() => onMenuOpenChange(false)}
          estimatedHeight={110}
          minWidth={160}
          align="right"
        >
          <FixedSelectOption onClick={() => closeAnd({ enabled: !pref.enabled })}>
            {pref.enabled ? "Disable" : "Enable"}
          </FixedSelectOption>
          {pref.enabled && item.channel.includes("Email") && (
            <FixedSelectOption onClick={() => closeAnd({ email: !pref.email })}>
              {pref.email ? "Turn off email" : "Turn on email"}
            </FixedSelectOption>
          )}
          {pref.enabled && (
            <FixedSelectOption onClick={() => closeAnd({ inApp: !pref.inApp })}>
              {pref.inApp ? "Turn off in-app" : "Turn on in-app"}
            </FixedSelectOption>
          )}
        </FixedSelectDropdown>
      </div>
    </div>
  )
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

      <div className={cn(SETTINGS_SECTION_CLASS, "w-full overflow-hidden")}>
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
            <NotificationRow
              key={item.id}
              item={item}
              pref={pref}
              isMenuOpen={menuOpen === item.id}
              onMenuOpenChange={(open) => setMenuOpen(open ? item.id : null)}
              onUpdate={(patch) => update(item.id, patch)}
            />
          )
        })}
      </div>
    </>
  )
}
