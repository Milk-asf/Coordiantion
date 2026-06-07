"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

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
}

export function DatePicker({ value, onChange, onClose, quickPresets, bare = false, hideQuickDates = false, selectedClassName = "bg-[#2563EB] text-white" }: DatePickerProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const selected = value ? new Date(value + "T00:00:00") : null
  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : today.getMonth())

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

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-AU", { month: "long", year: "numeric" })
  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
  const quickDates = [
    { label: "Today", offset: 0 },
    { label: "Tomorrow", offset: 1 },
    { label: "Next week", offset: (8 - today.getDay()) % 7 || 7 },
  ]

  return (
    <div className={bare ? "w-full" : "w-[260px] rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"}>
      {!hideQuickDates && (
      <div className="flex gap-[4px] border-b border-[#f0f0f0] px-[12px] py-[8px]">
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
              className={`rounded px-[8px] py-[4px] text-[11px] font-medium transition-colors ${isSelected ? "bg-[#2563EB] text-white" : "text-[#555] hover:bg-[#f5f5f5]"}`}
              tabIndex={0}
            >
              {quickDate.label}
            </button>
          )
        })}
      </div>
      )}

      <div className="flex items-center justify-between px-[12px] py-[8px]">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
          tabIndex={0}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={1.5} />
        </button>
        <span className="text-[12px] font-semibold text-[#262626]">{monthLabel}</span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
          tabIndex={0}
          aria-label="Next month"
        >
          <ChevronRight className="h-[14px] w-[14px]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="px-[12px] pb-[12px]">
        <div className="mb-[4px] grid grid-cols-7 gap-[2px]">
          {weekDays.map((weekDay) => (
            <div key={weekDay} className="flex h-[24px] items-center justify-center text-[10px] font-medium text-[#bbb]">
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
                className={`flex h-[30px] w-full items-center justify-center rounded text-[12px] font-medium transition-colors ${
                  isSelected
                    ? selectedClassName
                    : isToday
                      ? "bg-[#f0f0f0] text-[#262626] hover:bg-[#e5e5e5]"
                      : "text-[#555] hover:bg-[#f5f5f5]"
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
        <div className="border-t border-[#f0f0f0] px-[12px] py-[8px]">
          <p className="mb-[6px] text-[10px] font-semibold uppercase tracking-wide text-[#999]">Quick select</p>
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
                      : "border-[#e0e0e0] bg-white text-[#555] hover:border-[#ccc] hover:bg-[#f5f5f5]"
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
        <div className="border-t border-[#f0f0f0] px-[12px] py-[6px]">
          <button
            type="button"
            onClick={() => {
              onChange("")
              onClose()
            }}
            className="w-full rounded px-[8px] py-[4px] text-left text-[12px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            tabIndex={0}
          >
            Clear date
          </button>
        </div>
      )}
    </div>
  )
}
