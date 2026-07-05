"use client"

import { useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { Sparkles, X } from "lucide-react"
import { computeWidget } from "@/lib/analytics/compute"
import {
  getDataSource,
  getVisualization,
  resolveEntityRecords,
  type AnalyticsWidget,
  type VisualizationType,
} from "@/lib/analytics/definitions"
import { useAnalyticsSourceData } from "@/lib/analytics/use-source-data"
import { cn } from "@/lib/utils"
import { VisualizationPalette } from "./visualization-palette"
import { WidgetConfigPanel } from "./widget-config-panel"
import { WidgetChart } from "./widget-chart"

interface AnalyticsBuilderProps {
  initialWidget: AnalyticsWidget
  isNew: boolean
  onSave: (widget: AnalyticsWidget) => void
  onCancel: () => void
}

const PREVIEW_MAX: Record<AnalyticsWidget["width"], string> = {
  third: "max-w-[400px]",
  half: "max-w-[560px]",
  full: "max-w-[860px]",
}

export function AnalyticsBuilder({ initialWidget, isNew, onSave, onCancel }: AnalyticsBuilderProps) {
  const [widget, setWidget] = useState<AnalyticsWidget>(initialWidget)
  // New reports start with an empty canvas until a visualisation is dropped in.
  const [placed, setPlaced] = useState(!isNew)
  const [draggingViz, setDraggingViz] = useState<VisualizationType | null>(null)
  const { data } = useAnalyticsSourceData()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const handleChange = (updates: Partial<AnalyticsWidget>) => setWidget((prev) => ({ ...prev, ...updates }))

  const setVisualization = (type: VisualizationType) => {
    const viz = getVisualization(type)
    setPlaced(true)
    setWidget((prev) => ({
      ...prev,
      visualization: type,
      groupBy: viz.needsGroup ? prev.groupBy ?? getDataSource(prev.source).defaultGroupBy : prev.groupBy,
    }))
  }

  const records = useMemo(() => resolveEntityRecords(widget.source, data), [widget.source, data])
  const computation = useMemo(() => computeWidget(widget, records), [widget, records])

  const handleDragStart = (event: DragStartEvent) => {
    const active = event.active.data.current
    if (active?.kind === "viz") setDraggingViz(active.visualization as VisualizationType)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingViz(null)
    const active = event.active.data.current
    const over = event.over?.data.current
    if (active?.kind === "viz" && over?.kind === "preview") setVisualization(active.visualization as VisualizationType)
  }

  const draggingMeta = draggingViz ? getVisualization(draggingViz) : null

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-folk-page">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDraggingViz(null)}>
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-folk-border bg-white px-[16px]">
          <div className="flex items-center gap-[10px]">
            <button
              type="button"
              onClick={onCancel}
              className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
              aria-label="Close builder"
              tabIndex={0}
            >
              <X className="h-[16px] w-[16px]" strokeWidth={1.75} />
            </button>
            <span className="text-[14px] font-semibold text-folk-text">{isNew ? "New report" : "Edit report"}</span>
          </div>
          <div className="flex items-center gap-[8px]">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-[6px] border border-folk-border bg-white px-[12px] py-[6px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
              tabIndex={0}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!placed}
              onClick={() => onSave({ ...widget, title: widget.title.trim() || "Untitled report" })}
              className="primary-btn folk-pill-btn h-[32px] px-[14px] text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
              tabIndex={0}
            >
              {isNew ? "Add report" : "Save changes"}
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[224px] shrink-0 flex-col border-r border-folk-border-subtle bg-white">
            <div className="flex h-[40px] shrink-0 items-center border-b border-folk-border-subtle px-[14px]">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-folk-tertiary">Visualisation</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <VisualizationPalette active={widget.visualization} onSelect={setVisualization} />
            </div>
          </aside>

          <PreviewPane widget={widget} computation={computation} placed={placed} />

          <aside className="flex w-[312px] shrink-0 flex-col border-l border-folk-border-subtle bg-white">
            <div className="flex h-[40px] shrink-0 items-center border-b border-folk-border-subtle px-[14px]">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-folk-tertiary">Configure</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <WidgetConfigPanel widget={widget} records={records} onChange={handleChange} />
            </div>
          </aside>
        </div>

        <DragOverlay dropAnimation={null}>
          {draggingMeta ? (
            <div className="inline-flex items-center gap-[8px] rounded-[8px] border border-folk-border-strong bg-white px-[10px] py-[8px] text-[13px] font-medium text-folk-text shadow-folk-sm">
              <draggingMeta.icon className="h-[15px] w-[15px] text-[#2563EB]" strokeWidth={1.75} />
              {draggingMeta.label}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function PreviewPane({
  widget,
  computation,
  placed,
}: {
  widget: AnalyticsWidget
  computation: ReturnType<typeof computeWidget>
  placed: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "preview", data: { kind: "preview" } })
  const source = getDataSource(widget.source)

  if (!placed) {
    return (
      <div ref={setNodeRef} className="flex min-w-0 flex-1 items-center justify-center overflow-auto p-[32px]">
        <div className={cn("w-full transition-all", PREVIEW_MAX[widget.width])}>
          <div
            className={cn(
              "flex min-h-[300px] flex-col items-center justify-center rounded-[12px] border-2 border-dashed bg-white/40 p-[24px] text-center transition-colors",
              isOver ? "border-[#3BA3F8] bg-[#f5f9ff]" : "border-folk-border",
            )}
          >
            <span className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-folk-hover text-folk-secondary">
              <Sparkles className="h-[20px] w-[20px]" strokeWidth={1.75} />
            </span>
            <p className="mt-[14px] text-[14px] font-semibold text-folk-text">Drag a visualisation here</p>
            <p className="mt-[4px] max-w-[280px] text-[12px] leading-[1.6] text-folk-tertiary">
              Pick a chart from the left and drop it onto this canvas, then choose a data source on the right.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} className="flex min-w-0 flex-1 items-center justify-center overflow-auto p-[32px]">
      <div className={cn("w-full transition-all", PREVIEW_MAX[widget.width])}>
        <div
          className={cn(
            "flex flex-col rounded-[10px] border bg-white p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors",
            isOver ? "border-[#a3c4f3] ring-2 ring-[#a3c4f3]/40" : "border-folk-border",
          )}
        >
          <div className="mb-[12px] flex items-center justify-between gap-[8px]">
            <h3 className="truncate text-[14px] font-semibold text-folk-text">{widget.title || "Untitled report"}</h3>
            <span className="shrink-0 rounded-full bg-folk-hover px-[8px] py-[2px] text-[11px] font-medium text-folk-secondary">
              {source.label}
            </span>
          </div>
          <div className="min-h-[220px]">
            <WidgetChart widget={widget} computation={computation} interactive={false} />
          </div>
        </div>
        <p className="mt-[12px] text-center text-[12px] text-folk-tertiary">
          Drop another visualisation to swap, or refine the data source on the right.
        </p>
      </div>
    </div>
  )
}
