"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"
import { Eye, EyeOff, GripVertical, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { folkFilterBtnClass } from "@/lib/folk-ui"
import { motion } from "@/lib/motion"
import { useFixedDropdownPosition } from "@/lib/hooks/use-fixed-dropdown-position"
import { FIXED_DROPDOWN_MENU_Z_CLASS } from "@/lib/dropdown-utils"

export const DISPLAY_POPOVER_WIDTH = 280
export const DISPLAY_POPOVER_MAX_HEIGHT = 480

export interface DisplayField {
  key: string
  label: string
  locked?: boolean
}

interface DisplayPopoverTriggerProps {
  hiddenCount: number
  isOpen?: boolean
  onClick: () => void
  buttonRef?: RefObject<HTMLButtonElement | null>
  className?: string
  showLabel?: boolean
}

export function DisplayPopoverTrigger({
  hiddenCount,
  isOpen = false,
  onClick,
  buttonRef,
  className,
  showLabel = false,
}: DisplayPopoverTriggerProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      className={cn(
        folkFilterBtnClass("h-[28px] min-h-[28px] gap-[5px] px-[10px] text-[12px]"),
        isOpen && "bg-folk-hover",
        className
      )}
      aria-expanded={isOpen}
      aria-label={showLabel ? "Display options" : `${hiddenCount} hidden fields`}
      tabIndex={0}
    >
      <EyeOff className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
      {showLabel ? (
        <span>Display</span>
      ) : (
        <span className="min-w-[10px] text-[13px] font-medium tabular-nums">{hiddenCount}</span>
      )}
    </button>
  )
}

function DisplayPopoverPanelContent({
  isOpen,
  onClose,
  buttonRef,
  children,
  widthClassName,
  className,
}: DisplayPopoverPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const menuStyle = useFixedDropdownPosition(
    isOpen,
    buttonRef ?? { current: null },
    DISPLAY_POPOVER_MAX_HEIGHT,
    DISPLAY_POPOVER_WIDTH,
    "right"
  )

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target)) return
      if (buttonRef?.current?.contains(target)) return
      onClose()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      onClose()
    }

    document.addEventListener("pointerdown", handlePointerDown, true)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose, buttonRef])

  if (!isOpen || !menuStyle) return null

  return createPortal(
    <div
      ref={panelRef}
      className={cn(
        "fixed flex shrink-0 flex-col overflow-hidden rounded-[6px] border border-folk-border bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]",
        FIXED_DROPDOWN_MENU_Z_CLASS,
        motion.slideUp,
        widthClassName,
        className
      )}
      style={menuStyle}
    >
      {children}
    </div>,
    document.body
  )
}

interface DisplayPopoverPanelProps {
  isOpen: boolean
  onClose: () => void
  buttonRef?: RefObject<HTMLButtonElement | null>
  children: ReactNode
  widthClassName?: string
  className?: string
}

export function DisplayPopoverPanel({
  isOpen,
  onClose,
  buttonRef,
  children,
  widthClassName = "w-[280px]",
  className,
}: DisplayPopoverPanelProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <DisplayPopoverPanelContent
      isOpen={isOpen}
      onClose={onClose}
      buttonRef={buttonRef}
      widthClassName={widthClassName}
      className={className}
    >
      {children}
    </DisplayPopoverPanelContent>
  )
}

interface DisplayFieldListProps {
  fields: DisplayField[]
  visibleKeys: string[]
  onToggle: (key: string) => void
  searchPlaceholder?: string
  emptyMessage?: string
  showSearch?: boolean
  headerLabel?: string
}

export function DisplayFieldList({
  fields,
  visibleKeys,
  onToggle,
  searchPlaceholder = "Search a field",
  emptyMessage = "No fields found",
  showSearch = true,
  headerLabel,
}: DisplayFieldListProps) {
  const [search, setSearch] = useState("")
  const [hoverKey, setHoverKey] = useState<string | null>(null)

  const hiddenCount = fields.filter((field) => !field.locked && !visibleKeys.includes(field.key)).length

  const filteredFields = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return fields
    return fields.filter((field) => field.label.toLowerCase().includes(query))
  }, [fields, search])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {showSearch && (
        <div className="shrink-0 border-b border-folk-border-subtle px-[12px] py-[10px]">
          <div className="flex items-center gap-[8px]">
            <Search className="h-[14px] w-[14px] shrink-0 text-folk-placeholder" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-[13px] text-folk-text outline-none placeholder:text-folk-placeholder"
              aria-label={searchPlaceholder}
            />
          </div>
        </div>
      )}

      <div className={cn("shrink-0 px-[12px] py-[8px]", !showSearch && "border-t border-folk-border-subtle")}>
        <p className="text-[12px] font-normal text-folk-secondary">
          {headerLabel ?? `${hiddenCount} hidden ${hiddenCount === 1 ? "field" : "fields"}`}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-[4px]">
        {filteredFields.length === 0 ? (
          <p className="px-[12px] py-[8px] text-[13px] text-folk-placeholder">{emptyMessage}</p>
        ) : (
          filteredFields.map((field) => {
            const isVisible = field.locked || visibleKeys.includes(field.key)
            const isHovered = hoverKey === field.key

            return (
              <div
                key={field.key}
                className={cn(
                  "flex items-center gap-[8px] px-[8px] py-[7px] transition-colors",
                  isHovered && "bg-[#f0f0f0]"
                )}
                onMouseEnter={() => setHoverKey(field.key)}
                onMouseLeave={() => setHoverKey(null)}
              >
                <GripVertical
                  className="h-[14px] w-[14px] shrink-0 text-[#c8c8c8]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-[13px] font-normal text-folk-text">
                  {field.label}
                </span>
                <button
                  type="button"
                  onClick={() => !field.locked && onToggle(field.key)}
                  disabled={field.locked}
                  className={cn(
                    "flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:text-folk-text",
                    field.locked && "cursor-default opacity-40"
                  )}
                  aria-label={isVisible ? `Hide ${field.label}` : `Show ${field.label}`}
                  tabIndex={0}
                >
                  {isVisible ? (
                    <Eye className="h-[14px] w-[14px]" strokeWidth={1.5} />
                  ) : (
                    <EyeOff className="h-[14px] w-[14px]" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

interface DisplayFilterListProps {
  title: string
  items: string[]
  activeItems: string[]
  onToggle: (value: string) => void
  formatLabel?: (value: string) => string
  searchPlaceholder?: string
}

export function getDisplayFilterVisibleKeys(allItems: string[], activeItems: string[]) {
  return activeItems.length === 0 ? allItems : activeItems
}

export function createDisplayFilterToggle(
  allItems: string[],
  activeItems: string[],
  setActiveItems: (value: string[]) => void
) {
  return (key: string) => {
    const current = getDisplayFilterVisibleKeys(allItems, activeItems)
    if (current.includes(key)) {
      setActiveItems(current.filter((item) => item !== key))
      return
    }
    const next = [...current, key]
    setActiveItems(next.length === allItems.length ? [] : next)
  }
}

export function countHiddenDisplayFilters(allItems: string[], activeItems: string[]) {
  return allItems.length - getDisplayFilterVisibleKeys(allItems, activeItems).length
}

export function DisplayFilterList({
  title,
  items,
  activeItems,
  onToggle,
  formatLabel,
  searchPlaceholder = "Search a field",
}: DisplayFilterListProps) {
  const [search, setSearch] = useState("")

  const fields: DisplayField[] = useMemo(
    () => items.map((item) => ({ key: item, label: formatLabel ? formatLabel(item) : item })),
    [formatLabel, items]
  )

  const filteredFields = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return fields
    return fields.filter((field) => field.label.toLowerCase().includes(query))
  }, [fields, search])

  const hiddenCount = items.length - activeItems.length

  if (items.length === 0) return null

  return (
    <div className="border-t border-folk-border-subtle">
      <div className="border-b border-folk-border-subtle px-[12px] py-[10px]">
        <div className="flex items-center gap-[8px]">
          <Search className="h-[14px] w-[14px] shrink-0 text-folk-placeholder" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-[13px] text-folk-text outline-none placeholder:text-folk-placeholder"
            aria-label={`Search ${title.toLowerCase()}`}
          />
        </div>
      </div>

      <div className="px-[12px] py-[8px]">
        <p className="text-[12px] font-normal text-folk-secondary">
          {title} · {hiddenCount} hidden {hiddenCount === 1 ? "field" : "fields"}
        </p>
      </div>

      <div className="max-h-[240px] overflow-y-auto pb-[4px]">
        {filteredFields.map((field) => {
          const isVisible = activeItems.includes(field.key)
          return (
            <div
              key={field.key}
              className="group flex items-center gap-[8px] px-[8px] py-[7px] transition-colors hover:bg-[#f0f0f0]"
            >
              <GripVertical className="h-[14px] w-[14px] shrink-0 text-[#c8c8c8]" strokeWidth={1.5} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-normal text-folk-text">{field.label}</span>
              <button
                type="button"
                onClick={() => onToggle(field.key)}
                className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:text-folk-text"
                aria-label={isVisible ? `Hide ${field.label}` : `Show ${field.label}`}
                tabIndex={0}
              >
                {isVisible ? (
                  <Eye className="h-[14px] w-[14px]" strokeWidth={1.5} />
                ) : (
                  <EyeOff className="h-[14px] w-[14px]" strokeWidth={1.5} />
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface TableDisplayPopoverProps {
  fields: DisplayField[]
  visibleKeys: string[]
  onToggle: (key: string) => void
  onReset?: () => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  buttonRef: RefObject<HTMLButtonElement | null>
  topContent?: ReactNode
  bottomContent?: ReactNode
  panelWidthClassName?: string
  showTriggerLabel?: boolean
  triggerClassName?: string
  className?: string
  triggerHiddenCount?: number
}

export function TableDisplayPopover({
  fields,
  visibleKeys,
  onToggle,
  onReset,
  isOpen,
  onOpenChange,
  buttonRef,
  topContent,
  bottomContent,
  panelWidthClassName,
  showTriggerLabel = false,
  triggerClassName,
  className,
  triggerHiddenCount,
}: TableDisplayPopoverProps) {
  const hiddenCount = triggerHiddenCount ?? fields.filter((field) => !field.locked && !visibleKeys.includes(field.key)).length

  return (
    <div className={cn("relative", className)}>
      <DisplayPopoverTrigger
        hiddenCount={hiddenCount}
        isOpen={isOpen}
        onClick={() => onOpenChange(!isOpen)}
        buttonRef={buttonRef}
        showLabel={showTriggerLabel}
        className={triggerClassName}
      />
      <DisplayPopoverPanel
        isOpen={isOpen}
        onClose={() => onOpenChange(false)}
        buttonRef={buttonRef}
        widthClassName={panelWidthClassName}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {topContent ? <div className="shrink-0">{topContent}</div> : null}
          <DisplayFieldList fields={fields} visibleKeys={visibleKeys} onToggle={onToggle} />
          {bottomContent ? <div className="shrink-0">{bottomContent}</div> : null}
        </div>
        {onReset && (
          <div className="shrink-0 border-t border-folk-border-subtle px-[12px] py-[10px]">
            <button
              type="button"
              onClick={onReset}
              className="text-[13px] font-normal text-folk-placeholder transition-colors hover:text-folk-text"
              tabIndex={0}
            >
              Reset
            </button>
          </div>
        )}
      </DisplayPopoverPanel>
    </div>
  )
}
