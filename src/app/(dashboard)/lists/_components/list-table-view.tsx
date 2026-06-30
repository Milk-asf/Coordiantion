"use client"

import { type ReactNode, useRef, type PointerEvent as ReactPointerEvent } from "react"
import { X } from "lucide-react"
import {
  TABLE_CELL_BASE,
  TABLE_CELL_INNER,
  TABLE_CELL_STICKY_EDGE,
  TABLE_CELL_STICKY_RIGHT,
  TABLE_FULL,
  TABLE_HEADER_CELL,
  TABLE_HEADER_STICKY_EDGE,
  TABLE_HEADER_STICKY_RIGHT,
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
import { TableAddFooter } from "@/components/table-add-row"
import { listViewBodyClass } from "@/components/tab-active-indicator"

interface ListTableViewProps {
  list: CustomList
  records: unknown[]
  recordCountLabel: string
  onAddSourceField: (fieldKey: string) => void
  onAddCustomField: (kind: CustomFieldKind) => void
  onRemoveColumn: (columnId: string) => void
  onCustomValueChange: (recordId: string, fieldKey: string, value: unknown) => void
  onOpenRecord?: (record: unknown, index: number) => void
  addRecordsSlot?: ReactNode
}

export function ListTableView({
  list,
  records,
  recordCountLabel,
  onAddSourceField,
  onAddCustomField,
  onRemoveColumn,
  onCustomValueChange,
  onOpenRecord,
  addRecordsSlot,
}: ListTableViewProps) {
  const source = getListSource(list.source)
  if (!source) return null

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
      <table className={cn(TABLE_FULL, "min-w-max")}>
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
            {resolvedColumns.map(({ column, field }) => (
              <th key={column.id} className={cn(TABLE_HEADER_CELL, "group/col min-w-[160px]")}>
                <div className="flex items-center justify-between gap-[8px]">
                  <span className="truncate">{field.label}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveColumn(column.id)}
                    className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] text-folk-tertiary opacity-0 transition-all hover:bg-folk-hover hover:text-folk-text group-hover/col:opacity-100"
                    aria-label={`Remove ${field.label} column`}
                    tabIndex={0}
                  >
                    <X className="h-[12px] w-[12px]" strokeWidth={2} />
                  </button>
                </div>
              </th>
            ))}
            <th
              className={cn(
                TABLE_HEADER_STICKY_RIGHT,
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
            />
          ))}
        </tbody>
      </table>
      {addRecordsSlot && <TableAddFooter>{addRecordsSlot}</TableAddFooter>}
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
        <div className={TABLE_CELL_INNER}>
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
            <div className={TABLE_CELL_INNER}>
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
      <td className={cn(TABLE_CELL_STICKY_RIGHT, TABLE_ROW_HOVER, "sticky right-0 z-[2] w-[44px] min-w-[44px]")} />
    </tr>
  )
}
