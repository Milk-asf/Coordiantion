"use client"

import { useDraggable } from "@dnd-kit/core"
import {
  VISUALIZATIONS,
  VISUALIZATION_CATEGORY_LABELS,
  VISUALIZATION_CATEGORY_ORDER,
  type VisualizationType,
} from "@/lib/analytics/definitions"
import { cn } from "@/lib/utils"

interface VisualizationPaletteProps {
  active: VisualizationType
  onSelect: (type: VisualizationType) => void
}

export function VisualizationPalette({ active, onSelect }: VisualizationPaletteProps) {
  return (
    <div className="flex flex-col gap-[20px] p-[12px]">
      {VISUALIZATION_CATEGORY_ORDER.map((category) => {
        const items = VISUALIZATIONS.filter((meta) => meta.category === category)
        if (items.length === 0) return null
        return (
          <div key={category}>
            <p className="mb-[8px] px-[2px] text-[11px] font-medium uppercase tracking-wide text-folk-tertiary">
              {VISUALIZATION_CATEGORY_LABELS[category]}
            </p>
            <div className="flex flex-col gap-[6px]">
              {items.map((meta) => (
                <PaletteItem
                  key={meta.type}
                  type={meta.type}
                  label={meta.label}
                  isActive={active === meta.type}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface PaletteItemProps {
  type: VisualizationType
  label: string
  isActive: boolean
  onSelect: (type: VisualizationType) => void
}

function PaletteItem({ type, label, isActive, onSelect }: PaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `viz:${type}`,
    data: { kind: "viz", visualization: type },
  })
  const Icon = VISUALIZATIONS.find((meta) => meta.type === type)!.icon

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onSelect(type)}
      className={cn(
        "group flex w-full items-center gap-[10px] rounded-[8px] border px-[10px] py-[8px] text-left transition-colors",
        isActive
          ? "border-[#a3c4f3] bg-[#f5f9ff]"
          : "border-folk-border bg-white hover:border-folk-border-strong hover:bg-folk-hover",
        isDragging && "opacity-40",
      )}
      {...listeners}
      {...attributes}
    >
      <span
        className={cn(
          "flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[6px] transition-colors",
          isActive ? "bg-white text-[#2563EB]" : "bg-folk-hover text-folk-secondary group-hover:bg-white",
        )}
      >
        <Icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
      </span>
      <span className={cn("min-w-0 flex-1 truncate text-[13px]", isActive ? "font-medium text-folk-text" : "text-folk-text")}>{label}</span>
    </button>
  )
}
