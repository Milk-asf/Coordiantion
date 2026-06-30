"use client"

import { useState } from "react"
import { ArrowLeft, Kanban, Table2 } from "lucide-react"
import { FormModal } from "@/components/form-modal"
import { cn } from "@/lib/utils"
import {
  LIST_ICON_CHOICES,
  LIST_ICON_COLORS,
  LIST_SOURCES,
  type ListTemplate,
  type ListViewMode,
} from "@/lib/lists/definitions"

const VIEW_OPTIONS: { value: ListViewMode; label: string; icon: typeof Table2 }[] = [
  { value: "table", label: "Table", icon: Table2 },
  { value: "kanban", label: "Kanban", icon: Kanban },
]

export interface NewListConfig {
  name: string
  icon: string
  iconColor: string
  source: string
  columns?: string[]
  view?: ListTemplate["view"]
  kanbanField?: string | null
}

interface NewListModalProps {
  onClose: () => void
  onCreate: (params: NewListConfig) => void
  onBack?: () => void
  template?: ListTemplate | null
}

export function NewListModal({ onClose, onCreate, onBack, template }: NewListModalProps) {
  const [name, setName] = useState(template?.name ?? "")
  const [icon, setIcon] = useState(template?.icon ?? LIST_ICON_CHOICES[0])
  const [iconColor, setIconColor] = useState(template?.iconColor ?? LIST_ICON_COLORS[0])
  const [source, setSource] = useState(template?.source ?? LIST_SOURCES[0].key)
  const [view, setView] = useState<ListViewMode>(template?.view ?? "table")
  const [isIconOpen, setIsIconOpen] = useState(false)

  const handleCreate = () => {
    // Carry template columns only while the source matches the template.
    const usesTemplate = template && template.source === source
    onCreate({
      name: name.trim(),
      icon,
      iconColor,
      source,
      view,
      ...(usesTemplate
        ? {
            columns: template.columns,
            // Keep the template's kanban grouping; let createList derive one
            // when switching to kanban without a preset field.
            ...(view === "kanban" && !template.kanbanField ? {} : { kanbanField: template.kanbanField }),
          }
        : {}),
    })
  }

  return (
    <FormModal onClose={onClose} width={560}>
      <div className="flex flex-col p-[24px]">
        <div className="flex items-center gap-[8px]">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="-ml-[6px] flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
              aria-label="Back to templates"
              tabIndex={0}
            >
              <ArrowLeft className="h-[16px] w-[16px]" strokeWidth={1.75} />
            </button>
          )}
          <h2 className="text-[18px] font-semibold text-folk-text">{template ? template.name : "New list"}</h2>
        </div>
        <p className="mt-[4px] text-[13px] leading-[1.5] text-folk-secondary">
          {template
            ? "Tweak the name and data source, then create your list."
            : "Pick a data source and view mode. We'll add five useful columns to get you started."}
        </p>

        <div className="relative mt-[20px] flex items-center gap-[10px]">
          <button
            type="button"
            onClick={() => setIsIconOpen((open) => !open)}
            className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[10px] border border-[#bababa] text-[20px] transition-colors hover:bg-folk-hover"
            style={{ backgroundColor: `${iconColor}1a` }}
            aria-label="Choose icon"
            tabIndex={0}
          >
            {icon}
          </button>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleCreate()
            }}
            placeholder="List name"
            className="h-[40px] min-w-0 flex-1 rounded-[10px] border border-folk-border-strong px-[12px] text-[14px] text-folk-text outline-none transition-colors focus:border-folk-text placeholder:text-folk-placeholder"
            autoFocus
            aria-label="List name"
          />

          {isIconOpen && (
            <div className="absolute left-0 top-[48px] z-20 w-[240px] rounded-[10px] border border-folk-border bg-white p-[10px] shadow-folk">
              <div className="grid grid-cols-6 gap-[4px]">
                {LIST_ICON_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => {
                      setIcon(choice)
                      setIsIconOpen(false)
                    }}
                    className={cn(
                      "flex h-[32px] w-[32px] items-center justify-center rounded-[8px] text-[18px] transition-colors hover:bg-folk-hover",
                      icon === choice && "bg-folk-hover",
                    )}
                    tabIndex={0}
                  >
                    {choice}
                  </button>
                ))}
              </div>
              <div className="mt-[8px] flex items-center gap-[6px] border-t border-folk-border-subtle pt-[8px]">
                {LIST_ICON_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setIconColor(color)}
                    className={cn(
                      "h-[20px] w-[20px] rounded-full border transition-transform hover:scale-110",
                      iconColor === color ? "border-folk-text" : "border-transparent",
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Colour ${color}`}
                    tabIndex={0}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mb-[10px] mt-[20px] text-[13px] font-medium text-folk-text">What do you want to track?</p>
        <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-3">
          {LIST_SOURCES.map((option) => {
            const Icon = option.icon
            const isActive = option.key === source
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setSource(option.key)}
                className={cn(
                  "flex items-center gap-[8px] rounded-[10px] border px-[12px] py-[10px] text-left transition-colors",
                  isActive ? "border-folk-text bg-folk-hover" : "border-[#bababa] bg-white hover:bg-folk-hover",
                )}
                tabIndex={0}
                aria-pressed={isActive}
              >
                <Icon className="h-[16px] w-[16px] shrink-0 text-folk-secondary" strokeWidth={1.75} />
                <span className="min-w-0 truncate text-[13px] font-medium text-folk-text">{option.label}</span>
              </button>
            )
          })}
        </div>

        <p className="mb-[10px] mt-[20px] text-[13px] font-medium text-folk-text">How do you want to view it?</p>
        <div className="grid grid-cols-2 gap-[8px]">
          {VIEW_OPTIONS.map((option) => {
            const Icon = option.icon
            const isActive = option.value === view
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setView(option.value)}
                className={cn(
                  "flex items-center gap-[8px] rounded-[10px] border px-[12px] py-[10px] text-left transition-colors",
                  isActive ? "border-folk-text bg-folk-hover" : "border-[#bababa] bg-white hover:bg-folk-hover",
                )}
                tabIndex={0}
                aria-pressed={isActive}
              >
                <Icon className="h-[16px] w-[16px] shrink-0 text-folk-secondary" strokeWidth={1.75} />
                <span className="min-w-0 truncate text-[13px] font-medium text-folk-text">{option.label}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-[24px] flex items-center justify-end gap-[8px]">
          <button
            type="button"
            onClick={onClose}
            className="outline-btn folk-pill-btn px-[14px] py-[6px] text-[13px] font-medium"
            tabIndex={0}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="primary-btn folk-pill-btn px-[14px] py-[6px] text-[13px] font-medium"
            tabIndex={0}
          >
            Create list
          </button>
        </div>
      </div>
    </FormModal>
  )
}
