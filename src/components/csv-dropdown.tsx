"use client"

import { useState, useRef, useCallback } from "react"
import { Download, Upload, FileDown, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

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
          else if (ch === ",") { fields.push(current.trim()); current = "" }
          else current += ch
        }
      }
      fields.push(current.trim())
      return fields
    }

    const headerLabels = parseRow(lines[0])
    const labelToKey = new Map<string, string>()
    for (const col of columns) {
      labelToKey.set(col.label.toLowerCase(), col.key)
    }

    const rows: Record<string, string>[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseRow(lines[i])
      const row: Record<string, string> = {}
      headerLabels.forEach((label, idx) => {
        const key = labelToKey.get(label.toLowerCase())
        if (key && values[idx] !== undefined) row[key] = values[idx]
      })
      if (Object.values(row).some((v) => v)) rows.push(row)
    }
    return rows
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

  return (
    <div className="relative flex">
      <button
        onClick={handleExport}
        className="flex items-center gap-[5px] rounded-l-[4px] border border-[#dcdcdc] bg-transparent px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
        tabIndex={0}
        aria-label={`Export ${entityLabels[entityType]} as CSV`}
      >
        <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
        <span className="hidden sm:inline">CSV</span>
      </button>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center rounded-r-[4px] border border-l-0 border-[#dcdcdc] bg-transparent px-[4px] py-[4px] text-[#999] transition-colors hover:bg-[#f5f5f5]"
        tabIndex={0}
        aria-label="More export options"
      >
        <ChevronDown className="h-[10px] w-[10px]" strokeWidth={1.5} />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9]" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full right-0 z-10 mb-[4px] w-[200px] rounded-[6px] border border-sidebar-border bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className={cn(
                "flex w-full items-center gap-[8px] px-[12px] py-[8px] text-left text-[13px] font-medium transition-colors hover:bg-[#f5f5f5]",
                isImporting ? "text-[#bbb]" : "text-[#262626]"
              )}
              tabIndex={0}
            >
              <Upload className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
              {isImporting ? "Importing…" : `Import CSV`}
            </button>
            <button
              onClick={handleExport}
              className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-left text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <FileDown className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
              Export as CSV
            </button>
            <div className="my-[2px] border-t border-[#f0f0f0]" />
            <button
              onClick={handleDownloadTemplate}
              className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-left text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <Download className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
              Download template
            </button>
          </div>
        </>
      )}
    </div>
  )
}
