"use client"

import { useState, type ChangeEvent, type ReactNode } from "react"
import { ChevronDown, Plus, X } from "lucide-react"
import { collectFilterValues } from "@/lib/analytics/compute"
import {
  AGGREGATION_LABELS,
  DATE_GRAIN_LABELS,
  getDataSource,
  getDimension,
  getVisualization,
  type AggregationType,
  type AnalyticsWidget,
  type DataEntity,
  type DateGrain,
  type WidgetSort,
  type WidgetWidth,
} from "@/lib/analytics/definitions"
import {
  DATE_WINDOWS,
  createFilterId,
  type DateWindowKey,
  type WidgetFilter,
} from "@/lib/analytics/scope"
import { DataSourceTree } from "./data-source-tree"

interface WidgetConfigPanelProps {
  widget: AnalyticsWidget
  /** Unscoped records for the current source — feeds the filter value pickers. */
  records: unknown[]
  onChange: (updates: Partial<AnalyticsWidget>) => void
}

const SORT_LABELS: Record<WidgetSort, string> = {
  "value-desc": "Value (high → low)",
  "value-asc": "Value (low → high)",
  "label-asc": "Label (A → Z)",
  "label-desc": "Label (Z → A)",
}

const WIDTH_LABELS: Record<WidgetWidth, string> = {
  third: "Small",
  half: "Medium",
  full: "Large",
}

export function WidgetConfigPanel({ widget, records, onChange }: WidgetConfigPanelProps) {
  const source = getDataSource(widget.source)
  const viz = getVisualization(widget.visualization)
  const groupDim = getDimension(source, widget.groupBy)
  const isList = widget.visualization === "list"
  const hasMeasures = source.measures.length > 0
  const showMeasureField = widget.aggregation !== "count" && hasMeasures
  const showGrouping = viz.needsGroup
  const showGrain = showGrouping && groupDim?.kind === "date"
  const showSegment = showGrouping && !viz.singleSeries
  const showSort = showGrouping && groupDim?.kind !== "date"

  const handleSource = (key: string, dimensionKey?: string) => {
    const next = getDataSource(key)
    // Switching source resets the breakdown; picking a dimension leaf focuses it directly.
    if (key === widget.source) {
      onChange({ groupBy: dimensionKey ?? widget.groupBy })
      return
    }
    onChange({
      source: next.key,
      groupBy: dimensionKey ?? next.defaultGroupBy,
      segmentBy: null,
      measureField: null,
      aggregation: "count",
      // Filters and the window's date field are source-specific.
      filters: [],
      dateField: null,
    })
  }

  const handleAggregation = (event: ChangeEvent<HTMLSelectElement>) => {
    const aggregation = event.target.value as AggregationType
    const measureField =
      aggregation === "count" ? null : widget.measureField ?? source.measures[0]?.key ?? null
    onChange({ aggregation, measureField })
  }

  return (
    <div className="flex flex-col">
      <Section title="Data source">
        <Field label="Title">
          <input
            value={widget.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Untitled report"
            className="w-full rounded-[6px] border border-folk-border bg-white px-[10px] py-[7px] text-[13px] text-folk-text outline-none transition-colors focus:border-folk-border-strong"
            tabIndex={0}
          />
        </Field>

        <Field label="Source" hint="Expand a domain, then pick Overview or a field to break down by.">
          <DataSourceTree value={widget.source} groupBy={widget.groupBy} onChange={handleSource} />
        </Field>
      </Section>

      <Section title="Scope">
        <DateWindowFields widget={widget} source={source} onChange={onChange} />
        <FilterList widget={widget} source={source} records={records} onChange={onChange} />
      </Section>

      <Section title="Sizing">
        <Field label="Card size">
          <div className="flex items-center gap-[2px] rounded-[7px] bg-folk-hover p-[2px]">
            {(Object.keys(WIDTH_LABELS) as WidgetWidth[]).map((width) => (
              <button
                key={width}
                type="button"
                onClick={() => onChange({ width })}
                className={`flex-1 rounded-[5px] px-[8px] py-[5px] text-[12px] font-medium transition-colors ${
                  widget.width === width ? "bg-white text-folk-text shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-folk-secondary hover:text-folk-text"
                }`}
                tabIndex={0}
                aria-pressed={widget.width === width}
              >
                {WIDTH_LABELS[width]}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Customise">
        {!isList && (
          <Field label="Metric">
            <div className="flex flex-col gap-[6px]">
              <Select value={widget.aggregation} onChange={handleAggregation}>
                <option value="count">{AGGREGATION_LABELS.count}</option>
                {hasMeasures && (
                  <>
                    <option value="sum">{AGGREGATION_LABELS.sum}</option>
                    <option value="avg">{AGGREGATION_LABELS.avg}</option>
                    <option value="min">{AGGREGATION_LABELS.min}</option>
                    <option value="max">{AGGREGATION_LABELS.max}</option>
                  </>
                )}
              </Select>
              {showMeasureField && (
                <Select
                  value={widget.measureField ?? source.measures[0]?.key ?? ""}
                  onChange={(event) => onChange({ measureField: event.target.value })}
                >
                  {source.measures.map((measure) => (
                    <option key={measure.key} value={measure.key}>
                      {measure.label}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </Field>
        )}

        {showGrouping && (
          <Field label="Grouped by">
            <Select value={widget.groupBy ?? ""} onChange={(event) => onChange({ groupBy: event.target.value })}>
              {source.dimensions.map((dimension) => (
                <option key={dimension.key} value={dimension.key}>
                  {dimension.label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {showGrain && (
          <Field label="Date grouping">
            <Select value={widget.dateGrain} onChange={(event) => onChange({ dateGrain: event.target.value as DateGrain })}>
              {(Object.keys(DATE_GRAIN_LABELS) as DateGrain[]).map((grain) => (
                <option key={grain} value={grain}>
                  {DATE_GRAIN_LABELS[grain]}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {showSegment && (
          <Field label="Segmented by" hint="Split each group into a stacked series.">
            <Select value={widget.segmentBy ?? ""} onChange={(event) => onChange({ segmentBy: event.target.value || null })}>
              <option value="">None</option>
              {source.dimensions
                .filter((dimension) => dimension.key !== widget.groupBy && dimension.kind !== "date")
                .map((dimension) => (
                  <option key={dimension.key} value={dimension.key}>
                    {dimension.label}
                  </option>
                ))}
            </Select>
          </Field>
        )}

        {showSort && (
          <Field label="Sort">
            <Select value={widget.sort} onChange={(event) => onChange({ sort: event.target.value as WidgetSort })}>
              {(Object.keys(SORT_LABELS) as WidgetSort[]).map((sort) => (
                <option key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {(showGrouping || isList) && (
          <Field label={isList ? "Rows" : "Show top"}>
            <Select value={String(widget.limit)} onChange={(event) => onChange({ limit: Number(event.target.value) })}>
              {isList ? (
                <>
                  <option value="5">5 rows</option>
                  <option value="8">8 rows</option>
                  <option value="12">12 rows</option>
                  <option value="0">All rows</option>
                </>
              ) : (
                <>
                  <option value="5">Top 5</option>
                  <option value="8">Top 8</option>
                  <option value="12">Top 12</option>
                  <option value="0">All groups</option>
                </>
              )}
            </Select>
          </Field>
        )}

        {showGrouping && (
          <div className="flex flex-col gap-[10px]">
            <Toggle label="Show value labels" checked={widget.showValues} onChange={(value) => onChange({ showValues: value })} />
            {!viz.singleSeries && (
              <Toggle label="Show legend" checked={widget.showLegend} onChange={(value) => onChange({ showLegend: value })} />
            )}
          </div>
        )}
      </Section>
    </div>
  )
}

function DateWindowFields({
  widget,
  source,
  onChange,
}: {
  widget: AnalyticsWidget
  source: DataEntity
  onChange: (updates: Partial<AnalyticsWidget>) => void
}) {
  const dateDims = source.dimensions.filter((dimension) => dimension.kind === "date")
  const windowActive = (widget.dateWindow ?? "all") !== "all"

  if (dateDims.length === 0) return null

  return (
    <>
      <Field label="Date range">
        <Select
          value={widget.dateWindow ?? "all"}
          onChange={(event) => onChange({ dateWindow: event.target.value as DateWindowKey })}
        >
          {DATE_WINDOWS.map((window) => (
            <option key={window.key} value={window.key}>
              {window.label}
            </option>
          ))}
        </Select>
      </Field>
      {windowActive && dateDims.length > 1 && (
        <Field label="Using date field">
          <Select
            value={widget.dateField ?? dateDims[0].key}
            onChange={(event) => onChange({ dateField: event.target.value })}
          >
            {dateDims.map((dimension) => (
              <option key={dimension.key} value={dimension.key}>
                {dimension.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </>
  )
}

function FilterList({
  widget,
  source,
  records,
  onChange,
}: {
  widget: AnalyticsWidget
  source: DataEntity
  records: unknown[]
  onChange: (updates: Partial<AnalyticsWidget>) => void
}) {
  const filters = widget.filters ?? []
  // Dates are scoped by the window above; filters cover category/boolean fields.
  const filterableDims = source.dimensions.filter((dimension) => dimension.kind !== "date")

  if (filterableDims.length === 0) return null

  const setFilters = (next: WidgetFilter[]) => onChange({ filters: next })

  const handleAdd = () => {
    const used = new Set(filters.map((filter) => filter.dimension))
    const nextDim = filterableDims.find((dimension) => !used.has(dimension.key)) ?? filterableDims[0]
    setFilters([...filters, { id: createFilterId(), dimension: nextDim.key, values: [] }])
  }

  return (
    <Field label="Filters" hint={filters.length === 0 ? "Narrow this report — e.g. only completed shifts or expired screening." : undefined}>
      <div className="flex flex-col gap-[8px]">
        {filters.map((filter) => (
          <FilterEditor
            key={filter.id}
            filter={filter}
            dims={filterableDims}
            records={records}
            onChange={(next) => setFilters(filters.map((item) => (item.id === filter.id ? next : item)))}
            onRemove={() => setFilters(filters.filter((item) => item.id !== filter.id))}
          />
        ))}
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center justify-center gap-[5px] rounded-[6px] border border-dashed border-folk-border-strong px-[10px] py-[6px] text-[12px] font-medium text-folk-secondary transition-colors hover:border-[#a3c4f3] hover:bg-[#f5f9ff] hover:text-folk-text"
          tabIndex={0}
        >
          <Plus className="h-[12px] w-[12px]" strokeWidth={2} />
          Add filter
        </button>
      </div>
    </Field>
  )
}

function FilterEditor({
  filter,
  dims,
  records,
  onChange,
  onRemove,
}: {
  filter: WidgetFilter
  dims: DataEntity["dimensions"]
  records: unknown[]
  onChange: (filter: WidgetFilter) => void
  onRemove: () => void
}) {
  const dimension = dims.find((item) => item.key === filter.dimension) ?? dims[0]
  const options = dimension ? collectFilterValues(dimension, records) : []
  const selected = new Set(filter.values)

  const toggleValue = (key: string) => {
    const values = selected.has(key)
      ? filter.values.filter((value) => value !== key)
      : [...filter.values, key]
    onChange({ ...filter, values })
  }

  return (
    <div className="rounded-[8px] border border-folk-border bg-white">
      <div className="flex items-center gap-[6px] border-b border-folk-border-subtle p-[6px]">
        <div className="min-w-0 flex-1">
          <Select
            value={filter.dimension}
            onChange={(event) => onChange({ ...filter, dimension: event.target.value, values: [] })}
          >
            {dims.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[5px] text-folk-tertiary transition-colors hover:bg-folk-hover hover:text-folk-text"
          aria-label="Remove filter"
          tabIndex={0}
        >
          <X className="h-[13px] w-[13px]" strokeWidth={1.75} />
        </button>
      </div>
      <div className="max-h-[150px] overflow-y-auto p-[4px]">
        {options.length === 0 ? (
          <p className="px-[6px] py-[5px] text-[11px] text-folk-tertiary">No values in the current data.</p>
        ) : (
          options.map((option) => (
            <label
              key={option.key}
              className="flex cursor-pointer items-center gap-[8px] rounded-[5px] px-[6px] py-[4px] transition-colors hover:bg-folk-hover"
            >
              <input
                type="checkbox"
                checked={selected.has(option.key)}
                onChange={() => toggleValue(option.key)}
                className="h-[13px] w-[13px] accent-[#111111]"
                tabIndex={0}
              />
              <span className="min-w-0 flex-1 truncate text-[12px] text-folk-text">{option.label}</span>
              <span className="shrink-0 text-[11px] tabular-nums text-folk-tertiary">{option.count}</span>
            </label>
          ))
        )}
      </div>
      {filter.values.length === 0 && options.length > 0 && (
        <p className="border-t border-folk-border-subtle px-[10px] py-[5px] text-[11px] text-folk-tertiary">
          Select values to include — empty means no filtering.
        </p>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="flex flex-col border-b border-folk-border-subtle last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between gap-[8px] px-[14px] py-[12px] text-left transition-colors hover:bg-folk-hover"
        aria-expanded={isOpen}
        tabIndex={0}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-folk-tertiary">{title}</span>
        <ChevronDown
          className={`h-[14px] w-[14px] text-folk-tertiary transition-transform ${isOpen ? "" : "-rotate-90"}`}
          strokeWidth={2}
        />
      </button>
      {isOpen && <div className="flex flex-col gap-[14px] px-[14px] pb-[16px] pt-[2px]">{children}</div>}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label className="text-[12px] font-medium text-folk-text">{label}</label>
      {children}
      {hint && <p className="text-[11px] leading-[1.5] text-folk-tertiary">{hint}</p>}
    </div>
  )
}

function Select({ value, onChange, children }: { value: string; onChange: (event: ChangeEvent<HTMLSelectElement>) => void; children: ReactNode }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="w-full appearance-none rounded-[6px] border border-folk-border bg-white px-[10px] py-[7px] pr-[28px] text-[13px] text-folk-text outline-none transition-colors focus:border-folk-border-strong"
        tabIndex={0}
      >
        {children}
      </select>
      <svg className="pointer-events-none absolute right-[9px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-folk-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-[8px] text-left"
      tabIndex={0}
      aria-pressed={checked}
    >
      <span className="text-[12px] text-folk-text">{label}</span>
      <span className={`relative h-[18px] w-[32px] shrink-0 rounded-full transition-colors ${checked ? "bg-[#16a34a]" : "bg-folk-border-strong"}`}>
        <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-all ${checked ? "left-[16px]" : "left-[2px]"}`} />
      </span>
    </button>
  )
}
