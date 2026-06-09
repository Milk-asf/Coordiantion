"use client"

import { useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Download,
  Upload,
  FileText,
  X,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { useClients } from "@/lib/hooks/use-clients"
import { useContacts } from "@/lib/contacts-context"
import { useStaff } from "@/lib/staff-context"
import type { ParticipantDetails, FundingType, Contact, StaffDetails } from "@/lib/types"

type Step = "upload" | "preview" | "importing" | "complete"
type EntityType = "participants" | "contacts" | "staff"

/* ─── Column definition per entity ─── */

interface ColDef<K extends string> {
  key: K
  label: string
  required: boolean
}

type ParticipantCsvRow = {
  firstName: string; lastName: string; middleName: string; dateOfBirth: string
  gender: string; email: string; mobile: string; phone: string; ndisNumber: string
  fundingType: string; primaryDiagnosis: string; secondaryDiagnosis: string
  language: string; ethnicity: string; pronouns: string; preferredContactMethod: string
  medicareNumber: string; centrelinkNumber: string; externalId: string
  planManagerName: string; planManagerEmail: string; planManagerOrg: string; checkInPeriod: string
}

type ContactCsvRow = {
  name: string; relationship: string; email: string; phone: string; clientName: string
}

type StaffCsvRow = {
  firstName: string; lastName: string; preferredName: string; dateOfBirth: string
  gender: string; pronouns: string; email: string; mobile: string; phone: string
  role: string; department: string; employmentType: string; startDate: string
  qualifications: string; certifications: string
  emergencyContactName: string; emergencyContactPhone: string
}

const PARTICIPANT_COLUMNS: ColDef<keyof ParticipantCsvRow>[] = [
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: true },
  { key: "middleName", label: "Middle Name", required: false },
  { key: "dateOfBirth", label: "Date of Birth", required: false },
  { key: "gender", label: "Gender", required: false },
  { key: "email", label: "Email", required: false },
  { key: "mobile", label: "Mobile", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "ndisNumber", label: "NDIS Number", required: false },
  { key: "fundingType", label: "Funding Type", required: false },
  { key: "primaryDiagnosis", label: "Primary Diagnosis", required: false },
  { key: "secondaryDiagnosis", label: "Secondary Diagnosis", required: false },
  { key: "language", label: "Language", required: false },
  { key: "ethnicity", label: "Ethnicity", required: false },
  { key: "pronouns", label: "Pronouns", required: false },
  { key: "preferredContactMethod", label: "Preferred Contact Method", required: false },
  { key: "medicareNumber", label: "Medicare Number", required: false },
  { key: "centrelinkNumber", label: "Centrelink Number", required: false },
  { key: "externalId", label: "External ID", required: false },
  { key: "planManagerName", label: "Plan Manager Name", required: false },
  { key: "planManagerEmail", label: "Plan Manager Email", required: false },
  { key: "planManagerOrg", label: "Plan Manager Organisation", required: false },
  { key: "checkInPeriod", label: "Check-in Period", required: false },
]

const CONTACT_COLUMNS: ColDef<keyof ContactCsvRow>[] = [
  { key: "name", label: "Name", required: true },
  { key: "relationship", label: "Relationship", required: false },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "clientName", label: "Participant", required: false },
]

const STAFF_COLUMNS: ColDef<keyof StaffCsvRow>[] = [
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: true },
  { key: "preferredName", label: "Preferred Name", required: false },
  { key: "dateOfBirth", label: "Date of Birth", required: false },
  { key: "gender", label: "Gender", required: false },
  { key: "pronouns", label: "Pronouns", required: false },
  { key: "email", label: "Email", required: false },
  { key: "mobile", label: "Mobile", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "role", label: "Role", required: false },
  { key: "department", label: "Department", required: false },
  { key: "employmentType", label: "Employment Type", required: false },
  { key: "startDate", label: "Start Date", required: false },
  { key: "qualifications", label: "Qualifications", required: false },
  { key: "certifications", label: "Certifications", required: false },
  { key: "emergencyContactName", label: "Emergency Contact Name", required: false },
  { key: "emergencyContactPhone", label: "Emergency Contact Phone", required: false },
]

/* ─── Helpers ─── */

const VALID_FUNDING_TYPES = ["plan-managed", "ndia-managed", "self-managed", ""]
const VALID_CHECK_IN_PERIODS = ["Weekly", "Fortnightly", "Monthly", "Quarterly", ""]
const isValidCheckInPeriod = (v: string) => VALID_CHECK_IN_PERIODS.includes(v) || /^\d+$/.test(v)
const VALID_EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Casual", "Contract", ""]

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) { result.push(current.trim()); current = "" }
    else current += char
  }
  result.push(current.trim())
  return result
}

function parseDate(input: string): string {
  const slashParts = input.split("/")
  if (slashParts.length === 3) {
    const [d, m, y] = slashParts
    const year = y.length === 2 ? `19${y}` : y
    if (Number(d) && Number(m) && Number(year)) return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  const dashParts = input.split("-")
  if (dashParts.length === 3) {
    if (dashParts[0].length === 4) return input
    const [d, m, y] = dashParts
    const year = y.length === 2 ? `19${y}` : y
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  return ""
}

function normaliseFundingType(raw: string): FundingType {
  const normalised = raw.toLowerCase().replace(/\s+/g, "-")
  if (VALID_FUNDING_TYPES.includes(normalised)) return normalised as FundingType
  return ""
}

/* ─── Template generators ─── */

function generateParticipantTemplate(): string {
  const headers = PARTICIPANT_COLUMNS.map((c) => c.label).join(",")
  const example = [
    "Jane", "Smith", "", "15/03/1990", "Female", "jane@email.com", "0412345678", "",
    "431234567", "plan-managed", "Autism Spectrum Disorder", "", "English", "",
    "She/Her", "Email", "", "", "", "PM Company", "pm@email.com", "PM Org", "Monthly",
  ].join(",")
  return `${headers}\n${example}`
}

function generateContactTemplate(): string {
  const headers = CONTACT_COLUMNS.map((c) => c.label).join(",")
  const example = ["Jane Smith", "Mother", "jane@email.com", "0412345678", "John Smith"].join(",")
  return `${headers}\n${example}`
}

function generateStaffTemplate(): string {
  const headers = STAFF_COLUMNS.map((c) => c.label).join(",")
  const example = [
    "Sarah", "Johnson", "", "22/06/1985", "Female", "She/Her",
    "sarah@company.com", "0412345678", "", "Support Worker", "Support", "Full-time",
    "01/03/2024", "Cert III Disability", "First Aid",
    "Tom Johnson", "0498765432",
  ].join(",")
  return `${headers}\n${example}`
}

/* ─── Validators ─── */

function validateParticipantRow(data: ParticipantCsvRow): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  if (!data.firstName.trim()) errors.push("First Name is required")
  if (!data.lastName.trim()) errors.push("Last Name is required")
  if (data.email && !data.email.includes("@")) errors.push("Invalid email format")
  if (data.fundingType && !VALID_FUNDING_TYPES.includes(data.fundingType.toLowerCase().replace(/\s+/g, "-")))
    warnings.push(`Funding type "${data.fundingType}" not recognised — will be left empty`)
  if (data.checkInPeriod && !isValidCheckInPeriod(data.checkInPeriod))
    warnings.push(`Check-in period "${data.checkInPeriod}" not recognised — use a number of days (e.g. 30) — will be left empty`)
  if (data.dateOfBirth && !parseDate(data.dateOfBirth)) warnings.push("Date of birth format not recognised — use DD/MM/YYYY")
  return { errors, warnings }
}

function validateContactRow(data: ContactCsvRow): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  if (!data.name.trim()) errors.push("Name is required")
  if (data.email && !data.email.includes("@")) errors.push("Invalid email format")
  return { errors, warnings }
}

function validateStaffRow(data: StaffCsvRow): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  if (!data.firstName.trim()) errors.push("First Name is required")
  if (!data.lastName.trim()) errors.push("Last Name is required")
  if (data.email && !data.email.includes("@")) errors.push("Invalid email format")
  if (data.employmentType && !VALID_EMPLOYMENT_TYPES.includes(data.employmentType))
    warnings.push(`Employment type "${data.employmentType}" not recognised — will be left empty`)
  if (data.dateOfBirth && !parseDate(data.dateOfBirth)) warnings.push("Date of birth format not recognised — use DD/MM/YYYY")
  if (data.startDate && !parseDate(data.startDate)) warnings.push("Start date format not recognised — use DD/MM/YYYY")
  return { errors, warnings }
}

/* ─── Row converters ─── */

function rowToParticipant(row: ParticipantCsvRow): Partial<ParticipantDetails> {
  return {
    firstName: row.firstName.trim(), lastName: row.lastName.trim(), middleName: row.middleName.trim(),
    dateOfBirth: row.dateOfBirth ? parseDate(row.dateOfBirth) : "", gender: row.gender.trim(),
    email: row.email.trim(), mobile: row.mobile.trim(), phone: row.phone.trim(),
    ndisNumber: row.ndisNumber.trim(), fundingType: normaliseFundingType(row.fundingType),
    primaryDiagnosis: row.primaryDiagnosis.trim(), secondaryDiagnosis: row.secondaryDiagnosis.trim(),
    language: row.language.trim(), ethnicity: row.ethnicity.trim(), pronouns: row.pronouns.trim(),
    preferredContactMethod: row.preferredContactMethod.trim(), medicareNumber: row.medicareNumber.trim(),
    centrelinkNumber: row.centrelinkNumber.trim(), externalId: row.externalId.trim(),
    planManagerName: row.planManagerName.trim(), planManagerEmail: row.planManagerEmail.trim(),
    planManagerOrg: row.planManagerOrg.trim(),
    checkInPeriod: isValidCheckInPeriod(row.checkInPeriod) ? row.checkInPeriod : "",
  }
}

function rowToContact(row: ContactCsvRow): Omit<Contact, "id"> {
  return {
    clientId: null,
    clientName: row.clientName.trim(),
    name: row.name.trim(),
    relationship: row.relationship.trim(),
    email: row.email.trim(),
    phone: row.phone.trim(),
  }
}

function rowToStaffDetails(row: StaffCsvRow): Partial<StaffDetails> {
  return {
    firstName: row.firstName.trim(), lastName: row.lastName.trim(), preferredName: row.preferredName.trim(),
    dateOfBirth: row.dateOfBirth ? parseDate(row.dateOfBirth) : "", gender: row.gender.trim(),
    pronouns: row.pronouns.trim(), email: row.email.trim(), mobile: row.mobile.trim(), phone: row.phone.trim(),
    role: row.role.trim(), department: row.department.trim(),
    employmentType: VALID_EMPLOYMENT_TYPES.includes(row.employmentType) ? row.employmentType : "",
    startDate: row.startDate ? parseDate(row.startDate) : "",
    qualifications: row.qualifications.trim(), certifications: row.certifications.trim(),
    emergencyContactName: row.emergencyContactName.trim(), emergencyContactPhone: row.emergencyContactPhone.trim(),
  }
}

/* ─── Parsed row interface ─── */

interface ParsedRow { data: Record<string, string>; errors: string[]; warnings: string[]; rowIndex: number }

/* ─── Entity config ─── */

interface EntityConfig {
  label: string
  labelSingular: string
  viewUrl: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColDef<any>[]
  templateFn: () => string
  templateFilename: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validateFn: (data: any) => { errors: string[]; warnings: string[] }
  requiredColumns: string[]
  tableColumns: { key: string; label: string }[]
  chipColumn?: { key: string; formatFn?: (v: string) => string }
  nameColumn: (data: Record<string, string>) => string
  initialsColumn: (data: Record<string, string>) => string
}

const ENTITY_CONFIGS: Record<EntityType, EntityConfig> = {
  participants: {
    label: "participants",
    labelSingular: "participant",
    viewUrl: "/clients",
    columns: PARTICIPANT_COLUMNS,
    templateFn: generateParticipantTemplate,
    templateFilename: "participants-template.csv",
    validateFn: validateParticipantRow,
    requiredColumns: ["firstName", "lastName"],
    tableColumns: [
      { key: "name", label: "Name" },
      { key: "ndisNumber", label: "NDIS Number" },
      { key: "email", label: "Email" },
      { key: "fundingType", label: "Funding" },
    ],
    chipColumn: {
      key: "fundingType",
      formatFn: (v: string) => v.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    },
    nameColumn: (d) => `${d.firstName || "—"} ${d.lastName || "—"}`,
    initialsColumn: (d) => `${d.firstName?.[0]?.toUpperCase() || ""}${d.lastName?.[0]?.toUpperCase() || ""}`,
  },
  contacts: {
    label: "contacts",
    labelSingular: "contact",
    viewUrl: "/contacts",
    columns: CONTACT_COLUMNS,
    templateFn: generateContactTemplate,
    templateFilename: "contacts-template.csv",
    validateFn: validateContactRow,
    requiredColumns: ["name"],
    tableColumns: [
      { key: "name", label: "Name" },
      { key: "relationship", label: "Relationship" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
    ],
    nameColumn: (d) => d.name || "—",
    initialsColumn: (d) => {
      const parts = (d.name || "").trim().split(/\s+/)
      return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : (parts[0]?.[0]?.toUpperCase() || "")
    },
  },
  staff: {
    label: "staff",
    labelSingular: "staff member",
    viewUrl: "/staff",
    columns: STAFF_COLUMNS,
    templateFn: generateStaffTemplate,
    templateFilename: "staff-template.csv",
    validateFn: validateStaffRow,
    requiredColumns: ["firstName", "lastName"],
    tableColumns: [
      { key: "name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "email", label: "Email" },
      { key: "employmentType", label: "Type" },
    ],
    chipColumn: {
      key: "employmentType",
    },
    nameColumn: (d) => `${d.firstName || "—"} ${d.lastName || "—"}`,
    initialsColumn: (d) => `${d.firstName?.[0]?.toUpperCase() || ""}${d.lastName?.[0]?.toUpperCase() || ""}`,
  },
}

const ENTITY_TABS: { key: EntityType; label: string }[] = [
  { key: "participants", label: "Participants" },
  { key: "contacts", label: "Contacts" },
  { key: "staff", label: "Staff" },
]

/* ─── Component ─── */

export default function ImportHistorySettingsPage() {
  const { bulkAddClients } = useClients()
  const { bulkAddContacts } = useContacts()
  const { bulkAddStaff } = useStaff()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [entityType, setEntityType] = useState<EntityType>("participants")
  const [step, setStep] = useState<Step>("upload")
  const [fileName, setFileName] = useState("")
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importedCount, setImportedCount] = useState(0)
  const [importError, setImportError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [issuePopupRow, setIssuePopupRow] = useState<ParsedRow | null>(null)

  const config = ENTITY_CONFIGS[entityType]

  const validRows = parsedRows.filter((r) => r.errors.length === 0)
  const errorRows = parsedRows.filter((r) => r.errors.length > 0)
  const warningRows = parsedRows.filter((r) => r.warnings.length > 0 && r.errors.length === 0)

  const handleDownloadTemplate = () => {
    const csv = config.templateFn()
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = config.templateFilename
    a.click()
    URL.revokeObjectURL(url)
  }

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      setImportError("Please upload a CSV file")
      return
    }
    setImportError(null)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text) return

      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      if (lines.length < 2) {
        setImportError("CSV file is empty or has no data rows")
        return
      }

      const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim())

      const headerMap: Record<string, string> = {}
      for (const col of config.columns) {
        const idx = headers.findIndex((h) => h.toLowerCase() === col.label.toLowerCase())
        if (idx >= 0) headerMap[String(idx)] = col.key
      }

      const hasRequired = config.requiredColumns.every((k) => Object.values(headerMap).includes(k))
      if (!hasRequired) {
        const requiredLabels = config.columns.filter((c) => c.required).map((c) => `'${c.label}'`).join(", ")
        setImportError(`CSV must contain at least ${requiredLabels} columns`)
        return
      }

      const rows: ParsedRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i])
        const data: Record<string, string> = {}
        for (const col of config.columns) data[col.key] = ""
        for (const [idx, key] of Object.entries(headerMap)) {
          const val = values[Number(idx)]
          if (val !== undefined) data[key] = val.replace(/^"|"$/g, "")
        }
        const { errors, warnings } = config.validateFn(data)
        rows.push({ data, errors, warnings, rowIndex: i })
      }

      setParsedRows(rows)
      setStep("preview")
    }
    reader.readAsText(file)
  }, [config])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ""
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = () => setIsDragOver(false)

  const handleRemoveRow = (rowIndex: number) => {
    setParsedRows((prev) => prev.filter((r) => r.rowIndex !== rowIndex))
  }

  const handleImport = async () => {
    if (validRows.length === 0) return
    setStep("importing")
    setImportError(null)

    try {
      let count = 0

      if (entityType === "participants") {
        const inputs = validRows.map((row) => ({
          name: `${row.data.firstName.trim()} ${row.data.lastName.trim()}`,
          participant: rowToParticipant(row.data as unknown as ParticipantCsvRow),
        }))
        const created = await bulkAddClients(inputs)
        count = created.length
      } else if (entityType === "contacts") {
        const inputs = validRows.map((row) => rowToContact(row.data as unknown as ContactCsvRow))
        const created = await bulkAddContacts(inputs)
        count = created.length
      } else {
        const inputs = validRows.map((row) => ({
          name: `${row.data.firstName.trim()} ${row.data.lastName.trim()}`,
          details: rowToStaffDetails(row.data as unknown as StaffCsvRow),
        }))
        const created = await bulkAddStaff(inputs)
        count = created.length
      }

      setImportedCount(count)
      setStep("complete")
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed")
      setStep("preview")
    }
  }

  const handleReset = () => {
    setStep("upload")
    setFileName("")
    setParsedRows([])
    setImportedCount(0)
    setImportError(null)
    setIssuePopupRow(null)
  }

  const handleSwitchEntity = (t: EntityType) => {
    if (t === entityType) return
    handleReset()
    setEntityType(t)
  }

  const requiredNote = config.columns.filter((c) => c.required).map((c) => c.label).join(" and ")

  return (
    <>
      <div className="mb-[32px]">
        <h1 className="text-[20px] font-bold text-[#262626]">Import</h1>
        <p className="mt-[4px] text-[14px] text-[#888]">
          Bulk upload records using a CSV file
        </p>
      </div>

      {/* Entity tabs */}
      <div className="mb-[28px] flex items-center gap-[4px] border-b border-[#f0f0f0]">
        {ENTITY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleSwitchEntity(tab.key)}
            className={cn(
              "relative px-[14px] py-[10px] text-[13px] font-medium transition-colors",
              entityType === tab.key ? "text-[#262626]" : "text-[#888] hover:text-[#555]"
            )}
            tabIndex={0}
          >
            {tab.label}
            {entityType === tab.key && (
              <span className="absolute bottom-0 left-[14px] right-[14px] h-[2px] rounded-full bg-[#262626]" />
            )}
          </button>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <>
          <div className="mb-[20px] flex items-center justify-between px-[20px] py-[16px]">
            <div className="flex items-center gap-[12px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[8px] bg-[#f0f0f0]">
                <FileText className="h-[16px] w-[16px] text-[#888]" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#262626]">CSV template</p>
                <p className="text-[13px] text-[#888]">Download, fill out, and re-upload</p>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-[6px] rounded-[8px] bg-[#f0f0f0] px-[14px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#e8e8e8]"
              tabIndex={0}
              aria-label="Download CSV template"
            >
              <Download className="h-[13px] w-[13px]" strokeWidth={1.75} />
              Download template
            </button>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-[8px] border-2 border-dashed px-[20px] py-[48px] transition-colors",
              isDragOver
                ? "border-blue-400 bg-blue-50/50"
                : "border-[#e0e0e0] bg-[#fafafa] hover:border-[#ccc] hover:bg-[#f5f5f5]"
            )}
            role="button"
            tabIndex={0}
            aria-label="Upload CSV file"
            onKeyDown={(e) => { if (e.key === "Enter") fileInputRef.current?.click() }}
          >
            <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[12px] bg-[#f5f5f5]">
              <Upload className="h-[20px] w-[20px] text-[#888]" strokeWidth={1.75} />
            </div>
            <p className="mt-[12px] text-[14px] font-medium text-[#262626]">
              {isDragOver ? "Drop your file here" : "Click to upload or drag and drop"}
            </p>
            <p className="mt-[4px] text-[13px] text-[#bbb]">CSV files only</p>
          </div>

          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />

          {importError && (
            <div className="mt-[16px] flex items-center gap-[8px] rounded-[8px] bg-red-50 px-[16px] py-[12px]">
              <AlertTriangle className="h-[14px] w-[14px] shrink-0 text-red-500" strokeWidth={1.75} />
              <p className="text-[13px] font-medium text-red-600">{importError}</p>
            </div>
          )}

          <div className="mt-[28px]">
            <h2 className="mb-[12px] text-[14px] font-semibold text-[#262626]">How it works</h2>
            <div className="space-y-[12px]">
              {[
                { step: "1", text: "Download the CSV template above" },
                { step: "2", text: `Fill in details — ${requiredNote} ${config.requiredColumns.length > 1 ? "are" : "is"} required` },
                { step: "3", text: "Upload the completed CSV file" },
                { step: "4", text: "Review the preview, fix any errors, and confirm the import" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-[12px]">
                  <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] bg-[#DBEAFE] text-[11px] font-semibold text-[#2563EB]">
                    {item.step}
                  </span>
                  <p className="text-[13px] text-[#666] pt-[2px]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && (
        <>
          <div className="mb-[24px] flex items-start justify-between">
            <div>
              <div className="flex items-center gap-[12px]">
                <span className="inline-flex h-[24px] items-center rounded-[6px] bg-green-100 px-[10px] text-[12px] font-medium text-green-700">
                  {validRows.length} ready
                </span>
                {errorRows.length > 0 && (
                  <span className="inline-flex h-[24px] items-center rounded-[6px] bg-red-50 px-[10px] text-[12px] font-medium text-red-600">
                    {errorRows.length} {errorRows.length === 1 ? "error" : "errors"}
                  </span>
                )}
                {warningRows.length > 0 && (
                  <span className="inline-flex h-[24px] items-center rounded-[6px] bg-red-50 px-[10px] text-[12px] font-medium text-red-600">
                    {warningRows.length} {warningRows.length === 1 ? "warning" : "warnings"}
                  </span>
                )}
              </div>
              <div className="mt-[8px] flex items-center gap-[8px]">
                <FileText className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.75} />
                <span className="text-[13px] text-[#888]">{fileName}</span>
              </div>
            </div>
            <div className="flex items-center gap-[8px]">
              <button
                onClick={handleReset}
                className="flex items-center gap-[5px] rounded-[4px] border border-[#dcdcdc] bg-transparent px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={validRows.length === 0}
                className="flex items-center gap-[5px] rounded-[4px] border border-[#dcdcdc] bg-transparent px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] disabled:opacity-40"
                tabIndex={0}
              >
                Import {validRows.length} {validRows.length === 1 ? config.labelSingular : config.label}
              </button>
            </div>
          </div>

          {importError && (
            <div className="mb-[16px] flex items-center gap-[8px] rounded-[8px] bg-red-50 px-[16px] py-[12px]">
              <AlertTriangle className="h-[14px] w-[14px] shrink-0 text-red-500" strokeWidth={1.75} />
              <p className="text-[13px] font-medium text-red-600">{importError}</p>
            </div>
          )}

          <div className="overflow-hidden">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  {config.tableColumns.map((col) => (
                    <th key={col.key} className="border-b border-[#f0f0f0] px-[16px] py-[10px] text-left text-[12px] font-medium text-[#999]">
                      {col.label}
                    </th>
                  ))}
                  <th className="border-b border-[#f0f0f0] w-[40px]" />
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row) => {
                  const hasIssues = row.warnings.length > 0 || row.errors.length > 0
                  return (
                    <tr
                      key={row.rowIndex}
                      className={cn("transition-colors", hasIssues ? "bg-red-50" : "hover:bg-[#f5f5f5]")}
                    >
                      {config.tableColumns.map((col, colIdx) => {
                        if (colIdx === 0) {
                          return (
                            <td key={col.key} className="border-b border-[#f0f0f0] px-[16px] py-[12px]">
                              <div className="flex items-center gap-[10px]">
                                {hasIssues ? (
                                  <button
                                    onClick={() => setIssuePopupRow(row)}
                                    className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[6px] transition-colors hover:bg-red-100"
                                    tabIndex={0}
                                    aria-label="View issues"
                                  >
                                    <AlertTriangle className="h-[14px] w-[14px] text-red-400" strokeWidth={1.75} />
                                  </button>
                                ) : (
                                  <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-[#DBEAFE] text-[10px] font-semibold text-[#2563EB]">
                                    {config.initialsColumn(row.data)}
                                  </div>
                                )}
                                <span className="text-[13px] font-medium text-[#262626]">
                                  {config.nameColumn(row.data)}
                                </span>
                              </div>
                            </td>
                          )
                        }

                        if (config.chipColumn && col.key === config.chipColumn.key) {
                          const val = row.data[col.key]
                          return (
                            <td key={col.key} className="border-b border-[#f0f0f0] px-[16px] py-[12px]">
                              {val ? (
                                <span className="inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] bg-[#e8edf2] px-[10px] text-[12px] font-medium text-[#334155]">
                                  {config.chipColumn.formatFn ? config.chipColumn.formatFn(val) : val}
                                </span>
                              ) : (
                                <span className="text-[13px] text-[#ccc]">—</span>
                              )}
                            </td>
                          )
                        }

                        return (
                          <td key={col.key} className="border-b border-[#f0f0f0] px-[16px] py-[12px] text-[13px] text-[#888]">
                            {row.data[col.key] || "—"}
                          </td>
                        )
                      })}
                      <td className="border-b border-[#f0f0f0] px-[16px] py-[12px]">
                        <button
                          onClick={() => handleRemoveRow(row.rowIndex)}
                          className="flex h-[24px] w-[24px] items-center justify-center rounded-[6px] text-[#d4d4d4] transition-colors hover:bg-red-50 hover:text-red-400"
                          tabIndex={0}
                          aria-label={`Remove ${config.nameColumn(row.data)}`}
                        >
                          <X className="h-[12px] w-[12px]" strokeWidth={2} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {issuePopupRow && (
            <>
              <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIssuePopupRow(null)} />
              <div className="fixed left-1/2 top-1/2 z-50 w-[400px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-[8px] border border-[#f0f0f0] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
                <div className="flex items-center justify-between border-b border-[#f0f0f0] px-[20px] py-[14px]">
                  <div className="flex items-center gap-[8px]">
                    <AlertTriangle className="h-[14px] w-[14px] text-red-400" strokeWidth={1.75} />
                    <h3 className="text-[14px] font-semibold text-[#262626]">
                      {config.nameColumn(issuePopupRow.data)}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIssuePopupRow(null)}
                    className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#999] transition-colors hover:bg-[#f5f5f5]"
                    tabIndex={0}
                    aria-label="Close"
                  >
                    <X className="h-[14px] w-[14px]" strokeWidth={2} />
                  </button>
                </div>
                <div className="px-[20px] py-[16px]">
                  {issuePopupRow.errors.length > 0 && (
                    <div className="mb-[12px]">
                      <p className="mb-[6px] text-[12px] font-semibold text-red-600">Errors</p>
                      {issuePopupRow.errors.map((err, i) => (
                        <p key={i} className="text-[13px] text-red-600">• {err}</p>
                      ))}
                    </div>
                  )}
                  {issuePopupRow.warnings.length > 0 && (
                    <div>
                      <p className="mb-[6px] text-[12px] font-semibold text-red-500">Warnings</p>
                      {issuePopupRow.warnings.map((warn, i) => (
                        <p key={i} className="text-[13px] text-red-500">• {warn}</p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-[8px] border-t border-[#f0f0f0] px-[20px] py-[12px]">
                  <button
                    onClick={() => setIssuePopupRow(null)}
                    className="rounded-[4px] border border-[#dcdcdc] bg-transparent px-[12px] py-[5px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                    tabIndex={0}
                  >
                    Keep
                  </button>
                  <button
                    onClick={() => {
                      handleRemoveRow(issuePopupRow.rowIndex)
                      setIssuePopupRow(null)
                    }}
                    className="rounded-[4px] bg-red-500 px-[12px] py-[5px] text-[13px] font-medium text-white transition-colors hover:bg-red-600"
                    tabIndex={0}
                  >
                    Remove from import
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Step 3: Importing */}
      {step === "importing" && (
        <div className="flex flex-col items-center justify-center px-[20px] py-[48px]">
          <Loader2 className="h-[28px] w-[28px] animate-spin text-[#888]" strokeWidth={1.75} />
          <p className="mt-[16px] text-[14px] font-medium text-[#262626]">Importing {config.label}...</p>
          <p className="mt-[4px] text-[13px] text-[#888]">This may take a moment</p>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === "complete" && (
        <div className="flex flex-col items-center justify-center px-[20px] py-[48px]">
          <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-green-100">
            <Check className="h-[24px] w-[24px] text-[#2563EB]" strokeWidth={2} />
          </div>
          <p className="mt-[16px] text-[16px] font-semibold text-[#262626]">Import complete</p>
          <p className="mt-[4px] text-[13px] text-[#888]">
            Successfully imported {importedCount} {importedCount === 1 ? config.labelSingular : config.label}
          </p>
          <div className="mt-[24px] flex items-center gap-[12px]">
            <button
              onClick={handleReset}
              className="rounded-[8px] bg-[#f0f0f0] px-[16px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#e8e8e8]"
              tabIndex={0}
            >
              Import more
            </button>
            <a
              href={config.viewUrl}
              className="primary-btn flex items-center gap-[6px] rounded-[8px] px-[16px] py-[8px] text-[13px] font-semibold transition-colors"
              tabIndex={0}
            >
              View {config.label}
            </a>
          </div>
        </div>
      )}
    </>
  )
}
