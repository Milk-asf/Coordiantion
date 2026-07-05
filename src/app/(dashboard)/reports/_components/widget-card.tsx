"use client"

import { useDraggable, useDroppable } from "@dnd-kit/core"
import { Copy, GripVertical, Pencil, Trash2 } from "lucide-react"
import { computeWidget } from "@/lib/analytics/compute"
import { getDataSource, type AnalyticsWidget } from "@/lib/analytics/definitions"
import { DATE_WINDOW_LABELS } from "@/lib/analytics/scope"
import { cn } from "@/lib/utils"
import { WidgetChart } from "./widget-chart"

interface WidgetCardProps {
  widget: AnalyticsWidget
  records: unknown[]
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export function WidgetCard({ widget, records, onEdit, onDuplicate, onDelete }: WidgetCardProps) {
  const computation = computeWidget(widget, records)
  const source = getDataSource(widget.source)

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `slot:${widget.id}`, data: { kind: "widget-slot", widgetId: widget.id } })
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `widget:${widget.id}`,
    data: { kind: "widget", widgetId: widget.id },
  })

  return (
    <div ref={setDropRef} className={cn("relative", isOver && "before:absolute before:-left-[7px] before:top-0 before:h-full before:w-[3px] before:rounded-full before:bg-[#3BA3F8]")}>
      <div
        className={cn(
          "group flex h-full min-h-[200px] flex-col rounded-[10px] border border-folk-border bg-white p-[16px] transition-all hover:border-folk-border-strong hover:shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
          isDragging && "opacity-40",
        )}
      >
        <div className="mb-[10px] flex items-start justify-between gap-[8px]">
          <div className="flex min-w-0 items-center gap-[6px]">
            <button
              ref={setDragRef}
              type="button"
              className="flex h-[20px] w-[16px] shrink-0 cursor-grab items-center justify-center text-folk-placeholder opacity-0 transition-opacity hover:text-folk-secondary group-hover:opacity-100"
              aria-label="Drag to reorder"
              {...listeners}
              {...attributes}
            >
              <GripVertical className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </button>
            <h3 className="truncate text-[14px] font-semibold text-folk-text">{widget.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-[2px] opacity-0 transition-opacity group-hover:opacity-100">
            <CardAction icon={Pencil} label="Edit report" onClick={onEdit} />
            <CardAction icon={Copy} label="Duplicate report" onClick={onDuplicate} />
            <CardAction icon={Trash2} label="Delete report" onClick={onDelete} danger />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <WidgetChart widget={widget} computation={computation} />
        </div>
        <span className="mt-[10px] text-[11px] font-medium text-folk-tertiary">
          {source.label}
          {widget.dateWindow && widget.dateWindow !== "all" ? ` · ${DATE_WINDOW_LABELS[widget.dateWindow]}` : ""}
          {(widget.filters?.length ?? 0) > 0 ? ` · ${widget.filters.length} ${widget.filters.length === 1 ? "filter" : "filters"}` : ""}
        </span>
      </div>
    </div>
  )
}

interface CardActionProps {
  icon: typeof Pencil
  label: string
  onClick: () => void
  danger?: boolean
}

function CardAction({ icon: Icon, label, onClick, danger }: CardActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text",
        danger && "hover:bg-red-50 hover:text-red-500",
      )}
      aria-label={label}
      tabIndex={0}
    >
      <Icon className="h-[14px] w-[14px]" strokeWidth={1.75} />
    </button>
  )
}

export const WIDGET_WIDTH_CLASS: Record<AnalyticsWidget["width"], string> = {
  third: "col-span-6 sm:col-span-3 lg:col-span-2",
  half: "col-span-6 lg:col-span-3",
  full: "col-span-6",
}
