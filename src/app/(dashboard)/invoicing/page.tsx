"use client"

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Hash,
  ListFilter,
  SlidersHorizontal,
  Table2,
  Tag,
  User,
} from "lucide-react"
import { useCharges } from "@/lib/hooks/use-charges"
import { useClients } from "@/lib/hooks/use-clients"
import { useInvoices } from "@/lib/hooks/use-invoices"
import { useSavedViews } from "@/lib/hooks/use-saved-views"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useStaff } from "@/lib/hooks/use-staff"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useWorkspace } from "@/lib/workspace-context"
import { useWorkspaceSettings } from "@/lib/hooks/use-workspace-settings"
import { isPerItemChargeUnit, normalizeBillingUnit, serviceChargeTypes } from "@/lib/ndis-charges"
import { TaskDetailModal } from "@/app/(dashboard)/tasks/_components/task-detail-modal"
import type { Client, InvoiceDeliveryMethod, InvoiceLineItem, Task } from "@/lib/types"
import { PageLoader, PageError } from "@/components/page-state"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { InvoicingNav } from "./_components/invoicing-nav"
import { useToast } from "@/components/toast"
import { getFundingTypeChipClasses } from "@/lib/chip-colors"
import {
  formatCurrency,
  formatDecimal,
  formatInvoiceQuantity,
  roundMoney,
  computeGstAmount,
  formatFundingType,
  formatBillingType,
  formatInvoiceDate,
  getPortalClaimTarget,
  toDateStr,
  getStartOfWeek,
  sortTasksByDate,
} from "./_components/invoicing-utils"
import {
  FilterPill,
  DisplaySection,
  MultiSelectDropdown,
  EmptyState,
} from "./_components/invoicing-helpers"
import { DisplayPopoverPanel, DisplayPopoverTrigger, countHiddenDisplayFilters } from "@/components/display-popover"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { FixedDropdownMenu } from "@/components/fixed-dropdown-menu"
import { matchesTableSearch } from "@/lib/table-search"
import {
  TABLE_CELL_BASE,
  TABLE_CELL_INNER,
  TABLE_CELL_LAST,
  TABLE_CELL_STICKY_CHECKBOX,
  TABLE_FULL,
  TABLE_HEADER_CELL,
  TABLE_HEADER_CELL_LAST,
  TABLE_HEADER_STICKY_CHECKBOX,
  TABLE_ROW_HOVER,
  TABLE_TEXT_CELL,
} from "@/lib/table-styles"
import { motion } from "@/lib/motion"

interface InvoicingSavedView {
  id: string
  name: string
  viewMode: "list" | "week"
  visibleColumnKeys: string[]
  displayParticipants: string[]
  displayAssignees: string[]
  displayCharges: string[]
  dateFilter: string[]
  participantFilter: string[]
  assigneeFilter: string[]
  chargeFilter: string[]
}

interface InvoiceColumnDef {
  key: string
  label: string
  width: number
  alwaysVisible?: boolean
  icon?: typeof User
}

const invoiceColumnDefs: InvoiceColumnDef[] = [
  { key: "checkbox", label: "", width: 44, alwaysVisible: true },
  { key: "participant", label: "Participant", width: 180, icon: User },
  { key: "amount", label: "Total Cost", width: 120, icon: DollarSign },
  { key: "quantity", label: "Quantity", width: 100, icon: Hash },
  { key: "status", label: "Status", width: 110, alwaysVisible: true, icon: Tag },
  { key: "date", label: "Date", width: 110, icon: CalendarDays },
  { key: "type", label: "Type", width: 100, icon: Building2 },
  { key: "charge", label: "Charge Item", width: 180, icon: Tag },
] as const

const defaultVisibleColumnKeys = ["checkbox", "participant", "amount", "quantity", "status", "date", "type", "charge"]
const weekDayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function InvoicingPage() {
  const { toast } = useToast()
  const { tasks: allTasks, isLoading: tasksLoading, fetchError: tasksFetchError, updateTask, refetch: refetchTasks } = useTasks()
  const { clients, clientNames, updateClient, isLoading: clientsLoading, fetchError: clientsFetchError } = useClients()
  const { staffNames } = useStaff()
  const { canAssignTasks } = usePermissions()
  const { enabledCharges, allCharges, chargeItems } = useCharges()
  const { invoices, isLoading: invoicesLoading, fetchError: invoicesFetchError, addInvoice, markInvoiceSent, deleteInvoice, exportInvoiceToCsv } = useInvoices()
  const { activeWorkspace } = useWorkspace()
  const { settings } = useWorkspaceSettings()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [reviewedTaskIds, setReviewedTaskIds] = useState<string[]>([])
  const [isSendInvoicesOpen, setIsSendInvoicesOpen] = useState(false)
  const [isSendingInvoices, setIsSendingInvoices] = useState(false)
  const [sendInvoicesSummary, setSendInvoicesSummary] = useState<{
    completedCount: number
    emailedCount: number
    portalCount: number
    failedCount: number
    skippedCount: number
    failedMessages: string[]
    xeroWarnings: string[]
  } | null>(null)
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(defaultVisibleColumnKeys)
  const [displayParticipants, setDisplayParticipants] = useState<string[]>([])
  const [displayAssignees, setDisplayAssignees] = useState<string[]>([])
  const [displayCharges, setDisplayCharges] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState<string[]>([])
  const [participantFilter, setParticipantFilter] = useState<string[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([])
  const [chargeFilter, setChargeFilter] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"list" | "week">("list")
  const [weekOffset, setWeekOffset] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [visibleCount, setVisibleCount] = useState(10)
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false)
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null)
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateViewOpen, setIsCreateViewOpen] = useState(false)
  const [newViewName, setNewViewName] = useState("")
  const [viewContextMenu, setViewContextMenu] = useState<{ viewId: string; x: number; y: number } | null>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  const filterPillRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const pageSizeButtonRef = useRef<HTMLButtonElement>(null)
  const displayButtonRef = useRef<HTMLButtonElement>(null)
  const newViewInputRef = useRef<HTMLInputElement>(null)

  const sentTaskIds = useMemo(() => {
    return new Set(
      invoices
        .filter((invoice) => invoice.status !== "unsent")
        .flatMap((invoice) => invoice.taskIds)
    )
  }, [invoices])

  const readyTasks = useMemo(
    () => allTasks.filter((task) => task.status === "done" && !sentTaskIds.has(task.id)),
    [allTasks, sentTaskIds]
  )

  useEffect(() => {
    setReviewedTaskIds((current) => current.filter((taskId) => readyTasks.some((task) => task.id === taskId)))
  }, [readyTasks])

  const chargeLabel = useCallback((value: string) => {
    if (!value) return ""
    const charge = allCharges.find((item) => item.itemNumber === value)
    if (!charge) return value
    return charge.shortName
  }, [allCharges])

  const chargeTypes = useMemo(
    () => [{ value: "", label: "No charge" }, ...enabledCharges.map((c) => ({ value: c.itemNumber, label: c.shortName }))],
    [enabledCharges]
  )

  const secondaryChargeLabel = useCallback((value: string) => {
    if (!value) return ""
    const svc = serviceChargeTypes.find((s) => s.value === value)
    if (svc) return svc.label
    const ndis = allCharges.find((c) => c.itemNumber === value)
    if (ndis) return ndis.shortName
    return value
  }, [allCharges])

  const getTaskCharge = useCallback((task: Task) => {
    if (!task.chargeType) return null
    return enabledCharges.find((item) => item.itemNumber === task.chargeType)
      || allCharges.find((item) => item.itemNumber === task.chargeType)
      || null
  }, [allCharges, enabledCharges])

  const getTaskClient = useCallback((task: Task): Client | null => {
    if (task.clientId) {
      const matchedClient = clients.find((client) => client.id === task.clientId)
      if (matchedClient) return matchedClient
    }

    if (!task.client) return null
    return clients.find((client) => client.name === task.client || client.displayName === task.client) || null
  }, [clients])

  const getInvoiceEmail = useCallback((task: Task): string => {
    const client = getTaskClient(task)
    if (!client) return ""

    // Plan-managed invoices must go to the plan manager. Never silently
    // fall back to the participant's own email (avoids misrouting claims).
    if (client.participant.fundingType === "plan-managed")
      return client.participant.planManagerEmail || ""
    return client.participant.email || client.participant.planManagerEmail || ""
  }, [getTaskClient])

  const getTaskSecondaryCharge = useCallback((task: Task) => {
    if (!task.secondaryChargeType) return null
    return enabledCharges.find((item) => item.itemNumber === task.secondaryChargeType)
      || allCharges.find((item) => item.itemNumber === task.secondaryChargeType)
      || null
  }, [allCharges, enabledCharges])

  const getSecondaryAmount = useCallback((task: Task): number => {
    const charge = getTaskSecondaryCharge(task)
    if (!charge) return 0
    const raw = task.secondaryTimeSpent || 0
    if (raw <= 0) return 0
    const quantity = charge.unit === "each" || charge.unit === "km" ? raw : raw / 60
    return quantity * charge.price
  }, [getTaskSecondaryCharge])

  const getTaskAmount = useCallback((task: Task): number => {
    const charge = getTaskCharge(task)
    let total = getSecondaryAmount(task)
    if (!charge) return total

    if (charge.unit === "each" || charge.unit === "km") {
      const quantity = task.timeSpent > 0 ? task.timeSpent : 1
      total += quantity * charge.price
    } else {
      total += (task.timeSpent / 60) * charge.price
    }
    return total
  }, [getTaskCharge, getSecondaryAmount])

  const getChargeGstCode = useCallback((itemNumber: string): string => {
    const configured = chargeItems.find((ci) => ci.itemNumber === itemNumber)
    return configured?.gstCode || "P2"
  }, [chargeItems])

  const buildTaskLineItems = useCallback((task: Task, client: Client): InvoiceLineItem[] => {
    const charge = getTaskCharge(task)
    if (!charge) return []

    const lineItems: InvoiceLineItem[] = []

    const quantity = formatInvoiceQuantity(task, charge.unit)
    const amount = roundMoney(quantity * charge.price)
    const gstCode = getChargeGstCode(charge.itemNumber)
    lineItems.push({
      id: crypto.randomUUID(),
      description: task.title || charge.shortName || "Support item",
      chargeItemNumber: charge.itemNumber,
      chargeName: charge.shortName,
      quantity,
      unit: normalizeBillingUnit(charge.unit),
      rate: charge.price,
      amount,
      serviceDate: task.dueDate || "",
      gstCode,
      gstAmount: computeGstAmount(amount, gstCode),
      taskId: task.id,
      clientId: client.id,
    })

    const secondaryCharge = getTaskSecondaryCharge(task)
    const secondaryRaw = task.secondaryTimeSpent || 0
    if (secondaryCharge && secondaryRaw > 0) {
      const secondaryQuantity = isPerItemChargeUnit(secondaryCharge.unit)
        ? secondaryRaw
        : Number((secondaryRaw / 60).toFixed(2))
      const secondaryAmount = roundMoney(secondaryQuantity * secondaryCharge.price)
      const secondaryGstCode = getChargeGstCode(secondaryCharge.itemNumber)
      lineItems.push({
        id: crypto.randomUUID(),
        description: `${task.title || "Support item"} — ${secondaryCharge.shortName}`,
        chargeItemNumber: secondaryCharge.itemNumber,
        chargeName: secondaryCharge.shortName,
        quantity: secondaryQuantity,
        unit: normalizeBillingUnit(secondaryCharge.unit),
        rate: secondaryCharge.price,
        amount: secondaryAmount,
        serviceDate: task.dueDate || "",
        gstCode: secondaryGstCode,
        gstAmount: computeGstAmount(secondaryAmount, secondaryGstCode),
        taskId: task.id,
        clientId: client.id,
      })
    }

    return lineItems
  }, [getTaskCharge, getTaskSecondaryCharge, getChargeGstCode])

  const getTaskCompletionAction = useCallback((task: Task): {
    mode: "email" | "portal"
    deliveryMethod: InvoiceDeliveryMethod
    sentTo: string
    recipientName: string
  } | null => {
    const client = getTaskClient(task)
    if (!client) return null

    const participantName = client.displayName || task.client || "Unknown participant"
    const fundingType = client.participant.fundingType

    if (!fundingType) return null
    if (fundingType === "ndia-managed") {
      return {
        mode: "portal",
        deliveryMethod: "ndia-portal",
        sentTo: getPortalClaimTarget(),
        recipientName: "NDIA portal",
      }
    }

    const recipientEmail = getInvoiceEmail(task)
    if (!recipientEmail) return null

    if (fundingType === "plan-managed") {
      return {
        mode: "email",
        deliveryMethod: "plan-manager-email",
        sentTo: recipientEmail,
        recipientName: client.participant.planManagerName || "Plan Manager",
      }
    }

    return {
      mode: "email",
      deliveryMethod: "participant-email",
      sentTo: recipientEmail,
      recipientName: participantName,
    }
  }, [getInvoiceEmail, getTaskClient])

  const getTaskInvoiceIssues = useCallback((task: Task): string[] => {
    const issues: string[] = []
    const client = getTaskClient(task)
    const charge = getTaskCharge(task)
    const amount = getTaskAmount(task)
    const completionAction = getTaskCompletionAction(task)

    if (!client)
      issues.push("Link this task to a participant profile before sending the invoice.")

    if (client && !client.participant.fundingType)
      issues.push("Select whether the participant is plan managed, self managed or agency managed before completing the invoice.")

    if (!charge)
      issues.push("Select a charge item before sending the invoice.")

    if (charge) {
      const quantity = formatInvoiceQuantity(task, charge.unit)
      if (quantity <= 0)
        issues.push(charge.unit === "each" || charge.unit === "km"
          ? "Add a billable quantity before sending the invoice."
          : "Add billable time before sending the invoice.")
    }

    const secondaryCharge = getTaskSecondaryCharge(task)
    if (secondaryCharge && (task.secondaryTimeSpent || 0) <= 0)
      issues.push(secondaryCharge.unit === "km"
        ? "Add the distance (km) for the secondary travel charge before sending."
        : secondaryCharge.unit === "each"
        ? "Add a quantity for the secondary charge before sending."
        : "Add billable time for the secondary charge before sending.")

    if (amount <= 0)
      issues.push("Invoice total must be greater than $0.00 before sending.")

    if (client?.participant.fundingType === "ndia-managed" && !client.participant.ndisNumber)
      issues.push("Add the participant NDIS number before preparing an agency-managed claim.")

    if (client?.participant.fundingType !== "ndia-managed" && !completionAction?.sentTo)
      issues.push(client?.participant.fundingType === "plan-managed"
        ? "Add the plan manager email on the participant profile before sending."
        : "Add an invoicing email on the participant profile before sending.")

    return issues
  }, [getTaskAmount, getTaskCharge, getTaskSecondaryCharge, getTaskClient, getTaskCompletionAction])

  const resetViewState = useCallback(() => {
    setViewMode("list")
    setVisibleColumnKeys(defaultVisibleColumnKeys)
    setDisplayParticipants([])
    setDisplayAssignees([])
    setDisplayCharges([])
    setDateFilter([])
    setParticipantFilter([])
    setAssigneeFilter([])
    setChargeFilter([])
    setWeekOffset(0)
  }, [])

  const applySavedView = useCallback((view: InvoicingSavedView) => {
    setViewMode(view.viewMode)
    setVisibleColumnKeys(view.visibleColumnKeys)
    setDisplayParticipants(view.displayParticipants)
    setDisplayAssignees(view.displayAssignees)
    setDisplayCharges(view.displayCharges)
    setDateFilter(view.dateFilter)
    setParticipantFilter(view.participantFilter)
    setAssigneeFilter(view.assigneeFilter)
    setChargeFilter(view.chargeFilter)
    setWeekOffset(0)
  }, [])

  const {
    savedViews,
    activeViewId,
    createView,
    selectView,
    selectDefaultView,
    deleteView,
    syncActiveView,
  } = useSavedViews<InvoicingSavedView>({
    viewsStorageKey: "invoicing-views",
    activeViewStorageKey: "invoicing-active-view",
    buildView: ({ id, name }) => ({
      id,
      name,
      viewMode,
      visibleColumnKeys,
      displayParticipants,
      displayAssignees,
      displayCharges,
      dateFilter,
      participantFilter,
      assigneeFilter,
      chargeFilter,
    }),
    applyView: applySavedView,
    resetState: resetViewState,
    syncView: (view) => ({
      ...view,
      viewMode,
      visibleColumnKeys,
      displayParticipants,
      displayAssignees,
      displayCharges,
      dateFilter,
      participantFilter,
      assigneeFilter,
      chargeFilter,
    }),
  })

  useEffect(() => {
    syncActiveView()
  }, [
    syncActiveView,
    viewMode,
    visibleColumnKeys,
    displayParticipants,
    displayAssignees,
    displayCharges,
    dateFilter,
    participantFilter,
    assigneeFilter,
    chargeFilter,
  ])

  useEffect(() => {
    setVisibleCount(pageSize)
  }, [pageSize, readyTasks.length])

  useEffect(() => {
    if (!viewContextMenu) return

    function handleClose() {
      setViewContextMenu(null)
    }

    document.addEventListener("click", handleClose)
    return () => document.removeEventListener("click", handleClose)
  }, [viewContextMenu])

  const uniqueParticipants = useMemo(
    () => Array.from(new Set(readyTasks.map((task) => task.client).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [readyTasks]
  )

  const uniqueAssignees = useMemo(
    () => Array.from(new Set(readyTasks.map((task) => task.assignee).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [readyTasks]
  )

  const uniqueCharges = useMemo(
    () => Array.from(new Set(readyTasks.map((task) => task.chargeType).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [readyTasks]
  )

  const filteredTasks = useMemo(() => {
    return readyTasks.filter((task) => {
      if (participantFilter.length > 0 && !participantFilter.includes(task.client)) return false
      if (assigneeFilter.length > 0 && !assigneeFilter.includes(task.assignee)) return false
      if (chargeFilter.length > 0 && !chargeFilter.includes(task.chargeType)) return false
      if (displayParticipants.length > 0 && !displayParticipants.includes(task.client)) return false
      if (displayAssignees.length > 0 && !displayAssignees.includes(task.assignee)) return false
      if (displayCharges.length > 0 && !displayCharges.includes(task.chargeType)) return false
      if (!matchesTableSearch(searchQuery, task.title, task.client, task.assignee, task.chargeType, task.description)) {
        return false
      }
      if (dateFilter.length === 0) return true

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const taskDate = task.dueDate ? new Date(task.dueDate + "T00:00:00") : null
      if (taskDate) taskDate.setHours(0, 0, 0, 0)
      const dayMs = 86400000

      return dateFilter.some((filterValue) => {
        if (filterValue === "today") return taskDate?.getTime() === today.getTime()
        if (filterValue === "tomorrow") return taskDate?.getTime() === today.getTime() + dayMs
        if (filterValue === "this-week") {
          if (!taskDate) return false
          const startOfWeek = getStartOfWeek()
          const endOfWeek = new Date(startOfWeek)
          endOfWeek.setDate(endOfWeek.getDate() + 6)
          return taskDate >= startOfWeek && taskDate <= endOfWeek
        }
        if (filterValue === "overdue") return Boolean(taskDate && taskDate.getTime() < today.getTime())
        if (filterValue === "no-date") return !task.dueDate
        return false
      })
    })
  }, [
    assigneeFilter,
    chargeFilter,
    dateFilter,
    displayAssignees,
    displayCharges,
    displayParticipants,
    participantFilter,
    readyTasks,
    searchQuery,
  ])

  const sortedTasks = useMemo(
    () => sortTasksByDate(filteredTasks),
    [filteredTasks]
  )

  const selectedTask = selectedTaskId
    ? readyTasks.find((task) => task.id === selectedTaskId) ?? null
    : null

  const hasDisplayFilters = displayParticipants.length > 0 || displayAssignees.length > 0 || displayCharges.length > 0
  const hiddenDisplayCount =
    countHiddenDisplayFilters(uniqueParticipants, displayParticipants)
    + countHiddenDisplayFilters(uniqueAssignees, displayAssignees)
    + countHiddenDisplayFilters(uniqueCharges, displayCharges)
  const filteredTaskIds = filteredTasks.map((task) => task.id)
  const hasFilteredTasks = filteredTaskIds.length > 0
  const areAllFilteredTasksReviewed = hasFilteredTasks && filteredTaskIds.every((taskId) => reviewedTaskIds.includes(taskId))
  const selectedTasksToInvoice = useMemo(
    () => readyTasks.filter((task) => reviewedTaskIds.includes(task.id)),
    [readyTasks, reviewedTaskIds]
  )
  const selectedTaskCount = selectedTasksToInvoice.length

  const visibleColumns = invoiceColumnDefs.filter((column) => column.alwaysVisible || visibleColumnKeys.includes(column.key))
  const tableMinWidth = useMemo(
    () => visibleColumns.reduce((sum, column) => sum + column.width, 0),
    [visibleColumns]
  )
  const weekStart = getStartOfWeek(weekOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const handleToggleDisplayItem = (items: string[], setItems: (value: string[]) => void, value: string) => {
    setItems(items.includes(value) ? items.filter((item) => item !== value) : [...items, value])
  }

  const handleCreateView = () => {
    const createdView = createView(newViewName)
    if (!createdView) return
    setNewViewName("")
    setIsCreateViewOpen(false)
  }

  const handleMoveBackToTasks = (taskId: string) => {
    updateTask(taskId, { status: "todo" })
    if (selectedTaskId === taskId) setSelectedTaskId(null)
  }

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates)
  }

  const handleLinkGoal = useCallback((goalId: string | null) => {
    if (!selectedTask) return
    const client = clients.find((c) => c.id === selectedTask.clientId)
      || clients.find((c) => c.name === selectedTask.client || c.displayName === selectedTask.client)
    if (!client) return
    const existingGoals = client.participant.goals || []
    const snapshot = {
      taskId: selectedTask.id,
      title: selectedTask.title,
      status: selectedTask.status,
      linkedAt: new Date().toISOString(),
    }
    const updatedGoals = existingGoals.map((g) => {
      const without = g.linkedTasks.filter((lt) => lt.taskId !== selectedTask.id)
      if (g.id === goalId) return { ...g, linkedTasks: [...without, snapshot] }
      return { ...g, linkedTasks: without }
    })
    updateClient(client.id, { participant: { ...client.participant, goals: updatedGoals } })
  }, [selectedTask, clients, updateClient])

  const handleCloseSendInvoicesModal = () => {
    if (isSendingInvoices) return
    setIsSendInvoicesOpen(false)
    setSendInvoicesSummary(null)
  }

  const handleSendInvoices = async () => {
    if (selectedTasksToInvoice.length === 0 || isSendingInvoices) return

    setIsSendingInvoices(true)
    setSendInvoicesSummary(null)

    let completedCount = 0
    let emailedCount = 0
    let portalCount = 0
    let failedCount = 0
    let skippedCount = 0
    const failedMessages: string[] = []
    const xeroWarnings: string[] = []
    const completedTaskIds: string[] = []

    // Group invoiceable tasks by participant so each participant receives a
    // single invoice covering all of their completed supports.
    interface InvoiceGroup {
      client: Client
      participantName: string
      tasks: Task[]
    }
    const groups = new Map<string, InvoiceGroup>()

    for (const task of selectedTasksToInvoice) {
      const client = getTaskClient(task)
      const charge = getTaskCharge(task)
      const participantName = client?.displayName || task.client || "Unknown participant"
      const issues = getTaskInvoiceIssues(task)
      const completionAction = getTaskCompletionAction(task)

      if (issues.length > 0) {
        skippedCount += 1
        failedMessages.push(`${participantName}: ${issues[0]}`)
        continue
      }

      if (!client || !charge || !completionAction) continue

      const existing = groups.get(client.id)
      if (existing) existing.tasks.push(task)
      else groups.set(client.id, { client, participantName, tasks: [task] })
    }

    for (const group of groups.values()) {
      const { client, participantName, tasks } = group
      const completionAction = getTaskCompletionAction(tasks[0])
      if (!completionAction) continue

      const lineItems = tasks.flatMap((task) => buildTaskLineItems(task, client))
      if (lineItems.length === 0) continue

      const subtotal = roundMoney(lineItems.reduce((sum, item) => sum + item.amount, 0))
      const gst = roundMoney(lineItems.reduce((sum, item) => sum + (item.gstAmount || 0), 0))
      const notes = tasks.map((task) => task.description).filter(Boolean).join("\n\n")

      const invoice = await addInvoice({
        clientName: participantName,
        clientId: client.id,
        taskIds: tasks.map((task) => task.id),
        lineItems,
        subtotal,
        gst,
        total: subtotal,
        createdBy: "Team Leader",
        notes,
      })

      if (!invoice) {
        failedCount += 1
        failedMessages.push(`${participantName}: Failed to create invoice`)
        continue
      }

      try {
        if (completionAction.mode === "portal") {
          exportInvoiceToCsv(invoice)
          await markInvoiceSent(invoice.id, {
            sentTo: completionAction.sentTo,
            deliveryMethod: completionAction.deliveryMethod,
          })
          completedCount += 1
          portalCount += 1
          completedTaskIds.push(...tasks.map((task) => task.id))
          continue
        }

        const response = await fetch("/api/email/send-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice,
            recipientEmail: completionAction.sentTo,
            recipientName: completionAction.recipientName,
            participantName,
            ndisNumber: client.participant.ndisNumber || "",
            orgSettings: settings,
            workspaceId: activeWorkspace?.id,
          }),
        })

        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Failed to send invoice")

        if (result.xeroWarning) xeroWarnings.push(`${participantName}: ${result.xeroWarning}`)

        await markInvoiceSent(invoice.id, {
          sentTo: completionAction.sentTo,
          deliveryMethod: completionAction.deliveryMethod,
        })
        completedCount += 1
        emailedCount += 1
        completedTaskIds.push(...tasks.map((task) => task.id))
      } catch (error) {
        await deleteInvoice(invoice.id)
        failedCount += 1
        failedMessages.push(`${participantName}: ${error instanceof Error ? error.message : "Failed to send invoice"}`)
      }
    }

    setReviewedTaskIds((current) => current.filter((taskId) => !completedTaskIds.includes(taskId)))
    if (selectedTaskId && completedTaskIds.includes(selectedTaskId)) setSelectedTaskId(null)

    setSendInvoicesSummary({
      completedCount,
      emailedCount,
      portalCount,
      failedCount,
      skippedCount,
      failedMessages,
      xeroWarnings,
    })
    setIsSendingInvoices(false)
    if (completedCount > 0 && failedCount === 0) toast(`${completedCount} invoice${completedCount > 1 ? "s" : ""} sent successfully`, "success")
    else if (failedCount > 0) toast(`${failedCount} invoice${failedCount > 1 ? "s" : ""} failed to send`, "error")
  }

  const formatWeekLabel = () => {
    const start = weekStart.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
    const end = weekEnd.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
    return `${start} - ${end}`
  }

  const renderTaskRow = (task: Task) => {
    const client = getTaskClient(task)
    const participantName = client?.displayName || task.client || "Unknown participant"
    const fundingType = client?.participant.fundingType || ""
    const typeLabel = formatBillingType(fundingType)
    const charge = getTaskCharge(task)
    const quantity = charge?.unit === "each" || charge?.unit === "km"
      ? task.timeSpent > 0 ? task.timeSpent : 1
      : task.timeSpent > 0 ? task.timeSpent / 60 : 0
    const amount = getTaskAmount(task)
    const isReviewed = reviewedTaskIds.includes(task.id)
    const invoiceIssues = getTaskInvoiceIssues(task)
    const hasInvoiceIssues = invoiceIssues.length > 0

    const renderCell = (columnKey: string, isLast: boolean) => {
      const cellClass = `${isLast ? TABLE_CELL_LAST : TABLE_CELL_BASE} bg-folk-surface ${TABLE_ROW_HOVER}`

      if (columnKey === "checkbox") {
        return (
          <td key={columnKey} className={`${TABLE_CELL_STICKY_CHECKBOX} bg-folk-surface ${TABLE_ROW_HOVER}`}>
            <div className={`${TABLE_CELL_INNER} justify-center`}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setReviewedTaskIds((current) => current.includes(task.id)
                    ? current.filter((taskId) => taskId !== task.id)
                    : [...current, task.id])
                }}
                className={`flex h-[18px] w-[18px] items-center justify-center rounded-none border-[1.5px] transition-colors ${
                  isReviewed
                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-[#ccc] hover:border-[#999]"
                }`}
                tabIndex={0}
                aria-label={isReviewed ? "Unmark invoice review" : "Mark invoice review"}
              >
                {isReviewed && <span className="text-[9px]">✓</span>}
              </button>
            </div>
          </td>
        )
      }

      if (columnKey === "participant") {
        return (
          <td key={columnKey} className={cellClass}>
            <div className={TABLE_CELL_INNER}>
              <span className={`${TABLE_TEXT_CELL} truncate`}>{participantName}</span>
            </div>
          </td>
        )
      }

      if (columnKey === "amount") {
        return (
          <td key={columnKey} className={cellClass}>
            <div className={TABLE_CELL_INNER}>
              {amount > 0 ? (
                <span className="inline-flex h-[24px] items-center whitespace-nowrap rounded-none bg-green-50 px-[10px] text-[12px] font-medium text-green-700">
                  {formatCurrency(amount)}
                </span>
              ) : (
                <span className="text-[#ccc]">—</span>
              )}
            </div>
          </td>
        )
      }

      if (columnKey === "quantity") {
        return (
          <td key={columnKey} className={cellClass}>
            <div className={TABLE_CELL_INNER}>
              {quantity > 0 ? (
                <span className={`${TABLE_TEXT_CELL} text-folk-secondary`}>{formatDecimal(quantity)}</span>
              ) : (
                <span className="text-[#ccc]">—</span>
              )}
            </div>
          </td>
        )
      }

      if (columnKey === "status") {
        return (
          <td key={columnKey} className={cellClass}>
            <div className={TABLE_CELL_INNER}>
              <span
                className={`inline-flex h-[24px] items-center whitespace-nowrap rounded-none px-[10px] text-[12px] font-medium ${
                  hasInvoiceIssues ? "bg-red-50 text-red-600" : "bg-green-100 text-green-700"
                }`}
                title={hasInvoiceIssues ? invoiceIssues.join(" ") : undefined}
              >
                {hasInvoiceIssues ? "Not Ready" : "Ready"}
              </span>
            </div>
          </td>
        )
      }

      if (columnKey === "date") {
        return (
          <td key={columnKey} className={cellClass}>
            <div className={TABLE_CELL_INNER}>
              {formatInvoiceDate(task.dueDate) ? (
                <span className={`${TABLE_TEXT_CELL} text-folk-secondary`}>{formatInvoiceDate(task.dueDate)}</span>
              ) : (
                <span className="text-[#ccc]">—</span>
              )}
            </div>
          </td>
        )
      }

      if (columnKey === "type") {
        return (
          <td key={columnKey} className={cellClass}>
            <div className={TABLE_CELL_INNER}>
              <span className={getFundingTypeChipClasses(fundingType)}>{typeLabel}</span>
            </div>
          </td>
        )
      }

      if (columnKey === "charge") {
        return (
          <td key={columnKey} className={cellClass}>
            <div className={TABLE_CELL_INNER}>
              {task.chargeType ? (
                <span className={`${TABLE_TEXT_CELL} truncate`}>{chargeLabel(task.chargeType)}</span>
              ) : (
                <span className="text-[#ccc]">—</span>
              )}
            </div>
          </td>
        )
      }

      return null
    }

    return (
      <tr
        key={task.id}
        className={`group cursor-pointer transition-colors hover:bg-folk-hover ${motion.row}`}
        onClick={() => setSelectedTaskId(task.id)}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter") setSelectedTaskId(task.id)
        }}
      >
        {visibleColumns.map((column, colIndex) =>
          renderCell(column.key, colIndex === visibleColumns.length - 1)
        )}
      </tr>
    )
  }

  const renderTableHeader = () => (
    <thead>
      <tr>
        {visibleColumns.map((column, colIndex) => {
          const isLast = colIndex === visibleColumns.length - 1
          if (column.key === "checkbox") {
            return (
              <th
                key={column.key}
                className={`sticky top-0 z-30 ${TABLE_HEADER_STICKY_CHECKBOX}`}
                style={{ width: column.width, minWidth: column.width }}
              />
            )
          }
          const ColIcon = column.icon
          return (
            <th
              key={column.key}
              className={`sticky top-0 z-20 ${isLast ? TABLE_HEADER_CELL_LAST : TABLE_HEADER_CELL}`}
              style={{ width: column.width, minWidth: column.width }}
            >
              <div className="flex items-center gap-[6px]">
                {ColIcon && <ColIcon className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />}
                <span className="truncate">{column.label}</span>
              </div>
            </th>
          )
        })}
      </tr>
    </thead>
  )

  const weekTasks = filteredTasks.filter((task) => {
    if (!task.dueDate) return false
    const taskDate = new Date(task.dueDate + "T00:00:00")
    return taskDate >= weekStart && taskDate <= weekEnd
  }).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))

  const noDateTasks = filteredTasks.filter((task) => !task.dueDate)

  const dayBuckets: Record<string, Task[]> = {}
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    dayBuckets[toDateStr(date)] = []
  }
  weekTasks.forEach((task) => {
    if (task.dueDate && dayBuckets[task.dueDate]) dayBuckets[task.dueDate].push(task)
  })

  const isPageLoading = tasksLoading || clientsLoading || invoicesLoading
  const pageError = tasksFetchError || clientsFetchError || invoicesFetchError

  if (isPageLoading) return <PageLoader label="Loading invoicing…" />
  if (pageError) return <PageError message="Failed to load data" onRetry={refetchTasks} />

  return (
    <div className="flex h-full flex-col">
      <InvoicingNav
        suffix={
          <>
            {savedViews.length > 0 && <div className="h-[16px] w-px shrink-0 bg-[var(--folk-border)]" />}
            {savedViews.map((view) => (
              <ProfileTabButton
                key={view.id}
                isActive={activeViewId === view.id}
                onClick={() => selectView(view)}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setViewContextMenu({ viewId: view.id, x: event.clientX, y: event.clientY })
                }}
                icon={Table2}
                label={view.name}
              />
            ))}
          </>
        }
        actions={
          <div className="flex items-center gap-[8px]">
          {viewMode === "week" && (
            <div className="flex items-center gap-[6px]">
              <button
                type="button"
                onClick={() => setWeekOffset((current) => current - 1)}
                className="flex h-[24px] w-[24px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
                tabIndex={0}
                aria-label="Previous week"
              >
                <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={1.75} />
              </button>
              <span className="min-w-[160px] text-center text-[13px] font-semibold text-folk-text">{formatWeekLabel()}</span>
              <button
                type="button"
                onClick={() => setWeekOffset((current) => current + 1)}
                className="flex h-[24px] w-[24px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
                tabIndex={0}
                aria-label="Next week"
              >
                <ChevronRight className="h-[14px] w-[14px]" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                disabled={weekOffset === 0}
                className={`flex items-center gap-[5px] rounded-none border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${weekOffset === 0 ? "cursor-default border-[#e8e8e8] bg-folk-surface text-[#ccc]" : "border-folk-border bg-folk-surface text-folk-text hover:bg-folk-hover"}`}
                tabIndex={0}
              >
                This week
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setSendInvoicesSummary(null)
              setIsSendInvoicesOpen(true)
            }}
            disabled={selectedTaskCount === 0}
            className={`flex items-center gap-[6px] rounded-none px-[10px] py-[6px] text-[13px] font-medium transition-colors ${
              selectedTaskCount > 0
                ? "primary-btn"
                : "cursor-not-allowed bg-[#efefef] text-[#b8b8b8]"
            }`}
            tabIndex={0}
          >
            <span>Create invoices</span>
            <span className={`rounded-none px-[6px] py-[1px] text-[11px] font-semibold ${
              selectedTaskCount > 0 ? "bg-[#e8e8e8] text-[#555]" : "bg-folk-hover text-[#b8b8b8]"
            }`}>
              {selectedTaskCount}
            </span>
          </button>
        </div>
        }
      />

      <div className="flex h-[41px] shrink-0 items-center gap-[8px] border-b border-folk-border bg-folk-nav px-[16px]">
        <div className="relative">
          <button
            type="button"
            ref={filterButtonRef}
            onClick={() => {
              setIsFilterMenuOpen((current) => !current)
              setActiveFilterDropdown(null)
            }}
            className="flex items-center gap-[6px] rounded-none border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
            tabIndex={0}
          >
            <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Filter</span>
          </button>
          {isFilterMenuOpen && (
            <FixedDropdownMenu
              isOpen={isFilterMenuOpen}
              anchorRef={filterButtonRef}
              onClose={() => setIsFilterMenuOpen(false)}
              estimatedHeight={220}
              minWidth={180}
              className="py-[4px]"
            >
              <p className="px-[16px] py-[6px] text-[11px] font-medium text-folk-secondary">Filter by</p>
              {[
                { key: "date", label: "Date", icon: CalendarDays },
                { key: "participant", label: "Client", icon: Building2 },
                { key: "assignee", label: "Assignee", icon: User },
                { key: "charge", label: "Charge", icon: Tag },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveFilterDropdown(key)
                    setIsFilterMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                  tabIndex={0}
                >
                  <Icon className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
                  {label}
                </button>
              ))}
            </FixedDropdownMenu>
          )}
        </div>

        {dateFilter.length > 0 && (
          <FilterPill
            icon={CalendarDays}
            label="Date"
            count={dateFilter.length}
            onOpen={() => setActiveFilterDropdown(activeFilterDropdown === "date" ? null : "date")}
            onClear={() => setDateFilter([])}
            buttonRef={(element) => {
              filterPillRefs.current.date = element
            }}
          />
        )}
        {participantFilter.length > 0 && (
          <FilterPill
            icon={Building2}
            label="Client"
            count={participantFilter.length}
            onOpen={() => setActiveFilterDropdown(activeFilterDropdown === "participant" ? null : "participant")}
            onClear={() => setParticipantFilter([])}
            buttonRef={(element) => {
              filterPillRefs.current.participant = element
            }}
          />
        )}
        {assigneeFilter.length > 0 && (
          <FilterPill
            icon={User}
            label="Assignee"
            count={assigneeFilter.length}
            onOpen={() => setActiveFilterDropdown(activeFilterDropdown === "assignee" ? null : "assignee")}
            onClear={() => setAssigneeFilter([])}
            buttonRef={(element) => {
              filterPillRefs.current.assignee = element
            }}
          />
        )}
        {chargeFilter.length > 0 && (
          <FilterPill
            icon={Tag}
            label="Charge"
            count={chargeFilter.length}
            onOpen={() => setActiveFilterDropdown(activeFilterDropdown === "charge" ? null : "charge")}
            onClear={() => setChargeFilter([])}
            buttonRef={(element) => {
              filterPillRefs.current.charge = element
            }}
          />
        )}

        <div className="relative ml-auto flex shrink-0 items-center gap-[8px]">
          <ExpandableTableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search tasks…"
            ariaLabel="Search tasks"
          />
          <div className="relative">
          <button
            type="button"
            ref={pageSizeButtonRef}
            onClick={() => setIsPageSizeOpen((current) => !current)}
            className="flex items-center gap-[5px] rounded-none border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
            tabIndex={0}
          >
            <span>{pageSize} per page</span>
            <ChevronDown className="h-[11px] w-[11px] text-folk-secondary" strokeWidth={1.5} />
          </button>
          {isPageSizeOpen && (
            <>
              <div className="fixed inset-0 z-[55]" onClick={() => setIsPageSizeOpen(false)} />
              <div className="absolute right-0 top-full z-[60] mt-[4px] w-[120px] rounded-none border border-folk-border bg-folk-surface py-[4px] shadow-folk">
                {[10, 20, 50, 100].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size)
                      setVisibleCount(size)
                      setIsPageSizeOpen(false)
                    }}
                    className={`flex w-full items-center px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-folk-hover ${pageSize === size ? "bg-folk-hover text-folk-text" : "text-folk-text"}`}
                    tabIndex={0}
                  >
                    {size} per page
                  </button>
                ))}
              </div>
            </>
          )}
          </div>

          <DisplayPopoverTrigger
            hiddenCount={hiddenDisplayCount}
            isOpen={isDisplayOpen}
            onClick={() => setIsDisplayOpen((current) => !current)}
            buttonRef={displayButtonRef}
          />
          <button
            type="button"
            onClick={() => {
              if (!hasFilteredTasks) return
              setReviewedTaskIds((current) => (
                areAllFilteredTasksReviewed
                  ? current.filter((taskId) => !filteredTaskIds.includes(taskId))
                  : Array.from(new Set([...current, ...filteredTaskIds]))
              ))
            }}
            disabled={!hasFilteredTasks}
            className={`flex items-center gap-[5px] rounded-none border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${
              hasFilteredTasks
                ? "border-folk-border text-folk-text hover:bg-folk-hover"
                : "cursor-not-allowed border-[#e8e8e8] text-[#ccc]"
            }`}
            tabIndex={0}
          >
            <span>{areAllFilteredTasksReviewed ? "Deselect all" : "Select all"}</span>
          </button>
          <DisplayPopoverPanel
            isOpen={isDisplayOpen}
            onClose={() => setIsDisplayOpen(false)}
            buttonRef={displayButtonRef}
            widthClassName="w-[280px]"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex gap-[8px] border-b border-folk-border-subtle px-[12px] py-[12px]">
                {([
                  { key: "list" as const, label: "List", icon: Table2 },
                  { key: "week" as const, label: "Week", icon: CalendarDays },
                ]).map(({ key, label, icon: Icon }) => {
                  const isActive = viewMode === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setViewMode(key)
                        if (key === "list") setWeekOffset(0)
                      }}
                      className={`flex flex-1 flex-col items-center justify-center gap-[6px] rounded-none border py-[12px] transition-colors ${isActive ? "border-folk-border bg-[#f5f5f5] text-folk-text" : "border-transparent bg-white text-folk-secondary hover:bg-[#f5f5f5]"}`}
                      tabIndex={0}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                      <span className="text-[12px] font-medium">{label}</span>
                    </button>
                  )
                })}
              </div>

              <DisplaySection
                title="Clients"
                items={uniqueParticipants}
                activeItems={displayParticipants}
                setActiveItems={setDisplayParticipants}
              />
              <DisplaySection
                title="Assignees"
                items={uniqueAssignees}
                activeItems={displayAssignees}
                setActiveItems={setDisplayAssignees}
              />
              <DisplaySection
                title="Charges"
                items={uniqueCharges}
                activeItems={displayCharges}
                setActiveItems={setDisplayCharges}
                formatLabel={chargeLabel}
              />
              </div>

            <div className="shrink-0 border-t border-folk-border-subtle px-[12px] py-[10px]">
              <button
                type="button"
                onClick={() => {
                  setDisplayParticipants([])
                  setDisplayAssignees([])
                  setDisplayCharges([])
                  setViewMode("list")
                  setWeekOffset(0)
                }}
                className="text-[13px] font-normal text-folk-placeholder transition-colors hover:text-folk-text"
                tabIndex={0}
              >
                Reset
              </button>
            </div>
            </div>
          </DisplayPopoverPanel>
        </div>
      </div>

      {activeFilterDropdown && (() => {
        const anchor = filterPillRefs.current[activeFilterDropdown] || filterButtonRef.current
        if (!anchor) return null

        if (activeFilterDropdown === "date") {
              const dateOptions = [
                { key: "today", label: "Today" },
                { key: "tomorrow", label: "Tomorrow" },
                { key: "this-week", label: "This week" },
                { key: "overdue", label: "Overdue" },
                { key: "no-date", label: "No date" },
              ]

              return (
                <MultiSelectDropdown
                  title="Filter by date"
                  items={dateOptions.map((option) => ({ value: option.key, label: option.label }))}
                  selectedValues={dateFilter}
                  onToggle={(value) => setDateFilter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}
                  onBack={() => {
                    setActiveFilterDropdown(null)
                    setIsFilterMenuOpen(true)
                  }}
                  onClear={() => {
                    setDateFilter([])
                    setActiveFilterDropdown(null)
                  }}
                  anchorElement={anchor}
                  onClose={() => setActiveFilterDropdown(null)}
                />
              )
            }

            if (activeFilterDropdown === "participant") {
              return (
                <MultiSelectDropdown
                  title="Filter by client"
                  items={uniqueParticipants.map((value) => ({ value, label: value }))}
                  selectedValues={participantFilter}
                  onToggle={(value) => setParticipantFilter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}
                  onBack={() => {
                    setActiveFilterDropdown(null)
                    setIsFilterMenuOpen(true)
                  }}
                  onClear={() => {
                    setParticipantFilter([])
                    setActiveFilterDropdown(null)
                  }}
                  emptyLabel="No clients"
                  anchorElement={anchor}
                  onClose={() => setActiveFilterDropdown(null)}
                />
              )
            }

            if (activeFilterDropdown === "assignee") {
              return (
                <MultiSelectDropdown
                  title="Filter by assignee"
                  items={uniqueAssignees.map((value) => ({ value, label: value }))}
                  selectedValues={assigneeFilter}
                  onToggle={(value) => setAssigneeFilter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}
                  onBack={() => {
                    setActiveFilterDropdown(null)
                    setIsFilterMenuOpen(true)
                  }}
                  onClear={() => {
                    setAssigneeFilter([])
                    setActiveFilterDropdown(null)
                  }}
                  emptyLabel="No assignees"
                  anchorElement={anchor}
                  onClose={() => setActiveFilterDropdown(null)}
                />
              )
            }

            return (
              <MultiSelectDropdown
                title="Filter by charge"
                items={uniqueCharges.map((value) => ({ value, label: chargeLabel(value) }))}
                selectedValues={chargeFilter}
                onToggle={(value) => setChargeFilter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}
                onBack={() => {
                  setActiveFilterDropdown(null)
                  setIsFilterMenuOpen(true)
                }}
                onClear={() => {
                  setChargeFilter([])
                  setActiveFilterDropdown(null)
                }}
                emptyLabel="No charges"
                anchorElement={anchor}
                onClose={() => setActiveFilterDropdown(null)}
              />
            )
      })()}

      <div className="flex-1 overflow-auto">
        <table className={TABLE_FULL} style={{ tableLayout: "fixed", minWidth: tableMinWidth }}>
          {renderTableHeader()}
          <tbody>
            {viewMode === "list" ? (
              sortedTasks.slice(0, visibleCount).map(renderTaskRow)
            ) : (
              <>
                {Object.entries(dayBuckets).map(([dateStr, dayTasks], index) => {
                  const date = new Date(dateStr + "T00:00:00")
                  const dayLabel = weekDayNames[index]
                  const dateLabel = date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
                  const isToday = dateStr === toDateStr(new Date())

                  return (
                    <Fragment key={dateStr}>
                      <tr className={isToday ? "bg-blue-50/40" : "bg-folk-page"}>
                        <td colSpan={visibleColumns.length} className="border-b border-folk-border px-[16px] py-[8px]">
                          <div className="flex items-center gap-[8px]">
                            <span className={`text-[13px] font-semibold ${isToday ? "text-blue-600" : "text-folk-text"}`}>
                              {dayLabel}
                            </span>
                            <span className={`text-[12px] font-medium ${isToday ? "text-blue-400" : "text-folk-secondary"}`}>
                              {dateLabel}
                            </span>
                            {dayTasks.length > 0 && (
                              <span className="text-[11px] font-medium text-folk-placeholder">
                                {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {dayTasks.map(renderTaskRow)}
                    </Fragment>
                  )
                })}
                {noDateTasks.length > 0 && (
                  <Fragment>
                    <tr className="bg-folk-page">
                      <td colSpan={visibleColumns.length} className="border-b border-folk-border px-[16px] py-[8px]">
                        <div className="flex items-center gap-[8px]">
                          <span className="text-[13px] font-semibold text-folk-secondary">No date</span>
                          <span className="text-[11px] font-medium text-folk-placeholder">
                            {noDateTasks.length} {noDateTasks.length === 1 ? "task" : "tasks"}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {noDateTasks.map(renderTaskRow)}
                  </Fragment>
                )}
              </>
            )}
          </tbody>
        </table>

        {viewMode === "list" ? (
          <>
            {sortedTasks.length === 0 && <EmptyState />}
            {sortedTasks.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + pageSize)}
                className="flex w-full items-center justify-center gap-[6px] border-b border-folk-border-subtle py-[10px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-page hover:text-folk-text"
                tabIndex={0}
              >
                Show more ({sortedTasks.length - visibleCount} remaining)
              </button>
            )}
          </>
        ) : (
          filteredTasks.length === 0 && <EmptyState />
        )}
      </div>

      <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
        <span className="text-[12px] font-medium text-folk-secondary">
          {viewMode === "week"
            ? `${filteredTasks.length} ${filteredTasks.length === 1 ? "task" : "tasks"} ready to invoice`
            : `${sortedTasks.length} ${sortedTasks.length === 1 ? "task" : "tasks"} ready to invoice`}
        </span>
      </div>

      {selectedTask && selectedTaskId && (() => {
        const selectedClient = getTaskClient(selectedTask)
        const selectedInvoiceEmail = getInvoiceEmail(selectedTask)
        const selectedAmount = getTaskAmount(selectedTask)
        const selectedFunding = formatFundingType(selectedClient?.participant.fundingType || "")
        const isSelectedTaskReviewed = reviewedTaskIds.includes(selectedTask.id)

        const invoiceInfo = [
          { label: "Amount", value: selectedAmount > 0 ? formatCurrency(selectedAmount) : "Empty" },
          { label: "Funding", value: selectedFunding || "Empty" },
          { label: "Email", value: selectedInvoiceEmail || "Empty" },
          { label: "Status", value: isSelectedTaskReviewed ? "Reviewed" : "Review pending" },
        ]

        return (
          <TaskDetailModal
            selectedTask={selectedTask}
            selectedTaskId={selectedTaskId}
            tasks={allTasks}
            onUpdateTask={(field, value) => handleUpdateTask(selectedTask.id, { [field]: value } as Partial<Task>)}
            onLinkGoal={handleLinkGoal}
            onClose={() => setSelectedTaskId(null)}
            chargeTypes={chargeTypes}
            chargeLabel={chargeLabel}
            secondaryChargeLabel={secondaryChargeLabel}
            clientNames={clientNames}
            clients={clients}
            staffNames={staffNames}
            canAssignTasks={canAssignTasks}
            enabledCharges={enabledCharges}
            onMoveBackToTasks={() => handleMoveBackToTasks(selectedTask.id)}
            invoiceInfo={invoiceInfo}
            invoiceIssues={getTaskInvoiceIssues(selectedTask)}
          />
        )
      })()}

      {isCreateViewOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setIsCreateViewOpen(false)} />
          <div className="fixed inset-0 z-[51] flex items-center justify-center p-[16px]">
            <div className="w-full max-w-[420px] rounded-[18px] border border-[#e7e7e7] bg-folk-surface p-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <h3 className="text-[15px] font-semibold text-folk-text">Create a view for invoicing</h3>
              <p className="mt-[4px] text-[13px] text-folk-secondary">Save the current structure, filters and display settings.</p>
              <input
                ref={newViewInputRef}
                value={newViewName}
                onChange={(event) => setNewViewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleCreateView()
                }}
                placeholder="View name"
                className="mt-[16px] w-full rounded-none border border-[#e2e2e2] bg-folk-page px-[12px] py-[10px] text-[14px] text-folk-text outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
              />
              <div className="mt-[16px] flex items-center justify-end gap-[8px]">
                <button
                  type="button"
                  onClick={() => setIsCreateViewOpen(false)}
                  className="rounded-none border border-folk-border px-[12px] py-[7px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateView}
                  disabled={!newViewName.trim()}
                  className="primary-btn px-[12px] py-[7px] text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save view
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isSendInvoicesOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20" onClick={handleCloseSendInvoicesModal} />
          <div className="fixed inset-0 z-[51] flex items-center justify-center p-[16px]">
            <div className="w-full max-w-[460px] rounded-[18px] border border-[#e7e7e7] bg-folk-surface p-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <h3 className="text-[15px] font-semibold text-folk-text">
                {sendInvoicesSummary ? "Invoice sending complete" : "Create invoices"}
              </h3>

              {sendInvoicesSummary ? (
                <>
                  <p className="mt-[6px] text-[13px] text-folk-secondary">
                    {sendInvoicesSummary.completedCount} {sendInvoicesSummary.completedCount === 1 ? "invoice was" : "invoices were"} completed.
                    {sendInvoicesSummary.emailedCount > 0 && ` ${sendInvoicesSummary.emailedCount} emailed.`}
                    {sendInvoicesSummary.portalCount > 0 && ` ${sendInvoicesSummary.portalCount} prepared for agency claim.`}
                    {sendInvoicesSummary.failedCount > 0 && ` ${sendInvoicesSummary.failedCount} failed.`}
                    {sendInvoicesSummary.skippedCount > 0 && ` ${sendInvoicesSummary.skippedCount} skipped.`}
                  </p>
                  {sendInvoicesSummary.failedMessages.length > 0 && (
                    <div className="mt-[14px] max-h-[180px] overflow-y-auto rounded-[14px] border border-folk-border bg-folk-page px-[12px] py-[10px]">
                      <div className="text-[12px] font-medium text-folk-secondary">
                        {sendInvoicesSummary.failedMessages.join(" | ")}
                      </div>
                    </div>
                  )}
                  {sendInvoicesSummary.xeroWarnings.length > 0 && (
                    <div className="mt-[14px] max-h-[180px] overflow-y-auto rounded-[14px] border border-amber-200 bg-amber-50 px-[12px] py-[10px]">
                      <div className="text-[12px] font-medium text-amber-700">
                        Sent, but not added to Xero: {sendInvoicesSummary.xeroWarnings.join(" | ")}
                      </div>
                    </div>
                  )}
                  <div className="mt-[16px] flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleCloseSendInvoicesModal}
                      className="primary-btn px-[12px] py-[7px] text-[13px] font-medium transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-[6px] text-[13px] text-folk-secondary">
                    Complete {selectedTaskCount} {selectedTaskCount === 1 ? "invoice" : "invoices"} based on each participant&apos;s plan type?
                  </p>
                  <p className="mt-[8px] text-[12px] text-folk-secondary">
                    Plan-managed and self-managed participants will be emailed. Agency-managed participants will be prepared for NDIA portal claim.
                  </p>
                  <div className="mt-[16px] flex items-center justify-end gap-[8px]">
                    <button
                      type="button"
                      onClick={handleCloseSendInvoicesModal}
                      disabled={isSendingInvoices}
                      className="rounded-none border border-folk-border px-[12px] py-[7px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendInvoices}
                      disabled={isSendingInvoices || selectedTaskCount === 0}
                      className="primary-btn px-[12px] py-[7px] text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSendingInvoices ? "Sending..." : "Confirm"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {viewContextMenu && (
        <div
          className="fixed z-[70] min-w-[160px] rounded-none border border-folk-border bg-folk-surface py-[4px] shadow-[0_6px_20px_rgba(0,0,0,0.12)]"
          style={{ left: viewContextMenu.x, top: viewContextMenu.y }}
        >
          <button
            type="button"
            onClick={() => {
              deleteView(viewContextMenu.viewId)
              setViewContextMenu(null)
            }}
            className="flex w-full items-center px-[14px] py-[8px] text-left text-[13px] font-medium text-[#c43d3d] transition-colors hover:bg-[#faf5f5]"
          >
            Delete view
          </button>
        </div>
      )}
    </div>
  )
}
