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
import { CalendarDays, ChevronDown, FileCheck, Users } from "lucide-react"
import {
  CLAIM_PERIOD_KANBAN_COLUMNS,
  CLAIM_PERIOD_STATUS_THEME,
  formatClaimPeriodRange,
  type ClaimPeriod,
  type ClaimPeriodStatus,
} from "@/lib/ndis/claim-period"
import { listViewKanbanScrollClass } from "@/components/tab-active-indicator"
import { cn } from "@/lib/utils"

export interface ClaimPeriodSummary {
  participants: number
  lines: number
  total: number
}

interface ClaimPeriodKanbanProps {
  periods: ClaimPeriod[]
  summaries: Record<string, ClaimPeriodSummary>
  canManage: boolean
  onSetStatus: (id: string, status: ClaimPeriodStatus) => Promise<boolean>
  onOpen: (id: string) => void
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function resolveDropStatus(overId: string, periods: ClaimPeriod[]): ClaimPeriodStatus | null {
  const column = CLAIM_PERIOD_KANBAN_COLUMNS.find((item) => item.status === overId)
  if (column) return column.status
  const period = periods.find((p) => p.id === overId)
  return period ? period.status : null
}

function ClaimCard({
  period,
  summary,
  canManage,
  onOpen,
  isOverlay = false,
  isDragging = false,
}: {
  period: ClaimPeriod
  summary: ClaimPeriodSummary
  canManage: boolean
  onOpen: (id: string) => void
  isOverlay?: boolean
  isDragging?: boolean
}) {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const { attributes, listeners, setNodeRef, transform, isDragging: isActiveDragging } = useDraggable({
    id: period.id,
    disabled: !canManage,
    data: { status: period.status },
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
    onOpen(period.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden rounded-none border border-[#d9d9d9] bg-white",
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
          if (!isOverlay) onOpen(period.id)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open claim ${period.name}`}
    >
      <div className="flex items-center gap-[10px] px-[12px] py-[9px]">
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-[1.35] text-[#111827]">{period.name}</p>
        <span className="shrink-0 text-[12px] font-semibold text-[#111827]">{formatCurrency(summary.total)}</span>
      </div>
      <div className="mx-[12px] border-t border-[#d9d9d9]" />
      <div className="flex flex-col gap-[7px] px-[12px] py-[9px]">
        <div className="flex items-center gap-[8px]">
          <CalendarDays className="h-[14px] w-[14px] shrink-0 text-[#9ca3af]" strokeWidth={1.75} />
          <span className="truncate text-[12px] text-[#374151]">{formatClaimPeriodRange(period.startDate, period.endDate)}</span>
        </div>
        <div className="flex items-center gap-[8px]">
          <Users className="h-[14px] w-[14px] shrink-0 text-[#9ca3af]" strokeWidth={1.75} />
          <span className="truncate text-[12px] text-[#374151]">
            {summary.participants} participant{summary.participants === 1 ? "" : "s"} · {summary.lines} line{summary.lines === 1 ? "" : "s"}
          </span>
        </div>
        {period.exportCount > 0 && (
          <div className="flex items-center gap-[8px]">
            <FileCheck className="h-[14px] w-[14px] shrink-0 text-[#1a7f43]" strokeWidth={1.75} />
            <span className="truncate text-[12px] text-[#1a7f43]">Exported ×{period.exportCount}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanColumn({
  status,
  label,
  periods,
  summaries,
  canManage,
  onOpen,
}: {
  status: ClaimPeriodStatus
  label: string
  periods: ClaimPeriod[]
  summaries: Record<string, ClaimPeriodSummary>
  canManage: boolean
  onOpen: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className="flex w-[280px] shrink-0 flex-col">
      <div className="mb-[10px] flex items-center gap-[6px] px-[1px]">
        <span className={cn("inline-flex h-[22px] items-center rounded-full px-[9px] text-[12px] font-medium leading-none", CLAIM_PERIOD_STATUS_THEME[status])}>
          {label}
        </span>
        <span className="text-[13px] font-normal text-[#6b7280]">{periods.length}</span>
        <ChevronDown className="h-[12px] w-[12px] text-[#9ca3af]" strokeWidth={2} />
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-col gap-[8px] transition-colors",
          isOver && canManage && "rounded-none bg-[#f3f4f6]/60",
        )}
      >
        {periods.map((period) => (
          <ClaimCard
            key={period.id}
            period={period}
            summary={summaries[period.id] ?? { participants: 0, lines: 0, total: 0 }}
            canManage={canManage}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  )
}

export function ClaimPeriodKanban({ periods, summaries, canManage, onSetStatus, onOpen }: ClaimPeriodKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const isDraggingRef = useRef(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const grouped = useMemo(() => {
    const result: Record<ClaimPeriodStatus, ClaimPeriod[]> = { draft: [], ready: [], exported: [], reconciled: [] }
    for (const period of periods) result[period.status].push(period)
    return result
  }, [periods])

  const activePeriod = activeId ? periods.find((p) => p.id === activeId) ?? null : null

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
      const period = periods.find((p) => p.id === id)
      if (!period) return
      const targetStatus = resolveDropStatus(overId, periods)
      if (!targetStatus || targetStatus === period.status) return
      await onSetStatus(id, targetStatus)
    } finally {
      isDraggingRef.current = false
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={listViewKanbanScrollClass()}>
        {CLAIM_PERIOD_KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.status}
            status={column.status}
            label={column.label}
            periods={grouped[column.status]}
            summaries={summaries}
            canManage={canManage}
            onOpen={handleOpen}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activePeriod ? (
          <div className="w-[280px]">
            <ClaimCard
              period={activePeriod}
              summary={summaries[activePeriod.id] ?? { participants: 0, lines: 0, total: 0 }}
              canManage={canManage}
              onOpen={handleOpen}
              isOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
