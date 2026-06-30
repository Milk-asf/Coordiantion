"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Check,
  Download,
  FileText,
  Loader2,
  Upload,
} from "lucide-react"
import { Button } from "@/components/button"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { useToast } from "@/components/toast"
import { cn } from "@/lib/utils"
import { useCharges } from "@/lib/hooks/use-charges"
import {
  generatePriceBookImportTemplate,
  parsePriceBookCsv,
  type ParsedPriceBookRow,
} from "@/lib/ndis/price-book-import"
import {
  chargeItemFromNdis,
  formatChargePriceLabel,
  formatChargeUnitLabel,
  getNdisChargeByItemNumber,
  ndisChargeCategories,
  ndisCharges,
  ndisPricingCatalogue,
  normalizeChargeItem,
  searchNdisCharges,
  type NdisChargeItem,
} from "@/lib/ndis-charges"
import {
  TABLE_CELL_INNER,
  TABLE_FULL,
  TABLE_PROFILE_CELL,
  TABLE_PROFILE_HEADER,
  TABLE_PROFILE_HEADER_LAST,
  TABLE_TEXT_CELL,
} from "@/lib/table-styles"

type ImportMode = "browse" | "csv"
type CsvStep = "upload" | "preview" | "importing" | "complete"

export function PriceBookImportTab() {
  const { chargeItems, bulkAddChargeItems } = useCharges()
  const { toast } = useToast()

  const [importMode, setImportMode] = useState<ImportMode>("browse")
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [selectedItemNumbers, setSelectedItemNumbers] = useState<Set<string>>(new Set())
  const [isImportingBrowse, setIsImportingBrowse] = useState(false)

  const [csvStep, setCsvStep] = useState<CsvStep>("upload")
  const [parsedRows, setParsedRows] = useState<ParsedPriceBookRow[]>([])
  const [csvParseError, setCsvParseError] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const [importedCount, setImportedCount] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existingItemNumbers = useMemo(
    () => new Set(chargeItems.map((item) => item.itemNumber)),
    [chargeItems],
  )

  const categoryOptions = useMemo(
    () => Object.entries(ndisChargeCategories).sort(([, a], [, b]) => a.localeCompare(b)),
    [],
  )

  const browseItems = useMemo(() => {
    return searchNdisCharges(searchQuery, {
      category: categoryFilter || undefined,
      limit: 500,
    })
  }, [categoryFilter, searchQuery])

  const availableBrowseItems = useMemo(
    () => browseItems.filter((item) => !existingItemNumbers.has(item.itemNumber)),
    [browseItems, existingItemNumbers],
  )

  const selectedAvailableCount = useMemo(
    () => availableBrowseItems.filter((item) => selectedItemNumbers.has(item.itemNumber)).length,
    [availableBrowseItems, selectedItemNumbers],
  )

  const allVisibleSelected =
    availableBrowseItems.length > 0 &&
    availableBrowseItems.every((item) => selectedItemNumbers.has(item.itemNumber))

  const handleToggleItem = (itemNumber: string) => {
    setSelectedItemNumbers((prev) => {
      const next = new Set(prev)
      if (next.has(itemNumber)) next.delete(itemNumber)
      else next.add(itemNumber)
      return next
    })
  }

  const handleToggleAllVisible = () => {
    setSelectedItemNumbers((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        availableBrowseItems.forEach((item) => next.delete(item.itemNumber))
      } else {
        availableBrowseItems.forEach((item) => next.add(item.itemNumber))
      }
      return next
    })
  }

  const handleBrowseImport = async () => {
    const toImport = browseItems
      .filter((item) => selectedItemNumbers.has(item.itemNumber))
      .filter((item) => !existingItemNumbers.has(item.itemNumber))
      .map((item) =>
        normalizeChargeItem({
          id: crypto.randomUUID(),
          ...chargeItemFromNdis(item),
        }),
      )

    if (toImport.length === 0) {
      toast("Select billables that are not already added", "error")
      return
    }

    setIsImportingBrowse(true)
    const added = bulkAddChargeItems(toImport)
    setIsImportingBrowse(false)
    setSelectedItemNumbers(new Set())
    toast(`Added ${added} billable${added === 1 ? "" : "s"} to your price book`, "success")
  }

  const processCsvFile = useCallback(
    (file: File) => {
      setCsvParseError(null)
      setFileName(file.name)

      const reader = new FileReader()
      reader.onload = (event) => {
        const text = String(event.target?.result ?? "")
        const { rows, parseError } = parsePriceBookCsv(text, existingItemNumbers)
        if (parseError) {
          setCsvParseError(parseError)
          setParsedRows([])
          setCsvStep("upload")
          return
        }
        setParsedRows(rows)
        setCsvStep("preview")
      }
      reader.onerror = () => {
        setCsvParseError("Failed to read the file")
      }
      reader.readAsText(file)
    },
    [existingItemNumbers],
  )

  const handleDownloadTemplate = () => {
    const blob = new Blob([generatePriceBookImportTemplate()], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "price-book-import-template.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleCsvImport = async () => {
    const validRows = parsedRows.filter((row) => row.errors.length === 0 && row.chargeItem)
    if (validRows.length === 0) return

    setCsvStep("importing")

    const items = validRows
      .map((row) => row.chargeItem!)
      .filter((item) => !existingItemNumbers.has(item.itemNumber))

    const added = bulkAddChargeItems(items)
    setImportedCount(added)
    setCsvStep("complete")
    toast(`Added ${added} billable${added === 1 ? "" : "s"} from CSV`, "success")
  }

  const handleCsvReset = () => {
    setCsvStep("upload")
    setParsedRows([])
    setCsvParseError(null)
    setFileName("")
    setImportedCount(0)
  }

  const validCsvRows = parsedRows.filter((row) => row.errors.length === 0 && row.chargeItem)
  const errorCsvRows = parsedRows.filter((row) => row.errors.length > 0)
  const skipCsvRows = parsedRows.filter(
    (row) => row.errors.length === 0 && row.warnings.some((warning) => warning.includes("Already in your billables")),
  )

  const renderBrowseRow = (item: NdisChargeItem) => {
    const isAdded = existingItemNumbers.has(item.itemNumber)
    const isSelected = selectedItemNumbers.has(item.itemNumber)

    return (
      <tr
        key={item.itemNumber}
        className={cn(
          "transition-colors",
          isAdded ? "opacity-60" : "hover:bg-folk-hover",
          isSelected && !isAdded && "bg-[#eef4fc] hover:bg-[#eef4fc]",
        )}
      >
        <td className={TABLE_PROFILE_CELL}>
          <div className={TABLE_CELL_INNER}>
            <input
              type="checkbox"
              checked={isSelected}
              disabled={isAdded}
              onChange={() => handleToggleItem(item.itemNumber)}
              className="h-[14px] w-[14px] accent-[#1a1a1a]"
              aria-label={`Select ${item.name}`}
            />
          </div>
        </td>
        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
          <div className={TABLE_CELL_INNER}>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-folk-text">{item.name}</p>
              <p className="truncate text-[12px] text-folk-secondary">{item.supportCategory}</p>
            </div>
          </div>
        </td>
        <td className={TABLE_PROFILE_CELL}>
          <div className={TABLE_CELL_INNER}>
            <span className="inline-flex items-center border border-folk-border bg-folk-page px-[8px] py-[3px] font-mono text-[12px] font-medium text-[#555]">
              {item.itemNumber}
            </span>
          </div>
        </td>
        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
          <div className={TABLE_CELL_INNER}>{formatChargePriceLabel(item)}</div>
        </td>
        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL} text-folk-secondary`}>
          <div className={TABLE_CELL_INNER}>{formatChargeUnitLabel(item.unit)}</div>
        </td>
        <td className={TABLE_PROFILE_CELL}>
          <div className={TABLE_CELL_INNER}>
            {isAdded ? (
              <span className="inline-flex h-[22px] items-center bg-green-50 px-[8px] text-[11px] font-medium text-green-700">
                Added
              </span>
            ) : (
              <span className="inline-flex h-[22px] items-center bg-[var(--folk-border-subtle)] px-[8px] text-[11px] font-medium text-folk-secondary">
                Available
              </span>
            )}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div>
      <div className="mb-[20px] flex flex-wrap items-start justify-between gap-[12px]">
        <div>
          <h2 className="text-[14px] font-medium text-folk-text">Price book import</h2>
          <p className="mt-[4px] max-w-[640px] text-[13px] text-folk-secondary">
            Bulk add NDIS support catalogue items to your workspace billables. Browse the catalogue or upload a CSV of item numbers.
          </p>
          <p className="mt-[8px] text-[12px] text-folk-placeholder">
            Source: {ndisPricingCatalogue.source} ({ndisPricingCatalogue.version}) · {ndisCharges.length} items · {chargeItems.length} in your price book
          </p>
        </div>
      </div>

      <div className="mb-[20px] flex h-[44px] items-center gap-[2px] border-b border-folk-border bg-white">
        <ProfileTabButton
          isActive={importMode === "browse"}
          onClick={() => setImportMode("browse")}
          label="Browse catalogue"
        />
        <ProfileTabButton
          isActive={importMode === "csv"}
          onClick={() => setImportMode("csv")}
          label="Upload CSV"
        />
      </div>

      {importMode === "browse" && (
        <>
          <div className="mb-[16px] flex flex-wrap items-center gap-[10px]">
            <ExpandableTableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name or item number…"
              ariaLabel="Search NDIS catalogue"
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-[36px] min-w-[220px] border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text outline-none focus:border-[#a3c4f3]"
              aria-label="Filter by support category"
            >
              <option value="">All categories</option>
              {categoryOptions.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <div className="ml-auto flex items-center gap-[8px]">
              <span className="text-[12px] text-folk-secondary">
                {selectedAvailableCount} selected · {availableBrowseItems.length} available
              </span>
              <Button
                onClick={handleBrowseImport}
                disabled={selectedAvailableCount === 0 || isImportingBrowse}
                className="h-[36px] px-[16px]"
              >
                {isImportingBrowse ? "Importing…" : `Import ${selectedAvailableCount || ""}`}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto border border-folk-border">
            <table className={`${TABLE_FULL} min-w-[920px]`}>
              <thead>
                <tr>
                  <th className={TABLE_PROFILE_HEADER}>
                    <div className="flex items-center gap-[8px]">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={handleToggleAllVisible}
                        disabled={availableBrowseItems.length === 0}
                        className="h-[14px] w-[14px] accent-[#1a1a1a]"
                        aria-label="Select all visible billables"
                      />
                    </div>
                  </th>
                  <th className={TABLE_PROFILE_HEADER}>Support item</th>
                  <th className={TABLE_PROFILE_HEADER}>Item number</th>
                  <th className={TABLE_PROFILE_HEADER}>Price</th>
                  <th className={TABLE_PROFILE_HEADER}>Unit</th>
                  <th className={TABLE_PROFILE_HEADER_LAST}>Status</th>
                </tr>
              </thead>
              <tbody>
                {browseItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-[20px] py-[32px] text-center text-[13px] text-folk-secondary">
                      No catalogue items match your search.
                    </td>
                  </tr>
                ) : (
                  browseItems.map((item) => renderBrowseRow(item))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {importMode === "csv" && csvStep === "upload" && (
        <>
          <div className="mb-[20px] flex items-center justify-between px-[20px] py-[16px]">
            <div className="flex items-center gap-[12px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center bg-[var(--folk-border-subtle)]">
                <FileText className="h-[16px] w-[16px] text-folk-secondary" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-folk-text">CSV template</p>
                <p className="text-[13px] text-folk-secondary">
                  List NDIS item numbers to add — optional claim type, GST code, reference, and status
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="outline-btn flex items-center gap-[6px] px-[14px] py-[8px] text-[13px] font-medium"
              tabIndex={0}
              aria-label="Download CSV template"
            >
              <Download className="h-[13px] w-[13px]" strokeWidth={1.75} />
              Download template
            </button>
          </div>

          <div
            onDrop={(event) => {
              event.preventDefault()
              setIsDragOver(false)
              const file = event.dataTransfer.files?.[0]
              if (file) processCsvFile(file)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center border-2 border-dashed px-[20px] py-[48px] transition-colors",
              isDragOver
                ? "border-blue-400 bg-blue-50/50"
                : "border-folk-border bg-folk-page hover:border-[#bababa] hover:bg-folk-hover",
            )}
            role="button"
            tabIndex={0}
            aria-label="Upload CSV file"
            onKeyDown={(event) => {
              if (event.key === "Enter") fileInputRef.current?.click()
            }}
          >
            <div className="flex h-[48px] w-[48px] items-center justify-center bg-folk-hover">
              <Upload className="h-[20px] w-[20px] text-folk-secondary" strokeWidth={1.75} />
            </div>
            <p className="mt-[12px] text-[14px] font-medium text-folk-text">
              {isDragOver ? "Drop your file here" : "Click to upload or drag and drop"}
            </p>
            <p className="mt-[4px] text-[13px] text-folk-placeholder">CSV files only</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) processCsvFile(file)
              event.target.value = ""
            }}
          />

          {csvParseError && (
            <div className="mt-[16px] flex items-center gap-[8px] bg-red-50 px-[16px] py-[12px]">
              <AlertTriangle className="h-[14px] w-[14px] shrink-0 text-red-500" strokeWidth={1.75} />
              <p className="text-[13px] font-medium text-red-600">{csvParseError}</p>
            </div>
          )}

          <div className="mt-[28px]">
            <h3 className="mb-[12px] text-[14px] font-semibold text-folk-text">How it works</h3>
            <div className="space-y-[12px]">
              {[
                "Download the CSV template and add NDIS support item numbers",
                "Optional columns let you set claim type, GST code, reference name, and status",
                "Upload the file, review the preview, then confirm the import",
                "Items already in your price book are skipped automatically",
              ].map((text, index) => (
                <div key={text} className="flex items-start gap-[12px]">
                  <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center bg-[var(--folk-border-subtle)] text-[12px] font-semibold text-folk-secondary">
                    {index + 1}
                  </span>
                  <p className="pt-[1px] text-[13px] text-folk-secondary">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {importMode === "csv" && csvStep === "preview" && (
        <>
          <div className="mb-[24px] flex flex-wrap items-start justify-between gap-[12px]">
            <div>
              <div className="flex flex-wrap items-center gap-[8px]">
                <span className="inline-flex h-[24px] items-center bg-green-100 px-[10px] text-[12px] font-medium text-green-700">
                  {validCsvRows.length} ready
                </span>
                {errorCsvRows.length > 0 && (
                  <span className="inline-flex h-[24px] items-center bg-red-50 px-[10px] text-[12px] font-medium text-red-600">
                    {errorCsvRows.length} {errorCsvRows.length === 1 ? "error" : "errors"}
                  </span>
                )}
                {skipCsvRows.length > 0 && (
                  <span className="inline-flex h-[24px] items-center bg-amber-50 px-[10px] text-[12px] font-medium text-amber-700">
                    {skipCsvRows.length} already added
                  </span>
                )}
              </div>
              <div className="mt-[8px] flex items-center gap-[8px]">
                <FileText className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.75} />
                <span className="text-[13px] text-folk-secondary">{fileName}</span>
              </div>
            </div>
            <div className="flex items-center gap-[8px]">
              <button
                type="button"
                onClick={handleCsvReset}
                className="outline-btn px-[8px] py-[4px] text-[13px] font-medium"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCsvImport}
                disabled={validCsvRows.length === 0}
                className="outline-btn px-[8px] py-[4px] text-[13px] font-medium disabled:opacity-40"
                tabIndex={0}
              >
                Import {validCsvRows.length - skipCsvRows.length} billable{validCsvRows.length - skipCsvRows.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-folk-border">
            <table className={`${TABLE_FULL} min-w-[760px]`}>
              <thead>
                <tr>
                  <th className={TABLE_PROFILE_HEADER}>Item number</th>
                  <th className={TABLE_PROFILE_HEADER}>Name</th>
                  <th className={TABLE_PROFILE_HEADER}>Price</th>
                  <th className={TABLE_PROFILE_HEADER_LAST}>Issues</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row) => {
                  const ndis = getNdisChargeByItemNumber(row.data.itemNumber)

                  return (
                    <tr
                      key={row.rowIndex}
                      className={cn(row.errors.length > 0 ? "bg-red-50" : "hover:bg-folk-hover")}
                    >
                      <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                        <div className={TABLE_CELL_INNER}>
                          <span className="font-mono text-[12px]">{row.data.itemNumber || "—"}</span>
                        </div>
                      </td>
                      <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                        <div className={TABLE_CELL_INNER}>{ndis?.name ?? "—"}</div>
                      </td>
                      <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                        <div className={TABLE_CELL_INNER}>
                          {ndis ? formatChargePriceLabel(ndis) : "—"}
                        </div>
                      </td>
                      <td className={TABLE_PROFILE_CELL}>
                        <div className={`${TABLE_CELL_INNER} flex flex-col gap-[4px]`}>
                          {row.errors.map((error) => (
                            <span key={error} className="text-[12px] font-medium text-red-600">
                              {error}
                            </span>
                          ))}
                          {row.warnings.map((warning) => (
                            <span key={warning} className="text-[12px] text-amber-700">
                              {warning}
                            </span>
                          ))}
                          {row.errors.length === 0 && row.warnings.length === 0 && (
                            <span className="text-[12px] text-green-700">Ready</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {importMode === "csv" && csvStep === "importing" && (
        <div className="flex flex-col items-center justify-center px-[20px] py-[48px]">
          <Loader2 className="h-[28px] w-[28px] animate-spin text-folk-secondary" strokeWidth={1.75} />
          <p className="mt-[16px] text-[14px] font-medium text-folk-text">Importing billables…</p>
        </div>
      )}

      {importMode === "csv" && csvStep === "complete" && (
        <div className="flex flex-col items-center justify-center px-[20px] py-[48px]">
          <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-green-100">
            <Check className="h-[24px] w-[24px] text-[#2563EB]" strokeWidth={2} />
          </div>
          <p className="mt-[16px] text-[16px] font-semibold text-folk-text">Import complete</p>
          <p className="mt-[4px] text-[13px] text-folk-secondary">
            Added {importedCount} billable{importedCount === 1 ? "" : "s"} to your price book
          </p>
          <div className="mt-[24px] flex items-center gap-[12px]">
            <button
              type="button"
              onClick={handleCsvReset}
              className="outline-btn px-[16px] py-[8px] text-[13px] font-medium"
              tabIndex={0}
            >
              Import more
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
