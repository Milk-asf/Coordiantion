"use client"

import { useState, useRef, useMemo, useCallback, useEffect } from "react"
import {
  Receipt,
  ListFilter,
  SlidersHorizontal,
  CalendarDays,
  Building2,
  User,
  Tag,
  Clock,
  FileText,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SquareCheck,
  Trash2,
  Bold,
  Italic,
  Underline,
  List,
  Strikethrough,
  Type,
} from "lucide-react"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useClients } from "@/lib/hooks/use-clients"
import { useCharges } from "@/lib/hooks/use-charges"
import { useStaff } from "@/lib/hooks/use-staff"
import { serviceChargeTypes } from "@/lib/ndis-charges"
import type { Task, Attachment } from "@/lib/types"

const columnDefs = [
  { key: "date", label: "Date", icon: CalendarDays, width: "90px" },
  { key: "participant", label: "Client", icon: Building2, width: "40px" },
  { key: "title", label: "Title", icon: FileText, width: "1fr", alwaysVisible: true },
  { key: "assignee", label: "Assignee", icon: User, width: "40px" },
  { key: "charge", label: "Charge", icon: Tag, width: "64px" },
  { key: "time", label: "Time", icon: Clock, width: "56px" },
] as const

const defaultVisibleKeys = ["date", "participant", "title", "assignee", "charge", "time"]


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


function DatePicker({ value, onChange, onClose }: { value: string; onChange: (val: string) => void; onClose: () => void }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const selected = value ? new Date(value + "T00:00:00") : null
  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : today.getMonth())
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) } else setViewMonth(viewMonth - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) } else setViewMonth(viewMonth + 1) }
  const handleSelect = (day: number) => { const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; onChange(dateStr); onClose() }
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-AU", { month: "long", year: "numeric" })
  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
  const quickDates = [{ label: "Today", offset: 0 }, { label: "Tomorrow", offset: 1 }, { label: "Next week", offset: (8 - today.getDay()) % 7 || 7 }]
  return (
    <div className="w-[260px] rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
      <div className="flex gap-[4px] border-b border-[#f0f0f0] px-[12px] py-[8px]">
        {quickDates.map((qd) => { const d = new Date(today); d.setDate(d.getDate() + qd.offset); const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; const isSelected = value === dateStr; return (<button key={qd.label} type="button" onClick={() => { onChange(dateStr); onClose() }} className={`rounded px-[8px] py-[4px] text-[11px] font-medium transition-colors ${isSelected ? "bg-[#262626] text-white" : "text-[#555] hover:bg-[#f5f5f5]"}`} tabIndex={0}>{qd.label}</button>) })}
      </div>
      <div className="flex items-center justify-between px-[12px] py-[8px]">
        <button type="button" onClick={prevMonth} className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0} aria-label="Previous month"><ChevronLeft className="h-[14px] w-[14px]" strokeWidth={1.5} /></button>
        <span className="text-[12px] font-semibold text-[#262626]">{monthLabel}</span>
        <button type="button" onClick={nextMonth} className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0} aria-label="Next month"><ChevronRight className="h-[14px] w-[14px]" strokeWidth={1.5} /></button>
      </div>
      <div className="grid grid-cols-7 px-[8px]">
        {weekDays.map((wd) => (<div key={wd} className="flex h-[28px] items-center justify-center text-[10px] font-semibold text-[#aaa]">{wd}</div>))}
        {Array.from({ length: startOffset }).map((_, i) => (<div key={`e-${i}`} />))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
          const isSelected = dateStr === value
          return (<button key={day} type="button" onClick={() => handleSelect(day)} className={`flex h-[28px] w-[28px] items-center justify-center rounded-full text-[12px] font-medium transition-colors ${isSelected ? "bg-[#262626] text-white" : isToday ? "bg-blue-50 text-blue-600 font-semibold" : "text-[#262626] hover:bg-[#f0f0f0]"}`} tabIndex={0}>{day}</button>)
        })}
      </div>
      <div className="h-[8px]" />
    </div>
  )
}

function formatRowDate(dateStr: string | null): string {
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
  if (diff > 0 && diff < 7 * dayMs) return d.toLocaleDateString("en-AU", { weekday: "long" })
  if (diff < 0 && diff > -7 * dayMs) return d.toLocaleDateString("en-AU", { weekday: "long" })
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function InvoicingPage() {
  const { tasks, updateTask, deleteTask: deleteTaskDb } = useTasks()
  const { clientNames } = useClients()
  const { enabledCharges, allCharges } = useCharges()
  const { staffNames } = useStaff()
  const [visibleColumnKeys, _setVisibleColumnKeys] = useState<string[]>(defaultVisibleKeys)

  // Filters
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const filterPillRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [participantFilter, setParticipantFilter] = useState<string[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([])
  const [chargeFilter, setChargeFilter] = useState<string[]>([])
  // Display settings
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const displayBtnRef = useRef<HTMLButtonElement>(null)
  const [displayClients, setDisplayClients] = useState<string[]>([])
  const [displayAssignees, setDisplayAssignees] = useState<string[]>([])


  // Task detail state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [detailDropdown, setDetailDropdown] = useState<string | null>(null)
  const [detailClientIdx, setDetailClientIdx] = useState(-1)
  const detailClientRef = useRef<HTMLButtonElement>(null)
  const detailChargeRef = useRef<HTMLButtonElement>(null)
  const detailSecondaryChargeRef = useRef<HTMLButtonElement>(null)
  const detailFileInputRef = useRef<HTMLInputElement>(null)

  const descriptionRef = useRef<HTMLDivElement>(null)
  const [formatToolbar, setFormatToolbar] = useState<{ x: number; y: number } | null>(null)
  const [descFormats, setDescFormats] = useState<Record<string, boolean>>({})
  const [currentBlock, setCurrentBlock] = useState("")
  const [isTextSizeOpen, setIsTextSizeOpen] = useState(false)

  const refreshDescFormats = useCallback(() => {
    setDescFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
    })
    setCurrentBlock(document.queryCommandValue("formatBlock") || "")
  }, [])

  const handleDescFormat = useCallback((cmd: string) => {
    document.execCommand(cmd, false)
    descriptionRef.current?.focus()
    setTimeout(refreshDescFormats, 0)
  }, [refreshDescFormats])

  const handleTextSize = useCallback((tag: string) => {
    if (tag === "p") {
      document.execCommand("formatBlock", false, "p")
    } else {
      const current = document.queryCommandValue("formatBlock")
      if (current === tag) {
        document.execCommand("formatBlock", false, "p")
      } else {
        document.execCommand("formatBlock", false, tag)
      }
    }
    descriptionRef.current?.focus()
    setIsTextSizeOpen(false)
    setTimeout(refreshDescFormats, 0)
  }, [refreshDescFormats])

  const handleDescContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    refreshDescFormats()
    setFormatToolbar({ x: e.clientX, y: e.clientY })
  }, [refreshDescFormats])

  const prevSelectedTaskIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (selectedTaskId && selectedTaskId !== prevSelectedTaskIdRef.current && descriptionRef.current) {
      const task = tasks.find((t) => t.id === selectedTaskId)
      if (task) descriptionRef.current.innerHTML = task.description || ""
    }
    prevSelectedTaskIdRef.current = selectedTaskId
  }, [selectedTaskId, tasks])

  const chargeTypes = [{ value: "", label: "No charge" }, ...enabledCharges.map((c) => ({ value: c.itemNumber, label: c.shortName }))]

  const secondaryChargeLabel = (val: string) => {
    if (!val) return ""
    const svc = serviceChargeTypes.find((s) => s.value === val)
    if (svc) return svc.label
    const ndis = allCharges.find((c) => c.itemNumber === val)
    if (ndis) return ndis.shortName
    return val
  }

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null

  const handleUpdateTask = useCallback((field: keyof Task, value: string | Attachment[] | boolean | number) => {
    if (!selectedTaskId) return
    updateTask(selectedTaskId, { [field]: value } as Partial<Task>)
  }, [selectedTaskId, updateTask])

  const handleDetailFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTaskId || !e.target.files) return
    const task = tasks.find((t) => t.id === selectedTaskId)
    if (!task) return
    const added: Attachment[] = Array.from(e.target.files).map((f) => ({ id: crypto.randomUUID(), name: f.name, size: f.size }))
    updateTask(selectedTaskId, { attachments: [...task.attachments, ...added] })
    e.target.value = ""
  }

  const _handleDetailRemoveAttachment = (attachmentId: string) => {
    if (!selectedTaskId) return
    const task = tasks.find((t) => t.id === selectedTaskId)
    if (!task) return
    updateTask(selectedTaskId, { attachments: task.attachments.filter((a) => a.id !== attachmentId) })
  }

  const handleDeleteTask = (id: string) => {
    deleteTaskDb(id)
    if (selectedTaskId === id) setSelectedTaskId(null)
  }

  const closeDetail = () => {
    setSelectedTaskId(null); setDetailDropdown(null); setFormatToolbar(null); setIsTextSizeOpen(false)
  }

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

  const completedTasks = useMemo(() => {
    let result = tasks.filter((t) => t.status === "done")

    if (displayClients.length > 0) result = result.filter((t) => displayClients.includes(t.client))
    if (displayAssignees.length > 0) result = result.filter((t) => displayAssignees.includes(t.assignee))

    if (participantFilter.length > 0) result = result.filter((t) => participantFilter.includes(t.client))
    if (assigneeFilter.length > 0) result = result.filter((t) => assigneeFilter.includes(t.assignee))
    if (chargeFilter.length > 0) result = result.filter((t) => chargeFilter.includes(t.chargeType))

    return result.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return b.dueDate.localeCompare(a.dueDate)
    })
  }, [tasks, displayClients, displayAssignees, participantFilter, assigneeFilter, chargeFilter])

  const uniqueParticipants = Array.from(new Set(completedTasks.map((t) => t.client).filter(Boolean)))
  const uniqueAssignees = Array.from(new Set(completedTasks.map((t) => t.assignee).filter(Boolean)))
  const uniqueCharges = Array.from(new Set(completedTasks.map((t) => t.chargeType).filter(Boolean))).sort()

  const toggleDisplayItem = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  const displayFilterCount = displayClients.length + displayAssignees.length
  const hasDisplayFilters = displayFilterCount > 0
  const hasActiveFilters = participantFilter.length > 0 || assigneeFilter.length > 0 || chargeFilter.length > 0

  const handleResetDisplay = () => {
    setDisplayClients([])
    setDisplayAssignees([])
  }

  const isColVisible = (key: string) => visibleColumnKeys.includes(key)

  const visibleColumns = columnDefs.filter(
    (col) => ("alwaysVisible" in col && col.alwaysVisible) || visibleColumnKeys.includes(col.key)
  )
  const gridTemplate = visibleColumns.map((c) => c.width).join(" ")

  const renderTaskRow = (task: Task) => {
    const dateStr = formatRowDate(task.dueDate)
    const clientInitials = task.client ? task.client.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : ""
    const assigneeInitials = task.assignee ? task.assignee.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : ""
    return (
      <div
        key={task.id}
        onClick={() => setSelectedTaskId(task.id)}
        className="group grid cursor-pointer items-center border-b border-[#f0f0f0] px-[24px] transition-colors hover:bg-[#fafafa]"
        style={{ gridTemplateColumns: gridTemplate }}
      >
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
          <span className="text-[13px] text-[#262626]">{task.title}</span>
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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
        <div className="flex items-center gap-[8px]">
          <span className="text-[13px] font-medium text-[#262626]">Invoicing</span>
        </div>
      </div>

      {/* Filter & display bar */}
      <div className="flex h-[41px] shrink-0 items-center gap-[8px] border-b border-[#dcdcdc] px-[16px]">
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
              <div className="absolute left-0 top-full z-[60] mt-[4px] w-[180px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                <p className="px-[16px] py-[6px] text-[11px] font-medium text-[#888]">Filter by</p>
                {[
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

        {/* Active filter pills */}
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
        {/* Display button — far right */}
        <div className="relative ml-auto">
          <button
            ref={displayBtnRef}
            onClick={() => setIsDisplayOpen(!isDisplayOpen)}
            className={`flex items-center gap-[5px] rounded border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${hasDisplayFilters ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" : "border-[#dcdcdc] text-[#262626] hover:bg-[#f5f5f5]"}`}
            tabIndex={0}
          >
            <SlidersHorizontal className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Display</span>
            {hasDisplayFilters && (
              <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded bg-blue-500 px-[4px] text-[10px] font-bold text-white">
                {displayFilterCount}
              </span>
            )}
          </button>
          {isDisplayOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDisplayOpen(false)} />
              <div
                className="fixed z-50 w-[420px] rounded-lg border border-[#dcdcdc] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                style={(() => {
                  const rect = displayBtnRef.current?.getBoundingClientRect()
                  if (!rect) return {}
                  return { top: rect.bottom + 4, right: window.innerWidth - rect.right }
                })()}
              >
                <div className="max-h-[520px] overflow-y-auto">
                  {clientNames.length > 0 && (
                    <div className="px-[20px] pb-[16px] pt-[14px]">
                      <div className="pb-[12px] text-[13px] font-medium text-[#888]">Clients</div>
                      <div className="flex flex-wrap gap-[8px]">
                        {clientNames.map((name) => {
                          const isActive = displayClients.includes(name)
                          return (
                            <button
                              key={name}
                              onClick={() => toggleDisplayItem(displayClients, setDisplayClients, name)}
                              className={`inline-flex items-center rounded-lg border px-[10px] py-[5px] text-[12px] font-medium transition-colors ${isActive ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-[#dcdcdc] bg-transparent text-[#262626] hover:bg-[#f5f5f5]"}`}
                              tabIndex={0}
                            >
                              {name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {staffNames.length > 0 && (
                    <div className="px-[20px] pb-[16px] pt-[2px]">
                      <div className="pb-[12px] text-[13px] font-medium text-[#888]">Person</div>
                      <div className="flex flex-wrap gap-[8px]">
                        {staffNames.map((name) => {
                          const isActive = displayAssignees.includes(name)
                          return (
                            <button
                              key={name}
                              onClick={() => toggleDisplayItem(displayAssignees, setDisplayAssignees, name)}
                              className={`inline-flex items-center rounded-lg border px-[10px] py-[5px] text-[12px] font-medium transition-colors ${isActive ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-[#dcdcdc] bg-transparent text-[#262626] hover:bg-[#f5f5f5]"}`}
                              tabIndex={0}
                            >
                              {name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-[20px] border-t border-[#f0f0f0] px-[20px] py-[12px]">
                  <button
                    onClick={() => { handleResetDisplay(); setIsDisplayOpen(false) }}
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
      </div>

      {/* Filter dropdowns */}
      {activeFilterDropdown && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setActiveFilterDropdown(null)} />
          <div
            className="fixed z-[60] w-[240px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            style={(() => {
              const ref = filterPillRefs.current[activeFilterDropdown] || filterBtnRef.current
              const rect = ref?.getBoundingClientRect()
              if (!rect) return {}
              return { top: rect.bottom + 4, left: rect.left }
            })()}
          >
            {activeFilterDropdown === "participant" && (
              <>
                {(uniqueParticipants.length > 0 ? uniqueParticipants : clientNames).map((name) => {
                  const isActive = participantFilter.includes(name)
                  const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                  return (
                    <button key={name} onClick={() => toggleDisplayItem(participantFilter, setParticipantFilter, name)} className={`flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-blue-50 text-blue-600" : "text-[#262626]"}`} tabIndex={0}>
                      <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded bg-blue-100 text-[8px] font-bold text-blue-600">{initials}</span>
                      {name}
                    </button>
                  )
                })}
                <button onClick={() => { setParticipantFilter([]); setActiveFilterDropdown(null) }} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>Clear</button>
              </>
            )}
            {activeFilterDropdown === "assignee" && (
              <>
                {(uniqueAssignees.length > 0 ? uniqueAssignees : staffNames).map((name) => {
                  const isActive = assigneeFilter.includes(name)
                  const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                  return (
                    <button key={name} onClick={() => toggleDisplayItem(assigneeFilter, setAssigneeFilter, name)} className={`flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-blue-50 text-blue-600" : "text-[#262626]"}`} tabIndex={0}>
                      <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded bg-[#e8e8e8] text-[8px] font-bold text-[#555]">{initials}</span>
                      {name}
                    </button>
                  )
                })}
                <button onClick={() => { setAssigneeFilter([]); setActiveFilterDropdown(null) }} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>Clear</button>
              </>
            )}
            {activeFilterDropdown === "charge" && (
              <>
                {uniqueCharges.map((val) => {
                  const isActive = chargeFilter.includes(val)
                  return (
                    <button key={val} onClick={() => toggleDisplayItem(chargeFilter, setChargeFilter, val)} className={`flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-blue-50 text-blue-600" : "text-[#262626]"}`} tabIndex={0}>
                      {chargeLabel(val)}
                    </button>
                  )
                })}
                <button onClick={() => { setChargeFilter([]); setActiveFilterDropdown(null) }} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>Clear</button>
              </>
            )}
          </div>
        </>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto bg-white">
        {completedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-[80px] text-center">
            <Receipt className="h-[32px] w-[32px] text-[#ddd]" strokeWidth={1.5} />
            <p className="mt-[12px] text-[14px] font-medium text-[#999]">
              {hasActiveFilters || hasDisplayFilters ? "No completed shifts match your filters" : "No completed shifts yet"}
            </p>
            <p className="mt-[4px] text-[12px] text-[#bbb]">
              {!hasActiveFilters && !hasDisplayFilters && "When coordinators complete tasks, they\u2019ll appear here"}
            </p>
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-[1] grid items-center border-b border-[#e0e0e0] bg-white px-[24px]" style={{ gridTemplateColumns: gridTemplate }}>
              {visibleColumns.map((col) => {
                const Icon = col.icon
                return (
                  <div key={col.key} className={`flex items-center py-[9px] ${col.key === "title" ? "pl-[8px]" : "justify-center"}`}>
                    <Icon className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} />
                  </div>
                )
              })}
            </div>
            {completedTasks.map(renderTaskRow)}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-[12px] border-t border-[#f0f0f0] px-[16px] py-[8px]">
        <span className="text-[12px] text-[#bbb]">{completedTasks.length} shift{completedTasks.length !== 1 ? "s" : ""}</span>
      </div>

      {selectedTask && (() => {
        const assigneeInitials = selectedTask.assignee
          ? selectedTask.assignee.split(" ").filter(Boolean).map((part) => part[0]).join("").toUpperCase().slice(0, 2)
          : ""

        return (
          <>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
            <div className="absolute inset-0 bg-black/20" onClick={closeDetail} />
            <div className="relative z-10 flex h-[680px] max-h-[calc(100vh-32px)] w-[960px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[20px] border border-[#e7e7e7] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <input
                ref={detailFileInputRef}
                type="file"
                multiple
                onChange={handleDetailFileSelect}
                className="hidden"
              />

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
                      onChange={(e) => handleUpdateTask("title", e.target.value)}
                      className="w-full bg-transparent text-[18px] font-semibold text-[#262626] placeholder-[#8f8f8f] outline-none"
                    />
                  </div>

                  <div
                    ref={descriptionRef}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder="Start typing a description..."
                    onInput={() => {
                      if (descriptionRef.current) handleUpdateTask("description", descriptionRef.current.innerHTML)
                    }}
                    onContextMenu={handleDescContextMenu}
                    dangerouslySetInnerHTML={!descriptionRef.current ? { __html: selectedTask.description } : undefined}
                    className="mt-[14px] min-h-[80px] flex-1 overflow-y-auto text-[14px] leading-[1.6] text-[#4b4b4b] outline-none [&:empty]:before:pointer-events-none [&:empty]:before:text-[#b5b5b5] [&:empty]:before:content-[attr(data-placeholder)] [&_ul]:list-disc [&_ul]:pl-[20px] [&_ol]:list-decimal [&_ol]:pl-[20px] [&_li]:my-[2px] [&_h1]:text-[22px] [&_h1]:font-bold [&_h1]:leading-[1.3] [&_h1]:my-[4px] [&_h2]:text-[18px] [&_h2]:font-semibold [&_h2]:leading-[1.4] [&_h2]:my-[3px] [&_h3]:text-[15px] [&_h3]:font-medium [&_h3]:leading-[1.5] [&_h3]:my-[2px]"
                  />

                  <div className="mt-[16px] flex items-center gap-[8px] border-t border-[#f1f1f1] pt-[14px]">
                    <button
                      type="button"
                      onClick={closeDetail}
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
                      onClick={() => handleDeleteTask(selectedTask.id)}
                      className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#bbb] transition-colors hover:bg-[#f5f5f5] hover:text-red-500"
                      tabIndex={0}
                      aria-label="Delete task"
                    >
                      <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={closeDetail}
                      className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                      tabIndex={0}
                      aria-label="Close"
                    >
                      <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
                    </button>
                  </div>

                  <div className="mt-[18px] flex flex-col gap-[14px]">
                    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                      <span className="text-[13px] font-medium text-[#8d8d8d]">Customer</span>
                      <button
                        ref={detailClientRef}
                        type="button"
                        onClick={() => { setDetailDropdown(detailDropdown === "detail-client" ? null : "detail-client"); setDetailClientIdx(-1) }}
                        onKeyDown={(e) => {
                          if (detailDropdown === "detail-client") {
                            const total = clientNames.length + 1
                            if (e.key === "ArrowDown") { e.preventDefault(); setDetailClientIdx((p) => (p + 1) % total) }
                            else if (e.key === "ArrowUp") { e.preventDefault(); setDetailClientIdx((p) => (p - 1 + total) % total) }
                            else if (e.key === "Enter") {
                              e.preventDefault()
                              const val = detailClientIdx === 0 ? "" : clientNames[detailClientIdx - 1] ?? ""
                              handleUpdateTask("client", val)
                              setDetailDropdown(null)
                              setDetailClientIdx(-1)
                            }
                            else if (e.key === "Escape") { e.stopPropagation(); setDetailDropdown(null); setDetailClientIdx(-1) }
                          }
                        }}
                        className="flex min-w-0 items-center gap-[8px] rounded-[10px] px-[8px] py-[6px] text-left transition-colors hover:bg-[#f7f7f7]"
                        tabIndex={0}
                      >
                        {selectedTask.client ? (
                          <>
                            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-blue-100 text-[9px] font-bold text-blue-600">
                              {selectedTask.client.split(" ").filter(Boolean).map((part) => part[0]).join("").toUpperCase().slice(0, 2)}
                            </span>
                            <span className="truncate text-[13px] font-medium text-[#262626]">{selectedTask.client}</span>
                          </>
                        ) : (
                          <span className="text-[13px] font-medium text-[#b0b0b0]">Empty</span>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                      <span className="text-[13px] font-medium text-[#8d8d8d]">Assignee</span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setDetailDropdown(detailDropdown === "detail-assignee" ? null : "detail-assignee")}
                          className="flex min-w-0 items-center gap-[8px] rounded-[10px] px-[8px] py-[6px] text-left transition-colors hover:bg-[#f7f7f7]"
                          tabIndex={0}
                        >
                          {assigneeInitials ? (
                            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-[#f0f0f0] text-[9px] font-bold text-[#555]">
                              {assigneeInitials}
                            </span>
                          ) : null}
                          <span className={`truncate text-[13px] font-medium ${selectedTask.assignee ? "text-[#262626]" : "text-[#b0b0b0]"}`}>
                            {selectedTask.assignee || "Empty"}
                          </span>
                        </button>
                        {detailDropdown === "detail-assignee" && (
                          <>
                            <div className="fixed inset-0 z-[59]" onClick={() => setDetailDropdown(null)} />
                            <div className="absolute left-0 top-full z-[60] mt-[4px] max-h-[200px] min-w-[180px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                              <div
                                onClick={() => { handleUpdateTask("assignee", ""); setDetailDropdown(null) }}
                                className="flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5]"
                                role="option"
                                aria-selected={!selectedTask.assignee}
                              >
                                None
                              </div>
                              {staffNames.map((name) => {
                                const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                                return (
                                  <div
                                    key={name}
                                    onClick={() => { handleUpdateTask("assignee", name); setDetailDropdown(null) }}
                                    className={`flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${selectedTask.assignee === name ? "bg-[#f5f5f5]" : ""}`}
                                    role="option"
                                    aria-selected={selectedTask.assignee === name}
                                  >
                                    <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#d4d4d4] text-[9px] font-semibold text-[#555]">
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
                    </div>

                    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                      <span className="text-[13px] font-medium text-[#8d8d8d]">Due date</span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setDetailDropdown(detailDropdown === "detail-date" ? null : "detail-date")}
                          className="flex min-w-0 items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] text-left transition-colors hover:bg-[#f7f7f7]"
                          tabIndex={0}
                        >
                          <CalendarDays className="h-[13px] w-[13px] shrink-0 text-[#888]" strokeWidth={1.5} />
                          <span className={`truncate text-[13px] font-medium ${selectedTask.dueDate ? "text-[#262626]" : "text-[#b0b0b0]"}`}>
                            {selectedTask.dueDate
                              ? new Date(selectedTask.dueDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })
                              : "Empty"}
                          </span>
                        </button>
                        {detailDropdown === "detail-date" && (
                          <>
                            <div className="fixed inset-0 z-[59]" onClick={() => setDetailDropdown(null)} />
                            <div className="absolute left-0 top-full z-[60] mt-[6px]">
                              <DatePicker
                                value={selectedTask.dueDate || ""}
                                onChange={(val) => handleUpdateTask("dueDate", val)}
                                onClose={() => setDetailDropdown(null)}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                      <span className="text-[13px] font-medium text-[#8d8d8d]">Charge</span>
                      <button
                        ref={detailChargeRef}
                        type="button"
                        onClick={() => setDetailDropdown(detailDropdown === "detail-charge" ? null : "detail-charge")}
                        className="flex min-w-0 items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] text-left transition-colors hover:bg-[#f7f7f7]"
                        tabIndex={0}
                      >
                        {selectedTask.chargeType ? (
                          <span className="truncate rounded-md bg-[#f0f0f0] px-[8px] py-[3px] text-[12px] font-semibold text-[#555]">
                            {chargeLabel(selectedTask.chargeType)}
                          </span>
                        ) : (
                          <>
                            <Tag className="h-[13px] w-[13px] shrink-0 text-[#888]" strokeWidth={1.5} />
                            <span className="text-[13px] font-medium text-[#b0b0b0]">Empty</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                      <span className="text-[13px] font-medium text-[#8d8d8d]">Secondary</span>
                      <button
                        ref={detailSecondaryChargeRef}
                        type="button"
                        onClick={() => setDetailDropdown(detailDropdown === "detail-secondary-charge" ? null : "detail-secondary-charge")}
                        className="flex min-w-0 items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] text-left transition-colors hover:bg-[#f7f7f7]"
                        tabIndex={0}
                      >
                        {selectedTask.secondaryChargeType ? (
                          <span className="truncate rounded-md bg-[#f0f0f0] px-[8px] py-[3px] text-[12px] font-semibold text-[#555]">
                            {secondaryChargeLabel(selectedTask.secondaryChargeType)}
                          </span>
                        ) : (
                          <>
                            <Tag className="h-[13px] w-[13px] shrink-0 text-[#888]" strokeWidth={1.5} />
                            <span className="text-[13px] font-medium text-[#b0b0b0]">Empty</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                      <span className="text-[13px] font-medium text-[#8d8d8d]">Time</span>
                      <div className="flex items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] transition-colors hover:bg-[#f7f7f7]">
                        <Clock className="h-[13px] w-[13px] shrink-0 text-[#888]" strokeWidth={1.5} />
                        <input
                          key={selectedTask.timeSpent}
                          type="text"
                          defaultValue={selectedTask.timeSpent > 0 ? formatTime(selectedTask.timeSpent) : ""}
                          placeholder="Empty"
                          onBlur={(e) => handleUpdateTask("timeSpent", parseTimeInput(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleUpdateTask("timeSpent", parseTimeInput(e.currentTarget.value))
                              e.currentTarget.blur()
                            }
                          }}
                          className="w-full bg-transparent text-[13px] font-medium text-[#262626] placeholder-[#b0b0b0] outline-none"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {detailDropdown === "detail-client" && detailClientRef.current && (() => {
            const rect = detailClientRef.current.getBoundingClientRect()
            return (
              <div
                className="fixed z-[60] max-h-[200px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                style={{ top: rect.bottom + 4, left: rect.left, minWidth: 180 }}
              >
                <div
                  onClick={() => { handleUpdateTask("client", ""); setDetailDropdown(null); setDetailClientIdx(-1) }}
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
                      onClick={() => { handleUpdateTask("client", name); setDetailDropdown(null); setDetailClientIdx(-1) }}
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

          {detailDropdown === "detail-charge" && selectedTask && detailChargeRef.current && (() => {
            const rect = detailChargeRef.current.getBoundingClientRect()
            return (
              <div
                className="fixed z-[60] max-h-[220px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                style={{ top: rect.bottom + 6, left: rect.left, minWidth: Math.max(rect.width, 220) }}
              >
                {chargeTypes.map((ct) => (
                  <div
                    key={ct.value}
                    onClick={() => { handleUpdateTask("chargeType", ct.value); setDetailDropdown(null) }}
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

          {detailDropdown === "detail-secondary-charge" && selectedTask && detailSecondaryChargeRef.current && (() => {
            const rect = detailSecondaryChargeRef.current.getBoundingClientRect()
            return (
              <div
                className="fixed z-[60] max-h-[260px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                style={{ top: rect.bottom + 6, left: rect.left, minWidth: Math.max(rect.width, 220) }}
              >
                <div
                  onClick={() => { handleUpdateTask("secondaryChargeType", ""); setDetailDropdown(null) }}
                  className={`flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] ${!selectedTask.secondaryChargeType ? "bg-[#f5f5f5]" : ""}`}
                  role="option"
                  aria-selected={!selectedTask.secondaryChargeType}
                >
                  No charge
                </div>
                <div className="my-[2px] border-t border-[#f0f0f0]" />
                <div className="px-[12px] py-[4px] text-[10px] font-semibold uppercase tracking-[0.05em] text-[#aaa]">Service type</div>
                {serviceChargeTypes.map((sct) => (
                  <div
                    key={sct.value}
                    onClick={() => { handleUpdateTask("secondaryChargeType", sct.value); setDetailDropdown(null) }}
                    className={`flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${selectedTask.secondaryChargeType === sct.value ? "bg-[#f5f5f5]" : ""}`}
                    role="option"
                    aria-selected={selectedTask.secondaryChargeType === sct.value}
                  >
                    {sct.label}
                  </div>
                ))}
                {enabledCharges.length > 0 && (
                  <>
                    <div className="my-[2px] border-t border-[#f0f0f0]" />
                    <div className="px-[12px] py-[4px] text-[10px] font-semibold uppercase tracking-[0.05em] text-[#aaa]">NDIS line item</div>
                    {enabledCharges.map((c) => (
                      <div
                        key={c.itemNumber}
                        onClick={() => { handleUpdateTask("secondaryChargeType", c.itemNumber); setDetailDropdown(null) }}
                        className={`flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${selectedTask.secondaryChargeType === c.itemNumber ? "bg-[#f5f5f5]" : ""}`}
                        role="option"
                        aria-selected={selectedTask.secondaryChargeType === c.itemNumber}
                      >
                        {c.shortName}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )
          })()}
          </>
        )
      })()}

      {formatToolbar && (
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => { setFormatToolbar(null); setIsTextSizeOpen(false) }} onContextMenu={(e) => { e.preventDefault(); setFormatToolbar(null); setIsTextSizeOpen(false) }} />
          <div
            className="fixed z-[80] flex items-center gap-[2px] rounded-lg border border-[#e0e0e0] bg-white px-[6px] py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            style={{ top: formatToolbar.y - 44, left: formatToolbar.x - 100 }}
          >
            <div className="relative">
              <button
                onMouseDown={(e) => { e.preventDefault(); setIsTextSizeOpen(!isTextSizeOpen) }}
                className={`flex h-[28px] items-center gap-[3px] rounded-md px-[6px] transition-colors ${isTextSizeOpen || currentBlock === "h1" || currentBlock === "h2" || currentBlock === "h3" ? "bg-[#e8e8e8] text-[#262626]" : "text-[#666] hover:bg-[#f0f0f0] hover:text-[#262626]"}`}
                tabIndex={0}
                aria-label="Text size"
                title="Text size"
              >
                <Type className="h-[14px] w-[14px]" strokeWidth={2} />
                <ChevronDown className="h-[10px] w-[10px]" strokeWidth={2} />
              </button>
              {isTextSizeOpen && (
                <div className="absolute left-0 top-full z-[90] mt-[4px] w-[140px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                  {([
                    { tag: "h1", label: "Heading", className: "text-[16px] font-bold" },
                    { tag: "h2", label: "Subheading", className: "text-[14px] font-semibold" },
                    { tag: "h3", label: "Small", className: "text-[13px] font-medium" },
                    { tag: "p", label: "Normal", className: "text-[13px] font-normal" },
                  ] as const).map(({ tag, label, className }) => (
                    <button
                      key={tag}
                      onMouseDown={(e) => { e.preventDefault(); handleTextSize(tag) }}
                      className={`flex w-full items-center px-[12px] py-[6px] transition-colors hover:bg-[#f5f5f5] ${currentBlock === tag ? "bg-[#f0f0f0]" : ""}`}
                      tabIndex={0}
                    >
                      <span className={`text-[#262626] ${className}`}>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mx-[2px] h-[16px] w-px bg-[#e8e8e8]" />
            {([
              { cmd: "bold", Icon: Bold, label: "Bold" },
              { cmd: "italic", Icon: Italic, label: "Italic" },
              { cmd: "underline", Icon: Underline, label: "Underline" },
              { cmd: "strikeThrough", Icon: Strikethrough, label: "Strikethrough" },
            ] as const).map(({ cmd, Icon, label }) => (
              <button
                key={cmd}
                onMouseDown={(e) => { e.preventDefault(); handleDescFormat(cmd) }}
                className={`flex h-[28px] w-[28px] items-center justify-center rounded-md transition-colors ${descFormats[cmd] ? "bg-[#e8e8e8] text-[#262626]" : "text-[#666] hover:bg-[#f0f0f0] hover:text-[#262626]"}`}
                tabIndex={0}
                aria-label={label}
                title={label}
              >
                <Icon className="h-[14px] w-[14px]" strokeWidth={2} />
              </button>
            ))}
            <div className="mx-[2px] h-[16px] w-px bg-[#e8e8e8]" />
            <button
              onMouseDown={(e) => { e.preventDefault(); handleDescFormat("insertUnorderedList") }}
              className={`flex h-[28px] w-[28px] items-center justify-center rounded-md transition-colors ${descFormats.insertUnorderedList ? "bg-[#e8e8e8] text-[#262626]" : "text-[#666] hover:bg-[#f0f0f0] hover:text-[#262626]"}`}
              tabIndex={0}
              aria-label="Bullet list"
              title="Bullet list"
            >
              <List className="h-[14px] w-[14px]" strokeWidth={2} />
            </button>
          </div>
        </>
      )}

    </div>
  )
}
