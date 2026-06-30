import { getNdisChargeByItemNumber } from "@/lib/ndis-charges"

/**
 * NDIS Bulk Payment Request (PACE / myplace provider portal) builder.
 *
 * Registered providers claim against NDIA-managed plans by uploading a
 * 16-column comma-delimited file. This module turns app invoices into that
 * exact column layout, validates each line against NDIS rules (NDIS number,
 * ABN checksum, support item, price caps, claim type) and emits a UTF-8 CSV
 * ready for the portal's "bulk payment request upload" tile.
 *
 * Reference: NDIS "Bulk payment requests" self-help guide and the 2025-26
 * Pricing Arrangements and Price Limits.
 */

/** The 16 columns, in the exact order the portal expects. */
export const BPR_COLUMNS = [
  "RegistrationNumber",
  "NDISNumber",
  "SupportsDeliveredFrom",
  "SupportsDeliveredTo",
  "SupportNumber",
  "ClaimReference",
  "Quantity",
  "Hours",
  "UnitPrice",
  "GSTCode",
  "AuthorisedBy",
  "ParticipantApproved",
  "InKindFundingProgramCode",
  "ClaimType",
  "CancellationReason",
  "ABN",
] as const

/**
 * Maps an internal charge claim type to the NDIS bulk-upload ClaimType code.
 * Direct service is represented by an empty field per the NDIS guide.
 */
export const NDIS_CLAIM_TYPE_CODES: Record<string, string> = {
  "direct-service": "",
  "non-face-to-face": "NF2F",
  "provider-travel": "TRAN",
  cancellation: "CANC",
  "ndia-required-report": "REPW",
  telehealth: "THLT",
  "irregular-sil": "IRSS",
}

/** Short-notice cancellation reasons accepted by the portal. */
export const CANCELLATION_REASONS = [
  { value: "NSDH", label: "No show — did not attend (health)" },
  { value: "NSCC", label: "No show — cancelled by client" },
] as const

export interface BprProvider {
  /** NDIS registration / Organisation ID (from workspace settings). */
  registrationNumber: string
  /** Provider ABN (11 digits). */
  abn: string
}

export interface BprLineInput {
  /** Participant NDIS number (9 digits). */
  ndisNumber: string
  /** Service start date, ISO yyyy-mm-dd. */
  supportsDeliveredFrom: string
  /** Service end date, ISO yyyy-mm-dd. */
  supportsDeliveredTo: string
  /** NDIS support item number, e.g. 01_011_0107_1_1. */
  supportNumber: string
  /** Unique per-line claim reference. */
  claimReference: string
  /** Per-hour unit when true; otherwise a discrete quantity. */
  isHourly: boolean
  quantity: number
  unitPrice: number
  /** Internal GST code (P1/P2/P5); normalised to P1/P2 for the portal. */
  gstCode: string
  /** Internal claim type key (see NDIS_CLAIM_TYPE_CODES). */
  claimType: string
  cancellationReason?: string
  participantApproved?: boolean
  /** Carried through for error reporting; not exported. */
  meta?: { invoiceNumber?: string; participantName?: string; description?: string }
}

export interface BprValidationError {
  index: number
  field: string
  message: string
  meta?: BprLineInput["meta"]
}

export interface BprBuildResult {
  rows: string[][]
  csv: string
  errors: BprValidationError[]
  lineCount: number
}

/** Validates an ABN using the ATO weighted-modulus-89 checksum. */
export function isValidAbn(abn: string): boolean {
  const digits = (abn || "").replace(/\s/g, "")
  if (!/^\d{11}$/.test(digits)) return false
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  const total = digits.split("").reduce((sum, char, index) => {
    const value = Number(char) - (index === 0 ? 1 : 0)
    return sum + value * weights[index]
  }, 0)
  return total % 89 === 0
}

/** NDIS participant numbers are 9 digits with no spaces. */
export function isValidNdisNumber(value: string): boolean {
  return /^\d{9}$/.test((value || "").replace(/\s/g, ""))
}

/** NDIS bulk upload expects YYYY/MM/DD (per the official self-help guide). */
function toNdisDate(iso: string): string {
  if (!iso) return ""
  const [year, month, day] = iso.split("-")
  if (!year || !month || !day) return ""
  return `${year}/${month.padStart(2, "0")}/${day.padStart(2, "0")}`
}

/** Only P1 (taxable) and P2 (GST-free) are valid in the portal; map the rest to P2. */
function normaliseGstCode(code: string): string {
  return code === "P1" ? "P1" : "P2"
}

/** Builds a unique, portal-safe claim reference (max 50 chars). */
export function buildClaimReference(invoiceNumber: string, lineIndex: number): string {
  const base = (invoiceNumber || "CLAIM").replace(/[^A-Za-z0-9-]/g, "").toUpperCase()
  const ref = `CL-${base}-${String(lineIndex + 1).padStart(4, "0")}`
  return ref.slice(0, 50)
}

function validateLine(line: BprLineInput, index: number): BprValidationError[] {
  const errors: BprValidationError[] = []
  const push = (field: string, message: string) => errors.push({ index, field, message, meta: line.meta })

  if (!isValidNdisNumber(line.ndisNumber)) push("NDISNumber", "Participant NDIS number must be 9 digits.")
  if (!line.supportNumber) push("SupportNumber", "Missing NDIS support item number.")
  if (!line.supportsDeliveredFrom) push("SupportsDeliveredFrom", "Missing service start date.")
  if (!line.supportsDeliveredTo) push("SupportsDeliveredTo", "Missing service end date.")
  if (
    line.supportsDeliveredFrom &&
    line.supportsDeliveredTo &&
    line.supportsDeliveredTo < line.supportsDeliveredFrom
  ) {
    push("SupportsDeliveredTo", "Service end date is before the start date.")
  }
  if (!(line.quantity > 0)) push("Quantity", "Quantity / hours must be greater than zero.")
  if (!(line.unitPrice > 0)) push("UnitPrice", "Unit price must be greater than zero.")

  // Price-cap check against the active NDIS catalogue (national price limit).
  const catalogue = getNdisChargeByItemNumber(line.supportNumber)
  if (catalogue && catalogue.price > 0 && line.unitPrice > catalogue.price + 0.005) {
    push(
      "UnitPrice",
      `Unit price $${line.unitPrice.toFixed(2)} exceeds the NDIS price limit $${catalogue.price.toFixed(2)}.`,
    )
  }

  if (!(line.claimType in NDIS_CLAIM_TYPE_CODES)) push("ClaimType", `Unknown claim type "${line.claimType}".`)
  if (line.claimType === "cancellation" && !line.cancellationReason) {
    push("CancellationReason", "Cancellation claims require a cancellation reason (NSDH or NSCC).")
  }
  if (line.claimType !== "cancellation" && line.cancellationReason) {
    push("CancellationReason", "Cancellation reason is only allowed on cancellation claims.")
  }

  return errors
}

function lineToRow(line: BprLineInput, provider: BprProvider): string[] {
  const claimCode = NDIS_CLAIM_TYPE_CODES[line.claimType] ?? ""
  const quantityValue = line.isHourly ? "" : String(line.quantity)
  const hoursValue = line.isHourly ? line.quantity.toFixed(2) : ""

  return [
    provider.registrationNumber,
    (line.ndisNumber || "").replace(/\s/g, ""),
    toNdisDate(line.supportsDeliveredFrom),
    toNdisDate(line.supportsDeliveredTo),
    line.supportNumber,
    line.claimReference,
    quantityValue,
    hoursValue,
    line.unitPrice.toFixed(2),
    normaliseGstCode(line.gstCode),
    "", // AuthorisedBy — optional / legacy
    line.participantApproved === false ? "N" : "Y",
    "", // InKindFundingProgramCode — not applicable
    claimCode,
    line.claimType === "cancellation" ? line.cancellationReason ?? "" : "",
    (provider.abn || "").replace(/\s/g, ""),
  ]
}

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function bprRowsToCsv(rows: string[][]): string {
  return [BPR_COLUMNS.join(","), ...rows.map((row) => row.map(escapeCsvCell).join(","))].join("\r\n")
}

/** Provider-level readiness check (run before building any rows). */
export function validateBprProvider(provider: BprProvider): BprValidationError[] {
  const errors: BprValidationError[] = []
  if (!provider.registrationNumber.trim())
    errors.push({ index: -1, field: "RegistrationNumber", message: "Add your NDIS registration number in Settings → General." })

  const abn = (provider.abn || "").replace(/\s/g, "")
  if (!abn) {
    errors.push({ index: -1, field: "ABN", message: "No ABN saved — add your 11-digit provider ABN in Settings → General." })
  } else if (!/^\d{11}$/.test(abn)) {
    errors.push({
      index: -1,
      field: "ABN",
      message: `Saved ABN “${provider.abn.trim()}” must be 11 digits — update it in Settings → General.`,
    })
  } else if (!isValidAbn(abn)) {
    errors.push({
      index: -1,
      field: "ABN",
      message: `Saved ABN “${provider.abn.trim()}” isn’t a valid ABN (it fails the ABN check digit) — correct it in Settings → General.`,
    })
  }
  return errors
}

/**
 * Builds the validated bulk payment request. Lines with errors are excluded
 * from `rows`/`csv` but reported in `errors`, so a clean file is always
 * uploadable while the operator fixes the rest.
 */
export function buildBulkPaymentRequest(provider: BprProvider, lines: BprLineInput[]): BprBuildResult {
  const providerErrors = validateBprProvider(provider)
  const rows: string[][] = []
  const errors: BprValidationError[] = [...providerErrors]

  lines.forEach((line, index) => {
    const lineErrors = validateLine(line, index)
    if (lineErrors.length > 0) {
      errors.push(...lineErrors)
      return
    }
    rows.push(lineToRow(line, provider))
  })

  return {
    rows,
    csv: bprRowsToCsv(rows),
    errors,
    lineCount: rows.length,
  }
}
