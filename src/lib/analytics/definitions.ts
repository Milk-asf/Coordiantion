import type { ComponentType } from "react"
import {
  AlertTriangle,
  AreaChart,
  BarChart3,
  CalendarClock,
  CalendarRange,
  CircleDollarSign,
  Hash,
  LineChart,
  PieChart,
  Plane,
  ReceiptText,
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
  Incident,
  Invoice,
  InvoiceLineItem,
  Reimbursement,
  StaffMember,
  Task,
} from "@/lib/types"
import type { Timesheet, TravelClaim } from "@/lib/timesheets/types"
import type { RosterShift } from "@/lib/roster/types"

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>

export type VisualizationType = "metric" | "bar" | "line" | "area" | "pie" | "donut" | "funnel" | "table"

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

export type RootSourceData = Partial<Record<AnalyticsDataSourceKey, unknown[]>>

// ---------------------------------------------------------------------------
// Visualizations
// ---------------------------------------------------------------------------

export type VisualizationCategory = "single" | "comparison" | "trend" | "proportion"

export const VISUALIZATION_CATEGORY_ORDER: VisualizationCategory[] = ["single", "comparison", "trend", "proportion"]

export const VISUALIZATION_CATEGORY_LABELS: Record<VisualizationCategory, string> = {
  single: "Single value",
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

/**
 * A node in the data-source tree. Top-level entities (isRoot) are the eight
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
  /** Flattens the root array into this entity's records. */
  getRecords: (rootRecords: unknown[]) => unknown[]
  dimensions: DimensionDef[]
  measures: MeasureDef[]
  defaultGroupBy: string
  children?: DataEntity[]
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
      dim<RosterShift>("date", "Shift date", "date", (r) => r.date || null),
    ],
    measures: [
      measure<RosterShift>("duration", "Shift hours", "hours", (r) => minutesBetween(r.startTime, r.endTime) / 60),
    ],
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
      dim<Incident>("category", "Category", "category", (r) => INCIDENT_CATEGORY_LABEL[r.category] || r.category || "Other"),
      dim<Incident>("isReportable", "Reportable", "boolean", (r) => r.isReportable),
      dim<Incident>("reportedByName", "Reported by", "category", (r) => r.reportedByName || "—"),
      dim<Incident>("location", "Location", "category", (r) => r.location || "—"),
      dim<Incident>("incidentDate", "Incident date", "date", (r) => r.incidentDate || null),
    ],
    measures: [
      measure<Incident>("attachments", "Attachments", "number", (r) => r.attachments?.length ?? 0),
    ],
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
    getRecords: identity,
    defaultGroupBy: "status",
    dimensions: [
      dim<Timesheet>("status", "Status", "category", (r) => r.status),
      dim<Timesheet>("submittedByName", "Submitted by", "category", (r) => r.submittedByName || "—"),
      dim<Timesheet>("startDate", "Shift date", "date", (r) => r.startDate || null),
    ],
    measures: [
      measure<Timesheet>("workedHours", "Worked hours", "hours", (r) => (r.workedMinutes || 0) / 60),
      measure<Timesheet>("breakMinutes", "Break (min)", "number", (r) => r.breakMinutes || 0),
      measure<Timesheet>("travelClaims", "Travel claims", "number", (r) => r.travelClaims?.length ?? 0),
    ],
    children: [travelClaimsEntity],
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
      dim<StaffMember>("startDate", "Start date", "date", (r) => r.details?.startDate || null),
    ],
    measures: [],
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
  return entity.getRecords(rootData[entity.rootKey] ?? [])
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

export const SPACE_TEMPLATES: SpaceTemplate[] = [
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
