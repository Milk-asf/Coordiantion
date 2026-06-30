"use client"

import { useState, useRef, useCallback } from "react"
import { Download, Upload, FileDown, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFixedDropdownPosition } from "@/lib/hooks/use-fixed-dropdown-position"

export type CsvEntityType = "clients" | "contacts" | "staff"

interface CsvColumn {
  key: string
  label: string
}

interface CsvDropdownProps {
  entityType: CsvEntityType
  columns: CsvColumn[]
  exportColumns: CsvColumn[]
  data: Record<string, string>[]
  onImport: (rows: Record<string, string>[]) => Promise<void>
}

const entityLabels: Record<CsvEntityType, string> = {
  clients: "Participants",
  contacts: "Contacts",
  staff: "Staff",
}

export function CsvDropdown({ entityType, columns, exportColumns, data, onImport }: CsvDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuStyle = useFixedDropdownPosition(isOpen, triggerRef, 132, 200, "right")

  const escapeCsvField = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n"))
      return `"${value.replace(/"/g, '""')}"`
    return value
  }

  const generateCsv = useCallback((cols: CsvColumn[], rows: Record<string, string>[]) => {
    const header = cols.map((c) => escapeCsvField(c.label)).join(",")
    const body = rows.map((row) =>
      cols.map((c) => escapeCsvField(row[c.key] || "")).join(",")
    ).join("\n")
    return header + "\n" + body
  }, [])

  const downloadFile = useCallback((content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleExport = useCallback(() => {
    const csv = generateCsv(exportColumns, data)
    downloadFile(csv, `${entityType}-export.csv`)
    setIsOpen(false)
  }, [generateCsv, exportColumns, data, entityType, downloadFile])

  const handleDownloadTemplate = useCallback(() => {
    const header = columns.map((c) => escapeCsvField(c.label)).join(",")
    downloadFile(header + "\n", `${entityType}-template.csv`)
    setIsOpen(false)
  }, [columns, entityType, downloadFile])

  const parseCsv = useCallback((text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) return []

    const parseRow = (line: string): string[] => {
      const fields: string[] = []
      let current = ""
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (inQuotes) {
          if (ch === '"' && line[i + 1] === '"') { current += '"'; i++ }
          else if (ch === '"') inQuotes = false
          else current += ch
        } else {
          if (ch === '"') inQuotes = true
          else if (ch === ",") { fields.push(current); current = "" }
          else current += ch
        }
      }
      fields.push(current)
      return fields
    }

    const headers = parseRow(lines[0]).map((h) => h.trim())
    const keyMap = new Map<string, string>()
    for (const col of columns) {
      const match = headers.find((h) => h.toLowerCase() === col.label.toLowerCase())
      if (match) keyMap.set(match, col.key)
    }

    return lines.slice(1).map((line) => {
      const values = parseRow(line)
      const row: Record<string, string> = {}
      headers.forEach((header, i) => {
        const key = keyMap.get(header)
        if (key) row[key] = values[i]?.trim() || ""
      })
      return row
    }).filter((row) => Object.keys(row).length > 0)
  }, [columns])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length > 0) await onImport(rows)
    } catch {
      /* silent */
    }
    setIsImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    setIsOpen(false)
  }, [parseCsv, onImport])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleToggleMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen((open) => !open)
  }, [])

  return (
    <div ref={triggerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={handleToggleMenu}
        className={cn(
          "outline-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors",
          isOpen && "bg-folk-hover"
        )}
        tabIndex={0}
        aria-label={`Export ${entityLabels[entityType]} options`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
        Export
        <ChevronDown
          className={cn("h-[10px] w-[10px] transition-transform", isOpen && "rotate-180")}
          strokeWidth={1.5}
        />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {isOpen && menuStyle && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div
            className="fixed z-[60] w-[200px] rounded-none border border-folk-border bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            style={menuStyle}
            role="menu"
          >
            <button
              type="button"
              onClick={handleExport}
              disabled={data.length === 0}
              className={cn(
                "flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-normal text-[#111111] transition-colors hover:bg-[#f5f5f5]",
                data.length === 0 && "cursor-not-allowed opacity-50"
              )}
              tabIndex={0}
              role="menuitem"
            >
              <Download className="h-[14px] w-[14px] text-[#999999]" strokeWidth={1.5} />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              disabled={isImporting}
              className={cn(
                "flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-normal text-[#111111] transition-colors hover:bg-[#f5f5f5]",
                isImporting && "opacity-50"
              )}
              tabIndex={0}
              role="menuitem"
            >
              <Upload className="h-[14px] w-[14px] text-[#999999]" strokeWidth={1.5} />
              Import CSV
            </button>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-normal text-[#111111] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
              role="menuitem"
            >
              <FileDown className="h-[14px] w-[14px] text-[#999999]" strokeWidth={1.5} />
              Download template
            </button>
          </div>
        </>
      )}
    </div>
  )
}
