"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { sanitizeHtml } from "@/lib/sanitize"
import {
  SquareCheck,
  X,
  CalendarDays,
  Building2,
  Trash2,
  Clock,
  Tag,
  User,
  Bold,
  Italic,
  Underline,
  List,
  Strikethrough,
  Type,
  ChevronDown,
} from "lucide-react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { DatePicker } from "@/components/date-picker"
import { serviceChargeTypes } from "@/lib/ndis-charges"
import { formatTime, parseTimeInput } from "./task-helpers"
import type { Task, Attachment, Client } from "@/lib/types"

interface ChargeType {
  value: string
  label: string
}

interface EnabledCharge {
  itemNumber: string
  shortName: string
}

export interface TaskDetailModalProps {
  selectedTask: Task
  selectedTaskId: string
  tasks: Task[]
  onUpdateTask: (field: keyof Task, value: string | Attachment[] | boolean | number) => void
  onDeleteTask: (id: string) => void
  onClose: () => void
  chargeTypes: ChargeType[]
  chargeLabel: (val: string) => string
  secondaryChargeLabel: (val: string) => string
  clientNames: string[]
  clients: Client[]
  staffNames: string[]
  canAssignTasks: boolean
  enabledCharges: EnabledCharge[]
}

export function TaskDetailModal({
  selectedTask,
  selectedTaskId,
  tasks,
  onUpdateTask,
  onDeleteTask,
  onClose,
  chargeTypes,
  chargeLabel,
  secondaryChargeLabel,
  clientNames,
  clients,
  staffNames,
  canAssignTasks,
  enabledCharges,
}: TaskDetailModalProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [detailClientIdx, setDetailClientIdx] = useState(-1)
  const [detailClientSearch, setDetailClientSearch] = useState("")

  const detailClientRef = useRef<HTMLButtonElement>(null)
  const detailClientSearchRef = useRef<HTMLInputElement>(null)
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
    // Anchor the formatting toolbar to the bottom of the description field
    // instead of the cursor position, so it always opens at the bottom of the task.
    const rect = descriptionRef.current?.getBoundingClientRect()
    if (rect) setFormatToolbar({ x: rect.left, y: rect.bottom })
    else setFormatToolbar({ x: e.clientX, y: e.clientY })
  }, [refreshDescFormats])

  const prevSelectedTaskIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (selectedTaskId && selectedTaskId !== prevSelectedTaskIdRef.current && descriptionRef.current) {
      const task = tasks.find((t) => t.id === selectedTaskId)
      if (task) descriptionRef.current.innerHTML = sanitizeHtml(task.description || "")
    }
    prevSelectedTaskIdRef.current = selectedTaskId
  }, [selectedTaskId, tasks])

  const handleDetailFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTaskId || !e.target.files) return
    const task = tasks.find((t) => t.id === selectedTaskId)
    if (!task) return

    const files = Array.from(e.target.files)
    e.target.value = ""

    const supabase = isSupabaseConfigured() ? createClient() : null
    const newAttachments: Attachment[] = []

    for (const file of files) {
      const id = crypto.randomUUID()
      if (supabase) {
        const storagePath = `task-attachments/${selectedTaskId}/${id}-${file.name}`
        const { error } = await supabase.storage.from("documents").upload(storagePath, file)
        if (!error) {
          const { data: urlData } = supabase.storage.from("documents").getPublicUrl(storagePath)
          newAttachments.push({ id, name: file.name, size: file.size, storagePath, url: urlData.publicUrl })
        } else {
          newAttachments.push({ id, name: file.name, size: file.size })
        }
      } else {
        newAttachments.push({ id, name: file.name, size: file.size })
      }
    }

    onUpdateTask("attachments", [...task.attachments, ...newAttachments])
  }

  const handleCloseDetail = () => {
    setActiveDropdown(null)
    setFormatToolbar(null)
    setIsTextSizeOpen(false)
    onClose()
  }

  const assigneeInitials = selectedTask.assignee
    ? selectedTask.assignee.split(" ").filter(Boolean).map((part) => part[0]).join("").toUpperCase().slice(0, 2)
    : ""

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
        <div className="absolute inset-0 bg-black/20" onClick={handleCloseDetail} />
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
                  onChange={(e) => onUpdateTask("title", e.target.value)}
                  className="w-full bg-transparent text-[18px] font-semibold text-[#262626] placeholder-[#8f8f8f] outline-none"
                />
              </div>

              <div
                ref={descriptionRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Start typing a description..."
                onInput={() => {
                  if (descriptionRef.current) onUpdateTask("description", sanitizeHtml(descriptionRef.current.innerHTML))
                }}
                onContextMenu={handleDescContextMenu}
                dangerouslySetInnerHTML={!descriptionRef.current ? { __html: sanitizeHtml(selectedTask.description) } : undefined}
                className="mt-[14px] min-h-[80px] flex-1 overflow-y-auto text-[14px] leading-[1.6] text-[#4b4b4b] outline-none [&:empty]:before:pointer-events-none [&:empty]:before:text-[#b5b5b5] [&:empty]:before:content-[attr(data-placeholder)] [&_ul]:list-disc [&_ul]:pl-[20px] [&_ol]:list-decimal [&_ol]:pl-[20px] [&_li]:my-[2px] [&_h1]:text-[22px] [&_h1]:font-bold [&_h1]:leading-[1.3] [&_h1]:my-[4px] [&_h2]:text-[18px] [&_h2]:font-semibold [&_h2]:leading-[1.4] [&_h2]:my-[3px] [&_h3]:text-[15px] [&_h3]:font-medium [&_h3]:leading-[1.5] [&_h3]:my-[2px]"
              />

              <div className="mt-[16px] flex items-center gap-[8px] border-t border-[#f1f1f1] pt-[14px]">
                <button
                  type="button"
                  onClick={handleCloseDetail}
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
                  onClick={() => { onDeleteTask(selectedTask.id) }}
                  className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#bbb] transition-colors hover:bg-[#f5f5f5] hover:text-red-500"
                  tabIndex={0}
                  aria-label="Delete task"
                >
                  <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.5} />
                </button>
                <button
                  onClick={handleCloseDetail}
                  className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                  tabIndex={0}
                  aria-label="Close"
                >
                  <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
                </button>
              </div>

              <div className="mt-[18px] flex flex-col gap-[14px]">
                <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Client</span>
                  <button
                    ref={detailClientRef}
                    type="button"
                    onClick={() => {
                      const next = activeDropdown === "detail-client" ? null : "detail-client"
                      setActiveDropdown(next)
                      setDetailClientIdx(-1)
                      setDetailClientSearch("")
                      if (next) setTimeout(() => detailClientSearchRef.current?.focus(), 50)
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
                      <>
                        <Building2 className="h-[13px] w-[13px] shrink-0 text-[#ccc]" strokeWidth={1.5} />
                        <span className="text-[13px] font-medium text-[#ccc]">Empty</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Assignee</span>
                  {canAssignTasks ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveDropdown(activeDropdown === "detail-assignee" ? null : "detail-assignee")}
                        className="flex min-w-0 items-center gap-[8px] rounded-[10px] px-[8px] py-[6px] text-left transition-colors hover:bg-[#f7f7f7]"
                        tabIndex={0}
                      >
                        {selectedTask.assignee ? (
                          <>
                            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-[#f0f0f0] text-[9px] font-bold text-[#555]">
                              {assigneeInitials}
                            </span>
                            <span className="truncate text-[13px] font-medium text-[#262626]">{selectedTask.assignee}</span>
                          </>
                        ) : (
                          <>
                            <User className="h-[13px] w-[13px] shrink-0 text-[#ccc]" strokeWidth={1.5} />
                            <span className="text-[13px] font-medium text-[#ccc]">Empty</span>
                          </>
                        )}
                      </button>
                      {activeDropdown === "detail-assignee" && (
                        <>
                          <div className="fixed inset-0 z-[59]" onClick={() => setActiveDropdown(null)} />
                          <div className="absolute left-0 top-full z-[60] mt-[4px] max-h-[200px] min-w-[180px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                            <div
                              onClick={() => { onUpdateTask("assignee", ""); setActiveDropdown(null) }}
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
                                  onClick={() => { onUpdateTask("assignee", name); setActiveDropdown(null) }}
                                  className={`flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${selectedTask.assignee === name ? "bg-[#f5f5f5]" : ""}`}
                                  role="option"
                                  aria-selected={selectedTask.assignee === name}
                                >
                                  <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] bg-[#DBEAFE] text-[9px] font-semibold text-[#2563EB]">
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
                  ) : (
                    <div className="flex min-w-0 items-center gap-[8px] px-[8px] py-[6px]">
                      {selectedTask.assignee ? (
                        <>
                          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-[#f0f0f0] text-[9px] font-bold text-[#555]">
                            {assigneeInitials}
                          </span>
                          <span className="truncate text-[13px] font-medium text-[#262626]">{selectedTask.assignee}</span>
                        </>
                      ) : (
                        <>
                          <User className="h-[13px] w-[13px] shrink-0 text-[#ccc]" strokeWidth={1.5} />
                          <span className="text-[13px] font-medium text-[#ccc]">Empty</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Due date</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveDropdown(activeDropdown === "detail-date" ? null : "detail-date")}
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
                    {activeDropdown === "detail-date" && (
                      <>
                        <div className="fixed inset-0 z-[59]" onClick={() => setActiveDropdown(null)} />
                        <div className="absolute left-0 top-full z-[60] mt-[6px]">
                          <DatePicker
                            value={selectedTask.dueDate || ""}
                            onChange={(val) => onUpdateTask("dueDate", val)}
                            onClose={() => setActiveDropdown(null)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Check-up</span>
                  <div className="flex items-center gap-[8px] px-[8px] py-[6px]">
                    <button
                      type="button"
                      onClick={() => onUpdateTask("isCheckUp", !selectedTask.isCheckUp)}
                      className="relative h-[22px] w-[40px] rounded-full transition-colors"
                      style={{ backgroundColor: selectedTask.isCheckUp ? "#2563EB" : "#d4d4d4" }}
                      tabIndex={0}
                      aria-label={selectedTask.isCheckUp ? "Remove check-up" : "Mark as check-up"}
                      aria-checked={!!selectedTask.isCheckUp}
                      role="switch"
                    >
                      <span
                        className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${selectedTask.isCheckUp ? "left-[20px]" : "left-[2px]"}`}
                      />
                    </button>
                    {selectedTask.isCheckUp && (
                      <span className="text-[12px] font-medium text-[#888]">Auto-recurs</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Charge</span>
                  <button
                    ref={detailChargeRef}
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "detail-charge" ? null : "detail-charge")}
                    className="flex min-w-0 items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] text-left transition-colors hover:bg-[#f7f7f7]"
                    tabIndex={0}
                  >
                    {selectedTask.chargeType ? (
                      <span className="truncate rounded-[4px] bg-[#f0f0f0] px-[8px] py-[3px] text-[12px] font-semibold text-[#555]">
                        {chargeLabel(selectedTask.chargeType)}
                      </span>
                    ) : (
                      <>
                        <Tag className="h-[13px] w-[13px] shrink-0 text-[#ccc]" strokeWidth={1.5} />
                        <span className="text-[13px] font-medium text-[#ccc]">Empty</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Secondary</span>
                  <button
                    ref={detailSecondaryChargeRef}
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "detail-secondary-charge" ? null : "detail-secondary-charge")}
                    className="flex min-w-0 items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] text-left transition-colors hover:bg-[#f7f7f7]"
                    tabIndex={0}
                  >
                    {selectedTask.secondaryChargeType ? (
                      <span className="truncate rounded-[4px] bg-[#f0f0f0] px-[8px] py-[3px] text-[12px] font-semibold text-[#555]">
                        {secondaryChargeLabel(selectedTask.secondaryChargeType)}
                      </span>
                    ) : (
                      <>
                        <Tag className="h-[13px] w-[13px] shrink-0 text-[#ccc]" strokeWidth={1.5} />
                        <span className="text-[13px] font-medium text-[#ccc]">Empty</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Time</span>
                  <div className="flex items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] transition-colors hover:bg-[#f7f7f7]">
                    <Clock className={`h-[13px] w-[13px] shrink-0 ${selectedTask.timeSpent > 0 ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                    <input
                      key={selectedTask.timeSpent}
                      type="text"
                      defaultValue={selectedTask.timeSpent > 0 ? formatTime(selectedTask.timeSpent) : ""}
                      placeholder="Empty"
                      onBlur={(e) => onUpdateTask("timeSpent", parseTimeInput(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onUpdateTask("timeSpent", parseTimeInput(e.currentTarget.value))
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-full bg-transparent text-[13px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {activeDropdown === "detail-client" && detailClientRef.current && (() => {
        const rect = detailClientRef.current.getBoundingClientRect()
        const query = detailClientSearch.trim().toLowerCase()
        const filteredNames = query
          ? clientNames.filter((n) => n.toLowerCase().includes(query))
          : clientNames

        const selectClient = (name: string) => {
          onUpdateTask("client", name)
          if (name) {
            const matched = clients.find((c) => c.name === name || c.displayName === name)
            if (matched?.owner && selectedTaskId) {
              const task = tasks.find((t) => t.id === selectedTaskId)
              if (task && !task.assignee) onUpdateTask("assignee", matched.owner)
            }
          }
          setActiveDropdown(null)
          setDetailClientIdx(-1)
          setDetailClientSearch("")
        }

        return (
          <>
          <div className="fixed inset-0 z-[59]" onClick={() => { setActiveDropdown(null); setDetailClientIdx(-1); setDetailClientSearch("") }} />
          <div
            className="fixed z-[60] flex max-h-[260px] flex-col rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            style={{ top: rect.bottom + 4, left: rect.left, minWidth: 220 }}
          >
            <div className="border-b border-[#f0f0f0] p-[6px]">
              <input
                ref={detailClientSearchRef}
                type="text"
                value={detailClientSearch}
                onChange={(e) => { setDetailClientSearch(e.target.value); setDetailClientIdx(-1) }}
                onKeyDown={(e) => {
                  const total = filteredNames.length + 1
                  if (e.key === "ArrowDown") { e.preventDefault(); setDetailClientIdx((p) => (p + 1) % total) }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setDetailClientIdx((p) => (p - 1 + total) % total) }
                  else if (e.key === "Enter") {
                    e.preventDefault()
                    if (detailClientIdx === 0) selectClient("")
                    else {
                      const idx = detailClientIdx > 0 ? detailClientIdx - 1 : 0
                      const name = filteredNames[idx]
                      if (name) selectClient(name)
                    }
                  }
                  else if (e.key === "Escape") { e.stopPropagation(); setActiveDropdown(null); setDetailClientIdx(-1); setDetailClientSearch("") }
                }}
                placeholder="Search clients…"
                className="w-full rounded-[6px] border border-[#e0e0e0] bg-[#fafafa] px-[10px] py-[6px] text-[13px] text-[#262626] outline-none transition-colors focus:border-[#bbb]"
              />
            </div>
            <div className="overflow-y-auto">
              <div
                onClick={() => selectClient("")}
                className={`flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] ${detailClientIdx === 0 ? "bg-blue-50 text-blue-600" : ""}`}
                role="option"
                aria-selected={detailClientIdx === 0}
              >
                None
              </div>
              {filteredNames.map((name, i) => {
                const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                const isHighlighted = detailClientIdx === i + 1
                return (
                  <div
                    key={name}
                    onClick={() => selectClient(name)}
                    className={`flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${isHighlighted ? "bg-blue-50" : ""}`}
                    role="option"
                    aria-selected={isHighlighted}
                  >
                    <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] bg-[#DBEAFE] text-[9px] font-semibold text-[#2563EB]">
                      {initials}
                    </div>
                    {name}
                  </div>
                )
              })}
              {filteredNames.length === 0 && (
                <div className="px-[12px] py-[10px] text-[13px] text-[#bbb]">No clients found</div>
              )}
            </div>
          </div>
          </>
        )
      })()}

      {activeDropdown === "detail-charge" && selectedTask && detailChargeRef.current && (() => {
        const rect = detailChargeRef.current.getBoundingClientRect()
        return (
          <>
          <div className="fixed inset-0 z-[59]" onClick={() => setActiveDropdown(null)} />
          <div
            className="fixed z-[60] max-h-[220px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            style={{ top: rect.bottom + 6, left: rect.left, minWidth: Math.max(rect.width, 220) }}
          >
            {chargeTypes.map((ct) => (
              <div
                key={ct.value}
                onClick={() => { onUpdateTask("chargeType", ct.value); setActiveDropdown(null) }}
                className={`flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${ct.value ? "text-[#262626]" : "text-[#888]"} ${selectedTask.chargeType === ct.value ? "bg-[#f5f5f5]" : ""}`}
                role="option"
                aria-selected={selectedTask.chargeType === ct.value}
              >
                {ct.label}
              </div>
            ))}
          </div>
          </>
        )
      })()}

      {activeDropdown === "detail-secondary-charge" && selectedTask && detailSecondaryChargeRef.current && (() => {
        const rect = detailSecondaryChargeRef.current.getBoundingClientRect()
        return (
          <>
          <div className="fixed inset-0 z-[59]" onClick={() => setActiveDropdown(null)} />
          <div
            className="fixed z-[60] max-h-[260px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            style={{ top: rect.bottom + 6, left: rect.left, minWidth: Math.max(rect.width, 220) }}
          >
            <div
              onClick={() => { onUpdateTask("secondaryChargeType", ""); setActiveDropdown(null) }}
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
                onClick={() => { onUpdateTask("secondaryChargeType", sct.value); setActiveDropdown(null) }}
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
                    onClick={() => { onUpdateTask("secondaryChargeType", c.itemNumber); setActiveDropdown(null) }}
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
          </>
        )
      })()}

      {formatToolbar && (
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => { setFormatToolbar(null); setIsTextSizeOpen(false) }} onContextMenu={(e) => { e.preventDefault(); setFormatToolbar(null); setIsTextSizeOpen(false) }} />
          <div
            className="fixed z-[80] flex items-center gap-[2px] rounded-lg border border-[#e0e0e0] bg-white px-[6px] py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            style={{ top: formatToolbar.y + 8, left: formatToolbar.x }}
          >
            <div className="relative">
              <button
                onMouseDown={(e) => { e.preventDefault(); setIsTextSizeOpen(!isTextSizeOpen) }}
                className={`flex h-[28px] items-center gap-[3px] rounded-[4px] px-[6px] transition-colors ${isTextSizeOpen || currentBlock === "h1" || currentBlock === "h2" || currentBlock === "h3" ? "bg-[#e8e8e8] text-[#262626]" : "text-[#666] hover:bg-[#f0f0f0] hover:text-[#262626]"}`}
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
                className={`flex h-[28px] w-[28px] items-center justify-center rounded-[4px] transition-colors ${descFormats[cmd] ? "bg-[#e8e8e8] text-[#262626]" : "text-[#666] hover:bg-[#f0f0f0] hover:text-[#262626]"}`}
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
              className={`flex h-[28px] w-[28px] items-center justify-center rounded-[4px] transition-colors ${descFormats.insertUnorderedList ? "bg-[#e8e8e8] text-[#262626]" : "text-[#666] hover:bg-[#f0f0f0] hover:text-[#262626]"}`}
              tabIndex={0}
              aria-label="Bullet list"
              title="Bullet list"
            >
              <List className="h-[14px] w-[14px]" strokeWidth={2} />
            </button>
          </div>
        </>
      )}
    </>
  )
}
