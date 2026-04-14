"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useContacts } from "@/lib/hooks/use-contacts"
import { useClients } from "@/lib/hooks/use-clients"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useCharges } from "@/lib/hooks/use-charges"
import { relationshipConfig } from "@/lib/types"
import type { Client, ParticipantDetails, Task } from "@/lib/types"
import { EntityIcon } from "@/components/entity-icon"
import { EditableField } from "@/components/editable-field"
import { ContactChip } from "@/components/contact-chip"
import { DetailRow } from "@/components/detail-row"
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
  Clock,
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
  Wallet,
  Building2,
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

function ClientIcon({ client, size = "md" }: { client: Client; size?: "sm" | "md" | "lg" | "xl" }) {
  const normalizedSize = size === "md" ? "md" : size === "xl" ? "xl" : size === "lg" ? "lg" : "sm"

  return <EntityIcon text={client.iconText} size={normalizedSize} />
}

function SidebarDetailRow({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; children: React.ReactNode }) {
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
  return (
    <EditableField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      options={options}
      size="compact"
    />
  )
}

function SidebarContactChip({ value, onChange, placeholder, variant = "grey" }: { value: string; onChange: (v: string) => void; placeholder: string; variant?: "grey" | "white" }) {
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

function SidebarDiagnosisChip({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
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

function formatTaskDate(dateStr: string | null): string {
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
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
}

function ProfileTasksTab({
  openTasks,
  completedTasks,
  chargeCode,
  onToggleComplete,
}: {
  openTasks: Task[]
  completedTasks: Task[]
  chargeCode: (itemNumber: string) => string
  onToggleComplete: (taskId: string) => void
}) {
  const [showCompleted, setShowCompleted] = useState(false)
  const totalTasks = openTasks.length + completedTasks.length

  const gridTemplate = "100px 1fr 80px 40px"

  const renderRow = (task: Task) => {
    const dateStr = formatTaskDate(task.dueDate)
    const isOverdue = task.dueDate && task.status !== "done" && new Date(task.dueDate + "T00:00:00") < new Date(new Date().toDateString())

    return (
      <div
        key={task.id}
        className="grid items-center border-b border-[#f0f0f0] px-[20px] transition-colors hover:bg-white"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div className={`py-[10px] text-[13px] ${isOverdue ? "font-medium text-[#c43d3d]" : "text-[#888]"}`}>
          {dateStr || <span className="text-[#ccc]">—</span>}
        </div>
        <div className="truncate py-[10px]">
          <span className={`text-[13px] ${task.status === "done" ? "text-[#bbb] line-through" : "text-[#262626]"}`}>
            {task.title || <span className="text-[#ccc]">Untitled task</span>}
          </span>
          {task.chargeType && (
            <span className="ml-[8px] text-[11px] font-medium text-[#aaa]">{chargeCode(task.chargeType)}</span>
          )}
        </div>
        <div className="flex items-center justify-center py-[10px] text-[13px] text-[#888]">
          {task.timeSpent > 0 ? `${task.timeSpent}m` : <span className="text-[#ccc]">—</span>}
        </div>
        <div className="flex items-center justify-center">
          <button
            onClick={() => onToggleComplete(task.id)}
            className={`flex h-[18px] w-[18px] items-center justify-center rounded border-[1.5px] transition-colors ${
              task.status === "done"
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-[#ccc] hover:border-[#999]"
            }`}
            tabIndex={0}
            aria-label={task.status === "done" ? "Mark as incomplete" : "Mark as complete"}
          >
            {task.status === "done" && <span className="text-[9px]">✓</span>}
          </button>
        </div>
      </div>
    )
  }

  if (totalTasks === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-[24px] py-[56px] text-center">
        <div className="rounded-full bg-[#f5f5f5] p-[12px]">
          <CheckSquare className="h-[20px] w-[20px] text-[#999]" strokeWidth={1.5} />
        </div>
        <h3 className="mt-[14px] text-[15px] font-semibold text-[#262626]">No tasks yet</h3>
        <p className="mt-[6px] max-w-[320px] text-[13px] text-[#888]">
          Tasks assigned to this participant will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-[1] grid items-center border-b border-[#e0e0e0] bg-[#fafafa] px-[20px]" style={{ gridTemplateColumns: gridTemplate }}>
        <div className="py-[10px] text-[12px] font-medium text-[#666]">Date</div>
        <div className="py-[10px] text-[12px] font-medium text-[#666]">Task</div>
        <div className="py-[10px] text-center text-[12px] font-medium text-[#666]">Time</div>
        <div className="py-[10px] text-center text-[12px] font-medium text-[#666]" />
      </div>

      {openTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-[8px] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[6px]">
            <span className="text-[12px] font-semibold text-[#262626]">Open</span>
            <span className="text-[11px] font-medium text-[#bbb]">{openTasks.length}</span>
          </div>
          {openTasks.map(renderRow)}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex w-full items-center gap-[8px] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[6px] text-left"
            tabIndex={0}
          >
            <ChevronDown className={`h-[12px] w-[12px] text-[#888] transition-transform ${showCompleted ? "" : "-rotate-90"}`} strokeWidth={1.75} />
            <span className="text-[12px] font-semibold text-[#888]">Completed</span>
            <span className="text-[11px] font-medium text-[#bbb]">{completedTasks.length}</span>
          </button>
          {showCompleted && completedTasks.map(renderRow)}
        </div>
      )}

      <div className="mt-auto shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
        <span className="text-[12px] font-medium text-[#999]">
          {openTasks.length} open · {completedTasks.length} completed
        </span>
      </div>
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
  const { tasks: allTasks, updateTask: updateTaskDb } = useTasks()
  const { allCharges } = useCharges()
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
  const id = params.id as string
  const client = clients.find((c) => c.id === id) || null

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

  const handleUpdateField = (field: keyof ParticipantDetails, value: string) => {
    updateParticipantField(client.id, field, value)
  }

  const clientContacts = getContactsForClient(client.name)
  const allContacts: ProfileContact[] = [
    { id: "owner", firstName: client.owner, email: p.email, phone: p.phone || p.mobile, relationship: "support-coordinator" },
    ...clientContacts.map((c) => ({ id: c.id, firstName: c.name, email: c.email, phone: c.phone, relationship: c.relationship })),
  ]

  const clientTasks = allTasks.filter((t) =>
    t.clientId === client.id || t.client === client.name || t.client === client.displayName
  )
  const openTasks = clientTasks.filter((t) => t.status !== "done").sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })
  const completedTasks = clientTasks.filter((t) => t.status === "done").sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return b.dueDate.localeCompare(a.dueDate)
  })

  const chargeCode = (itemNumber: string) => {
    const charge = allCharges.find((c) => c.itemNumber === itemNumber)
    return charge?.shortName || itemNumber
  }

  const handleToggleTaskComplete = (taskId: string) => {
    const task = clientTasks.find((t) => t.id === taskId)
    if (!task) return
    updateTaskDb(taskId, { status: task.status === "done" ? "todo" : "done" })
  }

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
                      const rel = relationshipConfig[contact.relationship] ?? { label: contact.relationship || "—", color: "bg-gray-50 text-gray-600", dotColor: "bg-gray-400" }
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
                          className="h-[36px] w-full rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3]"
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
                          className="h-[36px] w-full rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3]"
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
                          className="h-[36px] w-full rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3]"
                        />
                      </div>

                      {/* Relationship */}
                      <div className="mb-[20px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Relationship</label>
                        <button
                          ref={relationshipRef}
                          type="button"
                          onClick={() => setIsRelationshipOpen(!isRelationshipOpen)}
                          className="flex h-[36px] w-full items-center justify-between rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px] text-[13px] font-medium outline-none transition-colors focus:border-[#a3c4f3]"
                          tabIndex={0}
                        >
                          {newContact.relationship ? (
                            (() => {
                              const rel = relationshipConfig[newContact.relationship]
                              return <span className="inline-flex h-[28px] items-center whitespace-nowrap rounded border border-[#dcdcdc] px-[8px] text-[13px] font-medium text-[#262626]">{rel?.label ?? newContact.relationship}</span>
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
          ) : activeTab === "tasks" ? (
            <ProfileTasksTab
              openTasks={openTasks}
              completedTasks={completedTasks}
              chargeCode={chargeCode}
              onToggleComplete={handleToggleTaskComplete}
            />
          ) : activeTab !== "overview" ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[13px] font-medium text-[#bbb]">No content yet</p>
            </div>
          ) : (
          <div className="mx-auto flex w-full max-w-[1120px] flex-col px-[32px] py-[32px]">
            <div className="flex items-center gap-[14px]">
              <ClientIcon client={client} size="xl" />
              <div>
                <h1 className="text-[24px] font-semibold text-[#262626]">{client.displayName}</h1>
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

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Funding &amp; Plan Manager</h3>
                <SidebarDetailRow icon={Wallet} label="Funding Type">
                  <SidebarEditableField value={p.fundingType} onChange={(v) => handleUpdateField("fundingType", v)} type="select" options={["plan-managed", "ndia-managed", "self-managed"]} />
                </SidebarDetailRow>
                {(p.fundingType === "plan-managed" || !p.fundingType) && (
                  <>
                    <SidebarDetailRow icon={Building2} label="PM Organisation">
                      <SidebarEditableField value={p.planManagerOrg} onChange={(v) => handleUpdateField("planManagerOrg", v)} placeholder="Plan manager org" />
                    </SidebarDetailRow>
                    <SidebarDetailRow icon={User} label="PM Name">
                      <SidebarEditableField value={p.planManagerName} onChange={(v) => handleUpdateField("planManagerName", v)} placeholder="Plan manager name" />
                    </SidebarDetailRow>
                    <SidebarDetailRow icon={Mail} label="PM Email">
                      <SidebarContactChip value={p.planManagerEmail} onChange={(v) => handleUpdateField("planManagerEmail", v)} placeholder="Plan manager email" variant="white" />
                    </SidebarDetailRow>
                  </>
                )}
                <SidebarDetailRow icon={CalendarDays} label="Plan Start">
                  <SidebarEditableField value={p.planStartDate} onChange={(v) => handleUpdateField("planStartDate", v)} type="date" placeholder="Plan start date" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={CalendarDays} label="Plan End">
                  <SidebarEditableField value={p.planEndDate} onChange={(v) => handleUpdateField("planEndDate", v)} type="date" placeholder="Plan end date" />
                </SidebarDetailRow>

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Other Details</h3>
                <SidebarDetailRow icon={CalendarDays} label="Service Start">
                  <SidebarEditableField value={p.serviceCommencementDate} onChange={(v) => handleUpdateField("serviceCommencementDate", v)} type="date" placeholder="Start date" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={CalendarDays} label="Service Exit">
                  <SidebarEditableField value={p.serviceExitDate} onChange={(v) => handleUpdateField("serviceExitDate", v)} type="date" placeholder="Exit date" />
                </SidebarDetailRow>
                <SidebarDetailRow icon={Clock} label="Check-in">
                  <SidebarEditableField value={p.checkInPeriod} onChange={(v) => handleUpdateField("checkInPeriod", v)} type="select" options={["Weekly", "Fortnightly", "Monthly", "Quarterly", "As needed"]} />
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
