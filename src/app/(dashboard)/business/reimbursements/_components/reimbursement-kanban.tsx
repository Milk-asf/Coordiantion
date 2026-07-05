"use client"

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { CalendarDays, ChevronDown, Tag } from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"
import {
  formatReimbursementAmount,
  formatReimbursementDate,
  getReimbursementCategoryLabel,
} from "@/lib/reimbursements"
import type { Reimbursement } from "@/lib/types"
import { listViewKanbanScrollClass } from "@/components/tab-active-indicator"
import { cn } from "@/lib/utils"

type ReviewStatus = "sent" | "returned" | "approved"

interface ReimbursementKanbanProps {
  reimbursements: Reimbursement[]
  canManage: boolean
  onSetStatus: (id: string, status: ReviewStatus, reviewNote?: string) => Promise<void>
  onOpen: (id: string) => void
}

const COLUMNS: Array<{ status: ReviewStatus; label: string }> = [
  { status: "sent", label: "Sent" },
  { status: "returned", label: "Returned" },
  { status: "approved", label: "Approved" },
]

const COLUMN_THEME: Record<ReviewStatus, string> = {
  sent: "bg-[#dbeafe] text-[#1d4ed8]",
  returned: "bg-[#fef3c7] text-[#b45309]",
  approved: "bg-[#e7f5ec] text-[#1a7f43]",
}

function initials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean)
  if (parts.length === 0) return "?"
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
}

function resolveDropStatus(overId: string, items: Reimbursement[]): ReviewStatus | null {
  const column = COLUMNS.find((item) => item.status === overId)
  if (column) return column.status
  const item = items.find((entry) => entry.id === overId)
  if (!item) return null
  return item.status === "draft" ? null : (item.status as ReviewStatus)
}

function ReimbursementCard({
  item,
  isOverlay = false,
  isDragging = false,
  canManage,
  onOpen,
}: {
  item: Reimbursement
  isOverlay?: boolean
  isDragging?: boolean
  canManage: boolean
  onOpen: (id: string) => void
}) {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const { attributes, listeners, setNodeRef, transform, isDragging: isActiveDragging } = useDraggable({
    id: item.id,
    disabled: !canManage,
    data: { status: item.status },
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
    if (canManage) listeners?.onPointerDown?.(event)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isOverlay) return
    const start = pointerStartRef.current
    pointerStartRef.current = null
    if (!start) return
    const moved = Math.abs(event.clientX - start.x) > 8 || Math.abs(event.clientY - start.y) > 8
    if (moved) return
    onOpen(item.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden rounded-[6px] border border-[#d9d9d9] bg-white",
        canManage ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        (isDragging || isActiveDragging) && !isOverlay && "opacity-35",
        isOverlay && "shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
      )}
      {...attributes}
      {...(canManage ? listeners : {})}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          if (!isOverlay) onOpen(item.id)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open reimbursement ${item.title}`}
    >
      <div className="flex items-center gap-[10px] px-[12px] py-[9px]">
        <EntityIcon text={initials(item.createdByName)} size="sm" />
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-[1.35] text-[#111827]">
          {item.title || "Reimbursement"}
        </p>
        <span className="shrink-0 text-[12px] font-semibold text-[#111827]">
          {formatReimbursementAmount(item.amount)}
        </span>
      </div>
      <div className="mx-[12px] border-t border-[#d9d9d9]" />
      <div className="flex flex-col gap-[7px] px-[12px] py-[9px]">
        <div className="flex items-center gap-[8px]">
          <Tag className="h-[14px] w-[14px] shrink-0 text-[#9ca3af]" strokeWidth={1.75} />
          <span className="truncate text-[12px] text-[#374151]">{getReimbursementCategoryLabel(item.category)}</span>
        </div>
        <div className="flex items-center gap-[8px]">
          <CalendarDays className="h-[14px] w-[14px] shrink-0 text-[#9ca3af]" strokeWidth={1.75} />
          <span className="truncate text-[12px] text-[#374151]">{formatReimbursementDate(item.dateIncurred)}</span>
        </div>
      </div>
    </div>
  )
}

function KanbanColumn({
  status,
  label,
  items,
  canManage,
  onOpen,
}: {
  status: ReviewStatus
  label: string
  items: Reimbursement[]
  canManage: boolean
  onOpen: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className="flex w-[280px] shrink-0 flex-col">
      <div className="mb-[10px] flex items-center gap-[6px] px-[1px]">
        <span className={cn("inline-flex h-[22px] items-center rounded-full px-[9px] text-[12px] font-medium leading-none", COLUMN_THEME[status])}>
          {label}
        </span>
        <span className="text-[13px] font-normal text-[#6b7280]">{items.length}</span>
        <ChevronDown className="h-[12px] w-[12px] text-[#9ca3af]" strokeWidth={2} />
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-col gap-[8px] transition-colors",
          isOver && canManage && "rounded-[6px] bg-[#f3f4f6]/60",
        )}
      >
        {items.map((item) => (
          <ReimbursementCard key={item.id} item={item} canManage={canManage} onOpen={onOpen} />
        ))}
      </div>
    </div>
  )
}

export function ReimbursementKanban({ reimbursements, canManage, onSetStatus, onOpen }: ReimbursementKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pendingReturnId, setPendingReturnId] = useState<string | null>(null)
  const [returnNote, setReturnNote] = useState("")
  const isDraggingRef = useRef(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const reviewable = useMemo(
    () => reimbursements.filter((item) => item.status !== "draft"),
    [reimbursements],
  )

  const grouped = useMemo(() => {
    const result: Record<ReviewStatus, Reimbursement[]> = { sent: [], returned: [], approved: [] }
    for (const item of reviewable) result[item.status as ReviewStatus].push(item)
    return result
  }, [reviewable])

  const activeItem = activeId ? reviewable.find((item) => item.id === activeId) ?? null : null
  const pendingItem = pendingReturnId ? reviewable.find((item) => item.id === pendingReturnId) ?? null : null

  const handleOpen = (id: string) => {
    if (isDraggingRef.current) return
    onOpen(id)
  }

  const handleDragStart = (event: DragStartEvent) => {
    isDraggingRef.current = true
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    try {
      if (!canManage) return
      const id = String(event.active.id)
      const overId = event.over?.id ? String(event.over.id) : null
      if (!overId) return

      const item = reviewable.find((entry) => entry.id === id)
      if (!item) return

      const targetStatus = resolveDropStatus(overId, reviewable)
      if (!targetStatus || targetStatus === item.status) return

      if (targetStatus === "returned") {
        setReturnNote("")
        setPendingReturnId(id)
        return
      }
      await onSetStatus(id, targetStatus)
    } finally {
      isDraggingRef.current = false
    }
  }

  const confirmReturn = async () => {
    if (!pendingItem) return
    await onSetStatus(pendingItem.id, "returned", returnNote.trim())
    setPendingReturnId(null)
    setReturnNote("")
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className={listViewKanbanScrollClass()}>
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              label={column.label}
              items={grouped[column.status]}
              canManage={canManage}
              onOpen={handleOpen}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeItem ? (
            <div className="w-[280px]">
              <ReimbursementCard item={activeItem} canManage={canManage} onOpen={handleOpen} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {pendingItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-[16px]">
          <div className="w-full max-w-[420px] rounded-[8px] border border-folk-border bg-folk-surface p-[20px] shadow-folk">
            <h3 className="text-[14px] font-semibold text-folk-text">Return reimbursement</h3>
            <p className="mt-[4px] text-[12px] text-folk-secondary">
              Let the submitter know what needs changing. The note is optional.
            </p>
            <textarea
              value={returnNote}
              onChange={(event) => setReturnNote(event.target.value)}
              placeholder="Reason for returning (optional)"
              className="mt-[12px] min-h-[80px] w-full resize-y rounded-[6px] border border-folk-border bg-white px-[12px] py-[8px] text-[13px] font-medium leading-[1.5] text-folk-text outline-none placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
              autoFocus
            />
            <div className="mt-[14px] flex items-center justify-end gap-[8px]">
              <button
                type="button"
                onClick={() => {
                  setPendingReturnId(null)
                  setReturnNote("")
                }}
                className="outline-btn folk-pill-btn h-[32px] px-[12px] text-[13px] font-medium"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReturn}
                className="rounded-[6px] border border-[#fdba74] bg-[#fff7ed] px-[12px] py-[6px] text-[12px] font-medium text-[#c2410c] transition-colors hover:bg-[#ffedd5]"
                tabIndex={0}
              >
                Return reimbursement
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
