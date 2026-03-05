"use client"

import { useState, useRef, useCallback } from "react"
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
  DollarSign,
} from "lucide-react"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useClients } from "@/lib/hooks/use-clients"
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

function formatDateGroup(dateStr: string | null): string {
  if (!dateStr) return "No due date"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + "T00:00:00")
  d.setHours(0, 0, 0, 0)
  const diff = d.getTime() - today.getTime()
  const dayMs = 86400000
  if (diff === 0) return "Today"
  if (diff === dayMs) return "Tomorrow"
  if (diff === -dayMs) return "Yesterday"
  if (diff > 0 && diff <= 7 * dayMs) return "This week"
  if (diff < 0) return "Overdue"
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}

function groupDateOrder(group: string): number {
  const order: Record<string, number> = { "Overdue": 0, "Yesterday": 1, "Today": 2, "Tomorrow": 3, "This week": 4, "No due date": 99 }
  return order[group] ?? 50
}

const defaultNewTask = { title: "", description: "", status: "todo" as Task["status"], assignee: "Sam Lee", client: "", dueDate: "" }

export default function TasksPage() {
  const { tasks, addTask, updateTask: updateTaskDb, deleteTask: deleteTaskDb } = useTasks()
  const { clientNames } = useClients()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({ ...defaultNewTask })
  const [newAttachments, setNewAttachments] = useState<Attachment[]>([])
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const statusPillRef = useRef<HTMLButtonElement>(null)
  const clientPillRef = useRef<HTMLButtonElement>(null)
  const dueDateRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const detailStatusRef = useRef<HTMLButtonElement>(null)
  const detailClientRef = useRef<HTMLButtonElement>(null)
  const detailDueDateRef = useRef<HTMLInputElement>(null)
  const detailFileInputRef = useRef<HTMLInputElement>(null)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false)
  const statusFilterRef = useRef<HTMLButtonElement>(null)

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
      billable: false,
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

  const groups: Record<string, Task[]> = {}
  for (const task of filtered) {
    const key = formatDateGroup(task.dueDate)
    if (!groups[key]) groups[key] = []
    groups[key].push(task)
  }
  const sortedGroupKeys = Object.keys(groups).sort((a, b) => groupDateOrder(a) - groupDateOrder(b))

  const taskCount = filtered.length

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
        <div className="flex items-center gap-[12px]">
          <span className="text-[13px] font-medium text-[#262626]">Tasks</span>
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

          {/* Task list */}
          <div className="flex-1 overflow-y-auto bg-[#fafafa]">
            {sortedGroupKeys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-[60px]">
                <p className="text-[13px] font-medium text-[#bbb]">No tasks match the current filter</p>
              </div>
            ) : (
              sortedGroupKeys.map((groupKey) => {
                const groupTasks = groups[groupKey]
                const isToday = groupKey === "Today"
                const isEmpty = groupTasks.length === 0

                return (
                  <div key={groupKey}>
                    <div className={`sticky top-0 z-10 border-b border-[#f0f0f0] bg-[#fafafa] px-[20px] py-[8px] text-[12px] font-semibold ${isToday ? "text-blue-500" : "text-[#262626]"}`}>
                      {groupKey}
                    </div>
                    {isEmpty ? (
                      <div className="border-b border-[#f0f0f0] px-[20px] py-[12px] text-[13px] font-medium text-[#bbb]">
                        No tasks {groupKey.toLowerCase()}
                      </div>
                    ) : (
                      groupTasks.map((task) => {
                        const s = statusConfig[task.status]
                        return (
                          <div
                            key={task.id}
                            className="group flex cursor-pointer items-center gap-[12px] border-b border-[#f0f0f0] px-[20px] py-[10px] transition-colors hover:bg-[#f5f5f5]"
                            onClick={() => setSelectedTaskId(task.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter") setSelectedTaskId(task.id) }}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleComplete(task.id) }}
                              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${
                                task.status === "done"
                                  ? "border-green-500 bg-green-500 text-white"
                                  : "border-[#d0d0d0] hover:border-[#999]"
                              }`}
                              tabIndex={0}
                              aria-label={task.status === "done" ? "Mark as incomplete" : "Mark as complete"}
                            >
                              {task.status === "done" && <span className="text-[10px]">✓</span>}
                            </button>
                            <span className={`flex-1 text-[13px] font-medium ${task.status === "done" ? "text-[#bbb] line-through" : "text-[#262626]"}`}>
                              {task.title}
                            </span>
                            <div className="flex items-center gap-[8px]">
                              <Circle className="h-[8px] w-[8px] shrink-0" fill={s.color} stroke="none" />
                              {task.client && (
                                <span className="inline-flex h-[26px] items-center whitespace-nowrap rounded border border-[#dcdcdc] px-[8px] text-[12px] font-medium text-[#262626]">
                                  {task.client}
                                </span>
                              )}
                              {task.attachments.length > 0 && (
                                <span className="flex items-center gap-[4px] text-[12px] font-medium text-[#888]">
                                  <Paperclip className="h-[12px] w-[12px]" strokeWidth={1.5} />
                                  {task.attachments.length}
                                </span>
                              )}
                              <button
                                className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#bbb] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#ebebeb] hover:text-[#262626]"
                                tabIndex={0}
                                aria-label="More options"
                              >
                                <MoreHorizontal className="h-[14px] w-[14px]" strokeWidth={1.5} />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )
              })
            )}

            {/* "Today" group if not already present */}
            {!sortedGroupKeys.includes("Today") && tasks.length > 0 && (
              <div>
                <div className="sticky top-0 z-10 border-b border-[#f0f0f0] bg-[#fafafa] px-[20px] py-[8px] text-[12px] font-semibold text-blue-500">
                  Today
                </div>
                <div className="border-b border-[#f0f0f0] px-[20px] py-[12px] text-[13px] font-medium text-[#bbb]">
                  No tasks today
                </div>
              </div>
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
                  onClick={() => setActiveDropdown(activeDropdown === "client" ? null : "client")}
                  className="flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px] text-[12px] font-medium transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <Building2 className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
                  <span className={newTask.client ? "text-[#262626]" : "text-[#888]"}>
                    {newTask.client || "Client"}
                  </span>
                </button>

                {/* Due date pill */}
                <button
                  type="button"
                  onClick={() => dueDateRef.current?.showPicker()}
                  className="relative flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px] text-[12px] font-medium transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <CalendarDays className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
                  <span className={newTask.dueDate ? "text-[#262626]" : "text-[#888]"}>
                    {newTask.dueDate
                      ? new Date(newTask.dueDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })
                      : "Due date"}
                  </span>
                  <input
                    ref={dueDateRef}
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="pointer-events-none absolute inset-0 opacity-0"
                    tabIndex={-1}
                  />
                </button>

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
                <button
                  type="button"
                  onClick={() => {
                    setNewTask({ ...newTask, client: "" })
                    setActiveDropdown(null)
                  }}
                  className={`flex w-full items-center px-[12px] py-[8px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] ${!newTask.client ? "bg-[#f5f5f5]" : ""}`}
                  tabIndex={0}
                >
                  None
                </button>
                {clientNames.map((name) => {
                  const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setNewTask({ ...newTask, client: name })
                        setActiveDropdown(null)
                      }}
                      className={`flex w-full items-center gap-[8px] px-[12px] py-[8px] text-left text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${newTask.client === name ? "bg-[#f5f5f5]" : ""}`}
                      tabIndex={0}
                    >
                      <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#d4d4d4] text-[9px] font-semibold text-[#555]">
                        {initials}
                      </div>
                      {name}
                    </button>
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

                <button
                  type="button"
                  onClick={() => detailDueDateRef.current?.showPicker()}
                  className="relative flex items-center gap-[5px] rounded border border-[#e0e0e0] px-[8px] py-[4px] text-[12px] font-medium transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <CalendarDays className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
                  <span className={selectedTask.dueDate ? "text-[#262626]" : "text-[#888]"}>
                    {selectedTask.dueDate
                      ? new Date(selectedTask.dueDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })
                      : "Due date"}
                  </span>
                  <input
                    ref={detailDueDateRef}
                    type="date"
                    value={selectedTask.dueDate || ""}
                    onChange={(e) => handleUpdateTask("dueDate", e.target.value || "")}
                    className="pointer-events-none absolute inset-0 opacity-0"
                    tabIndex={-1}
                  />
                </button>
              </div>

              {/* Row 2: Client, Billable, Time spent */}
              <div className="flex flex-wrap items-center gap-[6px]">
                <button
                  ref={detailClientRef}
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === "detail-client" ? null : "detail-client")}
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
                  onClick={() => handleUpdateTask("billable", !selectedTask.billable)}
                  className={`flex items-center gap-[5px] rounded border px-[8px] py-[4px] text-[12px] font-medium transition-colors hover:bg-[#f5f5f5] ${selectedTask.billable ? "border-green-300 bg-green-50" : "border-[#e0e0e0]"}`}
                  tabIndex={0}
                >
                  <DollarSign className={`h-[12px] w-[12px] ${selectedTask.billable ? "text-green-600" : "text-[#888]"}`} strokeWidth={1.5} />
                  <span className={selectedTask.billable ? "text-green-700" : "text-[#888]"}>
                    {selectedTask.billable ? "Billable" : "Not billable"}
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
                <button
                  type="button"
                  onClick={() => { handleUpdateTask("client", ""); setActiveDropdown(null) }}
                  className={`flex w-full items-center px-[12px] py-[8px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] ${!selectedTask.client ? "bg-[#f5f5f5]" : ""}`}
                  tabIndex={0}
                >
                  None
                </button>
                {clientNames.map((name) => {
                  const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => { handleUpdateTask("client", name); setActiveDropdown(null) }}
                      className={`flex w-full items-center gap-[8px] px-[12px] py-[8px] text-left text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${selectedTask.client === name ? "bg-[#f5f5f5]" : ""}`}
                      tabIndex={0}
                    >
                      <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#d4d4d4] text-[9px] font-semibold text-[#555]">
                        {initials}
                      </div>
                      {name}
                    </button>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
