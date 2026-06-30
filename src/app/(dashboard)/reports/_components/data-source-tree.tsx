"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Database, Gauge, Hexagon } from "lucide-react"
import { DATA_SOURCES, getEntityPath, type DataEntity } from "@/lib/analytics/definitions"
import { cn } from "@/lib/utils"

interface DataSourceTreeProps {
  value: string
  groupBy?: string | null
  onChange: (key: string, dimensionKey?: string) => void
}

export function DataSourceTree({ value, groupBy, onChange }: DataSourceTreeProps) {
  const path = useMemo(() => getEntityPath(value), [value])

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Reveal (and open) the selected entity by expanding it and its ancestors.
    const keys = path.map((entity) => entity.key)
    return new Set(keys)
  })

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-folk-border bg-white py-[4px]">
      {DATA_SOURCES.map((root) => (
        <TreeNode
          key={root.key}
          entity={root}
          selectedKey={value}
          selectedGroupBy={groupBy ?? null}
          expanded={expanded}
          onToggle={toggleExpand}
          onSelect={onChange}
        />
      ))}
    </div>
  )
}

interface TreeNodeProps {
  entity: DataEntity
  selectedKey: string
  selectedGroupBy: string | null
  expanded: Set<string>
  onToggle: (key: string) => void
  onSelect: (key: string, dimensionKey?: string) => void
}

function TreeNode({ entity, selectedKey, selectedGroupBy, expanded, onToggle, onSelect }: TreeNodeProps) {
  const isExpanded = expanded.has(entity.key)
  const isEntitySelected = entity.key === selectedKey
  const children = entity.children ?? []
  const dimensions = entity.dimensions
  // An "Overview" leaf is active when this entity is the source and no dimension breakdown matches.
  const overviewActive = isEntitySelected && !dimensions.some((dim) => dim.key === selectedGroupBy)

  const Icon = entity.isRoot ? Database : Hexagon

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(entity.key)}
        className="group flex w-full items-center gap-[6px] py-[6px] pl-[8px] pr-[10px] text-left transition-colors hover:bg-folk-hover"
        aria-expanded={isExpanded}
        tabIndex={0}
      >
        <span className="flex h-[16px] w-[14px] shrink-0 items-center justify-center text-folk-tertiary">
          {isExpanded ? (
            <ChevronDown className="h-[13px] w-[13px]" strokeWidth={2} />
          ) : (
            <ChevronRight className="h-[13px] w-[13px]" strokeWidth={2} />
          )}
        </span>
        <Icon className="h-[15px] w-[15px] shrink-0 text-folk-secondary" strokeWidth={1.6} />
        <span className="truncate text-[13px] text-folk-text">{entity.label}</span>
      </button>

      {isExpanded && (
        <div className="ml-[15px] border-l border-folk-border-subtle pl-[2px]">
          <LeafRow label="Overview" icon={Gauge} isActive={overviewActive} onClick={() => onSelect(entity.key)} />
          {dimensions.map((dim) => (
            <LeafRow
              key={dim.key}
              label={dim.label}
              icon={Hexagon}
              isActive={isEntitySelected && selectedGroupBy === dim.key}
              onClick={() => onSelect(entity.key, dim.key)}
            />
          ))}
          {children.map((child) => (
            <TreeNode
              key={child.key}
              entity={child}
              selectedKey={selectedKey}
              selectedGroupBy={selectedGroupBy}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface LeafRowProps {
  label: string
  icon: typeof Hexagon
  isActive: boolean
  onClick: () => void
}

function LeafRow({ label, icon: Icon, isActive, onClick }: LeafRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-[8px] py-[5px] pl-[10px] pr-[10px] text-left transition-colors",
        isActive ? "bg-[#f5f9ff]" : "hover:bg-folk-hover",
      )}
      tabIndex={0}
      aria-pressed={isActive}
    >
      <Icon
        className={cn("h-[14px] w-[14px] shrink-0", isActive ? "text-[#2563EB]" : "text-folk-secondary")}
        strokeWidth={1.6}
      />
      <span className={cn("truncate text-[13px]", isActive ? "font-medium text-folk-text" : "text-folk-text")}>
        {label}
      </span>
    </button>
  )
}
