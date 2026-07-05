"use client"

import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useContacts } from "@/lib/hooks/use-contacts"
import { useClients } from "@/lib/hooks/use-clients"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useCharges } from "@/lib/hooks/use-charges"
import { useInvoices } from "@/lib/hooks/use-invoices"
import { getBudgetLineTotal, getBudgetUsedAmount, getBudgetRowMetrics, getSpendingPlanPeriodCost, getSpendingPlanCadenceCost, generateReleasePeriods, getScheduledShiftProjection, deriveBudgetChargeItems, shouldRegenerateReleasePeriods, validateChargeItemForBudgetComponent } from "@/lib/budget-utils"
import { getDefaultReleaseCadenceForComponent, NDIS_FUNDING_COMPONENTS, resolveBudgetFundingComponent, type NdisFundingComponent } from "@/lib/ndis-funding-pools"
import { formatNumberDisplay, parseFormattedNumber } from "@/lib/number-input"
import type { FundingReleaseCadence } from "@/lib/ndis-funding-pools"
import { useRoster } from "@/lib/hooks/use-roster"
import { relationshipConfig } from "@/lib/types"
import { useFieldConfig } from "@/lib/hooks/use-field-config"
import { useStaff } from "@/lib/hooks/use-staff"
import { useAssignableCoordinators } from "@/lib/hooks/use-assignable-coordinators"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useDocuments } from "@/lib/hooks/use-documents"
import { useCarePlans, getCarePlanFolder } from "@/lib/hooks/use-care-plans"
import { useNotes } from "@/lib/hooks/use-notes"
import { useIncidents } from "@/lib/hooks/use-incidents"
import { useListReturnBack } from "@/lib/lists/list-return"
import { useWorkspace } from "@/lib/workspace-context"
import type { ParticipantDetails, Document, Budget, BudgetLineItem, BudgetPeriod, BudgetReleasePeriod, ActivityEntry, ClientGoal, Attachment, Note, SpendingPlan } from "@/lib/types"
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
  FolderOpen,
  ListFilter,
  X,
  Building2,
  Tag,
  File,
  DollarSign,
  Target,
  CalendarDays,
  ShieldCheck,
  FileHeart,
  CalendarClock,
  CalendarRange,
  AlertTriangle,
  ClipboardList,
  Coins,
} from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"
import { CategoryChip } from "@/components/category-chip"
import { FixedDropdownMenu } from "@/components/fixed-dropdown-menu"
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
import { ProfileNotesTab } from "@/components/profile-notes-tab"
import { ProfileIncidentsTab } from "@/components/profile-incidents-tab"
import { ProfileShiftNotesTab } from "@/components/profile-shift-notes-tab"
import { ActivityOverviewSummary } from "@/components/profile-account-details/activity-overview-summary"
import { NotesOverviewSummary } from "@/components/profile-account-details/notes-overview-summary"
import { IncidentsOverviewSummary } from "@/components/profile-account-details/incidents-overview-summary"
import { AccountDetailsTabBar, AccountDetailsSidebarToggle, type AccountDetailsTab } from "@/components/profile-account-details/profile-account-details-panel"
import { ProfileRecordHeader, ProfileNavTextAction } from "@/components/profile-record-header"
import { IconButton } from "@/components/icon-button"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { profileMainTabScrollClass, profilePageTabBarClass, profilePageTabRowClass, folkNavIconButtonClass } from "@/components/tab-active-indicator"
import { cn } from "@/lib/utils"
import { NoteEditorModal } from "@/app/(dashboard)/notes/_components/note-editor-modal"
import { useToast } from "@/components/toast"
import { saveDocumentForm, ensureFolderPath } from "@/lib/document-form"
import { BudgetsTab } from "./_components/budgets-tab"
import { BillableEntriesTab } from "./_components/billable-entries-tab"
import { SpendingPlanTab } from "./_components/spending-plan-tab"
import { GoalsTab } from "./_components/goals-tab"
import { type GoalFormData } from "./_components/goal-sidebar-form"
import { SuitabilityTab } from "@/components/suitability-tab"
import { CareplanTab } from "./_components/careplan-tab"
import {
  TABLE_FULL,
  TABLE_PANEL_CELL,
  TABLE_PANEL_CELL_LAST,
  TABLE_PANEL_HEADER_STICKY,
  TABLE_PANEL_HEADER_STICKY_LAST,
  TABLE_PANEL_TEXT,
} from "@/lib/table-styles"


const tabs = [
  { key: "overview", label: "Overview", icon: FileText },
  { key: "careplan", label: "Careplan", icon: FileHeart },
  { key: "budgets", label: "Budgets", icon: DollarSign },
  { key: "spending-plan", label: "Spending plan", icon: CalendarClock },
  { key: "billable-entries", label: "Billable entries", icon: Coins },
  { key: "goals", label: "Goals", icon: Target },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "suitability", label: "Suitability", icon: ShieldCheck },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "notes", label: "Notes", icon: SquarePen },
  { key: "incidents", label: "Incidents", icon: AlertTriangle },
  { key: "shift-notes", label: "Shift notes", icon: ClipboardList },
  { key: "files", label: "Files", icon: FolderOpen },
]

export default function ParticipantProfilePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { onBack: handleProfileBack, backLabel: profileBackLabel } = useListReturnBack({
    path: "/clients",
    label: "Back to clients",
  })
  const { isVisible: isSaved, showSaved } = useSaveIndicator()
  const initialTabRaw = searchParams.get("tab") || "overview"
  const initialTab = initialTabRaw === "plan" ? "budgets" : initialTabRaw
  const [activeTab, setActiveTab] = useState(initialTab)
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [accountDetailsTab, setAccountDetailsTab] = useState<AccountDetailsTab>("details")
  const [sidebarWidth, setSidebarWidth] = useState(404)
  const { clients, isLoading, updateParticipantField, updateParticipantFields, updateClient } = useClients()
  const { addContact, getContactsForClient } = useContacts()
  const { tasks: allTasks, updateTask, addTask } = useTasks()
  const { allCharges, enabledCharges } = useCharges()
  const { invoices } = useInvoices()
  const { shifts } = useRoster()
  const { isFieldEnabled } = useFieldConfig()
  const { staffNames } = useStaff()
  const assignableCoordinators = useAssignableCoordinators()
  const { canAssignTasks, canAssignClients, canViewIncidents } = usePermissions()
  const { documents, files, uploadDocument, deleteDocument, updateDocument, replaceDocumentFile, getDownloadUrl, createFile, deleteFile } = useDocuments()
  const { getCarePlanForClient, upsertCarePlan, deleteCarePlan } = useCarePlans()
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
  const relationshipRef = useRef<HTMLButtonElement>(null)
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

  const { notes, addNote, updateNote, deleteNote } = useNotes()
  const { incidents: allIncidents } = useIncidents()
  const { toast } = useToast()
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [editorNote, setEditorNote] = useState<Note | null>(null)
  const [noteEditTitle, setNoteEditTitle] = useState("")
  const [noteEditContent, setNoteEditContent] = useState("")
  const [noteEditAttachments, setNoteEditAttachments] = useState<Attachment[]>([])
  const [noteFavorites, setNoteFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try { return JSON.parse(localStorage.getItem("note-favorites") || "[]") } catch { return [] }
  })
  const clientNotes = useMemo(
    () => notes.filter((n) => n.clientId === id),
    [notes, id]
  )
  const clientIncidents = useMemo(
    () => allIncidents.filter((incident) => incident.clientIds.includes(id)),
    [allIncidents, id]
  )
  const clientShiftNotes = useMemo(
    () => shifts.filter((s) => s.clientId === id && s.progressNote).sort((a, b) => b.date.localeCompare(a.date)),
    [shifts, id]
  )

  const visibleTabs = useMemo(
    () => tabs.filter((tab) => tab.key !== "incidents" || canViewIncidents),
    [canViewIncidents]
  )

  const clientTaskCount = useMemo(() => {
    if (!client) return 0
    return allTasks.filter((t) =>
      t.clientId === client.id || t.client === client.name || t.client === client.displayName
    ).length
  }, [allTasks, client])

  const clientContactCount = useMemo(() => {
    if (!client) return 0
    return getContactsForClient(client.name, client.id).length + 1
  }, [client, getContactsForClient])

  const getTabBadge = useCallback((tabKey: string) => {
    if (tabKey === "tasks") return clientTaskCount
    if (tabKey === "notes") return clientNotes.length
    if (tabKey === "incidents") return clientIncidents.length
    if (tabKey === "contacts") return clientContactCount
    if (tabKey === "shift-notes") return clientShiftNotes.length
    return undefined
  }, [clientTaskCount, clientNotes.length, clientIncidents.length, clientContactCount, clientShiftNotes.length])

  const openNote = useCallback((noteId: string) => {
    const note = notes.find((n) => n.id === noteId)
    if (!note) return
    setEditorNote(note)
    setNoteEditTitle(note.title)
    setNoteEditContent(note.content)
    setNoteEditAttachments(note.attachments ?? [])
  }, [notes])

  const closeNoteEditor = useCallback(() => {
    setEditorNote(null)
    setNoteEditTitle("")
    setNoteEditContent("")
    setNoteEditAttachments([])
  }, [])

  const toggleNoteFavorite = useCallback((noteId: string) => {
    setNoteFavorites((prev) => {
      const next = prev.includes(noteId) ? prev.filter((f) => f !== noteId) : [...prev, noteId]
      if (typeof window !== "undefined") localStorage.setItem("note-favorites", JSON.stringify(next))
      return next
    })
  }, [])

  const handleDeleteNote = useCallback(async (noteId: string) => {
    await deleteNote(noteId)
    if (editorNote?.id === noteId) closeNoteEditor()
  }, [deleteNote, editorNote?.id, closeNoteEditor])

  const saveAndCloseNote = useCallback(async () => {
    if (editorNote) await updateNote(editorNote.id, { title: noteEditTitle, content: noteEditContent, attachments: noteEditAttachments })
    closeNoteEditor()
  }, [editorNote, noteEditTitle, noteEditContent, noteEditAttachments, updateNote, closeNoteEditor])

  useEffect(() => {
    if (!editorNote) return
    const timeout = setTimeout(() => { updateNote(editorNote.id, { title: noteEditTitle, content: noteEditContent, attachments: noteEditAttachments }) }, 800)
    return () => clearTimeout(timeout)
  }, [noteEditTitle, noteEditContent, noteEditAttachments, editorNote, updateNote])

  const handleCreateNote = useCallback(async () => {
    if (!client || isCreatingNote) return
    setIsCreatingNote(true)
    const created = await addNote({
      title: "Untitled",
      content: "",
      clientId: id,
      clientName: client.displayName || client.name,
      createdBy: currentUserName,
    })
    setIsCreatingNote(false)
    if (created) {
      setEditorNote(created)
      setNoteEditTitle(created.title)
      setNoteEditContent(created.content)
      setNoteEditAttachments(created.attachments ?? [])
      return
    }
    toast("Unable to create note", "error")
  }, [client, isCreatingNote, addNote, id, currentUserName, toast])

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
    if (window.innerWidth < 900 && isSidebarVisible) setIsSidebarVisible(false)
  }, [isSidebarVisible])

  const clientFolder = client?.displayName ?? ""
  const carePlanFolder = getCarePlanFolder(clientFolder)
  const carePlan = client ? getCarePlanForClient(client.id) : null
  const carePlanDocument = carePlan ? documents.find((doc) => doc.id === carePlan.documentId) ?? null : null
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [isDocumentFormOpen, setIsDocumentFormOpen] = useState(false)
  const [editingDocument, setEditingDocument] = useState<Document | null>(null)
  const [docUploadFolder, setDocUploadFolder] = useState("")
  const [docName, setDocName] = useState("")
  const [docValidFrom, setDocValidFrom] = useState("")
  const [docValidTo, setDocValidTo] = useState("")
  const [docPendingFile, setDocPendingFile] = useState<File | null>(null)
  const [docValidFromPickerOpen, setDocValidFromPickerOpen] = useState(false)
  const [docValidToPickerOpen, setDocValidToPickerOpen] = useState(false)
  const [isSavingDocument, setIsSavingDocument] = useState(false)

  const [isCarePlanFormOpen, setIsCarePlanFormOpen] = useState(false)
  const [carePlanCreatedDate, setCarePlanCreatedDate] = useState("")
  const [carePlanRenewalDate, setCarePlanRenewalDate] = useState("")
  const [carePlanFile, setCarePlanFile] = useState<File | null>(null)
  const [carePlanCreatedPickerOpen, setCarePlanCreatedPickerOpen] = useState(false)
  const [carePlanRenewalPickerOpen, setCarePlanRenewalPickerOpen] = useState(false)
  const [isSavingCarePlan, setIsSavingCarePlan] = useState(false)

  const [isItemChargeDropdownOpen, setIsItemChargeDropdownOpen] = useState(false)
  const [isItemPeriodDropdownOpen, setIsItemPeriodDropdownOpen] = useState(false)

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<ClientGoal | null>(null)

  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false)
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null)
  const [budgetName, setBudgetName] = useState("")
  const [budgetFundingComponent, setBudgetFundingComponent] = useState<NdisFundingComponent | "">("")
  const [budgetAllocatedAmount, setBudgetAllocatedAmount] = useState("")
  const [budgetReleaseCadence, setBudgetReleaseCadence] = useState<FundingReleaseCadence>("quarterly")
  const [budgetReleasePeriods, setBudgetReleasePeriods] = useState<BudgetReleasePeriod[]>([])
  const [budgetStartDate, setBudgetStartDate] = useState("")
  const [budgetEndDate, setBudgetEndDate] = useState("")
  const [budgetStartPickerOpen, setBudgetStartPickerOpen] = useState(false)
  const [budgetEndPickerOpen, setBudgetEndPickerOpen] = useState(false)
  const [isComponentDropdownOpen, setIsComponentDropdownOpen] = useState(false)
  const [isCadenceDropdownOpen, setIsCadenceDropdownOpen] = useState(false)

  const [isSpendingPlanFormOpen, setIsSpendingPlanFormOpen] = useState(false)
  const [editingSpendingPlanId, setEditingSpendingPlanId] = useState<string | null>(null)
  const [spendingPlanName, setSpendingPlanName] = useState("")
  const [spendingPlanBudgetId, setSpendingPlanBudgetId] = useState("")
  const [spendingPlanChargeItemNumber, setSpendingPlanChargeItemNumber] = useState("")
  const [spendingPlanServiceName, setSpendingPlanServiceName] = useState("")
  const [spendingPlanQuantity, setSpendingPlanQuantity] = useState("1")
  const [spendingPlanUnit, setSpendingPlanUnit] = useState<"hour" | "each" | "km">("hour")
  const [spendingPlanCadence, setSpendingPlanCadence] = useState<BudgetPeriod>("per-week")
  const [spendingPlanStartDate, setSpendingPlanStartDate] = useState("")
  const [spendingPlanEndDate, setSpendingPlanEndDate] = useState("")
  const [spendingPlanDescription, setSpendingPlanDescription] = useState("")
  const [spendingPlanStartPickerOpen, setSpendingPlanStartPickerOpen] = useState(false)
  const [spendingPlanEndPickerOpen, setSpendingPlanEndPickerOpen] = useState(false)
  const [isSpendingPlanBudgetDropdownOpen, setIsSpendingPlanBudgetDropdownOpen] = useState(false)
  const [isSpendingPlanChargeDropdownOpen, setIsSpendingPlanChargeDropdownOpen] = useState(false)
  const [isSpendingPlanCadenceDropdownOpen, setIsSpendingPlanCadenceDropdownOpen] = useState(false)

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


  const getBudgetUsed = useCallback((budget: Budget) => getBudgetUsedAmount(budget, clientInvoices), [clientInvoices])

  const resetDocumentForm = useCallback(() => {
    setIsDocumentFormOpen(false)
    setEditingDocument(null)
    setDocUploadFolder("")
    setDocName("")
    setDocValidFrom("")
    setDocValidTo("")
    setDocPendingFile(null)
    setDocValidFromPickerOpen(false)
    setDocValidToPickerOpen(false)
    setIsSavingDocument(false)
  }, [])

  const ensureCarePlanFolders = useCallback(() => {
    if (!clientFolder) return
    if (!files.includes(clientFolder)) createFile(clientFolder)
    if (!files.includes(carePlanFolder)) createFile("Care plan", clientFolder)
  }, [clientFolder, carePlanFolder, files, createFile])

  const handleCarePlanUpload = useCallback(async (file: File, createdDate: string, renewalDate: string) => {
    if (!client) return false
    ensureCarePlanFolders()
    if (carePlan) await deleteCarePlan(carePlan.id)
    if (carePlanDocument) await deleteDocument(carePlanDocument)
    const { document: doc } = await uploadDocument(file, carePlanFolder)
    if (!doc) return false
    const saved = await upsertCarePlan({
      clientId: client.id,
      documentId: doc.id,
      createdDate,
      renewalDate,
    })
    if (!saved) return false
    showSaved()
    return true
  }, [client, ensureCarePlanFolders, carePlan, carePlanDocument, deleteCarePlan, deleteDocument, uploadDocument, carePlanFolder, upsertCarePlan, showSaved])

  const handleCarePlanUpdateDates = useCallback(async (createdDate: string, renewalDate: string) => {
    if (!client || !carePlan || !carePlanDocument) return false
    const saved = await upsertCarePlan({
      clientId: client.id,
      documentId: carePlanDocument.id,
      createdDate,
      renewalDate,
    })
    if (!saved) return false
    showSaved()
    return true
  }, [client, carePlan, carePlanDocument, upsertCarePlan, showSaved])

  const handleCarePlanRemove = useCallback(async () => {
    if (!carePlan || !carePlanDocument) return false
    await deleteCarePlan(carePlan.id)
    await deleteDocument(carePlanDocument)
    showSaved()
    return true
  }, [carePlan, carePlanDocument, deleteCarePlan, deleteDocument, showSaved])

  const resetCarePlanForm = useCallback(() => {
    setCarePlanCreatedDate("")
    setCarePlanRenewalDate("")
    setCarePlanFile(null)
    setIsCarePlanFormOpen(false)
    setCarePlanCreatedPickerOpen(false)
    setCarePlanRenewalPickerOpen(false)
    setIsSavingCarePlan(false)
  }, [])

  const initAddCarePlanForm = useCallback(() => {
    resetDocumentForm()
    setCarePlanCreatedDate("")
    setCarePlanRenewalDate("")
    setCarePlanFile(null)
    setCarePlanCreatedPickerOpen(false)
    setCarePlanRenewalPickerOpen(false)
    setIsCarePlanFormOpen(true)
    setIsSidebarVisible(true)
  }, [resetDocumentForm])

  const initEditCarePlanForm = useCallback(() => {
    if (!carePlan) return
    resetDocumentForm()
    setCarePlanCreatedDate(carePlan.createdDate || "")
    setCarePlanRenewalDate(carePlan.renewalDate || "")
    setCarePlanFile(null)
    setCarePlanCreatedPickerOpen(false)
    setCarePlanRenewalPickerOpen(false)
    setIsCarePlanFormOpen(true)
    setIsSidebarVisible(true)
  }, [carePlan, resetDocumentForm])

  const handleSaveCarePlan = useCallback(async () => {
    if (!carePlanCreatedDate || !carePlanRenewalDate) return
    if (!carePlan && !carePlanFile) return

    setIsSavingCarePlan(true)
    try {
      let ok = false
      if (carePlanFile) {
        ok = await handleCarePlanUpload(carePlanFile, carePlanCreatedDate, carePlanRenewalDate)
      } else if (carePlan) {
        ok = await handleCarePlanUpdateDates(carePlanCreatedDate, carePlanRenewalDate)
      }
      if (ok) resetCarePlanForm()
    } finally {
      setIsSavingCarePlan(false)
    }
  }, [
    carePlan,
    carePlanCreatedDate,
    carePlanRenewalDate,
    carePlanFile,
    handleCarePlanUpload,
    handleCarePlanUpdateDates,
    resetCarePlanForm,
  ])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] font-medium text-folk-secondary">Loading...</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-[13px] font-medium text-folk-secondary">Participant not found</p>
          <button onClick={() => router.push("/clients")} className="mt-[8px] text-[13px] font-medium text-[#555] underline transition-colors hover:text-folk-text" tabIndex={0}>
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

  const handleUpdateFields = (fields: Partial<ParticipantDetails>) => {
    updateParticipantFields(client.id, fields)
  }

  const openQuickAddTask = () => {
    setIsQuickAdding(true)
    setQuickActiveField("title")
    setTimeout(() => quickInputRef.current?.focus(), 50)
  }

  const activityLog = client.participant.activityLog || []

  const clientContacts = getContactsForClient(client.name, client.id)
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

  const openCreateDocumentForm = (folder: string) => {
    ensureFolderPath(folder, createFile)
    setIsGoalFormOpen(false)
    setEditingGoal(null)
    setIsCarePlanFormOpen(false)
    setIsBudgetFormOpen(false)
    setIsSpendingPlanFormOpen(false)
    resetItemForm()
    setEditingDocument(null)
    setDocUploadFolder(folder)
    setDocName("")
    setDocValidFrom("")
    setDocValidTo("")
    setDocPendingFile(null)
    setDocValidFromPickerOpen(false)
    setDocValidToPickerOpen(false)
    setIsDocumentFormOpen(true)
    setIsSidebarVisible(true)
    setAccountDetailsTab("details")
  }

  const openDocumentForm = (doc: Document) => {
    setIsGoalFormOpen(false)
    setEditingGoal(null)
    setIsCarePlanFormOpen(false)
    setIsBudgetFormOpen(false)
    setIsSpendingPlanFormOpen(false)
    resetItemForm()
    setEditingDocument(doc)
    setDocUploadFolder("")
    setDocName(doc.name)
    setDocValidFrom(doc.validFrom || "")
    setDocValidTo(doc.validTo || "")
    setDocPendingFile(null)
    setDocValidFromPickerOpen(false)
    setDocValidToPickerOpen(false)
    setIsDocumentFormOpen(true)
    setIsSidebarVisible(true)
    setAccountDetailsTab("details")
  }

  const handleSaveDocument = async () => {
    setIsSavingDocument(true)
    try {
      const result = await saveDocumentForm({
        editingDocument,
        docPendingFile,
        docUploadFolder,
        docName,
        docValidFrom,
        docValidTo,
        uploadDocument,
        updateDocument,
        replaceDocumentFile,
        createFile,
      })

      if (!result.ok) {
        toast(result.error, "error")
        return
      }

      showSaved()
      resetDocumentForm()
    } finally {
      setIsSavingDocument(false)
    }
  }

  const handlePreviewDocument = () => {
    if (editingDocument) setPreviewDoc(editingDocument)
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

  const budgets = client.participant.budgets || []
  const spendingPlans = client.participant.spendingPlans || []

  const goals = client.participant.goals || []

  const resetGoalForm = () => {
    setIsGoalFormOpen(false)
    setEditingGoal(null)
    resetDocumentForm()
  }

  const initGoalForm = () => {
    resetDocumentForm()
    setEditingGoal(null)
    setIsGoalFormOpen(true)
    setIsSidebarVisible(true)
  }

  const initEditGoalForm = (goal: ClientGoal) => {
    resetDocumentForm()
    setEditingGoal(goal)
    setIsGoalFormOpen(true)
    setIsSidebarVisible(true)
  }

  const handleSaveGoal = async (data: GoalFormData) => {
    const existingGoals = client.participant.goals || []
    const existingLog = client.participant.activityLog || []

    if (editingGoal) {
      const updatedGoals = existingGoals.map((g) =>
        g.id === editingGoal.id ? { ...g, ...data } : g
      )
      const entry: ActivityEntry = {
        id: crypto.randomUUID(),
        type: "goal_updated",
        message: `Updated the goal **${data.title}**`,
        user: currentUserName,
        createdAt: new Date().toISOString(),
      }
      await saveClient(client.id, {
        participant: { ...client.participant, goals: updatedGoals, activityLog: [entry, ...existingLog] },
      })
    } else {
      const newGoal: ClientGoal = {
        id: crypto.randomUUID(),
        title: data.title,
        goalType: data.goalType,
        status: data.status,
        achievementStrategies: data.achievementStrategies,
        barriers: data.barriers,
        linkedTasks: [],
        linkedShifts: [],
        createdAt: new Date().toISOString(),
      }
      const entry: ActivityEntry = {
        id: crypto.randomUUID(),
        type: "goal_created",
        message: `Created the goal **${data.title}**`,
        user: currentUserName,
        createdAt: new Date().toISOString(),
      }
      await saveClient(client.id, {
        participant: { ...client.participant, goals: [...existingGoals, newGoal], activityLog: [entry, ...existingLog] },
      })
    }
    resetGoalForm()
  }

  const handleDeleteGoal = async (goalId: string) => {
    const existingGoals = client.participant.goals || []
    const target = existingGoals.find((g) => g.id === goalId)
    const existingLog = client.participant.activityLog || []
    const entry: ActivityEntry = {
      id: crypto.randomUUID(),
      type: "goal_deleted",
      message: `Deleted the goal **${target?.title || "Untitled goal"}**`,
      user: currentUserName,
      createdAt: new Date().toISOString(),
    }
    await saveClient(client.id, {
      participant: { ...client.participant, goals: existingGoals.filter((g) => g.id !== goalId), activityLog: [entry, ...existingLog] },
    })
    resetGoalForm()
  }

  const resetBudgetForm = () => {
    setIsBudgetFormOpen(false)
    setEditingBudgetId(null)
    setBudgetName("")
    setBudgetFundingComponent("")
    setBudgetAllocatedAmount("")
    setBudgetReleaseCadence("quarterly")
    setBudgetReleasePeriods([])
    setBudgetStartDate("")
    setBudgetEndDate("")
    setBudgetStartPickerOpen(false)
    setBudgetEndPickerOpen(false)
    setIsComponentDropdownOpen(false)
    setIsCadenceDropdownOpen(false)
  }

  const handleSetBudgetFundingComponent = (component: NdisFundingComponent) => {
    setBudgetFundingComponent(component)
    setBudgetReleaseCadence(getDefaultReleaseCadenceForComponent(component))
    const label = NDIS_FUNDING_COMPONENTS.find((c) => c.id === component)?.label
    if (label && !budgetName.trim()) {
      setBudgetName(label)
    }
  }

  const initBudgetForm = () => {
    resetDocumentForm()
    resetSpendingPlanForm()
    resetBudgetForm()
    const defaultComponent = NDIS_FUNDING_COMPONENTS[0]
    setBudgetFundingComponent(defaultComponent.id)
    setBudgetReleaseCadence(getDefaultReleaseCadenceForComponent(defaultComponent.id))
    setBudgetName(defaultComponent.label)
    if (client.participant.planStartDate) setBudgetStartDate(client.participant.planStartDate)
    if (client.participant.planEndDate) setBudgetEndDate(client.participant.planEndDate)
    setIsBudgetFormOpen(true)
    setIsSidebarVisible(true)
  }

  const initEditBudgetForm = (budget: Budget) => {
    resetDocumentForm()
    setEditingBudgetId(budget.id)
    setBudgetName(budget.name)
    setBudgetFundingComponent(resolveBudgetFundingComponent(budget) || "")
    setBudgetAllocatedAmount(budget.allocatedAmount ? formatNumberDisplay(budget.allocatedAmount) : "")
    setBudgetReleaseCadence(budget.releaseCadence || "quarterly")
    setBudgetReleasePeriods(budget.releasePeriods || [])
    setBudgetStartDate(budget.startDate)
    setBudgetEndDate(budget.endDate)
    setIsBudgetFormOpen(true)
    setIsSidebarVisible(true)
  }

  const handleUsePlanDates = () => {
    if (!client.participant.planStartDate && !client.participant.planEndDate) return
    if (client.participant.planStartDate) setBudgetStartDate(client.participant.planStartDate)
    if (client.participant.planEndDate) setBudgetEndDate(client.participant.planEndDate)
  }

  const handleSaveBudget = async () => {
    if (!budgetName.trim() || !budgetStartDate || !budgetEndDate || !budgetFundingComponent) return

    const amount = parseFormattedNumber(budgetAllocatedAmount)
    if (amount <= 0) return

    const existingBudgets = client.participant.budgets || []
    const existingBudget = editingBudgetId
      ? existingBudgets.find((b) => b.id === editingBudgetId) || null
      : null

    const scheduleParams = {
      startDate: budgetStartDate,
      endDate: budgetEndDate,
      cadence: budgetReleaseCadence,
      allocatedAmount: amount,
    }

    const releasePeriods = shouldRegenerateReleasePeriods(existingBudget, scheduleParams)
      ? generateReleasePeriods(budgetStartDate, budgetEndDate, budgetReleaseCadence, amount)
      : budgetReleasePeriods

    const componentLabel = NDIS_FUNDING_COMPONENTS.find((c) => c.id === budgetFundingComponent)?.label

    const budgetFields = {
      name: budgetName.trim(),
      startDate: budgetStartDate,
      endDate: budgetEndDate,
      fundingComponent: budgetFundingComponent,
      fundingPoolId: undefined,
      supportCategoryNumber: undefined,
      supportCategoryLabel: componentLabel,
      allocatedAmount: amount,
      releaseCadence: budgetReleaseCadence,
      releasePeriods,
    }

    const existingLog = client.participant.activityLog || []
    const spendingPlansList = client.participant.spendingPlans || []

    if (editingBudgetId) {
      const updatedBudgets = existingBudgets.map((b) =>
        b.id === editingBudgetId
          ? {
              ...b,
              ...budgetFields,
              chargeItems: deriveBudgetChargeItems(editingBudgetId, spendingPlansList),
            }
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
      resetBudgetForm()
    } else {
      const newId = crypto.randomUUID()
      const newBudget: Budget = {
        id: newId,
        ...budgetFields,
        chargeItems: deriveBudgetChargeItems(newId, spendingPlansList),
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
      resetBudgetForm()
    }
  }

  const handleDeleteBudget = async (budgetId: string) => {
    const existingBudgets = client.participant.budgets || []
    const target = existingBudgets.find((b) => b.id === budgetId)
    if (!target) return

    const existingPlans = client.participant.spendingPlans || []
    const removedPlans = existingPlans.filter((plan) => plan.budgetId === budgetId)
    const remainingPlans = existingPlans.filter((plan) => plan.budgetId !== budgetId)
    const existingLog = client.participant.activityLog || []

    const entries: ActivityEntry[] = [
      {
        id: crypto.randomUUID(),
        type: "budget_deleted",
        message: removedPlans.length > 0
          ? `Deleted the budget **${target.name}** and ${removedPlans.length} linked spending ${removedPlans.length === 1 ? "plan" : "plans"}`
          : `Deleted the budget **${target.name}**`,
        user: currentUserName,
        createdAt: new Date().toISOString(),
      },
    ]

    await saveClient(client.id, {
      participant: {
        ...client.participant,
        budgets: existingBudgets.filter((b) => b.id !== budgetId),
        spendingPlans: remainingPlans,
        activityLog: [...entries, ...existingLog],
      },
    })
    resetBudgetForm()
  }

  const resetSpendingPlanForm = () => {
    setIsSpendingPlanFormOpen(false)
    setEditingSpendingPlanId(null)
    setSpendingPlanName("")
    setSpendingPlanBudgetId("")
    setSpendingPlanChargeItemNumber("")
    setSpendingPlanServiceName("")
    setSpendingPlanQuantity("1")
    setSpendingPlanUnit("hour")
    setSpendingPlanCadence("per-week")
    setSpendingPlanStartDate("")
    setSpendingPlanEndDate("")
    setSpendingPlanDescription("")
    setSpendingPlanStartPickerOpen(false)
    setSpendingPlanEndPickerOpen(false)
    setIsSpendingPlanBudgetDropdownOpen(false)
    setIsSpendingPlanChargeDropdownOpen(false)
    setIsSpendingPlanCadenceDropdownOpen(false)
  }

  const initSpendingPlanForm = () => {
    resetDocumentForm()
    resetBudgetForm()
    resetSpendingPlanForm()
    const charge = enabledCharges[0]
    setSpendingPlanChargeItemNumber(charge?.itemNumber || "")
    setSpendingPlanServiceName(charge?.shortName || charge?.name || "")
    setSpendingPlanUnit((charge?.unit as "hour" | "each" | "km") || "hour")
    if (client.participant.planStartDate) setSpendingPlanStartDate(client.participant.planStartDate)
    if (client.participant.planEndDate) setSpendingPlanEndDate(client.participant.planEndDate)
    const firstBudget = (client.participant.budgets || [])[0]
    if (firstBudget) setSpendingPlanBudgetId(firstBudget.id)
    setIsSpendingPlanFormOpen(true)
    setIsSidebarVisible(true)
  }

  const initEditSpendingPlanForm = (plan: SpendingPlan) => {
    resetDocumentForm()
    setEditingSpendingPlanId(plan.id)
    setSpendingPlanName(plan.name)
    setSpendingPlanBudgetId(plan.budgetId || "")
    setSpendingPlanChargeItemNumber(plan.chargeItemNumber)
    setSpendingPlanServiceName(plan.serviceName)
    setSpendingPlanQuantity(formatNumberDisplay(plan.quantity) || String(plan.quantity))
    setSpendingPlanUnit(plan.unit)
    setSpendingPlanCadence(plan.cadence)
    setSpendingPlanStartDate(plan.startDate)
    setSpendingPlanEndDate(plan.endDate)
    setSpendingPlanDescription(plan.description)
    setIsSpendingPlanFormOpen(true)
    setIsSidebarVisible(true)
  }

  const handleUseSpendingPlanDates = () => {
    if (!client.participant.planStartDate && !client.participant.planEndDate) return
    if (client.participant.planStartDate) setSpendingPlanStartDate(client.participant.planStartDate)
    if (client.participant.planEndDate) setSpendingPlanEndDate(client.participant.planEndDate)
  }

  const handleUseSpendingPlanBudgetDates = () => {
    const linkedBudget = budgets.find((b) => b.id === spendingPlanBudgetId)
    if (!linkedBudget) return
    if (linkedBudget.startDate) setSpendingPlanStartDate(linkedBudget.startDate)
    if (linkedBudget.endDate) setSpendingPlanEndDate(linkedBudget.endDate)
  }

  const handleSaveSpendingPlan = async () => {
    if (!spendingPlanName.trim() || !spendingPlanChargeItemNumber || !spendingPlanStartDate || !spendingPlanEndDate || !spendingPlanBudgetId) return
    const qty = parseFormattedNumber(spendingPlanQuantity)
    if (qty <= 0) return

    const linkedBudget = budgets.find((b) => b.id === spendingPlanBudgetId)
    if (linkedBudget) {
      const budgetComponent = resolveBudgetFundingComponent(linkedBudget)
      if (budgetComponent) {
        const validation = validateChargeItemForBudgetComponent(spendingPlanChargeItemNumber, enabledCharges, budgetComponent)
        if (!validation.valid) {
          toast(validation.message || "Charge item does not match budget funding component", "error")
          return
        }
      }
    }

    const existingPlans = client.participant.spendingPlans || []
    const existingBudgets = client.participant.budgets || []
    const existingLog = client.participant.activityLog || []

    const planFields = {
      name: spendingPlanName.trim(),
      budgetId: spendingPlanBudgetId,
      chargeItemNumber: spendingPlanChargeItemNumber,
      serviceName: spendingPlanServiceName,
      quantity: qty,
      unit: spendingPlanUnit,
      cadence: spendingPlanCadence,
      startDate: spendingPlanStartDate,
      endDate: spendingPlanEndDate,
      description: spendingPlanDescription,
    }

    let updatedPlans: SpendingPlan[]
    if (editingSpendingPlanId) {
      updatedPlans = existingPlans.map((plan) =>
        plan.id === editingSpendingPlanId ? { ...plan, ...planFields } : plan
      )
    } else {
      updatedPlans = [
        ...existingPlans,
        {
          id: crypto.randomUUID(),
          ...planFields,
          createdAt: new Date().toISOString(),
        },
      ]
    }

    const affectedBudgetIds = new Set(
      updatedPlans
        .filter((plan) => plan.budgetId)
        .map((plan) => plan.budgetId as string)
    )
    if (spendingPlanBudgetId) affectedBudgetIds.add(spendingPlanBudgetId)

    const updatedBudgets = existingBudgets.map((budget) =>
      affectedBudgetIds.has(budget.id)
        ? { ...budget, chargeItems: deriveBudgetChargeItems(budget.id, updatedPlans) }
        : budget
    )

    const entry: ActivityEntry = {
      id: crypto.randomUUID(),
      type: editingSpendingPlanId ? "spending_plan_updated" : "spending_plan_created",
      message: `${editingSpendingPlanId ? "Updated" : "Created"} the spending plan **${spendingPlanName.trim()}**`,
      user: currentUserName,
      createdAt: new Date().toISOString(),
    }

    await saveClient(client.id, {
      participant: {
        ...client.participant,
        spendingPlans: updatedPlans,
        budgets: updatedBudgets,
        activityLog: [entry, ...existingLog],
      },
    })
    resetSpendingPlanForm()
  }

  const handleDeleteSpendingPlan = async (planId: string) => {
    const existingPlans = client.participant.spendingPlans || []
    const target = existingPlans.find((plan) => plan.id === planId)
    if (!target) return

    const remainingPlans = existingPlans.filter((plan) => plan.id !== planId)
    const existingBudgets = client.participant.budgets || []
    const existingLog = client.participant.activityLog || []

    const updatedBudgets = target.budgetId
      ? existingBudgets.map((budget) =>
          budget.id === target.budgetId
            ? { ...budget, chargeItems: deriveBudgetChargeItems(budget.id, remainingPlans) }
            : budget
        )
      : existingBudgets

    const entry: ActivityEntry = {
      id: crypto.randomUUID(),
      type: "spending_plan_deleted",
      message: `Deleted the spending plan **${target.name}**`,
      user: currentUserName,
      createdAt: new Date().toISOString(),
    }

    await saveClient(client.id, {
      participant: {
        ...client.participant,
        spendingPlans: remainingPlans,
        budgets: updatedBudgets,
        activityLog: [entry, ...existingLog],
      },
    })
    resetSpendingPlanForm()
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
    resetDocumentForm()
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
    resetDocumentForm()
    resetItemForm()
    setEditingItemId(li.id)
    setEditingItemBudgetId(budgetId)
    setItemChargeItemNumber(li.chargeItemNumber)
    setItemBillingCode(li.billingCode)
    setItemServiceName(li.serviceName)
    setItemQuantity(formatNumberDisplay(li.quantity) || String(li.quantity))
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
        quantity: parseFormattedNumber(itemQuantity),
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

  const getBudgetTotal = (budget: Budget) => getBudgetLineTotal(budget, enabledCharges)

  const getBudgetMetrics = (budget: Budget) =>
    getBudgetRowMetrics(budget, clientInvoices, enabledCharges, {
      spendingPlans,
      shifts,
      clientId: client.id,
    })

  const shiftProjection = getScheduledShiftProjection(shifts, client.id, enabledCharges)

  const getPlanPeriodCost = (plan: SpendingPlan) => getSpendingPlanCadenceCost(plan, enabledCharges)

  const getPlanTotalCost = (plan: SpendingPlan) => getSpendingPlanPeriodCost(plan, enabledCharges)

  const periodLabels: Record<BudgetPeriod, string> = {
    "per-week": "Per week",
    "per-fortnight": "Per fortnight",
    "per-month": "Per month",
    "per-year": "Per year",
    "per-plan": "Per plan",
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div ref={headerRef} className="flex shrink-0 flex-col bg-white">
        <ProfileRecordHeader
          name={client.displayName}
          onBack={handleProfileBack}
          backLabel={profileBackLabel}
          actions={
            <>
              <SaveIndicator isVisible={isSaved} />
              <ProfileNavTextAction onClick={openQuickAddTask}>
                Add task
              </ProfileNavTextAction>
              <IconButton
                type="button"
                onClick={() => router.push(`/roster?createShift=1&clientId=${encodeURIComponent(client.id)}`)}
                tooltip="Create shift"
                className={cn(
                  "flex h-[24px] w-[24px] items-center justify-center",
                  folkNavIconButtonClass()
                )}
                tabIndex={0}
              >
                <CalendarRange className="h-[14px] w-[14px]" strokeWidth={1.75} />
              </IconButton>
            </>
          }
        />

      </div>

      <div className={profilePageTabRowClass()}>
        <div className={profilePageTabBarClass()}>
          <div className={profileMainTabScrollClass()}>
            {visibleTabs.map((tab) => {
              const TabIcon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <ProfileTabButton
                  key={tab.key}
                  isActive={isActive}
                  onClick={() => { setActiveTab(tab.key); resetCarePlanForm(); resetBudgetForm(); resetSpendingPlanForm(); resetItemForm(); resetGoalForm() }}
                  icon={TabIcon}
                  label={tab.label}
                  badge={getTabBadge(tab.key)}
                />
              )
            })}
          </div>
          {!isSidebarVisible && (
            <AccountDetailsSidebarToggle
              isOpen={false}
              onToggle={() => setIsSidebarVisible(true)}
            />
          )}
        </div>
        {isSidebarVisible && (
          <div className="flex shrink-0 self-stretch border-l border-folk-border">
            <div
              onMouseDown={handleMouseDown}
              className="w-[4px] shrink-0 cursor-col-resize self-stretch transition-colors hover:bg-[var(--folk-border-subtle)]"
              aria-hidden="true"
            />
            <div className="flex h-full min-w-0 shrink-0 flex-col" style={{ width: sidebarWidth }}>
              <AccountDetailsTabBar
                activeTab={accountDetailsTab}
                onTabChange={setAccountDetailsTab}
                onHideSidebar={() => setIsSidebarVisible(false)}
                className="h-full border-b-0 px-[12px]"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {isQuickAdding && (
              <>
                <div className="fixed inset-0 z-[48]" onClick={resetQuickAdd} />
                <div
                  className="fixed z-[49] w-[520px] rounded-[6px] border border-folk-border bg-folk-surface shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
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
                      className="w-full text-[15px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none"
                      autoFocus
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-[6px] px-[16px] pb-[4px] pt-[10px]">
                    <div className="flex items-center gap-[5px] rounded-[6px] border border-folk-border bg-folk-hover px-[8px] py-[3px]">
                      <Building2 className="h-[12px] w-[12px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                      <span className="text-[12px] font-medium text-folk-text">{client.displayName}</span>
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
                            <div className={`flex items-center gap-[5px] rounded-[6px] border px-[8px] py-[3px] transition-colors ${quickActiveField === "assignee" ? "border-blue-400" : "border-folk-border"}`}>
                              <User className={`h-[12px] w-[12px] shrink-0 ${quickAssignee ? "text-folk-secondary" : "text-[#ccc]"}`} strokeWidth={1.5} />
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
                                className="w-[80px] bg-transparent text-[12px] font-medium text-folk-text placeholder-[#ccc] outline-none"
                              />
                            </div>
                            {isQuickAssigneeOpen && (
                              <>
                                <div className="fixed inset-0 z-[59]" onClick={() => { setIsQuickAssigneeOpen(false); setQuickAssigneeIdx(-1); setQuickAssigneeSearch("") }} />
                                <div ref={quickAssigneeListRef} className="absolute left-0 top-full z-[60] mt-[4px] max-h-[200px] w-[220px] overflow-y-auto rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-folk">
                                  {filteredStaff.length === 0 ? (
                                    <div className="px-[12px] py-[7px] text-[12px] font-medium text-folk-secondary">No matches</div>
                                  ) : (
                                    filteredStaff.map((name, i) => {
                                      const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                                      return (
                                        <div
                                          key={name}
                                          onClick={() => selectAssignee(name)}
                                          className={`flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover ${quickAssigneeIdx === i ? "bg-blue-50" : ""}`}
                                          role="option"
                                          aria-selected={quickAssigneeIdx === i}
                                        >
                                          <EntityIcon text={initials} size="xsm" />
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
                            <div className={`flex items-center gap-[5px] rounded-[6px] border px-[8px] py-[3px] transition-colors ${quickActiveField === "charge" ? "border-blue-400" : "border-folk-border"}`}>
                              <Tag className={`h-[12px] w-[12px] shrink-0 ${quickCharge ? "text-folk-secondary" : "text-[#ccc]"}`} strokeWidth={1.5} />
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
                                className="w-[80px] bg-transparent text-[12px] font-medium text-folk-text placeholder-[#ccc] outline-none"
                              />
                            </div>
                            {isQuickChargeOpen && (
                              <>
                                <div className="fixed inset-0 z-[59]" onClick={() => { setIsQuickChargeOpen(false); setQuickChargeIdx(-1); setQuickChargeSearch("") }} />
                                <div ref={quickChargeListRef} className="absolute left-0 top-full z-[60] mt-[4px] max-h-[220px] w-[200px] overflow-y-auto rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-folk">
                                  {filteredCharges.length === 0 ? (
                                    <div className="px-[12px] py-[7px] text-[12px] font-medium text-folk-secondary">No matches</div>
                                  ) : (
                                    filteredCharges.map((ct, i) => (
                                      <div
                                        key={ct.value || "__none__"}
                                        onClick={() => selectCharge(ct.value)}
                                        className={`flex w-full cursor-pointer items-center px-[12px] py-[7px] text-[13px] font-medium transition-colors hover:bg-folk-hover ${quickChargeIdx === i ? "bg-blue-50" : ""} ${ct.value ? "text-folk-text" : "text-folk-secondary"}`}
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

                    <div className="flex items-center gap-[5px] rounded-[6px] border border-folk-border px-[8px] py-[4px]">
                      <Clock className={`h-[12px] w-[12px] ${quickTime ? "text-folk-secondary" : "text-[#ccc]"}`} strokeWidth={1.5} />
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
                        className="w-[40px] bg-transparent text-[12px] font-medium text-folk-text placeholder-[#ccc] outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-folk-border-subtle px-[16px] py-[10px]">
                    <span className="text-[11px] font-medium text-[#ccc]">Enter ↵ next · Esc close</span>
                    <div className="flex items-center gap-[6px]">
                      <button type="button" onClick={resetQuickAdd} className="rounded-[6px] px-[8px] py-[4px] text-[12px] font-medium text-folk-secondary transition-colors hover:bg-[var(--folk-border-subtle)]" tabIndex={0}>Cancel</button>
                      <button type="button" onClick={handleQuickFinish} disabled={!quickTitle.trim()} className="primary-btn px-[12px] py-[4px] text-[12px] font-medium transition-colors disabled:opacity-40" tabIndex={0}>Create</button>
                    </div>
                  </div>
                </div>
              </>
            )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {activeTab === "careplan" ? (
            <CareplanTab
              carePlan={carePlan}
              document={carePlanDocument}
              onAddNew={initAddCarePlanForm}
              onEdit={initEditCarePlanForm}
            />
          ) : activeTab === "budgets" ? (
            <BudgetsTab
              budgets={budgets}
              onAddNew={initBudgetForm}
              onEditBudget={initEditBudgetForm}
              getBudgetMetrics={getBudgetMetrics}
            />
          ) : activeTab === "spending-plan" ? (
            <SpendingPlanTab
              spendingPlans={spendingPlans}
              budgets={budgets}
              shiftCount={shiftProjection.shiftCount}
              shiftProjectedTotal={shiftProjection.projectedTotal}
              onAddNew={initSpendingPlanForm}
              onEditPlan={initEditSpendingPlanForm}
              getPlanPeriodCost={getPlanPeriodCost}
              getPlanTotalCost={getPlanTotalCost}
            />
          ) : activeTab === "billable-entries" ? (
            <BillableEntriesTab
              clientId={client.id}
              clientName={client.displayName || client.name}
              enabledCharges={enabledCharges}
            />
          ) : activeTab === "goals" ? (
            <GoalsTab
              goals={goals}
              onAddNew={initGoalForm}
              onEditGoal={initEditGoalForm}
            />
          ) : activeTab === "contacts" ? (
            <div className="relative flex h-full flex-col">
              {/* Toolbar */}
              <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-folk-border bg-white px-[16px]">
                <button
                  className="flex items-center gap-[6px] folk-pill-btn border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                  tabIndex={0}
                >
                  <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>Filter</span>
                </button>
                <button
                  onClick={() => setIsAddContactOpen(true)}
                  className="primary-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
                  tabIndex={0}
                >
                  <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>Add new</span>
                </button>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className={TABLE_FULL}>
                  <thead>
                    <tr>
                      <th className={TABLE_PANEL_HEADER_STICKY}>Contact name</th>
                      <th className={TABLE_PANEL_HEADER_STICKY}>Relationship</th>
                      <th className={TABLE_PANEL_HEADER_STICKY}>Email</th>
                      <th className={TABLE_PANEL_HEADER_STICKY_LAST}>Phone number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allContacts.map((contact) => {
                      const rel = relationshipConfig[contact.relationship] ?? { label: contact.relationship || "—", color: "bg-gray-50 text-gray-600", dotColor: "bg-gray-400" }
                      const fullName = contact.firstName
                      const initials = fullName.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase()
                      return (
                        <tr key={contact.id} className="transition-colors hover:bg-folk-hover">
                          <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>
                            <div className="flex items-center gap-[8px]">
                              <EntityIcon text={initials} size="sm" />
                              {fullName}
                            </div>
                          </td>
                          <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>
                            {rel ? (
                              <CategoryChip label={rel.label} categoryKey={contact.relationship} size="lg" />
                            ) : (
                              <span className="text-folk-placeholder">—</span>
                            )}
                          </td>
                          <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>{contact.email || <span className="text-folk-placeholder">—</span>}</td>
                          <td className={`${TABLE_PANEL_CELL_LAST} ${TABLE_PANEL_TEXT}`}>{contact.phone || <span className="text-folk-placeholder">—</span>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
                <span className="text-[12px] font-medium text-folk-secondary">{allContacts.length} {allContacts.length === 1 ? "contact" : "contacts"}</span>
              </div>

            </div>
          ) : activeTab === "suitability" ? (
            <SuitabilityTab view="client" entityId={client.id} />
          ) : activeTab === "tasks" ? (
            <ProfileTasksTab
              tasks={clientTasks}
              chargeCode={chargeCode}
              onToggleComplete={(task) => updateTask(task.id, { status: task.status === "done" ? "todo" : "done" })}
              onCreateTask={openQuickAddTask}
            />
          ) : activeTab === "files" ? (
            <FilesTab
              rootFolder={clientFolder}
              documents={documents}
              files={files}
              onCreateDocument={openCreateDocumentForm}
              onCreateFile={createFile}
              onDeleteFile={deleteFile}
              onDownloadDoc={handleDownloadDoc}
              onDeleteDocument={deleteDocument}
              onOpenDoc={openDocumentForm}
              onPreviewDoc={setPreviewDoc}
            />
          ) : activeTab === "notes" ? (
            <ProfileNotesTab
              notes={clientNotes}
              onOpenNote={openNote}
              onCreateNote={handleCreateNote}
              isCreating={isCreatingNote}
              emptyDescription="Notes linked to this participant will appear here."
            />
          ) : activeTab === "incidents" ? (
            <ProfileIncidentsTab
              incidents={clientIncidents}
              onOpenIncident={(incidentId) => router.push(`/incidents/${incidentId}`)}
              onCreateIncident={canViewIncidents ? () => router.push(`/incidents/new?client=${id}`) : undefined}
            />
          ) : activeTab === "shift-notes" ? (
            <ProfileShiftNotesTab
              shifts={clientShiftNotes}
              variant="client"
              emptyDescription="Progress notes recorded for this participant will appear here."
            />
          ) : activeTab !== "overview" ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[13px] font-medium text-folk-placeholder">No content yet</p>
            </div>
          ) : (
          <div className="flex w-full flex-col gap-[28px] px-[16px] py-[24px]">
            <ActivityOverviewSummary
              entries={activityLog}
              currentUserName={currentUserName}
              onViewAll={() => {
                setAccountDetailsTab("activity")
                setIsSidebarVisible(true)
              }}
            />
            <NotesOverviewSummary
              notes={clientNotes}
              onViewAll={() => setActiveTab("notes")}
              onOpenNote={openNote}
            />
            {canViewIncidents && (
              <IncidentsOverviewSummary
                incidents={clientIncidents}
                onViewAll={() => setActiveTab("incidents")}
                onOpenIncident={(incidentId) => router.push(`/incidents/${incidentId}`)}
              />
            )}
          </div>
          )}
        </div>
        </div>

        {isSidebarVisible && (
          <div className="flex min-h-0 shrink-0 border-l border-folk-border">
            <div
              onMouseDown={handleMouseDown}
              className="w-[4px] shrink-0 cursor-col-resize self-stretch transition-colors hover:bg-[var(--folk-border-subtle)]"
              aria-hidden="true"
            />
            <div className="min-h-0 flex-1 overflow-y-auto" style={{ width: sidebarWidth }}>
              <ProfileSidebar
                embedded
          client={client}
          p={p}
          pf={pf}
          budgets={budgets}
          sidebarWidth={sidebarWidth}
          staffNames={assignableCoordinators}
          canAssignClients={canAssignClients}
          enabledCharges={enabledCharges}
          isCarePlanFormOpen={isCarePlanFormOpen}
          carePlanCreatedDate={carePlanCreatedDate}
          carePlanRenewalDate={carePlanRenewalDate}
          carePlanFile={carePlanFile}
          carePlanExistingDocumentName={carePlanDocument?.name}
          carePlanCreatedPickerOpen={carePlanCreatedPickerOpen}
          carePlanRenewalPickerOpen={carePlanRenewalPickerOpen}
          isSavingCarePlan={isSavingCarePlan}
          onSetCarePlanCreatedDate={setCarePlanCreatedDate}
          onSetCarePlanRenewalDate={setCarePlanRenewalDate}
          onSetCarePlanFile={setCarePlanFile}
          onSetCarePlanCreatedPickerOpen={setCarePlanCreatedPickerOpen}
          onSetCarePlanRenewalPickerOpen={setCarePlanRenewalPickerOpen}
          onResetCarePlanForm={resetCarePlanForm}
          onSaveCarePlan={handleSaveCarePlan}
          isBudgetFormOpen={isBudgetFormOpen}
          editingBudgetId={editingBudgetId}
          budgetName={budgetName}
          budgetFundingComponent={budgetFundingComponent}
          budgetAllocatedAmount={budgetAllocatedAmount}
          budgetReleaseCadence={budgetReleaseCadence}
          budgetReleasePeriods={budgetReleasePeriods}
          budgetStartDate={budgetStartDate}
          budgetEndDate={budgetEndDate}
          budgetStartPickerOpen={budgetStartPickerOpen}
          budgetEndPickerOpen={budgetEndPickerOpen}
          isComponentDropdownOpen={isComponentDropdownOpen}
          isCadenceDropdownOpen={isCadenceDropdownOpen}
          onSetBudgetName={setBudgetName}
          onSetBudgetFundingComponent={handleSetBudgetFundingComponent}
          onSetBudgetAllocatedAmount={setBudgetAllocatedAmount}
          onSetBudgetReleaseCadence={setBudgetReleaseCadence}
          onSetBudgetReleasePeriods={setBudgetReleasePeriods}
          onSetBudgetStartDate={setBudgetStartDate}
          onSetBudgetEndDate={setBudgetEndDate}
          onSetBudgetStartPickerOpen={setBudgetStartPickerOpen}
          onSetBudgetEndPickerOpen={setBudgetEndPickerOpen}
          onSetIsComponentDropdownOpen={setIsComponentDropdownOpen}
          onSetIsCadenceDropdownOpen={setIsCadenceDropdownOpen}
          onResetBudgetForm={resetBudgetForm}
          onSaveBudget={handleSaveBudget}
          onDeleteBudget={handleDeleteBudget}
          onUsePlanDates={handleUsePlanDates}
          isSpendingPlanFormOpen={isSpendingPlanFormOpen}
          editingSpendingPlanId={editingSpendingPlanId}
          spendingPlanName={spendingPlanName}
          spendingPlanBudgetId={spendingPlanBudgetId}
          spendingPlanChargeItemNumber={spendingPlanChargeItemNumber}
          spendingPlanServiceName={spendingPlanServiceName}
          spendingPlanQuantity={spendingPlanQuantity}
          spendingPlanUnit={spendingPlanUnit}
          spendingPlanCadence={spendingPlanCadence}
          spendingPlanStartDate={spendingPlanStartDate}
          spendingPlanEndDate={spendingPlanEndDate}
          spendingPlanDescription={spendingPlanDescription}
          spendingPlanStartPickerOpen={spendingPlanStartPickerOpen}
          spendingPlanEndPickerOpen={spendingPlanEndPickerOpen}
          isSpendingPlanBudgetDropdownOpen={isSpendingPlanBudgetDropdownOpen}
          isSpendingPlanChargeDropdownOpen={isSpendingPlanChargeDropdownOpen}
          isSpendingPlanCadenceDropdownOpen={isSpendingPlanCadenceDropdownOpen}
          onSetSpendingPlanName={setSpendingPlanName}
          onSetSpendingPlanBudgetId={setSpendingPlanBudgetId}
          onSetSpendingPlanChargeItemNumber={setSpendingPlanChargeItemNumber}
          onSetSpendingPlanServiceName={setSpendingPlanServiceName}
          onSetSpendingPlanQuantity={setSpendingPlanQuantity}
          onSetSpendingPlanUnit={setSpendingPlanUnit}
          onSetSpendingPlanCadence={setSpendingPlanCadence}
          onSetSpendingPlanStartDate={setSpendingPlanStartDate}
          onSetSpendingPlanEndDate={setSpendingPlanEndDate}
          onSetSpendingPlanDescription={setSpendingPlanDescription}
          onSetSpendingPlanStartPickerOpen={setSpendingPlanStartPickerOpen}
          onSetSpendingPlanEndPickerOpen={setSpendingPlanEndPickerOpen}
          onSetIsSpendingPlanBudgetDropdownOpen={setIsSpendingPlanBudgetDropdownOpen}
          onSetIsSpendingPlanChargeDropdownOpen={setIsSpendingPlanChargeDropdownOpen}
          onSetIsSpendingPlanCadenceDropdownOpen={setIsSpendingPlanCadenceDropdownOpen}
          onResetSpendingPlanForm={resetSpendingPlanForm}
          onSaveSpendingPlan={handleSaveSpendingPlan}
          onDeleteSpendingPlan={handleDeleteSpendingPlan}
          onUseSpendingPlanDates={handleUseSpendingPlanDates}
          onUseSpendingPlanBudgetDates={handleUseSpendingPlanBudgetDates}
          isGoalFormOpen={isGoalFormOpen}
          editingGoal={editingGoal}
          onResetGoalForm={resetGoalForm}
          onSaveGoal={handleSaveGoal}
          onDeleteGoal={handleDeleteGoal}
          onOpenGoalTask={(taskId) => router.push(`/tasks?task=${taskId}`)}
          onResolveGoalTask={(taskId) => {
            const t = allTasks.find((x) => x.id === taskId)
            return t ? { title: t.title, status: t.status, exists: true } : null
          }}
          isItemFormOpen={isItemFormOpen}
          editingItemId={editingItemId}
          addingItemToBudgetId={addingItemToBudgetId}
          editingItemBudgetId={editingItemBudgetId}
          itemChargeItemNumber={itemChargeItemNumber}
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
          activityLog={activityLog}
          currentUserName={currentUserName}
          accountDetailsTab={accountDetailsTab}
          onAccountDetailsTabChange={setAccountDetailsTab}
          hideAccountDetailsTabBar={isSidebarVisible}
          isDocumentFormOpen={isDocumentFormOpen}
          editingDocument={editingDocument}
          docName={docName}
          docValidFrom={docValidFrom}
          docValidTo={docValidTo}
          docPendingFile={docPendingFile}
          docValidFromPickerOpen={docValidFromPickerOpen}
          docValidToPickerOpen={docValidToPickerOpen}
          isSavingDocument={isSavingDocument}
          onSetDocName={setDocName}
          onSetDocValidFrom={setDocValidFrom}
          onSetDocValidTo={setDocValidTo}
          onSetDocPendingFile={setDocPendingFile}
          onSetDocValidFromPickerOpen={setDocValidFromPickerOpen}
          onSetDocValidToPickerOpen={setDocValidToPickerOpen}
          onResetDocumentForm={resetDocumentForm}
          onSaveDocument={handleSaveDocument}
          onPreviewDocument={handlePreviewDocument}
          onSetSidebarVisible={setIsSidebarVisible}
          onMouseDown={handleMouseDown}
          onUpdateField={handleUpdateField}
          onUpdateFields={handleUpdateFields}
          onUpdateClient={updateClient}
          periodLabels={periodLabels}
                />
            </div>
          </div>
        )}
      </div>

      {/* Create contact modal — rendered at component level so it works from any tab */}
      {isAddContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => { setIsAddContactOpen(false); setIsRelationshipOpen(false); setNewContact({ firstName: "", email: "", phone: "", relationship: "" }) }} />
          <div className="relative z-10 w-[440px] rounded-[6px] bg-folk-surface shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between px-[24px] pt-[20px]">
              <div className="flex items-center gap-[8px]">
                <UserPlus className="h-[16px] w-[16px] text-[#555]" strokeWidth={1.5} />
                <h2 className="text-[15px] font-semibold text-folk-text">Create contact</h2>
              </div>
              <button
                onClick={() => { setIsAddContactOpen(false); setIsRelationshipOpen(false); setNewContact({ firstName: "", email: "", phone: "", relationship: "" }) }}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="px-[24px] pb-[20px] pt-[16px]">
              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Account</label>
                <div className="flex h-[36px] items-center rounded-[6px] border border-folk-border bg-folk-page px-[10px]">
                  <div className="flex items-center gap-[6px]">
                    <ClientIcon client={client} size="sm" />
                    <span className="text-[13px] font-medium text-folk-text">{client.displayName}</span>
                  </div>
                </div>
              </div>

              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={newContact.firstName}
                  onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                  className="h-[38px] w-full rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none transition-colors focus:border-[#a3c4f3]"
                />
              </div>

              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Email</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="h-[38px] w-full rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none transition-colors focus:border-[#a3c4f3]"
                />
              </div>

              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Phone</label>
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="h-[38px] w-full rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none transition-colors focus:border-[#a3c4f3]"
                />
              </div>

              <div className="mb-[20px]">
                <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Relationship</label>
                <button
                  ref={relationshipRef}
                  type="button"
                  onClick={() => setIsRelationshipOpen(!isRelationshipOpen)}
                  className="flex h-[38px] w-full items-center justify-between rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] font-medium outline-none transition-colors focus:border-[#a3c4f3]"
                  tabIndex={0}
                >
                  {newContact.relationship ? (
                    (() => {
                      const rel = relationshipConfig[newContact.relationship]
                      return <CategoryChip label={rel?.label ?? newContact.relationship} categoryKey={newContact.relationship} size="lg" />
                    })()
                  ) : (
                    <span className="text-folk-placeholder">Select relationship</span>
                  )}
                  <ChevronDown className={`h-[14px] w-[14px] text-folk-secondary transition-transform ${isRelationshipOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreateContact}
                  className="primary-btn px-[16px] py-[7px] text-[13px] font-medium transition-colors"
                  tabIndex={0}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
          <FixedDropdownMenu
            isOpen={isRelationshipOpen}
            anchorRef={relationshipRef}
            onClose={() => setIsRelationshipOpen(false)}
            estimatedHeight={240}
            minWidth={relationshipRef.current?.getBoundingClientRect().width ?? 220}
            className="py-[4px]"
          >
            {Object.entries(relationshipConfig).map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setNewContact({ ...newContact, relationship: key })
                  setIsRelationshipOpen(false)
                }}
                className={`flex w-full items-center gap-[10px] px-[12px] py-[10px] text-left transition-colors hover:bg-folk-hover ${newContact.relationship === key ? "bg-folk-hover" : ""}`}
                tabIndex={0}
              >
                <CategoryChip label={config.label} categoryKey={key} size="lg" />
              </button>
            ))}
          </FixedDropdownMenu>
        </div>
      )}

      {previewDoc && (
        <DocumentPreview
          doc={previewDoc}
          getDownloadUrl={getDownloadUrl}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {editorNote && (
        <NoteEditorModal
          note={editorNote}
          editTitle={noteEditTitle}
          editContent={noteEditContent}
          editAttachments={noteEditAttachments}
          onEditTitle={setNoteEditTitle}
          onEditContent={setNoteEditContent}
          onEditAttachments={setNoteEditAttachments}
          onClose={closeNoteEditor}
          onSaveAndClose={saveAndCloseNote}
          onDelete={handleDeleteNote}
          onToggleFavorite={toggleNoteFavorite}
          isFavorite={noteFavorites.includes(editorNote.id)}
          currentUserName={currentUserName}
          recordIcon={{ iconText: client?.iconText || "?", name: client?.displayName || client?.name || "Unknown" }}
        />
      )}
    </div>
  )
}
