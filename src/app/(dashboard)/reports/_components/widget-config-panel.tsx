"use client"

import { useState, type ChangeEvent, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import {
  AGGREGATION_LABELS,
  DATE_GRAIN_LABELS,
  getDataSource,
  getDimension,
  getVisualization,
  type AggregationType,
  type AnalyticsWidget,
  type DateGrain,
  type WidgetSort,
  type WidgetWidth,
} from "@/lib/analytics/definitions"
import { DataSourceTree } from "./data-source-tree"

interface WidgetConfigPanelProps {
  widget: AnalyticsWidget
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

export function WidgetConfigPanel({ widget, onChange }: WidgetConfigPanelProps) {
  const source = getDataSource(widget.source)
  const viz = getVisualization(widget.visualization)
  const groupDim = getDimension(source, widget.groupBy)
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

        {showGrouping && (
          <Field label="Show top">
            <Select value={String(widget.limit)} onChange={(event) => onChange({ limit: Number(event.target.value) })}>
              <option value="5">Top 5</option>
              <option value="8">Top 8</option>
              <option value="12">Top 12</option>
              <option value="0">All groups</option>
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
