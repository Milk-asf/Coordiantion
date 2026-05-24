"use client"

import { useState, useRef } from "react"
import { X, Plus } from "lucide-react"

export interface RecordItem {
  id: string
  name: string
  subtitle: string
  type: "Client" | "Contact" | "Staff"
  iconText: string
}

interface RecordPickerModalProps {
  records: RecordItem[]
  onSelect: (record: RecordItem) => void
  onClose: () => void
}

export function RecordPickerModal({ records, onSelect, onClose }: RecordPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  const filteredRecords = searchQuery.trim()
    ? records.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : records

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filteredRecords.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filteredRecords[selectedIndex]) onSelect(filteredRecords[selectedIndex])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div
        className="relative z-10 flex w-[560px] flex-col rounded-[12px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between px-[24px] pt-[20px] pb-[4px]">
          <h2 className="text-[15px] font-semibold text-[#262626]">Choose record</h2>
          <button
            onClick={onClose}
            className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            tabIndex={0}
            aria-label="Close"
          >
            <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-[24px] py-[12px]">
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedIndex(0) }}
            placeholder="Search records..."
            className="h-[40px] w-full rounded-[8px] border border-[#e0e0e0] bg-white px-[14px] text-[14px] text-[#262626] outline-none placeholder:text-[#bbb] focus:border-[#93b4e8]"
            autoFocus
          />
        </div>

        <div className="px-[24px] pb-[4px]">
          <span className="text-[12px] font-medium text-[#888]">Records</span>
        </div>

        <div className="max-h-[400px] overflow-y-auto px-[12px] pb-[8px]">
          {filteredRecords.map((record, idx) => (
            <button
              key={`${record.type}-${record.id}`}
              onClick={() => onSelect(record)}
              className={`flex w-full items-center gap-[12px] rounded-[8px] px-[12px] py-[10px] transition-colors ${idx === selectedIndex ? "bg-[#f5f7fa]" : "hover:bg-[#f9f9f9]"}`}
              tabIndex={0}
            >
              <div className="flex items-center gap-[8px] flex-1 overflow-hidden">
                <div className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px] bg-[#DBEAFE] text-[11px] font-semibold text-[#2563EB]">
                  {record.iconText}
                </div>
                <span className="truncate text-[14px] font-medium text-[#262626]">{record.name}</span>
              </div>
              <span className={`flex shrink-0 items-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium ${
                record.type === "Client" ? "bg-[#F0FDF4] text-[#16a34a]" :
                record.type === "Contact" ? "bg-[#FEF3C7] text-[#d97706]" :
                "bg-[#F3E8FF] text-[#7c3aed]"
              }`}>
                {record.type}
              </span>
            </button>
          ))}
          {filteredRecords.length === 0 && (
            <div className="py-[24px] text-center text-[13px] text-[#999]">No records found</div>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-[#f0f0f0] px-[24px] py-[12px]">
          <button
            onClick={() => { if (filteredRecords[selectedIndex]) onSelect(filteredRecords[selectedIndex]) }}
            className="primary-btn flex items-center gap-[6px] rounded-[6px] px-[14px] py-[7px] text-[13px] font-medium transition-colors"
            tabIndex={0}
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            Select record
          </button>
        </div>
      </div>
    </div>
  )
}
