"use client"

import type React from "react"
import { useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { EntityIcon } from "@/components/entity-icon"
import { EditableField } from "@/components/editable-field"
import { ContactChip } from "@/components/contact-chip"
import { MultiChip } from "@/components/multi-chip"
import { FolkSidebarField } from "@/components/folk-sidebar"
import { DatePicker } from "@/components/date-picker"
import {
  FIXED_DROPDOWN_BACKDROP_Z_CLASS,
  FIXED_DROPDOWN_MENU_Z_CLASS,
  getFixedDropdownStyle,
} from "@/lib/dropdown-utils"
import {
  FileImage,
  FileSpreadsheet,
  FileVideo,
  FileText,
  File,
  ChevronDown,
} from "lucide-react"
import { getProfileFieldChipClasses } from "@/lib/chip-colors"
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

export function formatAgeSuffix(dateStr: string) {
  if (!dateStr) return ""
  const dob = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(dob.getTime())) return ""
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1
  if (age < 0) return ""
  return `(${age}yo)`
}

export function getFieldPillClass(fieldKey: string, value: string) {
  return `${getProfileFieldChipClasses(fieldKey, value, "sm")} cursor-pointer transition-colors hover:brightness-[0.97]`
}

export const FIELD_ADDRESS_CLASS =
  "cursor-pointer text-[13px] font-medium text-[#2563EB] underline decoration-[#2563EB]/30 underline-offset-2"

export function SidebarDetailRow({ icon: Icon, label, children }: { icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; children: React.ReactNode }) {
  return (
    <FolkSidebarField label={label} icon={Icon}>
      {children}
    </FolkSidebarField>
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

export function SidebarDateOfBirthField({
  value,
  onChange,
  placeholder = "Select date of birth",
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
}) {
  const ageSuffix = formatAgeSuffix(value)

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[6px]">
      <SidebarEditableField value={value} onChange={onChange} type="date" placeholder={placeholder} />
      {ageSuffix && <span className="text-[13px] font-medium text-folk-secondary">{ageSuffix}</span>}
    </div>
  )
}

export function SidebarAddressField({
  value,
  onChange,
  placeholder = "Enter address",
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
}) {
  return (
    <SidebarEditableField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      displayClassName={value ? FIELD_ADDRESS_CLASS : undefined}
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
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const MENU_WIDTH = 240
  const MENU_HEIGHT = 420
  const legacyPeriodToDays: Record<string, string> = { Weekly: "7", Fortnightly: "14", Monthly: "30", Quarterly: "90" }
  const days = /^\d+$/.test(period) ? period : legacyPeriodToDays[period] || ""

  function handleDaysChange(raw: string) {
    onChangePeriod(raw.replace(/\D/g, ""))
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null)
      return
    }

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const measuredHeight = Math.max(
        menuRef.current?.scrollHeight ?? 0,
        menuRef.current?.offsetHeight ?? 0,
        MENU_HEIGHT
      )
      setMenuStyle(getFixedDropdownStyle(rect, measuredHeight, MENU_WIDTH, "right"))
    }

    updatePosition()
    const frame = requestAnimationFrame(updatePosition)

    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [open, startDate, days])

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
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-[8px] rounded-[6px] px-[6px] py-[4px] text-[13px] font-medium transition-colors hover:bg-folk-hover"
        tabIndex={0}
        aria-label="Set check-in cadence and start date"
      >
        <span className={summary ? "text-folk-text" : "text-folk-placeholder"}>{summary || "Set check-in"}</span>
        <ChevronDown className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
      </button>
      {open &&
        createPortal(
          <>
            <div className={`fixed inset-0 ${FIXED_DROPDOWN_BACKDROP_Z_CLASS}`} onClick={() => setOpen(false)} />
            <div
              ref={menuRef}
              style={
                menuStyle ??
                (triggerRef.current
                  ? getFixedDropdownStyle(
                      triggerRef.current.getBoundingClientRect(),
                      MENU_HEIGHT,
                      MENU_WIDTH,
                      "right"
                    )
                  : undefined)
              }
              className={`fixed ${FIXED_DROPDOWN_MENU_Z_CLASS} w-[240px] overflow-y-auto overscroll-contain rounded-[6px] border border-folk-border bg-folk-surface shadow-[0_4px_16px_rgba(0,0,0,0.1)]`}
            >
              <div className="px-[10px] pb-[8px] pt-[10px]">
                <p className="mb-[6px] px-[2px] text-[10px] font-semibold uppercase tracking-wide text-folk-secondary">Date</p>
                <DatePicker
                  value={startDate}
                  onChange={(v) => onChangeStartDate(v)}
                  onClose={() => setOpen(false)}
                  bare
                  hideQuickDates
                  selectedClassName="bg-[#2563EB] text-white"
                />
              </div>
              <div className="border-t border-folk-border-subtle px-[12px] py-[10px]">
                <p className="mb-[6px] text-[10px] font-semibold uppercase tracking-wide text-folk-secondary">How often</p>
                <div className="flex items-center gap-[8px] text-[13px] font-medium text-[#555]">
                  <span>Every</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={days}
                    onChange={(e) => handleDaysChange(e.target.value)}
                    placeholder="30"
                    className="h-[30px] w-[60px] rounded-[6px] border border-folk-border bg-folk-page px-[8px] text-center text-[13px] font-medium text-folk-text outline-none transition-colors hover:border-[#bababa] focus:border-[#a3c4f3]"
                    aria-label="Check-in interval in days"
                  />
                  <span>days</span>
                </div>
              </div>
            </div>
          </>,
          document.body
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

export function mergeDiagnoses(...values: string[]): string {
  const items = values
    .flatMap((v) => (v || "").split(","))
    .map((item) => item.trim())
    .filter(Boolean)
  const deduped = items.filter(
    (item, idx) => items.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === idx,
  )
  return deduped.join(", ")
}

export function SidebarDiagnosisChip({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <MultiChip value={value} onChange={onChange} placeholder={placeholder} size="compact" />
}

export function SidebarSection({ title, emptyText, actionLabel }: { title: string; emptyText: string; actionLabel?: string }) {
  return (
    <div className="border-t border-folk-border-subtle px-[24px] py-[16px]">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-folk-text">{title}</h3>
        {actionLabel && (
          <button className="text-[12px] font-medium text-folk-secondary transition-colors hover:text-folk-text" tabIndex={0}>
            {actionLabel}
          </button>
        )}
      </div>
      <p className="mt-[6px] text-[13px] font-medium text-folk-placeholder">{emptyText}</p>
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
