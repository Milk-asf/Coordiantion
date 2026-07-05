import type { ComponentType } from "react"
import {
  AlertTriangle,
  AreaChart,
  BarChart3,
  CalendarClock,
  CalendarRange,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Hash,
  LineChart,
  PieChart,
  Plane,
  ReceiptText,
  Rows3,
  SquareCheck,
  Table2,
  TriangleAlert,
  User,
  Users,
  Wallet,
} from "lucide-react"
import { INCIDENT_CATEGORIES } from "@/lib/incident-definitions"
import type {
  Budget,
  BudgetReleasePeriod,
  Client,
  Document,
  Incident,
  Invoice,
  InvoiceLineItem,
  Reimbursement,
  StaffMember,
  Task,
} from "@/lib/types"
import type { Timesheet, TravelClaim } from "@/lib/timesheets/types"
import type { RosterShift } from "@/lib/roster/types"
import type { Form } from "@/lib/form-definitions"
import { getFormProcess } from "@/lib/form-definitions"
import {
  countAnswerFields,
  flattenFormAnswerRecords,
  type FormAnswerRecord,
  type FormSubmissionRecord,
} from "./form-submissions"
import {
  DOCUMENT_EXPIRY_LABELS,
  INCIDENT_CASE_STATE_LABELS,
  ROSTER_MATCH_LABELS,
  SCREENING_STATUS_LABELS,
  SHIFT_NOTE_STATUS_LABELS,
  getDocumentExpiryStatus,
  getIncidentCaseState,
  getScreeningStatus,
  getShiftNoteStatus,
  getTimesheetRosterMatch,
} from "./record-status"
import type { DateWindowKey, WidgetFilter } from "./scope"

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>

export type VisualizationType = "metric" | "bar" | "line" | "area" | "pie" | "donut" | "funnel" | "table" | "list"

export type AggregationType = "count" | "sum" | "avg" | "min" | "max"

export type DimensionKind = "category" | "date" | "boolean"

export type DateGrain = "day" | "week" | "month" | "quarter" | "year"

export type MeasureFormat = "number" | "currency" | "hours"

export type WidgetWidth = "third" | "half" | "full"

export type WidgetSort = "value-desc" | "value-asc" | "label-asc" | "label-desc"

/** Top-level data domains. Nested entities derive their records from one of these. */
export type AnalyticsDataSourceKey =
  | "shifts"
  | "incidents"
  | "tasks"
  | "timesheets"
  | "invoices"
  | "reimbursements"
  | "clients"
  | "staff"
  | "documents"
  | "forms"
  | "formSubmissions"

export type RootSourceData = Partial<Record<AnalyticsDataSourceKey, unknown[]>>

// ---------------------------------------------------------------------------
// Visualizations
// ---------------------------------------------------------------------------

export type VisualizationCategory = "single" | "records" | "comparison" | "trend" | "proportion"

export const VISUALIZATION_CATEGORY_ORDER: VisualizationCategory[] = ["single", "records", "comparison", "trend", "proportion"]

export const VISUALIZATION_CATEGORY_LABELS: Record<VisualizationCategory, string> = {
  single: "Single value",
  records: "Records",
  comparison: "Comparison",
  trend: "Trend over time",
  proportion: "Proportion",
}

export interface VisualizationMeta {
  type: VisualizationType
  label: string
  description: string
  category: VisualizationCategory
  icon: IconType
  needsGroup: boolean
  singleSeries: boolean
}

export const VISUALIZATIONS: VisualizationMeta[] = [
  { type: "metric", label: "Metric", description: "A single headline number", category: "single", icon: Hash, needsGroup: false, singleSeries: true },
  { type: "list", label: "Record list", description: "Drillable rows of matching records", category: "records", icon: Rows3, needsGroup: false, singleSeries: true },
  { type: "bar", label: "Bar", description: "Compare values across groups", category: "comparison", icon: BarChart3, needsGroup: true, singleSeries: false },
  { type: "table", label: "Table", description: "Rows of grouped values", category: "comparison", icon: Table2, needsGroup: true, singleSeries: false },
  { type: "line", label: "Line", description: "Track change over time", category: "trend", icon: LineChart, needsGroup: true, singleSeries: false },
  { type: "area", label: "Area", description: "Trend with filled volume", category: "trend", icon: AreaChart, needsGroup: true, singleSeries: false },
  { type: "pie", label: "Pie", description: "Share of a whole", category: "proportion", icon: PieChart, needsGroup: true, singleSeries: true },
  { type: "donut", label: "Donut", description: "Share with a centre total", category: "proportion", icon: PieChart, needsGroup: true, singleSeries: true },
  { type: "funnel", label: "Funnel", description: "Stage-by-stage drop-off", category: "proportion", icon: TriangleAlert, needsGroup: true, singleSeries: true },
]

const visualizationByType = VISUALIZATIONS.reduce<Record<VisualizationType, VisualizationMeta>>(
  (acc, meta) => {
    acc[meta.type] = meta
    return acc
  },
  {} as Record<VisualizationType, VisualizationMeta>,
)

export function getVisualization(type: VisualizationType): VisualizationMeta {
  return visualizationByType[type] ?? VISUALIZATIONS[0]
}

export const AGGREGATION_LABELS: Record<AggregationType, string> = {
  count: "Count of records",
  sum: "Sum of",
  avg: "Average of",
  min: "Minimum of",
  max: "Maximum of",
}

export const DATE_GRAIN_LABELS: Record<DateGrain, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
}

// ---------------------------------------------------------------------------
// Field accessors
// ---------------------------------------------------------------------------

export interface DimensionDef {
  key: string
  label: string
  kind: DimensionKind
  get: (record: unknown) => string | string[] | boolean | null
}

export interface MeasureDef {
  key: string
  label: string
  format: MeasureFormat
  get: (record: unknown) => number
}

/** A column in a record-list visualisation. */
export interface ListColumn {
  key: string
  label: string
  get: (record: unknown) => string
}

/** How an entity renders as a drillable record list. */
export interface ListMeta {
  columns: ListColumn[]
  /** In-app link for a row — jump straight to the record to fix it. */
  getHref?: (record: unknown) => string | null
  /** ISO date used to order rows. */
  getDate?: (record: unknown) => string | null
  /** "desc" = most recent first (default), "asc" = soonest deadline first. */
  dateSort?: "asc" | "desc"
}

/**
 * A node in the data-source tree. Top-level entities (isRoot) are the root
 * domains; nested entities (e.g. Participants → Budgets → Budget periods)
 * derive their records by flattening the root domain's records.
 */
export interface DataEntity {
  key: string
  label: string
  noun: string
  icon: IconType
  isRoot: boolean
  /** Which root domain array this entity is derived from. */
  rootKey: AnalyticsDataSourceKey
  /**
   * Flattens the root array into this entity's records. Receives the full
   * source data so entities can join across domains (e.g. timesheets pull in
   * their rostered shift to compute the roster match).
   */
  getRecords: (rootRecords: unknown[], data: RootSourceData) => unknown[]
  dimensions: DimensionDef[]
  measures: MeasureDef[]
  defaultGroupBy: string
  children?: DataEntity[]
  list?: ListMeta
}

const INCIDENT_CATEGORY_LABEL = INCIDENT_CATEGORIES.reduce<Record<string, string>>((acc, category) => {
  acc[category.value] = category.label
  return acc
}, {})

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = (start ?? "").split(":").map(Number)
  const [eh, em] = (end ?? "").split(":").map(Number)
  if ([sh, sm, eh, em].some((value) => Number.isNaN(value))) return 0
  let minutes = eh * 60 + em - (sh * 60 + sm)
  if (minutes < 0) minutes += 24 * 60
  return minutes
}

function dim<T>(key: string, label: string, kind: DimensionKind, get: (record: T) => string | string[] | boolean | null): DimensionDef {
  return { key, label, kind, get: (record) => get(record as T) }
}

function measure<T>(key: string, label: string, format: MeasureFormat, get: (record: T) => number): MeasureDef {
  return { key, label, format, get: (record) => get(record as T) }
}

function col<T>(key: string, label: string, get: (record: T) => string): ListColumn {
  return { key, label, get: (record) => get(record as T) }
}

const LIST_DATE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatListDate(value: string | null | undefined): string {
  if (!value) return "—"
  const date = value.length <= 10 ? new Date(`${value}T00:00:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return `${date.getDate()} ${LIST_DATE_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function sentenceCase(value: string): string {
  if (!value) return "—"
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/[-_]/g, " ")
}

const FILE_TYPE_LABELS: [RegExp, string][] = [
  [/pdf/, "PDF"],
  [/image\//, "Image"],
  [/wordprocessing|msword/, "Word"],
  [/spreadsheet|excel|csv/, "Spreadsheet"],
  [/presentation|powerpoint/, "Presentation"],
  [/video\//, "Video"],
  [/audio\//, "Audio"],
  [/text\//, "Text"],
]

function fileTypeLabel(mimeType: string, name: string): string {
  for (const [pattern, label] of FILE_TYPE_LABELS) {
    if (pattern.test(mimeType || "")) return label
  }
  const ext = name.includes(".") ? name.split(".").pop() : ""
  return ext ? ext.toUpperCase() : "File"
}

const CLIENT_STATUS_LABEL: Record<string, string> = { active: "Active", archived: "Archived" }
const FUNDING_LABEL: Record<string, string> = {
  "plan-managed": "Plan managed",
  "ndia-managed": "NDIA managed",
  "self-managed": "Self managed",
  "": "Unspecified",
}
const FUNDING_COMPONENT_LABEL: Record<string, string> = {
  core: "Core",
  "capacity-building": "Capacity building",
  capital: "Capital",
}

// Composite records produced when drilling into nested objects.
/**
 * Timesheet joined to its rostered shift so reports can compare the two.
 * Carries the timesheet's id so generic record identity (list membership,
 * row keys) keeps working on the joined shape.
 */
export interface TimesheetAnalyticsRecord {
  id: string
  timesheet: Timesheet
  shift: RosterShift | null
}

/**
 * Coerces either record shape — joined ({timesheet, shift}) or a raw
 * Timesheet — so consumers that still feed raw arrays (e.g. lists) never
 * crash on the timesheet dimensions.
 */
export function asTimesheetRecord(record: unknown): TimesheetAnalyticsRecord {
  if (record && typeof record === "object" && "timesheet" in record) {
    return record as TimesheetAnalyticsRecord
  }
  const timesheet = record as Timesheet
  return { id: timesheet?.id ?? "", timesheet, shift: null }
}
interface BudgetRecord {
  budget: Budget
  client: Client
}
interface BudgetPeriodRecord {
  period: BudgetReleasePeriod
  budget: Budget
  client: Client
}
interface TravelClaimRecord {
  claim: TravelClaim
  timesheet: Timesheet
}
interface InvoiceLineRecord {
  item: InvoiceLineItem
  invoice: Invoice
}

// --- Nested entities --------------------------------------------------------

const budgetPeriodsEntity: DataEntity = {
  key: "clients.budgets.periods",
  label: "Budget periods",
  noun: "budget periods",
  icon: CalendarClock,
  isRoot: false,
  rootKey: "clients",
  getRecords: (clients) =>
    (clients as Client[]).flatMap((client) =>
      (client.participant?.budgets ?? []).flatMap((budget) =>
        (budget.releasePeriods ?? []).map<BudgetPeriodRecord>((period) => ({ period, budget, client })),
      ),
    ),
  defaultGroupBy: "budget",
  dimensions: [
    dim<BudgetPeriodRecord>("budget", "Budget", "category", (r) => r.budget.name || r.budget.supportCategoryLabel || "Budget"),
    dim<BudgetPeriodRecord>("period", "Period", "category", (r) => `Period ${r.period.periodNumber}`),
    dim<BudgetPeriodRecord>("fundingComponent", "Funding component", "category", (r) => FUNDING_COMPONENT_LABEL[r.budget.fundingComponent ?? ""] || "Unspecified"),
    dim<BudgetPeriodRecord>("client", "Participant", "category", (r) => r.client.name || "—"),
    dim<BudgetPeriodRecord>("startDate", "Period start", "date", (r) => r.period.startDate || null),
  ],
  measures: [
    measure<BudgetPeriodRecord>("allocatedAmount", "Released amount", "currency", (r) => r.period.allocatedAmount || 0),
  ],
}

const budgetsEntity: DataEntity = {
  key: "clients.budgets",
  label: "Budgets",
  noun: "budgets",
  icon: Wallet,
  isRoot: false,
  rootKey: "clients",
  getRecords: (clients) =>
    (clients as Client[]).flatMap((client) =>
      (client.participant?.budgets ?? []).map<BudgetRecord>((budget) => ({ budget, client })),
    ),
  defaultGroupBy: "fundingComponent",
  dimensions: [
    dim<BudgetRecord>("fundingComponent", "Funding component", "category", (r) => FUNDING_COMPONENT_LABEL[r.budget.fundingComponent ?? ""] || "Unspecified"),
    dim<BudgetRecord>("supportCategory", "Support category", "category", (r) => r.budget.supportCategoryLabel || "—"),
    dim<BudgetRecord>("releaseCadence", "Release cadence", "category", (r) => r.budget.releaseCadence || "—"),
    dim<BudgetRecord>("client", "Participant", "category", (r) => r.client.name || "—"),
    dim<BudgetRecord>("clientStatus", "Participant status", "category", (r) => CLIENT_STATUS_LABEL[r.client.status] || r.client.status),
    dim<BudgetRecord>("startDate", "Start date", "date", (r) => r.budget.startDate || null),
  ],
  measures: [
    measure<BudgetRecord>("allocatedAmount", "Allocated amount", "currency", (r) => r.budget.allocatedAmount || 0),
    measure<BudgetRecord>("periods", "Budget periods", "number", (r) => r.budget.releasePeriods?.length ?? 0),
    measure<BudgetRecord>("lineItems", "Line items", "number", (r) => r.budget.lineItems?.length ?? 0),
  ],
  children: [budgetPeriodsEntity],
}

const travelClaimsEntity: DataEntity = {
  key: "timesheets.travelClaims",
  label: "Travel claims",
  noun: "travel claims",
  icon: Plane,
  isRoot: false,
  rootKey: "timesheets",
  getRecords: (timesheets) =>
    (timesheets as Timesheet[]).flatMap((timesheet) =>
      (timesheet.travelClaims ?? []).map<TravelClaimRecord>((claim) => ({ claim, timesheet })),
    ),
  defaultGroupBy: "status",
  dimensions: [
    dim<TravelClaimRecord>("status", "Status", "category", (r) => r.claim.status),
    dim<TravelClaimRecord>("purpose", "Purpose", "category", (r) => r.claim.purpose || "—"),
    dim<TravelClaimRecord>("submittedByName", "Submitted by", "category", (r) => r.timesheet.submittedByName || "—"),
    dim<TravelClaimRecord>("date", "Date", "date", (r) => r.timesheet.startDate || null),
  ],
  measures: [
    measure<TravelClaimRecord>("distanceKm", "Distance (km)", "number", (r) => r.claim.distanceKm || 0),
  ],
}

const invoiceLineItemsEntity: DataEntity = {
  key: "invoices.lineItems",
  label: "Line items",
  noun: "line items",
  icon: ReceiptText,
  isRoot: false,
  rootKey: "invoices",
  getRecords: (invoices) =>
    (invoices as Invoice[]).flatMap((invoice) =>
      (invoice.lineItems ?? []).map<InvoiceLineRecord>((item) => ({ item, invoice })),
    ),
  defaultGroupBy: "chargeName",
  dimensions: [
    dim<InvoiceLineRecord>("chargeName", "Charge", "category", (r) => r.item.chargeName || r.item.description || "—"),
    dim<InvoiceLineRecord>("unit", "Unit", "category", (r) => r.item.unit || "—"),
    dim<InvoiceLineRecord>("invoiceStatus", "Invoice status", "category", (r) => r.invoice.status),
    dim<InvoiceLineRecord>("client", "Participant", "category", (r) => r.invoice.clientName || "—"),
    dim<InvoiceLineRecord>("serviceDate", "Service date", "date", (r) => r.item.serviceDate || r.invoice.issueDate || null),
  ],
  measures: [
    measure<InvoiceLineRecord>("amount", "Amount", "currency", (r) => r.item.amount || 0),
    measure<InvoiceLineRecord>("quantity", "Quantity", "number", (r) => r.item.quantity || 0),
  ],
}

const formAnswersEntity: DataEntity = {
  key: "formSubmissions.answers",
  label: "Form answers",
  noun: "answers",
  icon: ClipboardList,
  isRoot: false,
  rootKey: "formSubmissions",
  getRecords: (records) => flattenFormAnswerRecords(records as FormSubmissionRecord[]),
  defaultGroupBy: "answer",
  dimensions: [
    dim<FormAnswerRecord>("formName", "Form", "category", (r) => r.formName),
    dim<FormAnswerRecord>("fieldLabel", "Field", "category", (r) => r.fieldLabel),
    dim<FormAnswerRecord>("fieldType", "Field type", "category", (r) => r.fieldType),
    dim<FormAnswerRecord>("answer", "Answer", "category", (r) => r.answer),
    dim<FormAnswerRecord>("submittedByName", "Submitted by", "category", (r) => r.submittedByName),
    dim<FormAnswerRecord>("submittedAt", "Submitted", "date", (r) => r.submittedAt || null),
  ],
  measures: [],
}

// --- Root entities ----------------------------------------------------------

const identity = (records: unknown[]) => records

export const DATA_SOURCES: DataEntity[] = [
  {
    key: "shifts",
    label: "Roster shifts",
    noun: "shifts",
    icon: CalendarRange,
    isRoot: true,
    rootKey: "shifts",
    getRecords: identity,
    defaultGroupBy: "status",
    dimensions: [
      dim<RosterShift>("status", "Status", "category", (r) => r.status),
      dim<RosterShift>("staffName", "Support worker", "category", (r) => r.staffName || "Unassigned"),
      dim<RosterShift>("clientName", "Participant", "category", (r) => r.clientName || "—"),
      dim<RosterShift>("sessionType", "Session type", "category", (r) => r.sessionType || "—"),
      dim<RosterShift>("location", "Location", "category", (r) => r.location || "—"),
      dim<RosterShift>("hasNote", "Has progress note", "boolean", (r) => Boolean(r.progressNote)),
      dim<RosterShift>("noteStatus", "Progress note status", "category", (r) => SHIFT_NOTE_STATUS_LABELS[getShiftNoteStatus(r)]),
      dim<RosterShift>("date", "Shift date", "date", (r) => r.date || null),
    ],
    measures: [
      measure<RosterShift>("duration", "Shift hours", "hours", (r) => minutesBetween(r.startTime, r.endTime) / 60),
    ],
    list: {
      columns: [
        col<RosterShift>("date", "Date", (r) => formatListDate(r.date)),
        col<RosterShift>("time", "Time", (r) => `${r.startTime}–${r.endTime}`),
        col<RosterShift>("staff", "Support worker", (r) => r.staffName || "Unassigned"),
        col<RosterShift>("client", "Participant", (r) => r.clientName || "—"),
        col<RosterShift>("status", "Status", (r) => sentenceCase(r.status)),
        col<RosterShift>("note", "Progress note", (r) => SHIFT_NOTE_STATUS_LABELS[getShiftNoteStatus(r)]),
      ],
      getHref: (r) => `/roster?date=${(r as RosterShift).date}`,
      getDate: (r) => (r as RosterShift).date || null,
    },
  },
  {
    key: "incidents",
    label: "Incidents",
    noun: "incidents",
    icon: AlertTriangle,
    isRoot: true,
    rootKey: "incidents",
    getRecords: identity,
    defaultGroupBy: "category",
    dimensions: [
      dim<Incident>("incidentStatus", "Status", "category", (r) => r.incidentStatus),
      dim<Incident>("investigationStatus", "Investigation", "category", (r) => r.investigationStatus || "—"),
      dim<Incident>("caseState", "Case state", "category", (r) => INCIDENT_CASE_STATE_LABELS[getIncidentCaseState(r.investigationStatus)]),
      dim<Incident>("category", "Category", "category", (r) => INCIDENT_CATEGORY_LABEL[r.category] || r.category || "Other"),
      dim<Incident>("isReportable", "Reportable", "boolean", (r) => r.isReportable),
      dim<Incident>("commissionNotified", "Commission notified", "boolean", (r) => Boolean(r.commissionAdvisedAt)),
      dim<Incident>("reportedByName", "Reported by", "category", (r) => r.reportedByName || "—"),
      dim<Incident>("location", "Location", "category", (r) => r.location || "—"),
      dim<Incident>("incidentDate", "Incident date", "date", (r) => r.incidentDate || null),
    ],
    measures: [
      measure<Incident>("attachments", "Attachments", "number", (r) => r.attachments?.length ?? 0),
    ],
    list: {
      columns: [
        col<Incident>("number", "Incident", (r) => r.incidentNumber || "—"),
        col<Incident>("date", "Date", (r) => formatListDate(r.incidentDate)),
        col<Incident>("category", "Category", (r) => INCIDENT_CATEGORY_LABEL[r.category] || r.category || "Other"),
        col<Incident>("clients", "Participants", (r) => r.clientNames || "—"),
        col<Incident>("state", "Case state", (r) => INCIDENT_CASE_STATE_LABELS[getIncidentCaseState(r.investigationStatus)]),
        col<Incident>("reportable", "Reportable", (r) => (r.isReportable ? (r.commissionAdvisedAt ? "Yes — notified" : "Yes — not notified") : "No")),
      ],
      getHref: (r) => `/incidents/${(r as Incident).id}`,
      getDate: (r) => (r as Incident).incidentDate || null,
    },
  },
  {
    key: "tasks",
    label: "Tasks",
    noun: "tasks",
    icon: SquareCheck,
    isRoot: true,
    rootKey: "tasks",
    getRecords: identity,
    defaultGroupBy: "status",
    dimensions: [
      dim<Task>("status", "Status", "category", (r) => r.status),
      dim<Task>("assignee", "Assignee", "category", (r) => r.assignee || "Unassigned"),
      dim<Task>("client", "Participant", "category", (r) => r.client || "—"),
      dim<Task>("chargeType", "Charge type", "category", (r) => r.chargeType || "—"),
      dim<Task>("dueDate", "Due date", "date", (r) => r.dueDate || null),
    ],
    measures: [
      measure<Task>("timeSpent", "Time spent (min)", "number", (r) => (r.timeSpent || 0) + (r.secondaryTimeSpent || 0)),
    ],
  },
  {
    key: "timesheets",
    label: "Timesheets",
    noun: "timesheets",
    icon: CalendarRange,
    isRoot: true,
    rootKey: "timesheets",
    // Join each timesheet to its rostered shift so reports can compare them.
    getRecords: (timesheets, data) => {
      const shiftById = new Map(((data.shifts ?? []) as RosterShift[]).map((shift) => [shift.id, shift]))
      return (timesheets as Timesheet[]).map<TimesheetAnalyticsRecord>((timesheet) => ({
        id: timesheet.id,
        timesheet,
        shift: timesheet.shiftId ? shiftById.get(timesheet.shiftId) ?? null : null,
      }))
    },
    defaultGroupBy: "status",
    dimensions: [
      dim<unknown>("status", "Status", "category", (r) => asTimesheetRecord(r).timesheet.status),
      dim<unknown>("submittedByName", "Submitted by", "category", (r) => asTimesheetRecord(r).timesheet.submittedByName || "—"),
      dim<unknown>("rosterMatch", "Roster match", "category", (r) => {
        const record = asTimesheetRecord(r)
        return ROSTER_MATCH_LABELS[getTimesheetRosterMatch(record.timesheet, record.shift)]
      }),
      dim<unknown>("clientName", "Participant", "category", (r) => asTimesheetRecord(r).shift?.clientName || "—"),
      dim<unknown>("startDate", "Shift date", "date", (r) => asTimesheetRecord(r).timesheet.startDate || null),
    ],
    measures: [
      measure<unknown>("workedHours", "Worked hours", "hours", (r) => (asTimesheetRecord(r).timesheet.workedMinutes || 0) / 60),
      measure<unknown>("breakMinutes", "Break (min)", "number", (r) => asTimesheetRecord(r).timesheet.breakMinutes || 0),
      measure<unknown>("travelClaims", "Travel claims", "number", (r) => asTimesheetRecord(r).timesheet.travelClaims?.length ?? 0),
    ],
    children: [travelClaimsEntity],
    list: {
      columns: [
        col<unknown>("date", "Date", (r) => formatListDate(asTimesheetRecord(r).timesheet.startDate)),
        col<unknown>("staff", "Submitted by", (r) => asTimesheetRecord(r).timesheet.submittedByName || "—"),
        col<unknown>("client", "Participant", (r) => asTimesheetRecord(r).shift?.clientName || "—"),
        col<unknown>("hours", "Worked", (r) => `${(Math.round(((asTimesheetRecord(r).timesheet.workedMinutes || 0) / 60) * 10) / 10).toLocaleString("en-AU")}h`),
        col<unknown>("status", "Status", (r) => sentenceCase(asTimesheetRecord(r).timesheet.status)),
        col<unknown>("match", "Roster match", (r) => {
          const record = asTimesheetRecord(r)
          return ROSTER_MATCH_LABELS[getTimesheetRosterMatch(record.timesheet, record.shift)]
        }),
      ],
      getHref: () => "/timesheets",
      getDate: (r) => asTimesheetRecord(r).timesheet.startDate || null,
    },
  },
  {
    key: "invoices",
    label: "Invoices",
    noun: "invoices",
    icon: ReceiptText,
    isRoot: true,
    rootKey: "invoices",
    getRecords: identity,
    defaultGroupBy: "status",
    dimensions: [
      dim<Invoice>("status", "Status", "category", (r) => r.status),
      dim<Invoice>("kind", "Type", "category", (r) => (r.kind === "credit-note" ? "Credit note" : "Invoice")),
      dim<Invoice>("clientName", "Participant", "category", (r) => r.clientName || "—"),
      dim<Invoice>("issueDate", "Issue date", "date", (r) => r.issueDate || null),
      dim<Invoice>("dueDate", "Due date", "date", (r) => r.dueDate || null),
    ],
    measures: [
      measure<Invoice>("total", "Total", "currency", (r) => r.total || 0),
      measure<Invoice>("subtotal", "Subtotal", "currency", (r) => r.subtotal || 0),
      measure<Invoice>("gst", "GST", "currency", (r) => r.gst || 0),
    ],
    children: [invoiceLineItemsEntity],
  },
  {
    key: "reimbursements",
    label: "Reimbursements",
    noun: "reimbursements",
    icon: CircleDollarSign,
    isRoot: true,
    rootKey: "reimbursements",
    getRecords: identity,
    defaultGroupBy: "status",
    dimensions: [
      dim<Reimbursement>("status", "Status", "category", (r) => r.status),
      dim<Reimbursement>("category", "Category", "category", (r) => r.category || "other"),
      dim<Reimbursement>("createdByName", "Submitted by", "category", (r) => r.createdByName || "—"),
      dim<Reimbursement>("paid", "Paid", "boolean", (r) => Boolean(r.paidAt)),
      dim<Reimbursement>("dateIncurred", "Date incurred", "date", (r) => r.dateIncurred || null),
    ],
    measures: [
      measure<Reimbursement>("amount", "Amount", "currency", (r) => r.amount || 0),
    ],
  },
  {
    key: "clients",
    label: "Participants",
    noun: "participants",
    icon: User,
    isRoot: true,
    rootKey: "clients",
    getRecords: identity,
    defaultGroupBy: "status",
    dimensions: [
      dim<Client>("status", "Status", "category", (r) => CLIENT_STATUS_LABEL[r.status] || r.status),
      dim<Client>("fundingType", "Funding type", "category", (r) => FUNDING_LABEL[r.participant?.fundingType ?? ""] || "Unspecified"),
      dim<Client>("language", "Language", "category", (r) => r.participant?.language || "—"),
      dim<Client>("gender", "Gender", "category", (r) => r.participant?.gender || "—"),
      dim<Client>("owner", "Coordinator", "category", (r) => r.owner || "—"),
      dim<Client>("planEndDate", "Plan end date", "date", (r) => r.participant?.planEndDate || null),
    ],
    measures: [
      measure<Client>("budgets", "Budgets", "number", (r) => r.participant?.budgets?.length ?? 0),
      measure<Client>("goals", "Goals", "number", (r) => r.participant?.goals?.length ?? 0),
    ],
    children: [budgetsEntity],
    list: {
      columns: [
        col<Client>("name", "Participant", (r) => r.name || "—"),
        col<Client>("funding", "Funding type", (r) => FUNDING_LABEL[r.participant?.fundingType ?? ""] || "Unspecified"),
        col<Client>("owner", "Coordinator", (r) => r.owner || "—"),
        col<Client>("planEnd", "Plan ends", (r) => formatListDate(r.participant?.planEndDate)),
        col<Client>("status", "Status", (r) => CLIENT_STATUS_LABEL[r.status] || r.status),
      ],
      getHref: (r) => `/clients/${(r as Client).id}`,
      getDate: (r) => (r as Client).participant?.planEndDate || null,
      dateSort: "asc",
    },
  },
  {
    key: "staff",
    label: "Staff",
    noun: "staff",
    icon: Users,
    isRoot: true,
    rootKey: "staff",
    getRecords: identity,
    defaultGroupBy: "status",
    dimensions: [
      dim<StaffMember>("status", "Status", "category", (r) => r.status),
      dim<StaffMember>("role", "Role", "category", (r) => r.details?.role || "—"),
      dim<StaffMember>("department", "Department", "category", (r) => r.details?.department || "—"),
      dim<StaffMember>("employmentType", "Employment type", "category", (r) => r.details?.employmentType || "—"),
      dim<StaffMember>("screeningStatus", "Screening status", "category", (r) => SCREENING_STATUS_LABELS[getScreeningStatus(r.details?.ndisScreeningExpiry)]),
      dim<StaffMember>("startDate", "Start date", "date", (r) => r.details?.startDate || null),
      dim<StaffMember>("screeningExpiry", "Screening expiry", "date", (r) => r.details?.ndisScreeningExpiry || null),
    ],
    measures: [],
    list: {
      columns: [
        col<StaffMember>("name", "Staff member", (r) => r.name || "—"),
        col<StaffMember>("role", "Role", (r) => r.details?.role || "—"),
        col<StaffMember>("screeningExpiry", "Screening expires", (r) => formatListDate(r.details?.ndisScreeningExpiry)),
        col<StaffMember>("screening", "Screening", (r) => SCREENING_STATUS_LABELS[getScreeningStatus(r.details?.ndisScreeningExpiry)]),
        col<StaffMember>("status", "Status", (r) => sentenceCase(r.status)),
      ],
      getHref: (r) => `/staff/${(r as StaffMember).id}`,
      getDate: (r) => (r as StaffMember).details?.ndisScreeningExpiry || null,
      dateSort: "asc",
    },
  },
  {
    key: "documents",
    label: "Documents",
    noun: "documents",
    icon: FileText,
    isRoot: true,
    rootKey: "documents",
    getRecords: identity,
    defaultGroupBy: "expiryStatus",
    dimensions: [
      dim<Document>("expiryStatus", "Expiry status", "category", (r) => DOCUMENT_EXPIRY_LABELS[getDocumentExpiryStatus(r.validTo)]),
      dim<Document>("folder", "Folder", "category", (r) => r.folder || "Ungrouped"),
      dim<Document>("fileType", "File type", "category", (r) => fileTypeLabel(r.mimeType, r.name)),
      dim<Document>("validTo", "Expiry date", "date", (r) => r.validTo || null),
      dim<Document>("validFrom", "Valid from", "date", (r) => r.validFrom || null),
      dim<Document>("createdAt", "Uploaded", "date", (r) => r.createdAt || null),
    ],
    measures: [
      measure<Document>("sizeMb", "Size (MB)", "number", (r) => (r.size || 0) / (1024 * 1024)),
    ],
    list: {
      columns: [
        col<Document>("name", "Document", (r) => r.name || "—"),
        col<Document>("folder", "Folder", (r) => r.folder || "Ungrouped"),
        col<Document>("type", "Type", (r) => fileTypeLabel(r.mimeType, r.name)),
        col<Document>("validTo", "Expires", (r) => (r.validTo ? formatListDate(r.validTo) : "No expiry")),
        col<Document>("status", "Status", (r) => DOCUMENT_EXPIRY_LABELS[getDocumentExpiryStatus(r.validTo)]),
      ],
      getHref: () => "/documents",
      getDate: (r) => (r as Document).validTo || null,
      dateSort: "asc",
    },
  },
  {
    key: "forms",
    label: "Forms",
    noun: "forms",
    icon: ClipboardList,
    isRoot: true,
    rootKey: "forms",
    getRecords: identity,
    defaultGroupBy: "status",
    dimensions: [
      dim<Form>("status", "Status", "category", (r) => r.status),
      dim<Form>("connectedProcess", "Connected process", "category", (r) => {
        const key = r.settings.connectedProcess
        if (!key) return "Standalone"
        return getFormProcess(key)?.label ?? key
      }),
      dim<Form>("createdByName", "Created by", "category", (r) => r.createdByName || "—"),
      dim<Form>("archived", "Archived", "boolean", (r) => r.archived),
      dim<Form>("isIncidentForm", "Incident form", "boolean", (r) => r.isIncidentForm),
      dim<Form>("createdAt", "Created", "date", (r) => r.createdAt || null),
      dim<Form>("publishedAt", "Published", "date", (r) => r.publishedAt || null),
    ],
    measures: [
      measure<Form>("fields", "Fields", "number", (r) => countAnswerFields(r)),
    ],
  },
  {
    key: "formSubmissions",
    label: "Form submissions",
    noun: "submissions",
    icon: ClipboardList,
    isRoot: true,
    rootKey: "formSubmissions",
    getRecords: identity,
    defaultGroupBy: "formName",
    dimensions: [
      dim<FormSubmissionRecord>("formName", "Form", "category", (r) => r.formName),
      dim<FormSubmissionRecord>("formStatus", "Form status", "category", (r) => r.formStatus),
      dim<FormSubmissionRecord>("connectedProcess", "Connected process", "category", (r) => r.connectedProcess),
      dim<FormSubmissionRecord>("submittedByName", "Submitted by", "category", (r) => r.submittedByName),
      dim<FormSubmissionRecord>("submittedAt", "Submitted", "date", (r) => r.submittedAt || null),
    ],
    measures: [],
    children: [formAnswersEntity],
    list: {
      columns: [
        col<FormSubmissionRecord>("form", "Form", (r) => r.formName),
        col<FormSubmissionRecord>("submittedBy", "Submitted by", (r) => r.submittedByName),
        col<FormSubmissionRecord>("process", "Process", (r) => r.connectedProcess),
        col<FormSubmissionRecord>("submittedAt", "Submitted", (r) => formatListDate(r.submittedAt)),
      ],
      getHref: () => "/forms",
      getDate: (r) => (r as FormSubmissionRecord).submittedAt || null,
    },
  },
]

const entityByKey = new Map<string, DataEntity>()
const entityParent = new Map<string, DataEntity | null>()

function indexEntity(entity: DataEntity, parent: DataEntity | null) {
  entityByKey.set(entity.key, entity)
  entityParent.set(entity.key, parent)
  entity.children?.forEach((child) => indexEntity(child, entity))
}
DATA_SOURCES.forEach((root) => indexEntity(root, null))

export function getDataSource(key: string): DataEntity {
  return entityByKey.get(key) ?? DATA_SOURCES[0]
}

/** Breadcrumb from root to the entity (inclusive). */
export function getEntityPath(key: string): DataEntity[] {
  const path: DataEntity[] = []
  let current: DataEntity | null = entityByKey.get(key) ?? null
  while (current) {
    path.unshift(current)
    current = entityParent.get(current.key) ?? null
  }
  return path
}

export function resolveEntityRecords(key: string, rootData: RootSourceData): unknown[] {
  const entity = getDataSource(key)
  return entity.getRecords(rootData[entity.rootKey] ?? [], rootData)
}

/**
 * List rendering metadata for an entity. Entities without curated columns
 * fall back to their first few dimensions so every source can render a list.
 */
export function getListMeta(entity: DataEntity): ListMeta {
  if (entity.list) return entity.list
  const columns = entity.dimensions.slice(0, 4).map<ListColumn>((dimension) => ({
    key: dimension.key,
    label: dimension.label,
    get: (record) => {
      const raw = dimension.get(record)
      if (raw === null || raw === undefined || raw === "") return "—"
      if (typeof raw === "boolean") return raw ? "Yes" : "No"
      if (Array.isArray(raw)) return raw.join(", ") || "—"
      if (dimension.kind === "date") return formatListDate(String(raw))
      return String(raw)
    },
  }))
  const dateDim = entity.dimensions.find((dimension) => dimension.kind === "date")
  return {
    columns,
    getDate: dateDim
      ? (record) => {
          const raw = dateDim.get(record)
          return typeof raw === "string" ? raw : null
        }
      : undefined,
  }
}

export function getDimension(source: DataEntity, key: string | null): DimensionDef | null {
  if (!key) return null
  return source.dimensions.find((d) => d.key === key) ?? null
}

export function getMeasure(source: DataEntity, key: string | null): MeasureDef | null {
  if (!key) return null
  return source.measures.find((m) => m.key === key) ?? null
}

// ---------------------------------------------------------------------------
// Widget + space model
// ---------------------------------------------------------------------------

export interface AnalyticsWidget {
  id: string
  title: string
  visualization: VisualizationType
  /** Entity key — a root domain or a nested object (e.g. "clients.budgets.periods"). */
  source: string
  aggregation: AggregationType
  measureField: string | null
  groupBy: string | null
  segmentBy: string | null
  dateGrain: DateGrain
  sort: WidgetSort
  limit: number
  width: WidgetWidth
  showLegend: boolean
  showValues: boolean
  /** Field filters — keep only records matching every filter. */
  filters: WidgetFilter[]
  /** Relative date window applied before computing (e.g. last 30 days). */
  dateWindow: DateWindowKey
  /** Date dimension the window applies to; null = the entity's first date field. */
  dateField: string | null
}

export interface AnalyticsSpace {
  id: string
  workspaceId: string
  name: string
  description: string
  icon: string
  iconColor: string
  widgets: AnalyticsWidget[]
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

/** Backfills fields added after a widget was saved (filters, date window). */
export function normalizeWidget(widget: AnalyticsWidget): AnalyticsWidget {
  return {
    ...widget,
    filters: Array.isArray(widget.filters) ? widget.filters : [],
    dateWindow: widget.dateWindow ?? "all",
    dateField: widget.dateField ?? null,
  }
}

export function createWidget(params?: Partial<AnalyticsWidget>): AnalyticsWidget {
  const source = params?.source ?? "shifts"
  const def = getDataSource(source)
  return {
    id: generateId("wgt"),
    title: params?.title ?? "Untitled report",
    visualization: params?.visualization ?? "bar",
    source: def.key,
    aggregation: params?.aggregation ?? "count",
    measureField: params?.measureField ?? null,
    groupBy: params?.groupBy ?? def.defaultGroupBy,
    segmentBy: params?.segmentBy ?? null,
    dateGrain: params?.dateGrain ?? "month",
    sort: params?.sort ?? "value-desc",
    limit: params?.limit ?? 8,
    width: params?.width ?? "third",
    showLegend: params?.showLegend ?? true,
    showValues: params?.showValues ?? true,
    filters: params?.filters ?? [],
    dateWindow: params?.dateWindow ?? "all",
    dateField: params?.dateField ?? null,
  }
}

export function createEmptySpace(params: {
  workspaceId: string
  createdBy: string
  createdByName: string
  name?: string
}): AnalyticsSpace {
  const now = new Date().toISOString()
  return {
    id: generateId("space"),
    workspaceId: params.workspaceId,
    name: params.name?.trim() || "Untitled space",
    description: "",
    icon: "📊",
    iconColor: "#3b82f6",
    widgets: [],
    createdBy: params.createdBy,
    createdByName: params.createdByName,
    createdAt: now,
    updatedAt: now,
  }
}

/** analytics_spaces insert payload — shared by the reports context and signup provisioning. */
export function spaceToInsertRow(space: AnalyticsSpace) {
  return {
    workspace_id: space.workspaceId,
    name: space.name,
    description: space.description,
    icon: space.icon,
    icon_color: space.iconColor,
    widgets: space.widgets,
    created_by_name: space.createdByName,
    created_at: space.createdAt,
    updated_at: space.updatedAt,
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface SpaceTemplate {
  id: string
  name: string
  description: string
  icon: string
  iconColor: string
  widgets: Partial<AnalyticsWidget>[]
}

/** Shorthand for template filters — id doubles as the dimension key. */
function tf(dimension: string, values: string[]): WidgetFilter {
  return { id: dimension, dimension, values }
}

/**
 * One-click, audit-ready compliance space. Every widget uses the universal
 * builder features (filters, computed statuses, date windows, record lists) —
 * nothing here is compliance-only code.
 */
export const NDIS_COMPLIANCE_TEMPLATE: SpaceTemplate = {
  id: "ndis-compliance",
  name: "NDIS compliance",
  description: "The gaps auditors look for: missing notes, worker screening, reportable incidents, timesheet mismatches and expiring documents.",
  icon: "🛡️",
  iconColor: "#16a34a",
  widgets: [
    // Headline metrics — the numbers that should be zero.
    { title: "Overdue progress notes", visualization: "metric", source: "shifts", aggregation: "count", width: "third", dateWindow: "last30", filters: [tf("noteStatus", ["Note overdue"])] },
    { title: "Screening issues — active staff", visualization: "metric", source: "staff", aggregation: "count", width: "third", filters: [tf("status", ["active"]), tf("screeningStatus", ["Expired", "Expiring soon", "Missing"])] },
    { title: "Open reportable incidents", visualization: "metric", source: "incidents", aggregation: "count", width: "third", filters: [tf("isReportable", ["yes"]), tf("caseState", ["Open"])] },
    { title: "Timesheets awaiting approval", visualization: "metric", source: "timesheets", aggregation: "count", width: "third", filters: [tf("status", ["sent"])] },
    { title: "Roster–timesheet mismatches", visualization: "metric", source: "timesheets", aggregation: "count", width: "third", dateWindow: "last30", filters: [tf("rosterMatch", ["Differs from roster"])] },
    { title: "Documents expired or expiring", visualization: "metric", source: "documents", aggregation: "count", width: "third", filters: [tf("expiryStatus", ["Expired", "Expiring soon"])] },
    // Health at a glance.
    { title: "Worker screening health", visualization: "donut", source: "staff", aggregation: "count", groupBy: "screeningStatus", width: "half", filters: [tf("status", ["active"])] },
    { title: "Progress notes — completed shifts (30 days)", visualization: "donut", source: "shifts", aggregation: "count", groupBy: "noteStatus", width: "half", dateWindow: "last30", filters: [tf("status", ["completed"])] },
    { title: "Commission notified — reportable incidents", visualization: "pie", source: "incidents", aggregation: "count", groupBy: "commissionNotified", width: "half", filters: [tf("isReportable", ["yes"])] },
    { title: "Incidents by week (90 days)", visualization: "line", source: "incidents", aggregation: "count", groupBy: "incidentDate", dateGrain: "week", width: "half", dateWindow: "last90" },
    // The actual records to fix — drillable lists.
    { title: "Shifts needing notes", visualization: "list", source: "shifts", width: "full", limit: 8, dateWindow: "last30", filters: [tf("noteStatus", ["Note due", "Note overdue"])] },
    { title: "Worker screening to chase", visualization: "list", source: "staff", width: "half", limit: 8, filters: [tf("status", ["active"]), tf("screeningStatus", ["Expired", "Expiring soon", "Missing"])] },
    { title: "Documents needing renewal", visualization: "list", source: "documents", width: "half", limit: 8, filters: [tf("expiryStatus", ["Expired", "Expiring soon"])] },
    { title: "Timesheets that don't match the roster", visualization: "list", source: "timesheets", width: "full", limit: 8, dateWindow: "last30", filters: [tf("rosterMatch", ["Differs from roster", "No linked shift"])] },
    // Complaints, onboarding and other governance forms.
    { title: "Form submissions by form (90 days)", visualization: "bar", source: "formSubmissions", aggregation: "count", groupBy: "formName", width: "half", dateWindow: "last90" },
    { title: "Form submissions over time", visualization: "line", source: "formSubmissions", aggregation: "count", groupBy: "submittedAt", dateGrain: "week", width: "half", dateWindow: "last90" },
  ],
}

export const SPACE_TEMPLATES: SpaceTemplate[] = [
  NDIS_COMPLIANCE_TEMPLATE,
  {
    id: "service-delivery",
    name: "Service delivery overview",
    description: "Shifts delivered, hours by worker, and progress-note completion at a glance.",
    icon: "🗓️",
    iconColor: "#3BA3F8",
    widgets: [
      { title: "Total shifts", visualization: "metric", source: "shifts", aggregation: "count", width: "third" },
      { title: "Shift hours", visualization: "metric", source: "shifts", aggregation: "sum", measureField: "duration", width: "third" },
      { title: "Shifts by status", visualization: "donut", source: "shifts", aggregation: "count", groupBy: "status", width: "third" },
      { title: "Hours by support worker", visualization: "bar", source: "shifts", aggregation: "sum", measureField: "duration", groupBy: "staffName", width: "half" },
      { title: "Progress notes recorded", visualization: "pie", source: "shifts", aggregation: "count", groupBy: "hasNote", width: "half" },
    ],
  },
  {
    id: "incident-insights",
    name: "Incident insights",
    description: "Track incidents by category, status and reportability for compliance.",
    icon: "🚨",
    iconColor: "#D6569B",
    widgets: [
      { title: "Open incidents", visualization: "metric", source: "incidents", aggregation: "count", width: "third" },
      { title: "Incidents by category", visualization: "bar", source: "incidents", aggregation: "count", groupBy: "category", width: "full" },
      { title: "By status", visualization: "donut", source: "incidents", aggregation: "count", groupBy: "incidentStatus", width: "half" },
      { title: "Reportable vs not", visualization: "pie", source: "incidents", aggregation: "count", groupBy: "isReportable", width: "half" },
    ],
  },
  {
    id: "finance-snapshot",
    name: "Finance snapshot",
    description: "Invoiced totals, budgets by funding component and amounts by status.",
    icon: "💰",
    iconColor: "#68D391",
    widgets: [
      { title: "Invoiced total", visualization: "metric", source: "invoices", aggregation: "sum", measureField: "total", width: "third" },
      { title: "Reimbursements", visualization: "metric", source: "reimbursements", aggregation: "sum", measureField: "amount", width: "third" },
      { title: "Invoices by status", visualization: "donut", source: "invoices", aggregation: "count", groupBy: "status", width: "third" },
      { title: "Allocated budget by component", visualization: "bar", source: "clients.budgets", aggregation: "sum", measureField: "allocatedAmount", groupBy: "fundingComponent", width: "full" },
    ],
  },
  {
    id: "form-responses",
    name: "Form responses",
    description: "Submission volume, trends over time, and breakdowns by form and field answers.",
    icon: "📋",
    iconColor: "#8B5CF6",
    widgets: [
      { title: "Total submissions", visualization: "metric", source: "formSubmissions", aggregation: "count", width: "third" },
      { title: "Forms by status", visualization: "donut", source: "forms", aggregation: "count", groupBy: "status", width: "third" },
      { title: "Submissions by form", visualization: "donut", source: "formSubmissions", aggregation: "count", groupBy: "formName", width: "third" },
      { title: "Submissions over time", visualization: "line", source: "formSubmissions", aggregation: "count", groupBy: "submittedAt", width: "half" },
      { title: "By submitter", visualization: "bar", source: "formSubmissions", aggregation: "count", groupBy: "submittedByName", width: "half" },
      { title: "Answers by field", visualization: "bar", source: "formSubmissions.answers", aggregation: "count", groupBy: "answer", segmentBy: "fieldLabel", width: "full" },
    ],
  },
]

export function buildSpaceFromTemplate(
  template: SpaceTemplate,
  params: { workspaceId: string; createdBy: string; createdByName: string },
): AnalyticsSpace {
  const base = createEmptySpace(params)
  return {
    ...base,
    name: template.name,
    description: template.description,
    icon: template.icon,
    iconColor: template.iconColor,
    widgets: template.widgets.map((seed) => createWidget(seed)),
  }
}
