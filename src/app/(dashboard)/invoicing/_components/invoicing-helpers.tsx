"use client"

import type { ComponentType, CSSProperties } from "react"
import { ChevronLeft, Receipt, X } from "lucide-react"
import { EditableField } from "@/components/editable-field"

export function FilterPill({
  icon: Icon,
  label,
  count,
  onOpen,
  onClear,
  buttonRef,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  count: number
  onOpen: () => void
  onClear: () => void
  buttonRef: (element: HTMLButtonElement | null) => void
}) {
  return (
    <div className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626]">
      <Icon className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
      <button ref={buttonRef} onClick={onOpen} className="hover:underline" tabIndex={0}>
        {label}
      </button>
      <span className="text-[#888]">is</span>
      <span>{count} {count === 1 ? "value" : "values"}</span>
      <button onClick={onClear} className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded text-[#888] transition-colors hover:text-[#262626]" tabIndex={0} aria-label={`Clear ${label.toLowerCase()} filter`}>
        <X className="h-[12px] w-[12px]" strokeWidth={1.5} />
      </button>
    </div>
  )
}

export function DisplaySection({
  title,
  items,
  activeItems,
  onToggle,
  formatLabel,
}: {
  title: string
  items: string[]
  activeItems: string[]
  onToggle: (value: string) => void
  formatLabel?: (value: string) => string
}) {
  if (items.length === 0) return null

  return (
    <div className="px-[20px] pb-[16px] pt-[2px]">
      <div className="pb-[12px] text-[13px] font-medium text-[#888]">{title}</div>
      <div className="flex flex-wrap gap-[8px]">
        {items.map((item) => {
          const isActive = activeItems.includes(item)
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className={`inline-flex items-center rounded-[4px] border px-[10px] py-[5px] text-[12px] font-medium transition-colors ${isActive ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-[#dcdcdc] bg-transparent text-[#262626] hover:bg-[#f5f5f5]"}`}
              tabIndex={0}
            >
              {formatLabel ? formatLabel(item) : item}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function MultiSelectDropdown({
  title,
  items,
  selectedValues,
  onToggle,
  onBack,
  onClear,
  emptyLabel = "No options",
  style,
}: {
  title: string
  items: Array<{ value: string; label: string }>
  selectedValues: string[]
  onToggle: (value: string) => void
  onBack: () => void
  onClear: () => void
  emptyLabel?: string
  style: CSSProperties
}) {
  return (
    <div className="fixed z-[60] max-h-[280px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]" style={style}>
      <button onClick={onBack} className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
        <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
        <span>Back</span>
      </button>
      <p className="px-[16px] py-[4px] text-[11px] font-medium text-[#888]">{title}</p>
      {items.map((item) => {
        const isActive = selectedValues.includes(item.value)
        return (
          <button
            key={item.value}
            onClick={() => onToggle(item.value)}
            className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-[#f5f5f5]" : ""}`}
            tabIndex={0}
          >
            <div className={`flex h-[16px] w-[16px] items-center justify-center rounded border ${isActive ? "border-[#262626] bg-[#262626]" : "border-[#d0d0d0]"}`}>
              {isActive && <span className="text-[10px] text-white">✓</span>}
            </div>
            <span className="text-[#262626]">{item.label}</span>
          </button>
        )
      })}
      {items.length === 0 && <p className="px-[16px] py-[8px] text-[13px] text-[#888]">{emptyLabel}</p>}
      <div className="border-t border-[#f0f0f0] px-[8px] py-[4px]">
        <button onClick={onClear} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>
          Clear
        </button>
      </div>
    </div>
  )
}

export function SidebarField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  options,
  formatValue,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: "text" | "select"
  options?: string[]
  formatValue?: (value: string) => string
}) {
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
      <span className="text-[13px] font-medium text-[#8d8d8d]">{label}</span>
      <div className="min-w-0">
        <EditableField
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={type}
          options={options}
          size="compact"
          offsetClassName=""
          emptyLabel="Empty"
          displayClassName="block min-w-0 rounded-[10px] px-[8px] py-[6px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f7f7f7]"
          dropdownButtonClassName="flex w-full min-w-0 items-center justify-between rounded-[10px] border border-[#a3c4f3] bg-[#fafafa] px-[8px] py-[5px] text-left text-[13px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
          dropdownItemClassName="flex w-full items-center px-[8px] py-[6px] text-left text-[13px] font-medium transition-colors hover:bg-[#f5f5f5]"
          inputClassName="w-full rounded-[10px] border border-[#a3c4f3] bg-[#fafafa] px-[8px] py-[5px] pr-[28px] text-[13px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
        />
        {formatValue && value && (
          <div className="mt-[2px] px-[8px] text-[12px] text-[#888]">{formatValue(value)}</div>
        )}
      </div>
    </div>
  )
}

export function SidebarStaticField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[12px]">
      <span className="text-[13px] font-medium text-[#8d8d8d]">{label}</span>
      <div className={`min-w-0 rounded-[10px] px-[8px] py-[6px] text-[13px] font-medium ${value === "Empty" ? "text-[#ccc]" : "text-[#262626]"}`}>
        {value}
      </div>
    </div>
  )
}

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-[24px] py-[56px] text-center">
      <div className="rounded-full bg-[#f5f5f5] p-[12px]">
        <Receipt className="h-[20px] w-[20px] text-[#999]" strokeWidth={1.5} />
      </div>
      <h3 className="mt-[14px] text-[15px] font-semibold text-[#262626]">No tasks ready to invoice</h3>
      <p className="mt-[6px] max-w-[320px] text-[13px] text-[#888]">
        Completed coordinator tasks will appear here automatically as soon as they are ticked off.
      </p>
    </div>
  )
}
