"use client"

import { useState, useRef, useCallback, useEffect, type CSSProperties } from "react"
import { sanitizeHtml } from "@/lib/sanitize"
import {
  SquareCheck,
  X,
  CalendarDays,
  Building2,
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
  Plus,
  Upload,
  Heading1,
  Heading2,
  ListOrdered,
  Quote,
  Code,
  Target,
  AlertTriangle,
} from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { FixedDatePickerDropdown } from "@/components/fixed-date-picker-dropdown"
import { DeleteActionsMenu } from "@/components/delete-actions-menu"
import { serviceChargeTypes, type ChargeUnit } from "@/lib/ndis-charges"
import { formatTime, parseTimeInput } from "./task-helpers"
import type { Task, Attachment, Client } from "@/lib/types"

interface ChargeType {
  value: string
  label: string
}

interface EnabledCharge {
  itemNumber: string
  shortName: string
  unit?: ChargeUnit
  price?: number
}

export interface InvoiceInfoItem {
  label: string
  value: string
}

export interface TaskDetailModalProps {
  selectedTask: Task
  selectedTaskId: string
  tasks: Task[]
  onUpdateTask: (field: keyof Task, value: string | Attachment[] | boolean | number) => void
  onLinkGoal: (goalId: string | null) => void
  onDeleteTask?: (id: string) => void
  onClose: () => void
  chargeTypes: ChargeType[]
  chargeLabel: (val: string) => string
  secondaryChargeLabel: (val: string) => string
  clientNames: string[]
  clients: Client[]
  staffNames: string[]
  canAssignTasks: boolean
  enabledCharges: EnabledCharge[]
  // Optional invoicing extras: when provided, an "Invoice information" section
  // and issues banner are rendered, plus a "Move back to tasks" action.
  onMoveBackToTasks?: () => void
  invoiceInfo?: InvoiceInfoItem[]
  invoiceIssues?: string[]
}

export function TaskDetailModal({
  selectedTask,
  selectedTaskId,
  tasks,
  onUpdateTask,
  onLinkGoal,
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
  onMoveBackToTasks,
  invoiceInfo,
  invoiceIssues,
}: TaskDetailModalProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [detailClientIdx, setDetailClientIdx] = useState(-1)
  const [detailClientSearch, setDetailClientSearch] = useState("")

  const detailClientRef = useRef<HTMLButtonElement>(null)
  const detailClientSearchRef = useRef<HTMLInputElement>(null)
  const detailDateRef = useRef<HTMLButtonElement>(null)
  const detailChargeRef = useRef<HTMLButtonElement>(null)
  const detailSecondaryChargeRef = useRef<HTMLButtonElement>(null)
  const detailGoalRef = useRef<HTMLButtonElement>(null)
  const detailFileInputRef = useRef<HTMLInputElement>(null)

  const descriptionRef = useRef<HTMLDivElement>(null)
  const [formatToolbar, setFormatToolbar] = useState<{ x: number; y: number } | null>(null)
  const [descFormats, setDescFormats] = useState<Record<string, boolean>>({})
  const [currentBlock, setCurrentBlock] = useState("")
  const [isTextSizeOpen, setIsTextSizeOpen] = useState(false)
  const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false)

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

  // Notes-style formatting: focus the editor, run the command, then persist
  // the resulting HTML (execCommand doesn't fire the onInput handler).
  const applyDescFormat = useCallback((command: string, value?: string) => {
    descriptionRef.current?.focus()
    document.execCommand(command, false, value)
    if (descriptionRef.current) onUpdateTask("description", sanitizeHtml(descriptionRef.current.innerHTML))
    setTimeout(refreshDescFormats, 0)
  }, [onUpdateTask, refreshDescFormats])

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

  const taskClient = clients.find((c) => c.id === selectedTask.clientId)
    || clients.find((c) => c.name === selectedTask.client || c.displayName === selectedTask.client)
  const clientGoals = taskClient?.participant.goals || []
  const attachedGoal = clientGoals.find((g) => g.linkedTasks?.some((lt) => lt.taskId === selectedTask.id)) || null
  const goalTypeLabel: Record<string, string> = { "long-term": "Long term", "short-term": "Short term" }

  const secondaryCharge = selectedTask.secondaryChargeType
    ? enabledCharges.find((c) => c.itemNumber === selectedTask.secondaryChargeType) || null
    : null
  const secondaryUnit = secondaryCharge?.unit
  const isSecondaryQuantity = secondaryUnit === "km" || secondaryUnit === "each"

  const fixedDropdownStyle = (rect: DOMRect, estimatedHeight: number, minWidth: number): CSSProperties => {
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < estimatedHeight + 8 && rect.top > spaceBelow
    return openUp
      ? { bottom: window.innerHeight - rect.top + 4, left: rect.left, minWidth }
      : { top: rect.bottom + 4, left: rect.left, minWidth }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
        <div className="absolute inset-0 bg-black/20" onClick={handleCloseDetail} />
        <div className="relative z-10 flex h-[680px] max-h-[calc(100vh-32px)] w-[960px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[20px] border border-[#d9d9d9] bg-folk-surface shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
          <input
            ref={detailFileInputRef}
            type="file"
            multiple
            onChange={handleDetailFileSelect}
            className="hidden"
          />

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-h-0 flex-col px-[28px] py-[22px]">
              <div className="flex items-center gap-[6px] text-[11px] font-medium uppercase tracking-[0.03em] text-folk-placeholder">
                <SquareCheck className="h-[12px] w-[12px]" strokeWidth={1.5} />
                <span>Task</span>
              </div>

              <div className="mt-[14px] rounded-[6px] bg-folk-page px-[12px] py-[10px]">
                <input
                  type="text"
                  placeholder="Enter a title for this task..."
                  value={selectedTask.title}
                  onChange={(e) => onUpdateTask("title", e.target.value)}
                  className="w-full bg-transparent text-[18px] font-semibold text-folk-text placeholder-[#8f8f8f] outline-none"
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
                className="mt-[14px] min-h-[80px] flex-1 overflow-y-auto text-[14px] leading-[1.6] text-[#4b4b4b] outline-none [&:empty]:before:pointer-events-none [&:empty]:before:text-[#b5b5b5] [&:empty]:before:content-[attr(data-placeholder)] [&_ul]:list-disc [&_ul]:pl-[20px] [&_ol]:list-decimal [&_ol]:pl-[20px] [&_li]:my-[2px] [&_h1]:text-[22px] [&_h1]:font-bold [&_h1]:leading-[1.3] [&_h1]:my-[4px] [&_h2]:text-[18px] [&_h2]:font-semibold [&_h2]:leading-[1.4] [&_h2]:my-[3px] [&_h3]:text-[15px] [&_h3]:font-medium [&_h3]:leading-[1.5] [&_h3]:my-[2px] [&_blockquote]:my-[4px] [&_blockquote]:border-l-2 [&_blockquote]:border-folk-border [&_blockquote]:pl-[12px] [&_blockquote]:text-folk-secondary [&_pre]:my-[4px] [&_pre]:rounded-[6px] [&_pre]:bg-folk-hover [&_pre]:p-[10px] [&_pre]:font-mono [&_pre]:text-[13px]"
              />

              <div className="mt-[16px] flex items-center gap-[8px] border-t border-[#f1f1f1] pt-[14px]">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { refreshDescFormats(); setIsFormatMenuOpen((o) => !o) }}
                    className={`flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border transition-colors ${isFormatMenuOpen ? "border-[#bababa] bg-[var(--folk-border-subtle)] text-[#555]" : "border-[#d9d9d9] text-folk-secondary hover:border-[#bababa] hover:bg-folk-hover hover:text-[#555]"}`}
                    tabIndex={0}
                    aria-label="Formatting options"
                  >
                    <Plus className="h-[14px] w-[14px]" strokeWidth={1.5} />
                  </button>

                  {isFormatMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-[40]" onClick={() => setIsFormatMenuOpen(false)} />
                      <div className="absolute bottom-full left-0 z-50 mb-[8px] flex items-center gap-[2px] rounded-[6px] border border-[#d9d9d9] bg-folk-surface px-[6px] py-[6px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                        <button onMouseDown={(e) => { e.preventDefault(); applyDescFormat("bold") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#555] transition-colors hover:bg-[var(--folk-border-subtle)]" tabIndex={0} aria-label="Bold">
                          <Bold className="h-[14px] w-[14px]" strokeWidth={2} />
                        </button>
                        <button onMouseDown={(e) => { e.preventDefault(); applyDescFormat("italic") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#555] transition-colors hover:bg-[var(--folk-border-subtle)]" tabIndex={0} aria-label="Italic">
                          <Italic className="h-[14px] w-[14px]" strokeWidth={2} />
                        </button>
                        <button onMouseDown={(e) => { e.preventDefault(); applyDescFormat("underline") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#555] transition-colors hover:bg-[var(--folk-border-subtle)]" tabIndex={0} aria-label="Underline">
                          <Underline className="h-[14px] w-[14px]" strokeWidth={2} />
                        </button>
                        <button onMouseDown={(e) => { e.preventDefault(); applyDescFormat("strikeThrough") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#555] transition-colors hover:bg-[var(--folk-border-subtle)]" tabIndex={0} aria-label="Strikethrough">
                          <Strikethrough className="h-[14px] w-[14px]" strokeWidth={2} />
                        </button>
                        <div className="mx-[4px] h-[18px] w-[1px] bg-[#e8e8e8]" />
                        <button onMouseDown={(e) => { e.preventDefault(); applyDescFormat("formatBlock", "h1") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#555] transition-colors hover:bg-[var(--folk-border-subtle)]" tabIndex={0} aria-label="Heading 1">
                          <Heading1 className="h-[14px] w-[14px]" strokeWidth={2} />
                        </button>
                        <button onMouseDown={(e) => { e.preventDefault(); applyDescFormat("formatBlock", "h2") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#555] transition-colors hover:bg-[var(--folk-border-subtle)]" tabIndex={0} aria-label="Heading 2">
                          <Heading2 className="h-[14px] w-[14px]" strokeWidth={2} />
                        </button>
                        <div className="mx-[4px] h-[18px] w-[1px] bg-[#e8e8e8]" />
                        <button onMouseDown={(e) => { e.preventDefault(); applyDescFormat("insertUnorderedList") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#555] transition-colors hover:bg-[var(--folk-border-subtle)]" tabIndex={0} aria-label="Bullet list">
                          <List className="h-[14px] w-[14px]" strokeWidth={2} />
                        </button>
                        <button onMouseDown={(e) => { e.preventDefault(); applyDescFormat("insertOrderedList") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#555] transition-colors hover:bg-[var(--folk-border-subtle)]" tabIndex={0} aria-label="Numbered list">
                          <ListOrdered className="h-[14px] w-[14px]" strokeWidth={2} />
                        </button>
                        <button onMouseDown={(e) => { e.preventDefault(); applyDescFormat("formatBlock", "blockquote") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#555] transition-colors hover:bg-[var(--folk-border-subtle)]" tabIndex={0} aria-label="Quote">
                          <Quote className="h-[14px] w-[14px]" strokeWidth={2} />
                        </button>
                        <button onMouseDown={(e) => { e.preventDefault(); applyDescFormat("formatBlock", "pre") }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#555] transition-colors hover:bg-[var(--folk-border-subtle)]" tabIndex={0} aria-label="Code">
                          <Code className="h-[14px] w-[14px]" strokeWidth={2} />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => detailFileInputRef.current?.click()}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border border-[#d9d9d9] text-folk-secondary transition-colors hover:border-[#bababa] hover:bg-folk-hover hover:text-[#555]"
                  tabIndex={0}
                  aria-label="Upload attachment"
                >
                  <Upload className="h-[14px] w-[14px]" strokeWidth={1.5} />
                </button>

                {onMoveBackToTasks && (
                  <button
                    type="button"
                    onClick={onMoveBackToTasks}
                    className="flex items-center gap-[5px] rounded-[6px] border border-folk-border bg-folk-surface px-[10px] py-[5px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                    tabIndex={0}
                  >
                    Move back to tasks
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="ml-auto flex items-center gap-[5px] rounded-[6px] border border-folk-border bg-folk-surface px-[10px] py-[5px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                  tabIndex={0}
                >
                  Done
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-col border-l border-folk-border px-[20px] py-[18px]">
              <div className="flex justify-end gap-[4px]">
                {onDeleteTask && (
                  <DeleteActionsMenu
                    onDelete={() => onDeleteTask(selectedTask.id)}
                    itemName={selectedTask.title || "Untitled task"}
                    confirmTitle="Delete task"
                    confirmDescription="This action cannot be undone. The task and its data will be permanently removed."
                    ariaLabel="Task actions"
                  />
                )}
                <button
                  onClick={handleCloseDetail}
                  className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
                  tabIndex={0}
                  aria-label="Close"
                >
                  <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
                </button>
              </div>

              <div className="mt-[18px] flex flex-col gap-[14px] overflow-y-auto">
                {invoiceIssues && invoiceIssues.length > 0 && (
                  <div className="grid grid-cols-[84px_minmax(0,1fr)] items-start gap-[12px]">
                    <span className="pt-[6px] text-[13px] font-medium text-[#8d8d8d]">Issues</span>
                    <div className="min-w-0 space-y-[6px]">
                      {invoiceIssues.map((issue) => (
                        <div key={issue} className="flex items-start gap-[8px] rounded-[6px] bg-[#fff6f6] px-[8px] py-[6px] text-[12px] leading-[1.45] text-[#a14e4e]">
                          <AlertTriangle className="mt-[1px] h-[12px] w-[12px] shrink-0" strokeWidth={1.75} />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                    className="flex min-w-0 items-center gap-[8px] rounded-[6px] px-[8px] py-[6px] text-left transition-colors hover:bg-folk-page"
                    tabIndex={0}
                  >
                    {selectedTask.client ? (
                      <>
                        <EntityIcon text={selectedTask.client.split(" ").filter(Boolean).map((part) => part[0]).join("").toUpperCase().slice(0, 2)} size="sm" />
                        <span className="truncate text-[13px] font-medium text-folk-text">{selectedTask.client}</span>
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
                        className="flex min-w-0 items-center gap-[8px] rounded-[6px] px-[8px] py-[6px] text-left transition-colors hover:bg-folk-page"
                        tabIndex={0}
                      >
                        {selectedTask.assignee ? (
                          <>
                            <EntityIcon text={assigneeInitials} size="xsm" />
                            <span className="truncate text-[13px] font-medium text-folk-text">{selectedTask.assignee}</span>
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
                          <div className="absolute left-0 top-full z-[60] mt-[4px] max-h-[200px] min-w-[180px] overflow-y-auto rounded-[6px] border border-folk-border bg-folk-surface shadow-folk">
                            <div
                              onClick={() => { onUpdateTask("assignee", ""); setActiveDropdown(null) }}
                              className="flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover"
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
                                  className={`flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover ${selectedTask.assignee === name ? "bg-folk-hover" : ""}`}
                                  role="option"
                                  aria-selected={selectedTask.assignee === name}
                                >
                                  <EntityIcon text={initials} size="sm" />
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
                          <EntityIcon text={assigneeInitials} size="xsm" />
                          <span className="truncate text-[13px] font-medium text-folk-text">{selectedTask.assignee}</span>
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
                  <button
                    ref={detailDateRef}
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "detail-date" ? null : "detail-date")}
                    className={`flex min-w-0 items-center gap-[7px] rounded-[6px] px-[8px] py-[6px] text-left transition-colors hover:bg-folk-page ${activeDropdown === "detail-date" ? "ring-1 ring-[#2563EB]" : ""}`}
                    tabIndex={0}
                    aria-expanded={activeDropdown === "detail-date"}
                  >
                    <CalendarDays className={`h-[13px] w-[13px] shrink-0 ${selectedTask.dueDate ? "text-folk-secondary" : "text-[#ccc]"}`} strokeWidth={1.5} />
                    <span className={`truncate text-[13px] font-medium ${selectedTask.dueDate ? "text-folk-text" : "text-[#ccc]"}`}>
                      {selectedTask.dueDate
                        ? new Date(selectedTask.dueDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })
                        : "Empty"}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Check-up</span>
                  <div className="flex items-center gap-[8px] px-[8px] py-[6px]">
                    <button
                      type="button"
                      onClick={() => onUpdateTask("isCheckUp", !selectedTask.isCheckUp)}
                      className="relative h-[22px] w-[40px] rounded-full transition-colors"
                      style={{ backgroundColor: selectedTask.isCheckUp ? "#2563EB" : "var(--folk-border)" }}
                      tabIndex={0}
                      aria-label={selectedTask.isCheckUp ? "Remove check-up" : "Mark as check-up"}
                      aria-checked={!!selectedTask.isCheckUp}
                      role="switch"
                    >
                      <span
                        className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-folk-surface shadow-sm transition-transform ${selectedTask.isCheckUp ? "left-[20px]" : "left-[2px]"}`}
                      />
                    </button>
                    {selectedTask.isCheckUp && (
                      <span className="text-[12px] font-medium text-folk-secondary">Auto-recurs</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Charge</span>
                  <button
                    ref={detailChargeRef}
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "detail-charge" ? null : "detail-charge")}
                    className="flex min-w-0 items-center gap-[7px] rounded-[6px] px-[8px] py-[6px] text-left transition-colors hover:bg-folk-page"
                    tabIndex={0}
                  >
                    {selectedTask.chargeType ? (
                      <span className="truncate rounded-[6px] bg-[var(--folk-border-subtle)] px-[8px] py-[3px] text-[12px] font-semibold text-[#555]">
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
                    className="flex min-w-0 items-center gap-[7px] rounded-[6px] px-[8px] py-[6px] text-left transition-colors hover:bg-folk-page"
                    tabIndex={0}
                  >
                    {selectedTask.secondaryChargeType ? (
                      <span className="truncate rounded-[6px] bg-[var(--folk-border-subtle)] px-[8px] py-[3px] text-[12px] font-semibold text-[#555]">
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

                {secondaryCharge && (
                  <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                    <span className="text-[13px] font-medium text-[#8d8d8d]">
                      {secondaryUnit === "km" ? "Distance" : secondaryUnit === "each" ? "Quantity" : "Sec. time"}
                    </span>
                    <div className="flex items-center gap-[7px] rounded-[6px] px-[8px] py-[6px] transition-colors hover:bg-folk-page">
                      {isSecondaryQuantity ? (
                        <>
                          <Tag className={`h-[13px] w-[13px] shrink-0 ${selectedTask.secondaryTimeSpent > 0 ? "text-folk-secondary" : "text-[#ccc]"}`} strokeWidth={1.5} />
                          <input
                            key={`sec-${selectedTask.secondaryTimeSpent}`}
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={selectedTask.secondaryTimeSpent > 0 ? selectedTask.secondaryTimeSpent : ""}
                            placeholder="0"
                            onBlur={(e) => onUpdateTask("secondaryTimeSpent", Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                onUpdateTask("secondaryTimeSpent", Math.max(0, Math.round(parseFloat(e.currentTarget.value) || 0)))
                                e.currentTarget.blur()
                              }
                            }}
                            className="w-full bg-transparent text-[13px] font-medium text-folk-text placeholder-[#ccc] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="shrink-0 text-[12px] font-medium text-[#aaa]">{secondaryUnit === "km" ? "km" : "ea"}</span>
                        </>
                      ) : (
                        <>
                          <Clock className={`h-[13px] w-[13px] shrink-0 ${selectedTask.secondaryTimeSpent > 0 ? "text-folk-secondary" : "text-[#ccc]"}`} strokeWidth={1.5} />
                          <input
                            key={`sec-${selectedTask.secondaryTimeSpent}`}
                            type="text"
                            defaultValue={selectedTask.secondaryTimeSpent > 0 ? formatTime(selectedTask.secondaryTimeSpent) : ""}
                            placeholder="Empty"
                            onBlur={(e) => onUpdateTask("secondaryTimeSpent", parseTimeInput(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                onUpdateTask("secondaryTimeSpent", parseTimeInput(e.currentTarget.value))
                                e.currentTarget.blur()
                              }
                            }}
                            className="w-full bg-transparent text-[13px] font-medium text-folk-text placeholder-[#ccc] outline-none"
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Goal</span>
                  {!taskClient ? (
                    <div className="flex min-w-0 items-center gap-[7px] px-[8px] py-[6px]">
                      <Target className="h-[13px] w-[13px] shrink-0 text-[#ccc]" strokeWidth={1.5} />
                      <span className="text-[13px] font-medium text-[#ccc]">Select a client first</span>
                    </div>
                  ) : (
                    <button
                      ref={detailGoalRef}
                      type="button"
                      onClick={() => setActiveDropdown(activeDropdown === "detail-goal" ? null : "detail-goal")}
                      className="flex min-w-0 items-center gap-[7px] rounded-[6px] px-[8px] py-[6px] text-left transition-colors hover:bg-folk-page"
                      tabIndex={0}
                    >
                      {attachedGoal ? (
                        <>
                          <Target className="h-[13px] w-[13px] shrink-0 text-[#2563EB]" strokeWidth={1.5} />
                          <span className="truncate text-[13px] font-medium text-folk-text">{attachedGoal.title || "Untitled goal"}</span>
                        </>
                      ) : (
                        <>
                          <Target className="h-[13px] w-[13px] shrink-0 text-[#ccc]" strokeWidth={1.5} />
                          <span className="text-[13px] font-medium text-[#ccc]">Empty</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Time</span>
                  <div className="flex items-center gap-[7px] rounded-[6px] px-[8px] py-[6px] transition-colors hover:bg-folk-page">
                    <Clock className={`h-[13px] w-[13px] shrink-0 ${selectedTask.timeSpent > 0 ? "text-folk-secondary" : "text-[#ccc]"}`} strokeWidth={1.5} />
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
                      className="w-full bg-transparent text-[13px] font-medium text-folk-text placeholder-[#ccc] outline-none"
                    />
                  </div>
                </div>

                {invoiceInfo && invoiceInfo.length > 0 && (
                  <div className="mt-[4px] border-t border-[#d9d9d9] pt-[14px]">
                    <div className="mb-[10px] px-[8px] text-[11px] font-semibold uppercase tracking-[0.08em] text-folk-placeholder">
                      Invoice information
                    </div>
                    <div className="flex flex-col gap-[14px]">
                      {invoiceInfo.map((item) => (
                        <div key={item.label} className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
                          <span className="text-[13px] font-medium text-[#8d8d8d]">{item.label}</span>
                          <span className={`px-[8px] py-[6px] text-[13px] font-medium ${item.value && item.value !== "Empty" ? "text-folk-text" : "text-[#ccc]"}`}>
                            {item.value || "Empty"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      <FixedDatePickerDropdown
        isOpen={activeDropdown === "detail-date"}
        anchorRef={detailDateRef}
        value={selectedTask.dueDate || ""}
        onChange={(val) => onUpdateTask("dueDate", val)}
        onClose={() => setActiveDropdown(null)}
      />

      {activeDropdown === "detail-client" && detailClientRef.current && (() => {
        const rect = detailClientRef.current.getBoundingClientRect()
        const query = detailClientSearch.trim().toLowerCase()
        const filteredNames = query
          ? clientNames.filter((n) => n.toLowerCase().includes(query))
          : clientNames

        const selectClient = (name: string) => {
          onUpdateTask("client", name)
          const matched = name ? clients.find((c) => c.name === name || c.displayName === name) : undefined
          onUpdateTask("clientId", matched?.id || "")
          if (name && matched?.owner && selectedTaskId) {
            const task = tasks.find((t) => t.id === selectedTaskId)
            if (task && !task.assignee) onUpdateTask("assignee", matched.owner)
          }
          setActiveDropdown(null)
          setDetailClientIdx(-1)
          setDetailClientSearch("")
        }

        return (
          <>
          <div className="fixed inset-0 z-[59]" onClick={() => { setActiveDropdown(null); setDetailClientIdx(-1); setDetailClientSearch("") }} />
          <div
            className="fixed z-[60] flex max-h-[260px] flex-col rounded-[6px] border border-folk-border bg-folk-surface shadow-folk"
            style={fixedDropdownStyle(rect, Math.min(260, (filteredNames.length + 1) * 34 + 52), 220)}
          >
            <div className="border-b border-folk-border-subtle p-[6px]">
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
                className="w-full rounded-[6px] border border-folk-border bg-folk-page px-[10px] py-[6px] text-[13px] text-folk-text outline-none transition-colors focus:border-[#bbb]"
              />
            </div>
            <div className="overflow-y-auto">
              <div
                onClick={() => selectClient("")}
                className={`flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover ${detailClientIdx === 0 ? "bg-blue-50 text-blue-600" : ""}`}
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
                    className={`flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover ${isHighlighted ? "bg-blue-50" : ""}`}
                    role="option"
                    aria-selected={isHighlighted}
                  >
                    <EntityIcon text={initials} size="sm" />
                    {name}
                  </div>
                )
              })}
              {filteredNames.length === 0 && (
                <div className="px-[12px] py-[10px] text-[13px] text-folk-placeholder">No clients found</div>
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
            className="fixed z-[60] max-h-[220px] overflow-y-auto rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-folk"
            style={fixedDropdownStyle(rect, Math.min(220, chargeTypes.length * 34 + 8), Math.max(rect.width, 220))}
          >
            {chargeTypes.map((ct) => (
              <div
                key={ct.value}
                onClick={() => { onUpdateTask("chargeType", ct.value); setActiveDropdown(null) }}
                className={`flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium transition-colors hover:bg-folk-hover ${ct.value ? "text-folk-text" : "text-folk-secondary"} ${selectedTask.chargeType === ct.value ? "bg-folk-hover" : ""}`}
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

      {activeDropdown === "detail-goal" && selectedTask && detailGoalRef.current && (() => {
        const rect = detailGoalRef.current.getBoundingClientRect()
        return (
          <>
          <div className="fixed inset-0 z-[59]" onClick={() => setActiveDropdown(null)} />
          <div
            className="fixed z-[60] max-h-[240px] overflow-y-auto rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-folk"
            style={fixedDropdownStyle(rect, Math.min(240, (clientGoals.length + 1) * 36 + 8), Math.max(rect.width, 240))}
          >
            <div
              onClick={() => { onLinkGoal(null); setActiveDropdown(null) }}
              className="flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover"
              role="option"
              aria-selected={!attachedGoal}
            >
              None
            </div>
            {clientGoals.length === 0 ? (
              <div className="px-[12px] py-[8px] text-[12px] text-folk-placeholder">No goals for this participant yet</div>
            ) : (
              clientGoals.map((goal) => (
                <div
                  key={goal.id}
                  onClick={() => { onLinkGoal(goal.id); setActiveDropdown(null) }}
                  className={`flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover ${attachedGoal?.id === goal.id ? "bg-folk-hover" : ""}`}
                  role="option"
                  aria-selected={attachedGoal?.id === goal.id}
                >
                  <Target className="h-[13px] w-[13px] shrink-0 text-[#2563EB]" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1 truncate">{goal.title || "Untitled goal"}</span>
                  <span className="shrink-0 text-[11px] font-medium text-folk-secondary">{goalTypeLabel[goal.goalType]}</span>
                </div>
              ))
            )}
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
            className="fixed z-[60] max-h-[260px] overflow-y-auto rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-folk"
            style={fixedDropdownStyle(rect, Math.min(260, (serviceChargeTypes.length + enabledCharges.length + 3) * 34 + 20), Math.max(rect.width, 220))}
          >
            <div
              onClick={() => { onUpdateTask("secondaryChargeType", ""); setActiveDropdown(null) }}
              className={`flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover ${!selectedTask.secondaryChargeType ? "bg-folk-hover" : ""}`}
              role="option"
              aria-selected={!selectedTask.secondaryChargeType}
            >
              No charge
            </div>
            <div className="my-[2px] border-t border-folk-border-subtle" />
            <div className="px-[12px] py-[4px] text-[10px] font-semibold uppercase tracking-[0.05em] text-[#aaa]">Service type</div>
            {serviceChargeTypes.map((sct) => (
              <div
                key={sct.value}
                onClick={() => { onUpdateTask("secondaryChargeType", sct.value); setActiveDropdown(null) }}
                className={`flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover ${selectedTask.secondaryChargeType === sct.value ? "bg-folk-hover" : ""}`}
                role="option"
                aria-selected={selectedTask.secondaryChargeType === sct.value}
              >
                {sct.label}
              </div>
            ))}
            {enabledCharges.length > 0 && (
              <>
                <div className="my-[2px] border-t border-folk-border-subtle" />
                <div className="px-[12px] py-[4px] text-[10px] font-semibold uppercase tracking-[0.05em] text-[#aaa]">NDIS line item</div>
                {enabledCharges.map((c) => (
                  <div
                    key={c.itemNumber}
                    onClick={() => { onUpdateTask("secondaryChargeType", c.itemNumber); setActiveDropdown(null) }}
                    className={`flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover ${selectedTask.secondaryChargeType === c.itemNumber ? "bg-folk-hover" : ""}`}
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
            className="fixed z-[80] flex items-center gap-[2px] rounded-[6px] border border-folk-border bg-folk-surface px-[6px] py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            style={{ top: formatToolbar.y + 8, left: formatToolbar.x }}
          >
            <div className="relative">
              <button
                onMouseDown={(e) => { e.preventDefault(); setIsTextSizeOpen(!isTextSizeOpen) }}
                className={`flex h-[28px] items-center gap-[3px] rounded-[6px] px-[6px] transition-colors ${isTextSizeOpen || currentBlock === "h1" || currentBlock === "h2" || currentBlock === "h3" ? "bg-[#e8e8e8] text-folk-text" : "text-folk-secondary hover:bg-[var(--folk-border-subtle)] hover:text-folk-text"}`}
                tabIndex={0}
                aria-label="Text size"
                title="Text size"
              >
                <Type className="h-[14px] w-[14px]" strokeWidth={2} />
                <ChevronDown className="h-[10px] w-[10px]" strokeWidth={2} />
              </button>
              {isTextSizeOpen && (
                <div className="absolute left-0 top-full z-[90] mt-[4px] w-[140px] rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                  {([
                    { tag: "h1", label: "Heading", className: "text-[16px] font-bold" },
                    { tag: "h2", label: "Subheading", className: "text-[14px] font-semibold" },
                    { tag: "h3", label: "Small", className: "text-[13px] font-medium" },
                    { tag: "p", label: "Normal", className: "text-[13px] font-normal" },
                  ] as const).map(({ tag, label, className }) => (
                    <button
                      key={tag}
                      onMouseDown={(e) => { e.preventDefault(); handleTextSize(tag) }}
                      className={`flex w-full items-center px-[12px] py-[6px] transition-colors hover:bg-folk-hover ${currentBlock === tag ? "bg-[var(--folk-border-subtle)]" : ""}`}
                      tabIndex={0}
                    >
                      <span className={`text-folk-text ${className}`}>{label}</span>
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
                className={`flex h-[28px] w-[28px] items-center justify-center rounded-[6px] transition-colors ${descFormats[cmd] ? "bg-[#e8e8e8] text-folk-text" : "text-folk-secondary hover:bg-[var(--folk-border-subtle)] hover:text-folk-text"}`}
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
              className={`flex h-[28px] w-[28px] items-center justify-center rounded-[6px] transition-colors ${descFormats.insertUnorderedList ? "bg-[#e8e8e8] text-folk-text" : "text-folk-secondary hover:bg-[var(--folk-border-subtle)] hover:text-folk-text"}`}
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
