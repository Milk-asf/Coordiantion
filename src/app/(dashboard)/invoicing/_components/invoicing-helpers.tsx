"use client"

import { useRef, type ComponentType } from "react"
import { ChevronLeft, Receipt, X } from "lucide-react"
import { EditableField } from "@/components/editable-field"
import { FolkSidebarField, FolkSidebarStaticValue } from "@/components/folk-sidebar"
import { FixedDropdownMenu } from "@/components/fixed-dropdown-menu"
import { DisplayFilterList, createDisplayFilterToggle, getDisplayFilterVisibleKeys } from "@/components/display-popover"

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
    <div className="flex items-center gap-[6px] rounded-[6px] border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text">
      <Icon className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
      <button ref={buttonRef} onClick={onOpen} className="hover:underline" tabIndex={0}>
        {label}
      </button>
      <span className="text-folk-secondary">is</span>
      <span>{count} {count === 1 ? "value" : "values"}</span>
      <button onClick={onClear} className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:text-folk-text" tabIndex={0} aria-label={`Clear ${label.toLowerCase()} filter`}>
        <X className="h-[12px] w-[12px]" strokeWidth={1.5} />
      </button>
    </div>
  )
}

export function DisplaySection({
  title,
  items,
  activeItems,
  setActiveItems,
  formatLabel,
}: {
  title: string
  items: string[]
  activeItems: string[]
  setActiveItems: (value: string[]) => void
  formatLabel?: (value: string) => string
}) {
  if (items.length === 0) return null

  return (
    <DisplayFilterList
      title={title}
      items={items}
      activeItems={getDisplayFilterVisibleKeys(items, activeItems)}
      onToggle={createDisplayFilterToggle(items, activeItems, setActiveItems)}
      formatLabel={formatLabel}
    />
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
  anchorElement,
  onClose,
}: {
  title: string
  items: Array<{ value: string; label: string }>
  selectedValues: string[]
  onToggle: (value: string) => void
  onBack: () => void
  onClear: () => void
  emptyLabel?: string
  anchorElement: HTMLElement
  onClose: () => void
}) {
  const anchorRef = useRef<HTMLElement | null>(null)
  anchorRef.current = anchorElement

  return (
    <FixedDropdownMenu
      isOpen
      anchorRef={anchorRef}
      anchorElement={anchorElement}
      onClose={onClose}
      estimatedHeight={Math.min(280, items.length * 36 + 120)}
      minWidth={200}
      className="py-[4px]"
    >
      <button onClick={onBack} className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-folk-secondary transition-colors hover:text-folk-text" tabIndex={0}>
        <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
        <span>Back</span>
      </button>
      <p className="px-[16px] py-[4px] text-[11px] font-medium text-folk-secondary">{title}</p>
      {items.map((item) => {
        const isActive = selectedValues.includes(item.value)
        return (
          <button
            key={item.value}
            onClick={() => onToggle(item.value)}
            className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-folk-hover ${isActive ? "bg-folk-hover" : ""}`}
            tabIndex={0}
          >
            <div className={`flex h-[16px] w-[16px] items-center justify-center rounded-[4px] border border-folk-text bg-white`}>
              {isActive && <span className="text-[10px] leading-none text-folk-text">✓</span>}
            </div>
            <span className="text-folk-text">{item.label}</span>
          </button>
        )
      })}
      {items.length === 0 && <p className="px-[16px] py-[8px] text-[13px] text-folk-secondary">{emptyLabel}</p>}
      <div className="border-t border-folk-border-subtle px-[8px] py-[4px]">
        <button onClick={onClear} className="w-full rounded-[6px] px-[8px] py-[6px] text-left text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text" tabIndex={0}>
          Clear
        </button>
      </div>
    </FixedDropdownMenu>
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
    <FolkSidebarField label={label}>
      <EditableField
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        options={options}
        size="compact"
        offsetClassName=""
        emptyLabel="Empty"
        displayClassName="block min-w-0 rounded-md px-[8px] py-[6px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-page"
        dropdownButtonClassName="flex w-full min-w-0 items-center justify-between rounded-md border border-[#a3c4f3] bg-folk-page px-[8px] py-[5px] text-left text-[13px] font-medium text-folk-text shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
        dropdownItemClassName="flex w-full items-center px-[8px] py-[6px] text-left text-[13px] font-medium transition-colors hover:bg-folk-hover"
        inputClassName="w-full rounded-md border border-[#a3c4f3] bg-folk-page px-[8px] py-[5px] pr-[28px] text-[13px] font-medium text-folk-text shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
      />
      {formatValue && value && (
        <div className="mt-[2px] px-[8px] text-[12px] text-folk-secondary">{formatValue(value)}</div>
      )}
    </FolkSidebarField>
  )
}

export function SidebarStaticField({ label, value }: { label: string; value: string }) {
  return (
    <FolkSidebarField label={label}>
      <FolkSidebarStaticValue value={value === "Empty" ? "" : value} emptyLabel="Empty" />
    </FolkSidebarField>
  )
}

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-[24px] py-[56px] text-center">
      <div className="rounded-full bg-folk-hover p-[12px]">
        <Receipt className="h-[20px] w-[20px] text-folk-secondary" strokeWidth={1.5} />
      </div>
      <h3 className="mt-[14px] text-[15px] font-semibold text-folk-text">No tasks ready to invoice</h3>
      <p className="mt-[6px] max-w-[320px] text-[13px] text-folk-secondary">
        Completed coordinator tasks will appear here automatically as soon as they are ticked off.
      </p>
    </div>
  )
}
