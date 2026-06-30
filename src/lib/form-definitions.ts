import { INCIDENT_CATEGORIES } from "@/lib/incident-definitions"

export type FormFieldType =
  // Input
  | "short-text"
  | "long-text"
  | "rich-text"
  | "email"
  | "phone"
  | "url"
  | "number"
  | "tags"
  // Selection
  | "dropdown"
  | "single-select"
  | "multi-select"
  | "checkbox"
  | "staff-select"
  | "client-select"
  | "linear-scale"
  | "rating"
  // Date & time
  | "date"
  | "time"
  | "datetime"
  // Layout
  | "heading"
  | "paragraph"
  | "divider"
  // Advanced
  | "file-upload"
  | "signature"

export type FormFieldCategory = "input" | "selection" | "date" | "layout" | "advanced"

export type FormStatus = "draft" | "published"

export interface FormFieldOption {
  id: string
  label: string
}

export interface FormField {
  id: string
  type: FormFieldType
  label: string
  placeholder: string
  description: string
  required: boolean
  options: FormFieldOption[]
  stepId: string | null
  min: number | null
  max: number | null
  /** System fields are injected by a process binding (e.g. incident report) and cannot be deleted. */
  system?: boolean
  /** Which process injected this system field, if any. */
  processKey?: FormProcessKey
  /** Semantic key for this field within its process (e.g. "amount" for a reimbursement). */
  fieldKey?: string
  /** Legacy: identifies which incident field this maps to. Mirrors fieldKey for the incident process. */
  incidentKey?: IncidentFieldKey
}

export type IncidentFieldKey =
  | "title"
  | "description"
  | "userActivities"
  | "dateReported"
  | "priority"
  | "category"
  | "reportedBy"
  | "assignedTo"
  | "location"

/** Processes a form can be connected to. Connecting injects the process's mandatory fields. */
export type FormProcessKey =
  | "incident_report"
  | "reimbursement"
  | "travel_claim"
  | "order"
  | "shift_note"
  | "timesheet"

export interface FormStep {
  id: string
  title: string
}

export interface FormSuccessScreen {
  allowSubmitAnother: boolean
  customMessage: string | null
}

export interface FormSettings {
  showCover: boolean
  showIcon: boolean
  showFormDescription: boolean
  showQuestionNumbers: boolean
  allowStepNavigation: boolean
  submitButtonText: string
  assignResponsesTo: string
  /** Legacy flag kept in sync with `connectedProcess === "incident_report"`. */
  useAsIncidentForm: boolean
  /** The process this form is connected to, or null. Connecting injects mandatory fields. */
  connectedProcess: FormProcessKey | null
  coverColor: string
  coverImage: string
  successScreen: FormSuccessScreen
}

export interface FormSchema {
  fields: FormField[]
  steps: FormStep[]
}

export interface Form {
  id: string
  workspaceId: string
  name: string
  description: string
  icon: string
  iconColor: string
  schema: FormSchema
  settings: FormSettings
  status: FormStatus
  tags: string[]
  locked: boolean
  archived: boolean
  isIncidentForm: boolean
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export interface FormSubmission {
  id: string
  formId: string
  workspaceId: string
  answers: Record<string, unknown>
  submittedByStaffId: string | null
  submittedByName: string
  createdAt: string
  updatedAt: string
}

export interface FormFieldTypeMeta {
  type: FormFieldType
  label: string
  category: FormFieldCategory
  /** Layout/structural fields don't capture an answer. */
  isContent: boolean
  hasOptions: boolean
}

export const FORM_FIELD_TYPES: FormFieldTypeMeta[] = [
  { type: "short-text", label: "Short Text", category: "input", isContent: false, hasOptions: false },
  { type: "email", label: "Email", category: "input", isContent: false, hasOptions: false },
  { type: "phone", label: "Phone", category: "input", isContent: false, hasOptions: false },
  { type: "url", label: "URL", category: "input", isContent: false, hasOptions: false },
  { type: "rich-text", label: "Rich Text", category: "input", isContent: false, hasOptions: false },
  { type: "long-text", label: "Long Text", category: "input", isContent: false, hasOptions: false },
  { type: "tags", label: "Tags", category: "input", isContent: false, hasOptions: false },
  { type: "number", label: "Number", category: "input", isContent: false, hasOptions: false },
  { type: "dropdown", label: "Dropdown", category: "selection", isContent: false, hasOptions: true },
  { type: "multi-select", label: "Multi-select", category: "selection", isContent: false, hasOptions: true },
  { type: "single-select", label: "Single-select", category: "selection", isContent: false, hasOptions: true },
  { type: "checkbox", label: "Checkbox", category: "selection", isContent: false, hasOptions: false },
  { type: "staff-select", label: "Staff Select", category: "selection", isContent: false, hasOptions: false },
  { type: "client-select", label: "Client Select", category: "selection", isContent: false, hasOptions: false },
  { type: "linear-scale", label: "Linear Scale", category: "selection", isContent: false, hasOptions: false },
  { type: "rating", label: "Rating", category: "selection", isContent: false, hasOptions: false },
  { type: "date", label: "Date Picker", category: "date", isContent: false, hasOptions: false },
  { type: "time", label: "Time Picker", category: "date", isContent: false, hasOptions: false },
  { type: "datetime", label: "Date & Time", category: "date", isContent: false, hasOptions: false },
  { type: "heading", label: "Heading", category: "layout", isContent: true, hasOptions: false },
  { type: "paragraph", label: "Paragraph", category: "layout", isContent: true, hasOptions: false },
  { type: "divider", label: "Divider", category: "layout", isContent: true, hasOptions: false },
  { type: "file-upload", label: "File Upload", category: "advanced", isContent: false, hasOptions: false },
  { type: "signature", label: "Signature", category: "advanced", isContent: false, hasOptions: false },
]

export const FORM_FIELD_CATEGORY_LABELS: Record<FormFieldCategory, string> = {
  input: "Input Fields",
  selection: "Selection",
  date: "Date & Time",
  layout: "Layout",
  advanced: "Advanced",
}

export const FORM_FIELD_CATEGORY_ORDER: FormFieldCategory[] = [
  "input",
  "selection",
  "date",
  "layout",
  "advanced",
]

const fieldTypeMetaMap: Record<FormFieldType, FormFieldTypeMeta> = FORM_FIELD_TYPES.reduce(
  (acc, meta) => {
    acc[meta.type] = meta
    return acc
  },
  {} as Record<FormFieldType, FormFieldTypeMeta>,
)

export function getFieldTypeMeta(type: FormFieldType): FormFieldTypeMeta {
  return fieldTypeMetaMap[type]
}

export function getFieldTypeLabel(type: FormFieldType): string {
  return fieldTypeMetaMap[type]?.label ?? type
}

export function isContentField(type: FormFieldType): boolean {
  return fieldTypeMetaMap[type]?.isContent ?? false
}

export function fieldTypeHasOptions(type: FormFieldType): boolean {
  return fieldTypeMetaMap[type]?.hasOptions ?? false
}

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

const defaultLabels: Partial<Record<FormFieldType, string>> = {
  "short-text": "Short answer",
  "long-text": "Long answer",
  "rich-text": "Rich text",
  email: "Email",
  phone: "Phone number",
  url: "Website",
  number: "Number",
  tags: "Tags",
  dropdown: "Choose an option",
  "single-select": "Select one",
  "multi-select": "Select all that apply",
  checkbox: "Checkbox",
  "staff-select": "Staff member",
  "client-select": "Participant",
  "linear-scale": "Linear scale",
  rating: "Rating",
  date: "Date",
  time: "Time",
  datetime: "Date & time",
  heading: "Heading",
  paragraph: "Add a paragraph of text to guide respondents.",
  divider: "",
  "file-upload": "Upload a file",
  signature: "Signature",
}

export function createFormField(type: FormFieldType, stepId: string | null = null): FormField {
  const meta = getFieldTypeMeta(type)
  return {
    id: generateId("fld"),
    type,
    label: defaultLabels[type] ?? meta?.label ?? "Field",
    placeholder: "",
    description: "",
    required: false,
    options: meta?.hasOptions
      ? [
          { id: generateId("opt"), label: "Option 1" },
          { id: generateId("opt"), label: "Option 2" },
        ]
      : [],
    stepId,
    min: type === "linear-scale" ? 1 : type === "rating" ? 1 : null,
    max: type === "linear-scale" ? 5 : type === "rating" ? 5 : null,
  }
}

export function createFormStep(title: string): FormStep {
  return { id: generateId("step"), title }
}

export const INCIDENT_REPORT_FORM_NAME = "Incident report"

interface ProcessFieldSeed {
  /** Stable id so the same system field is reused across edits. */
  id: string
  fieldKey: string
  type: FormFieldType
  label: string
  description?: string
  required?: boolean
  options?: string[]
}

export interface FormProcessDef {
  key: FormProcessKey
  /** Full label used in confirmation copy. */
  label: string
  /** Short label used for the connections toggle. */
  connectLabel: string
  /** Explanation shown in the connect confirmation dialog. */
  description: string
  /** Name applied to the form when connected (only when renameOnConnect). */
  formName: string
  /** Whether connecting renames the form to formName (incident reports do). */
  renameOnConnect: boolean
  fields: ProcessFieldSeed[]
}

const INCIDENT_PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"]

// Sourced from the canonical incident categories so the form labels always map back to a category value.
const INCIDENT_CATEGORY_LABELS = INCIDENT_CATEGORIES.map((category) => category.label)

const REIMBURSEMENT_CATEGORY_OPTIONS = ["Travel", "Equipment", "Activity / outing", "Consumables", "Other"]
const ORDER_FUNDING_OPTIONS = ["Business / operational", "NDIS — participant funded", "Grant", "Other"]

export const FORM_PROCESSES: FormProcessDef[] = [
  {
    key: "incident_report",
    label: "Incident reports",
    connectLabel: "Incident reports",
    description:
      "Staff will fill out this form when reporting a new incident, replacing any previously active incident form.",
    formName: INCIDENT_REPORT_FORM_NAME,
    renameOnConnect: true,
    fields: [
      { id: "sys_incident_title", fieldKey: "title", type: "short-text", label: "Incident title", description: "Used as the incident title", required: true },
      { id: "sys_incident_description", fieldKey: "description", type: "long-text", label: "Description", description: "What happened during the incident", required: true },
      { id: "sys_incident_user_activities", fieldKey: "userActivities", type: "long-text", label: "User activities", description: "What participants were doing when the incident occurred", required: false },
      { id: "sys_incident_date_reported", fieldKey: "dateReported", type: "date", label: "Date reported", description: "When the incident was reported", required: true },
      { id: "sys_incident_priority", fieldKey: "priority", type: "single-select", label: "Priority", description: "Severity of the incident", required: true, options: INCIDENT_PRIORITY_OPTIONS },
      { id: "sys_incident_category", fieldKey: "category", type: "dropdown", label: "Category", description: "Type of incident", required: true, options: INCIDENT_CATEGORY_LABELS },
      { id: "sys_incident_reported_by", fieldKey: "reportedBy", type: "staff-select", label: "Reported by", description: "Who reported the incident", required: true },
      { id: "sys_incident_assigned_to", fieldKey: "assignedTo", type: "staff-select", label: "Assigned to", description: "Staff member responsible", required: true },
      { id: "sys_incident_location", fieldKey: "location", type: "short-text", label: "Location", description: "Where the incident happened", required: true },
    ],
  },
  {
    key: "reimbursement",
    label: "Reimbursements",
    connectLabel: "Reimbursements",
    description:
      "Staff will use this form to submit out-of-pocket expenses for approval and reimbursement.",
    formName: "Reimbursement request",
    renameOnConnect: false,
    fields: [
      { id: "sys_reimb_submitted_by", fieldKey: "submittedBy", type: "staff-select", label: "Submitted by", required: true },
      { id: "sys_reimb_date", fieldKey: "date", type: "date", label: "Date of expense", required: true },
      { id: "sys_reimb_category", fieldKey: "category", type: "single-select", label: "Category", required: true, options: REIMBURSEMENT_CATEGORY_OPTIONS },
      { id: "sys_reimb_amount", fieldKey: "amount", type: "number", label: "Amount (AUD)", required: true },
      { id: "sys_reimb_participant", fieldKey: "participant", type: "client-select", label: "Related participant (if applicable)" },
      { id: "sys_reimb_description", fieldKey: "description", type: "long-text", label: "Description", required: true },
      { id: "sys_reimb_receipt", fieldKey: "receipt", type: "file-upload", label: "Receipt", required: true },
    ],
  },
  {
    key: "travel_claim",
    label: "Travel claims",
    connectLabel: "Travel claims",
    description:
      "Staff will use this form to record work-related travel and kilometres for a mileage claim.",
    formName: "Travel claim",
    renameOnConnect: false,
    fields: [
      { id: "sys_travel_staff", fieldKey: "staff", type: "staff-select", label: "Staff member", required: true },
      { id: "sys_travel_date", fieldKey: "date", type: "date", label: "Date of travel", required: true },
      { id: "sys_travel_from", fieldKey: "from", type: "short-text", label: "From", required: true },
      { id: "sys_travel_to", fieldKey: "to", type: "short-text", label: "To", required: true },
      { id: "sys_travel_kilometres", fieldKey: "kilometres", type: "number", label: "Kilometres", required: true },
      { id: "sys_travel_participant", fieldKey: "participant", type: "client-select", label: "Participant (if applicable)" },
      { id: "sys_travel_purpose", fieldKey: "purpose", type: "long-text", label: "Purpose of travel", required: true },
    ],
  },
  {
    key: "order",
    label: "Orders & purchases",
    connectLabel: "Orders",
    description:
      "Staff will use this form to submit a purchase or order for approval, including supplier, cost and funding source.",
    formName: "Purchase order",
    renameOnConnect: false,
    fields: [
      { id: "sys_order_requested_by", fieldKey: "requestedBy", type: "staff-select", label: "Requested by", required: true },
      { id: "sys_order_date", fieldKey: "dateRequested", type: "date", label: "Date requested", required: true },
      { id: "sys_order_item", fieldKey: "item", type: "short-text", label: "Item / description", required: true },
      { id: "sys_order_supplier", fieldKey: "supplier", type: "short-text", label: "Supplier / vendor" },
      { id: "sys_order_quantity", fieldKey: "quantity", type: "number", label: "Quantity" },
      { id: "sys_order_cost", fieldKey: "cost", type: "number", label: "Estimated cost (AUD)", required: true },
      { id: "sys_order_funding", fieldKey: "fundingSource", type: "single-select", label: "Funding source", required: true, options: ORDER_FUNDING_OPTIONS },
      { id: "sys_order_participant", fieldKey: "participant", type: "client-select", label: "Related participant (if applicable)" },
    ],
  },
  {
    key: "shift_note",
    label: "Shift notes",
    connectLabel: "Shift notes",
    description:
      "Staff will use this form to record an NDIS-standard progress note at the end of a shift.",
    formName: "Shift progress note",
    renameOnConnect: false,
    fields: [
      { id: "sys_shiftnote_participant", fieldKey: "participant", type: "client-select", label: "Participant", required: true },
      { id: "sys_shiftnote_worker", fieldKey: "supportWorker", type: "staff-select", label: "Support worker", required: true },
      { id: "sys_shiftnote_date", fieldKey: "date", type: "date", label: "Date of shift", required: true },
      { id: "sys_shiftnote_start", fieldKey: "startTime", type: "time", label: "Start time" },
      { id: "sys_shiftnote_end", fieldKey: "endTime", type: "time", label: "End time" },
      { id: "sys_shiftnote_support", fieldKey: "supportProvided", type: "long-text", label: "Support provided", required: true },
      { id: "sys_shiftnote_goals", fieldKey: "goalProgress", type: "long-text", label: "Progress toward goals" },
      { id: "sys_shiftnote_observations", fieldKey: "observations", type: "long-text", label: "Observations" },
      { id: "sys_shiftnote_concerns", fieldKey: "concerns", type: "long-text", label: "Concerns or changes" },
      { id: "sys_shiftnote_followup", fieldKey: "followUp", type: "long-text", label: "Follow-up / handover" },
      { id: "sys_shiftnote_signature", fieldKey: "signature", type: "signature", label: "Signature" },
    ],
  },
  {
    key: "timesheet",
    label: "Timesheets",
    connectLabel: "Timesheets",
    description:
      "Staff will use this form to record the hours worked on a shift for payroll.",
    formName: "Timesheet",
    renameOnConnect: false,
    fields: [
      { id: "sys_ts_staff", fieldKey: "staff", type: "staff-select", label: "Staff member", required: true },
      { id: "sys_ts_date", fieldKey: "date", type: "date", label: "Shift date", required: true },
      { id: "sys_ts_start", fieldKey: "startTime", type: "time", label: "Start time", required: true },
      { id: "sys_ts_end", fieldKey: "endTime", type: "time", label: "End time", required: true },
      { id: "sys_ts_break", fieldKey: "breakMinutes", type: "number", label: "Break (minutes)" },
      { id: "sys_ts_participant", fieldKey: "participant", type: "client-select", label: "Participant" },
      { id: "sys_ts_notes", fieldKey: "notes", type: "long-text", label: "Notes" },
      { id: "sys_ts_signature", fieldKey: "signature", type: "signature", label: "Signature" },
    ],
  },
]

const processByKey: Record<FormProcessKey, FormProcessDef> = FORM_PROCESSES.reduce(
  (acc, def) => {
    acc[def.key] = def
    return acc
  },
  {} as Record<FormProcessKey, FormProcessDef>,
)

export function getFormProcess(key: FormProcessKey): FormProcessDef | undefined {
  return processByKey[key]
}

function seedToField(processKey: FormProcessKey, seed: ProcessFieldSeed): FormField {
  return {
    id: seed.id,
    type: seed.type,
    label: seed.label,
    placeholder: "",
    description: seed.description ?? "",
    required: seed.required ?? false,
    options: seed.options ? seed.options.map((label, index) => ({ id: `${seed.id}_opt_${index}`, label })) : [],
    stepId: null,
    min: null,
    max: null,
    system: true,
    processKey,
    fieldKey: seed.fieldKey,
    // Keep the legacy incidentKey populated for the incident process so existing consumers keep working.
    ...(processKey === "incident_report" ? { incidentKey: seed.fieldKey as IncidentFieldKey } : {}),
  }
}

/** A field is a process-owned system field if it was injected by a process binding. */
export function isProcessSystemField(field: FormField): boolean {
  return field.system === true && field.processKey !== undefined
}

/**
 * Connect a schema to a process: prepend any missing mandatory fields for that
 * process and strip any system fields belonging to other processes (a form can
 * only be connected to one process at a time).
 */
export function withProcessFields(schema: FormSchema, processKey: FormProcessKey): FormSchema {
  const def = processByKey[processKey]
  if (!def) return schema
  const withoutOthers = schema.fields.filter(
    (field) => !isProcessSystemField(field) || field.processKey === processKey,
  )
  const existingIds = new Set(withoutOthers.map((field) => field.id))
  const missing = def.fields.filter((seed) => !existingIds.has(seed.id)).map((seed) => seedToField(processKey, seed))
  return { ...schema, fields: [...missing, ...withoutOthers] }
}

/** Remove system fields for a process (or for all processes when no key is given). */
export function withoutProcessFields(schema: FormSchema, processKey?: FormProcessKey): FormSchema {
  return {
    ...schema,
    fields: schema.fields.filter((field) =>
      processKey ? !(isProcessSystemField(field) && field.processKey === processKey) : !isProcessSystemField(field),
    ),
  }
}

// Legacy incident helpers, retained for any external callers and migrations.
export function isIncidentSystemField(field: FormField): boolean {
  return isProcessSystemField(field) && field.processKey === "incident_report"
}

export function withIncidentReportFields(schema: FormSchema): FormSchema {
  return withProcessFields(schema, "incident_report")
}

export function withoutIncidentReportFields(schema: FormSchema): FormSchema {
  return withoutProcessFields(schema, "incident_report")
}

export function defaultFormSettings(): FormSettings {
  return {
    showCover: false,
    showIcon: false,
    showFormDescription: false,
    showQuestionNumbers: false,
    allowStepNavigation: false,
    submitButtonText: "Submit",
    assignResponsesTo: "",
    useAsIncidentForm: false,
    connectedProcess: null,
    coverColor: "#3b82f6",
    coverImage: "",
    successScreen: {
      allowSubmitAnother: false,
      customMessage: null,
    },
  }
}

export function createEmptyForm(params: {
  workspaceId: string
  createdBy: string
  createdByName: string
  name?: string
}): Form {
  const now = new Date().toISOString()
  return {
    id: generateId("form"),
    workspaceId: params.workspaceId,
    name: params.name?.trim() || "Untitled form",
    description: "",
    icon: "📄",
    iconColor: "#3b82f6",
    schema: { fields: [], steps: [] },
    settings: defaultFormSettings(),
    status: "draft",
    tags: [],
    locked: false,
    archived: false,
    isIncidentForm: false,
    createdBy: params.createdBy,
    createdByName: params.createdByName,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  }
}

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  draft: "Draft",
  published: "Published",
}

export type FormTemplateCategory =
  | "ndis"
  | "hcp-sah"
  | "clinical"
  | "hr"
  | "operations"
  | "finance"
  | "service-delivery"

export const FORM_TEMPLATE_CATEGORY_LABELS: Record<FormTemplateCategory, string> = {
  ndis: "NDIS",
  "hcp-sah": "HCP / SAH",
  clinical: "Clinical",
  hr: "HR / Staffing",
  operations: "Operations",
  finance: "Finance",
  "service-delivery": "Service Delivery",
}

export interface FormTemplateFieldSeed {
  type: FormFieldType
  label?: string
  placeholder?: string
  description?: string
  required?: boolean
  options?: string[]
  step?: string
  min?: number
  max?: number
}

export interface FormTemplate {
  id: string
  name: string
  description: string
  category: FormTemplateCategory
  icon: string
  steps: string[]
  fields: FormTemplateFieldSeed[]
  isIncidentForm?: boolean
  /** When set, the template materialises this process's mandatory fields and pre-selects the connection. */
  connectProcess?: FormProcessKey
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "ndis-reportable-incident",
    name: INCIDENT_REPORT_FORM_NAME,
    description: "The mandatory incident fields staff complete when reporting an incident.",
    category: "ndis",
    icon: "🚨",
    isIncidentForm: true,
    steps: [],
    fields: [
      { type: "short-text", label: "Incident title", required: true },
      { type: "long-text", label: "Description", required: true },
      { type: "date", label: "Date reported", required: true },
      { type: "single-select", label: "Priority", required: true, options: INCIDENT_PRIORITY_OPTIONS },
      { type: "dropdown", label: "Category", required: true, options: INCIDENT_CATEGORY_LABELS },
      { type: "staff-select", label: "Reported by", required: true },
      { type: "staff-select", label: "Assigned to", required: true },
      { type: "short-text", label: "Location", required: true },
    ],
  },
  {
    id: "client-intake",
    name: "Client Intake Form",
    description: "Initial NDIS client intake form capturing participant details, supports and consent.",
    category: "ndis",
    icon: "📝",
    steps: ["Participant", "Contacts", "Needs", "Sign-off"],
    fields: [
      { type: "short-text", label: "First name", required: true, step: "Participant" },
      { type: "short-text", label: "Last name", required: true, step: "Participant" },
      { type: "date", label: "Date of birth", required: true, step: "Participant" },
      { type: "short-text", label: "NDIS number", required: true, placeholder: "e.g. 123456789", step: "Participant" },
      { type: "date", label: "NDIS plan start date", step: "Participant" },
      { type: "date", label: "NDIS plan end date", step: "Participant" },
      {
        type: "single-select",
        label: "NDIS management type",
        required: true,
        step: "Participant",
        options: ["Plan managed", "Self managed", "NDIA managed"],
      },
      { type: "short-text", label: "Primary contact name", step: "Contacts" },
      { type: "phone", label: "Primary contact phone", step: "Contacts" },
      { type: "email", label: "Primary contact email", step: "Contacts" },
      { type: "long-text", label: "Support needs and goals", step: "Needs" },
      { type: "long-text", label: "Risks and considerations", step: "Needs" },
      { type: "signature", label: "Participant / representative signature", step: "Sign-off" },
    ],
  },
  {
    id: "feedback-complaints",
    name: "NDIS Feedback & Complaints",
    description: "Log feedback and complaints, actions taken, outcomes and close-out.",
    category: "ndis",
    icon: "💬",
    steps: ["Details", "Actions", "Outcome"],
    fields: [
      {
        type: "single-select",
        label: "Type",
        required: true,
        step: "Details",
        options: ["Feedback", "Complaint", "Compliment"],
      },
      { type: "client-select", label: "Participant", step: "Details" },
      { type: "date", label: "Date received", required: true, step: "Details" },
      { type: "long-text", label: "Description", required: true, step: "Details" },
      { type: "long-text", label: "Actions taken", step: "Actions" },
      { type: "staff-select", label: "Assigned to", step: "Actions" },
      {
        type: "single-select",
        label: "Status",
        step: "Outcome",
        options: ["Open", "In progress", "Resolved", "Closed"],
      },
      { type: "long-text", label: "Outcome / resolution", step: "Outcome" },
    ],
  },
  {
    id: "staff-onboarding",
    name: "Worker Onboarding",
    description: "Track new support worker onboarding, screening, compliance documents and sign-off.",
    category: "hr",
    icon: "✅",
    steps: ["Details", "Compliance", "Sign-off"],
    fields: [
      { type: "staff-select", label: "Staff member", required: true, step: "Details" },
      { type: "date", label: "Start date", required: true, step: "Details" },
      { type: "short-text", label: "Position / role", step: "Details" },
      {
        type: "multi-select",
        label: "Compliance documents received",
        step: "Compliance",
        options: ["NDIS Worker Screening", "Police check", "First aid", "Right to work", "Qualifications"],
      },
      { type: "file-upload", label: "Upload compliance documents", step: "Compliance" },
      { type: "checkbox", label: "Code of conduct acknowledged", step: "Compliance" },
      { type: "signature", label: "Staff signature", step: "Sign-off" },
    ],
  },
  {
    id: "leave-request",
    name: "Leave Request",
    description: "Capture staff leave requests with dates, type and approval.",
    category: "hr",
    icon: "🌴",
    steps: [],
    fields: [
      { type: "staff-select", label: "Staff member", required: true },
      {
        type: "single-select",
        label: "Leave type",
        required: true,
        options: ["Annual leave", "Personal / carer's", "Unpaid", "Compassionate", "Other"],
      },
      { type: "date", label: "Start date", required: true },
      { type: "date", label: "End date", required: true },
      { type: "long-text", label: "Reason / notes" },
    ],
  },
  {
    id: "performance-review",
    name: "Staff Performance Review",
    description: "Structured performance review covering goals, strengths and development areas.",
    category: "hr",
    icon: "📈",
    steps: ["Review", "Development"],
    fields: [
      { type: "staff-select", label: "Staff member", required: true, step: "Review" },
      { type: "date", label: "Review date", required: true, step: "Review" },
      { type: "rating", label: "Overall performance", step: "Review", min: 1, max: 5 },
      { type: "long-text", label: "Strengths", step: "Review" },
      { type: "long-text", label: "Areas for development", step: "Development" },
      { type: "long-text", label: "Goals for next period", step: "Development" },
      { type: "signature", label: "Staff acknowledgement", step: "Development" },
    ],
  },
  {
    id: "expense-reimbursement",
    name: "Expense Reimbursement",
    description: "Submit out-of-pocket expenses for approval and reimbursement.",
    category: "finance",
    icon: "🧾",
    steps: [],
    fields: [
      { type: "staff-select", label: "Submitted by", required: true },
      { type: "date", label: "Date of expense", required: true },
      {
        type: "single-select",
        label: "Category",
        options: ["Travel", "Equipment", "Activity / outing", "Consumables", "Other"],
      },
      { type: "number", label: "Amount (AUD)", required: true },
      { type: "client-select", label: "Related participant (if applicable)" },
      { type: "long-text", label: "Description" },
      { type: "file-upload", label: "Receipt", required: true },
    ],
  },
  {
    id: "purchase-request",
    name: "Purchase Request",
    description: "Submit a purchase for approval, including supplier, cost and funding source.",
    category: "finance",
    icon: "🛒",
    steps: [],
    fields: [
      { type: "staff-select", label: "Requested by", required: true },
      { type: "date", label: "Date requested", required: true },
      { type: "short-text", label: "Item / description", required: true },
      { type: "short-text", label: "Supplier / vendor" },
      { type: "number", label: "Quantity" },
      { type: "number", label: "Estimated cost (AUD)", required: true },
      {
        type: "single-select",
        label: "Funding source",
        required: true,
        options: ["Business / operational", "NDIS — participant funded", "Grant", "Other"],
      },
      { type: "client-select", label: "Related participant (if applicable)" },
      {
        type: "single-select",
        label: "Urgency",
        options: ["Standard", "High", "Urgent"],
      },
      { type: "long-text", label: "Reason / justification" },
      { type: "file-upload", label: "Quote or supporting document" },
    ],
  },
  {
    id: "travel-mileage-claim",
    name: "Travel & Mileage Claim",
    description: "Record work-related travel and kilometres for mileage reimbursement.",
    category: "finance",
    icon: "🚗",
    steps: [],
    fields: [
      { type: "staff-select", label: "Staff member", required: true },
      { type: "date", label: "Date of travel", required: true },
      { type: "short-text", label: "From" },
      { type: "short-text", label: "To" },
      { type: "number", label: "Kilometres", required: true },
      { type: "client-select", label: "Participant (if applicable)" },
      { type: "long-text", label: "Purpose of travel" },
    ],
  },
  {
    id: "shift-progress-note",
    name: "Shift Progress Note",
    description: "Daily support / progress note completed at the end of a shift.",
    category: "service-delivery",
    icon: "📋",
    steps: [],
    fields: [
      { type: "client-select", label: "Participant", required: true },
      { type: "staff-select", label: "Support worker", required: true },
      { type: "date", label: "Date of shift", required: true },
      { type: "time", label: "Start time" },
      { type: "time", label: "End time" },
      { type: "long-text", label: "Activities and supports provided", required: true },
      { type: "long-text", label: "Participant mood / wellbeing" },
      {
        type: "single-select",
        label: "Any incidents or concerns?",
        options: ["No", "Yes — logged separately"],
      },
      { type: "long-text", label: "Handover notes for next shift" },
    ],
  },
  {
    id: "service-agreement",
    name: "Service Agreement",
    description: "Agreement covering supports, pricing, responsibilities and consent.",
    category: "service-delivery",
    icon: "🤝",
    steps: ["Participant", "Supports", "Consent"],
    fields: [
      { type: "client-select", label: "Participant", required: true, step: "Participant" },
      { type: "date", label: "Agreement start date", required: true, step: "Participant" },
      { type: "date", label: "Agreement end date", step: "Participant" },
      { type: "long-text", label: "Supports to be delivered", required: true, step: "Supports" },
      { type: "long-text", label: "Pricing and cancellation policy", step: "Supports" },
      { type: "long-text", label: "Responsibilities of each party", step: "Supports" },
      { type: "checkbox", label: "Participant consents to the agreement", required: true, step: "Consent" },
      { type: "signature", label: "Participant / representative signature", step: "Consent" },
    ],
  },
  {
    id: "goal-review",
    name: "Participant Goal Review",
    description: "Review progress against participant goals and plan next steps.",
    category: "service-delivery",
    icon: "🎯",
    steps: [],
    fields: [
      { type: "client-select", label: "Participant", required: true },
      { type: "date", label: "Review date", required: true },
      { type: "long-text", label: "Goal", required: true },
      {
        type: "single-select",
        label: "Progress",
        options: ["Not started", "In progress", "Achieved", "On hold"],
      },
      { type: "long-text", label: "Evidence of progress" },
      { type: "long-text", label: "Next steps" },
    ],
  },
  {
    id: "risk-assessment",
    name: "Risk Assessment",
    description: "Identify and rate risks for a participant or activity with controls.",
    category: "clinical",
    icon: "⚠️",
    steps: ["Context", "Assessment"],
    fields: [
      { type: "client-select", label: "Participant", step: "Context" },
      { type: "date", label: "Assessment date", required: true, step: "Context" },
      { type: "short-text", label: "Activity / context being assessed", step: "Context" },
      { type: "long-text", label: "Identified hazards / risks", required: true, step: "Assessment" },
      {
        type: "single-select",
        label: "Risk rating",
        required: true,
        step: "Assessment",
        options: ["Low", "Medium", "High", "Extreme"],
      },
      { type: "long-text", label: "Control measures", required: true, step: "Assessment" },
      { type: "staff-select", label: "Assessed by", step: "Assessment" },
    ],
  },
  {
    id: "medication-chart",
    name: "Medication Administration Record",
    description: "Record medication administered to a participant during a shift.",
    category: "clinical",
    icon: "💊",
    steps: [],
    fields: [
      { type: "client-select", label: "Participant", required: true },
      { type: "staff-select", label: "Administered by", required: true },
      { type: "date", label: "Date", required: true },
      { type: "time", label: "Time", required: true },
      { type: "short-text", label: "Medication", required: true },
      { type: "short-text", label: "Dose", required: true },
      {
        type: "single-select",
        label: "Outcome",
        options: ["Administered", "Refused", "Withheld", "Missed"],
      },
      { type: "long-text", label: "Notes" },
    ],
  },
  {
    id: "vehicle-prestart",
    name: "Vehicle Pre-Start Checklist",
    description: "Daily vehicle safety check before transporting participants.",
    category: "operations",
    icon: "🚐",
    steps: [],
    fields: [
      { type: "staff-select", label: "Driver", required: true },
      { type: "date", label: "Date", required: true },
      { type: "short-text", label: "Vehicle registration", required: true },
      { type: "number", label: "Odometer reading" },
      {
        type: "multi-select",
        label: "Checks completed",
        options: ["Tyres", "Lights", "Brakes", "Fuel / charge", "Cleanliness", "First aid kit"],
      },
      {
        type: "single-select",
        label: "Any defects?",
        required: true,
        options: ["No", "Yes"],
      },
      { type: "long-text", label: "Defect details" },
    ],
  },
  {
    id: "maintenance-request",
    name: "Maintenance Request",
    description: "Log a maintenance or repair request for premises, vehicles or equipment.",
    category: "operations",
    icon: "🛠️",
    steps: [],
    fields: [
      { type: "staff-select", label: "Reported by", required: true },
      { type: "date", label: "Date reported", required: true },
      {
        type: "single-select",
        label: "Asset type",
        options: ["Premises", "Vehicle", "Equipment", "IT", "Other"],
      },
      { type: "short-text", label: "Location / asset" },
      {
        type: "single-select",
        label: "Priority",
        required: true,
        options: ["Low", "Medium", "High", "Urgent"],
      },
      { type: "long-text", label: "Description of issue", required: true },
      { type: "file-upload", label: "Photo" },
    ],
  },
]

export function getFormTemplate(id: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find((template) => template.id === id)
}

export function buildFormFromTemplate(
  template: FormTemplate,
  params: { workspaceId: string; createdBy: string; createdByName: string },
): Form {
  const base = createEmptyForm(params)
  const stepMap = new Map<string, FormStep>()
  const steps: FormStep[] = template.steps.map((title) => {
    const step = createFormStep(title)
    stepMap.set(title, step)
    return step
  })

  const fields: FormField[] = template.fields.map((seed) => {
    const field = createFormField(seed.type, seed.step ? stepMap.get(seed.step)?.id ?? null : null)
    if (seed.label !== undefined) field.label = seed.label
    if (seed.placeholder !== undefined) field.placeholder = seed.placeholder
    if (seed.description !== undefined) field.description = seed.description
    if (seed.required !== undefined) field.required = seed.required
    if (seed.min !== undefined) field.min = seed.min
    if (seed.max !== undefined) field.max = seed.max
    if (seed.options) field.options = seed.options.map((label) => ({ id: generateId("opt"), label }))
    return field
  })

  const connectKey: FormProcessKey | null =
    template.connectProcess ?? (template.isIncidentForm ? "incident_report" : null)
  const connectDef = connectKey ? processByKey[connectKey] : undefined
  // Connected templates materialise that process's canonical, required system fields.
  const schema = connectKey ? withProcessFields({ fields, steps }, connectKey) : { fields, steps }
  const name = connectDef?.renameOnConnect ? connectDef.formName : template.name

  return {
    ...base,
    name,
    description: template.description,
    icon: template.icon,
    // The active binding (is_incident_form / workspace_form_bindings) is only set when the form is published & bound.
    isIncidentForm: false,
    settings: {
      ...base.settings,
      useAsIncidentForm: connectKey === "incident_report",
      connectedProcess: connectKey,
      allowStepNavigation: schema.steps.length > 1,
      showFormDescription: true,
    },
    schema,
  }
}
