"use client"

import type React from "react"
import { useRef, useState } from "react"
import { EntityIcon } from "@/components/entity-icon"
import { EditableField } from "@/components/editable-field"
import { ContactChip } from "@/components/contact-chip"
import { DetailRow } from "@/components/detail-row"
import { DatePicker } from "@/components/date-picker"
import {
  FileImage,
  FileSpreadsheet,
  FileVideo,
  FileText,
  File,
  ChevronDown,
} from "lucide-react"
import type { Client } from "@/lib/types"

export interface ProfileContact {
  id: string
  firstName: string
  email: string
  phone: string
  relationship: string
}

export function ClientIcon({ client, size = "md" }: { client: Client; size?: "sm" | "md" | "lg" | "xl" }) {
  const normalizedSize = size === "md" ? "md" : size === "xl" ? "xl" : size === "lg" ? "lg" : "sm"

  return <EntityIcon text={client.iconText} size={normalizedSize} />
}

export function getDocIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv") || mimeType.includes("excel")) return FileSpreadsheet
  if (mimeType.startsWith("video/")) return FileVideo
  if (mimeType.includes("pdf")) return FileText
  return File
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDate(dateStr: string) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function SidebarDetailRow({ icon: Icon, label, children }: { icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; children: React.ReactNode }) {
  return (
    <DetailRow
      icon={Icon}
      label={label}
      labelWidthClassName="w-[130px]"
      rowClassName="flex items-center py-[6px]"
    >
      {children}
    </DetailRow>
  )
}

export function SidebarEditableField({
  value,
  onChange,
  placeholder,
  type = "text",
  options,
  displayClassName,
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  type?: "text" | "select" | "date"
  options?: string[]
  displayClassName?: string
}) {
  return (
    <EditableField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      options={options}
      size="compact"
      displayClassName={displayClassName}
    />
  )
}

export function SidebarCheckInField({
  period,
  startDate,
  onChangePeriod,
  onChangeStartDate,
}: {
  period: string
  startDate: string
  onChangePeriod: (val: string) => void
  onChangeStartDate: (val: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const MENU_WIDTH = 240
  const legacyPeriodToDays: Record<string, string> = { Weekly: "7", Fortnightly: "14", Monthly: "30", Quarterly: "90" }
  const days = /^\d+$/.test(period) ? period : legacyPeriodToDays[period] || ""

  function handleDaysChange(raw: string) {
    onChangePeriod(raw.replace(/\D/g, ""))
  }

  function openMenu() {
    const trigger = triggerRef.current
    if (!trigger) {
      setOpen(true)
      return
    }
    const rect = trigger.getBoundingClientRect()
    const estHeight = 340
    const gap = 4
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < estHeight && rect.top > spaceBelow
    const style: React.CSSProperties = { left }
    if (openUp) style.bottom = window.innerHeight - rect.top + gap
    else style.top = rect.bottom + gap
    setMenuStyle(style)
    setOpen(true)
  }

  const dateLabel = startDate
    ? new Date(startDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })
    : ""
  const everyLabel = days ? `Every ${days}d` : ""
  const summary = [dateLabel, everyLabel].filter(Boolean).join(" · ")

  return (
    <div className="relative flex-1">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="flex w-full items-center justify-between gap-[8px] rounded-[6px] px-[6px] py-[4px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5]"
        tabIndex={0}
        aria-label="Set check-in cadence and start date"
      >
        <span className={summary ? "text-[#262626]" : "text-[#bbb]"}>{summary || "Set check-in"}</span>
        <ChevronDown className="h-[14px] w-[14px] shrink-0 text-[#999]" strokeWidth={1.5} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[59]" onClick={() => setOpen(false)} />
          <div style={menuStyle} className="fixed z-[60] max-h-[calc(100vh-16px)] w-[240px] overflow-auto rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
            <div className="px-[10px] pb-[8px] pt-[10px]">
              <p className="mb-[6px] px-[2px] text-[10px] font-semibold uppercase tracking-wide text-[#999]">Date</p>
              <DatePicker
                value={startDate}
                onChange={(v) => onChangeStartDate(v)}
                onClose={() => setOpen(false)}
                bare
                hideQuickDates
                selectedClassName="bg-[#2563EB] text-white"
              />
            </div>
            <div className="border-t border-[#f0f0f0] px-[12px] py-[10px]">
              <p className="mb-[6px] text-[10px] font-semibold uppercase tracking-wide text-[#999]">How often</p>
              <div className="flex items-center gap-[8px] text-[13px] font-medium text-[#555]">
                <span>Every</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={days}
                  onChange={(e) => handleDaysChange(e.target.value)}
                  placeholder="30"
                  className="h-[30px] w-[60px] rounded-[6px] border border-[#e0e0e0] bg-[#fafafa] px-[8px] text-center text-[13px] font-medium text-[#262626] outline-none transition-colors hover:border-[#ccc] focus:border-[#a3c4f3]"
                  aria-label="Check-in interval in days"
                />
                <span>days</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function SidebarContactChip({ value, onChange, placeholder, variant = "grey" }: { value: string; onChange: (v: string) => void; placeholder: string; variant?: "grey" | "white" }) {
  return (
    <ContactChip
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      variant={variant}
      size="compact"
      emptyPrefix="+"
    />
  )
}

export function SidebarDiagnosisChip({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <ContactChip
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      variant="white"
      size="compact"
      emptyPrefix="+"
      enableCopy={false}
    />
  )
}

export function SidebarSection({ title, emptyText, actionLabel }: { title: string; emptyText: string; actionLabel?: string }) {
  return (
    <div className="border-t border-[#f0f0f0] px-[24px] py-[16px]">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-[#262626]">{title}</h3>
        {actionLabel && (
          <button className="text-[12px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
            {actionLabel}
          </button>
        )}
      </div>
      <p className="mt-[6px] text-[13px] font-medium text-[#bbb]">{emptyText}</p>
    </div>
  )
}

export function parseTimeInput(val: string): number {
  if (!val.trim()) return 0
  const hMatch = val.match(/(\d+)\s*h/)
  const mMatch = val.match(/(\d+)\s*m/)
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0
  const mins = mMatch ? parseInt(mMatch[1], 10) : 0
  if (hours === 0 && mins === 0) {
    const num = parseInt(val, 10)
    return isNaN(num) ? 0 : num
  }
  return hours * 60 + mins
}

export function getTodayStr() {
  return new Date().toISOString().split("T")[0]
}

export function formatTaskDate(dateStr: string | null): string {
  if (!dateStr) return ""
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + "T00:00:00")
  d.setHours(0, 0, 0, 0)
  const diff = d.getTime() - today.getTime()
  const dayMs = 86400000
  if (diff === 0) return "Today"
  if (diff === dayMs) return "Tomorrow"
  if (diff === -dayMs) return "Yesterday"
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })
}
