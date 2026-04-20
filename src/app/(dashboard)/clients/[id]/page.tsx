"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useContacts } from "@/lib/hooks/use-contacts"
import { useClients } from "@/lib/hooks/use-clients"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useCharges } from "@/lib/hooks/use-charges"
import { relationshipConfig } from "@/lib/types"
import { useFieldConfig } from "@/lib/hooks/use-field-config"
import { useStaff } from "@/lib/hooks/use-staff"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useDocuments } from "@/lib/hooks/use-documents"
import type { Client, ParticipantDetails, Task, Document } from "@/lib/types"
import { EntityIcon } from "@/components/entity-icon"
import { EditableField } from "@/components/editable-field"
import { ContactChip } from "@/components/contact-chip"
import { DetailRow } from "@/components/detail-row"
import { DocumentPreview } from "@/components/document-preview"
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
  FilePlus,
  PanelRightOpen,
  PanelRightClose,
  ListFilter,
  X,
  Wallet,
  Building2,
  Tag,
  Upload,
  Download,
  Trash2,
  File,
  FileImage,
  FileSpreadsheet,
  FileVideo,
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

function getDocIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv") || mimeType.includes("excel")) return FileSpreadsheet
  if (mimeType.startsWith("video/")) return FileVideo
  if (mimeType.includes("pdf")) return FileText
  return File
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
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

function ProfileTasksTab({
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
      <div className="flex-1 overflow-y-auto bg-[#fafafa]">
        <div className="sticky top-0 z-[1] grid items-center border-b border-[#e0e0e0] bg-[#fafafa] px-[24px]" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="flex items-center py-[9px]"><CalendarDays className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
          <div className="flex items-center py-[9px] pl-[8px]"><FileText className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
          <div className="flex items-center justify-center py-[9px]"><User className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
          <div className="flex items-center justify-center py-[9px]"><Hash className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
          <div className="flex items-center justify-center py-[9px]"><Clock className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
          <div className="flex items-center justify-center py-[9px]"><CheckSquare className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
        </div>

        {tasks.map((task) => {
          const dateStr = formatTaskDate(task.dueDate)
          const isDone = task.status === "done"
          const assigneeInitials = task.assignee ? task.assignee.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : ""

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
                {assigneeInitials ? (
                  <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[#f0f0f0] text-[10px] font-bold text-[#555]">{assigneeInitials}</span>
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
                      ? "border-blue-500 bg-blue-500 text-white hover:border-blue-400 hover:bg-blue-400"
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

export default function ParticipantProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(404)
  const { clients, isLoading, updateParticipantField, updateClient } = useClients()
  const { addContact, getContactsForClient } = useContacts()
  const { tasks: allTasks, updateTask, addTask } = useTasks()
  const { allCharges, enabledCharges } = useCharges()
  const { isFieldEnabled } = useFieldConfig()
  const { staffNames } = useStaff()
  const { canAssignTasks, canAssignClients } = usePermissions()
  const { documents, uploadDocument, deleteDocument, getDownloadUrl, createFile } = useDocuments()
  const [currentUserName] = useState("Sam Lee")
  const pf = isFieldEnabled
  const [isCoordinatorOpen, setIsCoordinatorOpen] = useState(false)
  const [coordinatorSearch, setCoordinatorSearch] = useState("")
  const coordinatorInputRef = useRef<HTMLInputElement>(null)

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

  const [isQuickAdding, setIsQuickAdding] = useState(false)
  const [quickTitle, setQuickTitle] = useState("")
  const [quickDueDate, setQuickDueDate] = useState(getTodayStr)
  const [quickTime, setQuickTime] = useState("")
  const [quickCharge, setQuickCharge] = useState("")
  const [quickAssignee, setQuickAssignee] = useState("")
  const [isQuickAssigneeOpen, setIsQuickAssigneeOpen] = useState(false)
  const [quickAssigneeSearch, setQuickAssigneeSearch] = useState("")
  const [quickAssigneeIdx, setQuickAssigneeIdx] = useState(-1)
  const [quickActiveField, setQuickActiveField] = useState<"title" | "assignee" | "charge" | "time" | null>("title")
  const [isQuickChargeOpen, setIsQuickChargeOpen] = useState(false)
  const [quickChargeSearch, setQuickChargeSearch] = useState("")
  const [quickChargeIdx, setQuickChargeIdx] = useState(-1)
  const quickInputRef = useRef<HTMLInputElement>(null)
  const quickAssigneeInputRef = useRef<HTMLInputElement>(null)
  const quickAssigneeListRef = useRef<HTMLDivElement>(null)
  const quickTimeRef = useRef<HTMLInputElement>(null)
  const quickChargeInputRef = useRef<HTMLInputElement>(null)
  const quickChargeListRef = useRef<HTMLDivElement>(null)

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
    if (quickAssigneeIdx >= 0 && quickAssigneeListRef.current) {
      const items = quickAssigneeListRef.current.children
      if (items[quickAssigneeIdx]) (items[quickAssigneeIdx] as HTMLElement).scrollIntoView({ block: "nearest" })
    }
  }, [quickAssigneeIdx])

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
    setQuickAssignee("")
    setIsQuickAssigneeOpen(false)
    setQuickAssigneeSearch("")
    setQuickAssigneeIdx(-1)
    setIsQuickChargeOpen(false)
    setQuickChargeSearch("")
    setQuickChargeIdx(-1)
    setQuickActiveField("title")
  }, [])
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

  const clientFolder = client?.displayName ?? ""
  const clientDocuments = useMemo(() =>
    documents.filter((d) => d.folder === clientFolder || d.folder.startsWith(clientFolder + "/"))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [documents, clientFolder]
  )
  const fileUploadRef = useRef<HTMLInputElement>(null)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [isFilesAddNewOpen, setIsFilesAddNewOpen] = useState(false)
  const [isNewSubfileOpen, setIsNewSubfileOpen] = useState(false)
  const [newSubfileName, setNewSubfileName] = useState("")

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
  ).sort((a, b) => {
    if (a.status === "done" && b.status !== "done") return 1
    if (a.status !== "done" && b.status === "done") return -1
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    createFile(clientFolder)
    for (const file of Array.from(e.target.files)) {
      await uploadDocument(file, clientFolder)
    }
    e.target.value = ""
  }

  const handleDownloadDoc = async (doc: Document) => {
    const url = await getDownloadUrl(doc.storagePath)
    if (url) window.open(url, "_blank")
  }

  const chargeCode = (itemNumber: string) => {
    const charge = allCharges.find((c) => c.itemNumber === itemNumber)
    return charge?.shortName || itemNumber
  }

  const handleQuickFinish = async () => {
    const title = quickTitle.trim()
    if (!title) return
    await addTask({
      title,
      description: "",
      status: "todo",
      assignee: canAssignTasks ? quickAssignee : currentUserName,
      client: client.displayName,
      dueDate: quickDueDate || null,
      attachments: [],
      chargeType: quickCharge,
      timeSpent: quickTime ? parseTimeInput(quickTime) : 0,
    })
    resetQuickAdd()
    if (activeTab !== "tasks") setActiveTab("tasks")
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
        {/* Profile header bar */}
        <div ref={headerRef} className="relative flex h-[48px] shrink-0 items-center overflow-hidden bg-[#f8f6f3] px-[16px]">
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[#e8ddd0] via-[#e0d6c8] to-[#e8ddd0]" />

          <button
            onClick={() => router.push("/clients")}
            className="mr-[6px] flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded text-[#999] transition-colors hover:bg-[#efe9e1] hover:text-[#262626]"
            tabIndex={0}
            aria-label="Back to clients"
          >
            <ArrowLeft className="h-[15px] w-[15px]" strokeWidth={1.75} />
          </button>

          <ClientIcon client={client} size="sm" />
          <span className="ml-[8px] mr-[12px] max-w-[180px] shrink-0 truncate text-[14px] font-semibold text-[#262626]">{client.displayName}</span>

          {/* Hidden measurer for tab widths */}
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

          <div ref={tabsContainerRef} className="flex flex-1 items-center gap-[2px] overflow-hidden">
            {tabs.slice(0, visibleTabCount).map((tab) => {
              const TabIcon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex shrink-0 items-center gap-[4px] rounded-[5px] px-[8px] py-[4px] text-[12px] font-medium transition-colors ${isActive ? "bg-[#ebe5dc] text-[#262626]" : "text-[#888] hover:bg-[#efe9e1] hover:text-[#262626]"}`}
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
                  className={`flex shrink-0 items-center gap-[3px] rounded-[5px] px-[6px] py-[4px] text-[12px] font-medium transition-colors ${isTabOverflowOpen ? "bg-[#ebe5dc] text-[#262626]" : "text-[#888] hover:bg-[#efe9e1] hover:text-[#262626]"}`}
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

          <div className="flex shrink-0 items-center gap-[6px] pl-[8px]">
            <button
              ref={createBtnRef}
              onClick={() => setIsCreateOpen(!isCreateOpen)}
              className="flex items-center gap-[5px] rounded-[6px] border border-[#ddd5ca] bg-white px-[10px] py-[5px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#efe9e1]"
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
                    onClick={() => { setIsCreateOpen(false); setIsQuickAdding(true); if (client.owner) setQuickAssignee(client.owner); setQuickActiveField("title"); setTimeout(() => quickInputRef.current?.focus(), 0) }}
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
            {isQuickAdding && (
              <>
                <div className="fixed inset-0 z-[48]" onClick={resetQuickAdd} />
                <div
                  className="fixed z-[49] w-[520px] rounded-lg border border-[#e0e0e0] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                  style={(() => {
                    const rect = createBtnRef.current?.getBoundingClientRect()
                    if (!rect) return {}
                    return { top: rect.bottom + 6, right: window.innerWidth - rect.right }
                  })()}
                >
                  <div className="px-[16px] pt-[14px]">
                    <input
                      ref={quickInputRef}
                      type="text"
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      onFocus={() => setQuickActiveField("title")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && quickTitle.trim()) {
                          e.preventDefault()
                          if (canAssignTasks) { setQuickActiveField("assignee"); quickAssigneeInputRef.current?.focus() }
                          else { setQuickActiveField("charge"); quickChargeInputRef.current?.focus() }
                        }
                        if (e.key === "Escape") resetQuickAdd()
                      }}
                      placeholder="Task name..."
                      className="w-full text-[15px] font-medium text-[#262626] placeholder-[#bbb] outline-none"
                      autoFocus
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-[6px] px-[16px] pb-[4px] pt-[10px]">
                    <div className="flex items-center gap-[5px] rounded border border-[#e0e0e0] bg-[#f5f5f5] px-[8px] py-[3px]">
                      <Building2 className="h-[12px] w-[12px] shrink-0 text-[#888]" strokeWidth={1.5} />
                      <span className="text-[12px] font-medium text-[#262626]">{client.displayName}</span>
                    </div>

                    {canAssignTasks && <div className="relative">
                      {(() => {
                        const filteredStaff = quickAssigneeSearch
                          ? staffNames.filter((n) => n.toLowerCase().includes(quickAssigneeSearch.toLowerCase()))
                          : staffNames
                        const selectAssignee = (name: string) => {
                          setQuickAssignee(name)
                          setIsQuickAssigneeOpen(false)
                          setQuickAssigneeIdx(-1)
                          setQuickAssigneeSearch("")
                          setQuickActiveField("charge")
                          setTimeout(() => quickChargeInputRef.current?.focus(), 50)
                        }
                        return (
                          <>
                            <div className={`flex items-center gap-[5px] rounded border px-[8px] py-[3px] transition-colors ${quickActiveField === "assignee" ? "border-blue-400" : "border-[#e0e0e0]"}`}>
                              <User className={`h-[12px] w-[12px] shrink-0 ${quickAssignee ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                              <input
                                ref={quickAssigneeInputRef}
                                type="text"
                                value={isQuickAssigneeOpen ? quickAssigneeSearch : quickAssignee}
                                onChange={(e) => { setQuickAssigneeSearch(e.target.value); if (!isQuickAssigneeOpen) setIsQuickAssigneeOpen(true); setQuickAssigneeIdx(0) }}
                                onFocus={() => { setQuickActiveField("assignee"); setIsQuickAssigneeOpen(true); setQuickAssigneeSearch(""); setQuickAssigneeIdx(0) }}
                                onKeyDown={(e) => {
                                  if (isQuickAssigneeOpen) {
                                    const total = filteredStaff.length
                                    if (e.key === "ArrowDown") { e.preventDefault(); setQuickAssigneeIdx((prev) => (prev + 1) % Math.max(total, 1)) }
                                    else if (e.key === "ArrowUp") { e.preventDefault(); setQuickAssigneeIdx((prev) => (prev - 1 + Math.max(total, 1)) % Math.max(total, 1)) }
                                    else if (e.key === "Enter") {
                                      e.preventDefault()
                                      if (filteredStaff.length > 0) {
                                        const idx = quickAssigneeIdx >= 0 && quickAssigneeIdx < filteredStaff.length ? quickAssigneeIdx : 0
                                        selectAssignee(filteredStaff[idx])
                                      } else selectAssignee("")
                                    } else if (e.key === "Tab" && !e.shiftKey) {
                                      e.preventDefault()
                                      if (filteredStaff.length > 0) {
                                        const idx = quickAssigneeIdx >= 0 && quickAssigneeIdx < filteredStaff.length ? quickAssigneeIdx : 0
                                        selectAssignee(filteredStaff[idx])
                                      } else {
                                        setIsQuickAssigneeOpen(false); setQuickAssigneeSearch("")
                                        setQuickActiveField("charge"); setTimeout(() => quickChargeInputRef.current?.focus(), 50)
                                      }
                                    }
                                  } else {
                                    if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); setQuickActiveField("charge"); quickChargeInputRef.current?.focus() }
                                  }
                                  if (e.key === "Escape") {
                                    if (isQuickAssigneeOpen) { e.stopPropagation(); setIsQuickAssigneeOpen(false); setQuickAssigneeSearch(""); setQuickAssigneeIdx(-1) }
                                    else resetQuickAdd()
                                  }
                                }}
                                placeholder="Assignee"
                                className="w-[80px] bg-transparent text-[12px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                              />
                            </div>
                            {isQuickAssigneeOpen && (
                              <>
                                <div className="fixed inset-0 z-[59]" onClick={() => { setIsQuickAssigneeOpen(false); setQuickAssigneeIdx(-1); setQuickAssigneeSearch("") }} />
                                <div ref={quickAssigneeListRef} className="absolute left-0 top-full z-[60] mt-[4px] max-h-[200px] w-[220px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                                  {filteredStaff.length === 0 ? (
                                    <div className="px-[12px] py-[7px] text-[12px] font-medium text-[#888]">No matches</div>
                                  ) : (
                                    filteredStaff.map((name, i) => {
                                      const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                                      return (
                                        <div
                                          key={name}
                                          onClick={() => selectAssignee(name)}
                                          className={`flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${quickAssigneeIdx === i ? "bg-blue-50" : ""}`}
                                          role="option"
                                          aria-selected={quickAssigneeIdx === i}
                                        >
                                          <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-[#d4d4d4] text-[8px] font-semibold text-[#555]">
                                            {initials}
                                          </div>
                                          {name}
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              </>
                            )}
                          </>
                        )
                      })()}
                    </div>}
                  </div>

                  <div className="flex flex-wrap items-center gap-[6px] px-[16px] pb-[12px] pt-[8px]">
                    <div className="relative">
                      {(() => {
                        const filteredCharges = quickChargeSearch
                          ? chargeTypes.filter((ct) => ct.label.toLowerCase().includes(quickChargeSearch.toLowerCase()) || ct.value.toLowerCase().includes(quickChargeSearch.toLowerCase()))
                          : chargeTypes
                        const selectCharge = (value: string) => {
                          setQuickCharge(value)
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
                                type="text"
                                value={isQuickChargeOpen ? quickChargeSearch : (quickCharge ? chargeLabel(quickCharge) : "")}
                                onChange={(e) => { setQuickChargeSearch(e.target.value); if (!isQuickChargeOpen) setIsQuickChargeOpen(true); setQuickChargeIdx(0) }}
                                onFocus={() => { setQuickActiveField("charge"); setIsQuickChargeOpen(true); setQuickChargeSearch(""); setQuickChargeIdx(0) }}
                                onKeyDown={(e) => {
                                  if (isQuickChargeOpen) {
                                    const total = filteredCharges.length
                                    if (e.key === "ArrowDown") { e.preventDefault(); setQuickChargeIdx((prev) => (prev + 1) % Math.max(total, 1)) }
                                    else if (e.key === "ArrowUp") { e.preventDefault(); setQuickChargeIdx((prev) => (prev - 1 + Math.max(total, 1)) % Math.max(total, 1)) }
                                    else if (e.key === "Enter") {
                                      e.preventDefault()
                                      if (filteredCharges.length > 0) {
                                        const idx = quickChargeIdx >= 0 && quickChargeIdx < filteredCharges.length ? quickChargeIdx : 0
                                        selectCharge(filteredCharges[idx].value)
                                      } else selectCharge("")
                                    } else if (e.key === "Tab" && !e.shiftKey) {
                                      e.preventDefault()
                                      if (filteredCharges.length > 0) {
                                        const idx = quickChargeIdx >= 0 && quickChargeIdx < filteredCharges.length ? quickChargeIdx : 0
                                        selectCharge(filteredCharges[idx].value)
                                      } else {
                                        setIsQuickChargeOpen(false); setQuickChargeSearch("")
                                        setQuickActiveField("time"); setTimeout(() => quickTimeRef.current?.focus(), 50)
                                      }
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
                                className="w-[80px] bg-transparent text-[12px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                              />
                            </div>
                            {isQuickChargeOpen && (
                              <>
                                <div className="fixed inset-0 z-[59]" onClick={() => { setIsQuickChargeOpen(false); setQuickChargeIdx(-1); setQuickChargeSearch("") }} />
                                <div ref={quickChargeListRef} className="absolute left-0 top-full z-[60] mt-[4px] max-h-[220px] w-[200px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                                  {filteredCharges.length === 0 ? (
                                    <div className="px-[12px] py-[7px] text-[12px] font-medium text-[#888]">No matches</div>
                                  ) : (
                                    filteredCharges.map((ct, i) => (
                                      <div
                                        key={ct.value || "__none__"}
                                        onClick={() => selectCharge(ct.value)}
                                        className={`flex w-full cursor-pointer items-center px-[12px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${quickChargeIdx === i ? "bg-blue-50" : ""} ${ct.value ? "text-[#262626]" : "text-[#888]"}`}
                                        role="option"
                                        aria-selected={quickChargeIdx === i}
                                      >
                                        {ct.label}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </>
                            )}
                          </>
                        )
                      })()}
                    </div>

                    <div className="flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px]">
                      <Clock className={`h-[12px] w-[12px] ${quickTime ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                      <input
                        ref={quickTimeRef}
                        type="text"
                        value={quickTime}
                        onChange={(e) => setQuickTime(e.target.value)}
                        onFocus={() => setQuickActiveField("time")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) { e.preventDefault(); handleQuickFinish() }
                          if (e.key === "Escape") resetQuickAdd()
                        }}
                        placeholder="0m"
                        className="w-[40px] bg-transparent text-[12px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#f0f0f0] px-[16px] py-[10px]">
                    <span className="text-[11px] font-medium text-[#ccc]">Enter ↵ next · Esc close</span>
                    <div className="flex items-center gap-[6px]">
                      <button type="button" onClick={resetQuickAdd} className="rounded px-[8px] py-[4px] text-[12px] font-medium text-[#999] transition-colors hover:bg-[#f0f0f0]" tabIndex={0}>Cancel</button>
                      <button type="button" onClick={handleQuickFinish} disabled={!quickTitle.trim()} className="primary-btn rounded-[4px] px-[12px] py-[4px] text-[12px] font-medium transition-colors disabled:opacity-40" style={{ backgroundColor: "var(--primary-color)" }} tabIndex={0}>Create</button>
                    </div>
                  </div>
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
                  className="primary-btn flex items-center gap-[5px] rounded-[4px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
                  style={{ backgroundColor: "var(--primary-color)" }}
                  tabIndex={0}
                >
                  <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>Add new</span>
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

            </div>
          ) : activeTab === "tasks" ? (
            <ProfileTasksTab
              tasks={clientTasks}
              chargeCode={chargeCode}
              onToggleComplete={(task) => updateTask(task.id, { status: task.status === "done" ? "todo" : "done" })}
            />
          ) : activeTab === "files" ? (
            <div className="relative flex h-full flex-col">
              <input ref={fileUploadRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
              <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-[#dcdcdc] px-[16px]">
                <span className="text-[12px] font-medium text-[#888]">{clientDocuments.length} {clientDocuments.length === 1 ? "file" : "files"}</span>
                <div className="relative">
                  <button
                    onClick={() => setIsFilesAddNewOpen(!isFilesAddNewOpen)}
                    className="primary-btn flex items-center gap-[5px] rounded-[4px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
                    style={{ backgroundColor: "var(--primary-color)" }}
                    tabIndex={0}
                    aria-label="Add new"
                  >
                    <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                    <span>Add new</span>
                  </button>
                  {isFilesAddNewOpen && (
                    <>
                      <div className="fixed inset-0 z-[29]" onClick={() => setIsFilesAddNewOpen(false)} />
                      <div className="absolute right-0 top-full z-[30] mt-[4px] w-[180px] rounded-[6px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                        <button
                          onClick={() => { setIsFilesAddNewOpen(false); fileUploadRef.current?.click() }}
                          className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                          tabIndex={0}
                        >
                          <Upload className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                          Upload
                        </button>
                        <button
                          onClick={() => { setIsFilesAddNewOpen(false); setIsNewSubfileOpen(true) }}
                          className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                          tabIndex={0}
                        >
                          <FilePlus className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                          New file
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {isNewSubfileOpen && (
                <div className="flex items-center gap-[8px] border-b border-[#dcdcdc] px-[16px] py-[8px]">
                  <FilePlus className="h-[14px] w-[14px] shrink-0 text-[#888]" strokeWidth={1.5} />
                  <input
                    autoFocus
                    value={newSubfileName}
                    onChange={(e) => setNewSubfileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newSubfileName.trim()) {
                        createFile(newSubfileName.trim(), clientFolder)
                        setNewSubfileName("")
                        setIsNewSubfileOpen(false)
                      }
                      if (e.key === "Escape") { setNewSubfileName(""); setIsNewSubfileOpen(false) }
                    }}
                    placeholder="File name"
                    className="min-w-0 flex-1 rounded border border-[#a3c4f3] bg-white px-[8px] py-[4px] text-[13px] font-medium text-[#262626] outline-none shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
                  />
                  <button
                    onClick={() => {
                      if (newSubfileName.trim()) {
                        createFile(newSubfileName.trim(), clientFolder)
                        setNewSubfileName("")
                        setIsNewSubfileOpen(false)
                      }
                    }}
                    className="rounded bg-[#262626] px-[10px] py-[4px] text-[12px] font-medium text-white transition-colors hover:bg-[#3d3d3d]"
                    tabIndex={0}
                  >
                    Create
                  </button>
                  <button
                    onClick={() => { setNewSubfileName(""); setIsNewSubfileOpen(false) }}
                    className="rounded p-[4px] text-[#999] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                    tabIndex={0}
                    aria-label="Cancel"
                  >
                    <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
                  </button>
                </div>
              )}

              {clientDocuments.length === 0 && !isNewSubfileOpen ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-[8px]">
                  <FolderOpen className="h-[32px] w-[32px] text-[#ccc]" strokeWidth={1.5} />
                  <p className="text-[13px] font-medium text-[#bbb]">No files yet</p>
                  <button
                    onClick={() => setIsFilesAddNewOpen(true)}
                    className="primary-btn mt-[4px] flex items-center gap-[5px] rounded-[4px] px-[10px] py-[6px] text-[13px] font-medium transition-colors"
                    style={{ backgroundColor: "var(--primary-color)" }}
                    tabIndex={0}
                  >
                    <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                    Add new
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="w-full border-separate border-spacing-0 text-left">
                    <thead>
                      <tr>
                        <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Name</th>
                        <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Size</th>
                        <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Uploaded</th>
                        <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientDocuments.map((doc) => {
                        const DocIcon = getDocIcon(doc.mimeType)
                        return (
                          <tr key={doc.id} className="group transition-colors hover:bg-[#f5f5f5]">
                            <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">
                              <button
                                onClick={() => setPreviewDoc(doc)}
                                className="flex items-center gap-[8px] transition-colors hover:text-blue-600"
                                tabIndex={0}
                              >
                                <DocIcon className="h-[14px] w-[14px] shrink-0 text-[#888]" strokeWidth={1.5} />
                                <span className="truncate">{doc.name}</span>
                              </button>
                            </td>
                            <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] text-[#666]">{formatFileSize(doc.size)}</td>
                            <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] text-[#666]">{formatDate(doc.createdAt)}</td>
                            <td className="h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px]">
                              <div className="flex items-center gap-[4px] opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  onClick={() => handleDownloadDoc(doc)}
                                  className="rounded p-[4px] text-[#888] transition-colors hover:bg-[#eee] hover:text-[#262626]"
                                  tabIndex={0}
                                  aria-label={`Download ${doc.name}`}
                                >
                                  <Download className="h-[14px] w-[14px]" strokeWidth={1.5} />
                                </button>
                                <button
                                  onClick={() => deleteDocument(doc)}
                                  className="rounded p-[4px] text-[#888] transition-colors hover:bg-[#fee] hover:text-red-500"
                                  tabIndex={0}
                                  aria-label={`Delete ${doc.name}`}
                                >
                                  <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.5} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
            {/* Coordinator assignment */}
            <div className="mb-[8px] mt-[10px]">
              <SidebarDetailRow icon={User} label="Coordinator">
                {canAssignClients ? (
                  <div className="relative">
                    <button
                      onClick={() => { setIsCoordinatorOpen(!isCoordinatorOpen); setTimeout(() => coordinatorInputRef.current?.focus(), 50) }}
                      className="flex min-w-0 items-center gap-[6px] rounded px-[6px] py-[3px] text-[13px] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                    >
                      {client.owner ? (
                        <>
                          <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-semibold text-blue-600">
                            {client.owner.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <span className="truncate font-medium text-[#262626]">{client.owner}</span>
                        </>
                      ) : (
                        <span className="font-medium text-[#ccc]">Assign coordinator</span>
                      )}
                      <ChevronDown className="ml-[2px] h-[10px] w-[10px] shrink-0 text-[#bbb]" strokeWidth={1.5} />
                    </button>
                    {isCoordinatorOpen && (
                      <>
                        <div className="fixed inset-0 z-[49]" onClick={() => { setIsCoordinatorOpen(false); setCoordinatorSearch("") }} />
                        <div className="absolute left-0 top-full z-[50] mt-[4px] w-[240px] overflow-hidden rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                          <div className="border-b border-[#f0f0f0] px-[12px] py-[8px]">
                            <input
                              ref={coordinatorInputRef}
                              value={coordinatorSearch}
                              onChange={(e) => setCoordinatorSearch(e.target.value)}
                              placeholder="Search staff..."
                              className="w-full text-[13px] text-[#262626] placeholder-[#ccc] outline-none"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-[200px] overflow-y-auto py-[4px]">
                            <button
                              onClick={() => { updateClient(client.id, { owner: "" }); setIsCoordinatorOpen(false); setCoordinatorSearch("") }}
                              className="flex w-full items-center px-[12px] py-[8px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5]"
                              tabIndex={0}
                            >
                              None
                            </button>
                            {staffNames
                              .filter((n) => !coordinatorSearch || n.toLowerCase().includes(coordinatorSearch.toLowerCase()))
                              .map((name) => {
                                const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                                const isSelected = client.owner === name
                                return (
                                  <button
                                    key={name}
                                    onClick={() => { updateClient(client.id, { owner: name }); setIsCoordinatorOpen(false); setCoordinatorSearch("") }}
                                    className={`flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isSelected ? "bg-blue-50 text-blue-600" : "text-[#262626]"}`}
                                    tabIndex={0}
                                  >
                                    <div className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${isSelected ? "bg-blue-100 text-blue-600" : "bg-[#e8e8e8] text-[#666]"}`}>
                                      {initials}
                                    </div>
                                    {name}
                                    {isSelected && <span className="ml-auto text-[11px] text-blue-500">✓</span>}
                                  </button>
                                )
                              })
                            }
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-[6px] px-[6px] py-[3px]">
                    {client.owner ? (
                      <>
                        <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-semibold text-blue-600">
                          {client.owner.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <span className="text-[13px] font-medium text-[#262626]">{client.owner}</span>
                      </>
                    ) : (
                      <span className="text-[13px] font-medium text-[#ccc]">No coordinator</span>
                    )}
                  </div>
                )}
              </SidebarDetailRow>
            </div>

            <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Personal Information</h3>
            {pf("p-first-name") && <SidebarDetailRow icon={User} label="First Name">
              <SidebarEditableField value={p.firstName} onChange={(v) => handleUpdateField("firstName", v)} placeholder="First name" />
            </SidebarDetailRow>}
            {pf("p-middle-name") && <SidebarDetailRow icon={User} label="Middle Name">
              <SidebarEditableField value={p.middleName} onChange={(v) => handleUpdateField("middleName", v)} placeholder="Middle name" />
            </SidebarDetailRow>}
            {pf("p-last-name") && <SidebarDetailRow icon={User} label="Last Name">
              <SidebarEditableField value={p.lastName} onChange={(v) => handleUpdateField("lastName", v)} placeholder="Last name" />
            </SidebarDetailRow>}
            {pf("p-preferred-name") && <SidebarDetailRow icon={Heart} label="Preferred">
              <SidebarEditableField value={p.preferredName} onChange={(v) => handleUpdateField("preferredName", v)} placeholder="Preferred name" />
            </SidebarDetailRow>}
            {pf("p-date-of-birth") && <SidebarDetailRow icon={CalendarDays} label="Date of Birth">
              <SidebarEditableField value={p.dateOfBirth} onChange={(v) => handleUpdateField("dateOfBirth", v)} type="date" placeholder="Date of birth" />
            </SidebarDetailRow>}
            {pf("p-primary-diagnosis") && <SidebarDetailRow icon={Stethoscope} label="Primary Dx">
              <SidebarDiagnosisChip value={p.primaryDiagnosis} onChange={(v) => handleUpdateField("primaryDiagnosis", v)} placeholder="Add diagnosis" />
            </SidebarDetailRow>}
            {pf("p-secondary-diagnosis") && <SidebarDetailRow icon={Stethoscope} label="Secondary Dx">
              <SidebarDiagnosisChip value={p.secondaryDiagnosis} onChange={(v) => handleUpdateField("secondaryDiagnosis", v)} placeholder="Add diagnosis" />
            </SidebarDetailRow>}

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
                {pf("p-gender") && <SidebarDetailRow icon={User} label="Gender">
                  <SidebarEditableField value={p.gender} onChange={(v) => handleUpdateField("gender", v)} type="select" options={["Male", "Female", "Non-binary", "Other", "Prefer not to say"]} />
                </SidebarDetailRow>}
                {pf("p-pronouns") && <SidebarDetailRow icon={MessageSquare} label="Pronouns">
                  <SidebarEditableField value={p.pronouns} onChange={(v) => handleUpdateField("pronouns", v)} type="select" options={["He/Him", "She/Her", "They/Them", "Other"]} />
                </SidebarDetailRow>}
                {pf("p-ethnicity") && <SidebarDetailRow icon={Globe} label="Ethnicity">
                  <SidebarEditableField value={p.ethnicity} onChange={(v) => handleUpdateField("ethnicity", v)} placeholder="Ethnicity" />
                </SidebarDetailRow>}
                {pf("p-language") && <SidebarDetailRow icon={Languages} label="Language">
                  <SidebarEditableField value={p.language} onChange={(v) => handleUpdateField("language", v)} placeholder="Language" />
                </SidebarDetailRow>}

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Contact Information</h3>
                {pf("p-email") && <SidebarDetailRow icon={Mail} label="Email">
                  <SidebarContactChip value={p.email} onChange={(v) => handleUpdateField("email", v)} placeholder="Email address" />
                </SidebarDetailRow>}
                {pf("p-mobile") && <SidebarDetailRow icon={Smartphone} label="Mobile">
                  <SidebarContactChip value={p.mobile} onChange={(v) => handleUpdateField("mobile", v)} placeholder="Mobile number" />
                </SidebarDetailRow>}
                {pf("p-phone") && <SidebarDetailRow icon={Phone} label="Phone">
                  <SidebarContactChip value={p.phone} onChange={(v) => handleUpdateField("phone", v)} placeholder="Phone number" />
                </SidebarDetailRow>}
                {pf("p-contact-method") && <SidebarDetailRow icon={MessageSquare} label="Contact">
                  <SidebarEditableField value={p.preferredContactMethod} onChange={(v) => handleUpdateField("preferredContactMethod", v)} type="select" options={["SMS", "Email", "Call (Mobile)", "Call (Phone)"]} />
                </SidebarDetailRow>}
                {pf("p-sign-method") && <SidebarDetailRow icon={PenLine} label="Sign Method">
                  <SidebarEditableField value={p.preferredSignMethod} onChange={(v) => handleUpdateField("preferredSignMethod", v)} type="select" options={["In Person", "Electronically"]} />
                </SidebarDetailRow>}

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Reference Numbers</h3>
                {pf("p-ndis-number") && <SidebarDetailRow icon={Hash} label="NDIS">
                  <SidebarContactChip value={p.ndisNumber} onChange={(v) => handleUpdateField("ndisNumber", v)} placeholder="NDIS number" variant="white" />
                </SidebarDetailRow>}
                {pf("p-medicare-number") && <SidebarDetailRow icon={Hash} label="Medicare">
                  <SidebarContactChip value={p.medicareNumber} onChange={(v) => handleUpdateField("medicareNumber", v)} placeholder="Medicare number" variant="white" />
                </SidebarDetailRow>}
                {pf("p-centrelink-number") && <SidebarDetailRow icon={Hash} label="Centrelink">
                  <SidebarContactChip value={p.centrelinkNumber} onChange={(v) => handleUpdateField("centrelinkNumber", v)} placeholder="Centrelink number" variant="white" />
                </SidebarDetailRow>}
                {pf("p-external-id") && <SidebarDetailRow icon={Hash} label="External ID">
                  <SidebarContactChip value={p.externalId} onChange={(v) => handleUpdateField("externalId", v)} placeholder="External ID" variant="white" />
                </SidebarDetailRow>}

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
                {pf("p-service-start") && <SidebarDetailRow icon={CalendarDays} label="Service Start">
                  <SidebarEditableField value={p.serviceCommencementDate} onChange={(v) => handleUpdateField("serviceCommencementDate", v)} type="date" placeholder="Start date" />
                </SidebarDetailRow>}
                {pf("p-service-exit") && <SidebarDetailRow icon={CalendarDays} label="Service Exit">
                  <SidebarEditableField value={p.serviceExitDate} onChange={(v) => handleUpdateField("serviceExitDate", v)} type="date" placeholder="Exit date" />
                </SidebarDetailRow>}
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

      {/* Create contact modal — rendered at component level so it works from any tab */}
      {isAddContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => { setIsAddContactOpen(false); setIsRelationshipOpen(false); setNewContact({ firstName: "", email: "", phone: "", relationship: "" }) }} />
          <div className="relative z-10 w-[440px] rounded-lg bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
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

            <div className="px-[24px] pb-[20px] pt-[16px]">
              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Account</label>
                <div className="flex h-[36px] items-center rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px]">
                  <div className="flex items-center gap-[6px]">
                    <ClientIcon client={client} size="sm" />
                    <span className="text-[13px] font-medium text-[#262626]">{client.displayName}</span>
                  </div>
                </div>
              </div>

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
