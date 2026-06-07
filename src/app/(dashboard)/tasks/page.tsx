"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import {
  Table2,
  Plus,
  ListFilter,
  X,
  SlidersHorizontal,
  CheckSquare,
  CalendarDays,
  Building2,
  FileText,
  Clock,
  Tag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  Trash2,
} from "lucide-react"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useInvoices } from "@/lib/hooks/use-invoices"
import { useClients } from "@/lib/hooks/use-clients"
import { useCharges } from "@/lib/hooks/use-charges"
import { useSavedViews } from "@/lib/hooks/use-saved-views"
import { useStaff } from "@/lib/hooks/use-staff"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { serviceChargeTypes } from "@/lib/ndis-charges"
import type { Task, Attachment } from "@/lib/types"
import { PageLoader, PageError } from "@/components/page-state"
import { useToast } from "@/components/toast"
import { Switch } from "@/components/switch"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { TaskDetailModal } from "./_components/task-detail-modal"
import {
  type TaskSavedView,
  taskColumnDefs,
  defaultTaskVisibleKeys,
  parseTimeInput,
  formatRowDate,
  getTodayStr,
} from "./_components/task-helpers"


export default function TasksPage() {
  const { toast } = useToast()
  const { tasks: allTasks, isLoading, fetchError, hasMore, isLoadingMore, loadMore, addTask, updateTask: updateTaskDb, deleteTask: deleteTaskDb, refetch } = useTasks()
  const { invoices } = useInvoices()
  const { clients, clientNames, updateClient } = useClients()
  const searchParams = useSearchParams()
  const { enabledCharges, allCharges } = useCharges()
  const { staffNames } = useStaff()
  const { canAssignTasks, role } = usePermissions()
  const isInvoicingMode = false
  const [currentUserName, setCurrentUserName] = useState("Sam Lee")
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.full_name) setCurrentUserName(user.user_metadata.full_name)
    }).catch(() => {})
  }, [])

  const tasks = isInvoicingMode
    ? allTasks.filter((t) => t.status === "done")
    : role === "coordinator"
      ? allTasks.filter((t) => t.assignee === currentUserName)
      : allTasks
  const chargeTypes = [
    { value: "", label: "No charge" },
    ...enabledCharges.map((c) => ({ value: c.itemNumber, label: c.shortName })),
  ]
  const chargeLabel = (val: string) => {
    if (!val) return ""
    const match = allCharges.find((c) => c.itemNumber === val)
    if (match) return match.shortName
    return val
  }
  const chargeCode = (val: string) => {
    if (!val) return ""
    const match = allCharges.find((c) => c.itemNumber === val)
    if (!match) return val
    const s = match.shortName
    if (s.startsWith("SC-L")) return s
    if (s.includes("PRC")) return "PRC"
    if (s.includes("Travel")) return "Travel"
    if (s.includes("Transport")) return "Trans"
    return s.slice(0, 6)
  }

  const secondaryChargeLabel = (val: string) => {
    if (!val) return ""
    const svc = serviceChargeTypes.find((s) => s.value === val)
    if (svc) return svc.label
    const ndis = allCharges.find((c) => c.itemNumber === val)
    if (ndis) return ndis.shortName
    return val
  }

  const invoicedTaskIds = useMemo(() => {
    const ids = new Set<string>()
    for (const inv of invoices) {
      if (inv.status !== "unsent") {
        for (const tid of inv.taskIds) ids.add(tid)
      }
    }
    return ids
  }, [invoices])

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const createBtnRef = useRef<HTMLButtonElement>(null)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState<string[]>([])
  const [participantFilter, setParticipantFilter] = useState<string[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([])
  const [chargeFilter, setChargeFilter] = useState<string[]>([])
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const filterPillRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [visibleTaskColumnKeys, setVisibleTaskColumnKeys] = useState<string[]>(defaultTaskVisibleKeys)
  const [isTaskDisplayOpen, setIsTaskDisplayOpen] = useState(false)
  const taskDisplayBtnRef = useRef<HTMLButtonElement>(null)

  const [viewMode, setViewMode] = useState<"list" | "week">("list")
  const [weekOffset, setWeekOffset] = useState(0)

  const [isCreateTaskViewOpen, setIsCreateTaskViewOpen] = useState(false)
  const [newTaskViewName, setNewTaskViewName] = useState("")
  const [taskViewContextMenu, setTaskViewContextMenu] = useState<{ viewId: string; x: number; y: number } | null>(null)
  const [deleteTaskViewConfirm, setDeleteTaskViewConfirm] = useState<TaskSavedView | null>(null)
  const taskViewNameInputRef = useRef<HTMLInputElement>(null)

  const applyTaskView = useCallback((view: TaskSavedView) => {
    setViewMode(view.viewMode)
    setVisibleTaskColumnKeys(view.visibleColumnKeys)
    setWeekOffset(0)
  }, [])

  const resetTaskViewState = useCallback(() => {
    setViewMode("list")
    setVisibleTaskColumnKeys(defaultTaskVisibleKeys)
    setWeekOffset(0)
  }, [])

  const {
    savedViews: taskSavedViews,
    activeViewId: activeTaskViewId,
    createView: createTaskView,
    selectView: selectTaskView,
    selectDefaultView: selectDefaultTaskView,
    deleteView: deleteTaskView,
    syncActiveView: syncActiveTaskView,
  } = useSavedViews<TaskSavedView>({
    viewsStorageKey: isInvoicingMode ? "invoicing-task-views" : "task-views",
    activeViewStorageKey: isInvoicingMode ? "invoicing-task-active-view" : "task-active-view",
    buildView: ({ id, name }) => ({
      id,
      name,
      viewMode,
      visibleColumnKeys: [...visibleTaskColumnKeys],
    }),
    applyView: applyTaskView,
    resetState: resetTaskViewState,
    syncView: (view) => ({
      ...view,
      viewMode,
      visibleColumnKeys: [...visibleTaskColumnKeys],
    }),
  })

  useEffect(() => {
    syncActiveTaskView()
  }, [
    syncActiveTaskView,
    viewMode,
    visibleTaskColumnKeys,
  ])

  const handleCreateTaskView = () => {
    const createdView = createTaskView(newTaskViewName)
    if (!createdView) return
    setNewTaskViewName("")
    setIsCreateTaskViewOpen(false)
  }

  const handleSelectTaskView = (view: TaskSavedView) => {
    selectTaskView(view)
  }

  const handleSelectAllTaskView = () => {
    selectDefaultTaskView()
  }

  const handleDeleteTaskView = (viewId: string) => {
    deleteTaskView(viewId)
    setDeleteTaskViewConfirm(null)
  }

  const getWeekRange = (offset: number) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() + mondayOffset + offset * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return { weekStart, weekEnd }
  }

  const { weekStart, weekEnd } = getWeekRange(weekOffset)

  const formatWeekDate = (d: Date) =>
    d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })

  const formatWeekLabel = () => {
    const s = formatWeekDate(weekStart)
    const e = formatWeekDate(weekEnd)
    const yearS = weekStart.getFullYear()
    const yearE = weekEnd.getFullYear()
    if (yearS !== yearE) return `${s} ${yearS} – ${e} ${yearE}`
    return `${s} – ${e}, ${yearE}`
  }

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

  const weekDayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  const uniqueParticipants = Array.from(new Set(tasks.map((t) => t.client).filter(Boolean))).sort()
  const uniqueAssignees = Array.from(new Set(tasks.map((t) => t.assignee).filter(Boolean))).sort()
  const uniqueCharges = Array.from(new Set(tasks.map((t) => t.chargeType).filter(Boolean))).sort()

  const visibleTaskColumns = taskColumnDefs.filter(
    (col) => ("alwaysVisible" in col && col.alwaysVisible) || visibleTaskColumnKeys.includes(col.key)
  )
  const taskGridTemplate = visibleTaskColumns.map((c) => c.width).join(" ")


  const handleResetDisplay = () => {
    setViewMode("list")
    setVisibleTaskColumnKeys(defaultTaskVisibleKeys)
    setWeekOffset(0)
  }

  const [isQuickAdding, setIsQuickAdding] = useState(false)
  const [quickTitle, setQuickTitle] = useState("")
  const [quickClient, setQuickClient] = useState("")
  const [quickDueDate, setQuickDueDate] = useState(getTodayStr)
  const [quickTime, setQuickTime] = useState("")
  const [quickCharge, setQuickCharge] = useState("")
  const [quickActiveField, setQuickActiveField] = useState<"title" | "participant" | "charge" | "time" | null>("title")
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false)
  const [isQuickChargeOpen, setIsQuickChargeOpen] = useState(false)
  const [quickClientIdx, setQuickClientIdx] = useState(-1)
  const [quickChargeIdx, setQuickChargeIdx] = useState(-1)
  const [quickClientSearch, setQuickClientSearch] = useState("")
  const [quickChargeSearch, setQuickChargeSearch] = useState("")
  const quickInputRef = useRef<HTMLInputElement>(null)
  const quickTimeRef = useRef<HTMLInputElement>(null)
  const quickClientInputRef = useRef<HTMLInputElement>(null)
  const quickChargeInputRef = useRef<HTMLInputElement>(null)
  const quickClientListRef = useRef<HTMLDivElement>(null)
  const quickChargeListRef = useRef<HTMLDivElement>(null)


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

  const resetQuickAdd = () => {
    setQuickTitle("")
    setQuickClient("")
    setQuickDueDate(getTodayStr())
    setQuickTime("")
    setQuickCharge("")
    setQuickAssignee("")
    setIsQuickAdding(false)
    setIsQuickClientOpen(false)
    setIsQuickChargeOpen(false)
    setIsQuickAssigneeOpen(false)
    setQuickClientIdx(-1)
    setQuickChargeIdx(-1)
    setQuickAssigneeIdx(-1)
    setQuickAssigneeSearch("")
    setQuickClientSearch("")
    setQuickChargeSearch("")
    setQuickActiveField("title")
  }

  const [quickAssignee, setQuickAssignee] = useState("")
  const [, setIsQuickAssigneeOpen] = useState(false)
  const [, setQuickAssigneeSearch] = useState("")
  const [, setQuickAssigneeIdx] = useState(-1)

  const handleQuickFinish = async () => {
    const title = quickTitle.trim()
    if (!title) return
    const assignee = canAssignTasks ? (quickAssignee || currentUserName) : currentUserName
    const result = await addTask({
      title,
      description: "",
      status: "todo",
      assignee,
      client: quickClient,
      dueDate: quickDueDate || null,
      attachments: [],
      chargeType: quickCharge,
      timeSpent: quickTime ? parseTimeInput(quickTime) : 0,
    })
    if (result) toast("Task created", "success")
    setQuickTitle("")
    setQuickClient("")
    setQuickDueDate(getTodayStr())
    setQuickTime("")
    setQuickCharge("")
    setQuickAssignee("")
    setIsQuickClientOpen(false)
    setIsQuickChargeOpen(false)
    setIsQuickAssigneeOpen(false)
    setQuickClientIdx(-1)
    setQuickChargeIdx(-1)
    setQuickAssigneeIdx(-1)
    setQuickAssigneeSearch("")
    setQuickActiveField("title")
    setTimeout(() => quickInputRef.current?.focus(), 0)
  }


  const handleToggleComplete = (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const newStatus = task.status === "done" ? "todo" : "done"
    updateTaskDb(id, { status: newStatus })
  }

  const handleDeleteTask = (id: string) => {
    setDeleteConfirmId(id)
  }

  const confirmDeleteTask = () => {
    if (!deleteConfirmId) return
    deleteTaskDb(deleteConfirmId)
    if (selectedTaskId === deleteConfirmId) setSelectedTaskId(null)
    toast("Task deleted", "success")
    setDeleteConfirmId(null)
  }

  const toggleSelectAll = () => {
    const incompleteIds = filtered.filter((t) => t.status !== "done").map((t) => t.id)
    const allSelected = incompleteIds.length > 0 && incompleteIds.every((id) => selectedTaskIds.has(id))
    if (allSelected) setSelectedTaskIds(new Set())
    else setSelectedTaskIds(new Set(incompleteIds))
  }

  const handleBulkMarkDone = async () => {
    const ids = Array.from(selectedTaskIds)
    await Promise.all(ids.map((id) => updateTaskDb(id, { status: "done" })))
    setSelectedTaskIds(new Set())
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedTaskIds)
    await Promise.all(ids.map((id) => deleteTaskDb(id)))
    setSelectedTaskIds(new Set())
    setIsBulkDeleting(false)
  }

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null

  const handleUpdateTask = useCallback((field: keyof Task, value: string | Attachment[] | boolean | number) => {
    if (!selectedTaskId) return
    updateTaskDb(selectedTaskId, { [field]: value } as Partial<Task>)
  }, [selectedTaskId, updateTaskDb])

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

  const deepLinkHandledRef = useRef(false)
  useEffect(() => {
    if (deepLinkHandledRef.current) return
    const taskParam = searchParams.get("task")
    if (taskParam && allTasks.some((t) => t.id === taskParam)) {
      setSelectedTaskId(taskParam)
      deepLinkHandledRef.current = true
    }
  }, [searchParams, allTasks])

  const closeDetail = () => {
    setSelectedTaskId(null)
  }

  const filtered = tasks.filter((t) => {
    if (statusFilter.length > 0) {
      const isArchived = t.status === "done" && invoicedTaskIds.has(t.id)
      const effectiveStatus = isArchived ? "archived" : t.status
      if (!statusFilter.includes(effectiveStatus)) return false
    }
    if (participantFilter.length > 0 && !participantFilter.includes(t.client)) return false
    if (assigneeFilter.length > 0 && !assigneeFilter.includes(t.assignee)) return false
    if (chargeFilter.length > 0 && !chargeFilter.includes(t.chargeType)) return false
    if (dateFilter.length > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const taskDate = t.dueDate ? new Date(t.dueDate + "T00:00:00") : null
      if (taskDate) taskDate.setHours(0, 0, 0, 0)
      const dayMs = 86400000
      const matchesAny = dateFilter.some((df) => {
        if (df === "today") return taskDate && taskDate.getTime() === today.getTime()
        if (df === "tomorrow") return taskDate && taskDate.getTime() === today.getTime() + dayMs
        if (df === "this-week") {
          if (!taskDate) return false
          const dayOfWeek = today.getDay()
          const startOfWeek = new Date(today.getTime() - ((dayOfWeek === 0 ? 6 : dayOfWeek - 1) * dayMs))
          const endOfWeek = new Date(startOfWeek.getTime() + 6 * dayMs)
          return taskDate >= startOfWeek && taskDate <= endOfWeek
        }
        if (df === "overdue") return taskDate && taskDate.getTime() < today.getTime()
        if (df === "no-date") return !t.dueDate
        return false
      })
      if (!matchesAny) return false
    }
    return true
  })

  const thisWeekTasks = filtered.filter((t) => t.status !== "done")
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })
  const completedTasks = filtered.filter((t) => t.status === "done" && !invoicedTaskIds.has(t.id))
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return b.dueDate.localeCompare(a.dueDate)
    })
  const archivedTasks = filtered.filter((t) => t.status === "done" && invoicedTaskIds.has(t.id))
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return b.dueDate.localeCompare(a.dueDate)
    })

  const taskCount = filtered.length

  const [showThisWeek, setShowThisWeek] = useState(true)
  const [showPrevious, setShowPrevious] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("tasks-show-completed") === "true"
  })
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    localStorage.setItem("tasks-show-completed", String(showPrevious))
  }, [showPrevious])

  const [pageSize, setPageSize] = useState(10)
  const [uncompletedVisible, setUncompletedVisible] = useState(10)
  const [completedVisible, setCompletedVisible] = useState(10)
  const [archivedVisible, setArchivedVisible] = useState(10)
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false)
  const pageSizeBtnRef = useRef<HTMLButtonElement>(null)

  const isColVisible = (key: string) => visibleTaskColumnKeys.includes(key)

  const renderTaskRow = (task: Task) => {
    const dateStr = formatRowDate(task.dueDate)
    const clientInitials = task.client ? task.client.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : ""
    const assigneeInitials = task.assignee ? task.assignee.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : ""
    const isSelected = selectedTaskIds.has(task.id)
    return (
      <div
        key={task.id}
        className="group grid cursor-pointer items-center border-b border-[#f0f0f0] px-[24px] transition-colors hover:bg-[#fafafa]"
        style={{ gridTemplateColumns: taskGridTemplate }}
        onClick={() => setSelectedTaskId(task.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") setSelectedTaskId(task.id) }}
      >
        <div className="flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleComplete(task.id) }}
            className={`flex h-[18px] w-[18px] items-center justify-center rounded border-[1.5px] transition-colors ${
              task.status === "done"
                ? "border-[#2563EB] bg-[#2563EB] text-white"
                : isSelected
                  ? "border-[#bbb] bg-[#ededed] text-[#999]"
                  : "border-[#ccc] hover:border-[#999]"
            }`}
            tabIndex={0}
            aria-label={task.status === "done" ? "Mark as incomplete" : "Mark as complete"}
          >
            {(task.status === "done" || isSelected) && <span className="text-[9px]">✓</span>}
          </button>
        </div>
        {isColVisible("date") && (
          <div className="py-[12px] text-[13px] text-[#888]">
            {dateStr || <span className="text-[#ccc]">—</span>}
          </div>
        )}
        {isColVisible("participant") && (
          <div className="flex items-center justify-center py-[12px]">
            {clientInitials ? (
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-blue-100 text-[10px] font-bold text-blue-600">{clientInitials}</span>
            ) : <span className="text-[12px] text-[#ccc]">—</span>}
          </div>
        )}
        <div className="truncate py-[12px] pl-[8px]">
          <span className={`text-[13px] ${isInvoicingMode ? "text-[#262626]" : task.status === "done" ? "text-[#bbb] line-through" : "text-[#262626]"}`}>
            {task.title}
          </span>
        </div>
        {isColVisible("assignee") && (
          <div className="flex items-center justify-center py-[12px]">
            {assigneeInitials ? (
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[#f0f0f0] text-[10px] font-bold text-[#555]">{assigneeInitials}</span>
            ) : <span className="text-[12px] text-[#ccc]">—</span>}
          </div>
        )}
        {isColVisible("charge") && (
          <div className="flex items-center justify-center py-[12px] text-[12px] font-medium text-[#888]">
            <span className="truncate text-center">
              {task.chargeType ? chargeCode(task.chargeType) : <span className="text-[#ccc]">—</span>}
            </span>
          </div>
        )}
        {isColVisible("time") && (
          <div className="flex items-center justify-center py-[12px] text-[13px] text-[#888]">
            {task.timeSpent > 0 ? task.timeSpent : <span className="text-[#ccc]">—</span>}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) return <PageLoader label="Loading tasks…" />
  if (fetchError) return <PageError message="Failed to load tasks" onRetry={refetch} />

  return (
    <div className="flex h-full flex-col">
      {/* View tabs */}
      <div className="flex h-[44px] shrink-0 items-center justify-between gap-[8px] border-b border-[#f0f0f0] px-[16px]">
        <div className="flex min-w-0 flex-1 items-center gap-[8px] overflow-x-auto">
          <span className="text-[13px] font-medium text-[#262626]">
            {isInvoicingMode ? "Invoicing" : "Tasks"}
          </span>
          <div className="h-[16px] w-px bg-[#e5e5e5]" />
          <button
            onClick={handleSelectAllTaskView}
            className={`flex items-center gap-[6px] rounded-[4px] border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${activeTaskViewId === null ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-transparent text-[#888] hover:bg-[#f5f5f5] hover:text-[#262626]"}`}
            tabIndex={0}
          >
            <Table2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
            <span>All</span>
          </button>
          {taskSavedViews.length > 0 && <div className="h-[16px] w-px bg-[#dcdcdc]" />}
          {taskSavedViews.map((view) => (
            <button
              key={view.id}
              onClick={() => handleSelectTaskView(view)}
              onContextMenu={(e) => {
                e.preventDefault()
                setTaskViewContextMenu({ viewId: view.id, x: e.clientX, y: e.clientY })
              }}
              className={`flex items-center gap-[6px] rounded-[4px] border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${activeTaskViewId === view.id ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-transparent text-[#888] hover:bg-[#f5f5f5] hover:text-[#262626]"}`}
              tabIndex={0}
            >
              <Table2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
              <span>{view.name}</span>
            </button>
          ))}
          <button
            onClick={() => { setIsCreateTaskViewOpen(true); setTimeout(() => taskViewNameInputRef.current?.focus(), 50) }}
            className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#999] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            aria-label="Add view"
            tabIndex={0}
          >
            <Plus className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex items-center gap-[8px]">
          {viewMode === "week" && (
            <div className="flex items-center gap-[6px]">
              <button
                onClick={() => setWeekOffset((p) => p - 1)}
                className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Previous week"
              >
                <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={1.75} />
              </button>
              <span className="min-w-[160px] text-center text-[13px] font-semibold text-[#262626]">{formatWeekLabel()}</span>
              <button
                onClick={() => setWeekOffset((p) => p + 1)}
                className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Next week"
              >
                <ChevronRight className="h-[14px] w-[14px]" strokeWidth={1.75} />
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                disabled={weekOffset === 0}
                className={`flex items-center gap-[5px] rounded border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${weekOffset === 0 ? "border-[#e8e8e8] bg-white text-[#ccc] cursor-default" : "border-[#dcdcdc] bg-white text-[#262626] hover:bg-[#f5f5f5]"}`}
                tabIndex={0}
              >
                This week
              </button>
            </div>
          )}
          {!isInvoicingMode && (
            <div className="relative">
              <button
                ref={createBtnRef}
                onClick={() => { if (isQuickAdding) { resetQuickAdd() } else { setIsQuickAdding(true); setQuickActiveField("title"); setTimeout(() => quickInputRef.current?.focus(), 0) } }}
                className="primary-btn flex items-center gap-[5px] rounded-[4px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
                tabIndex={0}
              >
                <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                <span className="hidden sm:inline">Add new</span>
              </button>

          {isQuickAdding && (
            <>
              <div className="fixed inset-0 z-[48]" onClick={resetQuickAdd} />
              <div className="absolute right-0 top-full z-[49] mt-[6px] w-[520px] rounded-lg border border-[#e0e0e0] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="px-[16px] pt-[14px]">
                  <input
                    ref={quickInputRef}
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    onFocus={() => setQuickActiveField("title")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && quickTitle.trim()) { e.preventDefault(); setQuickActiveField("participant"); quickClientInputRef.current?.focus() }
                      if (e.key === "Escape") resetQuickAdd()
                    }}
                    placeholder="Task name..."
                    className="w-full text-[15px] font-medium text-[#262626] placeholder-[#bbb] outline-none"
                    autoFocus
                  />
                </div>

                <div className="flex flex-wrap items-center gap-[6px] px-[16px] pb-[12px] pt-[12px]">
                  <div className="relative">
                    {(() => {
                      const filteredClients = quickClientSearch
                        ? clientNames.filter((n) => n.toLowerCase().includes(quickClientSearch.toLowerCase()))
                        : clientNames
                      const selectClient = (name: string) => {
                        setQuickClient(name)
                        setIsQuickClientOpen(false)
                        setQuickClientIdx(-1)
                        setQuickClientSearch("")
                        const matched = clients.find((c) => c.name === name || c.displayName === name)
                        if (matched?.owner && !quickAssignee) setQuickAssignee(matched.owner)
                        setQuickActiveField("charge")
                        setTimeout(() => quickChargeInputRef.current?.focus(), 50)
                      }
                      return (
                        <>
                          <div
                            className={`flex items-center gap-[5px] rounded border px-[8px] py-[3px] transition-colors ${quickActiveField === "participant" ? "border-blue-400" : "border-[#e0e0e0]"}`}
                          >
                            <Building2 className={`h-[12px] w-[12px] shrink-0 ${quickClient ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                            <input
                              ref={quickClientInputRef}
                              type="text"
                              value={isQuickClientOpen ? quickClientSearch : quickClient}
                              onChange={(e) => { setQuickClientSearch(e.target.value); if (!isQuickClientOpen) setIsQuickClientOpen(true); setQuickClientIdx(0) }}
                              onFocus={() => { setQuickActiveField("participant"); setIsQuickClientOpen(true); setQuickClientSearch(""); setQuickClientIdx(0) }}
                              onKeyDown={(e) => {
                                if (isQuickClientOpen) {
                                  const totalItems = filteredClients.length
                                  if (e.key === "ArrowDown") { e.preventDefault(); setQuickClientIdx((p) => (p + 1) % Math.max(totalItems, 1)) }
                                  else if (e.key === "ArrowUp") { e.preventDefault(); setQuickClientIdx((p) => (p - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1)) }
                                  else if (e.key === "Enter") {
                                    e.preventDefault()
                                    if (filteredClients.length > 0) {
                                      const idx = quickClientIdx >= 0 && quickClientIdx < filteredClients.length ? quickClientIdx : 0
                                      selectClient(filteredClients[idx])
                                    } else {
                                      selectClient("")
                                    }
                                  } else if (e.key === "Tab" && !e.shiftKey) {
                                    e.preventDefault()
                                    if (filteredClients.length > 0) {
                                      const idx = quickClientIdx >= 0 && quickClientIdx < filteredClients.length ? quickClientIdx : 0
                                      selectClient(filteredClients[idx])
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
                              <div ref={quickClientListRef} className="absolute left-0 top-full z-[60] mt-[4px] max-h-[200px] w-[220px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                                {filteredClients.length === 0 ? (
                                  <div className="px-[12px] py-[7px] text-[12px] font-medium text-[#888]">No matches</div>
                                ) : (
                                  filteredClients.map((name, i) => {
                                    const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                                    const isHighlighted = quickClientIdx === i
                                    return (
                                      <div
                                        key={name}
                                        onClick={() => selectClient(name)}
                                        className={`flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${isHighlighted ? "bg-blue-50" : ""}`}
                                        role="option"
                                        aria-selected={isHighlighted}
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
                  </div>

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
                          <div
                            className={`flex items-center gap-[5px] rounded border px-[8px] py-[3px] transition-colors ${quickActiveField === "charge" ? "border-blue-400" : "border-[#e0e0e0]"}`}
                          >
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
                                  if (e.key === "ArrowDown") { e.preventDefault(); setQuickChargeIdx((p) => (p + 1) % Math.max(total, 1)) }
                                  else if (e.key === "ArrowUp") { e.preventDefault(); setQuickChargeIdx((p) => (p - 1 + Math.max(total, 1)) % Math.max(total, 1)) }
                                  else if (e.key === "Enter") {
                                    e.preventDefault()
                                    if (filteredCharges.length > 0) {
                                      const idx = quickChargeIdx >= 0 && quickChargeIdx < filteredCharges.length ? quickChargeIdx : 0
                                      selectCharge(filteredCharges[idx].value)
                                    } else {
                                      selectCharge("")
                                    }
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
          </div>
          )}
        </div>
      </div>

          {/* Filter & display bar */}
          <div className="flex h-[41px] shrink-0 items-center gap-[8px] overflow-x-auto border-b border-[#dcdcdc] px-[16px]">
            <div className="relative">
              <button
                ref={filterBtnRef}
                onClick={() => { setIsFilterMenuOpen(!isFilterMenuOpen); setActiveFilterDropdown(null) }}
                className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                tabIndex={0}
              >
                <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
                <span>Filter</span>
              </button>
              {isFilterMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[55]" onClick={() => setIsFilterMenuOpen(false)} />
                  <div
                    className="fixed z-[60] w-[180px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                    style={{
                      top: (filterBtnRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                      left: filterBtnRef.current?.getBoundingClientRect().left ?? 0,
                    }}
                  >
                    <p className="px-[16px] py-[6px] text-[11px] font-medium text-[#888]">Filter by</p>
                    {[
                      { key: "status", label: "Status", icon: CheckSquare },
                      { key: "date", label: "Date", icon: CalendarDays },
                      { key: "participant", label: "Client", icon: Building2 },
                      { key: "assignee", label: "Assignee", icon: User },
                      { key: "charge", label: "Charge", icon: Tag },
                    ].map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.key}
                          onClick={() => { setActiveFilterDropdown(item.key); setIsFilterMenuOpen(false) }}
                          className="flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                          tabIndex={0}
                        >
                          <Icon className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <CheckSquare className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>{(() => { const incomplete = filtered.filter((t) => t.status !== "done"); return incomplete.length > 0 && incomplete.every((t) => selectedTaskIds.has(t.id)) ? "Deselect all" : "Select all" })()}</span>
            </button>
            {statusFilter.length > 0 && (
              <div className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626]">
                <CheckSquare className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                <button ref={(el) => { filterPillRefs.current["status"] = el }} onClick={() => setActiveFilterDropdown(activeFilterDropdown === "status" ? null : "status")} className="hover:underline" tabIndex={0}>Status</button>
                <span className="text-[#888]">is</span>
                <span>{statusFilter.length} {statusFilter.length === 1 ? "value" : "values"}</span>
                <button onClick={() => setStatusFilter([])} className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded text-[#888] transition-colors hover:text-[#262626]" tabIndex={0} aria-label="Clear status filter"><X className="h-[12px] w-[12px]" strokeWidth={1.5} /></button>
              </div>
            )}
            {dateFilter.length > 0 && (
              <div className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626]">
                <CalendarDays className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                <button ref={(el) => { filterPillRefs.current["date"] = el }} onClick={() => setActiveFilterDropdown(activeFilterDropdown === "date" ? null : "date")} className="hover:underline" tabIndex={0}>Date</button>
                <span className="text-[#888]">is</span>
                <span>{dateFilter.length} {dateFilter.length === 1 ? "value" : "values"}</span>
                <button onClick={() => setDateFilter([])} className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded text-[#888] transition-colors hover:text-[#262626]" tabIndex={0} aria-label="Clear date filter"><X className="h-[12px] w-[12px]" strokeWidth={1.5} /></button>
              </div>
            )}
            {participantFilter.length > 0 && (
              <div className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626]">
                <Building2 className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                <button ref={(el) => { filterPillRefs.current["participant"] = el }} onClick={() => setActiveFilterDropdown(activeFilterDropdown === "participant" ? null : "participant")} className="hover:underline" tabIndex={0}>Client</button>
                <span className="text-[#888]">is</span>
                <span>{participantFilter.length} {participantFilter.length === 1 ? "value" : "values"}</span>
                <button onClick={() => setParticipantFilter([])} className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded text-[#888] transition-colors hover:text-[#262626]" tabIndex={0} aria-label="Clear client filter"><X className="h-[12px] w-[12px]" strokeWidth={1.5} /></button>
              </div>
            )}
            {assigneeFilter.length > 0 && (
              <div className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626]">
                <User className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                <button ref={(el) => { filterPillRefs.current["assignee"] = el }} onClick={() => setActiveFilterDropdown(activeFilterDropdown === "assignee" ? null : "assignee")} className="hover:underline" tabIndex={0}>Assignee</button>
                <span className="text-[#888]">is</span>
                <span>{assigneeFilter.length} {assigneeFilter.length === 1 ? "value" : "values"}</span>
                <button onClick={() => setAssigneeFilter([])} className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded text-[#888] transition-colors hover:text-[#262626]" tabIndex={0} aria-label="Clear assignee filter"><X className="h-[12px] w-[12px]" strokeWidth={1.5} /></button>
              </div>
            )}
            {chargeFilter.length > 0 && (
              <div className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626]">
                <Tag className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                <button ref={(el) => { filterPillRefs.current["charge"] = el }} onClick={() => setActiveFilterDropdown(activeFilterDropdown === "charge" ? null : "charge")} className="hover:underline" tabIndex={0}>Charge</button>
                <span className="text-[#888]">is</span>
                <span>{chargeFilter.length} {chargeFilter.length === 1 ? "value" : "values"}</span>
                <button onClick={() => setChargeFilter([])} className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded text-[#888] transition-colors hover:text-[#262626]" tabIndex={0} aria-label="Clear charge filter"><X className="h-[12px] w-[12px]" strokeWidth={1.5} /></button>
              </div>
            )}
            <div className="relative ml-auto">
              <button
                ref={pageSizeBtnRef}
                onClick={() => setIsPageSizeOpen(!isPageSizeOpen)}
                className="flex items-center gap-[5px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                tabIndex={0}
              >
                <span>{pageSize} per page</span>
                <ChevronDown className="h-[11px] w-[11px] text-[#888]" strokeWidth={1.5} />
              </button>
              {isPageSizeOpen && (
                <>
                  <div className="fixed inset-0 z-[55]" onClick={() => setIsPageSizeOpen(false)} />
                  <div
                    className="fixed z-[60] w-[120px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                    style={{
                      top: (pageSizeBtnRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                      left: (pageSizeBtnRef.current?.getBoundingClientRect().right ?? 120) - 120,
                    }}
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <button
                        key={n}
                        onClick={() => { setPageSize(n); setUncompletedVisible(n); setCompletedVisible(n); setIsPageSizeOpen(false) }}
                        className={`flex w-full items-center px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${pageSize === n ? "bg-[#f5f5f5] text-[#262626]" : "text-[#262626]"}`}
                        tabIndex={0}
                      >
                        {n} per page
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              ref={taskDisplayBtnRef}
              onClick={() => setIsTaskDisplayOpen(!isTaskDisplayOpen)}
              className="flex items-center gap-[5px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <SlidersHorizontal className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span className="hidden sm:inline">Display</span>
            </button>
            {isTaskDisplayOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsTaskDisplayOpen(false)} />
                <div
                  className="fixed z-50 w-[420px] rounded-lg border border-[#dcdcdc] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                  style={(() => {
                    const rect = taskDisplayBtnRef.current?.getBoundingClientRect()
                    if (!rect) return {}
                    return { top: rect.bottom + 4, right: window.innerWidth - rect.right }
                  })()}
                >
                  <div className="max-h-[520px] overflow-y-auto">
                    <div className="px-[20px] pb-[16px] pt-[16px]">
                      <div className="flex gap-[10px]">
                        {([
                          { key: "list" as const, label: "List", Icon: Table2 },
                          { key: "week" as const, label: "Week", Icon: CalendarDays },
                        ]).map(({ key, label, Icon }) => {
                          const isActive = viewMode === key
                          return (
                            <button
                              key={key}
                              onClick={() => { setViewMode(key); if (key === "list") setWeekOffset(0) }}
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
                    <div className="px-[20px] pb-[16px] pt-[14px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-[#888]">Show completed</span>
                        <Switch
                          checked={showPrevious}
                          onChange={() => setShowPrevious((prev) => !prev)}
                          ariaLabel="Show completed toggle"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-[20px] border-t border-[#f0f0f0] px-[20px] py-[12px]">
                    <button
                      onClick={handleResetDisplay}
                      className="text-[13px] font-medium text-[#bbb] transition-colors hover:text-[#262626]"
                      tabIndex={0}
                    >
                      Reset
                    </button>
                    <button
                      className="text-[13px] font-medium text-[#bbb] transition-colors hover:text-[#262626]"
                      tabIndex={0}
                    >
                      Save default for everyone
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Filter value dropdowns */}
          {activeFilterDropdown && (
            <>
              <div className="fixed inset-0 z-[55]" onClick={() => setActiveFilterDropdown(null)} />
              {(() => {
                const anchor = filterPillRefs.current[activeFilterDropdown] || filterBtnRef.current
                const rect = anchor?.getBoundingClientRect()
                if (!rect) return null
                const dropdownStyle = { top: rect.bottom + 4, left: rect.left, minWidth: 200 }

                if (activeFilterDropdown === "status") {
                  const statusOptions = [
                    { key: "todo", label: "Uncompleted" },
                    { key: "done", label: "Completed" },
                    { key: "archived", label: "Archived" },
                  ]
                  return (
                    <div className="fixed z-[60] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]" style={dropdownStyle}>
                      <button onClick={() => { setActiveFilterDropdown(null); setIsFilterMenuOpen(true) }} className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
                        <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
                        <span>Back</span>
                      </button>
                      <p className="px-[16px] py-[4px] text-[11px] font-medium text-[#888]">Filter by status</p>
                      {statusOptions.map((opt) => {
                        const isActive = statusFilter.includes(opt.key)
                        return (
                          <button key={opt.key} onClick={() => setStatusFilter((prev) => isActive ? prev.filter((f) => f !== opt.key) : [...prev, opt.key])} className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-[#f5f5f5]" : ""}`} tabIndex={0}>
                            <div className={`flex h-[16px] w-[16px] items-center justify-center rounded border ${isActive ? "border-[#2563EB] bg-[#2563EB]" : "border-[#d0d0d0]"}`}>
                              {isActive && <span className="text-[10px] text-white">✓</span>}
                            </div>
                            <span className="text-[#262626]">{opt.label}</span>
                          </button>
                        )
                      })}
                      <div className="border-t border-[#f0f0f0] px-[8px] py-[4px]">
                        <button onClick={() => { setStatusFilter([]); setActiveFilterDropdown(null) }} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>Clear</button>
                      </div>
                    </div>
                  )
                }

                if (activeFilterDropdown === "date") {
                  const dateOptions = [
                    { key: "today", label: "Today" },
                    { key: "tomorrow", label: "Tomorrow" },
                    { key: "this-week", label: "This week" },
                    { key: "overdue", label: "Overdue" },
                    { key: "no-date", label: "No date" },
                  ]
                  return (
                    <div className="fixed z-[60] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]" style={dropdownStyle}>
                      <button onClick={() => { setActiveFilterDropdown(null); setIsFilterMenuOpen(true) }} className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
                        <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
                        <span>Back</span>
                      </button>
                      <p className="px-[16px] py-[4px] text-[11px] font-medium text-[#888]">Filter by date</p>
                      {dateOptions.map((opt) => {
                        const isActive = dateFilter.includes(opt.key)
                        return (
                          <button key={opt.key} onClick={() => setDateFilter((prev) => isActive ? prev.filter((f) => f !== opt.key) : [...prev, opt.key])} className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-[#f5f5f5]" : ""}`} tabIndex={0}>
                            <div className={`flex h-[16px] w-[16px] items-center justify-center rounded border ${isActive ? "border-[#2563EB] bg-[#2563EB]" : "border-[#d0d0d0]"}`}>
                              {isActive && <span className="text-[10px] text-white">✓</span>}
                            </div>
                            <span className="text-[#262626]">{opt.label}</span>
                          </button>
                        )
                      })}
                      <div className="border-t border-[#f0f0f0] px-[8px] py-[4px]">
                        <button onClick={() => { setDateFilter([]); setActiveFilterDropdown(null) }} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>Clear</button>
                      </div>
                    </div>
                  )
                }

                if (activeFilterDropdown === "participant") return (
                  <div className="fixed z-[60] max-h-[280px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]" style={dropdownStyle}>
                    <button onClick={() => { setActiveFilterDropdown(null); setIsFilterMenuOpen(true) }} className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
                      <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
                      <span>Back</span>
                    </button>
                    <p className="px-[16px] py-[4px] text-[11px] font-medium text-[#888]">Filter by client</p>
                    {uniqueParticipants.map((name) => {
                      const isActive = participantFilter.includes(name)
                      return (
                        <button key={name} onClick={() => setParticipantFilter((prev) => isActive ? prev.filter((f) => f !== name) : [...prev, name])} className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-[#f5f5f5]" : ""}`} tabIndex={0}>
                          <div className={`flex h-[16px] w-[16px] items-center justify-center rounded border ${isActive ? "border-[#2563EB] bg-[#2563EB]" : "border-[#d0d0d0]"}`}>
                            {isActive && <span className="text-[10px] text-white">✓</span>}
                          </div>
                          <span className="text-[#262626]">{name}</span>
                        </button>
                      )
                    })}
                    {uniqueParticipants.length === 0 && <p className="px-[16px] py-[8px] text-[13px] text-[#888]">No clients</p>}
                    <div className="border-t border-[#f0f0f0] px-[8px] py-[4px]">
                      <button onClick={() => { setParticipantFilter([]); setActiveFilterDropdown(null) }} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>Clear</button>
                    </div>
                  </div>
                )

                if (activeFilterDropdown === "assignee") return (
                  <div className="fixed z-[60] max-h-[280px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]" style={dropdownStyle}>
                    <button onClick={() => { setActiveFilterDropdown(null); setIsFilterMenuOpen(true) }} className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
                      <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
                      <span>Back</span>
                    </button>
                    <p className="px-[16px] py-[4px] text-[11px] font-medium text-[#888]">Filter by assignee</p>
                    {uniqueAssignees.map((name) => {
                      const isActive = assigneeFilter.includes(name)
                      return (
                        <button key={name} onClick={() => setAssigneeFilter((prev) => isActive ? prev.filter((f) => f !== name) : [...prev, name])} className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-[#f5f5f5]" : ""}`} tabIndex={0}>
                          <div className={`flex h-[16px] w-[16px] items-center justify-center rounded border ${isActive ? "border-[#2563EB] bg-[#2563EB]" : "border-[#d0d0d0]"}`}>
                            {isActive && <span className="text-[10px] text-white">✓</span>}
                          </div>
                          <span className="text-[#262626]">{name}</span>
                        </button>
                      )
                    })}
                    {uniqueAssignees.length === 0 && <p className="px-[16px] py-[8px] text-[13px] text-[#888]">No assignees</p>}
                    <div className="border-t border-[#f0f0f0] px-[8px] py-[4px]">
                      <button onClick={() => { setAssigneeFilter([]); setActiveFilterDropdown(null) }} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>Clear</button>
                    </div>
                  </div>
                )

                if (activeFilterDropdown === "charge") return (
                  <div className="fixed z-[60] max-h-[280px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]" style={dropdownStyle}>
                    <button onClick={() => { setActiveFilterDropdown(null); setIsFilterMenuOpen(true) }} className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
                      <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
                      <span>Back</span>
                    </button>
                    <p className="px-[16px] py-[4px] text-[11px] font-medium text-[#888]">Filter by charge</p>
                    {uniqueCharges.map((val) => {
                      const isActive = chargeFilter.includes(val)
                      return (
                        <button key={val} onClick={() => setChargeFilter((prev) => isActive ? prev.filter((f) => f !== val) : [...prev, val])} className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-[#f5f5f5]" : ""}`} tabIndex={0}>
                          <div className={`flex h-[16px] w-[16px] items-center justify-center rounded border ${isActive ? "border-[#2563EB] bg-[#2563EB]" : "border-[#d0d0d0]"}`}>
                            {isActive && <span className="text-[10px] text-white">✓</span>}
                          </div>
                          <span className="text-[#262626]">{chargeLabel(val)}</span>
                        </button>
                      )
                    })}
                    {uniqueCharges.length === 0 && <p className="px-[16px] py-[8px] text-[13px] text-[#888]">No charges</p>}
                    <div className="border-t border-[#f0f0f0] px-[8px] py-[4px]">
                      <button onClick={() => { setChargeFilter([]); setActiveFilterDropdown(null) }} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>Clear</button>
                    </div>
                  </div>
                )

                return null
              })()}
            </>
          )}

          {/* Column headers + task list share same scrollable container for alignment */}
          <div className="flex-1 overflow-auto bg-[#fafafa]">
            <div className="sticky top-0 z-[1] grid items-center border-b border-[#e0e0e0] bg-[#fafafa] px-[24px]" style={{ gridTemplateColumns: taskGridTemplate }}>
              {visibleTaskColumns.map((col) => {
                const Icon = col.icon
                return (
                  <div key={col.key} className={`flex items-center py-[9px] ${col.key === "title" ? "pl-[8px]" : "justify-center"}`}>
                    <Icon className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} />
                  </div>
                )
              })}
            </div>

            {viewMode === "list" ? (
              isInvoicingMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowPrevious(!showPrevious)}
                    className="flex w-full items-center gap-[4px] border-b border-[#e8e8e8] bg-[#fafafa] px-[12px] py-[6px] text-left"
                    tabIndex={0}
                  >
                    <ChevronDown className={`h-[12px] w-[12px] text-[#888] transition-transform ${showPrevious ? "" : "-rotate-90"}`} strokeWidth={2} />
                    <span className="text-[13px] font-semibold text-[#262626]">Ready to invoice</span>
                    <span className="ml-[2px] text-[12px] font-medium text-[#ccc]">({completedTasks.length})</span>
                  </button>
                  {showPrevious && (
                    <>
                      {completedTasks.slice(0, completedVisible).map(renderTaskRow)}
                      {completedTasks.length > completedVisible && (
                        <button
                          type="button"
                          onClick={() => setCompletedVisible((prev) => prev + pageSize)}
                          className="flex w-full items-center justify-center gap-[6px] border-b border-[#f0f0f0] py-[10px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#fafafa] hover:text-[#262626]"
                          tabIndex={0}
                        >
                          Show more ({completedTasks.length - completedVisible} remaining)
                        </button>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowThisWeek(!showThisWeek)}
                    className="flex w-full items-center gap-[4px] border-b border-[#e8e8e8] bg-[#fafafa] px-[12px] py-[6px] text-left"
                    tabIndex={0}
                  >
                    <ChevronDown className={`h-[12px] w-[12px] text-[#888] transition-transform ${showThisWeek ? "" : "-rotate-90"}`} strokeWidth={2} />
                    <span className="text-[13px] font-semibold text-[#262626]">Uncompleted</span>
                  </button>

                  {showThisWeek && (
                    <>
                      {thisWeekTasks.slice(0, uncompletedVisible).map(renderTaskRow)}
                      {thisWeekTasks.length > uncompletedVisible && (
                        <button
                          type="button"
                          onClick={() => setUncompletedVisible((prev) => prev + pageSize)}
                          className="flex w-full items-center justify-center gap-[6px] border-b border-[#f0f0f0] py-[10px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#fafafa] hover:text-[#262626]"
                          tabIndex={0}
                        >
                          Show more ({thisWeekTasks.length - uncompletedVisible} remaining)
                        </button>
                      )}
                    </>
                  )}

                  {completedTasks.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowPrevious(!showPrevious)}
                        className="flex w-full items-center gap-[4px] border-b border-[#e8e8e8] bg-[#fafafa] px-[12px] py-[6px] text-left"
                        tabIndex={0}
                      >
                        <ChevronDown className={`h-[12px] w-[12px] text-[#888] transition-transform ${showPrevious ? "" : "-rotate-90"}`} strokeWidth={2} />
                        <span className="text-[13px] font-semibold text-[#999]">Completed</span>
                        <span className="ml-[2px] text-[12px] font-medium text-[#ccc]">({completedTasks.length})</span>
                      </button>
                      {showPrevious && (
                        <>
                          {completedTasks.slice(0, completedVisible).map(renderTaskRow)}
                          {completedTasks.length > completedVisible && (
                            <button
                              type="button"
                              onClick={() => setCompletedVisible((prev) => prev + pageSize)}
                              className="flex w-full items-center justify-center gap-[6px] border-b border-[#f0f0f0] py-[10px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#fafafa] hover:text-[#262626]"
                              tabIndex={0}
                            >
                              Show more ({completedTasks.length - completedVisible} remaining)
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {archivedTasks.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowArchived(!showArchived)}
                        className="flex w-full items-center gap-[4px] border-b border-[#e8e8e8] bg-[#fafafa] px-[12px] py-[6px] text-left"
                        tabIndex={0}
                      >
                        <ChevronDown className={`h-[12px] w-[12px] text-[#888] transition-transform ${showArchived ? "" : "-rotate-90"}`} strokeWidth={2} />
                        <span className="text-[13px] font-semibold text-[#999]">Archived</span>
                        <span className="ml-[2px] text-[12px] font-medium text-[#ccc]">({archivedTasks.length})</span>
                      </button>
                      {showArchived && (
                        <>
                          {archivedTasks.slice(0, archivedVisible).map(renderTaskRow)}
                          {archivedTasks.length > archivedVisible && (
                            <button
                              type="button"
                              onClick={() => setArchivedVisible((prev) => prev + pageSize)}
                              className="flex w-full items-center justify-center gap-[6px] border-b border-[#f0f0f0] py-[10px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#fafafa] hover:text-[#262626]"
                              tabIndex={0}
                            >
                              Show more ({archivedTasks.length - archivedVisible} remaining)
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              )
            ) : (
              /* Week view — tasks grouped by day */
              (() => {
                const weekTasks = filtered.filter((t) => {
                  if (!t.dueDate) return false
                  const d = new Date(t.dueDate + "T00:00:00")
                  return d >= weekStart && d <= weekEnd
                }).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))

                const noDateTasks = filtered.filter((t) => !t.dueDate)

                const dayBuckets: Record<string, Task[]> = {}
                for (let i = 0; i < 7; i++) {
                  const d = new Date(weekStart)
                  d.setDate(weekStart.getDate() + i)
                  dayBuckets[toDateStr(d)] = []
                }
                weekTasks.forEach((t) => { if (t.dueDate && dayBuckets[t.dueDate]) dayBuckets[t.dueDate].push(t) })

                const todayStr = toDateStr(new Date())

                return (
                  <>
                    {Object.entries(dayBuckets).map(([dateStr, dayTasks], idx) => {
                      const d = new Date(dateStr + "T00:00:00")
                      const dayLabel = weekDayNames[idx]
                      const dateLabel = d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
                      const isToday = dateStr === todayStr
                      const completed = dayTasks.filter((t) => t.status === "done").length

                      return (
                        <div key={dateStr}>
                          <div className={`flex items-center gap-[8px] border-b border-[#e8e8e8] px-[12px] py-[6px] ${isToday ? "bg-blue-50/60" : "bg-[#fafafa]"}`}>
                            <span className={`text-[13px] font-semibold ${isToday ? "text-blue-600" : "text-[#262626]"}`}>
                              {dayLabel}
                            </span>
                            <span className={`text-[12px] font-medium ${isToday ? "text-blue-400" : "text-[#999]"}`}>
                              {dateLabel}
                            </span>
                            {dayTasks.length > 0 && (
                              <span className="text-[11px] font-medium text-[#bbb]">
                                {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                                {!isInvoicingMode && completed > 0 && ` · ${completed} done`}
                              </span>
                            )}
                          </div>
                          {dayTasks.length > 0 && dayTasks.map(renderTaskRow)}
                        </div>
                      )
                    })}
                    {noDateTasks.length > 0 && (
                      <div>
                        <div className="flex items-center gap-[8px] border-b border-[#e8e8e8] bg-[#fafafa] px-[12px] py-[6px]">
                          <span className="text-[13px] font-semibold text-[#999]">No date</span>
                          <span className="text-[11px] font-medium text-[#bbb]">
                            {noDateTasks.length} {noDateTasks.length === 1 ? "task" : "tasks"}
                          </span>
                        </div>
                        {noDateTasks.map(renderTaskRow)}
                      </div>
                    )}
                  </>
                )
              })()
            )}

            {hasMore && (
              <div className="flex justify-center py-[16px]">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="text-[13px] font-medium text-[#888] transition-colors hover:text-[#262626] disabled:opacity-50"
                  tabIndex={0}
                >
                  {isLoadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-[#999]">
              {viewMode === "week"
                ? (() => {
                    const weekTasks = filtered.filter((t) => {
                      if (!t.dueDate) return false
                      const d = new Date(t.dueDate + "T00:00:00")
                      return d >= weekStart && d <= weekEnd
                    })
                    const noDate = filtered.filter((t) => !t.dueDate)
                    const total = weekTasks.length + noDate.length
                    if (isInvoicingMode) return `${total} ${total === 1 ? "task" : "tasks"} ready to invoice`
                    const done = weekTasks.filter((t) => t.status === "done").length
                    return `${total} ${total === 1 ? "task" : "tasks"} this week${done > 0 ? ` · ${done} completed` : ""}`
                  })()
                : `${taskCount} ${taskCount === 1 ? "task" : "tasks"}${isInvoicingMode ? " ready to invoice" : ""}`
              }
            </span>
          </div>


      {selectedTask && selectedTaskId && (
        <TaskDetailModal
          selectedTask={selectedTask}
          selectedTaskId={selectedTaskId}
          tasks={tasks}
          onUpdateTask={handleUpdateTask}
          onLinkGoal={handleLinkGoal}
          onDeleteTask={handleDeleteTask}
          onClose={closeDetail}
          chargeTypes={chargeTypes}
          chargeLabel={chargeLabel}
          secondaryChargeLabel={secondaryChargeLabel}
          clientNames={clientNames}
          clients={clients}
          staffNames={staffNames}
          canAssignTasks={canAssignTasks}
          enabledCharges={enabledCharges}
        />
      )}

      {isCreateTaskViewOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20" onClick={() => { setIsCreateTaskViewOpen(false); setNewTaskViewName("") }} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#262626]">
                {isInvoicingMode ? "Create a view for invoicing" : "Create a view for tasks"}
              </h3>
              <button
                onClick={() => { setIsCreateTaskViewOpen(false); setNewTaskViewName("") }}
                className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.75} />
              </button>
            </div>
            <div className="mt-[20px]">
              <label className="text-[13px] font-medium text-[#888]">Name</label>
              <input
                ref={taskViewNameInputRef}
                value={newTaskViewName}
                onChange={(e) => setNewTaskViewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateTaskView() }}
                placeholder="Enter name here"
                className="mt-[8px] w-full rounded-lg border border-[#dcdcdc] bg-[#fafafa] px-[12px] py-[10px] text-[13px] font-medium text-[#262626] outline-none transition-colors placeholder:text-[#bbb] focus:border-[#a3c4f3]"
              />
            </div>
            <div className="mt-[20px] flex items-center justify-end gap-[12px]">
              <button
                onClick={() => { setIsCreateTaskViewOpen(false); setNewTaskViewName("") }}
                className="px-[12px] py-[6px] text-[13px] font-medium text-[#262626] transition-colors hover:text-[#888]"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTaskView}
                disabled={!newTaskViewName.trim()}
                className={`rounded-[4px] px-[16px] py-[6px] text-[13px] font-medium transition-colors ${newTaskViewName.trim() ? "primary-btn" : "border border-[#dcdcdc] text-[#bbb]"}`}
                tabIndex={0}
              >
                Create
              </button>
            </div>
          </div>
        </>
      )}

      {taskViewContextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setTaskViewContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setTaskViewContextMenu(null) }} />
          <div
            className="fixed z-50 w-[160px] overflow-hidden rounded-lg border border-[#dcdcdc] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            style={{ top: taskViewContextMenu.y, left: taskViewContextMenu.x }}
          >
            <button
              onClick={() => {
                const view = taskSavedViews.find((v) => v.id === taskViewContextMenu.viewId)
                if (view) setDeleteTaskViewConfirm(view)
                setTaskViewContextMenu(null)
              }}
              className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
              tabIndex={0}
            >
              <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
              Delete view
            </button>
          </div>
        </>
      )}

      {deleteTaskViewConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setDeleteTaskViewConfirm(null)} />
          <div className="relative z-10 w-[400px] rounded-lg bg-white p-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <h3 className="text-[15px] font-semibold text-[#262626]">Delete view</h3>
            <p className="mt-[8px] text-[13px] font-medium text-[#888]">
              Are you sure you want to delete <span className="text-[#262626]">&ldquo;{deleteTaskViewConfirm.name}&rdquo;</span>? This action cannot be undone.
            </p>
            <div className="mt-[20px] flex items-center justify-end gap-[12px]">
              <button
                onClick={() => setDeleteTaskViewConfirm(null)}
                className="px-[12px] py-[6px] text-[13px] font-medium text-[#262626] transition-colors hover:text-[#888]"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTaskView(deleteTaskViewConfirm.id)}
                className="rounded-[4px] bg-red-500 px-[16px] py-[6px] text-[13px] font-medium text-white transition-colors hover:bg-red-600"
                tabIndex={0}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTaskIds.size > 0 && (
        <div className="fixed bottom-[24px] left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-[12px] rounded-xl border border-[#e0e0e0] bg-white px-[20px] py-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <span className="text-[13px] font-semibold text-[#262626]">
              {selectedTaskIds.size} selected
            </span>
            <div className="h-[16px] w-px bg-[#e5e5e5]" />
            <button
              onClick={handleBulkMarkDone}
              className="flex items-center gap-[6px] rounded-lg px-[12px] py-[6px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <CheckSquare className="h-[14px] w-[14px] text-[#2563EB]" strokeWidth={1.75} />
              Mark done
            </button>
            <button
              onClick={() => setIsBulkDeleting(true)}
              className="flex items-center gap-[6px] rounded-lg px-[12px] py-[6px] text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50"
              tabIndex={0}
            >
              <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
              Delete
            </button>
            <div className="h-[16px] w-px bg-[#e5e5e5]" />
            <button
              onClick={() => setSelectedTaskIds(new Set())}
              className="flex items-center gap-[6px] rounded-lg px-[12px] py-[6px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
              tabIndex={0}
            >
              <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
              Clear
            </button>
          </div>
        </div>
      )}

      {isBulkDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setIsBulkDeleting(false)} />
          <div className="relative z-10 w-[400px] rounded-lg bg-white p-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <h3 className="text-[15px] font-semibold text-[#262626]">Delete tasks</h3>
            <p className="mt-[8px] text-[13px] font-medium text-[#888]">
              Are you sure you want to delete <span className="text-[#262626]">{selectedTaskIds.size} {selectedTaskIds.size === 1 ? "task" : "tasks"}</span>? This action cannot be undone.
            </p>
            <div className="mt-[20px] flex items-center justify-end gap-[12px]">
              <button
                onClick={() => setIsBulkDeleting(false)}
                className="px-[12px] py-[6px] text-[13px] font-medium text-[#262626] transition-colors hover:text-[#888]"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="rounded-[4px] bg-red-500 px-[16px] py-[6px] text-[13px] font-medium text-white transition-colors hover:bg-red-600"
                tabIndex={0}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Delete task"
        description="This action cannot be undone. The task and its data will be permanently removed."
        confirmLabel="Delete"
        onConfirm={confirmDeleteTask}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  )
}
