"use client"

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  SquareCheck,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Receipt,
  SlidersHorizontal,
  Table2,
  Tag,
  User,
  X,
  Building2,
} from "lucide-react"
import { DatePicker } from "@/components/date-picker"
import { useCharges } from "@/lib/hooks/use-charges"
import { useClients } from "@/lib/hooks/use-clients"
import { useInvoices } from "@/lib/hooks/use-invoices"
import { useSavedViews } from "@/lib/hooks/use-saved-views"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useWorkspace } from "@/lib/workspace-context"
import { useWorkspaceSettings } from "@/lib/hooks/use-workspace-settings"
import type { Client, InvoiceDeliveryMethod, InvoiceLineItem, Task } from "@/lib/types"
import { PageLoader, PageError } from "@/components/page-state"
import { useToast } from "@/components/toast"
import {
  formatTime,
  formatCurrency,
  formatDecimal,
  formatInvoiceQuantity,
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
  SidebarField,
  SidebarStaticField,
  EmptyState,
} from "./_components/invoicing-helpers"

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
  width: string
  alwaysVisible?: boolean
}

const invoiceColumnDefs: InvoiceColumnDef[] = [
  { key: "checkbox", label: "", width: "40px", alwaysVisible: true },
  { key: "date", label: "Date", width: "100px" },
  { key: "type", label: "Type", width: "80px" },
  { key: "participant", label: "Participant", width: "minmax(180px,1.5fr)" },
  { key: "charge", label: "Charge Item", width: "110px" },
  { key: "quantity", label: "Quantity", width: "90px" },
  { key: "unit-cost", label: "Unit Cost", width: "100px" },
  { key: "amount", label: "Total Cost", width: "100px" },
] as const

const defaultVisibleColumnKeys = ["checkbox", "date", "type", "participant", "charge", "quantity", "unit-cost", "amount"]
const weekDayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function InvoicingPage() {
  const { toast } = useToast()
  const { tasks: allTasks, isLoading: tasksLoading, fetchError: tasksFetchError, updateTask, refetch: refetchTasks } = useTasks()
  const { clients, isLoading: clientsLoading, fetchError: clientsFetchError } = useClients()
  const { enabledCharges, allCharges } = useCharges()
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
  const [isCreateViewOpen, setIsCreateViewOpen] = useState(false)
  const [newViewName, setNewViewName] = useState("")
  const [viewContextMenu, setViewContextMenu] = useState<{ viewId: string; x: number; y: number } | null>(null)
  const [datePickerField, setDatePickerField] = useState<"dueDate" | null>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  const filterPillRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const pageSizeButtonRef = useRef<HTMLButtonElement>(null)
  const displayButtonRef = useRef<HTMLButtonElement>(null)
  const detailDueDateButtonRef = useRef<HTMLButtonElement>(null)
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

    const isPlanManaged = client.participant.fundingType === "plan-managed"
    if (isPlanManaged) return client.participant.planManagerEmail || client.participant.email || ""
    return client.participant.email || client.participant.planManagerEmail || ""
  }, [getTaskClient])

  const getTaskAmount = useCallback((task: Task): number => {
    const charge = getTaskCharge(task)
    if (!charge) return 0

    if (charge.unit === "each" || charge.unit === "km") {
      const quantity = task.timeSpent > 0 ? task.timeSpent : 1
      return quantity * charge.price
    }

    const hours = task.timeSpent / 60
    return hours * charge.price
  }, [getTaskCharge])

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

    if (amount <= 0)
      issues.push("Invoice total must be greater than $0.00 before sending.")

    if (client?.participant.fundingType === "ndia-managed" && !client.participant.ndisNumber)
      issues.push("Add the participant NDIS number before preparing an agency-managed claim.")

    if (client?.participant.fundingType !== "ndia-managed" && !completionAction?.sentTo)
      issues.push("Add an invoicing email on the participant profile before sending.")

    return issues
  }, [getTaskAmount, getTaskCharge, getTaskClient, getTaskCompletionAction])

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
  ])

  const sortedTasks = useMemo(
    () => sortTasksByDate(filteredTasks),
    [filteredTasks]
  )

  const selectedTask = selectedTaskId
    ? readyTasks.find((task) => task.id === selectedTaskId) ?? null
    : null

  const hasDisplayFilters = displayParticipants.length > 0 || displayAssignees.length > 0 || displayCharges.length > 0
  const filteredTaskIds = filteredTasks.map((task) => task.id)
  const hasFilteredTasks = filteredTaskIds.length > 0
  const areAllFilteredTasksReviewed = hasFilteredTasks && filteredTaskIds.every((taskId) => reviewedTaskIds.includes(taskId))
  const selectedTasksToInvoice = useMemo(
    () => readyTasks.filter((task) => reviewedTaskIds.includes(task.id)),
    [readyTasks, reviewedTaskIds]
  )
  const selectedTaskCount = selectedTasksToInvoice.length
  const isColumnVisible = (key: string) => visibleColumnKeys.includes(key)
  const visibleColumns = invoiceColumnDefs.filter((column) => column.alwaysVisible || visibleColumnKeys.includes(column.key))
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
    const completedTaskIds: string[] = []

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

      const quantity = formatInvoiceQuantity(task, charge.unit)
      const amount = getTaskAmount(task)

      const lineItem: InvoiceLineItem = {
        id: crypto.randomUUID(),
        description: task.title || charge.shortName || "Support item",
        chargeItemNumber: charge.itemNumber,
        chargeName: charge.shortName,
        quantity,
        unit: charge.unit,
        rate: charge.price,
        amount,
        taskId: task.id,
        clientId: client.id,
      }

      const invoice = await addInvoice({
        clientName: participantName,
        clientId: client.id,
        taskIds: [task.id],
        lineItems: [lineItem],
        subtotal: amount,
        gst: 0,
        total: amount,
        createdBy: "Team Leader",
        notes: task.description || "",
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
          completedTaskIds.push(task.id)
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

        await markInvoiceSent(invoice.id, {
          sentTo: completionAction.sentTo,
          deliveryMethod: completionAction.deliveryMethod,
        })
        completedCount += 1
        emailedCount += 1
        completedTaskIds.push(task.id)
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
    const unitLabel = charge?.unit === "km" ? "KM" : charge?.unit === "each" ? "EA" : "H"
    const unitCost = charge?.price || 0
    const amount = getTaskAmount(task)
    const isReviewed = reviewedTaskIds.includes(task.id)
    const invoiceIssues = getTaskInvoiceIssues(task)
    const hasInvoiceIssues = invoiceIssues.length > 0
    const lastKey = visibleColumns[visibleColumns.length - 1]?.key

    const tdClass = (key: string) =>
      `h-[44px] overflow-hidden whitespace-nowrap border-b ${key !== lastKey ? "border-r" : ""} border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626] group-hover:bg-[#f5f5f5]`

    return (
      <tr
        key={task.id}
        className="group cursor-pointer transition-colors"
        onClick={() => setSelectedTaskId(task.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter") setSelectedTaskId(task.id)
        }}
      >
        <td className={`${tdClass("checkbox")}${hasInvoiceIssues ? " border-l-[3px] border-l-[#e46a6a]" : ""}`}>
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setReviewedTaskIds((current) => current.includes(task.id)
                  ? current.filter((taskId) => taskId !== task.id)
                  : [...current, task.id])
              }}
              className={`flex h-[18px] w-[18px] items-center justify-center rounded border-[1.5px] transition-colors ${
                isReviewed
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-[#ccc] hover:border-[#999]"
              }`}
              tabIndex={0}
              aria-label={isReviewed ? "Unmark invoice review" : "Mark invoice review"}
            >
              {isReviewed && <span className="text-[9px]">✓</span>}
            </button>
          </div>
        </td>
        {isColumnVisible("date") && (
          <td className={tdClass("date")}>
            {formatInvoiceDate(task.dueDate) || <span className="text-[#ccc]">—</span>}
          </td>
        )}
        {isColumnVisible("type") && (
          <td className={tdClass("type")}>
            <span className={`inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] px-[12px] text-[12px] font-medium ${
              fundingType === "plan-managed" ? "bg-[#e8edf2] text-[#334155]"
              : fundingType === "ndia-managed" ? "bg-[#ede8f5] text-[#5b21b6]"
              : fundingType === "self-managed" ? "bg-green-100 text-green-700"
              : "bg-[#f0f0f0] text-[#555]"
            }`}>
              {typeLabel}
            </span>
          </td>
        )}
        {isColumnVisible("participant") && (
          <td className={tdClass("participant")}>
            <span className="truncate">{participantName}</span>
          </td>
        )}
        {isColumnVisible("charge") && (
          <td className={tdClass("charge")}>
            {task.chargeType ? (
              <span className="truncate">{chargeLabel(task.chargeType)}</span>
            ) : <span className="text-[#ccc]">—</span>}
          </td>
        )}
        {isColumnVisible("charge-number") && (
          <td className={tdClass("charge-number")}>
            {task.chargeType ? (
              <span className="text-[#666]">{task.chargeType}</span>
            ) : <span className="text-[#ccc]">—</span>}
          </td>
        )}
        {isColumnVisible("quantity") && (
          <td className={tdClass("quantity")}>
            {quantity > 0 ? (
              <span className="text-[#666]">{formatDecimal(quantity)} {unitLabel}</span>
            ) : <span className="text-[#ccc]">—</span>}
          </td>
        )}
        {isColumnVisible("unit-cost") && (
          <td className={tdClass("unit-cost")}>
            {unitCost > 0 ? (
              <span className="text-[#666]">{formatCurrency(unitCost)}</span>
            ) : <span className="text-[#ccc]">—</span>}
          </td>
        )}
        {isColumnVisible("amount") && (
          <td className={tdClass("amount")}>
            {amount > 0 ? <span className="inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] bg-green-50 px-[10px] text-[12px] font-medium text-green-700">{formatCurrency(amount)}</span> : <span className="text-[#ccc]">—</span>}
          </td>
        )}
      </tr>
    )
  }

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
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
        <div className="flex items-center gap-[8px]">
          <span className="text-[13px] font-medium text-[#262626]">Invoicing</span>
          <div className="h-[16px] w-px bg-[#e5e5e5]" />
          <button
            type="button"
            onClick={selectDefaultView}
            className={`flex items-center gap-[6px] rounded-[4px] border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${activeViewId === null ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-transparent text-[#888] hover:bg-[#f5f5f5] hover:text-[#262626]"}`}
            tabIndex={0}
          >
            <Table2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
            <span>Draft invoices</span>
          </button>
          <Link
            href="/invoices"
            className="flex items-center gap-[6px] rounded-[4px] border border-transparent px-[8px] py-[4px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
          >
            <Receipt className="h-[14px] w-[14px]" strokeWidth={1.75} />
            <span>Invoices</span>
          </Link>
          {savedViews.length > 0 && <div className="h-[16px] w-px bg-[#dcdcdc]" />}
          {savedViews.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => selectView(view)}
              onContextMenu={(event) => {
                event.preventDefault()
                setViewContextMenu({ viewId: view.id, x: event.clientX, y: event.clientY })
              }}
              className={`flex items-center gap-[6px] rounded-[4px] border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${activeViewId === view.id ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-transparent text-[#888] hover:bg-[#f5f5f5] hover:text-[#262626]"}`}
              tabIndex={0}
            >
              <Table2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
              <span>{view.name}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-[8px]">
          {viewMode === "week" && (
            <div className="flex items-center gap-[6px]">
              <button
                type="button"
                onClick={() => setWeekOffset((current) => current - 1)}
                className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Previous week"
              >
                <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={1.75} />
              </button>
              <span className="min-w-[160px] text-center text-[13px] font-semibold text-[#262626]">{formatWeekLabel()}</span>
              <button
                type="button"
                onClick={() => setWeekOffset((current) => current + 1)}
                className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Next week"
              >
                <ChevronRight className="h-[14px] w-[14px]" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                disabled={weekOffset === 0}
                className={`flex items-center gap-[5px] rounded border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${weekOffset === 0 ? "cursor-default border-[#e8e8e8] bg-white text-[#ccc]" : "border-[#dcdcdc] bg-white text-[#262626] hover:bg-[#f5f5f5]"}`}
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
            className={`flex items-center gap-[6px] rounded-[4px] px-[10px] py-[6px] text-[13px] font-medium transition-colors ${
              selectedTaskCount > 0
                ? "primary-btn"
                : "cursor-not-allowed bg-[#efefef] text-[#b8b8b8]"
            }`}
            tabIndex={0}
          >
            <span>Create invoices</span>
            <span className={`rounded-[4px] px-[6px] py-[1px] text-[11px] font-semibold ${
              selectedTaskCount > 0 ? "bg-[#e8e8e8] text-[#555]" : "bg-[#f5f5f5] text-[#b8b8b8]"
            }`}>
              {selectedTaskCount}
            </span>
          </button>
        </div>
      </div>

      <div className="flex h-[41px] shrink-0 items-center gap-[8px] border-b border-[#dcdcdc] px-[16px]">
        <div className="relative">
          <button
            type="button"
            ref={filterButtonRef}
            onClick={() => {
              setIsFilterMenuOpen((current) => !current)
              setActiveFilterDropdown(null)
            }}
            className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Filter</span>
          </button>
          {isFilterMenuOpen && (
            <>
              <div className="fixed inset-0 z-[55]" onClick={() => setIsFilterMenuOpen(false)} />
              <div className="absolute left-0 top-full z-[60] mt-[4px] w-[180px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                <p className="px-[16px] py-[6px] text-[11px] font-medium text-[#888]">Filter by</p>
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
                    className="flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                    tabIndex={0}
                  >
                    <Icon className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                    {label}
                  </button>
                ))}
              </div>
            </>
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

        <div className="relative ml-auto">
          <button
            type="button"
            ref={pageSizeButtonRef}
            onClick={() => setIsPageSizeOpen((current) => !current)}
            className="flex items-center gap-[5px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            <span>{pageSize} per page</span>
            <ChevronDown className="h-[11px] w-[11px] text-[#888]" strokeWidth={1.5} />
          </button>
          {isPageSizeOpen && (
            <>
              <div className="fixed inset-0 z-[55]" onClick={() => setIsPageSizeOpen(false)} />
              <div className="absolute right-0 top-full z-[60] mt-[4px] w-[120px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                {[10, 20, 50, 100].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size)
                      setVisibleCount(size)
                      setIsPageSizeOpen(false)
                    }}
                    className={`flex w-full items-center px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${pageSize === size ? "bg-[#f5f5f5] text-[#262626]" : "text-[#262626]"}`}
                    tabIndex={0}
                  >
                    {size} per page
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          ref={displayButtonRef}
          onClick={() => setIsDisplayOpen((current) => !current)}
          className={`flex items-center gap-[5px] rounded border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${hasDisplayFilters ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" : "border-[#dcdcdc] text-[#262626] hover:bg-[#f5f5f5]"}`}
          tabIndex={0}
        >
          <SlidersHorizontal className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span className="hidden sm:inline">Display</span>
          {hasDisplayFilters && (
            <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded-[4px] bg-[#e8edf2] px-[4px] text-[10px] font-bold text-[#334155]">
              {displayParticipants.length + displayAssignees.length + displayCharges.length}
            </span>
          )}
        </button>
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
          className={`flex items-center gap-[5px] rounded border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${
            hasFilteredTasks
              ? "border-[#dcdcdc] text-[#262626] hover:bg-[#f5f5f5]"
              : "cursor-not-allowed border-[#e8e8e8] text-[#ccc]"
          }`}
          tabIndex={0}
        >
          <span>{areAllFilteredTasksReviewed ? "Deselect all" : "Select all"}</span>
        </button>
        {isDisplayOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsDisplayOpen(false)} />
            <div
              className="fixed z-50 w-[420px] rounded-lg border border-[#dcdcdc] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
              style={(() => {
                const rect = displayButtonRef.current?.getBoundingClientRect()
                if (!rect) return {}
                return { top: rect.bottom + 4, right: window.innerWidth - rect.right }
              })()}
            >
              <div className="max-h-[520px] overflow-y-auto">
                <div className="px-[20px] pb-[16px] pt-[16px]">
                  <div className="flex gap-[10px]">
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
                          className={`flex flex-1 flex-col items-center justify-center gap-[6px] rounded-xl border py-[14px] transition-colors ${isActive ? "border-[#d0d0d0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]" : "border-transparent bg-[#fafafa] hover:bg-[#f0f0f0]"}`}
                          tabIndex={0}
                        >
                          <Icon className={`h-[20px] w-[20px] ${isActive ? "text-[#262626]" : "text-[#999]"}`} strokeWidth={1.5} />
                          <span className={`text-[13px] font-medium ${isActive ? "text-[#262626]" : "text-[#999]"}`}>{label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <DisplaySection
                  title="Clients"
                  items={uniqueParticipants}
                  activeItems={displayParticipants}
                  onToggle={(value) => handleToggleDisplayItem(displayParticipants, setDisplayParticipants, value)}
                />
                <DisplaySection
                  title="Assignees"
                  items={uniqueAssignees}
                  activeItems={displayAssignees}
                  onToggle={(value) => handleToggleDisplayItem(displayAssignees, setDisplayAssignees, value)}
                />
                <DisplaySection
                  title="Charges"
                  items={uniqueCharges}
                  activeItems={displayCharges}
                  onToggle={(value) => handleToggleDisplayItem(displayCharges, setDisplayCharges, value)}
                  formatLabel={chargeLabel}
                />
              </div>

              <div className="flex items-center gap-[20px] border-t border-[#f0f0f0] px-[20px] py-[12px]">
                <button
                  type="button"
                  onClick={() => {
                    setDisplayParticipants([])
                    setDisplayAssignees([])
                    setDisplayCharges([])
                    setViewMode("list")
                    setWeekOffset(0)
                  }}
                  className="text-[13px] font-medium text-[#bbb] transition-colors hover:text-[#262626]"
                  tabIndex={0}
                >
                  Reset
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {activeFilterDropdown && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setActiveFilterDropdown(null)} />
          {(() => {
            const anchor = filterPillRefs.current[activeFilterDropdown] || filterButtonRef.current
            const rect = anchor?.getBoundingClientRect()
            if (!rect) return null
            const dropdownStyle = { top: rect.bottom + 4, left: rect.left, minWidth: 200 }

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
                  style={dropdownStyle}
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
                  style={dropdownStyle}
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
                  style={dropdownStyle}
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
                style={dropdownStyle}
              />
            )
          })()}
        </>
      )}

      <div className="flex-1 overflow-auto bg-[#fafafa]">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              {visibleColumns.map((column, colIdx) => {
                const isLast = colIdx === visibleColumns.length - 1
                return (
                  <th
                    key={column.key}
                    className={`sticky top-0 z-20 h-[44px] whitespace-nowrap border-b ${isLast ? "" : "border-r"} border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888] ${column.key === "checkbox" ? "text-center" : ""}`}
                    style={column.width.endsWith("px") ? { width: parseInt(column.width) } : { minWidth: 180 }}
                  >
                    {column.label}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {viewMode === "list" ? (
              <>
                {sortedTasks.slice(0, visibleCount).map(renderTaskRow)}
                {sortedTasks.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumns.length}>
                      <EmptyState />
                    </td>
                  </tr>
                )}
                {sortedTasks.length > visibleCount && (
                  <tr>
                    <td colSpan={visibleColumns.length} className="border-b border-[#f0f0f0]">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((current) => current + pageSize)}
                        className="flex w-full items-center justify-center gap-[6px] py-[10px] text-[13px] font-medium text-[#888] transition-colors hover:text-[#262626]"
                        tabIndex={0}
                      >
                        Show more ({sortedTasks.length - visibleCount} remaining)
                      </button>
                    </td>
                  </tr>
                )}
              </>
            ) : (
              <>
                {Object.entries(dayBuckets).map(([dateStr, dayTasks], index) => {
                  const date = new Date(dateStr + "T00:00:00")
                  const dayLabel = weekDayNames[index]
                  const dateLabel = date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
                  const isToday = dateStr === toDateStr(new Date())

                  return (
                    <Fragment key={dateStr}>
                      <tr>
                        <td colSpan={visibleColumns.length} className={`border-b border-[#e8e8e8] px-[12px] py-[6px] ${isToday ? "bg-blue-50/60" : "bg-[#fafafa]"}`}>
                          <div className="flex items-center gap-[8px]">
                            <span className={`text-[13px] font-semibold ${isToday ? "text-blue-600" : "text-[#262626]"}`}>
                              {dayLabel}
                            </span>
                            <span className={`text-[12px] font-medium ${isToday ? "text-blue-400" : "text-[#999]"}`}>
                              {dateLabel}
                            </span>
                            {dayTasks.length > 0 && (
                              <span className="text-[11px] font-medium text-[#bbb]">
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
                    <tr>
                      <td colSpan={visibleColumns.length} className="border-b border-[#e8e8e8] bg-[#fafafa] px-[12px] py-[6px]">
                        <div className="flex items-center gap-[8px]">
                          <span className="text-[13px] font-semibold text-[#999]">No date</span>
                          <span className="text-[11px] font-medium text-[#bbb]">
                            {noDateTasks.length} {noDateTasks.length === 1 ? "task" : "tasks"}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {noDateTasks.map(renderTaskRow)}
                  </Fragment>
                )}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumns.length}>
                      <EmptyState />
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
        <span className="text-[12px] font-medium text-[#999]">
          {viewMode === "week"
            ? `${filteredTasks.length} ${filteredTasks.length === 1 ? "task" : "tasks"} ready to invoice`
            : `${sortedTasks.length} ${sortedTasks.length === 1 ? "task" : "tasks"} ready to invoice`}
        </span>
      </div>

      {selectedTask && (
        <>
          {(() => {
            const selectedClient = getTaskClient(selectedTask)
            const selectedInvoiceEmail = getInvoiceEmail(selectedTask)
            const selectedAmount = getTaskAmount(selectedTask)
            const selectedFunding = formatFundingType(selectedClient?.participant.fundingType || "")
            const isSelectedTaskReviewed = reviewedTaskIds.includes(selectedTask.id)
            const selectedTaskInvoiceIssues = getTaskInvoiceIssues(selectedTask)
            const hasSelectedTaskInvoiceIssues = selectedTaskInvoiceIssues.length > 0

            return (
        <>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
            <div className="absolute inset-0 bg-black/20" onClick={() => setSelectedTaskId(null)} />
            <div className="relative z-10 flex h-[680px] max-h-[calc(100vh-32px)] w-[960px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[20px] border border-[#e7e7e7] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex min-h-0 flex-col px-[28px] py-[22px]">
                  <div className="flex items-center gap-[6px] text-[11px] font-medium uppercase tracking-[0.03em] text-[#a3a3a3]">
                    <SquareCheck className="h-[12px] w-[12px]" strokeWidth={1.5} />
                    <span>Task</span>
                  </div>

                  <div className="mt-[14px] rounded-[10px] bg-[#f7f7f7] px-[12px] py-[10px]">
                    <input
                      type="text"
                      placeholder="Enter a title for this task..."
                      value={selectedTask.title}
                      onChange={(event) => handleUpdateTask(selectedTask.id, { title: event.target.value })}
                      className="w-full bg-transparent text-[18px] font-semibold text-[#262626] placeholder-[#8f8f8f] outline-none"
                    />
                  </div>

                  <textarea
                    value={selectedTask.description}
                    onChange={(event) => handleUpdateTask(selectedTask.id, { description: event.target.value })}
                    placeholder="Start typing a description..."
                    className="mt-[14px] min-h-[80px] flex-1 resize-none overflow-y-auto bg-transparent text-[14px] leading-[1.6] text-[#4b4b4b] outline-none placeholder:text-[#b5b5b5]"
                  />

                  <div className="mt-[16px] flex items-center gap-[8px] border-t border-[#f1f1f1] pt-[14px]">
                    <button
                      type="button"
                      onClick={() => handleMoveBackToTasks(selectedTask.id)}
                      className="flex items-center gap-[5px] rounded border border-[#dcdcdc] bg-white px-[10px] py-[5px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                    >
                      Move back to tasks
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTaskId(null)}
                      className="ml-auto flex items-center gap-[5px] rounded border border-[#dcdcdc] bg-white px-[10px] py-[5px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                    >
                      Done
                    </button>
                  </div>
                </div>

                <div className="flex min-h-0 flex-col border-l border-[#ececec] px-[20px] py-[18px]">
                  <div className="flex justify-end gap-[4px]">
                    <button
                      type="button"
                      onClick={() => setSelectedTaskId(null)}
                      className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                      tabIndex={0}
                      aria-label="Close"
                    >
                      <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
                    </button>
                  </div>

                  <div className="mt-[18px] flex flex-col gap-[14px] overflow-y-auto">
                    {hasSelectedTaskInvoiceIssues && (
                      <div className="grid grid-cols-[84px_minmax(0,1fr)] items-start gap-[12px]">
                        <span className="pt-[6px] text-[13px] font-medium text-[#8d8d8d]">Issues</span>
                        <div className="min-w-0 space-y-[6px]">
                          {selectedTaskInvoiceIssues.map((issue) => (
                            <div key={issue} className="flex items-start gap-[8px] rounded-[10px] bg-[#fff6f6] px-[8px] py-[6px] text-[12px] leading-[1.45] text-[#a14e4e]">
                              <AlertTriangle className="mt-[1px] h-[12px] w-[12px] shrink-0" strokeWidth={1.75} />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-[10px]">
                      <div className="px-[8px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3]">
                        Task information
                      </div>
                      <SidebarField
                        label="Customer"
                        value={selectedTask.client}
                        onChange={(value) => handleUpdateTask(selectedTask.id, { client: value })}
                        placeholder="Empty"
                      />
                      <SidebarField
                        label="Assignee"
                        value={selectedTask.assignee}
                        onChange={(value) => handleUpdateTask(selectedTask.id, { assignee: value })}
                        placeholder="Empty"
                      />
                      <SidebarField
                        label="Charge"
                        value={selectedTask.chargeType}
                        onChange={(value) => handleUpdateTask(selectedTask.id, { chargeType: value })}
                        placeholder="Empty"
                        type="select"
                        options={enabledCharges.map((charge) => charge.itemNumber)}
                        formatValue={chargeLabel}
                      />
                      <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                        <span className="text-[13px] font-medium text-[#8d8d8d]">Due date</span>
                        <div>
                          <button
                            ref={detailDueDateButtonRef}
                            type="button"
                            onClick={() => setDatePickerField(datePickerField ? null : "dueDate")}
                            className="flex min-w-0 items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] text-left transition-colors hover:bg-[#f7f7f7]"
                            tabIndex={0}
                          >
                            <CalendarDays className={`h-[13px] w-[13px] shrink-0 ${selectedTask.dueDate ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                            <span className={`truncate text-[13px] font-medium ${selectedTask.dueDate ? "text-[#262626]" : "text-[#ccc]"}`}>
                              {selectedTask.dueDate
                                ? new Date(selectedTask.dueDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })
                                : "Empty"}
                            </span>
                          </button>
                          {datePickerField === "dueDate" && (
                            <div
                              className="fixed z-[70]"
                              style={(() => {
                                const rect = detailDueDateButtonRef.current?.getBoundingClientRect()
                                if (!rect) return {}

                                const pickerWidth = 260
                                const viewportPadding = 16
                                const left = Math.min(
                                  Math.max(viewportPadding, rect.right - pickerWidth),
                                  window.innerWidth - pickerWidth - viewportPadding
                                )

                                const maxTop = window.innerHeight - 320 - viewportPadding
                                const top = Math.min(rect.bottom + 6, Math.max(viewportPadding, maxTop))

                                return { top, left }
                              })()}
                            >
                              <DatePicker
                                value={selectedTask.dueDate || ""}
                                onChange={(value) => {
                                  handleUpdateTask(selectedTask.id, { dueDate: value })
                                  setDatePickerField(null)
                                }}
                                onClose={() => setDatePickerField(null)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#efefef] pt-[14px]">
                      <div className="space-y-[10px]">
                        <div className="px-[8px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3]">
                          Invoice information
                        </div>
                        <SidebarStaticField label="Amount" value={selectedAmount > 0 ? formatCurrency(selectedAmount) : "Empty"} />
                        <SidebarStaticField label="Funding" value={selectedFunding} />
                        <SidebarStaticField label="Email" value={selectedInvoiceEmail || "Empty"} />
                        <SidebarStaticField label="Time" value={selectedTask.timeSpent > 0 ? formatTime(selectedTask.timeSpent) : "Empty"} />
                        <SidebarStaticField label="Status" value={isSelectedTaskReviewed ? "Reviewed" : "Review pending"} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
            )
          })()}
        </>
      )}

      {isCreateViewOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setIsCreateViewOpen(false)} />
          <div className="fixed inset-0 z-[51] flex items-center justify-center p-[16px]">
            <div className="w-full max-w-[420px] rounded-[18px] border border-[#e7e7e7] bg-white p-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <h3 className="text-[15px] font-semibold text-[#262626]">Create a view for invoicing</h3>
              <p className="mt-[4px] text-[13px] text-[#888]">Save the current structure, filters and display settings.</p>
              <input
                ref={newViewInputRef}
                value={newViewName}
                onChange={(event) => setNewViewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleCreateView()
                }}
                placeholder="View name"
                className="mt-[16px] w-full rounded-[12px] border border-[#e2e2e2] bg-[#fafafa] px-[12px] py-[10px] text-[14px] text-[#262626] outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
              />
              <div className="mt-[16px] flex items-center justify-end gap-[8px]">
                <button
                  type="button"
                  onClick={() => setIsCreateViewOpen(false)}
                  className="rounded-[4px] border border-[#dcdcdc] px-[12px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateView}
                  disabled={!newViewName.trim()}
                  className="primary-btn rounded-[4px] px-[12px] py-[7px] text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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
            <div className="w-full max-w-[460px] rounded-[18px] border border-[#e7e7e7] bg-white p-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <h3 className="text-[15px] font-semibold text-[#262626]">
                {sendInvoicesSummary ? "Invoice sending complete" : "Create invoices"}
              </h3>

              {sendInvoicesSummary ? (
                <>
                  <p className="mt-[6px] text-[13px] text-[#666]">
                    {sendInvoicesSummary.completedCount} {sendInvoicesSummary.completedCount === 1 ? "invoice was" : "invoices were"} completed.
                    {sendInvoicesSummary.emailedCount > 0 && ` ${sendInvoicesSummary.emailedCount} emailed.`}
                    {sendInvoicesSummary.portalCount > 0 && ` ${sendInvoicesSummary.portalCount} prepared for agency claim.`}
                    {sendInvoicesSummary.failedCount > 0 && ` ${sendInvoicesSummary.failedCount} failed.`}
                    {sendInvoicesSummary.skippedCount > 0 && ` ${sendInvoicesSummary.skippedCount} skipped.`}
                  </p>
                  {sendInvoicesSummary.failedMessages.length > 0 && (
                    <div className="mt-[14px] max-h-[180px] overflow-y-auto rounded-[14px] border border-[#ececec] bg-[#fafafa] px-[12px] py-[10px]">
                      <div className="text-[12px] font-medium text-[#666]">
                        {sendInvoicesSummary.failedMessages.join(" | ")}
                      </div>
                    </div>
                  )}
                  <div className="mt-[16px] flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleCloseSendInvoicesModal}
                      className="primary-btn rounded-[4px] px-[12px] py-[7px] text-[13px] font-medium transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-[6px] text-[13px] text-[#666]">
                    Complete {selectedTaskCount} {selectedTaskCount === 1 ? "invoice" : "invoices"} based on each participant&apos;s plan type?
                  </p>
                  <p className="mt-[8px] text-[12px] text-[#999]">
                    Plan-managed and self-managed participants will be emailed. Agency-managed participants will be prepared for NDIA portal claim.
                  </p>
                  <div className="mt-[16px] flex items-center justify-end gap-[8px]">
                    <button
                      type="button"
                      onClick={handleCloseSendInvoicesModal}
                      disabled={isSendingInvoices}
                      className="rounded-[4px] border border-[#dcdcdc] px-[12px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendInvoices}
                      disabled={isSendingInvoices || selectedTaskCount === 0}
                      className="primary-btn rounded-[4px] px-[12px] py-[7px] text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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
          className="fixed z-[70] min-w-[160px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_6px_20px_rgba(0,0,0,0.12)]"
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
