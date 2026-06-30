import type { ComponentType } from "react"
import {
  AlertTriangle,
  CalendarClock,
  CalendarRange,
  CircleDollarSign,
  ClipboardList,
  DollarSign,
  FileText,
  MapPin,
  ReceiptText,
  SquareCheck,
  User,
  Users,
} from "lucide-react"
import { getDataSource, type DataEntity } from "@/lib/analytics/definitions"
import type { Document, Incident, Invoice, Reimbursement, StaffMember, Task, Client } from "@/lib/types"
import type { Form } from "@/lib/form-definitions"
import type { Timesheet, TravelClaim } from "@/lib/timesheets/types"
import type { RosterShift } from "@/lib/roster/types"
import type { CustomFieldKind } from "@/lib/lists/custom-field-types"
import { CUSTOM_FIELD_DEFAULT_LABEL } from "@/lib/lists/custom-field-types"

/** Flattened travel-claim record: a claim joined to its parent timesheet. */
interface TravelClaimListRecord {
  claim: TravelClaim
  timesheet: Timesheet
}

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>

/** How a column value is rendered and whether it can group a kanban board. */
export type ListFieldKind = "text" | "number" | "date" | "boolean" | "category"

export type ListFieldFormat = "number" | "currency" | "hours"

export interface ListField {
  key: string
  label: string
  kind: ListFieldKind
  format?: ListFieldFormat
  get: (record: unknown) => unknown
}

export interface ListSource {
  key: string
  label: string
  noun: string
  icon: IconType
  /** First column + kanban card title. */
  primary: ListField
  fields: ListField[]
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

function field<T>(
  key: string,
  label: string,
  kind: ListFieldKind,
  get: (record: T) => unknown,
  format?: ListFieldFormat,
): ListField {
  return { key, label, kind, format, get: (record) => get(record as T) }
}

/** Map an analytics entity's dimensions + measures onto list fields. */
function fieldsFromEntity(entity: DataEntity): ListField[] {
  const dimensions = entity.dimensions.map<ListField>((dimension) => ({
    key: dimension.key,
    label: dimension.label,
    kind: dimension.kind === "date" ? "date" : dimension.kind === "boolean" ? "boolean" : "category",
    get: dimension.get,
  }))
  const measures = entity.measures.map<ListField>((measureDef) => ({
    key: measureDef.key,
    label: measureDef.label,
    kind: "number",
    format: measureDef.format,
    get: measureDef.get,
  }))
  return [...dimensions, ...measures]
}

/** Wraps an analytics root entity (clients, staff, shifts, …) as a list source. */
function sourceFromEntity(entityKey: string, primary: ListField, icon?: IconType): ListSource {
  const entity = getDataSource(entityKey)
  return {
    key: entity.key,
    label: entity.label,
    noun: entity.noun,
    icon: icon ?? entity.icon,
    primary,
    fields: fieldsFromEntity(entity),
  }
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

const documentsSource: ListSource = {
  key: "documents",
  label: "Documents",
  noun: "documents",
  icon: FileText,
  primary: field<Document>("__name", "Name", "text", (d) => d.name || "Untitled document"),
  fields: [
    field<Document>("folder", "Folder", "category", (d) => d.folder || "—"),
    field<Document>("mimeType", "Type", "category", (d) => documentType(d.mimeType)),
    field<Document>("uploadedBy", "Uploaded by", "category", (d) => d.uploadedBy || "—"),
    field<Document>("validFrom", "Valid from", "date", (d) => d.validFrom),
    field<Document>("validTo", "Valid to", "date", (d) => d.validTo),
    field<Document>("createdAt", "Created", "date", (d) => d.createdAt),
    field<Document>("size", "Size (KB)", "number", (d) => Math.round((d.size || 0) / 1024)),
  ],
}

const formsSource: ListSource = {
  key: "forms",
  label: "Forms",
  noun: "forms",
  icon: ClipboardList,
  primary: field<Form>("__name", "Name", "text", (f) => f.name || "Untitled form"),
  fields: [
    field<Form>("status", "Status", "category", (f) => f.status),
    field<Form>("createdByName", "Created by", "category", (f) => f.createdByName || "—"),
    field<Form>("isIncidentForm", "Incident form", "boolean", (f) => Boolean(f.isIncidentForm)),
    field<Form>("locked", "Locked", "boolean", (f) => Boolean(f.locked)),
    field<Form>("archived", "Archived", "boolean", (f) => Boolean(f.archived)),
    field<Form>("createdAt", "Created", "date", (f) => f.createdAt),
    field<Form>("updatedAt", "Updated", "date", (f) => f.updatedAt),
    field<Form>("fields", "Fields", "number", (f) => f.schema?.fields?.length ?? 0),
  ],
}

/** Flattened budget row (one per participant budget) — built in use-list-data. */
export interface BudgetListRecord {
  id: string
  clientId: string
  clientName: string
  name: string
  pool: string
  status: string
  total: number
  used: number
  remaining: number
  usagePct: number
  release: string
  startDate: string | null
  endDate: string | null
  items: number
  daysRemaining: number | null
}

/** Flattened spending-plan row (one per participant spending plan). */
export interface SpendingPlanListRecord {
  id: string
  clientId: string
  clientName: string
  name: string
  budgetName: string
  component: string
  service: string
  cadence: string
  status: string
  periodCost: number
  totalCost: number
  overBudget: boolean
}

const budgetsSource: ListSource = {
  key: "budgets",
  label: "Budgets",
  noun: "budgets",
  icon: DollarSign,
  primary: field<BudgetListRecord>("__name", "Budget", "text", (b) => b.name || "Budget"),
  fields: [
    field<BudgetListRecord>("clientName", "Participant", "category", (b) => b.clientName || "—"),
    field<BudgetListRecord>("pool", "Funding pool", "category", (b) => b.pool || "—"),
    field<BudgetListRecord>("status", "Status", "category", (b) => b.status || "—"),
    field<BudgetListRecord>("total", "Total", "number", (b) => b.total, "currency"),
    field<BudgetListRecord>("used", "Used", "number", (b) => b.used, "currency"),
    field<BudgetListRecord>("remaining", "Remaining", "number", (b) => b.remaining, "currency"),
    field<BudgetListRecord>("usagePct", "Usage %", "number", (b) => Math.round(b.usagePct)),
    field<BudgetListRecord>("release", "Release", "category", (b) => b.release || "—"),
    field<BudgetListRecord>("startDate", "Start date", "date", (b) => b.startDate),
    field<BudgetListRecord>("endDate", "End date", "date", (b) => b.endDate),
    field<BudgetListRecord>("items", "Items", "number", (b) => b.items),
    field<BudgetListRecord>("daysRemaining", "Days left", "number", (b) => b.daysRemaining ?? 0),
  ],
}

const spendingPlansSource: ListSource = {
  key: "spending-plans",
  label: "Planned spending",
  noun: "spending plans",
  icon: CalendarClock,
  primary: field<SpendingPlanListRecord>("__name", "Plan", "text", (p) => p.name || "Spending plan"),
  fields: [
    field<SpendingPlanListRecord>("clientName", "Participant", "category", (p) => p.clientName || "—"),
    field<SpendingPlanListRecord>("budgetName", "Budget", "category", (p) => p.budgetName || "—"),
    field<SpendingPlanListRecord>("component", "Component", "category", (p) => p.component || "—"),
    field<SpendingPlanListRecord>("service", "Service", "category", (p) => p.service || "—"),
    field<SpendingPlanListRecord>("cadence", "Cadence", "category", (p) => p.cadence || "—"),
    field<SpendingPlanListRecord>("status", "Status", "category", (p) => p.status || "—"),
    field<SpendingPlanListRecord>("periodCost", "Period cost", "number", (p) => p.periodCost, "currency"),
    field<SpendingPlanListRecord>("totalCost", "Total cost", "number", (p) => p.totalCost, "currency"),
    field<SpendingPlanListRecord>("overBudget", "Over budget", "boolean", (p) => p.overBudget),
  ],
}

export const LIST_SOURCES: ListSource[] = [
  sourceFromEntity("clients", field<Client>("__name", "Name", "text", (c) => c.name || "Participant"), User),
  sourceFromEntity("staff", field<StaffMember>("__name", "Name", "text", (s) => s.name || "Staff member"), Users),
  budgetsSource,
  spendingPlansSource,
  documentsSource,
  formsSource,
  sourceFromEntity("incidents", field<Incident>("__name", "Incident", "text", (i) => i.description?.trim() || (i.incidentNumber ? `Incident ${i.incidentNumber}` : "Incident")), AlertTriangle),
  sourceFromEntity("tasks", field<Task>("__name", "Title", "text", (t) => t.title || "Untitled task"), SquareCheck),
  sourceFromEntity("shifts", field<RosterShift>("__name", "Shift", "text", (s) => s.title || s.clientName || "Shift"), CalendarRange),
  sourceFromEntity("timesheets", field<Timesheet>("__name", "Timesheet", "text", (t) => t.submittedByName || "Timesheet"), CalendarRange),
  sourceFromEntity(
    "timesheets.travelClaims",
    field<TravelClaimListRecord>(
      "__name",
      "Travel claim",
      "text",
      (r) => `${r.claim.startLocation || "—"} → ${r.claim.endLocation || "—"}`,
    ),
    MapPin,
  ),
  sourceFromEntity("invoices", field<Invoice>("__name", "Invoice", "text", (i) => i.invoiceNumber || i.clientName || "Invoice"), ReceiptText),
  sourceFromEntity("reimbursements", field<Reimbursement>("__name", "Title", "text", (r) => r.title || "Reimbursement"), CircleDollarSign),
]

const sourceByKey = new Map<string, ListSource>(LIST_SOURCES.map((source) => [source.key, source]))

export function getListSource(key: string): ListSource | undefined {
  return sourceByKey.get(key)
}

/** Every selectable column for a source, including the primary name column. */
export function getSourceColumns(key: string): ListField[] {
  const source = getListSource(key)
  if (!source) return []
  return [source.primary, ...source.fields]
}

export function getSourceField(sourceKey: string, fieldKey: string): ListField | undefined {
  return getSourceColumns(sourceKey).find((column) => column.key === fieldKey)
}

/** Category + boolean fields are the only ones that can group a kanban board. */
export function getKanbanFields(sourceKey: string): ListField[] {
  const source = getListSource(sourceKey)
  if (!source) return []
  return source.fields.filter((field) => field.kind === "category" || field.kind === "boolean")
}

/** Sensible starter columns (5) when a list is created without a template. */
export const LIST_DEFAULT_COLUMNS: Record<string, string[]> = {
  clients: ["status", "fundingType", "owner", "planEndDate", "language"],
  staff: ["role", "department", "employmentType", "status", "startDate"],
  budgets: ["clientName", "pool", "status", "total", "remaining"],
  "spending-plans": ["clientName", "budgetName", "component", "status", "totalCost"],
  documents: ["folder", "mimeType", "uploadedBy", "validTo", "createdAt"],
  forms: ["status", "createdByName", "createdAt", "updatedAt", "fields"],
  incidents: ["incidentStatus", "category", "isReportable", "reportedByName", "incidentDate"],
  tasks: ["status", "assignee", "client", "dueDate", "chargeType"],
  shifts: ["status", "staffName", "clientName", "sessionType", "date"],
  timesheets: ["status", "submittedByName", "startDate", "workedHours", "travelClaims"],
  "timesheets.travelClaims": ["status", "submittedByName", "purpose", "date", "distanceKm"],
  invoices: ["status", "clientName", "issueDate", "dueDate", "total"],
  reimbursements: ["status", "category", "createdByName", "dateIncurred", "amount"],
}

export const LIST_DEFAULT_COLUMN_COUNT = 5

/** First N valid columns for a source — used when creating a blank list. */
export function getDefaultListColumns(sourceKey: string, limit = LIST_DEFAULT_COLUMN_COUNT): string[] {
  const preset = LIST_DEFAULT_COLUMNS[sourceKey]
  const candidates = preset ?? getListSource(sourceKey)?.fields.map((field) => field.key) ?? []
  return candidates
    .filter((key) => key !== "__name" && Boolean(getSourceField(sourceKey, key)))
    .slice(0, limit)
}

function documentType(mimeType: string): string {
  if (!mimeType) return "File"
  if (mimeType.includes("pdf")) return "PDF"
  if (mimeType.includes("image")) return "Image"
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) return "Spreadsheet"
  if (mimeType.includes("word") || mimeType.includes("document")) return "Document"
  if (mimeType.includes("presentation")) return "Slides"
  const subtype = mimeType.split("/").pop()
  return subtype ? subtype.toUpperCase() : "File"
}

// ---------------------------------------------------------------------------
// List model
// ---------------------------------------------------------------------------

export type ListViewMode = "table" | "kanban"

export interface ListCustomFieldDef {
  label: string
  kind: CustomFieldKind
  /** Options for select / multi-select columns. */
  options?: string[]
}

export interface ListColumn {
  id: string
  fieldKey: string
  /** List-local column with editable values (not pulled from the source record). */
  custom?: ListCustomFieldDef
}

export interface CustomList {
  id: string
  workspaceId: string
  name: string
  icon: string
  iconColor: string
  source: string
  view: ListViewMode
  columns: ListColumn[]
  /** Field used to group records into kanban columns. */
  kanbanField: string | null
  /** Custom kanban stage order (display keys). Empty stages are shown when listed here. */
  kanbanStages: string[] | null
  /** Per-record stage labels for list kanban (record id → stage). */
  kanbanRecordStages: Record<string, string> | null
  /** Record ids explicitly added to this list. Empty = zero state until user adds rows. */
  recordIds: string[]
  /** Per-record values for custom columns (record id → field key → value). */
  customValues?: Record<string, Record<string, unknown>>
  /** Pinned lists sort first in the sidebar and index. */
  pinned: boolean
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

/** Sort pinned lists first, otherwise preserve incoming order. */
export function sortLists<T extends { pinned?: boolean }>(lists: T[]): T[] {
  return [...lists].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
}

export const LIST_ICON_CHOICES = ["📋", "🗂️", "✅", "🚀", "📁", "📌", "🔥", "⭐", "🎯", "📊", "🧩", "🛠️"]

export const LIST_ICON_COLORS = ["#3BA3F8", "#D6569B", "#68D391", "#F6AD55", "#9F7AEA", "#F56565"]

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

export function createListColumn(fieldKey: string): ListColumn {
  return { id: generateId("col"), fieldKey }
}

export function createCustomListColumn(kind: CustomFieldKind, label?: string): ListColumn {
  const id = generateId("col")
  return {
    id,
    fieldKey: `custom_${id}`,
    custom: {
      label: label?.trim() || CUSTOM_FIELD_DEFAULT_LABEL[kind],
      kind,
      options: kind === "select" || kind === "multi-select" ? ["Option 1", "Option 2", "Option 3"] : undefined,
    },
  }
}

export function resolveListColumn(
  sourceKey: string,
  column: ListColumn,
): { field: ListField; isCustom: boolean } | null {
  if (column.custom) {
    const kind = customKindToListFieldKind(column.custom.kind)
    return {
      isCustom: true,
      field: {
        key: column.fieldKey,
        label: column.custom.label,
        kind,
        format: column.custom.kind === "number" ? "currency" : undefined,
        get: () => undefined,
      },
    }
  }
  const field = getSourceField(sourceKey, column.fieldKey)
  if (!field) return null
  return { field, isCustom: false }
}

function customKindToListFieldKind(kind: CustomFieldKind): ListFieldKind {
  if (kind === "number") return "number"
  if (kind === "date") return "date"
  if (kind === "boolean") return "boolean"
  if (kind === "select" || kind === "multi-select") return "category"
  return "text"
}

export function createList(params: {
  workspaceId: string
  createdByName: string
  name?: string
  icon?: string
  iconColor?: string
  source: string
  /** Explicit columns (field keys). Defaults to five source-specific columns. */
  columns?: string[]
  view?: ListViewMode
  kanbanField?: string | null
}): CustomList {
  const now = new Date().toISOString()
  const source = getListSource(params.source) ?? LIST_SOURCES[0]
  const seedKeys =
    params.columns !== undefined && params.columns.length > 0
      ? params.columns
      : getDefaultListColumns(source.key)
  const validKeys = seedKeys.filter((key) => Boolean(getSourceField(source.key, key)))
  const kanbanField =
    params.kanbanField !== undefined
      ? params.kanbanField
      : source.fields.find((field) => field.kind === "category")?.key ?? null
  return {
    id: generateId("list"),
    workspaceId: params.workspaceId,
    name: params.name?.trim() || `Untitled ${source.noun} list`,
    icon: params.icon || LIST_ICON_CHOICES[0],
    iconColor: params.iconColor || LIST_ICON_COLORS[0],
    source: source.key,
    view: params.view ?? "table",
    columns: validKeys.map((key) => createListColumn(key)),
    kanbanField,
    kanbanStages: null,
    kanbanRecordStages: null,
    recordIds: [],
    customValues: {},
    pinned: false,
    createdBy: "",
    createdByName: params.createdByName,
    createdAt: now,
    updatedAt: now,
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export type ListTemplateCategory =
  | "People & HR"
  | "Service delivery"
  | "Finance"
  | "Quality & compliance"

export const LIST_TEMPLATE_CATEGORIES: ListTemplateCategory[] = [
  "People & HR",
  "Service delivery",
  "Finance",
  "Quality & compliance",
]

export interface ListTemplate {
  id: string
  name: string
  description: string
  icon: string
  iconColor: string
  category: ListTemplateCategory
  source: string
  view: ListViewMode
  columns: string[]
  kanbanField: string | null
}

export const LIST_TEMPLATES: ListTemplate[] = [
  {
    id: "participant-tracker",
    name: "Participant tracker",
    description: "Active participants with funding type, coordinator and plan dates.",
    icon: "👤",
    iconColor: "#3BA3F8",
    category: "People & HR",
    source: "clients",
    view: "table",
    columns: ["status", "fundingType", "owner", "planEndDate"],
    kanbanField: "status",
  },
  {
    id: "incident-board",
    name: "Incident board",
    description: "Track incidents by status across category and reportability.",
    icon: "🚨",
    iconColor: "#F56565",
    category: "Quality & compliance",
    source: "incidents",
    view: "kanban",
    columns: ["category", "isReportable", "reportedByName", "incidentDate"],
    kanbanField: "incidentStatus",
  },
  {
    id: "task-board",
    name: "Task board",
    description: "A kanban of tasks grouped by their progress status.",
    icon: "✅",
    iconColor: "#68D391",
    category: "Service delivery",
    source: "tasks",
    view: "kanban",
    columns: ["assignee", "client", "dueDate"],
    kanbanField: "status",
  },
  {
    id: "budget-tracker",
    name: "Budget tracker",
    description: "Participant NDIS budgets with usage, remaining funds and status.",
    icon: "💰",
    iconColor: "#68D391",
    category: "Finance",
    source: "budgets",
    view: "table",
    columns: ["clientName", "pool", "total", "used", "remaining", "status"],
    kanbanField: "status",
  },
  {
    id: "planned-spending",
    name: "Planned spending",
    description: "Participant spending plans by status, with period and total cost.",
    icon: "📅",
    iconColor: "#9F7AEA",
    category: "Finance",
    source: "spending-plans",
    view: "table",
    columns: ["clientName", "budgetName", "component", "cadence", "totalCost", "status"],
    kanbanField: "status",
  },
  {
    id: "staff-directory",
    name: "Staff directory",
    description: "Your team with role, department and employment type.",
    icon: "🧑‍💼",
    iconColor: "#9F7AEA",
    category: "People & HR",
    source: "staff",
    view: "table",
    columns: ["role", "department", "employmentType", "status"],
    kanbanField: "status",
  },
  {
    id: "document-register",
    name: "Document register",
    description: "Documents with folder, type and expiry dates for compliance.",
    icon: "📁",
    iconColor: "#F6AD55",
    category: "Quality & compliance",
    source: "documents",
    view: "table",
    columns: ["folder", "mimeType", "validTo", "createdAt"],
    kanbanField: null,
  },
  {
    id: "reimbursement-tracker",
    name: "Reimbursement tracker",
    description: "Staff reimbursements grouped by their approval status.",
    icon: "💸",
    iconColor: "#3BA3F8",
    category: "Finance",
    source: "reimbursements",
    view: "kanban",
    columns: ["category", "createdByName", "amount", "dateIncurred"],
    kanbanField: "status",
  },
  {
    id: "timesheet-tracker",
    name: "Timesheet tracker",
    description: "Submitted timesheets grouped by status, with worker, date and hours.",
    icon: "⏱️",
    iconColor: "#3BA3F8",
    category: "Finance",
    source: "timesheets",
    view: "kanban",
    columns: ["submittedByName", "startDate", "workedHours", "travelClaims"],
    kanbanField: "status",
  },
  {
    id: "travel-claim-tracker",
    name: "Travel claim tracker",
    description: "Participant-travel claims grouped by status, with worker, date and distance.",
    icon: "🚗",
    iconColor: "#F6AD55",
    category: "Finance",
    source: "timesheets.travelClaims",
    view: "kanban",
    columns: ["submittedByName", "date", "distanceKm", "purpose"],
    kanbanField: "status",
  },
  // --- People & HR ---------------------------------------------------------
  {
    id: "staff-onboarding",
    name: "Staff onboarding",
    description: "Move new starters through onboarding stages by employment status.",
    icon: "🪪",
    iconColor: "#3BA3F8",
    category: "People & HR",
    source: "staff",
    view: "kanban",
    columns: ["role", "department", "employmentType", "startDate"],
    kanbanField: "status",
  },
  {
    id: "workforce-by-department",
    name: "Workforce by department",
    description: "Your whole team grouped by department with role and contract type.",
    icon: "🗂️",
    iconColor: "#9F7AEA",
    category: "People & HR",
    source: "staff",
    view: "kanban",
    columns: ["role", "employmentType", "status", "startDate"],
    kanbanField: "department",
  },
  // --- Service delivery ----------------------------------------------------
  {
    id: "shift-delivery-board",
    name: "Shift delivery board",
    description: "Roster shifts grouped by status with worker, participant and date.",
    icon: "🗓️",
    iconColor: "#3BA3F8",
    category: "Service delivery",
    source: "shifts",
    view: "kanban",
    columns: ["staffName", "clientName", "sessionType", "date"],
    kanbanField: "status",
  },
  {
    id: "progress-note-tracker",
    name: "Progress note tracker",
    description: "Track which delivered shifts still need a progress note recorded.",
    icon: "📝",
    iconColor: "#68D391",
    category: "Service delivery",
    source: "shifts",
    view: "table",
    columns: ["staffName", "clientName", "date", "hasNote"],
    kanbanField: "hasNote",
  },
  // --- Finance -------------------------------------------------------------
  {
    id: "invoice-tracker",
    name: "Invoice tracker",
    description: "Invoices grouped by status with participant, dates and total.",
    icon: "🧾",
    iconColor: "#68D391",
    category: "Finance",
    source: "invoices",
    view: "kanban",
    columns: ["clientName", "issueDate", "dueDate", "total"],
    kanbanField: "status",
  },
  // --- Quality & compliance ------------------------------------------------
  {
    id: "incident-investigations",
    name: "Incident investigations",
    description: "Open investigations grouped by their progress with reportability.",
    icon: "🔍",
    iconColor: "#F56565",
    category: "Quality & compliance",
    source: "incidents",
    view: "kanban",
    columns: ["category", "isReportable", "reportedByName", "incidentDate"],
    kanbanField: "investigationStatus",
  },
  {
    id: "reportable-incidents",
    name: "Reportable incidents",
    description: "Separate reportable incidents from the rest for NDIS oversight.",
    icon: "⚠️",
    iconColor: "#F6AD55",
    category: "Quality & compliance",
    source: "incidents",
    view: "kanban",
    columns: ["category", "incidentStatus", "reportedByName", "incidentDate"],
    kanbanField: "isReportable",
  },
  {
    id: "forms-register",
    name: "Forms & assessments",
    description: "Custom forms and assessments grouped by status for QA reviews.",
    icon: "📋",
    iconColor: "#9F7AEA",
    category: "Quality & compliance",
    source: "forms",
    view: "table",
    columns: ["status", "createdByName", "updatedAt", "fields"],
    kanbanField: "status",
  },
  {
    id: "document-compliance",
    name: "Document compliance",
    description: "Monitor document validity windows and expiries for compliance.",
    icon: "🛡️",
    iconColor: "#3BA3F8",
    category: "Quality & compliance",
    source: "documents",
    view: "table",
    columns: ["folder", "mimeType", "validFrom", "validTo", "uploadedBy"],
    kanbanField: null,
  },
]

export function getListRecordIds(list: Pick<CustomList, "recordIds">): string[] {
  return list.recordIds ?? []
}

export function resolveListRecords(allRecords: unknown[], recordIds: string[] | null | undefined): unknown[] {
  const ids = new Set(recordIds ?? [])
  if (ids.size === 0) return []
  return allRecords.filter((record, index) => ids.has(getRecordId(record, index)))
}

export function formatListRecordCount(count: number, sourceKey: string): string {
  const source = getListSource(sourceKey)
  const noun = source?.noun ?? "records"
  const label = noun.charAt(0).toUpperCase() + noun.slice(1)
  return `${count} ${label}`
}

/** Label for add-record actions — e.g. "participants" or "participant". */
export function listAddRecordsNoun(sourceKey: string, singular = false): string {
  const noun = getListSource(sourceKey)?.noun ?? "records"
  if (!singular) return noun
  if (noun === "staff") return "staff member"
  if (noun.endsWith("ies")) return `${noun.slice(0, -3)}y`
  if (noun.endsWith("s")) return noun.slice(0, -1)
  return noun
}

export function getRecordId(record: unknown, index: number): string {
  if (record && typeof record === "object" && "id" in record) {
    const id = (record as { id?: unknown }).id
    if (typeof id === "string" && id) return id
  }
  return `row-${index}`
}
