"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useStaff } from "@/lib/staff-context"
import { useClients } from "@/lib/hooks/use-clients"
import type { StaffMember, StaffDetails } from "@/lib/types"
import {
  User,
  FileText,
  Mail,
  Phone,
  Smartphone,
  MessageSquare,
  CalendarDays,
  Heart,
  ChevronDown,
  Plus,
  SquarePen,
  CheckSquare,
  ArrowLeft,
  FolderOpen,
  PanelRightOpen,
  PanelRightClose,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  UserPlus,
  Users,
  X,
  Copy,
  Check,
} from "lucide-react"

const tabs = [
  { key: "overview", label: "Overview", icon: FileText },
  { key: "clients", label: "Clients", icon: Users },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "notes", label: "Notes", icon: SquarePen },
  { key: "files", label: "Files", icon: FolderOpen },
]

function StaffIcon({ member, size = "md" }: { member: StaffMember; size?: "sm" | "md" | "lg" | "xl" }) {
  const dims = size === "xl" ? "h-[48px] w-[48px]" : size === "lg" ? "h-[36px] w-[36px]" : size === "md" ? "h-[28px] w-[28px]" : "h-[20px] w-[20px]"
  const textSize = size === "xl" ? "text-[18px]" : size === "lg" ? "text-[15px]" : size === "md" ? "text-[12px]" : "text-[10px]"
  const radius = size === "xl" ? "rounded-lg" : "rounded-[4px]"
  return (
    <div className={`${dims} ${radius} flex items-center justify-center bg-blue-100 ${textSize} font-semibold text-blue-600`}>
      {member.iconText}
    </div>
  )
}

function SidebarDetailRow({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center py-[6px]">
      <div className="flex w-[130px] shrink-0 items-center gap-[8px] text-[13px] font-medium text-[#888]">
        <Icon className="h-[14px] w-[14px] text-[#999]" strokeWidth={1.5} />
        <span>{label}</span>
      </div>
      <div className="min-w-0 flex-1 text-[13px] font-medium text-[#262626]">{children}</div>
    </div>
  )
}

function SidebarEditableField({
  value,
  onChange,
  placeholder,
  type = "text",
  options,
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  type?: "text" | "select" | "date"
  options?: string[]
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => {
    if (!isEditing) return
    if (type === "select") selectRef.current?.focus()
    else inputRef.current?.focus()
  }, [isEditing, type])

  const handleSave = useCallback(() => { setIsEditing(false); onChange(draft) }, [draft, onChange])
  const handleCancel = useCallback(() => { setIsEditing(false); setDraft(value) }, [value])
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") handleCancel()
  }, [handleSave, handleCancel])

  if (isEditing) {
    if (type === "select" && options) {
      return (
        <div className="relative">
          <select
            ref={selectRef}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); onChange(e.target.value); setIsEditing(false) }}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full appearance-none rounded-lg border border-[#a3c4f3] bg-white px-[8px] py-[5px] text-[13px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
          >
            <option value="">—</option>
            {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-[8px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 text-[#999]" strokeWidth={1.5} />
        </div>
      )
    }
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type={type === "date" ? "date" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[#a3c4f3] bg-white px-[8px] py-[5px] pr-[28px] text-[13px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
        />
        {draft && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setDraft(""); onChange(""); setIsEditing(false) }}
            className="absolute right-[8px] top-1/2 -translate-y-1/2 text-[#bbb] transition-colors hover:text-[#888]"
            tabIndex={-1}
            aria-label="Clear field"
          >
            <X className="h-[13px] w-[13px]" strokeWidth={1.5} />
          </button>
        )}
      </div>
    )
  }

  const displayValue = type === "date" && value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : value

  return (
    <span
      onClick={() => setIsEditing(true)}
      className="block cursor-default rounded-lg px-[8px] py-[5px] transition-colors hover:bg-[#f5f5f5]"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") setIsEditing(true) }}
      aria-label={`Click to edit ${placeholder || "field"}`}
    >
      {displayValue || <span className="text-[#bbb]">{placeholder || "—"}</span>}
    </span>
  )
}

function SidebarContactChip({ value, onChange, placeholder, variant = "grey" }: { value: string; onChange: (v: string) => void; placeholder: string; variant?: "grey" | "white" }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [isCopied, setIsCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (isEditing) inputRef.current?.focus() }, [isEditing])

  const handleSave = () => { setIsEditing(false); onChange(draft) }
  const handleCancel = () => { setIsEditing(false); setDraft(value) }
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(value)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 1500)
  }

  const isWhite = variant === "white"
  const chipBg = isWhite ? "bg-transparent" : "bg-[#f5f5f5]"
  const chipHover = isWhite ? "hover:bg-[#f5f5f5]" : "hover:bg-[#efefef]"
  const chipBorder = "border-[#dcdcdc]"
  const copyHoverBg = isWhite ? "hover:bg-[#f0f0f0]" : "hover:bg-[#e5e5e5]"

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel() }}
        placeholder={placeholder}
        className="rounded border border-[#a3c4f3] bg-white px-[8px] py-[3px] text-[12px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
      />
    )
  }

  if (!value) {
    return (
      <span
        onClick={() => setIsEditing(true)}
        className="inline-flex cursor-default items-center rounded border border-dashed border-[#d0d0d0] bg-transparent px-[8px] py-[2px] text-[12px] font-medium text-[#bbb] transition-colors hover:border-[#999] hover:text-[#999]"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") setIsEditing(true) }}
        aria-label={`Click to add ${placeholder}`}
      >
        + {placeholder}
      </span>
    )
  }

  return (
    <span className={`group/chip inline-flex cursor-default items-center gap-[4px] rounded border ${chipBorder} ${chipBg} py-[2px] pl-[8px] pr-[4px] text-[12px] font-medium text-[#262626] transition-colors ${chipHover}`}>
      <span
        onClick={() => setIsEditing(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") setIsEditing(true) }}
        aria-label={`Click to edit ${placeholder}`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className={`shrink-0 rounded p-[2px] transition-all ${isCopied ? "text-green-600" : `text-[#bbb] opacity-0 group-hover/chip:opacity-100 ${copyHoverBg} hover:text-[#666]`}`}
        tabIndex={0}
        aria-label={`Copy ${placeholder}`}
      >
        {isCopied ? <Check className="h-[11px] w-[11px]" strokeWidth={2} /> : <Copy className="h-[11px] w-[11px]" strokeWidth={1.5} />}
      </button>
    </span>
  )
}

function SidebarSection({ title, emptyText, actionLabel }: { title: string; emptyText: string; actionLabel?: string }) {
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

interface ActivityItem {
  id: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  content: React.ReactNode
  time: string
}

function getActivities(staffName: string): ActivityItem[] {
  return [
    { id: "1", icon: UserPlus, content: <><strong>{staffName}</strong> was assigned a new client</>, time: "2d ago" },
    { id: "2", icon: FileText, content: <><strong>{staffName}</strong> submitted a progress note</>, time: "3d ago" },
    { id: "3", icon: CheckSquare, content: <><strong>{staffName}</strong> completed 3 tasks</>, time: "5d ago" },
  ]
}

export default function StaffProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(404)
  const { staff, isLoading, updateStaff } = useStaff()
  const { clients } = useClients()
  const [visibleTabCount, setVisibleTabCount] = useState(tabs.length)
  const [isTabOverflowOpen, setIsTabOverflowOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const tabWidthsRef = useRef<number[]>([])
  const overflowBtnRef = useRef<HTMLButtonElement>(null)
  const createBtnRef = useRef<HTMLButtonElement>(null)
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)

  const handleMouseDown = useCallback(() => {
    isResizing.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const newWidth = window.innerWidth - e.clientX
      setSidebarWidth(Math.max(280, Math.min(600, newWidth)))
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [])

  useEffect(() => {
    const measureTabWidths = () => {
      const measurer = headerRef.current?.querySelector("[data-tab-measurer]")
      if (!measurer) return
      const btns = measurer.querySelectorAll("[data-tab-measure]")
      tabWidthsRef.current = Array.from(btns).map((el) => (el as HTMLElement).offsetWidth + 2)
    }
    measureTabWidths()
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (!headerRef.current) return
      const headerWidth = headerRef.current.offsetWidth
      const padding = 48
      const availableWidth = headerWidth - padding
      const overflowBtnWidth = 36
      const widths = tabWidthsRef.current

      if (widths.length === 0) { setVisibleTabCount(tabs.length); return }

      const totalAllTabs = widths.reduce((sum, w) => sum + w, 0)
      if (totalAllTabs <= availableWidth) {
        setVisibleTabCount(tabs.length)
      } else {
        let total = 0
        let count = 0
        for (let i = 0; i < widths.length; i++) {
          if (total + widths[i] + overflowBtnWidth > availableWidth && count > 0) break
          total += widths[i]
          count++
        }
        setVisibleTabCount(Math.max(1, count))
      }

      if (window.innerWidth < 900 && isSidebarVisible) setIsSidebarVisible(false)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [isSidebarVisible, sidebarWidth])

  const id = params.id as string
  const member = staff.find((s) => s.id === id) || null

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] font-medium text-[#888]">Loading...</p>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-[13px] font-medium text-[#888]">Staff member not found</p>
          <button onClick={() => router.push("/staff")} className="mt-[8px] text-[13px] font-medium text-[#555] underline transition-colors hover:text-[#262626]" tabIndex={0}>
            Back to staff
          </button>
        </div>
      </div>
    )
  }

  const d = member.details
  const activities = getActivities(member.name)
  const assignedClients = clients.filter((c) => c.owner === member.name)

  const handleUpdateField = (field: keyof StaffDetails, value: string) => {
    updateStaff(member.id, { details: { ...member.details, [field]: value } })
  }

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] bg-white px-[16px]">
          <div className="flex items-center gap-[10px]">
            <button
              onClick={() => router.push("/staff")}
              className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
              tabIndex={0}
              aria-label="Back to staff"
            >
              <ArrowLeft className="h-[16px] w-[16px]" strokeWidth={1.75} />
            </button>
            <StaffIcon member={member} size="md" />
            <span className="max-w-[240px] truncate text-[15px] font-semibold text-[#262626]">{member.name}</span>
            <span className={`rounded-full px-[8px] py-[1px] text-[11px] font-medium ${member.status === "active" ? "bg-green-50 text-green-600" : member.status === "invited" ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"}`}>
              {member.status}
            </span>
          </div>
          <div className="flex items-center gap-[6px]">
            <button
              ref={createBtnRef}
              onClick={() => setIsCreateOpen(!isCreateOpen)}
              className="flex items-center gap-[5px] rounded border border-[#dcdcdc] bg-white px-[10px] py-[5px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>Create</span>
            </button>
            {isCreateOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsCreateOpen(false)} />
                <div
                  className="fixed z-50 min-w-[180px] overflow-hidden rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                  style={(() => {
                    const rect = createBtnRef.current?.getBoundingClientRect()
                    if (!rect) return {}
                    return { top: rect.bottom + 4, right: window.innerWidth - rect.right }
                  })()}
                >
                  <button onClick={() => setIsCreateOpen(false)} className="flex w-full items-center gap-[10px] px-[14px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]" tabIndex={0}>
                    <FileText className="h-[16px] w-[16px] text-[#888]" strokeWidth={1.5} />
                    <span>Note</span>
                  </button>
                  <button onClick={() => setIsCreateOpen(false)} className="flex w-full items-center gap-[10px] px-[14px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]" tabIndex={0}>
                    <CheckSquare className="h-[16px] w-[16px] text-[#888]" strokeWidth={1.5} />
                    <span>Task</span>
                  </button>
                </div>
              </>
            )}
            {!isSidebarVisible && (
              <button
                onClick={() => setIsSidebarVisible(true)}
                className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                tabIndex={0}
                aria-label="Show staff details"
              >
                <PanelRightOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div ref={headerRef} className="flex h-[48px] shrink-0 items-center overflow-hidden border-b border-[#f0f0f0] bg-white px-[24px]">
          <div data-tab-measurer className="pointer-events-none invisible absolute flex items-center gap-[2px]" aria-hidden="true">
            {tabs.map((tab) => {
              const TabIcon = tab.icon
              return (
                <div key={tab.key} data-tab-measure className="flex shrink-0 items-center gap-[5px] px-[10px] py-[5px] text-[13px] font-medium">
                  <TabIcon className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>{tab.label}</span>
                </div>
              )
            })}
          </div>

          <div ref={tabsContainerRef} className="flex flex-1 items-center gap-[2px] overflow-hidden">
            {tabs.slice(0, visibleTabCount).map((tab) => {
              const TabIcon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex shrink-0 items-center gap-[5px] rounded px-[10px] py-[5px] text-[13px] font-medium transition-colors ${isActive ? "bg-[#f0f0f0] text-[#262626]" : "text-[#888] hover:bg-[#f5f5f5] hover:text-[#262626]"}`}
                  tabIndex={0}
                >
                  <TabIcon className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
            {visibleTabCount < tabs.length && (
              <>
                <button
                  ref={overflowBtnRef}
                  onClick={() => setIsTabOverflowOpen(!isTabOverflowOpen)}
                  className={`flex shrink-0 items-center gap-[3px] rounded px-[8px] py-[5px] text-[13px] font-medium transition-colors ${isTabOverflowOpen ? "bg-[#f0f0f0] text-[#262626]" : "text-[#888] hover:bg-[#f5f5f5] hover:text-[#262626]"}`}
                  tabIndex={0}
                  aria-label="More tabs"
                >
                  <span>+{tabs.length - visibleTabCount}</span>
                </button>
                {isTabOverflowOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsTabOverflowOpen(false)} />
                    <div
                      className="fixed z-50 min-w-[180px] overflow-hidden rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                      style={(() => {
                        const rect = overflowBtnRef.current?.getBoundingClientRect()
                        if (!rect) return {}
                        return { top: rect.bottom + 4, left: rect.left }
                      })()}
                    >
                      {tabs.slice(visibleTabCount).map((tab) => {
                        const TabIcon = tab.icon
                        const isActive = activeTab === tab.key
                        return (
                          <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setIsTabOverflowOpen(false) }}
                            className={`flex w-full items-center gap-[10px] px-[14px] py-[8px] text-[13px] font-medium transition-colors ${isActive ? "bg-[#f0f0f0] text-[#262626]" : "text-[#262626] hover:bg-[#f5f5f5]"}`}
                            tabIndex={0}
                          >
                            <TabIcon className="h-[16px] w-[16px] text-[#888]" strokeWidth={1.5} />
                            <span>{tab.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "clients" ? (
            <div className="relative flex h-full flex-col">
              <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-[#dcdcdc] px-[16px]">
                <span className="text-[12px] font-medium text-[#999]">{assignedClients.length} {assignedClients.length === 1 ? "client" : "clients"} assigned</span>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-left">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Client name</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">NDIS Number</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Primary Diagnosis</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedClients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="bg-white px-[20px] py-[32px] text-center text-[13px] font-medium text-[#bbb]">
                          No clients assigned
                        </td>
                      </tr>
                    ) : assignedClients.map((client) => {
                      const initials = client.iconText
                      return (
                        <tr
                          key={client.id}
                          className="cursor-pointer transition-colors hover:bg-[#f5f5f5]"
                          onClick={() => router.push(`/clients/${client.id}`)}
                        >
                          <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">
                            <div className="flex items-center gap-[8px]">
                              <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#d4d4d4] text-[9px] font-semibold text-[#555]">
                                {initials}
                              </div>
                              {client.displayName}
                            </div>
                          </td>
                          <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">
                            {client.participant.ndisNumber || <span className="text-[#bbb]">—</span>}
                          </td>
                          <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">
                            {client.participant.primaryDiagnosis || <span className="text-[#bbb]">—</span>}
                          </td>
                          <td className="h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">
                            {client.participant.email || <span className="text-[#bbb]">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
                <span className="text-[12px] font-medium text-[#999]">{assignedClients.length} {assignedClients.length === 1 ? "client" : "clients"}</span>
              </div>
            </div>
          ) : activeTab !== "overview" ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[13px] font-medium text-[#bbb]">No content yet</p>
            </div>
          ) : (
          <div className="mx-auto max-w-[720px] px-[40px] py-[32px]">
            <div className="flex items-center gap-[14px] pb-[28px]">
              <StaffIcon member={member} size="xl" />
              <div>
                <h1 className="text-[24px] font-semibold text-[#262626]">{member.name}</h1>
                <p className="text-[13px] font-medium text-[#888]">{d.role || "No role assigned"}</p>
              </div>
            </div>

            {/* Assigned clients */}
            <div className="mb-[24px]">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-[#888]">Assigned clients</h3>
                <button onClick={() => setActiveTab("clients")} className="text-[12px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>See all</button>
              </div>
              {assignedClients.length === 0 ? (
                <p className="mt-[8px] text-[13px] font-medium text-[#bbb]">No clients assigned</p>
              ) : (
                <div className="mt-[8px] flex flex-col gap-[4px]">
                  {assignedClients.slice(0, 5).map((client) => (
                    <div
                      key={client.id}
                      className="flex cursor-pointer items-center gap-[8px] rounded-md px-[8px] py-[6px] transition-colors hover:bg-[#f5f5f5]"
                      onClick={() => router.push(`/clients/${client.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") router.push(`/clients/${client.id}`) }}
                    >
                      <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[4px] bg-[#d4d4d4] text-[9px] font-semibold text-[#555]">
                        {client.iconText}
                      </div>
                      <span className="text-[13px] font-medium text-[#262626]">{client.displayName}</span>
                      {client.participant.ndisNumber && (
                        <span className="text-[12px] text-[#bbb]">· {client.participant.ndisNumber}</span>
                      )}
                    </div>
                  ))}
                  {assignedClients.length > 5 && (
                    <button onClick={() => setActiveTab("clients")} className="mt-[2px] text-left text-[12px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
                      +{assignedClients.length - 5} more
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Activity */}
            <div>
              <h3 className="mb-[12px] text-[13px] font-medium text-[#888]">Activity</h3>
              <div className="relative">
                {activities.map((activity, idx) => {
                  const isLast = idx === activities.length - 1
                  const IconComp = activity.icon
                  return (
                    <div key={activity.id} className="relative flex gap-[12px]">
                      <div className="relative flex flex-col items-center">
                        <div className="relative z-10 flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#fafafa]">
                          <IconComp className="h-[16px] w-[16px] text-[#999]" strokeWidth={1.5} />
                        </div>
                        {!isLast && <div className="w-[1px] flex-1 bg-[#e8e8e8]" />}
                      </div>
                      <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-[16px]"}`}>
                        <p className="text-[13px] font-medium leading-[20px] text-[#555]">
                          {activity.content}
                          <span className="ml-[6px] text-[#bbb]">·</span>
                          <span className="ml-[6px] text-[12px] text-[#bbb]">{activity.time}</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      {isSidebarVisible ? (
        <>
          <div
            onMouseDown={handleMouseDown}
            className="w-[4px] shrink-0 cursor-col-resize border-l border-[#f0f0f0] transition-colors hover:border-[#aaa] hover:bg-[#f0f0f0]"
          />
          <div className="shrink-0 overflow-y-auto bg-white" style={{ width: sidebarWidth }}>
          <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
            <h2 className="text-[13px] font-semibold text-[#262626]">Staff details</h2>
            <button
              onClick={() => setIsSidebarVisible(false)}
              className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
              tabIndex={0}
              aria-label="Hide sidebar"
            >
              <PanelRightClose className="h-[14px] w-[14px]" strokeWidth={1.5} />
            </button>
          </div>

          <div className="border-b border-[#f0f0f0] px-[24px] pb-[12px]">
            <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Personal Information</h3>
            <SidebarDetailRow icon={User} label="First Name">
              <SidebarEditableField value={d.firstName} onChange={(v) => handleUpdateField("firstName", v)} placeholder="First name" />
            </SidebarDetailRow>
            <SidebarDetailRow icon={User} label="Last Name">
              <SidebarEditableField value={d.lastName} onChange={(v) => handleUpdateField("lastName", v)} placeholder="Last name" />
            </SidebarDetailRow>
            <SidebarDetailRow icon={Heart} label="Preferred">
              <SidebarEditableField value={d.preferredName} onChange={(v) => handleUpdateField("preferredName", v)} placeholder="Preferred name" />
            </SidebarDetailRow>
            <SidebarDetailRow icon={CalendarDays} label="Date of Birth">
              <SidebarEditableField value={d.dateOfBirth} onChange={(v) => handleUpdateField("dateOfBirth", v)} type="date" placeholder="Date of birth" />
            </SidebarDetailRow>

            {!isSidebarExpanded && (
              <button
                onClick={() => setIsSidebarExpanded(true)}
                className="mt-[6px] flex items-center gap-[4px] text-[13px] font-medium text-[#888] transition-colors hover:text-[#262626]"
                tabIndex={0}
              >
                <ChevronDown className="h-[12px] w-[12px]" strokeWidth={1.5} />
                <span>See more</span>
              </button>
            )}

            {isSidebarExpanded && (
              <>
                <SidebarDetailRow icon={User} label="Gender">
                  <SidebarEditableField value={d.gender} onChange={(v) => handleUpdateField("gender", v)} type="select" options={["Male", "Female", "Non-binary", "Other", "Prefer not to say"]} />
                </SidebarDetailRow>
                <SidebarDetailRow icon={MessageSquare} label="Pronouns">
                  <SidebarEditableField value={d.pronouns} onChange={(v) => handleUpdateField("pronouns", v)} type="select" options={["He/Him", "She/Her", "They/Them", "Other"]} />
                </SidebarDetailRow>

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Contact Information</h3>
                <SidebarDetailRow icon={Mail} label="Email">
                  <SidebarContactChip value={d.email} onChange={(v) => handleUpdateField("email", v)} placeholder="Email address" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={Smartphone} label="Mobile">
                  <SidebarContactChip value={d.mobile} onChange={(v) => handleUpdateField("mobile", v)} placeholder="Mobile number" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={Phone} label="Phone">
                  <SidebarContactChip value={d.phone} onChange={(v) => handleUpdateField("phone", v)} placeholder="Phone number" />
                </SidebarDetailRow>

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Employment</h3>
                <SidebarDetailRow icon={Briefcase} label="Role">
                  <SidebarEditableField value={d.role} onChange={(v) => handleUpdateField("role", v)} placeholder="Job role" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={Briefcase} label="Department">
                  <SidebarEditableField value={d.department} onChange={(v) => handleUpdateField("department", v)} placeholder="Department" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={Briefcase} label="Type">
                  <SidebarEditableField value={d.employmentType} onChange={(v) => handleUpdateField("employmentType", v)} type="select" options={["Full-time", "Part-time", "Casual", "Contract"]} />
                </SidebarDetailRow>
                <SidebarDetailRow icon={CalendarDays} label="Start Date">
                  <SidebarEditableField value={d.startDate} onChange={(v) => handleUpdateField("startDate", v)} type="date" placeholder="Start date" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={CalendarDays} label="End Date">
                  <SidebarEditableField value={d.endDate} onChange={(v) => handleUpdateField("endDate", v)} type="date" placeholder="End date" />
                </SidebarDetailRow>

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Qualifications</h3>
                <SidebarDetailRow icon={GraduationCap} label="Qualifications">
                  <SidebarEditableField value={d.qualifications} onChange={(v) => handleUpdateField("qualifications", v)} placeholder="Qualifications" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={ShieldCheck} label="Certifications">
                  <SidebarEditableField value={d.certifications} onChange={(v) => handleUpdateField("certifications", v)} placeholder="Certifications" />
                </SidebarDetailRow>

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Emergency Contact</h3>
                <SidebarDetailRow icon={User} label="Name">
                  <SidebarEditableField value={d.emergencyContactName} onChange={(v) => handleUpdateField("emergencyContactName", v)} placeholder="Emergency contact" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={Phone} label="Phone">
                  <SidebarContactChip value={d.emergencyContactPhone} onChange={(v) => handleUpdateField("emergencyContactPhone", v)} placeholder="Phone number" />
                </SidebarDetailRow>

                <button
                  onClick={() => setIsSidebarExpanded(false)}
                  className="mt-[6px] flex items-center gap-[4px] text-[13px] font-medium text-[#888] transition-colors hover:text-[#262626]"
                  tabIndex={0}
                >
                  <ChevronDown className="h-[12px] w-[12px] rotate-180" strokeWidth={1.5} />
                  <span>See less</span>
                </button>
              </>
            )}
          </div>

          <SidebarSection title="Tasks" emptyText="No tasks" actionLabel="See all" />
          <SidebarSection title="Notes" emptyText="No notes" actionLabel="See all" />
          </div>
        </>
      ) : null}
    </div>
  )
}
