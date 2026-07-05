"use client"

import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react"
import { createPortal } from "react-dom"
import { FIXED_DROPDOWN_BACKDROP_Z_CLASS, FIXED_DROPDOWN_MENU_Z_CLASS } from "@/lib/dropdown-utils"
import { useFixedDropdownPosition } from "@/lib/hooks/use-fixed-dropdown-position"
import { formatTimeLabel, getAllDayTimeOptions, timeToMinutes } from "@/lib/roster/week-utils"
import { cn } from "@/lib/utils"

const ITEM_HEIGHT = 36
const CYCLE_COUNT = 5
const INTERVAL_MINUTES = 15

interface FixedTimePickerDropdownProps {
  isOpen: boolean
  anchorRef: RefObject<HTMLElement | null>
  value: string
  onChange: (value: string) => void
  onClose: () => void
  intervalMinutes?: number
  minMinutes?: number
  maxMinutes?: number
  estimatedHeight?: number
  minWidth?: number
}

function getOptionIndex(options: string[], value: string): number {
  if (!value) return 0

  const exactIndex = options.indexOf(value)
  if (exactIndex >= 0) return exactIndex

  const targetMinutes = timeToMinutes(value)
  if (Number.isNaN(targetMinutes)) return 0

  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  options.forEach((option, index) => {
    const distance = Math.abs(timeToMinutes(option) - targetMinutes)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  })

  return nearestIndex
}

function isTimeSelectable(time: string, minMinutes?: number, maxMinutes?: number): boolean {
  const minutes = timeToMinutes(time)
  if (Number.isNaN(minutes)) return false
  if (minMinutes !== undefined && minutes < minMinutes) return false
  if (maxMinutes !== undefined && minutes > maxMinutes) return false
  return true
}

export function FixedTimePickerDropdown({
  isOpen,
  anchorRef,
  value,
  onChange,
  onClose,
  intervalMinutes = INTERVAL_MINUTES,
  minMinutes,
  maxMinutes,
  estimatedHeight = 220,
  minWidth = 180,
}: FixedTimePickerDropdownProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const isRepositioningRef = useRef(false)

  const baseOptions = useMemo(() => {
    const options = getAllDayTimeOptions(intervalMinutes)
    if (value && !options.includes(value)) {
      return [...options, value].sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
    }
    return options
  }, [intervalMinutes, value])

  const slotsPerCycle = baseOptions.length
  const cycleHeight = slotsPerCycle * ITEM_HEIGHT
  const totalItems = slotsPerCycle * CYCLE_COUNT
  const menuStyle = useFixedDropdownPosition(
    isOpen,
    anchorRef,
    estimatedHeight,
    Math.max(anchorRef.current?.getBoundingClientRect().width ?? 0, minWidth)
  )

  const scrollToValue = useCallback((nextValue: string, behavior: ScrollBehavior = "auto") => {
    const list = listRef.current
    if (!list || slotsPerCycle === 0) return

    const localIndex = getOptionIndex(baseOptions, nextValue)
    const middleCycle = Math.floor(CYCLE_COUNT / 2)
    const globalIndex = middleCycle * slotsPerCycle + localIndex
    const targetTop = globalIndex * ITEM_HEIGHT - list.clientHeight / 2 + ITEM_HEIGHT / 2

    list.scrollTo({ top: Math.max(0, targetTop), behavior })
  }, [baseOptions, slotsPerCycle])

  const maintainInfiniteScroll = useCallback(() => {
    const list = listRef.current
    if (!list || isRepositioningRef.current || cycleHeight === 0) return

    if (list.scrollTop < cycleHeight * 0.5) {
      isRepositioningRef.current = true
      list.scrollTop += cycleHeight
      isRepositioningRef.current = false
      return
    }

    if (list.scrollTop > cycleHeight * (CYCLE_COUNT - 0.5)) {
      isRepositioningRef.current = true
      list.scrollTop -= cycleHeight
      isRepositioningRef.current = false
    }
  }, [cycleHeight])

  const handleScroll = useCallback(() => {
    if (isRepositioningRef.current) return
    maintainInfiniteScroll()
  }, [maintainInfiniteScroll])

  useEffect(() => {
    if (!isOpen) return

    const frame = window.requestAnimationFrame(() => {
      scrollToValue(value)
    })

    return () => window.cancelAnimationFrame(frame)
    // Scroll into view once when the picker opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen || !menuStyle) return null

  return createPortal(
    <>
      <div className={cn("fixed inset-0 z-[210]", FIXED_DROPDOWN_BACKDROP_Z_CLASS)} data-floating-overlay onClick={onClose} />
      <div
        className={cn(
          `fixed z-[211] overflow-hidden rounded-[6px] border border-folk-border bg-folk-surface shadow-folk`,
          FIXED_DROPDOWN_MENU_Z_CLASS
        )}
        data-floating-overlay
        onMouseDown={(event) => event.preventDefault()}
        style={menuStyle}
        role="listbox"
        aria-label="Select time"
      >
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="max-h-[220px] overflow-y-auto py-[4px] [scrollbar-width:thin]"
          style={{ scrollSnapType: "y proximity" }}
        >
          {Array.from({ length: totalItems }, (_, globalIndex) => {
            const option = baseOptions[globalIndex % slotsPerCycle]
            const isActive = option === value
            const selectable = isTimeSelectable(option, minMinutes, maxMinutes)

            return (
              <button
                key={`${globalIndex}-${option}`}
                type="button"
                onClick={() => {
                  if (!selectable) return
                  onChange(option)
                  onClose()
                }}
                disabled={!selectable}
                className={cn(
                  "flex h-[36px] w-full cursor-pointer items-center px-[12px] text-left text-[13px] font-medium transition-colors hover:bg-folk-hover [scroll-snap-align:center]",
                  isActive ? "bg-folk-hover text-folk-text" : "text-folk-text",
                  !selectable && "cursor-not-allowed opacity-35 hover:bg-transparent"
                )}
                role="option"
                aria-selected={isActive}
                aria-disabled={!selectable}
                tabIndex={0}
              >
                {formatTimeLabel(option)}
              </button>
            )
          })}
        </div>
      </div>
    </>,
    document.body
  )
}
