"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useContacts } from "@/lib/hooks/use-contacts"
import { useClients } from "@/lib/hooks/use-clients"
import { relationshipConfig } from "@/lib/types"
import type { Client, ParticipantDetails } from "@/lib/types"
import {
  UserRound,
  FileText,
  User,
  Mail,
  Phone,
  Smartphone,
  MessageSquare,
  PenLine,
  Hash,
  CalendarDays,
  Heart,
  Languages,
  Stethoscope,
  ChevronDown,
  Plus,
  SquarePen,
  CheckSquare,
  UserPlus,
  Globe,
  Users,
  ArrowLeft,
  FolderOpen,
  PanelRightOpen,
  PanelRightClose,
  ListFilter,
  X,
  Copy,
  Check,
} from "lucide-react"

interface ProfileContact {
  id: string
  firstName: string
  email: string
  phone: string
  relationship: string
}


const tabs = [
  { key: "overview", label: "Overview", icon: FileText },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "notes", label: "Notes", icon: SquarePen },
  { key: "files", label: "Files", icon: FolderOpen },
]

interface ActivityItem {
  id: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  content: React.ReactNode
  time: string
}

function getActivities(_clientName?: string): ActivityItem[] {
  return [
    { id: "1", icon: FileText, content: <><strong>Lightfield</strong> set About their business</>, time: "7m ago" },
    { id: "2", icon: UserPlus, content: <><strong>Lightfield</strong> set Name for the contact <strong>Sam Lee</strong> to Sam Lee</>, time: "7m ago" },
    { id: "3", icon: FileText, content: <><strong>Lightfield</strong> updated 9 fields</>, time: "7m ago" },
    { id: "4", icon: UserPlus, content: <><strong>Lightfield</strong> created the contact <strong>Sam Lee</strong></>, time: "7m ago" },
  ]
}

function ClientIcon({ client, size = "md" }: { client: Client; size?: "sm" | "md" | "lg" | "xl" }) {
  const dims = size === "xl" ? "h-[48px] w-[48px]" : size === "lg" ? "h-[36px] w-[36px]" : size === "md" ? "h-[28px] w-[28px]" : "h-[20px] w-[20px]"
  const textSize = size === "xl" ? "text-[18px]" : size === "lg" ? "text-[15px]" : size === "md" ? "text-[12px]" : "text-[10px]"
  const radius = size === "xl" ? "rounded-lg" : "rounded-[4px]"
  return (
    <div className={`${dims} ${radius} flex items-center justify-center bg-[#d4d4d4] ${textSize} font-semibold text-[#555]`}>
      {client.iconText}
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
    navigator.clipboard.writeText(value).catch(() => {})
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 1500)
  }

  const isWhite = variant === "white"
  const chipBg = isWhite ? "bg-transparent" : "bg-[#f5f5f5]"
  const chipHover = isWhite ? "hover:bg-[#f5f5f5]" : "hover:bg-[#efefef]"
  const chipBorder = isWhite ? "border-[#dcdcdc]" : "border-[#dcdcdc]"
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

function SidebarDiagnosisChip({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (isEditing) inputRef.current?.focus() }, [isEditing])

  const handleSave = () => { setIsEditing(false); onChange(draft) }
  const handleCancel = () => { setIsEditing(false); setDraft(value) }

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
    <span
      onClick={() => setIsEditing(true)}
      className="inline-flex cursor-default items-center rounded border border-[#dcdcdc] bg-transparent px-[8px] py-[2px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") setIsEditing(true) }}
      aria-label={`Click to edit ${placeholder}`}
    >
      {value}
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

export default function ParticipantProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(404)
  const { clients, isLoading, updateParticipantField } = useClients()
  const { addContact, getContactsForClient } = useContacts()
  const [isAddContactOpen, setIsAddContactOpen] = useState(false)
  const [newContact, setNewContact] = useState({ firstName: "", email: "", phone: "", relationship: "" })
  const [isRelationshipOpen, setIsRelationshipOpen] = useState(false)
  const [visibleTabCount, setVisibleTabCount] = useState(tabs.length)
  const [isTabOverflowOpen, setIsTabOverflowOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const tabWidthsRef = useRef<number[]>([])
  const overflowBtnRef = useRef<HTMLButtonElement>(null)
  const createBtnRef = useRef<HTMLButtonElement>(null)
  const relationshipRef = useRef<HTMLButtonElement>(null)
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

      if (widths.length === 0) {
        setVisibleTabCount(tabs.length)
        return
      }

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
  const client = clients.find((c) => c.id === id) || null

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] font-medium text-[#888]">Loading...</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-[13px] font-medium text-[#888]">Participant not found</p>
          <button onClick={() => router.push("/clients")} className="mt-[8px] text-[13px] font-medium text-[#555] underline transition-colors hover:text-[#262626]" tabIndex={0}>
            Back to clients
          </button>
        </div>
      </div>
    )
  }

  const p = client.participant
  const activities = getActivities(client.name)

  const handleUpdateField = (field: keyof ParticipantDetails, value: string) => {
    updateParticipantField(client.id, field, value)
  }

  const clientContacts = getContactsForClient(client.name)
  const allContacts: ProfileContact[] = [
    { id: "owner", firstName: client.owner, email: p.email, phone: p.phone || p.mobile, relationship: "support-coordinator" },
    ...clientContacts.map((c) => ({ id: c.id, firstName: c.name, email: c.email, phone: c.phone, relationship: c.relationship })),
  ]

  const handleCreateContact = async () => {
    if (!newContact.firstName) return
    await addContact({ name: newContact.firstName, clientId: client.id, clientName: client.name, relationship: newContact.relationship, email: newContact.email, phone: newContact.phone })
    setNewContact({ firstName: "", email: "", phone: "", relationship: "" })
    setIsAddContactOpen(false)
    setIsRelationshipOpen(false)
  }

  return (
    <div className="flex h-full">
      {/* Left: header + content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar: back, name, create, sidebar toggle */}
        <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] bg-white px-[16px]">
          <div className="flex items-center gap-[10px]">
            <button
              onClick={() => router.push("/clients")}
              className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
              tabIndex={0}
              aria-label="Back to clients"
            >
              <ArrowLeft className="h-[16px] w-[16px]" strokeWidth={1.75} />
            </button>
            <ClientIcon client={client} size="md" />
            <span className="max-w-[240px] truncate text-[15px] font-semibold text-[#262626]">{client.displayName}</span>
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
                  <button
                    onClick={() => { setIsCreateOpen(false) }}
                    className="flex w-full items-center gap-[10px] px-[14px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                    tabIndex={0}
                  >
                    <FileText className="h-[16px] w-[16px] text-[#888]" strokeWidth={1.5} />
                    <span>Note</span>
                  </button>
                  <button
                    onClick={() => { setIsCreateOpen(false) }}
                    className="flex w-full items-center gap-[10px] px-[14px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                    tabIndex={0}
                  >
                    <CheckSquare className="h-[16px] w-[16px] text-[#888]" strokeWidth={1.5} />
                    <span>Task</span>
                  </button>
                  <div className="my-[4px] border-t border-[#f0f0f0]" />
                  <button
                    onClick={() => { setIsCreateOpen(false); setIsAddContactOpen(true) }}
                    className="flex w-full items-center gap-[10px] px-[14px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                    tabIndex={0}
                  >
                    <UserRound className="h-[16px] w-[16px] text-[#888]" strokeWidth={1.5} />
                    <span>Contact</span>
                  </button>
                </div>
              </>
            )}
            {!isSidebarVisible && (
              <button
                onClick={() => setIsSidebarVisible(true)}
                className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                tabIndex={0}
                aria-label="Show account details"
              >
                <PanelRightOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs bar */}
        <div ref={headerRef} className="flex h-[48px] shrink-0 items-center overflow-hidden border-b border-[#f0f0f0] bg-white px-[24px]">
          {/* Hidden measurer for tab widths */}
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
          {activeTab === "contacts" ? (
            <div className="relative flex h-full flex-col">
              {/* Toolbar */}
              <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-[#dcdcdc] px-[16px]">
                <button
                  className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>Filter</span>
                </button>
                <button
                  onClick={() => setIsAddContactOpen(true)}
                  className="flex items-center gap-[5px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>Add contact</span>
                </button>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-left">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Contact name</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Relationship</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Email</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Phone number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allContacts.map((contact) => {
                      const rel = relationshipConfig[contact.relationship]
                      const fullName = contact.firstName
                      const initials = fullName.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase()
                      return (
                        <tr key={contact.id} className="transition-colors hover:bg-[#f5f5f5]">
                          <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">
                            <div className="flex items-center gap-[8px]">
                              <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#d4d4d4] text-[9px] font-semibold text-[#555]">
                                {initials}
                              </div>
                              {fullName}
                            </div>
                          </td>
                          <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">
                            {rel ? (
                              <span className="inline-flex h-[28px] items-center whitespace-nowrap rounded border border-[#dcdcdc] px-[8px] text-[13px] font-medium text-[#262626]">{rel.label}</span>
                            ) : (
                              <span className="text-[#bbb]">—</span>
                            )}
                          </td>
                          <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{contact.email || <span className="text-[#bbb]">—</span>}</td>
                          <td className="h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{contact.phone || <span className="text-[#bbb]">—</span>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
                <span className="text-[12px] font-medium text-[#999]">{allContacts.length} {allContacts.length === 1 ? "contact" : "contacts"}</span>
              </div>

              {/* Create contact modal */}
              {isAddContactOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/20" onClick={() => { setIsAddContactOpen(false); setIsRelationshipOpen(false); setNewContact({ firstName: "", email: "", phone: "", relationship: "" }) }} />
                  <div className="relative z-10 w-[440px] rounded-lg bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                    {/* Modal header */}
                    <div className="flex items-center justify-between px-[24px] pt-[20px]">
                      <div className="flex items-center gap-[8px]">
                        <UserPlus className="h-[16px] w-[16px] text-[#555]" strokeWidth={1.5} />
                        <h2 className="text-[15px] font-semibold text-[#262626]">Create contact</h2>
                      </div>
                      <button
                        onClick={() => { setIsAddContactOpen(false); setIsRelationshipOpen(false); setNewContact({ firstName: "", email: "", phone: "", relationship: "" }) }}
                        className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                        tabIndex={0}
                        aria-label="Close"
                      >
                        <X className="h-[16px] w-[16px]" strokeWidth={1.5} />
                      </button>
                    </div>

                    {/* Modal body */}
                    <div className="px-[24px] pb-[20px] pt-[16px]">
                      {/* Account */}
                      <div className="mb-[14px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Account</label>
                        <div className="flex h-[36px] items-center rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px]">
                          <div className="flex items-center gap-[6px]">
                            <ClientIcon client={client} size="sm" />
                            <span className="text-[13px] font-medium text-[#262626]">{client.displayName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Name */}
                      <div className="mb-[14px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Name *</label>
                        <input
                          type="text"
                          placeholder="Full name"
                          value={newContact.firstName}
                          onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                          className="h-[36px] w-full rounded-md border border-[#e0e0e0] px-[10px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3]"
                        />
                      </div>

                      {/* Email */}
                      <div className="mb-[14px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Email</label>
                        <input
                          type="email"
                          placeholder="name@company.com"
                          value={newContact.email}
                          onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                          className="h-[36px] w-full rounded-md border border-[#e0e0e0] px-[10px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3]"
                        />
                      </div>

                      {/* Phone */}
                      <div className="mb-[14px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Phone</label>
                        <input
                          type="tel"
                          placeholder="Phone number"
                          value={newContact.phone}
                          onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                          className="h-[36px] w-full rounded-md border border-[#e0e0e0] px-[10px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3]"
                        />
                      </div>

                      {/* Relationship */}
                      <div className="mb-[20px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Relationship</label>
                        <button
                          ref={relationshipRef}
                          type="button"
                          onClick={() => setIsRelationshipOpen(!isRelationshipOpen)}
                          className="flex h-[36px] w-full items-center justify-between rounded-md border border-[#e0e0e0] bg-white px-[10px] text-[13px] font-medium outline-none transition-colors focus:border-[#a3c4f3]"
                          tabIndex={0}
                        >
                          {newContact.relationship ? (
                            (() => {
                              const rel = relationshipConfig[newContact.relationship]
                              return <span className="inline-flex h-[28px] items-center whitespace-nowrap rounded border border-[#dcdcdc] px-[8px] text-[13px] font-medium text-[#262626]">{rel.label}</span>
                            })()
                          ) : (
                            <span className="text-[#bbb]">Select relationship</span>
                          )}
                          <ChevronDown className={`h-[14px] w-[14px] text-[#888] transition-transform ${isRelationshipOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                        </button>
                      </div>

                      {/* Create button */}
                      <div className="flex justify-end">
                        <button
                          onClick={handleCreateContact}
                          className="rounded-md bg-[#262626] px-[16px] py-[7px] text-[13px] font-medium text-white transition-colors hover:bg-[#333]"
                          tabIndex={0}
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  </div>
                  {isRelationshipOpen && relationshipRef.current && (() => {
                    const rect = relationshipRef.current.getBoundingClientRect()
                    return (
                      <div
                        className="fixed z-[60] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                        style={{ top: rect.bottom + 4, left: rect.left, width: rect.width, maxHeight: Math.min(240, window.innerHeight - rect.bottom - 20) }}
                      >
                        {Object.entries(relationshipConfig).map(([key, config]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setNewContact({ ...newContact, relationship: key })
                              setIsRelationshipOpen(false)
                            }}
                            className={`flex w-full items-center gap-[10px] px-[12px] py-[10px] text-left transition-colors hover:bg-[#f5f5f5] ${newContact.relationship === key ? "bg-[#f5f5f5]" : ""}`}
                            tabIndex={0}
                          >
                            <span className="inline-flex h-[28px] items-center whitespace-nowrap rounded border border-[#dcdcdc] px-[8px] text-[13px] font-medium text-[#262626]">{config.label}</span>
                          </button>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          ) : activeTab !== "overview" ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[13px] font-medium text-[#bbb]">No content yet</p>
            </div>
          ) : (
          <div className="mx-auto max-w-[720px] px-[40px] py-[32px]">
            {/* Participant name header */}
            <div className="flex items-center gap-[14px] pb-[28px]">
              <ClientIcon client={client} size="xl" />
              <h1 className="text-[24px] font-semibold text-[#262626]">{client.displayName}</h1>
            </div>

            {/* Account summary */}
            <div className="mb-[24px]">
              <h3 className="mb-[8px] text-[13px] font-medium text-[#888]">Account summary</h3>
              <p className="text-[13px] font-medium leading-[22px] text-[#262626]">{client.summary}</p>
            </div>

            {/* About their business */}
            <div className="mb-[24px]">
              <h3 className="mb-[8px] text-[13px] font-medium text-[#888]">About their business</h3>
              <p className="text-[13px] font-medium leading-[22px] text-[#262626]">{client.about}</p>
            </div>

            {/* Upcoming meetings */}
            <div className="mb-[24px]">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-[#888]">Upcoming meetings</h3>
                <button className="text-[12px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>See all</button>
              </div>
              <p className="mt-[8px] text-[13px] font-medium text-[#bbb]">No upcoming meetings</p>
            </div>

            {/* Open tasks */}
            <div className="mb-[24px]">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-[#888]">Open tasks</h3>
                <button className="text-[12px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>See all</button>
              </div>
              <p className="mt-[8px] text-[13px] font-medium text-[#bbb]">No open tasks</p>
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
            <h2 className="text-[13px] font-semibold text-[#262626]">Account details</h2>
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
              <SidebarEditableField value={p.firstName} onChange={(v) => handleUpdateField("firstName", v)} placeholder="First name" />
            </SidebarDetailRow>
            <SidebarDetailRow icon={User} label="Middle Name">
              <SidebarEditableField value={p.middleName} onChange={(v) => handleUpdateField("middleName", v)} placeholder="Middle name" />
            </SidebarDetailRow>
            <SidebarDetailRow icon={User} label="Last Name">
              <SidebarEditableField value={p.lastName} onChange={(v) => handleUpdateField("lastName", v)} placeholder="Last name" />
            </SidebarDetailRow>
            <SidebarDetailRow icon={Heart} label="Preferred">
              <SidebarEditableField value={p.preferredName} onChange={(v) => handleUpdateField("preferredName", v)} placeholder="Preferred name" />
            </SidebarDetailRow>
            <SidebarDetailRow icon={CalendarDays} label="Date of Birth">
              <SidebarEditableField value={p.dateOfBirth} onChange={(v) => handleUpdateField("dateOfBirth", v)} type="date" placeholder="Date of birth" />
            </SidebarDetailRow>
            <SidebarDetailRow icon={Stethoscope} label="Primary Dx">
              <SidebarDiagnosisChip value={p.primaryDiagnosis} onChange={(v) => handleUpdateField("primaryDiagnosis", v)} placeholder="Add diagnosis" />
            </SidebarDetailRow>
            <SidebarDetailRow icon={Stethoscope} label="Secondary Dx">
              <SidebarDiagnosisChip value={p.secondaryDiagnosis} onChange={(v) => handleUpdateField("secondaryDiagnosis", v)} placeholder="Add diagnosis" />
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
                  <SidebarEditableField value={p.gender} onChange={(v) => handleUpdateField("gender", v)} type="select" options={["Male", "Female", "Non-binary", "Other", "Prefer not to say"]} />
                </SidebarDetailRow>
                <SidebarDetailRow icon={MessageSquare} label="Pronouns">
                  <SidebarEditableField value={p.pronouns} onChange={(v) => handleUpdateField("pronouns", v)} type="select" options={["He/Him", "She/Her", "They/Them", "Other"]} />
                </SidebarDetailRow>
                <SidebarDetailRow icon={Globe} label="Ethnicity">
                  <SidebarEditableField value={p.ethnicity} onChange={(v) => handleUpdateField("ethnicity", v)} placeholder="Ethnicity" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={Languages} label="Language">
                  <SidebarEditableField value={p.language} onChange={(v) => handleUpdateField("language", v)} placeholder="Language" />
                </SidebarDetailRow>

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Contact Information</h3>
                <SidebarDetailRow icon={Mail} label="Email">
                  <SidebarContactChip value={p.email} onChange={(v) => handleUpdateField("email", v)} placeholder="Email address" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={Smartphone} label="Mobile">
                  <SidebarContactChip value={p.mobile} onChange={(v) => handleUpdateField("mobile", v)} placeholder="Mobile number" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={Phone} label="Phone">
                  <SidebarContactChip value={p.phone} onChange={(v) => handleUpdateField("phone", v)} placeholder="Phone number" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={MessageSquare} label="Contact">
                  <SidebarEditableField value={p.preferredContactMethod} onChange={(v) => handleUpdateField("preferredContactMethod", v)} type="select" options={["SMS", "Email", "Call (Mobile)", "Call (Phone)"]} />
                </SidebarDetailRow>
                <SidebarDetailRow icon={PenLine} label="Sign Method">
                  <SidebarEditableField value={p.preferredSignMethod} onChange={(v) => handleUpdateField("preferredSignMethod", v)} type="select" options={["In Person", "Electronically"]} />
                </SidebarDetailRow>

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Reference Numbers</h3>
                <SidebarDetailRow icon={Hash} label="NDIS">
                  <SidebarContactChip value={p.ndisNumber} onChange={(v) => handleUpdateField("ndisNumber", v)} placeholder="NDIS number" variant="white" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={Hash} label="Medicare">
                  <SidebarContactChip value={p.medicareNumber} onChange={(v) => handleUpdateField("medicareNumber", v)} placeholder="Medicare number" variant="white" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={Hash} label="Centrelink">
                  <SidebarContactChip value={p.centrelinkNumber} onChange={(v) => handleUpdateField("centrelinkNumber", v)} placeholder="Centrelink number" variant="white" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={Hash} label="External ID">
                  <SidebarContactChip value={p.externalId} onChange={(v) => handleUpdateField("externalId", v)} placeholder="External ID" variant="white" />
                </SidebarDetailRow>

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Other Details</h3>
                <SidebarDetailRow icon={CalendarDays} label="Service Start">
                  <SidebarEditableField value={p.serviceCommencementDate} onChange={(v) => handleUpdateField("serviceCommencementDate", v)} type="date" placeholder="Start date" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={CalendarDays} label="Service Exit">
                  <SidebarEditableField value={p.serviceExitDate} onChange={(v) => handleUpdateField("serviceExitDate", v)} type="date" placeholder="Exit date" />
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

          <SidebarSection title="Upcoming reminders" emptyText="No upcoming reminders" actionLabel="See all" />
          <SidebarSection title="Tasks" emptyText="No tasks" actionLabel="See all" />
          <SidebarSection title="Notes" emptyText="No notes" actionLabel="See all" />
          </div>
        </>
      ) : null}
    </div>
  )
}
