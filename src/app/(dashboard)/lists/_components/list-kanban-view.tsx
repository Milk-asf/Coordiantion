"use client"

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
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
import { MoreHorizontal, Plus, Trash2, CalendarDays } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FixedSelectDropdown } from "@/components/fixed-select-dropdown"
import { listViewKanbanScrollClass } from "@/components/tab-active-indicator"
import { getFolkStatusClass } from "@/lib/folk-ui"
import { folkStatusColors } from "@/lib/ui-tokens"
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
import { ListRemoveRecordButton } from "./list-remove-record-button"
import { TABLE_CHIP } from "@/lib/table-styles"

interface ListKanbanViewProps {
  list: CustomList
  records: unknown[]
  onUpdateStages: (stages: string[]) => void
  onRenameStage?: (stageKey: string, label: string) => void
  onSetStageColor?: (stageKey: string, color: string | null) => void
  onDeleteStage?: (stageKey: string) => void
  onMoveRecord: (record: unknown, stageKey: string) => Promise<boolean>
  onOpenRecord: (record: unknown, index: number) => void
  onRemoveRecord?: (recordId: string) => void
  /** Renders the hover "+" control in a stage header for adding records to that stage. */
  renderAddToStage?: (stageKey: string) => ReactNode
  className?: string
}

/** Chip palette for stage colours — swatches preview the actual chip (pastel fill, dark ink). */
const STAGE_COLOR_OPTIONS = Object.keys(folkStatusColors) as Array<keyof typeof folkStatusColors>

const STAGE_COLOR_SWATCHES: Record<keyof typeof folkStatusColors, { fill: string; ink: string }> = {
  green: { fill: "#ecfdf5", ink: "#065f46" },
  yellow: { fill: "#fef3c7", ink: "#92400e" },
  red: { fill: "#fee2e2", ink: "#991b1b" },
  orange: { fill: "#fff3e0", ink: "#e65100" },
  purple: { fill: "#f5f3ff", ink: "#5b21b6" },
  blue: { fill: "#eff6ff", ink: "#1d4ed8" },
  gray: { fill: "#f3f4f6", ink: "#374151" },
}

function stageChipClass(label: string, colorKey: string | undefined) {
  if (colorKey && colorKey in folkStatusColors) {
    return folkStatusColors[colorKey as keyof typeof folkStatusColors]
  }
  return getFolkStatusClass(label)
}

/** Stage header menu — rename, colour, and delete. */
function StageHeaderMenu({
  stageKey,
  stageLabel,
  colorKey,
  onRename,
  onSetColor,
  onDelete,
}: {
  stageKey: string
  stageLabel: string
  colorKey: string | undefined
  onRename?: (label: string) => void
  onSetColor?: (color: string | null) => void
  onDelete?: () => void
}) {
  const menuRef = useRef<HTMLButtonElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [draft, setDraft] = useState(stageLabel)

  useEffect(() => {
    if (isMenuOpen) setDraft(stageLabel)
  }, [isMenuOpen, stageLabel])

  const handleCloseMenu = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== stageKey) onRename?.(trimmed)
    setIsMenuOpen(false)
  }

  const handleDeleteConfirm = () => {
    setIsConfirmDeleteOpen(false)
    onDelete?.()
  }

  return (
    <>
      <button
        ref={menuRef}
        type="button"
        onClick={() => setIsMenuOpen((open) => !open)}
        className="flex h-[22px] w-[22px] items-center justify-center rounded-[4px] text-folk-placeholder transition-colors hover:bg-folk-hover hover:text-folk-secondary"
        aria-label={`Stage options for ${stageLabel}`}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        tabIndex={0}
      >
        <MoreHorizontal className="h-[14px] w-[14px]" strokeWidth={1.75} />
      </button>

      <FixedSelectDropdown
        isOpen={isMenuOpen}
        anchorRef={menuRef}
        onClose={handleCloseMenu}
        minWidth={220}
        estimatedHeight={onDelete ? 200 : 168}
        align="right"
        menuClassName="rounded-[6px] border-folk-border-subtle py-[4px] shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      >
        <div className="px-[10px] py-[8px]">
          <label className="mb-[4px] block text-[11px] font-medium text-folk-secondary">Stage name</label>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleCloseMenu()
            }}
            className="w-full rounded-[6px] border border-folk-border bg-folk-page px-[8px] py-[5px] text-[13px] text-folk-text outline-none placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
            autoFocus
            aria-label="Stage name"
          />
          <p className="mb-[4px] mt-[10px] text-[11px] font-medium text-folk-secondary">Colour</p>
          <div className="flex items-center gap-[6px]">
            {STAGE_COLOR_OPTIONS.map((option) => {
              const swatch = STAGE_COLOR_SWATCHES[option]
              const isSelected = colorKey === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSetColor?.(option)}
                  className="h-[18px] w-[18px] rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: swatch.fill,
                    boxShadow: isSelected
                      ? `inset 0 0 0 2px ${swatch.ink}`
                      : "inset 0 0 0 1px rgba(0,0,0,0.12)",
                  }}
                  aria-label={`Colour ${option}`}
                  aria-pressed={isSelected}
                  tabIndex={0}
                />
              )
            })}
            <button
              type="button"
              onClick={() => onSetColor?.(null)}
              className={cn(
                "ml-[2px] rounded-[4px] px-[6px] py-[2px] text-[11px] font-medium transition-colors",
                !colorKey ? "bg-folk-hover text-folk-text" : "text-folk-secondary hover:text-folk-text",
              )}
              tabIndex={0}
            >
              Auto
            </button>
          </div>
        </div>
        {onDelete ? (
          <>
            <div className="mx-[10px] border-t border-folk-border-subtle" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false)
                setIsConfirmDeleteOpen(true)
              }}
              className="flex w-full items-center gap-[8px] px-[14px] py-[8px] text-left text-[13px] text-red-500 transition-colors hover:bg-red-50"
              tabIndex={0}
            >
              <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.75} />
              Delete stage
            </button>
          </>
        ) : null}
      </FixedSelectDropdown>

      {onDelete ? (
        <ConfirmDialog
          isOpen={isConfirmDeleteOpen}
          title="Delete stage?"
          description={`Records in "${stageLabel}" will move to Unassigned. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setIsConfirmDeleteOpen(false)}
        />
      ) : null}
    </>
  )
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
  onRemoveRecord,
}: {
  list: CustomList
  record: unknown
  index: number
  source: NonNullable<ReturnType<typeof getListSource>>
  displayColumns: ListField[]
  isOverlay?: boolean
  isDragging?: boolean
  onOpenRecord: (record: unknown, index: number) => void
  onRemoveRecord?: (recordId: string) => void
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
        "group/card touch-none cursor-pointer rounded-[6px] border border-[#bababa] bg-white p-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)]",
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
        {onRemoveRecord && !isOverlay ? (
          <div className="shrink-0 opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100">
            <ListRemoveRecordButton onClick={() => onRemoveRecord(recordId)} />
          </div>
        ) : null}
      </div>
      {displayColumns.length > 0 && (
        <div className="mt-[8px] flex flex-col gap-[5px]">
          {displayColumns.map((field) => (
            <div key={field.key} className="flex items-center justify-between gap-[8px]">
              <span className="shrink-0 text-[11px] text-folk-tertiary">{field.label}</span>
              {field.kind === "date" ? (
                <span className={cn(TABLE_CHIP, "max-w-[65%] gap-[4px] truncate")}>
                  <CalendarDays className="h-[11px] w-[11px] shrink-0" strokeWidth={1.75} />
                  {formatFieldValue(field, record)}
                </span>
              ) : (
                <span className="min-w-0 truncate text-[12px] text-folk-text">{formatFieldValue(field, record)}</span>
              )}
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
  onRemoveRecord,
  onRenameStage,
  onSetStageColor,
  onDeleteStage,
  addToStageSlot,
}: {
  group: KanbanGroup
  list: CustomList
  source: NonNullable<ReturnType<typeof getListSource>>
  displayColumns: ListField[]
  onOpenRecord: (record: unknown, index: number) => void
  onRemoveRecord?: (recordId: string) => void
  onRenameStage?: (stageKey: string, label: string) => void
  onSetStageColor?: (stageKey: string, color: string | null) => void
  onDeleteStage?: (stageKey: string) => void
  addToStageSlot?: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: group.key })

  const isUnassigned = group.key === UNASSIGNED_KANBAN_STAGE
  const colorKey = list.kanbanStageColors?.[group.key]
  const isEditable = !isUnassigned && (onRenameStage || onSetStageColor || onDeleteStage)

  return (
    <div className="group/stage flex w-[280px] shrink-0 flex-col">
      <div className="mb-[8px] flex w-full items-center gap-[8px]">
        <span
          className={cn(
            "folk-chip inline-flex h-[20px] shrink-0 items-center px-[8px] text-[11px] font-medium capitalize",
            isUnassigned ? "bg-folk-hover text-folk-secondary" : stageChipClass(group.label, colorKey),
          )}
        >
          {group.label.replace(/-/g, " ")}
        </span>
        <span className="shrink-0 text-[12px] text-folk-tertiary">{group.records.length}</span>
        {(addToStageSlot || isEditable) && (
          <div className="ml-auto flex shrink-0 items-center gap-[2px] opacity-0 transition-opacity group-hover/stage:opacity-100 group-focus-within/stage:opacity-100">
            {addToStageSlot}
            {isEditable ? (
              <StageHeaderMenu
                stageKey={group.key}
                stageLabel={group.label}
                colorKey={colorKey}
                onRename={onRenameStage ? (label) => onRenameStage(group.key, label) : undefined}
                onSetColor={onSetStageColor ? (color) => onSetStageColor(group.key, color) : undefined}
                onDelete={onDeleteStage ? () => onDeleteStage(group.key) : undefined}
              />
            ) : null}
          </div>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-col gap-[8px] rounded-[6px] p-[2px] transition-colors",
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
            onRemoveRecord={onRemoveRecord}
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
    <div className="flex w-[280px] shrink-0 flex-col gap-[8px] rounded-[6px] bg-white p-[12px]">
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
        className="w-full rounded-[6px] border border-folk-border bg-folk-page px-[10px] py-[7px] text-[13px] text-folk-text outline-none placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
      />
    </div>
  )
}

export function ListKanbanView({
  list,
  records,
  onUpdateStages,
  onRenameStage,
  onSetStageColor,
  onDeleteStage,
  renderAddToStage,
  onMoveRecord,
  onOpenRecord,
  onRemoveRecord,
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
                onRemoveRecord={onRemoveRecord}
                onRenameStage={onRenameStage}
                onSetStageColor={onSetStageColor}
                onDeleteStage={onDeleteStage}
                addToStageSlot={renderAddToStage?.(group.key)}
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
