"use client"

import { useRef, useState, type ComponentType } from "react"
import { ChevronLeft, ListFilter, X } from "lucide-react"
import { FixedDropdownMenu } from "@/components/fixed-dropdown-menu"
import { folkFilterBtnClass } from "@/lib/folk-ui"

export interface TableFilterDefinition {
  key: string
  label: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}

interface TableMultiFilterProps {
  filters: TableFilterDefinition[]
  values: Record<string, string[]>
  options: Record<string, string[]>
  onChange: (key: string, values: string[]) => void
  formatOption?: (filterKey: string, value: string) => string
  className?: string
}

export function TableMultiFilter({
  filters,
  values,
  options,
  onChange,
  formatOption = (_key, value) => value,
  className = "",
}: TableMultiFilterProps) {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const filterPillRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const activeFilter = filters.find((f) => f.key === activeFilterDropdown)
  const activeValues = activeFilterDropdown ? values[activeFilterDropdown] ?? [] : []
  const activeOptions = activeFilterDropdown ? options[activeFilterDropdown] ?? [] : []

  const handleToggleValue = (filterKey: string, value: string) => {
    const current = values[filterKey] ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    onChange(filterKey, next)
  }

  const valueDropdownAnchor =
    activeFilterDropdown
      ? filterPillRefs.current[activeFilterDropdown] ?? filterBtnRef.current
      : null

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          ref={filterBtnRef}
          type="button"
          onClick={() => {
            setIsFilterMenuOpen(!isFilterMenuOpen)
            setActiveFilterDropdown(null)
          }}
          className={folkFilterBtnClass("px-[8px] py-[4px]")}
          tabIndex={0}
        >
          <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
          Filter
        </button>
        <FixedDropdownMenu
          isOpen={isFilterMenuOpen}
          anchorRef={filterBtnRef}
          onClose={() => setIsFilterMenuOpen(false)}
          estimatedHeight={filters.length * 36 + 40}
          minWidth={200}
          className="py-[4px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
        >
          <p className="px-[16px] py-[6px] text-[11px] font-normal text-folk-secondary">Filter by</p>
          {filters.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setActiveFilterDropdown(item.key)
                  setIsFilterMenuOpen(false)
                }}
                className="flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-normal text-folk-text transition-colors hover:bg-folk-hover"
                tabIndex={0}
              >
                <Icon className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
                {item.label}
              </button>
            )
          })}
        </FixedDropdownMenu>
      </div>

      {filters.map((filter) => {
        const selected = values[filter.key] ?? []
        if (selected.length === 0) return null
        const Icon = filter.icon
        return (
          <div
            key={filter.key}
            className="flex items-center gap-[6px] rounded-full border border-folk-border px-[8px] py-[4px] text-[13px] text-folk-text"
          >
            <Icon className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
            <button
              ref={(el) => { filterPillRefs.current[filter.key] = el }}
              type="button"
              onClick={() => setActiveFilterDropdown(activeFilterDropdown === filter.key ? null : filter.key)}
              className="hover:underline"
              tabIndex={0}
            >
              {filter.label}
            </button>
            <span className="text-folk-secondary">is</span>
            <span>
              {selected.length} {selected.length === 1 ? "value" : "values"}
            </span>
            <button
              type="button"
              onClick={() => onChange(filter.key, [])}
              className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:text-folk-text"
              tabIndex={0}
              aria-label={`Clear ${filter.label.toLowerCase()} filter`}
            >
              <X className="h-[12px] w-[12px]" strokeWidth={1.5} />
            </button>
          </div>
        )
      })}

      {activeFilterDropdown && activeFilter && valueDropdownAnchor && (
        <FilterValueDropdown
          anchorElement={valueDropdownAnchor}
          onClose={() => setActiveFilterDropdown(null)}
          onBack={() => {
            setActiveFilterDropdown(null)
            setIsFilterMenuOpen(true)
          }}
          onClear={() => {
            onChange(activeFilterDropdown, [])
            setActiveFilterDropdown(null)
          }}
          filterLabel={activeFilter.label}
          options={activeOptions}
          activeValues={activeValues}
          onToggleValue={(value) => handleToggleValue(activeFilterDropdown, value)}
          formatOption={(value) => formatOption(activeFilterDropdown, value)}
        />
      )}
    </>
  )
}

interface FilterValueDropdownProps {
  anchorElement: HTMLElement
  onClose: () => void
  onBack: () => void
  onClear: () => void
  filterLabel: string
  options: string[]
  activeValues: string[]
  onToggleValue: (value: string) => void
  formatOption: (value: string) => string
}

function FilterValueDropdown({
  anchorElement,
  onClose,
  onBack,
  onClear,
  filterLabel,
  options,
  activeValues,
  onToggleValue,
  formatOption,
}: FilterValueDropdownProps) {
  const anchorRef = useRef<HTMLElement | null>(null)
  anchorRef.current = anchorElement

  return (
    <FixedDropdownMenu
      isOpen
      anchorRef={anchorRef}
      anchorElement={anchorElement}
      onClose={onClose}
      estimatedHeight={Math.min(280, options.length * 36 + 120)}
      minWidth={200}
      className="py-[4px]"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-folk-secondary transition-colors hover:text-folk-text"
        tabIndex={0}
      >
        <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
        <span>Back</span>
      </button>
      <p className="px-[16px] py-[4px] text-[11px] font-medium text-folk-secondary">
        Filter by {filterLabel.toLowerCase()}
      </p>
      {options.map((val) => {
        const isActive = activeValues.includes(val)
        return (
          <button
            key={val}
            type="button"
            onClick={() => onToggleValue(val)}
            className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-folk-hover ${isActive ? "bg-folk-hover" : ""}`}
            tabIndex={0}
          >
            <div className={`flex h-[16px] w-[16px] items-center justify-center rounded-[4px] border border-folk-text bg-white`}>
              {isActive && <span className="text-[10px] leading-none text-folk-text">✓</span>}
            </div>
            <span className="text-folk-text">{formatOption(val)}</span>
          </button>
        )
      })}
      {options.length === 0 && (
        <p className="px-[16px] py-[8px] text-[13px] text-folk-secondary">No options</p>
      )}
      <div className="border-t border-folk-border-subtle px-[8px] py-[4px]">
        <button
          type="button"
          onClick={onClear}
          className="w-full rounded-none px-[8px] py-[6px] text-left text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
        >
          Clear
        </button>
      </div>
    </FixedDropdownMenu>
  )
}

export function uniqueNonEmpty(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}
