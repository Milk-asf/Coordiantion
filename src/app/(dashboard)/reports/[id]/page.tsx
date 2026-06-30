"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { BarChart3, Plus } from "lucide-react"
import { PageTitleBar, PageToolbarBar } from "@/components/page-title-bar"
import { pageTitleTextClass } from "@/components/tab-active-indicator"
import { EmptyState } from "@/components/empty-state"
import { PageError, PageLoader } from "@/components/page-state"
import { useToast } from "@/components/toast"
import { useAnalytics } from "@/lib/analytics/context"
import { createWidget, resolveEntityRecords, type AnalyticsWidget } from "@/lib/analytics/definitions"
import { useAnalyticsSourceData } from "@/lib/analytics/use-source-data"
import { cn } from "@/lib/utils"
import { AnalyticsBuilder } from "../_components/analytics-builder"
import { WidgetCard, WIDGET_WIDTH_CLASS } from "../_components/widget-card"

type BuilderState = { mode: "new" | "edit"; widget: AnalyticsWidget } | null

export default function AnalyticsSpacePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const { getSpace, isLoading, fetchError, updateSpace, refetch } = useAnalytics()
  const { data } = useAnalyticsSourceData()

  const space = getSpace(params.id)
  const [name, setName] = useState("")
  const [builder, setBuilder] = useState<BuilderState>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  useEffect(() => {
    if (space) setName(space.name)
  }, [space])

  const widgets = useMemo(() => space?.widgets ?? [], [space])

  if (isLoading && !space) return <PageLoader label="Loading space…" />
  if (fetchError && !space) return <PageError message={fetchError} onRetry={refetch} />
  if (!space) {
    return (
      <div className="flex h-full flex-col">
        <Header name="Reports" onBack={() => router.push("/reports")} />
        <div className="flex-1 bg-folk-surface">
          <EmptyState
            icon={BarChart3}
            title="Space not found"
            description="This report space may have been deleted."
            action={{ label: "Back to reports", onClick: () => router.push("/reports") }}
            className="h-full"
          />
        </div>
      </div>
    )
  }

  const persistWidgets = (next: AnalyticsWidget[]) => updateSpace(space.id, { widgets: next })

  const handleSaveName = () => {
    const trimmed = name.trim() || "Untitled space"
    if (trimmed !== space.name) updateSpace(space.id, { name: trimmed })
  }

  const handleSaveWidget = (widget: AnalyticsWidget) => {
    if (builder?.mode === "edit") {
      persistWidgets(widgets.map((item) => (item.id === widget.id ? widget : item)))
      toast("Report updated", "success")
    } else {
      persistWidgets([...widgets, widget])
      toast("Report added", "success")
    }
    setBuilder(null)
  }

  const handleDuplicate = (widget: AnalyticsWidget) => {
    const copy = createWidget({ ...widget, title: `${widget.title} (copy)` })
    const index = widgets.findIndex((item) => item.id === widget.id)
    const next = [...widgets]
    next.splice(index + 1, 0, copy)
    persistWidgets(next)
    toast("Report duplicated", "success")
  }

  const handleDelete = (widget: AnalyticsWidget) => {
    persistWidgets(widgets.filter((item) => item.id !== widget.id))
    toast(`Removed "${widget.title}"`, "success")
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const active = event.active.data.current
    const over = event.over?.data.current
    if (active?.kind !== "widget" || !over) return
    const activeId = active.widgetId as string
    const next = [...widgets]
    const from = next.findIndex((item) => item.id === activeId)
    if (from === -1) return
    const [moved] = next.splice(from, 1)
    if (over.kind === "widget-slot") {
      const to = next.findIndex((item) => item.id === over.widgetId)
      next.splice(to === -1 ? next.length : to, 0, moved)
    } else {
      next.push(moved)
    }
    persistWidgets(next)
  }

  return (
    <div className="relative flex h-full flex-col">
      <Header
        name={name}
        onName={setName}
        onSaveName={handleSaveName}
        icon={space.icon}
        onBack={() => router.push("/reports")}
        onAdd={() => setBuilder({ mode: "new", widget: createWidget() })}
      />

      <div className="flex-1 overflow-y-auto bg-folk-surface p-[20px]">
        {widgets.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No reports yet"
            description="Add your first report — pick a visualisation, choose a data source, and it pulls live data from your workspace."
            action={{ label: "Add report", onClick: () => setBuilder({ mode: "new", widget: createWidget() }) }}
            className="mt-[40px]"
          />
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="mx-auto grid max-w-[1280px] grid-cols-6 gap-[14px]">
              {widgets.map((widget) => (
                <div key={widget.id} className={WIDGET_WIDTH_CLASS[widget.width]}>
                  <WidgetCard
                    widget={widget}
                    records={resolveEntityRecords(widget.source, data)}
                    onEdit={() => setBuilder({ mode: "edit", widget })}
                    onDuplicate={() => handleDuplicate(widget)}
                    onDelete={() => handleDelete(widget)}
                  />
                </div>
              ))}
              <EndDropZone />
            </div>
          </DndContext>
        )}
      </div>

      {builder && (
        <AnalyticsBuilder
          initialWidget={builder.widget}
          isNew={builder.mode === "new"}
          onSave={handleSaveWidget}
          onCancel={() => setBuilder(null)}
        />
      )}
    </div>
  )
}

function EndDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-end", data: { kind: "canvas-end" } })
  return <div ref={setNodeRef} className={cn("col-span-6 h-[8px] rounded-full transition-colors", isOver && "bg-[#3BA3F8]/30")} />
}

interface HeaderProps {
  name: string
  onName?: (value: string) => void
  onSaveName?: () => void
  icon?: string
  onBack: () => void
  onAdd?: () => void
}

function Header({ name, onName, onSaveName, icon, onBack, onAdd }: HeaderProps) {
  return (
    <>
      <PageTitleBar
        onBack={onBack}
        backLabel="Back to reports"
        title={
          onName ? (
            <input
              value={name}
              onChange={(event) => onName(event.target.value)}
              onBlur={onSaveName}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur()
              }}
              className={pageTitleTextClass("min-w-0 flex-1 bg-transparent outline-none")}
              aria-label="Space name"
              tabIndex={0}
            />
          ) : (
            name
          )
        }
      />
      {(icon || onAdd) && (
        <PageToolbarBar align="between">
          {icon ? <span className="text-[16px]">{icon}</span> : <span />}
          {onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              className="outline-btn flex shrink-0 items-center gap-[5px] px-[10px] py-[5px] text-[13px] font-medium"
              tabIndex={0}
              aria-label="Add report"
            >
              <Plus className="h-[13px] w-[13px]" strokeWidth={1.75} />
              <span>Report</span>
            </button>
          ) : null}
        </PageToolbarBar>
      )}
    </>
  )
}
