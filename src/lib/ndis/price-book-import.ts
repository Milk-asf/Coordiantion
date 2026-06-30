import {
  chargeItemFromNdis,
  claimTypes,
  getNdisChargeByItemNumber,
  gstCodes,
  normalizeChargeItem,
  type BillableStatus,
  type ChargeItem,
} from "@/lib/ndis-charges"

export interface PriceBookCsvRow {
  itemNumber: string
  claimType: string
  gstCode: string
  reference: string
  status: string
}

export interface ParsedPriceBookRow {
  rowIndex: number
  data: PriceBookCsvRow
  errors: string[]
  warnings: string[]
  chargeItem: ChargeItem | null
}

const CSV_COLUMNS: { key: keyof PriceBookCsvRow; label: string; required: boolean }[] = [
  { key: "itemNumber", label: "Item Number", required: true },
  { key: "claimType", label: "Claim Type", required: false },
  { key: "gstCode", label: "GST Code", required: false },
  { key: "reference", label: "Reference", required: false },
  { key: "status", label: "Status", required: false },
]

const VALID_CLAIM_VALUES = new Set<string>(claimTypes.map((item) => item.value))
const VALID_CLAIM_LABELS = new Map(claimTypes.map((item) => [item.label.toLowerCase(), item.value]))
const VALID_GST_CODES = new Set<string>(gstCodes.map((item) => item.value))

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function normaliseHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function headerToKey(header: string): keyof PriceBookCsvRow | null {
  const normalised = normaliseHeader(header)
  const match = CSV_COLUMNS.find((column) => normaliseHeader(column.label) === normalised)
  if (match) return match.key
  if (normalised === "item number" || normalised === "support item number" || normalised === "ndis item number") {
    return "itemNumber"
  }
  return null
}

function normaliseClaimType(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return "direct-service"
  if (VALID_CLAIM_VALUES.has(trimmed)) return trimmed
  const fromLabel = VALID_CLAIM_LABELS.get(trimmed.toLowerCase())
  if (fromLabel) return fromLabel
  const slug = trimmed.toLowerCase().replace(/\s+/g, "-")
  if (VALID_CLAIM_VALUES.has(slug)) return slug
  return trimmed
}

function normaliseGstCode(raw: string): string {
  const trimmed = raw.trim().toUpperCase()
  if (!trimmed) return "P2"
  if (VALID_GST_CODES.has(trimmed)) return trimmed
  if (trimmed.startsWith("P") && VALID_GST_CODES.has(trimmed.slice(0, 2))) return trimmed.slice(0, 2)
  return trimmed
}

function normaliseStatus(raw: string): BillableStatus {
  const value = raw.trim().toLowerCase()
  if (value === "inactive" || value === "disabled") return "inactive"
  return "active"
}

export function generatePriceBookImportTemplate(): string {
  const headers = CSV_COLUMNS.map((column) => column.label).join(",")
  const examples = [
    ["01_011_0107_1_1", "Direct Service", "P2", "", "Active"],
    ["07_799_0106_6_3_KM", "Provider Travel", "P2", "Travel (km)", "Active"],
  ]
  return [headers, ...examples.map((row) => row.join(","))].join("\n")
}

export function buildChargeItemFromCatalogue(
  itemNumber: string,
  overrides?: Partial<Pick<ChargeItem, "claimType" | "gstCode" | "reference" | "status">>,
): ChargeItem | null {
  const ndis = getNdisChargeByItemNumber(itemNumber.trim())
  if (!ndis) return null

  const base = chargeItemFromNdis(ndis)
  return normalizeChargeItem({
    id: crypto.randomUUID(),
    ...base,
    claimType: overrides?.claimType ? normaliseClaimType(overrides.claimType) : base.claimType,
    gstCode: overrides?.gstCode ? normaliseGstCode(overrides.gstCode) : base.gstCode,
    reference: overrides?.reference?.trim() || base.reference,
    status: overrides?.status ?? base.status,
  })
}

export function validatePriceBookRow(
  data: PriceBookCsvRow,
  existingItemNumbers: Set<string>,
): { errors: string[]; warnings: string[]; chargeItem: ChargeItem | null } {
  const errors: string[] = []
  const warnings: string[] = []

  const itemNumber = data.itemNumber.trim()
  if (!itemNumber) {
    errors.push("Item Number is required")
    return { errors, warnings, chargeItem: null }
  }

  const ndis = getNdisChargeByItemNumber(itemNumber)
  if (!ndis) {
    errors.push(`Item ${itemNumber} was not found in the NDIS price book`)
    return { errors, warnings, chargeItem: null }
  }

  const claimType = normaliseClaimType(data.claimType)
  if (data.claimType.trim() && !VALID_CLAIM_VALUES.has(claimType)) {
    warnings.push(`Claim type "${data.claimType}" not recognised — using Direct Service`)
  }

  const gstCode = normaliseGstCode(data.gstCode)
  if (data.gstCode.trim() && !VALID_GST_CODES.has(gstCode)) {
    warnings.push(`GST code "${data.gstCode}" not recognised — using P2`)
  }

  if (existingItemNumbers.has(itemNumber)) {
    warnings.push("Already in your billables — will be skipped")
  }

  const chargeItem = buildChargeItemFromCatalogue(itemNumber, {
    claimType: VALID_CLAIM_VALUES.has(claimType) ? claimType : "direct-service",
    gstCode: VALID_GST_CODES.has(gstCode) ? gstCode : "P2",
    reference: data.reference,
    status: normaliseStatus(data.status),
  })

  return { errors, warnings, chargeItem }
}

export function parsePriceBookCsv(
  text: string,
  existingItemNumbers: Set<string>,
): { rows: ParsedPriceBookRow[]; parseError: string | null } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim())
  if (lines.length === 0) {
    return { rows: [], parseError: "The file is empty" }
  }

  const headerCells = parseCsvLine(lines[0])
  const columnMap = headerCells.map((header) => headerToKey(header))
  const itemNumberIndex = columnMap.findIndex((key) => key === "itemNumber")

  if (itemNumberIndex === -1) {
    return { rows: [], parseError: 'Missing required "Item Number" column' }
  }

  const rows: ParsedPriceBookRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    if (cells.every((cell) => !cell.trim())) continue

    const data: PriceBookCsvRow = {
      itemNumber: "",
      claimType: "",
      gstCode: "",
      reference: "",
      status: "",
    }

    columnMap.forEach((key, index) => {
      if (!key) return
      data[key] = cells[index]?.trim() ?? ""
    })

    const { errors, warnings, chargeItem } = validatePriceBookRow(data, existingItemNumbers)

    rows.push({
      rowIndex: i + 1,
      data,
      errors,
      warnings,
      chargeItem,
    })
  }

  if (rows.length === 0) {
    return { rows: [], parseError: "No data rows found in the file" }
  }

  return { rows, parseError: null }
}

export const priceBookImportColumns = CSV_COLUMNS
