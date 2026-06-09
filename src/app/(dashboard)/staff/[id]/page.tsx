"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useStaff } from "@/lib/staff-context"
import { useClients } from "@/lib/hooks/use-clients"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useDocuments } from "@/lib/hooks/use-documents"
import { useNotes } from "@/lib/hooks/use-notes"
import { useCharges } from "@/lib/hooks/use-charges"
import { useInvoices } from "@/lib/hooks/use-invoices"
import { usePermissions } from "@/lib/hooks/use-permissions"
import type { StaffMember, StaffDetails, Task, Document } from "@/lib/types"
import { useFieldConfig } from "@/lib/hooks/use-field-config"
import { EntityIcon } from "@/components/entity-icon"
import { EditableField } from "@/components/editable-field"
import { ContactChip } from "@/components/contact-chip"
import { DetailRow } from "@/components/detail-row"
import { DocumentPreview } from "@/components/document-preview"
import { ProfileNotesTab } from "@/components/profile-notes-tab"
import { FilesTab } from "@/app/(dashboard)/clients/[id]/_components/files-tab"
import { EmptyState } from "@/components/empty-state"
import { UsageBar } from "@/components/usage-bar"
import {
  FileText,
  CalendarDays,
  Clock,
  Hash,
  Plus,
  SquarePen,
  CheckSquare,
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  PanelRightOpen,
  PanelRightClose,
  UserPlus,
  Users,
  Tag,
  Building2,
  ListFilter,
} from "lucide-react"

const tabs = [
  { key: "overview", label: "Overview", icon: FileText },
  { key: "clients", label: "Clients", icon: Users },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "notes", label: "Notes", icon: SquarePen },
  { key: "files", label: "Files", icon: FolderOpen },
]

function parseTimeInput(val: string): number {
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

function getTodayStr() {
  return new Date().toISOString().split("T")[0]
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

function StaffProfileTasksTab({
  tasks,
  chargeCode,
  onToggleComplete,
}: {
  tasks: Task[]
  chargeCode: (itemNumber: string) => string
  onToggleComplete: (task: Task) => void
}) {
  const gridTemplate = "90px 1fr 40px 64px 56px 40px"

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="No tasks yet"
        description="Tasks assigned to this staff member will appear here."
        className="h-full"
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto bg-[#fafafa]">
        <div className="sticky top-0 z-[1] grid items-center border-b border-[#e0e0e0] bg-[#fafafa] px-[24px]" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="flex items-center py-[9px]"><CalendarDays className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
          <div className="flex items-center py-[9px] pl-[8px]"><FileText className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
          <div className="flex items-center justify-center py-[9px]"><Building2 className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
          <div className="flex items-center justify-center py-[9px]"><Hash className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
          <div className="flex items-center justify-center py-[9px]"><Clock className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
          <div className="flex items-center justify-center py-[9px]"><CheckSquare className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
        </div>

        {tasks.map((task) => {
          const dateStr = formatTaskDate(task.dueDate)
          const isDone = task.status === "done"
          const clientInitials = task.client ? task.client.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : ""

          return (
            <div
              key={task.id}
              className="grid items-center border-b border-[#f0f0f0] px-[24px] transition-colors hover:bg-[#fafafa]"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div className="py-[12px] text-[13px] text-[#888]">
                {dateStr || <span className="text-[#ccc]">—</span>}
              </div>
              <div className="truncate py-[12px] pl-[8px]">
                <span className={`text-[13px] ${isDone ? "text-[#bbb] line-through" : "text-[#262626]"}`}>
                  {task.title || <span className="text-[#ccc]">Untitled task</span>}
                </span>
              </div>
              <div className="flex items-center justify-center py-[12px]">
                {clientInitials ? (
                  <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[#f0f0f0] text-[10px] font-bold text-[#555]">{clientInitials}</span>
                ) : <span className="text-[12px] text-[#ccc]">—</span>}
              </div>
              <div className="flex items-center justify-center py-[12px] text-[12px] font-medium text-[#888]">
                <span className="truncate text-center">
                  {task.chargeType ? chargeCode(task.chargeType) : <span className="text-[#ccc]">—</span>}
                </span>
              </div>
              <div className="flex items-center justify-center py-[12px] text-[13px] text-[#888]">
                {task.timeSpent > 0 ? task.timeSpent : <span className="text-[#ccc]">—</span>}
              </div>
              <div className="flex items-center justify-center">
                <button
                  onClick={() => onToggleComplete(task)}
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded border-[1.5px] transition-colors ${
                    isDone
                      ? "border-[#2563EB] bg-[#2563EB] text-white hover:border-[#1d4ed8] hover:bg-[#1d4ed8]"
                      : "border-[#ccc] hover:border-[#999]"
                  }`}
                  tabIndex={0}
                  aria-label={isDone ? "Mark as incomplete" : "Mark as complete"}
                >
                  {isDone && <span className="text-[9px]">✓</span>}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StaffIcon({ member, size = "md" }: { member: StaffMember; size?: "sm" | "md" | "lg" | "xl" }) {
  const normalizedSize = size === "md" ? "md" : size === "xl" ? "xl" : size === "lg" ? "lg" : "sm"

  return (
    <EntityIcon
      text={member.iconText}
      size={normalizedSize}
      backgroundClassName="bg-blue-100"
      textClassName="text-blue-600"
    />
  )
}

function SidebarDetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <DetailRow
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
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(404)
  const { staff, isLoading, updateStaff } = useStaff()
  const { clients, clientNames, updateClient } = useClients()
  const { tasks: allTasks, updateTask, addTask } = useTasks()
  const { documents, files, uploadDocument, deleteDocument, getDownloadUrl, createFile, deleteFile } = useDocuments()
  const { allCharges, enabledCharges } = useCharges()
  const { invoices } = useInvoices()
  const { canAssignClients } = usePermissions()
  const { isFieldEnabled } = useFieldConfig()
  const sf = isFieldEnabled
  const [visibleTabCount, setVisibleTabCount] = useState(tabs.length)
  const [isTabOverflowOpen, setIsTabOverflowOpen] = useState(false)
  const tabWidthsRef = useRef<number[]>([])
  const overflowBtnRef = useRef<HTMLButtonElement>(null)
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)

  const [isQuickAdding, setIsQuickAdding] = useState(false)
  const [quickTitle, setQuickTitle] = useState("")
  const [quickDueDate, setQuickDueDate] = useState(getTodayStr)
  const [quickTime, setQuickTime] = useState("")
  const [quickCharge, setQuickCharge] = useState("")
  const [quickClient, setQuickClient] = useState("")
  const [quickActiveField, setQuickActiveField] = useState<"title" | "client" | "charge" | "time" | null>("title")
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false)
  const [quickClientSearch, setQuickClientSearch] = useState("")
  const [quickClientIdx, setQuickClientIdx] = useState(-1)
  const [isQuickChargeOpen, setIsQuickChargeOpen] = useState(false)
  const [quickChargeSearch, setQuickChargeSearch] = useState("")
  const [quickChargeIdx, setQuickChargeIdx] = useState(-1)
  const quickInputRef = useRef<HTMLInputElement>(null)
  const quickClientInputRef = useRef<HTMLInputElement>(null)
  const quickClientListRef = useRef<HTMLDivElement>(null)
  const quickTimeRef = useRef<HTMLInputElement>(null)
  const quickChargeInputRef = useRef<HTMLInputElement>(null)
  const quickChargeListRef = useRef<HTMLDivElement>(null)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)

  const [isAssignClientOpen, setIsAssignClientOpen] = useState(false)
  const [assignClientSearch, setAssignClientSearch] = useState("")
  const assignClientInputRef = useRef<HTMLInputElement>(null)
  const assignBtnRef = useRef<HTMLButtonElement>(null)

  const chargeTypes = useMemo(() => [
    { value: "", label: "No charge" },
    ...enabledCharges.map((c) => ({ value: c.itemNumber, label: c.shortName })),
  ], [enabledCharges])

  const chargeLabel = useCallback((val: string) => {
    if (!val) return ""
    const match = allCharges.find((c) => c.itemNumber === val)
    return match ? match.shortName : val
  }, [allCharges])

  useEffect(() => {
    if (quickClientIdx >= 0 && quickClientListRef.current) {
      const items = quickClientListRef.current.children
      if (items[quickClientIdx]) (items[quickClientIdx] as HTMLElement).scrollIntoView({ block: "nearest" })
    }
  }, [quickClientIdx])

  useEffect(() => {
    if (quickChargeIdx >= 0 && quickChargeListRef.current) {
      const items = quickChargeListRef.current.children
      if (items[quickChargeIdx]) (items[quickChargeIdx] as HTMLElement).scrollIntoView({ block: "nearest" })
    }
  }, [quickChargeIdx])

  const resetQuickAdd = useCallback(() => {
    setIsQuickAdding(false)
    setQuickTitle("")
    setQuickDueDate(getTodayStr())
    setQuickTime("")
    setQuickCharge("")
    setQuickClient("")
    setIsQuickClientOpen(false)
    setQuickClientSearch("")
    setQuickClientIdx(-1)
    setIsQuickChargeOpen(false)
    setQuickChargeSearch("")
    setQuickChargeIdx(-1)
    setQuickActiveField("title")
  }, [])

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
      if (!tabsContainerRef.current) return
      const availableWidth = tabsContainerRef.current.offsetWidth
      const overflowBtnWidth = 40
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

  const memberName = member?.name ?? ""

  const { notes, addNote } = useNotes()
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const staffNotes = useMemo(
    () => notes.filter((n) => !!memberName && n.createdBy === memberName),
    [notes, memberName]
  )
  const handleCreateNote = useCallback(async () => {
    if (!memberName || isCreatingNote) return
    setIsCreatingNote(true)
    const created = await addNote({ title: "Untitled", content: "", clientId: null, clientName: "", createdBy: memberName })
    setIsCreatingNote(false)
    if (created) router.push(`/notes?note=${created.id}`)
  }, [memberName, isCreatingNote, addNote, router])

  const staffFolder = memberName

  const unassignedClients = useMemo(() =>
    clients.filter((c) => c.owner !== memberName),
    [clients, memberName]
  )

  const filteredUnassignedClients = useMemo(() => {
    if (!assignClientSearch) return unassignedClients
    const q = assignClientSearch.toLowerCase()
    return unassignedClients.filter((c) => c.displayName.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
  }, [unassignedClients, assignClientSearch])

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

  const getClientPlanUsage = (client: (typeof clients)[number]) => {
    const plans = client.participant.plans || []
    const clientInvoices = invoices.filter(
      (inv) => inv.clientId === client.id || inv.clientName === client.name || inv.clientName === client.displayName
    )
    let totalBudget = 0
    let totalUsed = 0
    for (const plan of plans) {
      const services = plan.services || []
      totalBudget += services.reduce((sum, svc) => sum + svc.budget, 0)
      for (const inv of clientInvoices) {
        for (const li of inv.lineItems) {
          if (services.some((svc) => svc.enabledChargeItems.includes(li.chargeItemNumber))) totalUsed += li.amount
        }
      }
    }
    const usagePct = totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0
    return { totalBudget, totalUsed, usagePct, hasPlan: plans.length > 0 }
  }

  const handleUpdateField = (field: keyof StaffDetails, value: string) => {
    updateStaff(member.id, { details: { ...member.details, [field]: value } })
  }

  const staffTasks = allTasks.filter((t) => t.assignee === member.name).sort((a, b) => {
    if (a.status === "done" && b.status !== "done") return 1
    if (a.status !== "done" && b.status === "done") return -1
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })

  const chargeCode = (itemNumber: string) => {
    const charge = allCharges.find((c) => c.itemNumber === itemNumber)
    return charge?.shortName || itemNumber
  }

  const handleUploadFiles = async (fileList: FileList, destination: string) => {
    if (!files.includes(staffFolder)) createFile(staffFolder)
    for (const file of Array.from(fileList)) {
      await uploadDocument(file, destination)
    }
  }

  const handleDownloadDoc = async (doc: Document) => {
    const url = await getDownloadUrl(doc.storagePath)
    if (url) window.open(url, "_blank")
  }

  const handleQuickFinish = async () => {
    const title = quickTitle.trim()
    if (!title) return
    await addTask({
      title,
      description: "",
      status: "todo",
      assignee: member.name,
      client: quickClient,
      dueDate: quickDueDate || null,
      attachments: [],
      chargeType: quickCharge,
      timeSpent: quickTime ? parseTimeInput(quickTime) : 0,
    })
    resetQuickAdd()
    if (activeTab !== "tasks") setActiveTab("tasks")
  }

  const handleAssignClient = (clientId: string) => {
    updateClient(clientId, { owner: member.name })
    setIsAssignClientOpen(false)
    setAssignClientSearch("")
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top header — breadcrumbs + name span the full width over content and account details */}
      <div ref={headerRef} className="flex shrink-0 flex-col bg-[#fafafa]">
        {/* Level 1: breadcrumbs */}
        <div className="flex h-[44px] shrink-0 items-center gap-[8px] border-b border-[#ececec] px-[16px]">
          <button
            onClick={() => router.push("/staff")}
            className="mr-[2px] flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded text-[#999] transition-colors hover:bg-[#ebebeb] hover:text-[#262626]"
            tabIndex={0}
            aria-label="Back to staff"
          >
            <ArrowLeft className="h-[15px] w-[15px]" strokeWidth={1.75} />
          </button>
          <button
            onClick={() => router.push("/staff")}
            className="text-[13px] font-medium text-[#888] transition-colors hover:text-[#262626]"
            tabIndex={0}
          >
            Staff
          </button>
          <ChevronRight className="h-[14px] w-[14px] shrink-0 text-[#c4c4c4]" strokeWidth={1.75} />
          <span className="flex min-w-0 items-center gap-[6px]">
            <StaffIcon member={member} size="sm" />
            <span className="max-w-[420px] truncate text-[13px] font-medium text-[#262626]">{member.name}</span>
          </span>
        </div>

        {/* Hidden measurer for tab widths (kept inside headerRef) */}
        <div data-tab-measurer className="pointer-events-none invisible absolute flex items-center gap-[2px]" aria-hidden="true">
          {tabs.map((tab) => {
            const TabIcon = tab.icon
            return (
              <div key={tab.key} data-tab-measure className="flex shrink-0 items-center gap-[4px] px-[8px] py-[4px] text-[12px] font-medium">
                <TabIcon className="h-[12px] w-[12px]" strokeWidth={1.5} />
                <span>{tab.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Body — section content (left) + account details (right) */}
      <div className="flex min-h-0 flex-1">
        {/* Left: section tabs + content */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Level 3: section tabs (sits inline with the account details title on the right) */}
          <div className="relative flex h-[48px] items-center overflow-hidden border-b border-[#ececec] bg-[#fafafa] px-[16px]">
            <div ref={tabsContainerRef} className="flex flex-1 items-center gap-[2px] overflow-hidden">
            {tabs.slice(0, visibleTabCount).map((tab) => {
              const TabIcon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex h-full shrink-0 items-center gap-[4px] px-[8px] text-[12px] font-medium transition-colors ${isActive ? "text-[#111]" : "text-[#888] hover:text-[#262626]"}`}
                  tabIndex={0}
                >
                  <TabIcon className="h-[12px] w-[12px]" strokeWidth={1.5} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
            {visibleTabCount < tabs.length && (
              <>
                <button
                  ref={overflowBtnRef}
                  onClick={() => setIsTabOverflowOpen(!isTabOverflowOpen)}
                  className={`relative flex shrink-0 items-center gap-[3px] px-[6px] py-[4px] text-[12px] font-medium transition-colors ${isTabOverflowOpen ? "text-[#262626]" : "text-[#888] hover:text-[#262626]"}`}
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

            <div className="ml-[8px] flex shrink-0 items-center gap-[6px]">
              {!isSidebarVisible && (
                <button
                  onClick={() => setIsSidebarVisible(true)}
                  className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#262626] transition-colors hover:bg-[#ebebeb]"
                  tabIndex={0}
                  aria-label="Show staff details"
                >
                  <PanelRightOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>

        {/* Quick-add task popup */}
        {isQuickAdding && (
          <>
            <div className="fixed inset-0 z-[48]" onClick={resetQuickAdd} />
            <div className="relative z-[50] mx-[16px] mt-[4px] rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-[8px] px-[12px] pt-[10px]">
                <span className="flex h-[22px] items-center rounded bg-[#f0f0f0] px-[6px] text-[11px] font-medium text-[#555]">{member.name}</span>
              </div>
              <div className="px-[12px] pt-[6px] pb-[6px]">
                <input
                  ref={quickInputRef}
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  onFocus={() => setQuickActiveField("title")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && quickTitle.trim()) { e.preventDefault(); setQuickActiveField("client"); setTimeout(() => quickClientInputRef.current?.focus(), 50) }
                    if (e.key === "Escape") resetQuickAdd()
                    if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); setQuickActiveField("client"); quickClientInputRef.current?.focus() }
                  }}
                  placeholder="Task name"
                  className="w-full text-[14px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-[6px] overflow-x-auto px-[12px] pb-[8px]">
                {/* Client picker */}
                <div className="relative">
                  {(() => {
                    const filteredClients = quickClientSearch
                      ? clientNames.filter((n) => n.toLowerCase().includes(quickClientSearch.toLowerCase()))
                      : clientNames
                    const selectClientFn = (name: string) => {
                      setQuickClient(name)
                      setIsQuickClientOpen(false)
                      setQuickClientIdx(-1)
                      setQuickClientSearch("")
                      setQuickActiveField("charge")
                      setTimeout(() => quickChargeInputRef.current?.focus(), 50)
                    }
                    return (
                      <>
                        <div className={`flex items-center gap-[5px] rounded border px-[8px] py-[3px] transition-colors ${quickActiveField === "client" ? "border-blue-400" : "border-[#e0e0e0]"}`}>
                          <Building2 className={`h-[12px] w-[12px] shrink-0 ${quickClient ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                          <input
                            ref={quickClientInputRef}
                            value={isQuickClientOpen ? quickClientSearch : quickClient}
                            onChange={(e) => { setQuickClientSearch(e.target.value); if (!isQuickClientOpen) setIsQuickClientOpen(true); setQuickClientIdx(0) }}
                            onFocus={() => { setQuickActiveField("client"); setIsQuickClientOpen(true); setQuickClientSearch(""); setQuickClientIdx(0) }}
                            onKeyDown={(e) => {
                              const totalItems = filteredClients.length
                              if (isQuickClientOpen) {
                                if (e.key === "ArrowDown") { e.preventDefault(); setQuickClientIdx((p) => (p + 1) % Math.max(totalItems, 1)) }
                                else if (e.key === "ArrowUp") { e.preventDefault(); setQuickClientIdx((p) => (p - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1)) }
                                else if (e.key === "Enter") {
                                  e.preventDefault()
                                  if (filteredClients.length > 0) {
                                    const idx = quickClientIdx >= 0 && quickClientIdx < filteredClients.length ? quickClientIdx : 0
                                    selectClientFn(filteredClients[idx])
                                  } else selectClientFn("")
                                } else if (e.key === "Tab" && !e.shiftKey) {
                                  e.preventDefault()
                                  if (filteredClients.length > 0) {
                                    const idx = quickClientIdx >= 0 && quickClientIdx < filteredClients.length ? quickClientIdx : 0
                                    selectClientFn(filteredClients[idx])
                                  } else {
                                    setIsQuickClientOpen(false); setQuickClientSearch("")
                                    setQuickActiveField("charge"); setTimeout(() => quickChargeInputRef.current?.focus(), 50)
                                  }
                                }
                              } else {
                                if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); setQuickActiveField("charge"); quickChargeInputRef.current?.focus() }
                              }
                              if (e.key === "Escape") {
                                if (isQuickClientOpen) { e.stopPropagation(); setIsQuickClientOpen(false); setQuickClientSearch(""); setQuickClientIdx(-1) }
                                else resetQuickAdd()
                              }
                            }}
                            placeholder="Client"
                            className="w-[80px] bg-transparent text-[12px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                          />
                        </div>
                        {isQuickClientOpen && (
                          <>
                            <div className="fixed inset-0 z-[59]" onClick={() => { setIsQuickClientOpen(false); setQuickClientIdx(-1); setQuickClientSearch("") }} />
                            <div ref={quickClientListRef} className="absolute left-0 top-full z-[60] mt-[4px] max-h-[180px] min-w-[200px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-lg">
                              {filteredClients.map((name, i) => (
                                <div
                                  key={name}
                                  onClick={() => selectClientFn(name)}
                                  className={`flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[6px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${quickClientIdx === i ? "bg-blue-50" : ""}`}
                                  role="option"
                                  aria-selected={quickClientIdx === i}
                                >
                                  <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[6px] bg-[#DBEAFE] text-[8px] font-semibold text-[#2563EB]">
                                    {name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                                  </div>
                                  {name}
                                </div>
                              ))}
                              {filteredClients.length === 0 && <div className="px-[12px] py-[6px] text-[12px] text-[#999]">No clients found</div>}
                            </div>
                          </>
                        )}
                      </>
                    )
                  })()}
                </div>

                {/* Charge picker */}
                <div className="relative">
                  {(() => {
                    const filteredCharges = quickChargeSearch
                      ? chargeTypes.filter((c) => c.label.toLowerCase().includes(quickChargeSearch.toLowerCase()) || c.value.toLowerCase().includes(quickChargeSearch.toLowerCase()))
                      : chargeTypes
                    const selectChargeFn = (val: string) => {
                      setQuickCharge(val)
                      setIsQuickChargeOpen(false)
                      setQuickChargeIdx(-1)
                      setQuickChargeSearch("")
                      setQuickActiveField("time")
                      setTimeout(() => quickTimeRef.current?.focus(), 50)
                    }
                    return (
                      <>
                        <div className={`flex items-center gap-[5px] rounded border px-[8px] py-[3px] transition-colors ${quickActiveField === "charge" ? "border-blue-400" : "border-[#e0e0e0]"}`}>
                          <Tag className={`h-[12px] w-[12px] shrink-0 ${quickCharge ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                          <input
                            ref={quickChargeInputRef}
                            value={isQuickChargeOpen ? quickChargeSearch : chargeLabel(quickCharge)}
                            onChange={(e) => { setQuickChargeSearch(e.target.value); if (!isQuickChargeOpen) setIsQuickChargeOpen(true); setQuickChargeIdx(0) }}
                            onFocus={() => { setQuickActiveField("charge"); setIsQuickChargeOpen(true); setQuickChargeSearch(""); setQuickChargeIdx(0) }}
                            onKeyDown={(e) => {
                              if (isQuickChargeOpen) {
                                if (e.key === "ArrowDown") { e.preventDefault(); setQuickChargeIdx((p) => (p + 1) % Math.max(filteredCharges.length, 1)) }
                                else if (e.key === "ArrowUp") { e.preventDefault(); setQuickChargeIdx((p) => (p - 1 + Math.max(filteredCharges.length, 1)) % Math.max(filteredCharges.length, 1)) }
                                else if (e.key === "Enter") {
                                  e.preventDefault()
                                  if (filteredCharges.length > 0) {
                                    const idx = quickChargeIdx >= 0 && quickChargeIdx < filteredCharges.length ? quickChargeIdx : 0
                                    selectChargeFn(filteredCharges[idx].value)
                                  } else selectChargeFn("")
                                } else if (e.key === "Tab" && !e.shiftKey) {
                                  e.preventDefault()
                                  if (filteredCharges.length > 0 && quickChargeIdx >= 0) selectChargeFn(filteredCharges[quickChargeIdx].value)
                                  else { setIsQuickChargeOpen(false); setQuickActiveField("time"); quickTimeRef.current?.focus() }
                                }
                              } else {
                                if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); setQuickActiveField("time"); quickTimeRef.current?.focus() }
                              }
                              if (e.key === "Escape") {
                                if (isQuickChargeOpen) { e.stopPropagation(); setIsQuickChargeOpen(false); setQuickChargeSearch(""); setQuickChargeIdx(-1) }
                                else resetQuickAdd()
                              }
                            }}
                            placeholder="Charge"
                            className="w-[60px] bg-transparent text-[12px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                          />
                        </div>
                        {isQuickChargeOpen && (
                          <>
                            <div className="fixed inset-0 z-[59]" onClick={() => { setIsQuickChargeOpen(false); setQuickChargeIdx(-1); setQuickChargeSearch("") }} />
                            <div ref={quickChargeListRef} className="absolute left-0 top-full z-[60] mt-[4px] max-h-[180px] min-w-[200px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-lg">
                              {filteredCharges.map((c, i) => (
                                <div
                                  key={c.value || "__none"}
                                  onClick={() => selectChargeFn(c.value)}
                                  className={`flex w-full cursor-pointer items-center px-[12px] py-[6px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${quickChargeIdx === i ? "bg-blue-50" : ""}`}
                                  role="option"
                                  aria-selected={quickChargeIdx === i}
                                >
                                  {c.label}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )
                  })()}
                </div>

                {/* Time input */}
                <div className={`flex items-center gap-[5px] rounded border px-[8px] py-[3px] transition-colors ${quickActiveField === "time" ? "border-blue-400" : "border-[#e0e0e0]"}`}>
                  <Clock className={`h-[12px] w-[12px] shrink-0 ${quickTime ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                  <input
                    ref={quickTimeRef}
                    value={quickTime}
                    onChange={(e) => setQuickTime(e.target.value)}
                    onFocus={() => setQuickActiveField("time")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) { e.preventDefault(); handleQuickFinish() }
                      if (e.key === "Escape") resetQuickAdd()
                    }}
                    placeholder="Time"
                    className="w-[50px] bg-transparent text-[12px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                  />
                </div>

                <div className="ml-auto flex items-center gap-[6px]">
                  <button type="button" onClick={resetQuickAdd} className="rounded px-[8px] py-[4px] text-[12px] font-medium text-[#999] transition-colors hover:bg-[#f0f0f0]" tabIndex={0}>Cancel</button>
                  <button type="button" onClick={handleQuickFinish} disabled={!quickTitle.trim()} className="primary-btn rounded-[4px] px-[12px] py-[4px] text-[12px] font-medium transition-colors disabled:opacity-40" tabIndex={0}>Create</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "clients" ? (
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
                {canAssignClients && (
                  <div className="relative">
                    <button
                      ref={assignBtnRef}
                      onClick={() => { setIsAssignClientOpen(!isAssignClientOpen); setTimeout(() => assignClientInputRef.current?.focus(), 50) }}
                      className="flex items-center gap-[5px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                    >
                      <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                      <span>Assign client</span>
                    </button>
                    {isAssignClientOpen && (
                      <>
                        <div className="fixed inset-0 z-[49]" onClick={() => { setIsAssignClientOpen(false); setAssignClientSearch("") }} />
                        <div
                          className="absolute right-0 top-full z-[50] mt-[4px] w-[280px] overflow-hidden rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                        >
                          <div className="border-b border-[#f0f0f0] px-[12px] py-[8px]">
                            <input
                              ref={assignClientInputRef}
                              value={assignClientSearch}
                              onChange={(e) => setAssignClientSearch(e.target.value)}
                              placeholder="Search participants..."
                              className="w-full text-[13px] text-[#262626] placeholder-[#ccc] outline-none"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-[240px] overflow-y-auto py-[4px]">
                            {filteredUnassignedClients.length === 0 ? (
                              <p className="px-[12px] py-[8px] text-[13px] text-[#999]">
                                {unassignedClients.length === 0 ? "All participants are assigned" : "No matches"}
                              </p>
                            ) : filteredUnassignedClients.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => handleAssignClient(c.id)}
                                className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-left text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                                tabIndex={0}
                              >
                                <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] bg-[#DBEAFE] text-[9px] font-semibold text-[#2563EB]">
                                  {c.iconText}
                                </div>
                                <span className="truncate">{c.displayName}</span>
                                {c.owner && <span className="ml-auto shrink-0 text-[11px] text-[#bbb]">{c.owner}</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-left">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Client name</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">NDIS Number</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Primary Diagnosis</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Email</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Plan usage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedClients.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="bg-white px-[20px] py-[32px] text-center text-[13px] font-medium text-[#bbb]">
                          No clients assigned
                        </td>
                      </tr>
                    ) : assignedClients.map((client) => {
                      const initials = client.iconText
                      const planUsage = getClientPlanUsage(client)
                      return (
                        <tr
                          key={client.id}
                          className="group cursor-pointer transition-colors hover:bg-[#f5f5f5]"
                          onClick={() => router.push(`/clients/${client.id}`)}
                        >
                          <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">
                            <div className="flex items-center gap-[8px]">
                              <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] bg-[#DBEAFE] text-[9px] font-semibold text-[#2563EB]">
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
                          <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">
                            {client.participant.email || <span className="text-[#bbb]">—</span>}
                          </td>
                          <td className="h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px]" onClick={(e) => e.stopPropagation()}>
                            {planUsage.hasPlan ? (
                              <UsageBar percent={planUsage.usagePct} tooltip={`$${planUsage.totalUsed.toLocaleString()} of $${planUsage.totalBudget.toLocaleString()} used`} />
                            ) : (
                              <span className="text-[13px] font-medium text-[#bbb]">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
                <span className="text-[12px] font-medium text-[#999]">{assignedClients.length} {assignedClients.length === 1 ? "client" : "clients"}</span>
              </div>
            </div>
          ) : activeTab === "tasks" ? (
            <StaffProfileTasksTab
              tasks={staffTasks}
              chargeCode={chargeCode}
              onToggleComplete={(task) => updateTask(task.id, { status: task.status === "done" ? "todo" : "done" })}
            />
          ) : activeTab === "files" ? (
            <FilesTab
              rootFolder={staffFolder}
              documents={documents}
              files={files}
              onUploadFiles={handleUploadFiles}
              onCreateFile={createFile}
              onDeleteFile={deleteFile}
              onDownloadDoc={handleDownloadDoc}
              onDeleteDocument={deleteDocument}
              onPreviewDoc={setPreviewDoc}
            />
          ) : activeTab === "notes" ? (
            <ProfileNotesTab
              notes={staffNotes}
              onOpenNote={(noteId) => router.push(`/notes?note=${noteId}`)}
              onCreateNote={handleCreateNote}
              isCreating={isCreatingNote}
              emptyDescription="Notes created by this staff member will appear here."
            />
          ) : activeTab !== "overview" ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[13px] font-medium text-[#bbb]">No content yet</p>
            </div>
          ) : (
          <div className="mx-auto max-w-[720px] px-[40px] py-[32px]">
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
                      <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[6px] bg-[#DBEAFE] text-[9px] font-semibold text-[#2563EB]">
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
          <div className="flex items-center justify-between gap-[8px] border-b border-[#ececec] px-[24px] py-[14px]">
            <div className="flex min-w-0 items-center gap-[10px]">
              <StaffIcon member={member} size="lg" />
              <span className="min-w-0 truncate text-[16px] font-semibold text-[#262626]">{member.name}</span>
            </div>
            <button
              onClick={() => setIsSidebarVisible(false)}
              className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
              tabIndex={0}
              aria-label="Hide sidebar"
            >
              <PanelRightClose className="h-[14px] w-[14px]" strokeWidth={1.5} />
            </button>
          </div>

          <div className="border-b border-[#f0f0f0] px-[24px] pb-[12px] pt-[12px]">
            {sf("s-first-name") && <SidebarDetailRow label="First Name">
              <SidebarEditableField value={d.firstName} onChange={(v) => handleUpdateField("firstName", v)} placeholder="First name" />
            </SidebarDetailRow>}
            {sf("s-last-name") && <SidebarDetailRow label="Last Name">
              <SidebarEditableField value={d.lastName} onChange={(v) => handleUpdateField("lastName", v)} placeholder="Last name" />
            </SidebarDetailRow>}
            {sf("s-address") && <SidebarDetailRow label="Address">
              <SidebarEditableField value={d.address} onChange={(v) => handleUpdateField("address", v)} placeholder="Address" />
            </SidebarDetailRow>}

            <div className="my-[12px] h-px bg-[#e8e8e8]" />
            <h3 className="mb-[6px] text-[12px] font-semibold text-[#262626]">Personal details</h3>
            {sf("s-preferred-name") && <SidebarDetailRow label="Preferred">
              <SidebarEditableField value={d.preferredName} onChange={(v) => handleUpdateField("preferredName", v)} placeholder="Preferred name" />
            </SidebarDetailRow>}
            {sf("s-date-of-birth") && <SidebarDetailRow label="Date of Birth">
              <SidebarEditableField value={d.dateOfBirth} onChange={(v) => handleUpdateField("dateOfBirth", v)} type="date" placeholder="Date of birth" />
            </SidebarDetailRow>}
            {sf("s-gender") && <SidebarDetailRow label="Gender">
              <SidebarEditableField value={d.gender} onChange={(v) => handleUpdateField("gender", v)} type="select" options={["Male", "Female", "Non-binary", "Other", "Prefer not to say"]} />
            </SidebarDetailRow>}
            {sf("s-pronouns") && <SidebarDetailRow label="Pronouns">
              <SidebarEditableField value={d.pronouns} onChange={(v) => handleUpdateField("pronouns", v)} type="select" options={["He/Him", "She/Her", "They/Them", "Other"]} />
            </SidebarDetailRow>}

            <div className="my-[12px] h-px bg-[#e8e8e8]" />
            <h3 className="mb-[6px] text-[12px] font-semibold text-[#262626]">Contact Information</h3>
            {sf("s-email") && <SidebarDetailRow label="Email">
              <SidebarContactChip value={d.email} onChange={(v) => handleUpdateField("email", v)} placeholder="Email address" />
            </SidebarDetailRow>}
            {sf("s-phone") && <SidebarDetailRow label="Phone">
              <SidebarContactChip value={d.phone} onChange={(v) => handleUpdateField("phone", v)} placeholder="Phone number" />
            </SidebarDetailRow>}

            <div className="my-[12px] h-px bg-[#e8e8e8]" />
            <h3 className="mb-[6px] text-[12px] font-semibold text-[#262626]">Employment</h3>
            {sf("s-role") && <SidebarDetailRow label="Role">
              <SidebarEditableField value={d.role} onChange={(v) => handleUpdateField("role", v)} placeholder="Job role" />
            </SidebarDetailRow>}
            {sf("s-employment-type") && <SidebarDetailRow label="Type">
              <SidebarEditableField value={d.employmentType} onChange={(v) => handleUpdateField("employmentType", v)} type="select" options={["Full-time", "Part-time", "Casual", "Contract"]} />
            </SidebarDetailRow>}
            {sf("s-start-date") && <SidebarDetailRow label="Start Date">
              <SidebarEditableField value={d.startDate} onChange={(v) => handleUpdateField("startDate", v)} type="date" placeholder="Start date" />
            </SidebarDetailRow>}
            {sf("s-end-date") && <SidebarDetailRow label="End Date">
              <SidebarEditableField value={d.endDate} onChange={(v) => handleUpdateField("endDate", v)} type="date" placeholder="End date" />
            </SidebarDetailRow>}

            <div className="my-[12px] h-px bg-[#e8e8e8]" />
            <h3 className="mb-[6px] text-[12px] font-semibold text-[#262626]">Emergency Contact</h3>
            {sf("s-emergency-contact") && <SidebarDetailRow label="Name">
              <SidebarEditableField value={d.emergencyContactName} onChange={(v) => handleUpdateField("emergencyContactName", v)} placeholder="Emergency contact" />
            </SidebarDetailRow>}
            {sf("s-emergency-phone") && <SidebarDetailRow label="Phone">
              <SidebarContactChip value={d.emergencyContactPhone} onChange={(v) => handleUpdateField("emergencyContactPhone", v)} placeholder="Phone number" />
            </SidebarDetailRow>}
          </div>
          </div>
        </>
      ) : null}
      </div>

      {previewDoc && (
        <DocumentPreview
          doc={previewDoc}
          getDownloadUrl={getDownloadUrl}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  )
}
