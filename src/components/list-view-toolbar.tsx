"use client"

import { useRef, useState, type ReactNode } from "react"
import { ArrowDownUp, Check } from "lucide-react"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { FixedSelectDropdown, FixedSelectOption } from "@/components/fixed-select-dropdown"
import { TableMultiFilter, type TableFilterDefinition } from "@/components/table-multi-filter"
import { listViewFilterBarClass } from "@/components/tab-active-indicator"
import type { ListQuerySort } from "@/lib/list-query/types"
import { cn } from "@/lib/utils"

export interface ListViewSortField {
  key: string
  label: string
}

interface ListViewToolbarProps {
  className?: string
  leading?: ReactNode
  filters?: TableFilterDefinition[]
  filterValues?: Record<string, string[]>
  filterOptions?: Record<string, string[]>
  onFilterChange?: (key: string, values: string[]) => void
  formatFilterOption?: (filterKey: string, value: string) => string
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  searchAriaLabel?: string
  sortFields?: ListViewSortField[]
  sort?: ListQuerySort | null
  onSelectSort?: (key: string) => void
  onClearSort?: () => void
  trailing?: ReactNode
}

export function ListViewToolbar({
  className,
  leading,
  filters = [],
  filterValues = {},
  filterOptions = {},
  onFilterChange,
  formatFilterOption,
  search = "",
  onSearchChange,
  searchPlaceholder = "Search…",
  searchAriaLabel = "Search",
  sortFields = [],
  sort = null,
  onSelectSort,
  onClearSort,
  trailing,
}: ListViewToolbarProps) {
  const sortTriggerRef = useRef<HTMLButtonElement>(null)
  const [isSortOpen, setIsSortOpen] = useState(false)

  const sortLabel = sort
    ? sortFields.find((field) => field.key === sort.key)?.label ?? "Sort"
    : "Sort"

  const showSearch = Boolean(onSearchChange)
  const showSort = sortFields.length > 0 && onSelectSort
  const showFilters = filters.length > 0 && onFilterChange
  const showTrailing = showSearch || showSort || trailing

  return (
    <div className={listViewFilterBarClass(cn("flex-nowrap", className))}>
      <div className="flex min-w-0 flex-1 items-center gap-[8px]">
        {leading}
        {showFilters && (
          <TableMultiFilter
            filters={filters}
            values={filterValues}
            options={filterOptions}
            onChange={onFilterChange}
            formatOption={formatFilterOption}
          />
        )}
        {showTrailing && (
          <div className="ml-auto flex shrink-0 items-center gap-[8px]">
            {showSearch && onSearchChange && (
              <ExpandableTableSearch
                value={search}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
                ariaLabel={searchAriaLabel}
              />
            )}
            {showSort && (
              <div className="relative">
                <button
                  ref={sortTriggerRef}
                  type="button"
                  onClick={() => setIsSortOpen((open) => !open)}
                  className={cn(
                    "outline-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[12px] font-medium transition-colors",
                    sort && "text-folk-text",
                  )}
                  tabIndex={0}
                >
                  <ArrowDownUp className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  <span>{sortLabel}</span>
                  {sort && (
                    <span className="text-folk-secondary">{sort.dir === "asc" ? "↑" : "↓"}</span>
                  )}
                </button>
                <FixedSelectDropdown
                  isOpen={isSortOpen}
                  anchorRef={sortTriggerRef}
                  onClose={() => setIsSortOpen(false)}
                  minWidth={200}
                  align="right"
                >
                  {sort && onClearSort && (
                    <FixedSelectOption
                      muted
                      onClick={() => {
                        onClearSort()
                        setIsSortOpen(false)
                      }}
                    >
                      <span className="flex-1">Clear sort</span>
                    </FixedSelectOption>
                  )}
                  {sortFields.map((field) => (
                    <FixedSelectOption
                      key={field.key}
                      isActive={field.key === sort?.key}
                      onClick={() => {
                        onSelectSort(field.key)
                        setIsSortOpen(false)
                      }}
                    >
                      <span className="flex-1">{field.label}</span>
                      {field.key === sort?.key && (
                        <span className="flex items-center gap-[4px] text-folk-secondary">
                          <span>{sort.dir === "asc" ? "↑" : "↓"}</span>
                          <Check className="h-[14px] w-[14px] text-folk-text" strokeWidth={2} />
                        </span>
                      )}
                    </FixedSelectOption>
                  ))}
                </FixedSelectDropdown>
              </div>
            )}
            {trailing}
          </div>
        )}
      </div>
    </div>
  )
}
