"use client"

import { type ReactNode, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { ArrowLeft, ArrowRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { TableColumnMenuPortal } from "@/components/table-column-menu-portal"
import {
  TABLE_CELL_BASE,
  TABLE_CELL_INNER,
  TABLE_CELL_STICKY_EDGE,
  TABLE_CELL_STICKY_RIGHT,
  TABLE_GRID,
  TABLE_HEADER_CELL,
  TABLE_HEADER_STICKY_EDGE,
  TABLE_HEADER_STICKY_RIGHT,
  TABLE_STICKY_DIVIDER,
  TABLE_NAME_CELL,
  TABLE_ROW_HOVER,
} from "@/lib/table-styles"
import { cn } from "@/lib/utils"
import type { CustomFieldKind } from "@/lib/lists/custom-field-types"
import {
  getListSource,
  getRecordId,
  resolveListColumn,
  type CustomList,
} from "@/lib/lists/definitions"
import { ListCell } from "./list-cell"
import { ListCustomCell } from "./list-custom-cell"
import { AddColumnDropdown } from "./add-column-dropdown"
import { ListRemoveRecordButton } from "./list-remove-record-button"
import { TableAddFooterRow } from "@/components/table-add-row"
import { listViewBodyClass } from "@/components/tab-active-indicator"

interface ListTableViewProps {
  list: CustomList
  records: unknown[]
  recordCountLabel: string
  onAddSourceField: (fieldKey: string) => void
  onAddCustomField: (kind: CustomFieldKind) => void
  onRemoveColumn: (columnId: string) => void
  onRenameColumn?: (columnId: string, label: string) => void
  onMoveColumn?: (columnId: string, direction: "left" | "right") => void
  onCustomValueChange: (recordId: string, fieldKey: string, value: unknown) => void
  onOpenRecord?: (record: unknown, index: number) => void
  onRemoveRecord?: (recordId: string) => void
  addRecordsSlot?: ReactNode
  /** A just-added custom column whose title should open in edit mode. */
  autoEditColumnId?: string | null
  onAutoEditHandled?: () => void
}

/** Custom column titles are user-editable — click the header text to rename. */
function EditableColumnLabel({
  label,
  isEditing,
  onEditingChange,
  onRename,
}: {
  label: string
  isEditing: boolean
  onEditingChange: (editing: boolean) => void
  onRename: (label: string) => void
}) {
  const [draft, setDraft] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isEditing) setDraft(label)
  }, [label, isEditing])

  useEffect(() => {
    if (isEditing) inputRef.current?.select()
  }, [isEditing])

  const commit = () => {
    onEditingChange(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== label) onRename(trimmed)
    else setDraft(label)
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => onEditingChange(true)}
        className="-mx-[4px] min-w-0 max-w-full cursor-text truncate rounded-[4px] px-[4px] py-[2px] text-left uppercase transition-colors hover:bg-folk-hover"
        title="Rename column"
        tabIndex={0}
      >
        {label}
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit()
        if (event.key === "Escape") {
          setDraft(label)
          onEditingChange(false)
        }
      }}
      className="w-full min-w-0 max-w-full rounded-[4px] border border-[#a3c4f3] bg-white px-[4px] py-[2px] text-[11px] font-medium uppercase tracking-normal text-folk-text outline-none"
      aria-label="Column name"
    />
  )
}

export function ListTableView({
  list,
  records,
  recordCountLabel,
  onAddSourceField,
  onAddCustomField,
  onRemoveColumn,
  onRenameColumn,
  onMoveColumn,
  onCustomValueChange,
  onOpenRecord,
  onRemoveRecord,
  addRecordsSlot,
  autoEditColumnId,
  onAutoEditHandled,
}: ListTableViewProps) {
  const [menuColumnId, setMenuColumnId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)

  useEffect(() => {
    if (!autoEditColumnId) return
    setEditingColumnId(autoEditColumnId)
    onAutoEditHandled?.()
  }, [autoEditColumnId, onAutoEditHandled])

  const source = getListSource(list.source)
  if (!source) return null

  const closeColumnMenu = () => {
    setMenuColumnId(null)
    setMenuPosition(null)
  }

  const openColumnMenu = (columnId: string, trigger: HTMLElement) => {
    if (menuColumnId === columnId) {
      closeColumnMenu()
      return
    }
    const rect = trigger.getBoundingClientRect()
    const dropdownWidth = 200
    let left = rect.right - dropdownWidth
    if (left < 8) left = 8
    if (rect.right > window.innerWidth - 8) left = window.innerWidth - dropdownWidth - 8
    setMenuPosition({ top: rect.bottom + 4, left })
    setMenuColumnId(columnId)
  }

  const resolvedColumns = list.columns
    .map((column) => {
      const resolved = resolveListColumn(list.source, column)
      if (!resolved) return null
      return { column, ...resolved }
    })
    .filter(Boolean) as Array<{
      column: (typeof list.columns)[number]
      field: NonNullable<ReturnType<typeof resolveListColumn>>["field"]
      isCustom: boolean
    }>

  return (
    <div className={listViewBodyClass("h-full")}>
      {/* w-max: the table hugs its columns instead of stretching to the viewport. */}
      <table className={cn(TABLE_GRID, "w-max")}>
        <thead className="sticky top-0 z-10">
          <tr>
            <th
              className={cn(
                TABLE_HEADER_STICKY_EDGE,
                "sticky left-0 top-0 z-30 min-w-[240px] normal-case tracking-normal",
              )}
            >
              <span className="text-[13px] font-semibold text-folk-text">{recordCountLabel}</span>
            </th>
            {resolvedColumns.map(({ column, field, isCustom }, columnIndex) => {
              const isMenuOpen = menuColumnId === column.id
              const isFirst = columnIndex === 0
              const isLast = columnIndex === resolvedColumns.length - 1
              return (
                <th key={column.id} className={cn(TABLE_HEADER_CELL, "group/col min-w-[160px]")}>
                  <div className="flex max-w-[240px] items-center justify-between gap-[8px]">
                    {isCustom && onRenameColumn ? (
                      <EditableColumnLabel
                        label={field.label}
                        isEditing={editingColumnId === column.id}
                        onEditingChange={(editing) => setEditingColumnId(editing ? column.id : null)}
                        onRename={(label) => onRenameColumn(column.id, label)}
                      />
                    ) : (
                      <span className="truncate">{field.label}</span>
                    )}
                    <button
                      type="button"
                      onClick={(event) => openColumnMenu(column.id, event.currentTarget)}
                      className={cn(
                        "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] transition-all",
                        isMenuOpen
                          ? "bg-[#ebebeb] text-folk-text opacity-100"
                          : "text-folk-secondary opacity-0 hover:bg-[#ebebeb] hover:text-folk-text group-hover/col:opacity-100",
                      )}
                      aria-label={`Column options for ${field.label}`}
                      tabIndex={0}
                    >
                      <MoreHorizontal className="h-[13px] w-[13px]" strokeWidth={2} />
                    </button>
                  </div>
                  {isMenuOpen && (
                    <TableColumnMenuPortal isOpen={isMenuOpen} position={menuPosition} onClose={closeColumnMenu}>
                      {isCustom && onRenameColumn && (
                        <>
                          <button
                            onClick={() => {
                              setEditingColumnId(column.id)
                              closeColumnMenu()
                            }}
                            className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                            tabIndex={0}
                          >
                            <Pencil className="h-[15px] w-[15px] text-folk-secondary" strokeWidth={1.75} />
                            <span>Rename column</span>
                          </button>
                          <div className="my-[4px] border-t border-folk-border-subtle" />
                        </>
                      )}
                      {onMoveColumn && (
                        <>
                          <button
                            onClick={() => {
                              onMoveColumn(column.id, "left")
                              closeColumnMenu()
                            }}
                            disabled={isFirst}
                            className={cn(
                              "flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium transition-colors",
                              isFirst ? "text-folk-placeholder" : "text-folk-text hover:bg-folk-hover",
                            )}
                            tabIndex={0}
                          >
                            <ArrowLeft className={cn("h-[15px] w-[15px]", isFirst ? "text-[#ccc]" : "text-folk-secondary")} strokeWidth={1.75} />
                            <span>Move left</span>
                          </button>
                          <button
                            onClick={() => {
                              onMoveColumn(column.id, "right")
                              closeColumnMenu()
                            }}
                            disabled={isLast}
                            className={cn(
                              "flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium transition-colors",
                              isLast ? "text-folk-placeholder" : "text-folk-text hover:bg-folk-hover",
                            )}
                            tabIndex={0}
                          >
                            <ArrowRight className={cn("h-[15px] w-[15px]", isLast ? "text-[#ccc]" : "text-folk-secondary")} strokeWidth={1.75} />
                            <span>Move right</span>
                          </button>
                          <div className="my-[4px] border-t border-folk-border-subtle" />
                        </>
                      )}
                      <button
                        onClick={() => {
                          onRemoveColumn(column.id)
                          closeColumnMenu()
                        }}
                        className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                        tabIndex={0}
                      >
                        <Trash2 className="h-[15px] w-[15px] text-folk-secondary" strokeWidth={1.75} />
                        <span>Remove column</span>
                      </button>
                    </TableColumnMenuPortal>
                  )}
                </th>
              )
            })}
            <th
              className={cn(
                TABLE_HEADER_STICKY_RIGHT,
                TABLE_STICKY_DIVIDER,
                "sticky right-0 top-0 z-40 w-[44px] min-w-[44px] p-0",
              )}
            >
              <AddColumnDropdown
                sourceKey={list.source}
                columns={list.columns}
                onAddSourceField={onAddSourceField}
                onAddCustomField={onAddCustomField}
                variant="header"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => (
            <ListTableRow
              key={getRecordId(record, index)}
              list={list}
              record={record}
              index={index}
              source={source}
              resolvedColumns={resolvedColumns}
              onCustomValueChange={onCustomValueChange}
              onOpenRecord={onOpenRecord}
              onRemoveRecord={onRemoveRecord}
            />
          ))}
        </tbody>
        {addRecordsSlot ? (
          <TableAddFooterRow colSpan={resolvedColumns.length} variant="list">
            {addRecordsSlot}
          </TableAddFooterRow>
        ) : null}
      </table>
    </div>
  )
}

function ListTableRow({
  list,
  record,
  index,
  source,
  resolvedColumns,
  onCustomValueChange,
  onOpenRecord,
  onRemoveRecord,
}: {
  list: CustomList
  record: unknown
  index: number
  source: NonNullable<ReturnType<typeof getListSource>>
  resolvedColumns: Array<{
    column: { id: string; fieldKey: string; custom?: { label: string; kind: CustomFieldKind; options?: string[] } }
    field: NonNullable<ReturnType<typeof resolveListColumn>>["field"]
    isCustom: boolean
  }>
  onCustomValueChange: (recordId: string, fieldKey: string, value: unknown) => void
  onOpenRecord?: (record: unknown, index: number) => void
  onRemoveRecord?: (recordId: string) => void
}) {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const recordId = getRecordId(record, index)

  const handleNamePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
  }

  const handleNamePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const start = pointerStartRef.current
    pointerStartRef.current = null
    if (!start || !onOpenRecord) return
    const moved = Math.abs(event.clientX - start.x) > 8 || Math.abs(event.clientY - start.y) > 8
    if (moved) return
    onOpenRecord(record, index)
  }

  return (
    <tr className="group">
      <td className={cn(TABLE_CELL_STICKY_EDGE, TABLE_ROW_HOVER, "sticky left-0 z-[1]")}>
        <div className={cn(TABLE_CELL_INNER, "max-w-[320px]")}>
          <span className="text-[13px] leading-none">{list.icon}</span>
          {onOpenRecord ? (
            <button
              type="button"
              onPointerDown={handleNamePointerDown}
              onPointerUp={handleNamePointerUp}
              className={cn(TABLE_NAME_CELL, "cursor-pointer text-left transition-colors hover:text-[#2563EB]")}
              tabIndex={0}
            >
              {String(source.primary.get(record) ?? "—")}
            </button>
          ) : (
            <span className={TABLE_NAME_CELL}>{String(source.primary.get(record) ?? "—")}</span>
          )}
        </div>
      </td>
      {resolvedColumns.map(({ column, field, isCustom }) => {
        const customValue = list.customValues?.[recordId]?.[column.fieldKey]
        return (
          <td key={column.id} className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)}>
            <div className={cn(TABLE_CELL_INNER, "max-w-[240px]")}>
              {isCustom && column.custom ? (
                <ListCustomCell
                  def={column.custom}
                  value={customValue}
                  onChange={(value) => onCustomValueChange(recordId, column.fieldKey, value)}
                />
              ) : (
                <ListCell field={field} record={record} />
              )}
            </div>
          </td>
        )
      })}
      <td className={cn(TABLE_CELL_STICKY_RIGHT, TABLE_ROW_HOVER, TABLE_STICKY_DIVIDER, "sticky right-0 z-[2] w-[44px] min-w-[44px]")}>
        {onRemoveRecord ? (
          <div className="flex h-full items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <ListRemoveRecordButton onClick={() => onRemoveRecord(recordId)} />
          </div>
        ) : null}
      </td>
    </tr>
  )
}
