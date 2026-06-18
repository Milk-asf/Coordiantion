"use client"

import { useState, useRef } from "react"
import { X, Plus } from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"

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
        className="relative z-10 flex w-[560px] flex-col rounded-none bg-folk-surface shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between px-[24px] pt-[20px] pb-[4px]">
          <h2 className="text-[15px] font-semibold text-folk-text">Choose record</h2>
          <button
            onClick={onClose}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
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
            className="h-[40px] w-full rounded-none border border-folk-border bg-folk-surface px-[14px] text-[14px] text-folk-text outline-none placeholder:text-folk-placeholder focus:border-[#93b4e8]"
            autoFocus
          />
        </div>

        <div className="px-[24px] pb-[4px]">
          <span className="text-[12px] font-medium text-folk-secondary">Records</span>
        </div>

        <div className="max-h-[400px] overflow-y-auto px-[12px] pb-[8px]">
          {filteredRecords.map((record, idx) => (
            <button
              key={`${record.type}-${record.id}`}
              onClick={() => onSelect(record)}
              className={`flex w-full items-center gap-[12px] rounded-none px-[12px] py-[10px] transition-colors ${idx === selectedIndex ? "bg-[#f5f7fa]" : "hover:bg-[#f9f9f9]"}`}
              tabIndex={0}
            >
              <div className="flex items-center gap-[8px] flex-1 overflow-hidden">
                <EntityIcon text={record.iconText} size="base" />
                <span className="truncate text-[14px] font-medium text-folk-text">{record.name}</span>
              </div>
              <span className={`flex shrink-0 items-center rounded-none px-[8px] py-[3px] text-[11px] font-medium ${
                record.type === "Client" ? "bg-[#F0FDF4] text-[#16a34a]" :
                record.type === "Contact" ? "bg-[#FEF3C7] text-[#d97706]" :
                "bg-[#F3E8FF] text-[#7c3aed]"
              }`}>
                {record.type}
              </span>
            </button>
          ))}
          {filteredRecords.length === 0 && (
            <div className="py-[24px] text-center text-[13px] text-folk-secondary">No records found</div>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-folk-border-subtle px-[24px] py-[12px]">
          <button
            onClick={() => { if (filteredRecords[selectedIndex]) onSelect(filteredRecords[selectedIndex]) }}
            className="outline-btn flex items-center gap-[6px] px-[14px] py-[7px] text-[13px] font-medium transition-colors"
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
