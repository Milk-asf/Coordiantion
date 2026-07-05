"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

interface QuickPreset {
  label: string
  value: string
}

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  onClose: () => void
  quickPresets?: QuickPreset[]
  bare?: boolean
  hideQuickDates?: boolean
  selectedClassName?: string
  yearRangePast?: number
  yearRangeFuture?: number
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: index,
  label: new Date(2000, index, 1).toLocaleDateString("en-AU", { month: "long" }),
}))

const selectClassName =
  "h-[28px] max-w-[132px] cursor-pointer appearance-none rounded-[6px] border border-transparent bg-transparent pl-[6px] pr-[22px] text-[12px] font-semibold text-folk-text outline-none transition-colors hover:border-[#d9d9d9] hover:bg-folk-hover focus:border-[#a3c4f3] focus:bg-folk-surface"

export function DatePicker({
  value,
  onChange,
  onClose,
  quickPresets,
  bare = false,
  hideQuickDates = false,
  selectedClassName = "bg-[#2563EB] text-white",
  yearRangePast = 30,
  yearRangeFuture = 10,
}: DatePickerProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const selected = value ? new Date(value + "T00:00:00") : null
  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : today.getMonth())

  const selectedYear = selected?.getFullYear()

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const startYear = Math.min(currentYear - yearRangePast, selectedYear ?? currentYear, viewYear)
    const endYear = Math.max(currentYear + yearRangeFuture, selectedYear ?? currentYear, viewYear)
    return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index)
  }, [yearRangePast, yearRangeFuture, selectedYear, viewYear])

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  function handlePrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
      return
    }

    setViewMonth(viewMonth - 1)
  }

  function handleNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
      return
    }

    setViewMonth(viewMonth + 1)
  }

  function handleSelect(day: number) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    onChange(dateStr)
    onClose()
  }

  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
  const quickDates = [
    { label: "Today", offset: 0 },
    { label: "Tomorrow", offset: 1 },
    { label: "Next week", offset: (8 - today.getDay()) % 7 || 7 },
  ]

  return (
    <div className={bare ? "w-full" : "w-[260px] rounded-[6px] border border-folk-border bg-folk-surface shadow-folk"}>
      {!hideQuickDates && (
      <div className="flex gap-[4px] border-b border-folk-border-subtle px-[12px] py-[8px]">
        {quickDates.map((quickDate) => {
          const quickDateValue = new Date(today)
          quickDateValue.setDate(quickDateValue.getDate() + quickDate.offset)

          const dateStr = `${quickDateValue.getFullYear()}-${String(quickDateValue.getMonth() + 1).padStart(2, "0")}-${String(quickDateValue.getDate()).padStart(2, "0")}`
          const isSelected = value === dateStr

          return (
            <button
              key={quickDate.label}
              type="button"
              onClick={() => {
                onChange(dateStr)
                onClose()
              }}
              className={`rounded-[6px] px-[8px] py-[4px] text-[11px] font-medium transition-colors ${isSelected ? "bg-[#2563EB] text-white" : "text-[#555] hover:bg-folk-hover"}`}
              tabIndex={0}
            >
              {quickDate.label}
            </button>
          )
        })}
      </div>
      )}

      <div className="flex items-center justify-between gap-[4px] px-[8px] py-[8px]">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={1.5} />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-[4px]">
          <div className="relative min-w-0">
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className={selectClassName}
              aria-label="Select month"
            >
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-[6px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 text-folk-secondary" strokeWidth={1.75} />
          </div>
          <div className="relative shrink-0">
            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className={`${selectClassName} max-w-[76px]`}
              aria-label="Select year"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-[6px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 text-folk-secondary" strokeWidth={1.75} />
          </div>
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
          aria-label="Next month"
        >
          <ChevronRight className="h-[14px] w-[14px]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="px-[12px] pb-[12px]">
        <div className="mb-[4px] grid grid-cols-7 gap-[2px]">
          {weekDays.map((weekDay) => (
            <div key={weekDay} className="flex h-[24px] items-center justify-center text-[10px] font-medium text-folk-placeholder">
              {weekDay}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[2px]">
          {Array.from({ length: startOffset }).map((_, index) => (
            <div key={`empty-${index}`} className="h-[30px]" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const isToday = dateStr === todayStr
            const isSelected = dateStr === value

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleSelect(day)}
                className={`flex h-[30px] w-full items-center justify-center rounded-[6px] text-[12px] font-medium transition-colors ${
                  isSelected
                    ? selectedClassName
                    : isToday
                      ? "bg-[var(--folk-border-subtle)] text-folk-text hover:bg-[var(--folk-border)]"
                      : "text-[#555] hover:bg-folk-hover"
                }`}
                tabIndex={0}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      {quickPresets && quickPresets.length > 0 && (
        <div className="border-t border-folk-border-subtle px-[12px] py-[8px]">
          <p className="mb-[6px] text-[10px] font-semibold uppercase tracking-wide text-folk-secondary">Quick select</p>
          <div className="flex flex-wrap gap-[4px]">
            {quickPresets.map((preset) => {
              const isSelected = value === preset.value
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => { onChange(preset.value); onClose() }}
                  className={`rounded-[5px] border px-[8px] py-[3px] text-[11px] font-medium transition-colors ${
                    isSelected
                      ? "border-[#2563EB] bg-[#2563EB] text-white"
                      : "border-folk-border bg-folk-surface text-[#555] hover:border-[#bababa] hover:bg-folk-hover"
                  }`}
                  tabIndex={0}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {value && (
        <div className="border-t border-folk-border-subtle px-[12px] py-[6px]">
          <button
            type="button"
            onClick={() => {
              onChange("")
              onClose()
            }}
            className="w-full rounded-[6px] px-[8px] py-[4px] text-left text-[12px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
            tabIndex={0}
          >
            Clear date
          </button>
        </div>
      )}
    </div>
  )
}
