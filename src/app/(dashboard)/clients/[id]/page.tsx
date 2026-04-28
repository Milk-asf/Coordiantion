"use client"

import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from "react"
import { useParams, useRouter } from "next/navigation"
import { useContacts } from "@/lib/hooks/use-contacts"
import { useClients } from "@/lib/hooks/use-clients"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useCharges } from "@/lib/hooks/use-charges"
import { useInvoices } from "@/lib/hooks/use-invoices"
import { relationshipConfig } from "@/lib/types"
import { useFieldConfig } from "@/lib/hooks/use-field-config"
import { useStaff } from "@/lib/hooks/use-staff"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useDocuments } from "@/lib/hooks/use-documents"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { Client, ParticipantDetails, Task, Document, NdisPlan, PlanService, FundingReleasePeriod, Budget, BudgetLineItem, BudgetPeriod, ActivityEntry } from "@/lib/types"
import { ndisCharges, chargeCategories } from "@/lib/ndis-charges"
import { EntityIcon } from "@/components/entity-icon"
import { EditableField } from "@/components/editable-field"
import { ContactChip } from "@/components/contact-chip"
import { DetailRow } from "@/components/detail-row"
import { DocumentPreview } from "@/components/document-preview"
import { DatePicker } from "@/components/date-picker"
import {
  FileText,
  User,
  PenLine,
  Hash,
  CalendarDays,
  Clock,
  ChevronDown,
  Plus,
  SquarePen,
  CheckSquare,
  UserPlus,
  Users,
  ArrowLeft,
  FolderOpen,
  FilePlus,
  PanelRightOpen,
  PanelRightClose,
  ListFilter,
  X,
  Building2,
  Tag,
  Upload,
  Download,
  Trash2,
  File,
  FileImage,
  FileSpreadsheet,
  FileVideo,
  ClipboardList,
  DollarSign,
  MoreHorizontal,
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
  { key: "plan", label: "Plan", icon: ClipboardList },
  { key: "budgets", label: "Budgets", icon: DollarSign },
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
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function SidebarDetailRow({ icon: Icon, label, children }: { icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; children: React.ReactNode }) {
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
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })
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
  const { invoices } = useInvoices()
  const { isFieldEnabled } = useFieldConfig()
  const { staffNames } = useStaff()
  const { canAssignTasks, canAssignClients } = usePermissions()
  const { documents, uploadDocument, deleteDocument, getDownloadUrl, createFile } = useDocuments()
  const { activeWorkspace, currentUserName } = useWorkspace()
  const pf = isFieldEnabled
  const [isCoordinatorOpen, setIsCoordinatorOpen] = useState(false)
  const [coordinatorSearch, setCoordinatorSearch] = useState("")
  const coordinatorInputRef = useRef<HTMLInputElement>(null)

  const [isAddContactOpen, setIsAddContactOpen] = useState(false)
  const [newContact, setNewContact] = useState({ firstName: "", email: "", phone: "", relationship: "" })
  const [isRelationshipOpen, setIsRelationshipOpen] = useState(false)
  const [visibleTabCount, setVisibleTabCount] = useState(tabs.length)
  const [isTabOverflowOpen, setIsTabOverflowOpen] = useState(false)
  const tabWidthsRef = useRef<number[]>([])
  const overflowBtnRef = useRef<HTMLButtonElement>(null)
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
      if (!tabsContainerRef.current) return
      const availableWidth = tabsContainerRef.current.offsetWidth
      const overflowBtnWidth = 40
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

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [planStartDate, setPlanStartDate] = useState("")
  const [planEndDate, setPlanEndDate] = useState("")
  const [planIsPace, setPlanIsPace] = useState(false)
  const [planFile, setPlanFile] = useState<File | null>(null)
  const [planStartPickerOpen, setPlanStartPickerOpen] = useState(false)
  const [planEndPickerOpen, setPlanEndPickerOpen] = useState(false)
  const [isSavingPlan, setIsSavingPlan] = useState(false)
  const planFileInputRef = useRef<HTMLInputElement>(null)

  const [addingServiceToPlanId, setAddingServiceToPlanId] = useState<string | null>(null)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [editingServicePlanId, setEditingServicePlanId] = useState<string | null>(null)
  const [svcName, setSvcName] = useState("")
  const [svcCategory, setSvcCategory] = useState<"support-coordination" | "psychosocial-recovery" | "travel">("support-coordination")
  const [svcBudget, setSvcBudget] = useState("")
  const [svcChargeItems, setSvcChargeItems] = useState<string[]>([])
  const [svcReleasePeriodCount, setSvcReleasePeriodCount] = useState("")
  const [svcReleasePeriods, setSvcReleasePeriods] = useState<FundingReleasePeriod[]>([])
  const [isChargeDropdownOpen, setIsChargeDropdownOpen] = useState(false)

  const [isItemChargeDropdownOpen, setIsItemChargeDropdownOpen] = useState(false)
  const [isItemPeriodDropdownOpen, setIsItemPeriodDropdownOpen] = useState(false)

  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false)
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null)
  const [budgetName, setBudgetName] = useState("")
  const [budgetStartDate, setBudgetStartDate] = useState("")
  const [budgetEndDate, setBudgetEndDate] = useState("")
  const [budgetStartPickerOpen, setBudgetStartPickerOpen] = useState(false)
  const [budgetEndPickerOpen, setBudgetEndPickerOpen] = useState(false)
  const [hoveredOverviewDonut, setHoveredOverviewDonut] = useState<{ label: string, value: number, x: number, y: number } | null>(null)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState("")
  const [isActivityCollapsed, setIsActivityCollapsed] = useState(false)
  const [inlineSvcOpen, setInlineSvcOpen] = useState(false)
  const [inlineSvcEditingId, setInlineSvcEditingId] = useState<string | null>(null)

  const [addingItemToBudgetId, setAddingItemToBudgetId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemBudgetId, setEditingItemBudgetId] = useState<string | null>(null)
  const [itemChargeItemNumber, setItemChargeItemNumber] = useState("")
  const [itemBillingCode, setItemBillingCode] = useState("")
  const [itemServiceName, setItemServiceName] = useState("")
  const [itemQuantity, setItemQuantity] = useState("1")
  const [itemUnit, setItemUnit] = useState<"hour" | "each" | "km">("hour")
  const [itemPeriod, setItemPeriod] = useState<BudgetPeriod>("per-week")
  const [itemDescription, setItemDescription] = useState("")

  const clientInvoices = useMemo(() => {
    if (!client) return []
    return invoices.filter((inv) => inv.clientId === client.id)
  }, [invoices, client])

  const getServiceUsed = useCallback((svc: PlanService) => {
    let total = 0
    for (const inv of clientInvoices) {
      for (const li of inv.lineItems) {
        if (svc.enabledChargeItems.includes(li.chargeItemNumber)) total += li.amount
      }
    }
    return total
  }, [clientInvoices])

  const getBudgetUsed = useCallback((budget: Budget) => {
    let total = 0
    for (const inv of clientInvoices) {
      for (const li of inv.lineItems) {
        if (budget.chargeItems.includes(li.chargeItemNumber)) total += li.amount
      }
    }
    return total
  }, [clientInvoices])

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

  const handleSaveDescription = async () => {
    const trimmed = descriptionDraft.trim()
    const prev = client.participant.description || ""
    if (trimmed === prev) {
      setIsEditingDescription(false)
      return
    }
    const entry: ActivityEntry = {
      id: crypto.randomUUID(),
      type: "description_updated",
      message: "Updated the participant description",
      user: currentUserName,
      createdAt: new Date().toISOString(),
    }
    const existingLog = client.participant.activityLog || []
    await updateClient(client.id, {
      participant: { ...client.participant, description: trimmed, activityLog: [entry, ...existingLog] },
    })
    setIsEditingDescription(false)
  }

  const activityLog = client.participant.activityLog || []

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

  const handleSavePlan = async () => {
    if (!planStartDate || !planEndDate) return
    setIsSavingPlan(true)

    let documentPath: string | undefined
    let documentName: string | undefined
    let documentUrl: string | undefined

    if (planFile && isSupabaseConfigured() && activeWorkspace) {
      const supabase = createClient()
      if (supabase) {
        const ext = planFile.name.split(".").pop() || "pdf"
        const storagePath = `${activeWorkspace.id}/plans/${client.id}/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from("documents").upload(storagePath, planFile)
        if (!error) {
          const { data: urlData } = supabase.storage.from("documents").getPublicUrl(storagePath)
          documentPath = storagePath
          documentName = planFile.name
          documentUrl = urlData?.publicUrl
        }
      }
    }

    const existingPlans = client.participant.plans || []

    const existingLog = client.participant.activityLog || []

    if (editingPlanId) {
      const updatedPlans = existingPlans.map((pl) => {
        if (pl.id !== editingPlanId) return pl
        return {
          ...pl,
          startDate: planStartDate,
          endDate: planEndDate,
          isPacePlan: planIsPace,
          ...(documentPath ? { documentPath, documentName, documentUrl } : {}),
        }
      })
      const entry: ActivityEntry = {
        id: crypto.randomUUID(),
        type: "plan_updated",
        message: "Updated a plan",
        user: currentUserName,
        createdAt: new Date().toISOString(),
      }
      await updateClient(client.id, {
        participant: {
          ...client.participant,
          plans: updatedPlans,
          planStartDate,
          planEndDate,
          activityLog: [entry, ...existingLog],
        },
      })
    } else {
      const newPlanId = crypto.randomUUID()
      const newPlan: NdisPlan = {
        id: newPlanId,
        startDate: planStartDate,
        endDate: planEndDate,
        isPacePlan: planIsPace,
        documentPath,
        documentName,
        documentUrl,
        createdAt: new Date().toISOString(),
      }
      const entry: ActivityEntry = {
        id: crypto.randomUUID(),
        type: "plan_created",
        message: "Created a new plan",
        user: currentUserName,
        createdAt: new Date().toISOString(),
      }
      await updateClient(client.id, {
        participant: {
          ...client.participant,
          plans: [...existingPlans, newPlan],
          planStartDate,
          planEndDate,
          activityLog: [entry, ...existingLog],
        },
      })

      setIsSavingPlan(false)
      setEditingPlanId(newPlanId)
      setPlanStartDate(planStartDate)
      setPlanEndDate(planEndDate)
      setPlanIsPace(planIsPace)
      setPlanFile(null)
      setIsPlanModalOpen(true)
      setInlineSvcOpen(true)
      setInlineSvcEditingId(null)
      setAddingServiceToPlanId(newPlanId)
      setEditingServiceId(null)
      setEditingServicePlanId(null)
      setSvcName("")
      setSvcBudget("")
      setSvcChargeItems([])
      setSvcCategory("support-coordination")
      setSvcReleasePeriodCount("")
      setSvcReleasePeriods([])
      return
    }

    resetPlanForm()
    setIsSavingPlan(false)
  }

  const resetPlanForm = () => {
    setPlanStartDate("")
    setPlanEndDate("")
    setPlanIsPace(false)
    setPlanFile(null)
    setEditingPlanId(null)
    setIsPlanModalOpen(false)
    setInlineSvcOpen(false)
    setInlineSvcEditingId(null)
  }

  const initEditPlanForm = (plan: NdisPlan) => {
    setEditingPlanId(plan.id)
    setPlanStartDate(plan.startDate || "")
    setPlanEndDate(plan.endDate || "")
    setPlanIsPace(plan.isPacePlan || false)
    setPlanFile(null)
    setIsPlanModalOpen(true)
    setInlineSvcOpen(false)
    setInlineSvcEditingId(null)
  }

  const plans = client.participant.plans || []

  const resetServiceForm = () => {
    const wasInline = inlineSvcOpen
    setAddingServiceToPlanId(null)
    setEditingServiceId(null)
    setEditingServicePlanId(null)
    setSvcName("")
    setSvcCategory("support-coordination")
    setSvcBudget("")
    setSvcChargeItems([])
    setSvcReleasePeriodCount("")
    setSvcReleasePeriods([])
    setIsChargeDropdownOpen(false)
    setInlineSvcOpen(false)
    setInlineSvcEditingId(null)
    if (!wasInline) {
      const returnToPlanId = editingPlanId || addingServiceToPlanId || editingServicePlanId
      if (returnToPlanId) {
        const plan = (client.participant.plans || []).find((pl) => pl.id === returnToPlanId)
        if (plan) initEditPlanForm(plan)
      }
    }
  }

  const allServiceCharges = enabledCharges.filter((c) => c.category === "support-coordination" || c.category === "psychosocial-recovery" || c.category === "travel")

  const isServiceFormOpen = !!(addingServiceToPlanId || editingServiceId)

  const initServiceForm = (planId: string) => {
    setEditingServiceId(null)
    setEditingServicePlanId(null)
    setSvcChargeItems([])
    setSvcCategory("support-coordination")
    setAddingServiceToPlanId(planId)
    setSvcName("")
    setSvcBudget("")
    setSvcReleasePeriodCount("")
    setSvcReleasePeriods([])
    setIsChargeDropdownOpen(false)
    if (editingPlanId) {
      setInlineSvcOpen(true)
      setInlineSvcEditingId(null)
    } else {
      setIsPlanModalOpen(false)
      setIsSidebarVisible(true)
    }
  }

  const initEditServiceForm = (planId: string, service: PlanService) => {
    setAddingServiceToPlanId(null)
    setEditingServiceId(service.id)
    setEditingServicePlanId(planId)
    setSvcName(service.name)
    setSvcCategory(service.category)
    setSvcBudget(service.budget.toLocaleString("en-AU", { minimumFractionDigits: 2 }))
    setSvcChargeItems([...service.enabledChargeItems])
    setSvcReleasePeriodCount(service.releasePeriods.length > 0 ? service.releasePeriods.length.toString() : "")
    setSvcReleasePeriods([...service.releasePeriods])
    setIsChargeDropdownOpen(false)
    if (editingPlanId) {
      setInlineSvcOpen(true)
      setInlineSvcEditingId(service.id)
    } else {
      setIsPlanModalOpen(false)
      setIsSidebarVisible(true)
    }
  }

  const parseBudget = (val: string) => parseFloat(val.replace(/,/g, "")) || 0

  const formatBudgetDisplay = (val: string) => {
    const raw = val.replace(/[^0-9.]/g, "")
    const parts = raw.split(".")
    if (parts.length > 2) return val
    const intPart = parts[0]
    if (!intPart) return val
    const formatted = parseInt(intPart).toLocaleString("en-AU")
    return parts.length === 2 ? `${formatted}.${parts[1]}` : formatted
  }

  const handleReleasePeriodCountChange = (val: string) => {
    setSvcReleasePeriodCount(val)
    const count = parseInt(val)
    if (!count || count < 1) {
      setSvcReleasePeriods([])
      return
    }
    const budget = parseBudget(svcBudget)
    const perPeriod = budget > 0 ? Math.round((budget / count) * 100) / 100 : 0
    const periods: FundingReleasePeriod[] = []
    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1
      periods.push({ period: i + 1, amount: isLast ? Math.round((budget - perPeriod * i) * 100) / 100 : perPeriod })
    }
    setSvcReleasePeriods(periods)
  }

  const handleReleasePeriodAmountChange = (periodIdx: number, newAmount: number) => {
    const budget = parseBudget(svcBudget)
    const updated = [...svcReleasePeriods]
    updated[periodIdx] = { ...updated[periodIdx], amount: newAmount }
    const totalOthers = updated.reduce((sum, p, i) => i === periodIdx ? sum : sum + p.amount, 0)
    const remainingCount = updated.length - 1
    if (remainingCount > 0 && budget > 0) {
      const leftover = Math.max(budget - newAmount, 0)
      const otherShare = totalOthers > 0 ? leftover / totalOthers : leftover / remainingCount
      for (let i = 0; i < updated.length; i++) {
        if (i === periodIdx) continue
        updated[i] = { ...updated[i], amount: Math.round((totalOthers > 0 ? updated[i].amount * otherShare : leftover / remainingCount) * 100) / 100 }
      }
    }
    setSvcReleasePeriods(updated)
  }

  const handleSaveService = async () => {
    if (!svcName.trim() || !svcBudget) return
    const budgetNum = parseBudget(svcBudget)
    if (budgetNum <= 0) return

    const planId = editingServiceId ? editingServicePlanId : addingServiceToPlanId
    if (!planId) return

    const existingPlans = client.participant.plans || []

    const activityType = editingServiceId ? "service_updated" : "service_added"
    const activityMsg = `${editingServiceId ? "Updated" : "Added"} the service **${svcName.trim()}**`
    const entry: ActivityEntry = {
      id: crypto.randomUUID(),
      type: activityType,
      message: activityMsg,
      user: currentUserName,
      createdAt: new Date().toISOString(),
    }
    const existingLog = client.participant.activityLog || []

    if (editingServiceId) {
      const updatedPlans = existingPlans.map((pl) =>
        pl.id === planId
          ? {
              ...pl,
              services: (pl.services || []).map((s) =>
                s.id === editingServiceId
                  ? { ...s, name: svcName.trim(), category: svcCategory, budget: budgetNum, enabledChargeItems: svcChargeItems, releasePeriods: svcReleasePeriods }
                  : s
              ),
            }
          : pl
      )
      await updateClient(client.id, {
        participant: { ...client.participant, plans: updatedPlans, activityLog: [entry, ...existingLog] },
      })
    } else {
      const newService: PlanService = {
        id: crypto.randomUUID(),
        name: svcName.trim(),
        category: svcCategory,
        budget: budgetNum,
        enabledChargeItems: svcChargeItems,
        releasePeriods: svcReleasePeriods,
      }
      const updatedPlans = existingPlans.map((pl) =>
        pl.id === planId ? { ...pl, services: [...(pl.services || []), newService] } : pl
      )
      await updateClient(client.id, {
        participant: { ...client.participant, plans: updatedPlans, activityLog: [entry, ...existingLog] },
      })
    }

    resetServiceForm()
  }

  const budgets = client.participant.budgets || []

  const resetBudgetForm = () => {
    setIsBudgetFormOpen(false)
    setEditingBudgetId(null)
    setBudgetName("")
    setBudgetStartDate("")
    setBudgetEndDate("")
    setBudgetStartPickerOpen(false)
    setBudgetEndPickerOpen(false)
  }

  const initBudgetForm = () => {
    resetBudgetForm()
    setIsBudgetFormOpen(true)
    setIsSidebarVisible(true)
  }

  const initEditBudgetForm = (budget: Budget) => {
    setEditingBudgetId(budget.id)
    setBudgetName(budget.name)
    setBudgetStartDate(budget.startDate)
    setBudgetEndDate(budget.endDate)
    setIsBudgetFormOpen(true)
    setIsSidebarVisible(true)
  }

  const handleUsePlanDates = () => {
    const latest = plans[plans.length - 1]
    if (!latest) return
    setBudgetStartDate(latest.startDate)
    setBudgetEndDate(latest.endDate)
  }

  const handleSaveBudget = async () => {
    if (!budgetName.trim() || !budgetStartDate || !budgetEndDate) return

    const existingBudgets = client.participant.budgets || []

    const existingLog = client.participant.activityLog || []

    if (editingBudgetId) {
      const updatedBudgets = existingBudgets.map((b) =>
        b.id === editingBudgetId
          ? { ...b, name: budgetName.trim(), startDate: budgetStartDate, endDate: budgetEndDate }
          : b
      )
      const entry: ActivityEntry = {
        id: crypto.randomUUID(),
        type: "budget_updated",
        message: `Updated the budget **${budgetName.trim()}**`,
        user: currentUserName,
        createdAt: new Date().toISOString(),
      }
      await updateClient(client.id, {
        participant: { ...client.participant, budgets: updatedBudgets, activityLog: [entry, ...existingLog] },
      })
    } else {
      const newId = crypto.randomUUID()
      const newBudget: Budget = {
        id: newId,
        name: budgetName.trim(),
        startDate: budgetStartDate,
        endDate: budgetEndDate,
        chargeItems: [],
        lineItems: [],
        createdAt: new Date().toISOString(),
      }
      const entry: ActivityEntry = {
        id: crypto.randomUUID(),
        type: "budget_created",
        message: `Created the budget **${budgetName.trim()}**`,
        user: currentUserName,
        createdAt: new Date().toISOString(),
      }
      await updateClient(client.id, {
        participant: { ...client.participant, budgets: [...existingBudgets, newBudget], activityLog: [entry, ...existingLog] },
      })
      setEditingBudgetId(newId)
      setBudgetName(budgetName.trim())
      setIsBudgetFormOpen(true)
      const charge = enabledCharges[0]
      setAddingItemToBudgetId(newId)
      setEditingItemId(null)
      setEditingItemBudgetId(null)
      setItemChargeItemNumber(charge?.itemNumber || "")
      setItemBillingCode(charge?.itemNumber || "")
      setItemServiceName(charge?.shortName || charge?.name || "")
      setItemUnit((charge?.unit as "hour" | "each" | "km") || "hour")
      setItemQuantity("1")
      setItemPeriod("per-week")
      setItemDescription("")
      return
    }
    resetBudgetForm()
  }


  const isItemFormOpen = !!(addingItemToBudgetId || editingItemId)

  const resetItemForm = () => {
    setAddingItemToBudgetId(null)
    setEditingItemId(null)
    setEditingItemBudgetId(null)
    setItemChargeItemNumber("")
    setItemBillingCode("")
    setItemServiceName("")
    setItemQuantity("1")
    setItemUnit("hour")
    setItemPeriod("per-week")
    setItemDescription("")
  }

  const initItemForm = (budgetId: string) => {
    resetItemForm()
    const charge = enabledCharges[0]
    setAddingItemToBudgetId(budgetId)
    setItemChargeItemNumber(charge?.itemNumber || "")
    setItemBillingCode(charge?.itemNumber || "")
    setItemServiceName(charge?.shortName || charge?.name || "")
    setItemUnit((charge?.unit as "hour" | "each" | "km") || "hour")
    setIsSidebarVisible(true)
  }

  const initEditItemForm = (budgetId: string, li: BudgetLineItem) => {
    resetItemForm()
    setEditingItemId(li.id)
    setEditingItemBudgetId(budgetId)
    setItemChargeItemNumber(li.chargeItemNumber)
    setItemBillingCode(li.billingCode)
    setItemServiceName(li.serviceName)
    setItemQuantity(String(li.quantity))
    setItemUnit(li.unit)
    setItemPeriod(li.period)
    setItemDescription(li.description)
    setIsSidebarVisible(true)
  }

  const handleSaveItem = async () => {
    const targetBudgetId = editingItemBudgetId || addingItemToBudgetId
    if (!targetBudgetId || !itemChargeItemNumber) return

    const existingBudgets = client.participant.budgets || []

    const updatedBudgets = existingBudgets.map((b) => {
      if (b.id !== targetBudgetId) return b
      const newItem: BudgetLineItem = {
        id: editingItemId || crypto.randomUUID(),
        chargeItemNumber: itemChargeItemNumber,
        billingCode: itemBillingCode,
        serviceName: itemServiceName,
        quantity: parseFloat(itemQuantity) || 0,
        unit: itemUnit,
        period: itemPeriod,
        description: itemDescription,
      }
      const updatedItems = editingItemId
        ? b.lineItems.map((li) => li.id === editingItemId ? newItem : li)
        : [...b.lineItems, newItem]
      const updatedChargeItems = [...new Set(updatedItems.map((li) => li.chargeItemNumber).filter(Boolean))]
      return { ...b, lineItems: updatedItems, chargeItems: updatedChargeItems }
    })

    await updateClient(client.id, {
      participant: { ...client.participant, budgets: updatedBudgets },
    })
    resetItemForm()
  }

  const getBudgetTotal = (budget: Budget) => {
    return budget.lineItems.reduce((sum, li) => {
      const charge = enabledCharges.find((c) => c.itemNumber === li.chargeItemNumber)
      const rate = charge?.price ?? 0
      return sum + (li.quantity * rate)
    }, 0)
  }

  const periodLabels: Record<BudgetPeriod, string> = {
    "per-week": "Per week",
    "per-fortnight": "Per fortnight",
    "per-month": "Per month",
    "per-year": "Per year",
    "per-plan": "Per plan",
  }

  return (
    <div className="flex h-full">
      {/* Left: header + content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Profile header bar */}
        <div ref={headerRef} className="relative flex h-[48px] shrink-0 items-center overflow-hidden bg-[#fafafa] px-[16px]">
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#e5e5e5]" />

          <button
            onClick={() => router.push("/clients")}
            className="mr-[6px] flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded text-[#999] transition-colors hover:bg-[#ebebeb] hover:text-[#262626]"
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
                  onClick={() => { setActiveTab(tab.key); resetPlanForm(); resetBudgetForm(); resetItemForm(); resetServiceForm() }}
                  className={`flex shrink-0 items-center gap-[4px] rounded-[5px] px-[8px] py-[4px] text-[12px] font-medium transition-colors ${isActive ? "bg-[#ebebeb] text-[#262626]" : "text-[#888] hover:bg-[#f0f0f0] hover:text-[#262626]"}`}
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
                  className={`flex shrink-0 items-center justify-center rounded-[5px] px-[8px] py-[4px] text-[16px] leading-none tracking-wider transition-colors ${isTabOverflowOpen ? "bg-[#ebebeb] text-[#262626]" : "text-[#888] hover:bg-[#f0f0f0] hover:text-[#262626]"}`}
                  tabIndex={0}
                  aria-label="More tabs"
                >
                  &middot;&middot;&middot;
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
                      {tabs.map((tab) => {
                        const TabIcon = tab.icon
                        const isActive = activeTab === tab.key
                        return (
                          <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setIsTabOverflowOpen(false); resetPlanForm(); resetBudgetForm(); resetItemForm(); resetServiceForm() }}
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
            {isQuickAdding && (
              <>
                <div className="fixed inset-0 z-[48]" onClick={resetQuickAdd} />
                <div
                  className="fixed z-[49] w-[520px] rounded-lg border border-[#e0e0e0] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                  style={(() => {
                    const rect = headerRef.current?.getBoundingClientRect()
                    if (!rect) return {}
                    return { top: rect.bottom + 6, right: 16 }
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
                      <button type="button" onClick={handleQuickFinish} disabled={!quickTitle.trim()} className="primary-btn rounded-[4px] px-[12px] py-[4px] text-[12px] font-medium transition-colors disabled:opacity-40" tabIndex={0}>Create</button>
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
          {activeTab === "plan" ? (
            <div className="relative flex h-full flex-col">
              <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-[#dcdcdc] px-[16px]">
                <button
                  className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>Filter</span>
                </button>
                <button
                  onClick={() => setIsPlanModalOpen(true)}
                  className="primary-btn flex items-center gap-[5px] rounded-[4px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
                  tabIndex={0}
                >
                  <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>Add new</span>
                </button>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-left">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Plan period</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Status</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Services</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="h-[120px] text-center text-[13px] font-medium text-[#bbb]">No plans yet</td>
                      </tr>
                    ) : (
                      [...plans].reverse().map((plan) => {
                        const now = new Date()
                        now.setHours(0, 0, 0, 0)
                        const endDate = plan.endDate ? new Date(plan.endDate + "T00:00:00") : null
                        const isExpired = endDate ? endDate < now : false
                        const isActive = plan === plans[plans.length - 1] && !isExpired
                        const startFmt = plan.startDate ? new Date(plan.startDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"
                        const endFmt = plan.endDate ? new Date(plan.endDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"
                        const services = plan.services || []
                        const planTotal = services.reduce((sum, svc) => sum + svc.budget, 0)

                        return (
                          <tr
                            key={plan.id}
                            onClick={() => initEditPlanForm(plan)}
                            className="cursor-pointer transition-colors hover:bg-[#f5f5f5]"
                          >
                            <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{startFmt} – {endFmt}</td>
                            <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">
                              <span className={`inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] px-[12px] text-[13px] font-medium ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                                {isActive ? "Active" : isExpired ? "Expired" : "Not active"}
                              </span>
                            </td>
                            <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{services.length} {services.length === 1 ? "service" : "services"}</td>
                            <td className="h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{planTotal > 0 ? `$${planTotal.toLocaleString()}` : <span className="text-[#bbb]">—</span>}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
                <span className="text-[12px] font-medium text-[#999]">{plans.length} {plans.length === 1 ? "plan" : "plans"}</span>
              </div>
            </div>
          ) : activeTab === "budgets" ? (
            <div className="relative flex h-full flex-col">
              <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-[#dcdcdc] px-[16px]">
                <button
                  className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>Filter</span>
                </button>
                <button
                  onClick={initBudgetForm}
                  className="primary-btn flex items-center gap-[5px] rounded-[4px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
                  tabIndex={0}
                >
                  <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>Add new</span>
                </button>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-left">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Name</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Total</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Used</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Period</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="h-[120px] text-center text-[13px] font-medium text-[#bbb]">No budgets yet</td>
                      </tr>
                    ) : (
                      [...budgets].reverse().map((budget) => {
                        const startFmt = budget.startDate ? new Date(budget.startDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"
                        const endFmt = budget.endDate ? new Date(budget.endDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"
                        const total = getBudgetTotal(budget)
                        const used = getBudgetUsed(budget)
                        const itemCount = budget.lineItems.length

                        return (
                          <tr
                            key={budget.id}
                            onClick={() => initEditBudgetForm(budget)}
                            className="cursor-pointer transition-colors hover:bg-[#f5f5f5]"
                          >
                            <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{budget.name}</td>
                            <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{total > 0 ? `$${total.toLocaleString()}` : <span className="text-[#bbb]">—</span>}</td>
                            <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{used > 0 ? `$${used.toLocaleString()}` : <span className="text-[#bbb]">—</span>}</td>
                            <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{startFmt} – {endFmt}</td>
                            <td className="h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">{itemCount} {itemCount === 1 ? "item" : "items"}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
                <span className="text-[12px] font-medium text-[#999]">{budgets.length} {budgets.length === 1 ? "budget" : "budgets"}</span>
              </div>
            </div>
          ) : activeTab === "contacts" ? (
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
                              <span className="inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] bg-[#e8edf2] px-[12px] text-[13px] font-medium text-[#334155]">{rel.label}</span>
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

            {/* Description */}
            <div className="mt-[28px]">
              {isEditingDescription ? (
                <textarea
                  ref={(el) => { if (el) { el.focus(); el.selectionStart = el.value.length } }}
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  onBlur={() => handleSaveDescription()}
                  onKeyDown={(e) => { if (e.key === "Escape") { setDescriptionDraft(client.participant.description || ""); setIsEditingDescription(false) } }}
                  className="mt-[4px] w-full resize-none rounded-lg border border-[#a3c4f3] bg-[#fafafa] px-[10px] py-[8px] text-[14px] leading-[1.6] text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
                  rows={3}
                  placeholder="Add a description..."
                />
              ) : (
                <div
                  className="mt-[4px] cursor-text rounded-lg px-[10px] py-[8px] transition-colors hover:bg-[#f5f5f5]"
                  onClick={() => { setDescriptionDraft(client.participant.description || ""); setIsEditingDescription(true) }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") { setDescriptionDraft(client.participant.description || ""); setIsEditingDescription(true) } }}
                  aria-label="Click to edit description"
                >
                  <span className={`text-[14px] leading-[1.6] ${client.participant.description ? "text-[#262626]" : "text-[#bbb]"}`}>
                    {client.participant.description || "Add a description..."}
                  </span>
                </div>
              )}
            </div>

            {/* Plan Budget */}
            <div className="mt-[28px]">
              <h3 className="mb-[10px] text-[14px] font-semibold text-[#262626]">NDIS Plan</h3>
              {(() => {
                if (plans.length === 0) return <div className="rounded-[8px] border border-[#e8e8e8] px-[16px] py-[20px] text-center"><p className="text-[13px] text-[#bbb]">No active plan</p></div>

                const latest = plans[plans.length - 1]
                const now = new Date()
                now.setHours(0, 0, 0, 0)
                const endDate = latest.endDate ? new Date(latest.endDate + "T00:00:00") : null
                const isExpired = endDate ? endDate < now : false

                if (isExpired) return <div className="rounded-[8px] border border-[#e8e8e8] px-[16px] py-[20px] text-center"><p className="text-[13px] text-[#bbb]">Plan expired</p></div>

                const services = latest.services || []
                if (services.length === 0) return <div className="rounded-[8px] border border-[#e8e8e8] px-[16px] py-[20px] text-center"><p className="text-[13px] text-[#bbb]">No services added</p></div>

                const ovTotalBudget = services.reduce((sum, svc) => sum + svc.budget, 0)
                const ovTotalUsed = services.reduce((sum, svc) => sum + getServiceUsed(svc), 0)
                const ovTotalRemaining = Math.max(0, ovTotalBudget - ovTotalUsed)
                const ovUsedPct = ovTotalBudget > 0 ? (ovTotalUsed / ovTotalBudget) * 100 : 0
                const ovRemainingPct = ovTotalBudget > 0 ? (ovTotalRemaining / ovTotalBudget) * 100 : 0

                const ovBillableHours = services.reduce((sum, svc) => {
                  const chargeItems = svc.enabledChargeItems
                    .map((num) => enabledCharges.find((c) => c.itemNumber === num))
                    .filter((c): c is typeof enabledCharges[number] => !!c && c.unit === "hour")
                  if (chargeItems.length === 0) return sum
                  const avgRate = chargeItems.reduce((s, c) => s + c.price, 0) / chargeItems.length
                  return avgRate > 0 ? sum + svc.budget / avgRate : sum
                }, 0)

                const ovDaysRemaining = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0
                const ovSize = 140
                const ovSw = 28
                const ovR = (ovSize - ovSw) / 2
                const ovCirc = 2 * Math.PI * ovR
                const ovUsedArc = (ovUsedPct / 100) * ovCirc
                const ovRemArc = (ovRemainingPct / 100) * ovCirc

                const handleOverviewDonutHover = (e: React.MouseEvent, label: string, value: number) => {
                  const rect = (e.currentTarget as SVGElement).closest("svg")?.getBoundingClientRect()
                  if (!rect) return
                  setHoveredOverviewDonut({ label, value, x: e.clientX - rect.left, y: e.clientY - rect.top })
                }

                return (
                  <>
                    <div className="overflow-hidden rounded-[8px] border border-[#e8e8e8] px-[16px] py-[14px]">
                      <div className="flex items-center gap-[20px]">
                        <div className="relative shrink-0" onMouseLeave={() => setHoveredOverviewDonut(null)}>
                          <svg width={ovSize} height={ovSize} viewBox={`0 0 ${ovSize} ${ovSize}`} className="-rotate-90">
                            <circle cx={ovSize / 2} cy={ovSize / 2} r={ovR} fill="none" stroke="#f0f0f0" strokeWidth={ovSw} />
                            {ovRemainingPct > 0 && (
                              <circle cx={ovSize / 2} cy={ovSize / 2} r={ovR} fill="none" stroke="#BFDBFE" strokeWidth={ovSw} strokeDasharray={`${ovRemArc} ${ovCirc - ovRemArc}`} strokeDashoffset={-ovUsedArc} strokeLinecap="butt" className="cursor-pointer transition-all" onMouseMove={(e) => handleOverviewDonutHover(e, "Remaining funding", ovTotalRemaining)} onMouseLeave={() => setHoveredOverviewDonut(null)} />
                            )}
                            {ovUsedPct > 0 && (
                              <circle cx={ovSize / 2} cy={ovSize / 2} r={ovR} fill="none" stroke="#2563EB" strokeWidth={ovSw} strokeDasharray={`${ovUsedArc} ${ovCirc - ovUsedArc}`} strokeDashoffset={0} strokeLinecap="butt" className="cursor-pointer transition-all" onMouseMove={(e) => handleOverviewDonutHover(e, "Used funding", ovTotalUsed)} onMouseLeave={() => setHoveredOverviewDonut(null)} />
                            )}
                          </svg>
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[13px] font-bold text-[#262626]">${ovTotalRemaining.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            <span className="text-[10px] font-medium text-[#888]">Remaining</span>
                          </div>
                          {hoveredOverviewDonut && (
                            <div
                              className="pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-[#262626] px-[10px] py-[6px] text-[11px] font-medium text-white shadow-lg"
                              style={{ top: hoveredOverviewDonut.y - 36, left: hoveredOverviewDonut.x, transform: "translateX(-50%)" }}
                            >
                              {hoveredOverviewDonut.label}: ${hoveredOverviewDonut.value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-[10px]">
                          <div className="flex items-center gap-[8px]">
                            <span className="h-[10px] w-[10px] shrink-0 rounded-full bg-[#2563EB]" />
                            <span className="text-[13px] font-semibold text-[#262626]">${ovTotalBudget.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            <span className="text-[12px] text-[#888]">Total funding</span>
                          </div>
                          <div className="flex items-center gap-[8px]">
                            <span className="h-[10px] w-[10px] shrink-0 rounded-full bg-[#6495ED]" />
                            <span className="text-[13px] font-semibold text-[#262626]">{Math.round(ovBillableHours).toLocaleString()}</span>
                            <span className="text-[12px] text-[#888]">Billable hrs</span>
                          </div>
                          <div className="flex items-center gap-[8px]">
                            <span className="h-[10px] w-[10px] shrink-0 rounded-full bg-[#BFDBFE]" />
                            <span className="text-[13px] font-semibold text-[#262626]">{ovDaysRemaining}</span>
                            <span className="text-[12px] text-[#888]">Days left</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </>
                )
              })()}

            </div>

            {/* Activity Feed */}
            <div className="mt-[28px]">
              <button
                onClick={() => setIsActivityCollapsed(!isActivityCollapsed)}
                className="flex items-center gap-[6px]"
                tabIndex={0}
              >
                <ChevronDown className={`h-[14px] w-[14px] text-[#888] transition-transform ${isActivityCollapsed ? "-rotate-90" : ""}`} strokeWidth={1.5} />
                <h3 className="text-[13px] font-medium text-[#888]">Activity</h3>
              </button>
              {!isActivityCollapsed && (
                <div className="mt-[12px]">
                  {activityLog.length === 0 ? (
                    <p className="text-[13px] text-[#bbb]">No activity yet</p>
                  ) : (
                    <div className="space-y-0">
                      {activityLog.map((entry) => {
                        const timeAgo = (() => {
                          const diff = Date.now() - new Date(entry.createdAt).getTime()
                          const mins = Math.floor(diff / 60000)
                          if (mins < 1) return "just now"
                          if (mins < 60) return `${mins}m ago`
                          const hrs = Math.floor(mins / 60)
                          if (hrs < 24) return `${hrs}h ago`
                          const days = Math.floor(hrs / 24)
                          if (days < 7) return `${days}d ago`
                          const weeks = Math.floor(days / 7)
                          return `${weeks}w ago`
                        })()

                        const displayName = entry.user || currentUserName
                        const userInitials = displayName
                          .split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"

                        const parts = entry.message.split(/\*\*(.*?)\*\*/g)

                        return (
                          <div key={entry.id} className="group flex items-start gap-[12px] py-[10px]">
                            <div className="mt-[1px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#e8e8e8] text-[9px] font-semibold text-[#666]">
                              {userInitials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-[#262626]">{displayName}</p>
                              <span className="text-[13px] leading-[1.5] text-[#555]">
                                {parts.map((part, i) =>
                                  i % 2 === 1
                                    ? <span key={i} className="font-semibold text-[#262626]">{part}</span>
                                    : <span key={i}>{part}</span>
                                )}
                              </span>
                              <span className="ml-[6px] text-[12px] text-[#bbb]"> · {timeAgo}</span>
                            </div>
                            <button
                              className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded text-[#ccc] opacity-0 transition-all hover:bg-[#f0f0f0] hover:text-[#262626] group-hover:opacity-100"
                              tabIndex={0}
                              aria-label="More options"
                            >
                              <MoreHorizontal className="h-[14px] w-[14px]" strokeWidth={1.5} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
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
          <div className="flex min-h-0 shrink-0 flex-col overflow-y-auto bg-white" style={{ width: sidebarWidth }}>
          {isPlanModalOpen ? (
            <>
            <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
              <h2 className="text-[13px] font-semibold text-[#262626]">{editingPlanId ? "Edit NDIS plan" : "Add NDIS plan"}</h2>
              <button
                onClick={() => resetPlanForm()}
                className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Close plan form"
              >
                <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-[24px] py-[14px]">
              <input ref={planFileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setPlanFile(e.target.files[0]); e.target.value = "" }} />

              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Start date *</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setPlanStartPickerOpen(!planStartPickerOpen); setPlanEndPickerOpen(false) }}
                    className="flex h-[36px] w-full items-center gap-[8px] rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium transition-colors hover:border-[#ccc] focus:border-[#a3c4f3]"
                    tabIndex={0}
                  >
                    <CalendarDays className="h-[14px] w-[14px] shrink-0 text-[#999]" strokeWidth={1.5} />
                    {planStartDate ? (
                      <span className="text-[#262626]">{new Date(planStartDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                    ) : (
                      <span className="text-[#bbb]">Select date</span>
                    )}
                  </button>
                  {planStartPickerOpen && (
                    <>
                      <div className="fixed inset-0 z-[59]" onClick={() => setPlanStartPickerOpen(false)} />
                      <div className="absolute left-0 top-full z-[60] mt-[4px]">
                        <DatePicker value={planStartDate} onChange={(v) => { setPlanStartDate(v); setPlanStartPickerOpen(false) }} onClose={() => setPlanStartPickerOpen(false)} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">End date *</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setPlanEndPickerOpen(!planEndPickerOpen); setPlanStartPickerOpen(false) }}
                    className="flex h-[36px] w-full items-center gap-[8px] rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium transition-colors hover:border-[#ccc] focus:border-[#a3c4f3]"
                    tabIndex={0}
                  >
                    <CalendarDays className="h-[14px] w-[14px] shrink-0 text-[#999]" strokeWidth={1.5} />
                    {planEndDate ? (
                      <span className="text-[#262626]">{new Date(planEndDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                    ) : (
                      <span className="text-[#bbb]">Select date</span>
                    )}
                  </button>
                  {planEndPickerOpen && (
                    <>
                      <div className="fixed inset-0 z-[59]" onClick={() => setPlanEndPickerOpen(false)} />
                      <div className="absolute left-0 top-full z-[60] mt-[4px]">
                        <DatePicker
                          value={planEndDate}
                          onChange={(v) => { setPlanEndDate(v); setPlanEndPickerOpen(false) }}
                          onClose={() => setPlanEndPickerOpen(false)}
                          quickPresets={planStartDate ? [
                            { label: "6 mo", months: 6 },
                            { label: "12 mo", months: 12 },
                            { label: "2 yr", months: 24 },
                            { label: "3 yr", months: 36 },
                            { label: "5 yr", months: 60 },
                          ].map((p) => {
                            const s = new Date(planStartDate + "T00:00:00")
                            s.setMonth(s.getMonth() + p.months)
                            return { label: p.label, value: `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}` }
                          }) : undefined}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mb-[14px]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[12px] font-medium text-[#262626]">PACE plan</span>
                    <p className="mt-[1px] text-[11px] text-[#888]">Is this participant on a PACE plan?</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlanIsPace(!planIsPace)}
                    className="relative h-[22px] w-[40px] rounded-full transition-colors"
                    style={{ backgroundColor: planIsPace ? "var(--primary-color)" : "#d4d4d4" }}
                    tabIndex={0}
                    role="switch"
                    aria-checked={planIsPace}
                    aria-label="PACE plan toggle"
                  >
                    <span className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${planIsPace ? "left-[20px]" : "left-[2px]"}`} />
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Plan document (PDF)</label>
                {planFile ? (
                  <div className="flex items-center gap-[8px] rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] py-[8px]">
                    <FileText className="h-[14px] w-[14px] shrink-0 text-[#888]" strokeWidth={1.5} />
                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#262626]">{planFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setPlanFile(null)}
                      className="shrink-0 rounded-[4px] p-[2px] text-[#999] transition-colors hover:bg-[#eee] hover:text-[#262626]"
                      tabIndex={0}
                      aria-label="Remove file"
                    >
                      <X className="h-[12px] w-[12px]" strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => planFileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-[6px] rounded-[8px] border border-dashed border-[#d4d4d4] bg-[#fafafa] px-[12px] py-[10px] text-[12px] font-medium text-[#888] transition-colors hover:border-[#bbb] hover:bg-[#f0f0f0]"
                    tabIndex={0}
                  >
                    <Upload className="h-[14px] w-[14px]" strokeWidth={1.5} />
                    Upload PDF
                  </button>
                )}
              </div>
            </div>

            {editingPlanId && (() => {
              const editingPlan = plans.find((pl) => pl.id === editingPlanId)
              const planServices = editingPlan?.services || []
              return (
                <div className="border-t border-[#f0f0f0] px-[24px] py-[16px]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-[#262626]">Services</h3>
                    {!inlineSvcOpen && (
                      <button
                        onClick={() => initServiceForm(editingPlanId)}
                        className="flex h-[18px] w-[18px] items-center justify-center rounded text-[#999] transition-colors hover:bg-[#f0f0f0] hover:text-[#262626]"
                        tabIndex={0}
                        aria-label="Add service"
                      >
                        <Plus className="h-[12px] w-[12px]" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                  {planServices.length === 0 && !inlineSvcOpen && (
                    <p className="mt-[8px] text-[13px] font-medium text-[#bbb]">No services added</p>
                  )}
                  {planServices.length > 0 && (
                    <div className="mt-[8px] overflow-hidden rounded-[8px] border border-[#e8e8e8]">
                      {planServices.map((svc) => (
                        <button
                          key={svc.id}
                          onClick={() => initEditServiceForm(editingPlanId, svc)}
                          className={`group flex w-full items-center justify-between border-b border-[#f0f0f0] px-[12px] py-[10px] text-left transition-colors last:border-b-0 hover:bg-[#fafafa] ${inlineSvcEditingId === svc.id ? "bg-[#f0f5ff]" : ""}`}
                          tabIndex={0}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-[#262626]">{svc.name}</p>
                            <p className="mt-[2px] text-[12px] text-[#888]">${svc.budget.toLocaleString()}</p>
                          </div>
                          <PenLine className="h-[13px] w-[13px] shrink-0 text-[#ccc] opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
                        </button>
                      ))}
                    </div>
                  )}

                  {inlineSvcOpen ? (
                    <div className="mt-[14px] border-t border-[#f0f0f0] pt-[14px]">
                      <h3 className="mb-[14px] text-[13px] font-semibold text-[#262626]">{inlineSvcEditingId ? "Edit service" : "Add service"}</h3>

                      <div className="mb-[14px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Service name *</label>
                        <input
                          type="text"
                          value={svcName}
                          onChange={(e) => setSvcName(e.target.value)}
                          placeholder="e.g. Support Coordination"
                          className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"
                        />
                      </div>

                      <div className="mb-[14px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Budget *</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-[12px] top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#999]">$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={svcBudget}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9.]/g, "")
                              const formatted = formatBudgetDisplay(raw)
                              setSvcBudget(formatted)
                              if (svcReleasePeriods.length > 0) {
                                const count = svcReleasePeriods.length
                                const budget = parseBudget(formatted)
                                const perPeriod = budget > 0 ? Math.round((budget / count) * 100) / 100 : 0
                                setSvcReleasePeriods(svcReleasePeriods.map((rp, i) => ({ ...rp, amount: i === count - 1 ? Math.round((budget - perPeriod * i) * 100) / 100 : perPeriod })))
                              }
                            }}
                            placeholder="0.00"
                            className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] pl-[26px] pr-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"
                          />
                        </div>
                      </div>

                      <div className="mb-[14px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Charge items</label>
                        <div className="relative">
                          <div
                            onClick={() => setIsChargeDropdownOpen(!isChargeDropdownOpen)}
                            className="flex min-h-[36px] w-full cursor-pointer flex-wrap items-center gap-[4px] rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[10px] py-[6px] transition-colors hover:border-[#ccc]"
                          >
                            {svcChargeItems.length === 0 ? (
                              <span className="px-[2px] text-[13px] font-medium text-[#bbb]">Select charge items…</span>
                            ) : (
                              svcChargeItems.map((itemNum) => {
                                const charge = ndisCharges.find((c) => c.itemNumber === itemNum)
                                if (!charge) return null
                                return (
                                  <span key={itemNum} className="inline-flex items-center gap-[4px] rounded-[5px] border border-[#dcdcdc] bg-white px-[8px] py-[2px] text-[12px] font-medium text-[#262626]">
                                    {charge.shortName}
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setSvcChargeItems(svcChargeItems.filter((n) => n !== itemNum)) }}
                                      className="flex h-[14px] w-[14px] items-center justify-center rounded-full text-[#999] transition-colors hover:text-[#262626]"
                                      tabIndex={0}
                                      aria-label={`Remove ${charge.shortName}`}
                                    >
                                      <X className="h-[10px] w-[10px]" strokeWidth={2} />
                                    </button>
                                  </span>
                                )
                              })
                            )}
                            <ChevronDown className={`ml-auto h-[14px] w-[14px] shrink-0 text-[#888] transition-transform ${isChargeDropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                          </div>
                          {isChargeDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-[59]" onClick={() => setIsChargeDropdownOpen(false)} />
                              <div className="absolute bottom-full left-0 z-[60] mb-[4px] max-h-[240px] w-full overflow-y-auto rounded-[8px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                                {(["support-coordination", "psychosocial-recovery", "travel"] as const).map((cat) => {
                                  const catCharges = allServiceCharges.filter((c) => c.category === cat)
                                  if (catCharges.length === 0) return null
                                  return (
                                    <div key={cat}>
                                      <p className="px-[12px] pb-[4px] pt-[8px] text-[11px] font-semibold uppercase tracking-wide text-[#999]">{chargeCategories[cat]}</p>
                                      {catCharges.map((charge) => {
                                        const isChecked = svcChargeItems.includes(charge.itemNumber)
                                        return (
                                          <button
                                            key={charge.itemNumber}
                                            type="button"
                                            onClick={() => setSvcChargeItems(isChecked ? svcChargeItems.filter((n) => n !== charge.itemNumber) : [...svcChargeItems, charge.itemNumber])}
                                            className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-[#f5f5f5] ${isChecked ? "bg-[#f0f0f0]" : ""}`}
                                            tabIndex={0}
                                          >
                                            <div className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border transition-colors ${isChecked ? "border-[#262626] bg-[#262626]" : "border-[#d4d4d4] bg-white"}`}>
                                              {isChecked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <span className="text-[12px] font-medium text-[#262626]">{charge.shortName}</span>
                                              <span className="ml-[6px] text-[11px] text-[#999]">${charge.price.toFixed(2)}/{charge.unit}</span>
                                            </div>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  )
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-[8px] border-t border-[#f0f0f0] pt-[12px]">
                        <button
                          onClick={() => { setInlineSvcOpen(false); setInlineSvcEditingId(null); setAddingServiceToPlanId(null); setEditingServiceId(null); setEditingServicePlanId(null); setSvcName(""); setSvcBudget(""); setSvcChargeItems([]) }}
                          className="rounded-[6px] border border-[#e0e0e0] bg-white px-[12px] py-[6px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                          tabIndex={0}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveService()}
                          disabled={!svcName.trim() || !svcBudget || parseBudget(svcBudget) <= 0}
                          className="primary-btn rounded-[6px] px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
                          tabIndex={0}
                        >
                          {inlineSvcEditingId ? "Save changes" : "Add service"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => initServiceForm(editingPlanId)}
                      className="mt-[8px] flex w-full items-center justify-center gap-[4px] rounded-[6px] border border-dashed border-[#d4d4d4] py-[8px] text-[12px] font-medium text-[#888] transition-colors hover:border-[#bbb] hover:bg-[#fafafa] hover:text-[#262626]"
                      tabIndex={0}
                    >
                      <Plus className="h-[12px] w-[12px]" strokeWidth={1.75} />
                      Add service
                    </button>
                  )}
                </div>
              )
            })()}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-[8px] border-t border-[#f0f0f0] px-[24px] py-[12px]">
              <button
                onClick={() => resetPlanForm()}
                className="rounded-[6px] border border-[#e0e0e0] bg-white px-[12px] py-[6px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                disabled={!planStartDate || !planEndDate || isSavingPlan}
                className="primary-btn rounded-[6px] px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
                tabIndex={0}
              >
                {isSavingPlan ? "Saving…" : editingPlanId ? "Save plan" : "Add plan"}
              </button>
            </div>
            </>
          ) : isServiceFormOpen ? (
            <>
            <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
              <h2 className="text-[13px] font-semibold text-[#262626]">{editingServiceId ? "Edit service" : "New service"}</h2>
              <button
                onClick={() => resetServiceForm()}
                className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Close service form"
              >
                <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-[14px] px-[24px] py-[14px]">
              <div>
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Service name *</label>
                <input
                  type="text"
                  value={svcName}
                  onChange={(e) => setSvcName(e.target.value)}
                  placeholder="e.g. Support Coordination"
                  className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"
                />
              </div>

              <div>
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Budget *</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-[12px] top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#999]">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={svcBudget}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, "")
                      const formatted = formatBudgetDisplay(raw)
                      setSvcBudget(formatted)
                      if (svcReleasePeriods.length > 0) {
                        const count = svcReleasePeriods.length
                        const budget = parseBudget(formatted)
                        const perPeriod = budget > 0 ? Math.round((budget / count) * 100) / 100 : 0
                        setSvcReleasePeriods(svcReleasePeriods.map((p, i) => ({ ...p, amount: i === count - 1 ? Math.round((budget - perPeriod * i) * 100) / 100 : perPeriod })))
                      }
                    }}
                    placeholder="0.00"
                    className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] pl-[26px] pr-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Charge items</label>
                <div className="relative">
                  <div
                    onClick={() => setIsChargeDropdownOpen(!isChargeDropdownOpen)}
                    className="flex min-h-[36px] w-full cursor-pointer flex-wrap items-center gap-[4px] rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[10px] py-[6px] transition-colors hover:border-[#ccc]"
                  >
                    {svcChargeItems.length === 0 ? (
                      <span className="px-[2px] text-[13px] font-medium text-[#bbb]">Select charge items…</span>
                    ) : (
                      svcChargeItems.map((itemNum) => {
                        const charge = ndisCharges.find((c) => c.itemNumber === itemNum)
                        if (!charge) return null
                        return (
                          <span key={itemNum} className="inline-flex items-center gap-[4px] rounded-[5px] border border-[#dcdcdc] bg-white px-[8px] py-[2px] text-[12px] font-medium text-[#262626]">
                            {charge.shortName}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSvcChargeItems(svcChargeItems.filter((n) => n !== itemNum)) }}
                              className="flex h-[14px] w-[14px] items-center justify-center rounded-full text-[#999] transition-colors hover:text-[#262626]"
                              tabIndex={0}
                              aria-label={`Remove ${charge.shortName}`}
                            >
                              <X className="h-[10px] w-[10px]" strokeWidth={2} />
                            </button>
                          </span>
                        )
                      })
                    )}
                    <ChevronDown className={`ml-auto h-[14px] w-[14px] shrink-0 text-[#888] transition-transform ${isChargeDropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                  </div>
                  {isChargeDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-[59]" onClick={() => setIsChargeDropdownOpen(false)} />
                      <div className="absolute left-0 top-full z-[60] mt-[4px] max-h-[240px] w-full overflow-y-auto rounded-[8px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                        {(["support-coordination", "psychosocial-recovery", "travel"] as const).map((cat) => {
                          const catCharges = allServiceCharges.filter((c) => c.category === cat)
                          if (catCharges.length === 0) return null
                          return (
                            <div key={cat}>
                              <p className="px-[12px] pb-[4px] pt-[8px] text-[11px] font-semibold uppercase tracking-wide text-[#999]">{chargeCategories[cat]}</p>
                              {catCharges.map((charge) => {
                                const isChecked = svcChargeItems.includes(charge.itemNumber)
                                return (
                                  <button
                                    key={charge.itemNumber}
                                    type="button"
                                    onClick={() => setSvcChargeItems(isChecked ? svcChargeItems.filter((n) => n !== charge.itemNumber) : [...svcChargeItems, charge.itemNumber])}
                                    className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-[#f5f5f5] ${isChecked ? "bg-[#f0f0f0]" : ""}`}
                                    tabIndex={0}
                                  >
                                    <div className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border transition-colors ${isChecked ? "border-[#262626] bg-[#262626]" : "border-[#d4d4d4] bg-white"}`}>
                                      {isChecked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-[12px] font-medium text-[#262626]">{charge.shortName}</span>
                                      <span className="ml-[6px] text-[11px] text-[#999]">${charge.price.toFixed(2)}/{charge.unit}</span>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Funding release schedule</label>
                <p className="mb-[6px] text-[11px] text-[#999]">Number of periods the funding will be released over</p>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={svcReleasePeriodCount}
                  onChange={(e) => handleReleasePeriodCountChange(e.target.value)}
                  placeholder="e.g. 4"
                  className="h-[36px] w-[120px] rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"
                />
                {svcReleasePeriods.length > 0 && (
                  <div className="mt-[8px] space-y-[4px]">
                    {svcReleasePeriods.map((rp, i) => (
                      <div key={rp.period} className="flex items-center gap-[8px]">
                        <span className="w-[70px] shrink-0 text-[12px] font-medium text-[#888]">Period {rp.period}</span>
                        <div className="relative flex-1">
                          <span className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-[12px] font-medium text-[#999]">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={rp.amount}
                            onChange={(e) => handleReleasePeriodAmountChange(i, parseFloat(e.target.value) || 0)}
                            className="h-[32px] w-full rounded-[6px] border border-[#e0e0e0] bg-white pl-[24px] pr-[8px] text-[12px] font-medium text-[#262626] outline-none hover:border-[#ccc] focus:border-[#a3c4f3]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-[8px] border-t border-[#f0f0f0] px-[24px] py-[12px]">
              <button
                onClick={() => resetServiceForm()}
                className="rounded-[6px] border border-[#e0e0e0] bg-white px-[12px] py-[6px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveService()}
                disabled={!svcName.trim() || !svcBudget || parseBudget(svcBudget) <= 0}
                className="primary-btn rounded-[6px] px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
                tabIndex={0}
              >
                {editingServiceId ? "Save changes" : "Add service"}
              </button>
            </div>
            </>
          ) : isBudgetFormOpen ? (
            <>
            <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
              <h2 className="text-[13px] font-semibold text-[#262626]">{editingBudgetId ? "Edit budget" : "New budget"}</h2>
              <button
                onClick={() => resetBudgetForm()}
                className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Close budget form"
              >
                <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-[14px] px-[24px] py-[14px]">
              <div>
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Budget name *</label>
                <input
                  type="text"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  placeholder="e.g. Support Coordination Budget"
                  className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"
                />
              </div>

              <div>
                <div className="mb-[4px] flex items-center justify-between">
                  <label className="text-[12px] font-medium text-[#888]">Start date *</label>
                  {plans.length > 0 && (
                    <button onClick={handleUsePlanDates} className="text-[11px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>Use plan dates</button>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setBudgetStartPickerOpen(!budgetStartPickerOpen); setBudgetEndPickerOpen(false) }}
                    className="flex h-[36px] w-full items-center rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] transition-colors hover:border-[#ccc]"
                    tabIndex={0}
                  >
                    {budgetStartDate ? new Date(budgetStartDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) : <span className="text-[#bbb]">Select date</span>}
                  </button>
                  {budgetStartPickerOpen && (
                    <>
                      <div className="fixed inset-0 z-[49]" onClick={() => setBudgetStartPickerOpen(false)} />
                      <div className="absolute left-0 top-full z-50 mt-[4px]">
                        <DatePicker value={budgetStartDate} onChange={(v) => { setBudgetStartDate(v); setBudgetStartPickerOpen(false) }} onClose={() => setBudgetStartPickerOpen(false)} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">End date *</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setBudgetEndPickerOpen(!budgetEndPickerOpen); setBudgetStartPickerOpen(false) }}
                    className="flex h-[36px] w-full items-center rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] transition-colors hover:border-[#ccc]"
                    tabIndex={0}
                  >
                    {budgetEndDate ? new Date(budgetEndDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) : <span className="text-[#bbb]">Select date</span>}
                  </button>
                  {budgetEndPickerOpen && (
                    <>
                      <div className="fixed inset-0 z-[49]" onClick={() => setBudgetEndPickerOpen(false)} />
                      <div className="absolute left-0 top-full z-50 mt-[4px]">
                        <DatePicker value={budgetEndDate} onChange={(v) => { setBudgetEndDate(v); setBudgetEndPickerOpen(false) }} onClose={() => setBudgetEndPickerOpen(false)} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Budget line items section (shown when editing) */}
            {editingBudgetId && (() => {
              const editingBudget = budgets.find((b) => b.id === editingBudgetId)
              const budgetItems = editingBudget?.lineItems || []
              const isInlineItemOpen = !!(addingItemToBudgetId === editingBudgetId || (editingItemId && editingItemBudgetId === editingBudgetId))

              return (
                <div className="border-t border-[#f0f0f0] px-[24px] py-[16px]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-[#262626]">Items</h3>
                    {!isInlineItemOpen && (
                      <button
                        onClick={() => initItemForm(editingBudgetId)}
                        className="flex h-[18px] w-[18px] items-center justify-center rounded text-[#999] transition-colors hover:bg-[#f0f0f0] hover:text-[#262626]"
                        tabIndex={0}
                        aria-label="Add item"
                      >
                        <Plus className="h-[12px] w-[12px]" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>

                  {budgetItems.length === 0 && !isInlineItemOpen && (
                    <p className="mt-[8px] text-[13px] font-medium text-[#bbb]">No items added</p>
                  )}

                  {budgetItems.length > 0 && (
                    <div className="mt-[8px] overflow-hidden rounded-[8px] border border-[#e8e8e8]">
                      {budgetItems.map((li) => {
                        const charge = enabledCharges.find((c) => c.itemNumber === li.chargeItemNumber)
                        const rate = charge?.price ?? 0
                        const total = li.quantity * rate
                        return (
                          <button
                            key={li.id}
                            onClick={() => initEditItemForm(editingBudgetId, li)}
                            className={`group flex w-full items-center justify-between border-b border-[#f0f0f0] px-[12px] py-[10px] text-left transition-colors last:border-b-0 hover:bg-[#fafafa] ${editingItemId === li.id ? "bg-[#f0f5ff]" : ""}`}
                            tabIndex={0}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-[#262626]">{li.serviceName}</p>
                              <p className="mt-[2px] text-[12px] text-[#888]">{li.quantity} {li.unit}{li.quantity !== 1 ? "s" : ""} · ${total.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</p>
                            </div>
                            <PenLine className="h-[13px] w-[13px] shrink-0 text-[#ccc] opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {isInlineItemOpen ? (
                    <div className="mt-[14px] border-t border-[#f0f0f0] pt-[14px]">
                      <h3 className="mb-[14px] text-[13px] font-semibold text-[#262626]">{editingItemId ? "Edit item" : "Add item"}</h3>

                      <div className="mb-[14px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Charge item *</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsItemChargeDropdownOpen(!isItemChargeDropdownOpen)}
                            className="flex h-[36px] w-full items-center rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] transition-colors hover:border-[#ccc]"
                          >
                            <span className="min-w-0 flex-1 truncate text-left">
                              {(() => { const c = enabledCharges.find((ch) => ch.itemNumber === itemChargeItemNumber); return c ? `${c.shortName} – $${c.price.toFixed(2)}/${c.unit}` : "Select charge item" })()}
                            </span>
                            <ChevronDown className={`ml-[8px] h-[14px] w-[14px] shrink-0 text-[#888] transition-transform ${isItemChargeDropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                          </button>
                          {isItemChargeDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-[59]" onClick={() => setIsItemChargeDropdownOpen(false)} />
                              <div className="absolute bottom-full left-0 z-[60] mb-[4px] max-h-[240px] w-full overflow-y-auto rounded-[8px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                                {enabledCharges.map((ch) => {
                                  const isSelected = itemChargeItemNumber === ch.itemNumber
                                  return (
                                    <button
                                      key={ch.itemNumber}
                                      type="button"
                                      onClick={() => {
                                        setItemChargeItemNumber(ch.itemNumber)
                                        setItemBillingCode(ch.itemNumber)
                                        setItemServiceName(ch.shortName || ch.name)
                                        setItemUnit((ch.unit as "hour" | "each" | "km") || "hour")
                                        setIsItemChargeDropdownOpen(false)
                                      }}
                                      className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-[#f5f5f5] ${isSelected ? "bg-[#f0f0f0]" : ""}`}
                                      tabIndex={0}
                                    >
                                      <div className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-[#262626] bg-[#262626]" : "border-[#d4d4d4] bg-white"}`}>
                                        {isSelected && <div className="h-[6px] w-[6px] rounded-full bg-white" />}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <span className="text-[12px] font-medium text-[#262626]">{ch.shortName}</span>
                                        <span className="ml-[6px] text-[11px] text-[#999]">${ch.price.toFixed(2)}/{ch.unit}</span>
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mb-[14px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Billing code</label>
                        <input type="text" value={itemBillingCode} readOnly className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#f5f5f5] px-[12px] text-[13px] font-medium text-[#888] outline-none" title={itemBillingCode} />
                      </div>

                      <div className="mb-[14px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Service name</label>
                        <input type="text" value={itemServiceName} readOnly className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#f5f5f5] px-[12px] text-[13px] font-medium text-[#888] outline-none" />
                      </div>

                      <div className="mb-[14px] flex gap-[10px]">
                        <div className="flex-1">
                          <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Quantity *</label>
                          <input type="text" inputMode="decimal" value={itemQuantity} onChange={(e) => setItemQuantity(e.target.value)} className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none hover:border-[#ccc] focus:border-[#a3c4f3]" />
                        </div>
                        <div className="flex-1">
                          <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Unit</label>
                          <input type="text" value={itemUnit} readOnly className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#f5f5f5] px-[12px] text-[13px] font-medium text-[#888] outline-none" />
                        </div>
                      </div>

                      <div className="mb-[14px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Period *</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsItemPeriodDropdownOpen(!isItemPeriodDropdownOpen)}
                            className="flex h-[36px] w-full items-center rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] transition-colors hover:border-[#ccc]"
                          >
                            <span className="min-w-0 flex-1 text-left">{periodLabels[itemPeriod]}</span>
                            <ChevronDown className={`ml-[8px] h-[14px] w-[14px] shrink-0 text-[#888] transition-transform ${isItemPeriodDropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                          </button>
                          {isItemPeriodDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-[59]" onClick={() => setIsItemPeriodDropdownOpen(false)} />
                              <div className="absolute bottom-full left-0 z-[60] mb-[4px] w-full overflow-y-auto rounded-[8px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                                {(Object.entries(periodLabels) as [BudgetPeriod, string][]).map(([key, label]) => {
                                  const isSelected = itemPeriod === key
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => { setItemPeriod(key); setIsItemPeriodDropdownOpen(false) }}
                                      className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-[#f5f5f5] ${isSelected ? "bg-[#f0f0f0]" : ""}`}
                                      tabIndex={0}
                                    >
                                      <div className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-[#262626] bg-[#262626]" : "border-[#d4d4d4] bg-white"}`}>
                                        {isSelected && <div className="h-[6px] w-[6px] rounded-full bg-white" />}
                                      </div>
                                      <span className="text-[12px] font-medium text-[#262626]">{label}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mb-[14px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Description</label>
                        <input type="text" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} placeholder="Optional description" className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]" />
                      </div>

                      {(() => {
                        const charge = enabledCharges.find((c) => c.itemNumber === itemChargeItemNumber)
                        const rate = charge?.price || 0
                        const qty = parseFloat(itemQuantity) || 0
                        return (
                          <div className="mb-[14px] flex items-center justify-between rounded-[8px] bg-[#fafafa] px-[12px] py-[8px]">
                            <span className="text-[12px] text-[#888]">Rate: ${rate.toFixed(2)}/{itemUnit}</span>
                            <span className="text-[13px] font-semibold text-[#262626]">${(qty * rate).toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
                          </div>
                        )
                      })()}

                      <div className="flex items-center justify-end gap-[8px] border-t border-[#f0f0f0] pt-[12px]">
                        <button
                          onClick={() => resetItemForm()}
                          className="rounded-[6px] border border-[#e0e0e0] bg-white px-[12px] py-[6px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                          tabIndex={0}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveItem}
                          disabled={!itemChargeItemNumber || !(parseFloat(itemQuantity) > 0)}
                          className="primary-btn rounded-[6px] px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
                          tabIndex={0}
                        >
                          {editingItemId ? "Save changes" : "Add item"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => initItemForm(editingBudgetId)}
                      className="mt-[8px] flex w-full items-center justify-center gap-[4px] rounded-[6px] border border-dashed border-[#d4d4d4] py-[8px] text-[12px] font-medium text-[#888] transition-colors hover:border-[#bbb] hover:bg-[#fafafa] hover:text-[#262626]"
                      tabIndex={0}
                    >
                      <Plus className="h-[12px] w-[12px]" strokeWidth={1.75} />
                      Add item
                    </button>
                  )}
                </div>
              )
            })()}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-[8px] border-t border-[#f0f0f0] px-[24px] py-[12px]">
              <button
                onClick={() => resetBudgetForm()}
                className="rounded-[6px] border border-[#e0e0e0] bg-white px-[12px] py-[6px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBudget}
                disabled={!budgetName.trim() || !budgetStartDate || !budgetEndDate}
                className="primary-btn rounded-[6px] px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
                tabIndex={0}
              >
                {editingBudgetId ? "Save changes" : "Create budget"}
              </button>
            </div>
            </>
          ) : isItemFormOpen ? (
            <>
            <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
              <h2 className="text-[13px] font-semibold text-[#262626]">{editingItemId ? "Edit item" : "Add item"}</h2>
              <button
                onClick={() => resetItemForm()}
                className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Close item form"
              >
                <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-[14px] px-[24px] py-[14px]">
              <div>
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Charge item *</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsItemChargeDropdownOpen(!isItemChargeDropdownOpen)}
                    className="flex h-[36px] w-full items-center rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] transition-colors hover:border-[#ccc]"
                  >
                    <span className="min-w-0 flex-1 truncate text-left">
                      {(() => { const c = enabledCharges.find((ch) => ch.itemNumber === itemChargeItemNumber); return c ? `${c.shortName} – $${c.price.toFixed(2)}/${c.unit}` : "Select charge item" })()}
                    </span>
                    <ChevronDown className={`ml-[8px] h-[14px] w-[14px] shrink-0 text-[#888] transition-transform ${isItemChargeDropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                  </button>
                  {isItemChargeDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-[59]" onClick={() => setIsItemChargeDropdownOpen(false)} />
                      <div className="absolute bottom-full left-0 z-[60] mb-[4px] max-h-[240px] w-full overflow-y-auto rounded-[8px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                        {enabledCharges.map((ch) => {
                          const isSelected = itemChargeItemNumber === ch.itemNumber
                          return (
                            <button
                              key={ch.itemNumber}
                              type="button"
                              onClick={() => {
                                setItemChargeItemNumber(ch.itemNumber)
                                setItemBillingCode(ch.itemNumber)
                                setItemServiceName(ch.shortName || ch.name)
                                setItemUnit((ch.unit as "hour" | "each" | "km") || "hour")
                                setIsItemChargeDropdownOpen(false)
                              }}
                              className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-[#f5f5f5] ${isSelected ? "bg-[#f0f0f0]" : ""}`}
                              tabIndex={0}
                            >
                              <div className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-[#262626] bg-[#262626]" : "border-[#d4d4d4] bg-white"}`}>
                                {isSelected && <div className="h-[6px] w-[6px] rounded-full bg-white" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[12px] font-medium text-[#262626]">{ch.shortName}</span>
                                <span className="ml-[6px] text-[11px] text-[#999]">${ch.price.toFixed(2)}/{ch.unit}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Billing code</label>
                <input type="text" value={itemBillingCode} readOnly className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#f5f5f5] px-[12px] text-[13px] font-medium text-[#888] outline-none" title={itemBillingCode} />
              </div>

              <div>
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Service name</label>
                <input type="text" value={itemServiceName} readOnly className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#f5f5f5] px-[12px] text-[13px] font-medium text-[#888] outline-none" />
              </div>

              <div className="flex gap-[10px]">
                <div className="flex-1">
                  <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Quantity *</label>
                  <input type="text" inputMode="decimal" value={itemQuantity} onChange={(e) => setItemQuantity(e.target.value)} className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none hover:border-[#ccc] focus:border-[#a3c4f3]" />
                </div>
                <div className="flex-1">
                  <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Unit</label>
                  <input type="text" value={itemUnit} readOnly className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#f5f5f5] px-[12px] text-[13px] font-medium text-[#888] outline-none" />
                </div>
              </div>

              <div>
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Period *</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsItemPeriodDropdownOpen(!isItemPeriodDropdownOpen)}
                    className="flex h-[36px] w-full items-center rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] transition-colors hover:border-[#ccc]"
                  >
                    <span className="min-w-0 flex-1 text-left">{periodLabels[itemPeriod]}</span>
                    <ChevronDown className={`ml-[8px] h-[14px] w-[14px] shrink-0 text-[#888] transition-transform ${isItemPeriodDropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                  </button>
                  {isItemPeriodDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-[59]" onClick={() => setIsItemPeriodDropdownOpen(false)} />
                      <div className="absolute bottom-full left-0 z-[60] mb-[4px] w-full overflow-y-auto rounded-[8px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                        {(Object.entries(periodLabels) as [BudgetPeriod, string][]).map(([key, label]) => {
                          const isSelected = itemPeriod === key
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => { setItemPeriod(key); setIsItemPeriodDropdownOpen(false) }}
                              className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-[#f5f5f5] ${isSelected ? "bg-[#f0f0f0]" : ""}`}
                              tabIndex={0}
                            >
                              <div className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-[#262626] bg-[#262626]" : "border-[#d4d4d4] bg-white"}`}>
                                {isSelected && <div className="h-[6px] w-[6px] rounded-full bg-white" />}
                              </div>
                              <span className="text-[12px] font-medium text-[#262626]">{label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Description</label>
                <input type="text" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} placeholder="Optional description" className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]" />
              </div>

              {(() => {
                const charge = enabledCharges.find((c) => c.itemNumber === itemChargeItemNumber)
                const rate = charge?.price || 0
                const qty = parseFloat(itemQuantity) || 0
                return (
                  <div className="flex items-center justify-between rounded-[8px] bg-[#fafafa] px-[12px] py-[8px]">
                    <span className="text-[12px] text-[#888]">Rate: ${rate.toFixed(2)}/{itemUnit}</span>
                    <span className="text-[13px] font-semibold text-[#262626]">${(qty * rate).toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
                  </div>
                )
              })()}
            </div>

            <div className="flex items-center justify-end gap-[8px] border-t border-[#f0f0f0] px-[24px] py-[12px]">
              <button
                onClick={() => resetItemForm()}
                className="rounded-[6px] border border-[#e0e0e0] bg-white px-[12px] py-[6px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                disabled={!itemChargeItemNumber || !(parseFloat(itemQuantity) > 0)}
                className="primary-btn rounded-[6px] px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
                tabIndex={0}
              >
                {editingItemId ? "Save changes" : "Add item"}
              </button>
            </div>
            </>
          ) : (
          <>
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
            {pf("p-first-name") && <SidebarDetailRow label="First Name">
              <SidebarEditableField value={p.firstName} onChange={(v) => handleUpdateField("firstName", v)} placeholder="First name" />
            </SidebarDetailRow>}
            {pf("p-middle-name") && <SidebarDetailRow label="Middle Name">
              <SidebarEditableField value={p.middleName} onChange={(v) => handleUpdateField("middleName", v)} placeholder="Middle name" />
            </SidebarDetailRow>}
            {pf("p-last-name") && <SidebarDetailRow label="Last Name">
              <SidebarEditableField value={p.lastName} onChange={(v) => handleUpdateField("lastName", v)} placeholder="Last name" />
            </SidebarDetailRow>}
            <SidebarDetailRow label="Coordinator">
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
            {pf("p-date-of-birth") && <SidebarDetailRow label="Date of Birth">
              <SidebarEditableField value={p.dateOfBirth} onChange={(v) => handleUpdateField("dateOfBirth", v)} type="date" placeholder="Date of birth" />
            </SidebarDetailRow>}
            {pf("p-primary-diagnosis") && <SidebarDetailRow label="Primary Dx">
              <SidebarDiagnosisChip value={p.primaryDiagnosis} onChange={(v) => handleUpdateField("primaryDiagnosis", v)} placeholder="Add diagnosis" />
            </SidebarDetailRow>}
            {pf("p-secondary-diagnosis") && <SidebarDetailRow label="Secondary Dx">
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
                {pf("p-gender") && <SidebarDetailRow label="Gender">
                  <SidebarEditableField value={p.gender} onChange={(v) => handleUpdateField("gender", v)} type="select" options={["Male", "Female", "Non-binary", "Other", "Prefer not to say"]} />
                </SidebarDetailRow>}
                {pf("p-pronouns") && <SidebarDetailRow label="Pronouns">
                  <SidebarEditableField value={p.pronouns} onChange={(v) => handleUpdateField("pronouns", v)} type="select" options={["He/Him", "She/Her", "They/Them", "Other"]} />
                </SidebarDetailRow>}
                {pf("p-ethnicity") && <SidebarDetailRow label="Ethnicity">
                  <SidebarEditableField value={p.ethnicity} onChange={(v) => handleUpdateField("ethnicity", v)} placeholder="Ethnicity" />
                </SidebarDetailRow>}
                {pf("p-language") && <SidebarDetailRow label="Language">
                  <SidebarEditableField value={p.language} onChange={(v) => handleUpdateField("language", v)} placeholder="Language" />
                </SidebarDetailRow>}

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Contact Information</h3>
                {pf("p-email") && <SidebarDetailRow label="Email">
                  <SidebarContactChip value={p.email} onChange={(v) => handleUpdateField("email", v)} placeholder="Email address" />
                </SidebarDetailRow>}

                {pf("p-phone") && <SidebarDetailRow label="Phone">
                  <SidebarContactChip value={p.phone} onChange={(v) => handleUpdateField("phone", v)} placeholder="Phone number" />
                </SidebarDetailRow>}
                {pf("p-contact-method") && <SidebarDetailRow label="Contact">
                  <SidebarEditableField value={p.preferredContactMethod} onChange={(v) => handleUpdateField("preferredContactMethod", v)} type="select" options={["SMS", "Email", "Call (Mobile)", "Call (Phone)"]} />
                </SidebarDetailRow>}
                {pf("p-sign-method") && <SidebarDetailRow label="Sign Method">
                  <SidebarEditableField value={p.preferredSignMethod} onChange={(v) => handleUpdateField("preferredSignMethod", v)} type="select" options={["In Person", "Electronically"]} />
                </SidebarDetailRow>}

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Reference Numbers</h3>
                {pf("p-ndis-number") && <SidebarDetailRow label="NDIS">
                  <SidebarContactChip value={p.ndisNumber} onChange={(v) => handleUpdateField("ndisNumber", v)} placeholder="NDIS number" variant="white" />
                </SidebarDetailRow>}
                {pf("p-medicare-number") && <SidebarDetailRow label="Medicare">
                  <SidebarContactChip value={p.medicareNumber} onChange={(v) => handleUpdateField("medicareNumber", v)} placeholder="Medicare number" variant="white" />
                </SidebarDetailRow>}
                {pf("p-centrelink-number") && <SidebarDetailRow label="Centrelink">
                  <SidebarContactChip value={p.centrelinkNumber} onChange={(v) => handleUpdateField("centrelinkNumber", v)} placeholder="Centrelink number" variant="white" />
                </SidebarDetailRow>}
                {pf("p-external-id") && <SidebarDetailRow label="External ID">
                  <SidebarContactChip value={p.externalId} onChange={(v) => handleUpdateField("externalId", v)} placeholder="External ID" variant="white" />
                </SidebarDetailRow>}

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Funding &amp; Plan Manager</h3>
                <SidebarDetailRow label="Funding Type">
                  <SidebarEditableField value={p.fundingType} onChange={(v) => handleUpdateField("fundingType", v)} type="select" options={["plan-managed", "ndia-managed", "self-managed"]} />
                </SidebarDetailRow>
                {(p.fundingType === "plan-managed" || !p.fundingType) && (
                  <>
                    <SidebarDetailRow label="PM Organisation">
                      <SidebarEditableField value={p.planManagerOrg} onChange={(v) => handleUpdateField("planManagerOrg", v)} placeholder="Plan manager org" />
                    </SidebarDetailRow>
                    <SidebarDetailRow label="PM Name">
                      <SidebarEditableField value={p.planManagerName} onChange={(v) => handleUpdateField("planManagerName", v)} placeholder="Plan manager name" />
                    </SidebarDetailRow>
                    <SidebarDetailRow label="PM Email">
                      <SidebarContactChip value={p.planManagerEmail} onChange={(v) => handleUpdateField("planManagerEmail", v)} placeholder="Plan manager email" variant="white" />
                    </SidebarDetailRow>
                  </>
                )}
                <SidebarDetailRow label="Plan Start">
                  <SidebarEditableField value={p.planStartDate} onChange={(v) => handleUpdateField("planStartDate", v)} type="date" placeholder="Plan start date" />
                </SidebarDetailRow>
                <SidebarDetailRow label="Plan End">
                  <SidebarEditableField value={p.planEndDate} onChange={(v) => handleUpdateField("planEndDate", v)} type="date" placeholder="Plan end date" />
                </SidebarDetailRow>

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Other Details</h3>
                {pf("p-service-start") && <SidebarDetailRow label="Service Start">
                  <SidebarEditableField value={p.serviceCommencementDate} onChange={(v) => handleUpdateField("serviceCommencementDate", v)} type="date" placeholder="Start date" />
                </SidebarDetailRow>}
                {pf("p-service-exit") && <SidebarDetailRow label="Service Exit">
                  <SidebarEditableField value={p.serviceExitDate} onChange={(v) => handleUpdateField("serviceExitDate", v)} type="date" placeholder="Exit date" />
                </SidebarDetailRow>}
                <SidebarDetailRow label="Check-in">
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

          {/* Plans section */}
          <div className="border-t border-[#f0f0f0] px-[24px] py-[16px]">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#262626]">Plans</h3>
              <button
                onClick={() => setIsPlanModalOpen(true)}
                className="flex h-[18px] w-[18px] items-center justify-center rounded text-[#999] transition-colors hover:bg-[#f0f0f0] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Add plan"
              >
                <Plus className="h-[12px] w-[12px]" strokeWidth={1.75} />
              </button>
            </div>
            {plans.length === 0 ? (
              <p className="mt-[6px] text-[13px] font-medium text-[#bbb]">No plans</p>
            ) : (
              <div className="mt-[8px] overflow-hidden rounded-[8px] border border-[#e8e8e8]">
                {[...plans].reverse().map((plan) => {
                  const now = new Date()
                  now.setHours(0, 0, 0, 0)
                  const endDate = plan.endDate ? new Date(plan.endDate + "T00:00:00") : null
                  const isExpired = endDate ? endDate < now : false
                  const isActive = plan === plans[plans.length - 1] && !isExpired
                  const startFmt = plan.startDate ? new Date(plan.startDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"
                  const endFmt = plan.endDate ? new Date(plan.endDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"
                  return (
                    <button
                      key={plan.id}
                      onClick={() => initEditPlanForm(plan)}
                      className={`group flex w-full items-center gap-[10px] border-b border-[#f0f0f0] px-[12px] py-[10px] text-left transition-colors last:border-b-0 hover:bg-[#fafafa] ${!isActive ? "opacity-50" : ""}`}
                      tabIndex={0}
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#262626]">{startFmt} – {endFmt}</span>
                      <span className={`shrink-0 text-[12px] font-medium ${isActive ? "text-green-700" : "text-red-600"}`}>{isActive ? "Active" : isExpired ? "Expired" : "Not active"}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <SidebarSection title="Tasks" emptyText="No tasks" actionLabel="See all" />
          <SidebarSection title="Notes" emptyText="No notes" actionLabel="See all" />
          </>
          )}
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
                      return <span className="inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] bg-[#e8edf2] px-[12px] text-[13px] font-medium text-[#334155]">{rel?.label ?? newContact.relationship}</span>
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
                    <span className="inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] bg-[#e8edf2] px-[12px] text-[13px] font-medium text-[#334155]">{config.label}</span>
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
