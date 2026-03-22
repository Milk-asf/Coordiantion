"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  SquareCheck,
  Table2,
  Plus,
  ListFilter,
  X,
  MoreHorizontal,
  SlidersHorizontal,
  CheckSquare,
  Circle,
  CalendarDays,
  Building2,
  Paperclip,
  FileText,
  Trash2,
  Clock,
  Tag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useClients } from "@/lib/hooks/use-clients"
import { useCharges } from "@/lib/hooks/use-charges"
import type { Task, Attachment } from "@/lib/types"

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(minutes: number): string {
  if (minutes === 0) return "0m"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function parseTimeInput(val: string): number {
  const hMatch = val.match(/(\d+)\s*h/)
  const mMatch = val.match(/(\d+)\s*m/)
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0
  const mins = mMatch ? parseInt(mMatch[1], 10) : 0
  if (hours === 0 && mins === 0) {
    const num = parseInt(val, 10)
    if (!isNaN(num)) return num
  }
  return hours * 60 + mins
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  "todo": { label: "To do", color: "#bbb", bg: "bg-[#f0f0f0]" },
  "in-progress": { label: "In progress", color: "#f59e0b", bg: "bg-amber-50" },
  "done": { label: "Done", color: "#22c55e", bg: "bg-green-50" },
}

const statusKeys = Object.keys(statusConfig) as Array<keyof typeof statusConfig>

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
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
}

function isThisWeekOrLater(dateStr: string | null): boolean {
  if (!dateStr) return true
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + "T00:00:00")
  d.setHours(0, 0, 0, 0)
  return d.getTime() >= today.getTime()
}

function DatePicker({ value, onChange, onClose }: { value: string; onChange: (val: string) => void; onClose: () => void }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const selected = value ? new Date(value + "T00:00:00") : null
  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : today.getMonth())

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  const handleSelect = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    onChange(dateStr)
    onClose()
  }

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-AU", { month: "long", year: "numeric" })
  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

  const quickDates = [
    { label: "Today", offset: 0 },
    { label: "Tomorrow", offset: 1 },
    { label: "Next week", offset: (8 - today.getDay()) % 7 || 7 },
  ]

  return (
    <div className="w-[260px] rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
      {/* Quick dates */}
      <div className="flex gap-[4px] border-b border-[#f0f0f0] px-[12px] py-[8px]">
        {quickDates.map((qd) => {
          const d = new Date(today)
          d.setDate(d.getDate() + qd.offset)
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          const isSelected = value === dateStr
          return (
            <button
              key={qd.label}
              type="button"
              onClick={() => { onChange(dateStr); onClose() }}
              className={`rounded px-[8px] py-[4px] text-[11px] font-medium transition-colors ${isSelected ? "bg-[#262626] text-white" : "text-[#555] hover:bg-[#f5f5f5]"}`}
              tabIndex={0}
            >
              {qd.label}
            </button>
          )
        })}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between px-[12px] py-[8px]">
        <button type="button" onClick={prevMonth} className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0} aria-label="Previous month">
          <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={1.5} />
        </button>
        <span className="text-[12px] font-semibold text-[#262626]">{monthLabel}</span>
        <button type="button" onClick={nextMonth} className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0} aria-label="Next month">
          <ChevronRight className="h-[14px] w-[14px]" strokeWidth={1.5} />
        </button>
      </div>

      {/* Day grid */}
      <div className="px-[12px] pb-[12px]">
        <div className="mb-[4px] grid grid-cols-7 gap-[2px]">
          {weekDays.map((wd) => (
            <div key={wd} className="flex h-[24px] items-center justify-center text-[10px] font-medium text-[#bbb]">{wd}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[2px]">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-[30px]" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const isToday = dateStr === todayStr
            const isSelected = dateStr === value
            return (
              <button
                key={day}
                type="button"
                onClick={() => handleSelect(day)}
                className={`flex h-[30px] w-full items-center justify-center rounded text-[12px] font-medium transition-colors ${
                  isSelected
                    ? "bg-[#262626] text-white"
                    : isToday
                      ? "bg-[#f0f0f0] text-[#262626] hover:bg-[#e5e5e5]"
                      : "text-[#555] hover:bg-[#f5f5f5]"
                }`}
                tabIndex={0}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      {/* Clear */}
      {value && (
        <div className="border-t border-[#f0f0f0] px-[12px] py-[6px]">
          <button
            type="button"
            onClick={() => { onChange(""); onClose() }}
            className="w-full rounded px-[8px] py-[4px] text-left text-[12px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            tabIndex={0}
          >
            Clear date
          </button>
        </div>
      )}
    </div>
  )
}

const defaultNewTask = { title: "", description: "", status: "todo" as Task["status"], assignee: "Sam Lee", client: "", dueDate: "" }

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function TasksPage() {
  const { tasks, addTask, updateTask: updateTaskDb, deleteTask: deleteTaskDb } = useTasks()
  const { clientNames } = useClients()
  const { enabledCharges, allCharges } = useCharges()
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({ ...defaultNewTask })
  const [newAttachments, setNewAttachments] = useState<Attachment[]>([])
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const statusPillRef = useRef<HTMLButtonElement>(null)
  const clientPillRef = useRef<HTMLButtonElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const detailStatusRef = useRef<HTMLButtonElement>(null)
  const detailClientRef = useRef<HTMLButtonElement>(null)
  const detailFileInputRef = useRef<HTMLInputElement>(null)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false)
  const statusFilterRef = useRef<HTMLButtonElement>(null)

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
  const quickInputRef = useRef<HTMLInputElement>(null)
  const quickTimeRef = useRef<HTMLInputElement>(null)
  const quickClientBtnRef = useRef<HTMLButtonElement>(null)
  const quickChargeBtnRef = useRef<HTMLButtonElement>(null)
  const quickClientListRef = useRef<HTMLDivElement>(null)
  const quickChargeListRef = useRef<HTMLDivElement>(null)

  const [modalClientIdx, setModalClientIdx] = useState(-1)
  const [detailClientIdx, setDetailClientIdx] = useState(-1)

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
    setIsQuickAdding(false)
    setIsQuickClientOpen(false)
    setIsQuickChargeOpen(false)
    setQuickClientIdx(-1)
    setQuickChargeIdx(-1)
    setQuickActiveField("title")
  }

  const handleQuickFinish = async () => {
    const title = quickTitle.trim()
    if (!title) return
    await addTask({
      title,
      description: "",
      status: "todo",
      assignee: "Sam Lee",
      client: quickClient,
      dueDate: quickDueDate || null,
      attachments: [],
      chargeType: quickCharge,
      timeSpent: quickTime ? parseTimeInput(quickTime) : 0,
    })
    setQuickTitle("")
    setQuickClient("")
    setQuickDueDate(getTodayStr())
    setQuickTime("")
    setQuickCharge("")
    setIsQuickClientOpen(false)
    setIsQuickChargeOpen(false)
    setQuickClientIdx(-1)
    setQuickChargeIdx(-1)
    setQuickActiveField("title")
    setTimeout(() => quickInputRef.current?.focus(), 0)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setActiveDropdown(null)
    setNewTask({ ...defaultNewTask })
    setNewAttachments([])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const added: Attachment[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
    }))
    setNewAttachments((prev) => [...prev, ...added])
    e.target.value = ""
  }

  const handleRemoveAttachment = (id: string) => {
    setNewAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return
    await addTask({
      title: newTask.title,
      description: newTask.description,
      status: newTask.status,
      assignee: newTask.assignee,
      client: newTask.client,
      dueDate: newTask.dueDate || null,
      attachments: newAttachments,
      chargeType: "",
      timeSpent: 0,
    })
    closeModal()
  }

  const handleToggleComplete = (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const newStatus = task.status === "done" ? "todo" : "done"
    updateTaskDb(id, { status: newStatus })
  }

  const handleDeleteTask = (id: string) => {
    deleteTaskDb(id)
    if (selectedTaskId === id) setSelectedTaskId(null)
  }

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null

  const handleUpdateTask = useCallback((field: keyof Task, value: string | Attachment[] | boolean | number) => {
    if (!selectedTaskId) return
    updateTaskDb(selectedTaskId, { [field]: value } as Partial<Task>)
  }, [selectedTaskId, updateTaskDb])

  const handleDetailFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTaskId || !e.target.files) return
    const task = tasks.find((t) => t.id === selectedTaskId)
    if (!task) return
    const added: Attachment[] = Array.from(e.target.files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
    }))
    updateTaskDb(selectedTaskId, { attachments: [...task.attachments, ...added] })
    e.target.value = ""
  }

  const handleDetailRemoveAttachment = (attachmentId: string) => {
    if (!selectedTaskId) return
    const task = tasks.find((t) => t.id === selectedTaskId)
    if (!task) return
    updateTaskDb(selectedTaskId, { attachments: task.attachments.filter((a) => a.id !== attachmentId) })
  }

  const closeDetail = () => {
    setSelectedTaskId(null)
    setActiveDropdown(null)
  }

  const filtered = statusFilter.length > 0 ? tasks.filter((t) => statusFilter.includes(t.status)) : tasks

  const thisWeekTasks = filtered.filter((t) => isThisWeekOrLater(t.dueDate))
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })
  const previousTasks = filtered.filter((t) => !isThisWeekOrLater(t.dueDate))
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return b.dueDate.localeCompare(a.dueDate)
    })

  const taskCount = filtered.length
  const todayCount = filtered.filter((t) => t.dueDate && formatTaskDate(t.dueDate) === "Today").length
  const todayDateLabel = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })

  const [showThisWeek, setShowThisWeek] = useState(true)
  const [showPrevious, setShowPrevious] = useState(false)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
        <div className="flex items-center gap-[12px]">
          <div className="flex items-baseline gap-[6px]">
            <span className="text-[14px] font-semibold text-[#262626]">Today</span>
            <span className="text-[12px] font-medium text-[#999]">{todayDateLabel}</span>
            {todayCount > 0 && (
              <span className="ml-[2px] rounded-full bg-blue-50 px-[6px] py-[1px] text-[11px] font-semibold text-blue-500">{todayCount}</span>
            )}
          </div>
          <div className="h-[16px] w-px bg-[#e5e5e5]" />
          <div className="flex items-center gap-[6px] rounded bg-[#f0f0f0] px-[6px] py-[3px] text-[13px] font-medium text-[#262626]">
            <Table2 className="h-[14px] w-[14px] text-[#262626]" strokeWidth={1.75} />
            <span>All</span>
          </div>
          <button
            className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#999] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            aria-label="Add view"
            tabIndex={0}
          >
            <Plus className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex items-center gap-[8px]">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-[5px] rounded border border-[#dcdcdc] bg-white px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Create task</span>
          </button>
          <button
            className="flex items-center gap-[5px] rounded px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            <SlidersHorizontal className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Display</span>
          </button>
        </div>
      </div>

          {/* Filter bar */}
          <div className="flex h-[41px] shrink-0 items-center gap-[8px] border-b border-[#dcdcdc] px-[16px]">
            <button
              ref={statusFilterRef}
              onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
              className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>Filter</span>
            </button>
            {statusFilter.length > 0 && (
              <div className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626]">
                <CheckSquare className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                <span>Status</span>
                <span className="text-[#888]">is any of</span>
                <span>{statusFilter.length} {statusFilter.length === 1 ? "value" : "values"}</span>
                <button
                  onClick={() => setStatusFilter([])}
                  className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded text-[#888] transition-colors hover:text-[#262626]"
                  tabIndex={0}
                  aria-label="Clear filter"
                >
                  <X className="h-[12px] w-[12px]" strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>

          {/* Status filter dropdown */}
          {isStatusFilterOpen && statusFilterRef.current && (() => {
            const rect = statusFilterRef.current.getBoundingClientRect()
            return (
              <div
                className="fixed z-[60] rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                style={{ top: rect.bottom + 4, left: rect.left, minWidth: 180 }}
              >
                <div className="px-[8px] py-[6px]">
                  <p className="px-[8px] py-[4px] text-[11px] font-medium text-[#888]">Filter by status</p>
                  {statusKeys.map((key) => {
                    const s = statusConfig[key]
                    const isActive = statusFilter.includes(key)
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setStatusFilter((prev) =>
                            isActive ? prev.filter((f) => f !== key) : [...prev, key]
                          )
                        }}
                        className={`flex w-full items-center gap-[8px] rounded px-[8px] py-[6px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-[#f5f5f5]" : ""}`}
                        tabIndex={0}
                      >
                        <div
                          className={`flex h-[16px] w-[16px] items-center justify-center rounded border ${isActive ? "border-[#262626] bg-[#262626]" : "border-[#d0d0d0]"}`}
                        >
                          {isActive && <span className="text-[10px] text-white">✓</span>}
                        </div>
                        <Circle className="h-[8px] w-[8px]" fill={s.color} stroke="none" />
                        <span className="text-[#262626]">{s.label}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="border-t border-[#f0f0f0] px-[8px] py-[6px]">
                  <button
                    onClick={() => { setStatusFilter([]); setIsStatusFilterOpen(false) }}
                    className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                    tabIndex={0}
                  >
                    Clear filter
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Backdrop for filter dropdown */}
          {isStatusFilterOpen && (
            <div className="fixed inset-0 z-[55]" onClick={() => setIsStatusFilterOpen(false)} />
          )}

          {/* Column headers */}
          <div className="flex shrink-0 items-center border-b border-[#e0e0e0] bg-white">
            <div className="w-[44px] shrink-0" />
            <div className="flex-1 px-[8px] py-[7px] text-[12px] font-medium text-[#999]">Task name</div>
            <div className="w-[110px] shrink-0 px-[8px] py-[7px] text-[12px] font-medium text-[#999]">Due date</div>
            <div className="w-[160px] shrink-0 px-[8px] py-[7px] text-[12px] font-medium text-[#999]">Participant</div>
            <div className="w-[150px] shrink-0 px-[8px] py-[7px] text-[12px] font-medium text-[#999]">Charge</div>
            <div className="w-[70px] shrink-0 px-[8px] py-[7px] text-[12px] font-medium text-[#999]">Time</div>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto bg-white">

            {/* Add task section */}
            {!isQuickAdding ? (
              <button
                type="button"
                onClick={() => { setIsQuickAdding(true); setQuickActiveField("title"); setTimeout(() => quickInputRef.current?.focus(), 0) }}
                className="flex w-full items-center border-b border-[#e8e8e8] transition-colors hover:bg-[#fafafa]"
                tabIndex={0}
              >
                <div className="w-[44px] shrink-0" />
                <div className="flex items-center gap-[6px] px-[8px] py-[8px] text-[13px] text-[#bbb] hover:text-[#888]">
                  <Plus className="h-[12px] w-[12px]" strokeWidth={1.5} />
                  Add task...
                </div>
              </button>
            ) : (
              <div className="border-b border-[#e8e8e8] bg-blue-50/20">
                <div className="flex items-center">
                  <div className="flex w-[44px] shrink-0 items-center justify-center">
                    <div className="h-[18px] w-[18px] rounded-full border-[1.5px] border-dashed border-blue-300" />
                  </div>
                  <div className="flex-1 px-[8px] py-[8px]">
                    <input
                      ref={quickInputRef}
                      type="text"
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      onFocus={() => setQuickActiveField("title")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && quickTitle.trim()) { e.preventDefault(); setQuickActiveField("participant"); quickClientBtnRef.current?.focus(); setIsQuickClientOpen(true) }
                        if (e.key === "Escape") resetQuickAdd()
                      }}
                      placeholder="Task name..."
                      className="w-full bg-transparent text-[13px] text-[#262626] placeholder-[#bbb] outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="w-[110px] shrink-0 px-[8px] py-[8px] text-[12px] text-[#bbb]">Today</div>
                  <div className="relative w-[160px] shrink-0 px-[8px] py-[8px]">
                    <button
                      ref={quickClientBtnRef}
                      type="button"
                      onClick={() => { setQuickActiveField("participant"); setIsQuickClientOpen(!isQuickClientOpen); setQuickClientIdx(-1) }}
                      onFocus={() => setQuickActiveField("participant")}
                      onKeyDown={(e) => {
                        if (isQuickClientOpen) {
                          const totalItems = clientNames.length + 1
                          if (e.key === "ArrowDown") { e.preventDefault(); setQuickClientIdx((prev) => (prev + 1) % totalItems) }
                          else if (e.key === "ArrowUp") { e.preventDefault(); setQuickClientIdx((prev) => (prev - 1 + totalItems) % totalItems) }
                          else if (e.key === "Enter") {
                            e.preventDefault()
                            const selected = quickClientIdx === 0 ? "" : clientNames[quickClientIdx - 1] ?? ""
                            setQuickClient(selected)
                            setIsQuickClientOpen(false)
                            setQuickClientIdx(-1)
                            setQuickActiveField("charge")
                            setTimeout(() => quickChargeBtnRef.current?.focus(), 50)
                          }
                        } else {
                          if (e.key === "Enter") { e.preventDefault(); setIsQuickClientOpen(true); setQuickClientIdx(0) }
                          if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); setQuickActiveField("charge"); quickChargeBtnRef.current?.focus() }
                        }
                        if (e.key === "Escape") {
                          if (isQuickClientOpen) { e.stopPropagation(); setIsQuickClientOpen(false); setQuickClientIdx(-1) }
                          else resetQuickAdd()
                        }
                      }}
                      className={`truncate text-[12px] transition-colors hover:text-[#262626] ${quickClient ? "font-medium text-[#262626]" : "text-[#bbb]"}`}
                      tabIndex={0}
                    >
                      {quickClient || "Select..."}
                    </button>
                    {isQuickClientOpen && (
                      <>
                        <div className="fixed inset-0 z-[59]" onClick={() => { setIsQuickClientOpen(false); setQuickClientIdx(-1) }} />
                        <div ref={quickClientListRef} className="absolute left-0 top-full z-[60] mt-[4px] max-h-[200px] w-[220px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                          <div
                            onClick={() => { setQuickClient(""); setIsQuickClientOpen(false); setQuickClientIdx(-1); setQuickActiveField("charge"); setTimeout(() => quickChargeBtnRef.current?.focus(), 50) }}
                            className={`flex w-full cursor-pointer items-center px-[12px] py-[7px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] ${quickClientIdx === 0 ? "bg-blue-50 text-blue-600" : ""}`}
                            role="option"
                            aria-selected={quickClientIdx === 0}
                          >
                            None
                          </div>
                          {clientNames.map((name, i) => {
                            const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                            const isHighlighted = quickClientIdx === i + 1
                            return (
                              <div
                                key={name}
                                onClick={() => { setQuickClient(name); setIsQuickClientOpen(false); setQuickClientIdx(-1); setQuickActiveField("charge"); setTimeout(() => quickChargeBtnRef.current?.focus(), 50) }}
                                className={`flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${isHighlighted ? "bg-blue-50" : ""}`}
                                role="option"
                                aria-selected={isHighlighted}
                              >
                                <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-[#d4d4d4] text-[8px] font-semibold text-[#555]">
                                  {initials}
                                </div>
                                {name}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="relative w-[150px] shrink-0 px-[8px] py-[8px]">
                    <button
                      ref={quickChargeBtnRef}
                      type="button"
                      onClick={() => { setQuickActiveField("charge"); setIsQuickChargeOpen(!isQuickChargeOpen); setQuickChargeIdx(-1) }}
                      onFocus={() => setQuickActiveField("charge")}
                      onKeyDown={(e) => {
                        if (isQuickChargeOpen) {
                          const total = chargeTypes.length
                          if (e.key === "ArrowDown") { e.preventDefault(); setQuickChargeIdx((p) => (p + 1) % total) }
                          else if (e.key === "ArrowUp") { e.preventDefault(); setQuickChargeIdx((p) => (p - 1 + total) % total) }
                          else if (e.key === "Enter") {
                            e.preventDefault()
                            const selected = quickChargeIdx >= 0 ? chargeTypes[quickChargeIdx].value : ""
                            setQuickCharge(selected)
                            setIsQuickChargeOpen(false)
                            setQuickChargeIdx(-1)
                            setQuickActiveField("time")
                            setTimeout(() => quickTimeRef.current?.focus(), 50)
                          }
                        } else {
                          if (e.key === "Enter") { e.preventDefault(); setIsQuickChargeOpen(true); setQuickChargeIdx(0) }
                          if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); setQuickActiveField("time"); quickTimeRef.current?.focus() }
                        }
                        if (e.key === "Escape") {
                          if (isQuickChargeOpen) { e.stopPropagation(); setIsQuickChargeOpen(false); setQuickChargeIdx(-1) }
                          else resetQuickAdd()
                        }
                      }}
                      className={`truncate text-[12px] transition-colors hover:text-[#262626] ${quickCharge ? "font-medium text-[#262626]" : "text-[#bbb]"}`}
                      tabIndex={0}
                    >
                      {quickCharge ? chargeLabel(quickCharge) : "Select..."}
                    </button>
                    {isQuickChargeOpen && (
                      <>
                        <div className="fixed inset-0 z-[59]" onClick={() => { setIsQuickChargeOpen(false); setQuickChargeIdx(-1) }} />
                        <div ref={quickChargeListRef} className="absolute left-0 top-full z-[60] mt-[4px] max-h-[220px] w-[200px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                          {chargeTypes.map((ct, i) => (
                            <div
                              key={ct.value}
                              onClick={() => { setQuickCharge(ct.value); setIsQuickChargeOpen(false); setQuickChargeIdx(-1); setQuickActiveField("time"); setTimeout(() => quickTimeRef.current?.focus(), 50) }}
                              className={`flex w-full cursor-pointer items-center px-[12px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${quickChargeIdx === i ? "bg-blue-50" : ""} ${ct.value ? "text-[#262626]" : "text-[#888]"}`}
                              role="option"
                              aria-selected={quickChargeIdx === i}
                            >
                              {ct.label}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="w-[70px] shrink-0 px-[8px] py-[8px]">
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
                      className="w-full bg-transparent text-[12px] text-[#262626] placeholder-[#bbb] outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-[6px] border-t border-blue-100 px-[12px] py-[5px]">
                  <span className="mr-auto text-[11px] font-medium text-[#ccc]">Enter ↵ next · Esc cancel</span>
                  <button type="button" onClick={resetQuickAdd} className="rounded px-[8px] py-[3px] text-[12px] font-medium text-[#999] transition-colors hover:bg-[#f0f0f0]" tabIndex={0}>Cancel</button>
                  <button type="button" onClick={handleQuickFinish} disabled={!quickTitle.trim()} className="rounded-md bg-blue-500 px-[10px] py-[3px] text-[12px] font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-40" tabIndex={0}>Create</button>
                </div>
              </div>
            )}

            <div className="h-[12px] border-b border-[#e0e0e0] bg-[#f5f5f5]" />

            {/* This week section */}
            <button
              type="button"
              onClick={() => setShowThisWeek(!showThisWeek)}
              className="flex w-full items-center gap-[4px] border-b border-[#e8e8e8] bg-[#fafafa] px-[12px] py-[6px] text-left"
              tabIndex={0}
            >
              <ChevronDown className={`h-[12px] w-[12px] text-[#888] transition-transform ${showThisWeek ? "" : "-rotate-90"}`} strokeWidth={2} />
              <span className="text-[13px] font-semibold text-[#262626]">This week</span>
            </button>

            {showThisWeek && thisWeekTasks.map((task) => {
              const dateLabel = formatTaskDate(task.dueDate)
              return (
                <div
                  key={task.id}
                  className="group flex cursor-pointer items-center border-b border-[#f0f0f0] transition-colors hover:bg-[#fafafa]"
                  onClick={() => setSelectedTaskId(task.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") setSelectedTaskId(task.id) }}
                >
                  <div className="flex w-[44px] shrink-0 items-center justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleComplete(task.id) }}
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
                        task.status === "done"
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-[#ccc] hover:border-[#999]"
                      }`}
                      tabIndex={0}
                      aria-label={task.status === "done" ? "Mark as incomplete" : "Mark as complete"}
                    >
                      {task.status === "done" && <span className="text-[9px]">✓</span>}
                    </button>
                  </div>
                  <div className="flex-1 truncate px-[8px] py-[8px]">
                    <span className={`text-[13px] ${task.status === "done" ? "text-[#bbb] line-through" : "text-[#262626]"}`}>
                      {task.title}
                    </span>
                  </div>
                  <div className="w-[110px] shrink-0 px-[8px] py-[8px]">
                    <span className={`text-[12px] ${dateLabel === "Today" ? "font-medium text-green-600" : "text-[#888]"}`}>
                      {dateLabel || "—"}
                    </span>
                  </div>
                  <div className="w-[160px] shrink-0 px-[8px] py-[8px]">
                    {task.client ? (
                      <span className="inline-flex items-center gap-[6px] rounded-md bg-[#e8f5e9] px-[8px] py-[2px] text-[12px] font-medium text-[#2e7d32]">
                        <span className="flex h-[6px] w-[6px] rounded-full bg-[#4caf50]" />
                        {task.client}
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#ccc]">—</span>
                    )}
                  </div>
                  <div className="w-[150px] shrink-0 truncate px-[8px] py-[8px] text-[12px] text-[#888]">
                    {task.chargeType ? chargeLabel(task.chargeType) : <span className="text-[#ccc]">—</span>}
                  </div>
                  <div className="w-[70px] shrink-0 px-[8px] py-[8px]">
                    {task.timeSpent > 0 ? (
                      <span className="inline-flex items-center gap-[4px] rounded-md bg-[#f0f0f0] px-[6px] py-[2px] text-[11px] font-medium text-[#777]">
                        <Clock className="h-[10px] w-[10px]" strokeWidth={1.5} />
                        {formatTime(task.timeSpent)}
                      </span>
                    ) : <span className="text-[12px] text-[#ccc]">—</span>}
                  </div>
                </div>
              )
            })}

            {/* Previous section */}
            {previousTasks.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowPrevious(!showPrevious)}
                  className="flex w-full items-center gap-[4px] border-b border-[#e8e8e8] bg-[#fafafa] px-[12px] py-[6px] text-left"
                  tabIndex={0}
                >
                  <ChevronDown className={`h-[12px] w-[12px] text-[#888] transition-transform ${showPrevious ? "" : "-rotate-90"}`} strokeWidth={2} />
                  <span className="text-[13px] font-semibold text-[#999]">Previous</span>
                  <span className="ml-[2px] text-[12px] font-medium text-[#ccc]">({previousTasks.length})</span>
                </button>
                {showPrevious && previousTasks.map((task) => {
                  const dateLabel = formatTaskDate(task.dueDate)
                  return (
                    <div
                      key={task.id}
                      className="group flex cursor-pointer items-center border-b border-[#f0f0f0] transition-colors hover:bg-[#fafafa]"
                      onClick={() => setSelectedTaskId(task.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") setSelectedTaskId(task.id) }}
                    >
                      <div className="flex w-[44px] shrink-0 items-center justify-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleComplete(task.id) }}
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
                            task.status === "done"
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-[#ccc] hover:border-[#999]"
                          }`}
                          tabIndex={0}
                          aria-label={task.status === "done" ? "Mark as incomplete" : "Mark as complete"}
                        >
                          {task.status === "done" && <span className="text-[9px]">✓</span>}
                        </button>
                      </div>
                      <div className="flex-1 truncate px-[8px] py-[8px]">
                        <span className={`text-[13px] ${task.status === "done" ? "text-[#bbb] line-through" : "text-[#262626]"}`}>
                          {task.title}
                        </span>
                      </div>
                      <div className="w-[110px] shrink-0 px-[8px] py-[8px] text-[12px] text-[#999]">
                        {dateLabel || "—"}
                      </div>
                      <div className="w-[160px] shrink-0 px-[8px] py-[8px]">
                        {task.client ? (
                          <span className="inline-flex items-center gap-[6px] rounded-md bg-[#e8f5e9] px-[8px] py-[2px] text-[12px] font-medium text-[#2e7d32]">
                            <span className="flex h-[6px] w-[6px] rounded-full bg-[#4caf50]" />
                            {task.client}
                          </span>
                        ) : (
                          <span className="text-[12px] text-[#ccc]">—</span>
                        )}
                      </div>
                      <div className="w-[150px] shrink-0 truncate px-[8px] py-[8px] text-[12px] text-[#888]">
                        {task.chargeType ? chargeLabel(task.chargeType) : <span className="text-[#ccc]">—</span>}
                      </div>
                      <div className="w-[70px] shrink-0 px-[8px] py-[8px]">
                        {task.timeSpent > 0 ? (
                          <span className="inline-flex items-center gap-[4px] rounded-md bg-[#f0f0f0] px-[6px] py-[2px] text-[11px] font-medium text-[#777]">
                            <Clock className="h-[10px] w-[10px]" strokeWidth={1.5} />
                            {formatTime(task.timeSpent)}
                          </span>
                        ) : <span className="text-[12px] text-[#ccc]">—</span>}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-[#999]">
              {taskCount} {taskCount === 1 ? "task" : "tasks"}
            </span>
          </div>

      {/* Create task modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={closeModal} />
          <div className="relative z-10 flex w-[520px] flex-col rounded-lg border border-[#e0e0e0] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            {/* Header */}
            <div className="flex items-center justify-between px-[20px] pt-[16px]">
              <div className="flex items-center gap-[6px]">
                <SquareCheck className="h-[14px] w-[14px] text-[#888]" strokeWidth={1.5} />
                <span className="text-[13px] font-medium text-[#262626]">Task</span>
              </div>
              <button
                onClick={closeModal}
                className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
              </button>
            </div>

            {/* Title input */}
            <div className="px-[20px] pt-[12px]">
              <input
                type="text"
                placeholder="Add title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full text-[15px] font-medium text-[#262626] placeholder-[#bbb] outline-none"
                autoFocus
              />
            </div>

            {/* Description input */}
            <div className="px-[20px] pb-[8px] pt-[8px]">
              <textarea
                placeholder="Description..."
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="min-h-[80px] w-full resize-none text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none"
                rows={3}
              />
            </div>

            {/* Attachments preview */}
            {newAttachments.length > 0 && (
              <div className="flex flex-col gap-[6px] px-[20px] pb-[12px]">
                {newAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-[8px] rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px] py-[6px]"
                  >
                    <FileText className="h-[14px] w-[14px] shrink-0 text-[#888]" strokeWidth={1.5} />
                    <span className="flex-1 truncate text-[12px] font-medium text-[#262626]">{att.name}</span>
                    <span className="shrink-0 text-[11px] font-medium text-[#999]">{formatFileSize(att.size)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[#bbb] transition-colors hover:bg-[#ebebeb] hover:text-[#262626]"
                      tabIndex={0}
                      aria-label={`Remove ${att.name}`}
                    >
                      <X className="h-[12px] w-[12px]" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Bottom bar with pills */}
            <div className="flex items-center justify-between border-t border-[#f0f0f0] px-[20px] py-[12px]">
              <div className="flex flex-wrap items-center gap-[6px]">
                {/* Status pill */}
                <button
                  ref={statusPillRef}
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
                  className="flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <div className="flex h-[14px] w-[14px] items-center justify-center rounded border border-[#d0d0d0]" />
                  <span>{statusConfig[newTask.status].label}</span>
                </button>

                {/* Assignee pill */}
                <div className="flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px] text-[12px] font-medium text-[#262626]">
                  <div className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-green-600 text-[7px] font-semibold text-white">
                    S
                  </div>
                  <span>{newTask.assignee}</span>
                </div>

                {/* Account (Client) pill */}
                <button
                  ref={clientPillRef}
                  type="button"
                  onClick={() => { setActiveDropdown(activeDropdown === "client" ? null : "client"); setModalClientIdx(-1) }}
                  onKeyDown={(e) => {
                    if (activeDropdown === "client") {
                      const total = clientNames.length + 1
                      if (e.key === "ArrowDown") { e.preventDefault(); setModalClientIdx((p) => (p + 1) % total) }
                      else if (e.key === "ArrowUp") { e.preventDefault(); setModalClientIdx((p) => (p - 1 + total) % total) }
                      else if (e.key === "Enter") {
                        e.preventDefault()
                        const val = modalClientIdx === 0 ? "" : clientNames[modalClientIdx - 1] ?? ""
                        setNewTask({ ...newTask, client: val })
                        setActiveDropdown(null)
                        setModalClientIdx(-1)
                      }
                      else if (e.key === "Escape") { e.stopPropagation(); setActiveDropdown(null); setModalClientIdx(-1) }
                    }
                  }}
                  className="flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px] text-[12px] font-medium transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <Building2 className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
                  <span className={newTask.client ? "text-[#262626]" : "text-[#888]"}>
                    {newTask.client || "Client"}
                  </span>
                </button>

                {/* Due date pill */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "date" ? null : "date")}
                    className="flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px] text-[12px] font-medium transition-colors hover:bg-[#f5f5f5]"
                    tabIndex={0}
                  >
                    <CalendarDays className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
                    <span className={newTask.dueDate ? "text-[#262626]" : "text-[#888]"}>
                      {newTask.dueDate
                        ? new Date(newTask.dueDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })
                        : "Due date"}
                    </span>
                  </button>
                  {activeDropdown === "date" && (
                    <>
                      <div className="fixed inset-0 z-[59]" onClick={() => setActiveDropdown(null)} />
                      <div className="absolute bottom-full left-0 z-[60] mb-[4px]">
                        <DatePicker
                          value={newTask.dueDate}
                          onChange={(val) => setNewTask({ ...newTask, dueDate: val })}
                          onClose={() => setActiveDropdown(null)}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Attachment pill */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px] text-[12px] font-medium transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <Paperclip className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
                  <span className={newAttachments.length > 0 ? "text-[#262626]" : "text-[#888]"}>
                    {newAttachments.length > 0 ? `${newAttachments.length} file${newAttachments.length > 1 ? "s" : ""}` : "Attach"}
                  </span>
                </button>
              </div>

              {/* Create button */}
              <button
                onClick={handleCreateTask}
                className="rounded-md bg-blue-500 px-[14px] py-[6px] text-[12px] font-medium text-white transition-colors hover:bg-blue-600"
                tabIndex={0}
              >
                Create task
              </button>
            </div>
          </div>

          {/* Status dropdown */}
          {activeDropdown === "status" && statusPillRef.current && (() => {
            const rect = statusPillRef.current.getBoundingClientRect()
            return (
              <div
                className="fixed z-[60] rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                style={{ top: rect.bottom + 4, left: rect.left, minWidth: 160 }}
              >
                {statusKeys.map((key) => {
                  const s = statusConfig[key]
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setNewTask({ ...newTask, status: key as Task["status"] })
                        setActiveDropdown(null)
                      }}
                      className={`flex w-full items-center gap-[8px] px-[12px] py-[8px] text-left text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${newTask.status === key ? "bg-[#f5f5f5]" : ""}`}
                      tabIndex={0}
                    >
                      <Circle className="h-[8px] w-[8px]" fill={s.color} stroke="none" />
                      <span>{s.label}</span>
                    </button>
                  )
                })}
              </div>
            )
          })()}

          {/* Client dropdown */}
          {activeDropdown === "client" && clientPillRef.current && (() => {
            const rect = clientPillRef.current.getBoundingClientRect()
            return (
              <div
                className="fixed z-[60] max-h-[200px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                style={{ top: rect.bottom + 4, left: rect.left, minWidth: 180 }}
              >
                <div
                  onClick={() => { setNewTask({ ...newTask, client: "" }); setActiveDropdown(null); setModalClientIdx(-1) }}
                  className={`flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] ${modalClientIdx === 0 ? "bg-blue-50 text-blue-600" : ""}`}
                  role="option"
                  aria-selected={modalClientIdx === 0}
                >
                  None
                </div>
                {clientNames.map((name, i) => {
                  const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                  const isHighlighted = modalClientIdx === i + 1
                  return (
                    <div
                      key={name}
                      onClick={() => { setNewTask({ ...newTask, client: name }); setActiveDropdown(null); setModalClientIdx(-1) }}
                      className={`flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${isHighlighted ? "bg-blue-50" : ""}`}
                      role="option"
                      aria-selected={isHighlighted}
                    >
                      <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#d4d4d4] text-[9px] font-semibold text-[#555]">
                        {initials}
                      </div>
                      {name}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={closeDetail} />
          <div className="relative z-10 flex w-[520px] flex-col rounded-lg border border-[#e0e0e0] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            {/* Header */}
            <div className="flex items-center justify-between px-[20px] pt-[16px]">
              <div className="flex items-center gap-[6px]">
                <SquareCheck className="h-[14px] w-[14px] text-[#888]" strokeWidth={1.5} />
                <span className="text-[13px] font-medium text-[#262626]">Task</span>
              </div>
              <div className="flex items-center gap-[4px]">
                <button
                  onClick={() => { handleDeleteTask(selectedTask.id) }}
                  className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#bbb] transition-colors hover:bg-[#f5f5f5] hover:text-red-500"
                  tabIndex={0}
                  aria-label="Delete task"
                >
                  <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.5} />
                </button>
                <button
                  onClick={closeDetail}
                  className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                  tabIndex={0}
                  aria-label="Close"
                >
                  <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="px-[20px] pt-[12px]">
              <input
                type="text"
                placeholder="Add title"
                value={selectedTask.title}
                onChange={(e) => handleUpdateTask("title", e.target.value)}
                className="w-full text-[15px] font-medium text-[#262626] placeholder-[#bbb] outline-none"
              />
            </div>

            {/* Description */}
            <div className="px-[20px] pb-[8px] pt-[8px]">
              <textarea
                placeholder="Description..."
                value={selectedTask.description}
                onChange={(e) => handleUpdateTask("description", e.target.value)}
                className="min-h-[80px] w-full resize-none text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none"
                rows={3}
              />
            </div>

            {/* Attachments */}
            {selectedTask.attachments.length > 0 && (
              <div className="flex flex-col gap-[6px] px-[20px] pb-[12px]">
                {selectedTask.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-[8px] rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px] py-[6px]"
                  >
                    <FileText className="h-[14px] w-[14px] shrink-0 text-[#888]" strokeWidth={1.5} />
                    <span className="flex-1 truncate text-[12px] font-medium text-[#262626]">{att.name}</span>
                    <span className="shrink-0 text-[11px] font-medium text-[#999]">{formatFileSize(att.size)}</span>
                    <button
                      type="button"
                      onClick={() => handleDetailRemoveAttachment(att.id)}
                      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[#bbb] transition-colors hover:bg-[#ebebeb] hover:text-[#262626]"
                      tabIndex={0}
                      aria-label={`Remove ${att.name}`}
                    >
                      <X className="h-[12px] w-[12px]" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden file input for detail */}
            <input
              ref={detailFileInputRef}
              type="file"
              multiple
              onChange={handleDetailFileSelect}
              className="hidden"
            />

            {/* Bottom bar with pills */}
            <div className="flex flex-col gap-[8px] border-t border-[#f0f0f0] px-[20px] py-[12px]">
              {/* Row 1: Status, Assignee, Attach, Due date */}
              <div className="flex flex-wrap items-center gap-[6px]">
                <button
                  ref={detailStatusRef}
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === "detail-status" ? null : "detail-status")}
                  className="flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <Circle className="h-[8px] w-[8px]" fill={statusConfig[selectedTask.status].color} stroke="none" />
                  <span>{statusConfig[selectedTask.status].label}</span>
                </button>

                <div className="flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px] text-[12px] font-medium text-[#262626]">
                  <div className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-green-600 text-[7px] font-semibold text-white">
                    S
                  </div>
                  <span>{selectedTask.assignee}</span>
                </div>

                <button
                  type="button"
                  onClick={() => detailFileInputRef.current?.click()}
                  className="flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px] text-[12px] font-medium transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <Paperclip className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
                  <span className={selectedTask.attachments.length > 0 ? "text-[#262626]" : "text-[#888]"}>
                    {selectedTask.attachments.length > 0 ? `${selectedTask.attachments.length} file${selectedTask.attachments.length > 1 ? "s" : ""}` : "Attach"}
                  </span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "detail-date" ? null : "detail-date")}
                    className="flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px] text-[12px] font-medium transition-colors hover:bg-[#f5f5f5]"
                    tabIndex={0}
                  >
                    <CalendarDays className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
                    <span className={selectedTask.dueDate ? "text-[#262626]" : "text-[#888]"}>
                      {selectedTask.dueDate
                        ? new Date(selectedTask.dueDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })
                        : "Due date"}
                    </span>
                  </button>
                  {activeDropdown === "detail-date" && (
                    <>
                      <div className="fixed inset-0 z-[59]" onClick={() => setActiveDropdown(null)} />
                      <div className="absolute bottom-full left-0 z-[60] mb-[4px]">
                        <DatePicker
                          value={selectedTask.dueDate || ""}
                          onChange={(val) => handleUpdateTask("dueDate", val)}
                          onClose={() => setActiveDropdown(null)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Row 2: Client, Charge, Time spent */}
              <div className="flex flex-wrap items-center gap-[6px]">
                <button
                  ref={detailClientRef}
                  type="button"
                  onClick={() => { setActiveDropdown(activeDropdown === "detail-client" ? null : "detail-client"); setDetailClientIdx(-1) }}
                  onKeyDown={(e) => {
                    if (activeDropdown === "detail-client") {
                      const total = clientNames.length + 1
                      if (e.key === "ArrowDown") { e.preventDefault(); setDetailClientIdx((p) => (p + 1) % total) }
                      else if (e.key === "ArrowUp") { e.preventDefault(); setDetailClientIdx((p) => (p - 1 + total) % total) }
                      else if (e.key === "Enter") {
                        e.preventDefault()
                        const val = detailClientIdx === 0 ? "" : clientNames[detailClientIdx - 1] ?? ""
                        handleUpdateTask("client", val)
                        setActiveDropdown(null)
                        setDetailClientIdx(-1)
                      }
                      else if (e.key === "Escape") { e.stopPropagation(); setActiveDropdown(null); setDetailClientIdx(-1) }
                    }
                  }}
                  className="flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px] text-[12px] font-medium transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <Building2 className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
                  <span className={selectedTask.client ? "text-[#262626]" : "text-[#888]"}>
                    {selectedTask.client || "Client"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === "detail-charge" ? null : "detail-charge")}
                  className="flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px] text-[12px] font-medium transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <Tag className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
                  <span className={selectedTask.chargeType ? "text-[#262626]" : "text-[#888]"}>
                    {selectedTask.chargeType ? chargeLabel(selectedTask.chargeType) : "No charge"}
                  </span>
                </button>

                <div className="flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px] text-[12px] font-medium">
                  <Clock className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
                  <input
                    key={selectedTask.timeSpent}
                    type="text"
                    defaultValue={selectedTask.timeSpent > 0 ? formatTime(selectedTask.timeSpent) : ""}
                    placeholder="0m"
                    onBlur={(e) => handleUpdateTask("timeSpent", parseTimeInput(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUpdateTask("timeSpent", parseTimeInput(e.currentTarget.value))
                        e.currentTarget.blur()
                      }
                    }}
                    className="w-[48px] bg-transparent text-[12px] font-medium text-[#262626] placeholder-[#bbb] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Detail status dropdown */}
          {activeDropdown === "detail-status" && detailStatusRef.current && (() => {
            const rect = detailStatusRef.current.getBoundingClientRect()
            return (
              <div
                className="fixed z-[60] rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                style={{ top: rect.bottom + 4, left: rect.left, minWidth: 160 }}
              >
                {statusKeys.map((key) => {
                  const s = statusConfig[key]
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        handleUpdateTask("status", key)
                        setActiveDropdown(null)
                      }}
                      className={`flex w-full items-center gap-[8px] px-[12px] py-[8px] text-left text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${selectedTask.status === key ? "bg-[#f5f5f5]" : ""}`}
                      tabIndex={0}
                    >
                      <Circle className="h-[8px] w-[8px]" fill={s.color} stroke="none" />
                      <span>{s.label}</span>
                    </button>
                  )
                })}
              </div>
            )
          })()}

          {/* Detail client dropdown */}
          {activeDropdown === "detail-client" && detailClientRef.current && (() => {
            const rect = detailClientRef.current.getBoundingClientRect()
            return (
              <div
                className="fixed z-[60] max-h-[200px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                style={{ top: rect.bottom + 4, left: rect.left, minWidth: 180 }}
              >
                <div
                  onClick={() => { handleUpdateTask("client", ""); setActiveDropdown(null); setDetailClientIdx(-1) }}
                  className={`flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] ${detailClientIdx === 0 ? "bg-blue-50 text-blue-600" : ""}`}
                  role="option"
                  aria-selected={detailClientIdx === 0}
                >
                  None
                </div>
                {clientNames.map((name, i) => {
                  const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                  const isHighlighted = detailClientIdx === i + 1
                  return (
                    <div
                      key={name}
                      onClick={() => { handleUpdateTask("client", name); setActiveDropdown(null); setDetailClientIdx(-1) }}
                      className={`flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${isHighlighted ? "bg-blue-50" : ""}`}
                      role="option"
                      aria-selected={isHighlighted}
                    >
                      <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#d4d4d4] text-[9px] font-semibold text-[#555]">
                        {initials}
                      </div>
                      {name}
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* Detail charge dropdown */}
          {activeDropdown === "detail-charge" && selectedTask && (() => {
            return (
              <div
                className="fixed z-[60] max-h-[220px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", minWidth: 200 }}
              >
                {chargeTypes.map((ct) => (
                  <div
                    key={ct.value}
                    onClick={() => { handleUpdateTask("chargeType", ct.value); setActiveDropdown(null) }}
                    className={`flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${ct.value ? "text-[#262626]" : "text-[#888]"} ${selectedTask.chargeType === ct.value ? "bg-[#f5f5f5]" : ""}`}
                    role="option"
                    aria-selected={selectedTask.chargeType === ct.value}
                  >
                    {ct.label}
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
