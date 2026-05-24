"use client"

import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
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
import type { ParticipantDetails, Document, NdisPlan, PlanService, FundingReleasePeriod, Budget, BudgetLineItem, BudgetPeriod, ActivityEntry } from "@/lib/types"
import { DocumentPreview } from "@/components/document-preview"
import {
  FileText,
  User,
  Clock,
  ChevronDown,
  Plus,
  SquarePen,
  CheckSquare,
  UserPlus,
  Users,
  ArrowLeft,
  FolderOpen,
  PanelRightOpen,
  ListFilter,
  X,
  Building2,
  Tag,
  File,
  ClipboardList,
  DollarSign,
  MoreHorizontal,
} from "lucide-react"
import {
  type ProfileContact,
  ClientIcon,
  parseTimeInput,
  getTodayStr,
} from "./_components/client-profile-helpers"
import { useSaveIndicator, SaveIndicator } from "@/components/save-indicator"
import { ProfileTasksTab } from "./_components/profile-tasks-tab"
import { FilesTab } from "./_components/files-tab"
import { ProfileSidebar } from "./_components/profile-sidebar"
import { PlanTab } from "./_components/plan-tab"
import { BudgetsTab } from "./_components/budgets-tab"

const tabs = [
  { key: "overview", label: "Overview", icon: FileText },
  { key: "plan", label: "Plan", icon: ClipboardList },
  { key: "budgets", label: "Budgets", icon: DollarSign },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "notes", label: "Notes", icon: SquarePen },
  { key: "files", label: "Files", icon: FolderOpen },
]

export default function ParticipantProfilePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isVisible: isSaved, showSaved } = useSaveIndicator()
  const initialTab = searchParams.get("tab") || "overview"
  const [activeTab, setActiveTab] = useState(initialTab)
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

  const saveClient = useCallback(async (id: string, data: Parameters<typeof updateClient>[1]) => {
    await updateClient(id, data)
    showSaved()
  }, [updateClient, showSaved])

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
  const [svcCategory, setSvcCategory] = useState<"support-coordination" | "travel">("support-coordination")
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
    await saveClient(client.id, {
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
      await saveClient(client.id, {
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
      await saveClient(client.id, {
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

  const allServiceCharges = enabledCharges.filter((c) => c.category === "support-coordination" || c.category === "travel")

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
      await saveClient(client.id, {
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
      await saveClient(client.id, {
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
      await saveClient(client.id, {
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
      await saveClient(client.id, {
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

    await saveClient(client.id, {
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
          <SaveIndicator isVisible={isSaved} />

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
                  className={`relative flex shrink-0 items-center gap-[4px] px-[8px] py-[4px] text-[12px] font-medium transition-colors ${isActive ? "text-[#262626]" : "text-[#888] hover:text-[#262626]"}`}
                  tabIndex={0}
                >
                  <TabIcon className="h-[12px] w-[12px]" strokeWidth={1.5} />
                  <span>{tab.label}</span>
                  {isActive && <span className="absolute -bottom-[12px] left-[8px] right-[8px] h-[2px] rounded-full bg-[#262626]" />}
                </button>
              )
            })}
            {visibleTabCount < tabs.length && (
              <>
                <button
                  ref={overflowBtnRef}
                  onClick={() => setIsTabOverflowOpen(!isTabOverflowOpen)}
                  className={`relative flex shrink-0 items-center justify-center px-[8px] py-[4px] text-[16px] leading-none tracking-wider transition-colors ${isTabOverflowOpen ? "text-[#262626]" : "text-[#888] hover:text-[#262626]"}`}
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
                                          <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[6px] bg-[#DBEAFE] text-[8px] font-semibold text-[#2563EB]">
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
            <PlanTab
              plans={plans}
              onAddNew={() => setIsPlanModalOpen(true)}
              onEditPlan={initEditPlanForm}
            />
          ) : activeTab === "budgets" ? (
            <BudgetsTab
              budgets={budgets}
              onAddNew={initBudgetForm}
              onEditBudget={initEditBudgetForm}
              getBudgetTotal={getBudgetTotal}
              getBudgetUsed={getBudgetUsed}
            />
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
                              <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] bg-[#DBEAFE] text-[9px] font-semibold text-[#2563EB]">
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
            <FilesTab
              clientDocuments={clientDocuments}
              clientFolder={clientFolder}
              fileUploadRef={fileUploadRef}
              isFilesAddNewOpen={isFilesAddNewOpen}
              isNewSubfileOpen={isNewSubfileOpen}
              newSubfileName={newSubfileName}
              onSetFilesAddNewOpen={setIsFilesAddNewOpen}
              onSetNewSubfileOpen={setIsNewSubfileOpen}
              onSetNewSubfileName={setNewSubfileName}
              onFileUpload={handleFileUpload}
              onDownloadDoc={handleDownloadDoc}
              onDeleteDocument={deleteDocument}
              onCreateFile={createFile}
              onPreviewDoc={setPreviewDoc}
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

            {/* NDIS Plan Graph */}
            {(() => {
              if (plans.length === 0) return null
              const latest = plans[plans.length - 1]
              const now = new Date()
              now.setHours(0, 0, 0, 0)
              const endDate = latest.endDate ? new Date(latest.endDate + "T00:00:00") : null
              const isExpired = endDate ? endDate < now : false
              if (isExpired) return null
              const services = latest.services || []
              if (services.length === 0) return null

              const totalBudget = services.reduce((sum, svc) => sum + svc.budget, 0)
              const totalUsed = services.reduce((sum, svc) => sum + getServiceUsed(svc), 0)
              const totalRemaining = Math.max(0, totalBudget - totalUsed)
              const usedPct = totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0
              const remainingPct = totalBudget > 0 ? (totalRemaining / totalBudget) * 100 : 0
              const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0

              const size = 120
              const sw = 22
              const r = (size - sw) / 2
              const circ = 2 * Math.PI * r
              const usedArc = (usedPct / 100) * circ
              const remArc = (remainingPct / 100) * circ

              return (
                <div className="mt-[28px] rounded-[8px] border border-[#f0f0f0] px-[24px] py-[16px]">
                  <h3 className="text-[13px] font-semibold text-[#262626]">NDIS Plan</h3>
                  <div className="mt-[12px] flex items-center gap-[16px]">
                    <div className="relative shrink-0">
                      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={sw} />
                        {remainingPct > 0 && (
                          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#BFDBFE" strokeWidth={sw} strokeDasharray={`${remArc} ${circ - remArc}`} strokeDashoffset={-usedArc} strokeLinecap="butt" />
                        )}
                        {usedPct > 0 && (
                          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2563EB" strokeWidth={sw} strokeDasharray={`${usedArc} ${circ - usedArc}`} strokeDashoffset={0} strokeLinecap="butt" />
                        )}
                      </svg>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[12px] font-bold text-[#262626]">${totalRemaining.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        <span className="text-[9px] font-medium text-[#888]">Remaining</span>
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
                      <div className="flex items-center gap-[6px]">
                        <span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#2563EB]" />
                        <span className="text-[12px] font-semibold text-[#262626]">${totalBudget.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        <span className="text-[11px] text-[#888]">Total</span>
                      </div>
                      <div className="flex items-center gap-[6px]">
                        <span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#2563EB]" />
                        <span className="text-[12px] font-semibold text-[#262626]">${totalUsed.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        <span className="text-[11px] text-[#888]">Used</span>
                      </div>
                      <div className="flex items-center gap-[6px]">
                        <span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#BFDBFE]" />
                        <span className="text-[12px] font-semibold text-[#262626]">{daysLeft}</span>
                        <span className="text-[11px] text-[#888]">Days left</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

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
                            <div className="mt-[1px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[6px] bg-[#DBEAFE] text-[9px] font-semibold text-[#2563EB]">
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
        <ProfileSidebar
          client={client}
          p={p}
          pf={pf}
          plans={plans}
          budgets={budgets}
          sidebarWidth={sidebarWidth}
          staffNames={staffNames}
          canAssignClients={canAssignClients}
          enabledCharges={enabledCharges}
          allServiceCharges={allServiceCharges}
          isPlanModalOpen={isPlanModalOpen}
          editingPlanId={editingPlanId}
          planStartDate={planStartDate}
          planEndDate={planEndDate}
          planIsPace={planIsPace}
          planFile={planFile}
          planStartPickerOpen={planStartPickerOpen}
          planEndPickerOpen={planEndPickerOpen}
          isSavingPlan={isSavingPlan}
          planFileInputRef={planFileInputRef}
          onSetPlanStartPickerOpen={setPlanStartPickerOpen}
          onSetPlanEndPickerOpen={setPlanEndPickerOpen}
          onSetPlanStartDate={setPlanStartDate}
          onSetPlanEndDate={setPlanEndDate}
          onSetPlanIsPace={setPlanIsPace}
          onSetPlanFile={setPlanFile}
          onResetPlanForm={resetPlanForm}
          onSavePlan={handleSavePlan}
          inlineSvcOpen={inlineSvcOpen}
          inlineSvcEditingId={inlineSvcEditingId}
          isServiceFormOpen={isServiceFormOpen}
          svcName={svcName}
          svcBudget={svcBudget}
          svcChargeItems={svcChargeItems}
          svcReleasePeriodCount={svcReleasePeriodCount}
          svcReleasePeriods={svcReleasePeriods}
          isChargeDropdownOpen={isChargeDropdownOpen}
          editingServiceId={editingServiceId}
          onSetSvcName={setSvcName}
          onSetSvcBudget={setSvcBudget}
          onSetSvcChargeItems={setSvcChargeItems}
          onSetIsChargeDropdownOpen={setIsChargeDropdownOpen}
          onInitServiceForm={initServiceForm}
          onInitEditServiceForm={initEditServiceForm}
          onResetServiceForm={resetServiceForm}
          onSaveService={handleSaveService}
          onFormatBudgetDisplay={formatBudgetDisplay}
          onParseBudget={parseBudget}
          onReleasePeriodCountChange={handleReleasePeriodCountChange}
          onReleasePeriodAmountChange={handleReleasePeriodAmountChange}
          isBudgetFormOpen={isBudgetFormOpen}
          editingBudgetId={editingBudgetId}
          budgetName={budgetName}
          budgetStartDate={budgetStartDate}
          budgetEndDate={budgetEndDate}
          budgetStartPickerOpen={budgetStartPickerOpen}
          budgetEndPickerOpen={budgetEndPickerOpen}
          onSetBudgetName={setBudgetName}
          onSetBudgetStartDate={setBudgetStartDate}
          onSetBudgetEndDate={setBudgetEndDate}
          onSetBudgetStartPickerOpen={setBudgetStartPickerOpen}
          onSetBudgetEndPickerOpen={setBudgetEndPickerOpen}
          onResetBudgetForm={resetBudgetForm}
          onSaveBudget={handleSaveBudget}
          onUsePlanDates={handleUsePlanDates}
          isItemFormOpen={isItemFormOpen}
          editingItemId={editingItemId}
          addingItemToBudgetId={addingItemToBudgetId}
          editingItemBudgetId={editingItemBudgetId}
          itemChargeItemNumber={itemChargeItemNumber}
          itemBillingCode={itemBillingCode}
          itemServiceName={itemServiceName}
          itemQuantity={itemQuantity}
          itemUnit={itemUnit}
          itemPeriod={itemPeriod}
          itemDescription={itemDescription}
          isItemChargeDropdownOpen={isItemChargeDropdownOpen}
          isItemPeriodDropdownOpen={isItemPeriodDropdownOpen}
          onSetItemChargeItemNumber={setItemChargeItemNumber}
          onSetItemBillingCode={setItemBillingCode}
          onSetItemServiceName={setItemServiceName}
          onSetItemQuantity={setItemQuantity}
          onSetItemUnit={setItemUnit}
          onSetItemPeriod={setItemPeriod}
          onSetItemDescription={setItemDescription}
          onSetIsItemChargeDropdownOpen={setIsItemChargeDropdownOpen}
          onSetIsItemPeriodDropdownOpen={setIsItemPeriodDropdownOpen}
          onInitItemForm={initItemForm}
          onInitEditItemForm={initEditItemForm}
          onResetItemForm={resetItemForm}
          onSaveItem={handleSaveItem}
          isCoordinatorOpen={isCoordinatorOpen}
          coordinatorSearch={coordinatorSearch}
          coordinatorInputRef={coordinatorInputRef}
          onSetIsCoordinatorOpen={setIsCoordinatorOpen}
          onSetCoordinatorSearch={setCoordinatorSearch}
          onSetSidebarVisible={setIsSidebarVisible}
          onMouseDown={handleMouseDown}
          onUpdateField={handleUpdateField}
          onUpdateClient={updateClient}
          periodLabels={periodLabels}
        />
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
                  className="primary-btn rounded-[4px] px-[16px] py-[7px] text-[13px] font-medium transition-colors"
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
