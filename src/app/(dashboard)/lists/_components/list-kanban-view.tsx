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
import { Plus } from "lucide-react"
import { listViewKanbanScrollClass } from "@/components/tab-active-indicator"
import { getFolkStatusClass } from "@/lib/folk-ui"
import { cn } from "@/lib/utils"
import {
  getListSource,
  getRecordId,
  getSourceField,
  type CustomList,
  type ListField,
} from "@/lib/lists/definitions"
import {
  buildCustomStageKanbanGroups,
  UNASSIGNED_KANBAN_STAGE,
  type KanbanGroup,
} from "@/lib/lists/kanban-utils"
import { formatFieldValue } from "./list-cell"

interface ListKanbanViewProps {
  list: CustomList
  records: unknown[]
  onUpdateStages: (stages: string[]) => void
  onMoveRecord: (record: unknown, stageKey: string) => Promise<boolean>
  onOpenRecord: (record: unknown, index: number) => void
  className?: string
}

function resolveDropStage(overId: string, groups: KanbanGroup[]): string | null {
  const column = groups.find((group) => group.key === overId)
  if (column) return column.key

  for (const group of groups) {
    for (let index = 0; index < group.records.length; index++) {
      if (getRecordId(group.records[index], index) === overId) return group.key
    }
  }

  return null
}

function getRecordStageKey(list: CustomList, record: unknown, index: number): string {
  const recordId = getRecordId(record, index)
  const assigned = list.kanbanRecordStages?.[recordId]
  if (assigned && (list.kanbanStages ?? []).includes(assigned)) return assigned
  return UNASSIGNED_KANBAN_STAGE
}

function KanbanCard({
  list,
  record,
  index,
  source,
  displayColumns,
  isOverlay = false,
  isDragging = false,
  onOpenRecord,
}: {
  list: CustomList
  record: unknown
  index: number
  source: NonNullable<ReturnType<typeof getListSource>>
  displayColumns: ListField[]
  isOverlay?: boolean
  isDragging?: boolean
  onOpenRecord: (record: unknown, index: number) => void
}) {
  const recordId = getRecordId(record, index)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const { attributes, listeners, setNodeRef, transform, isDragging: isActiveDragging } = useDraggable({
    id: recordId,
    data: { recordId },
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
    listeners?.onPointerDown?.(event)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isOverlay) return
    const start = pointerStartRef.current
    pointerStartRef.current = null
    if (!start) return
    const moved = Math.abs(event.clientX - start.x) > 8 || Math.abs(event.clientY - start.y) > 8
    if (moved) return
    onOpenRecord(record, index)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className={cn(
        "touch-none cursor-pointer rounded-none border border-[#bababa] bg-white p-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)]",
        (isDragging || isActiveDragging) && !isOverlay && "opacity-40",
        isOverlay && "shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
      )}
      tabIndex={0}
      role="button"
      aria-label={`Open ${String(source.primary.get(record) ?? "record")}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpenRecord(record, index)
        }
      }}
    >
      <div className="flex items-center gap-[8px]">
        <span className="text-[14px] leading-none">{list.icon}</span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-folk-text">
          {String(source.primary.get(record) ?? "—")}
        </span>
      </div>
      {displayColumns.length > 0 && (
        <div className="mt-[8px] flex flex-col gap-[5px]">
          {displayColumns.map((field) => (
            <div key={field.key} className="flex items-center justify-between gap-[8px]">
              <span className="shrink-0 text-[11px] text-folk-tertiary">{field.label}</span>
              <span className="min-w-0 truncate text-[12px] text-folk-text">{formatFieldValue(field, record)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function KanbanColumn({
  group,
  list,
  source,
  displayColumns,
  onOpenRecord,
}: {
  group: KanbanGroup
  list: CustomList
  source: NonNullable<ReturnType<typeof getListSource>>
  displayColumns: ListField[]
  onOpenRecord: (record: unknown, index: number) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: group.key })

  return (
    <div className="flex w-[280px] shrink-0 flex-col">
      <div className="mb-[8px] flex items-center gap-[8px]">
        <span
          className={cn(
            "folk-chip inline-flex h-[20px] items-center px-[8px] text-[11px] font-medium capitalize",
            group.key === UNASSIGNED_KANBAN_STAGE ? "bg-folk-hover text-folk-secondary" : getFolkStatusClass(group.label),
          )}
        >
          {group.label.replace(/-/g, " ")}
        </span>
        <span className="text-[12px] text-folk-tertiary">{group.records.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-col gap-[8px] rounded-none p-[2px] transition-colors",
          isOver && "bg-[#eff6ff]/60",
        )}
      >
        {group.records.map((record, index) => (
          <KanbanCard
            key={getRecordId(record, index)}
            list={list}
            record={record}
            index={index}
            source={source}
            displayColumns={displayColumns}
            onOpenRecord={onOpenRecord}
          />
        ))}
      </div>
    </div>
  )
}

function AddStageColumn({ onAdd }: { onAdd: (label: string) => void }) {
  const [isAdding, setIsAdding] = useState(false)
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setIsAdding(false)
      setValue("")
      return
    }
    onAdd(trimmed)
    setValue("")
    setIsAdding(false)
  }

  if (!isAdding) {
    return (
      <div className="flex w-[280px] shrink-0 flex-col">
        <button
          type="button"
          onClick={() => {
            setIsAdding(true)
            setTimeout(() => inputRef.current?.focus(), 50)
          }}
          className="folk-pill-btn flex h-[32px] w-full items-center justify-center gap-[6px] border border-dashed border-[#8fa8e0] bg-[#f8faff] px-[12px] text-[12px] font-medium text-folk-text transition-colors hover:border-[#8fa8e0] hover:bg-[#f8faff] focus-visible:border-[#8fa8e0]"
          tabIndex={0}
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.75} />
          Add stage
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-[280px] shrink-0 flex-col gap-[8px] rounded-none bg-white p-[12px]">
      <label className="text-[12px] font-medium text-folk-secondary" htmlFor="new-kanban-stage">
        Stage name
      </label>
      <input
        id="new-kanban-stage"
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") handleSubmit()
          if (event.key === "Escape") {
            setIsAdding(false)
            setValue("")
          }
        }}
        onBlur={handleSubmit}
        placeholder="e.g. In review"
        className="w-full rounded-none border border-folk-border bg-folk-page px-[10px] py-[7px] text-[13px] text-folk-text outline-none placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
      />
    </div>
  )
}

export function ListKanbanView({
  list,
  records,
  onUpdateStages,
  onMoveRecord,
  onOpenRecord,
  className,
}: ListKanbanViewProps) {
  const [activeRecord, setActiveRecord] = useState<{ record: unknown; index: number } | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const source = getListSource(list.source)

  const groups = useMemo(
    () => buildCustomStageKanbanGroups(records, list.kanbanStages, list.kanbanRecordStages),
    [records, list.kanbanStages, list.kanbanRecordStages],
  )

  const displayColumns = useMemo(
    () =>
      list.columns
        .map((column) => getSourceField(list.source, column.fieldKey))
        .filter((field): field is ListField => Boolean(field)),
    [list.columns, list.source],
  )

  const handleDragStart = (event: DragStartEvent) => {
    const recordIndex = records.findIndex((record, index) => getRecordId(record, index) === event.active.id)
    if (recordIndex < 0) return
    setActiveRecord({ record: records[recordIndex], index: recordIndex })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveRecord(null)
    if (!event.over) return

    const recordIndex = records.findIndex((record, index) => getRecordId(record, index) === event.active.id)
    if (recordIndex < 0) return

    const record = records[recordIndex]
    const nextStage = resolveDropStage(String(event.over.id), groups)
    if (!nextStage) return

    const currentStage = getRecordStageKey(list, record, recordIndex)
    if (currentStage === nextStage) return

    await onMoveRecord(record, nextStage)
  }

  const handleAddStage = (label: string) => {
    const existing = list.kanbanStages ?? []
    if (existing.includes(label)) return
    onUpdateStages([...existing, label])
  }

  if (!source) return null

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className={listViewKanbanScrollClass("flex-1")}>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex items-start gap-[12px]">
            {groups.map((group) => (
              <KanbanColumn
                key={group.key}
                group={group}
                list={list}
                source={source}
                displayColumns={displayColumns}
                onOpenRecord={onOpenRecord}
              />
            ))}
            <AddStageColumn onAdd={handleAddStage} />
          </div>
          <DragOverlay dropAnimation={null}>
            {activeRecord ? (
              <KanbanCard
                list={list}
                record={activeRecord.record}
                index={activeRecord.index}
                source={source}
                displayColumns={displayColumns}
                isOverlay
                onOpenRecord={onOpenRecord}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
