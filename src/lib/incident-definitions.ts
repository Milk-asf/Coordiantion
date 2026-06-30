export type IncidentStatus = "confirmed" | "alleged" | "not_an_incident"

export type IncidentInvestigationStatus = "sent" | "in_progress" | "completed" | "closed" | "not_an_incident"

export type NdisReportableCategory =
  | "death"
  | "serious_injury"
  | "abuse_neglect"
  | "unlawful_contact"
  | "sexual_misconduct"
  | "restrictive_practice"

export interface IncidentCategoryDefinition {
  value: string
  label: string
  ndisCategory: NdisReportableCategory | null
}

export const INCIDENT_CATEGORIES: IncidentCategoryDefinition[] = [
  { value: "physical-injury", label: "Physical Injury", ndisCategory: "serious_injury" },
  { value: "physical-abuse-assault", label: "Physical Abuse or Assault", ndisCategory: "unlawful_contact" },
  { value: "psychological-abuse", label: "Psychological, Emotional or Verbal Abuse", ndisCategory: "abuse_neglect" },
  { value: "sexual-behaviour", label: "Sexual Behaviour (Assault/Misconduct)", ndisCategory: "sexual_misconduct" },
  { value: "breach-privacy", label: "Breach of Privacy", ndisCategory: null },
  { value: "environment", label: "Environment (Spill, Hazard etc)", ndisCategory: null },
  { value: "property-damage", label: "Property Damage", ndisCategory: null },
  { value: "financial", label: "Financial", ndisCategory: null },
  { value: "self-harm", label: "Self-Harm", ndisCategory: "serious_injury" },
  { value: "neglect", label: "Neglect", ndisCategory: "abuse_neglect" },
  { value: "restrictive-practice", label: "Restrictive Practice", ndisCategory: "restrictive_practice" },
  { value: "medical-illness", label: "Medical/Illness", ndisCategory: null },
  { value: "medication", label: "Medication", ndisCategory: null },
  { value: "near-miss", label: "Near Miss (accident that could have caused harm)", ndisCategory: null },
  {
    value: "disclosure",
    label: "Disclosure (When an incident is not seen by a worker, but the worker is advised by the Participant)",
    ndisCategory: null,
  },
  { value: "epilepsy", label: "Epilepsy", ndisCategory: null },
  { value: "illegal-activities", label: "Illegal Activities", ndisCategory: null },
  { value: "other", label: "Other - Describe in Description of Incident", ndisCategory: null },
]

export const NDIS_REPORTABLE_CATEGORY_LABELS: Record<NdisReportableCategory, string> = {
  death: "Death of a participant",
  serious_injury: "Serious injury",
  abuse_neglect: "Abuse or neglect",
  unlawful_contact: "Unlawful sexual or physical contact / assault",
  sexual_misconduct: "Sexual misconduct",
  restrictive_practice: "Unauthorised restrictive practice",
}

export function getIncidentCategoryLabel(value: string): string {
  return INCIDENT_CATEGORIES.find((item) => item.value === value)?.label ?? value
}

export function getIncidentCategoryDefinition(value: string): IncidentCategoryDefinition | undefined {
  return INCIDENT_CATEGORIES.find((item) => item.value === value)
}

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  confirmed: "Confirmed",
  alleged: "Alleged",
  not_an_incident: "Not an incident",
}

export const INVESTIGATION_STATUS_LABELS: Record<IncidentInvestigationStatus, string> = {
  sent: "Sent",
  in_progress: "In progress",
  completed: "Completed",
  closed: "Quality checked",
  not_an_incident: "Not an incident",
}

export const INCIDENT_KANBAN_COLUMNS: { status: IncidentInvestigationStatus; label: string }[] = [
  { status: "sent", label: "Sent" },
  { status: "in_progress", label: "In progress" },
  { status: "completed", label: "Completed" },
  { status: "closed", label: "Quality checked" },
  { status: "not_an_incident", label: "Not an incident" },
]

export const INCIDENT_KANBAN_DRAGGABLE_STATUSES: Exclude<IncidentInvestigationStatus, "closed" | "not_an_incident">[] = [
  "sent",
  "in_progress",
  "completed",
]

export const EDITABLE_INVESTIGATION_STATUSES = [
  "sent",
  "in_progress",
  "completed",
  "draft",
  "not_started",
] as const

export function normalizeInvestigationStatus(status: string | null | undefined): IncidentInvestigationStatus {
  if (status === "not_started" || status === "draft" || !status) return "sent"
  if (status === "sent" || status === "in_progress" || status === "completed" || status === "closed" || status === "not_an_incident") {
    return status
  }
  return "sent"
}

export function resolveInvestigationStatusForSave(status: IncidentInvestigationStatus | string): Exclude<IncidentInvestigationStatus, "sent" | "closed"> {
  const normalized = normalizeInvestigationStatus(status)
  if (normalized === "completed") return "completed"
  if (normalized === "not_an_incident") return "not_an_incident"
  return "in_progress"
}

export function getIncidentStatusLabel(status: IncidentStatus | string): string {
  return INCIDENT_STATUS_LABELS[status as IncidentStatus] ?? "Confirmed"
}

export function getInvestigationStatusLabel(status: IncidentInvestigationStatus | string): string {
  return INVESTIGATION_STATUS_LABELS[normalizeInvestigationStatus(status)] ?? "Sent"
}

export function getIncidentStatusChipClass(status: IncidentStatus | string): string {
  if (status === "alleged") return "bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]"
  if (status === "not_an_incident") return "bg-[#f8fafc] text-[#64748b] border border-[#cbd5e1]"
  return "bg-folk-hover text-folk-text border border-folk-border"
}

export function getInvestigationStatusChipClass(status: IncidentInvestigationStatus | string): string {
  const normalized = normalizeInvestigationStatus(status)
  if (normalized === "closed") return "bg-[#f3f4f6] text-[#374151] border border-[#bababa]"
  if (normalized === "not_an_incident") return "bg-[#f8fafc] text-[#64748b] border border-[#cbd5e1]"
  if (normalized === "completed") return "bg-[#ecfdf3] text-[#15803d] border border-[#bbf7d0]"
  if (normalized === "in_progress") return "bg-[#eef4fc] text-[#2563EB] border border-[#bfdbfe]"
  if (normalized === "sent") return "bg-[#f8fafc] text-[#475569] border border-[#cbd5e1]"
  return "bg-folk-hover text-folk-secondary border border-folk-border"
}

export function canUserCloseIncident(
  incident: { createdBy: string | null },
  userId: string | null,
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin) return true
  if (!userId || !incident.createdBy) return true
  return incident.createdBy !== userId
}

export function getIncidentCloseBlockedReason(
  incident: { createdBy: string | null },
  userId: string | null,
  isSuperAdmin: boolean,
): string | null {
  if (canUserCloseIncident(incident, userId, isSuperAdmin)) return null
  return "The person who submitted this incident cannot close it. Another admin must review and close it."
}

export function getDefaultReportableForCategory(category: string): {
  isReportable: boolean
  ndisReportableCategory: NdisReportableCategory | null
} {
  const definition = getIncidentCategoryDefinition(category)
  if (!definition?.ndisCategory) return { isReportable: false, ndisReportableCategory: null }
  return { isReportable: true, ndisReportableCategory: definition.ndisCategory }
}

export function getNdisReportableTypeLabel(category: string | null | undefined): string {
  if (!category) return ""
  return NDIS_REPORTABLE_CATEGORY_LABELS[category as NdisReportableCategory] ?? category
}

export function getNdisNotificationDeadlineHint(category: string | null | undefined): string | null {
  if (!category) return null
  if (category === "death" || category === "serious_injury") {
    return "NDIS Rules: notify the NDIS Commission within 24 hours of the provider becoming aware."
  }
  return "NDIS Rules: notify the NDIS Commission within 5 business days of the provider becoming aware."
}

export function formatIncidentDate(dateStr: string): string {
  if (!dateStr) return "—"
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}

export function formatIncidentPickerDate(dateStr: string): string {
  if (!dateStr) return ""
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function getTodayIsoDate(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
}

export function getCurrentTimeValue(intervalMinutes = 15): string {
  const now = new Date()
  const totalMinutes = now.getHours() * 60 + now.getMinutes()
  const rounded = Math.round(totalMinutes / intervalMinutes) * intervalMinutes
  const hours = Math.floor(rounded / 60) % 24
  const minutes = rounded % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export const INCIDENT_NUMBER_PREFIX = "IN"

export function getIncidentDisplayId(incident: { id: string; incidentNumber?: string | null }): string {
  const number = incident.incidentNumber?.trim()
  if (number) return number
  return "Draft"
}

export function formatIncidentNumber(sequence: number): string {
  return `${INCIDENT_NUMBER_PREFIX}${String(sequence).padStart(4, "0")}`
}

export function parseIncidentNumber(value: string | null | undefined): number | null {
  if (!value) return null

  const trimmed = value.trim()

  const currentMatch = trimmed.match(/^IN(\d+)$/i)
  if (currentMatch) return Number.parseInt(currentMatch[1], 10)

  const structuredMatch = trimmed.match(/^INC-\d{4}-(\d+)$/i)
  if (structuredMatch) return Number.parseInt(structuredMatch[1], 10)

  const legacyIncMatch = trimmed.match(/^INC-(\d+)$/i)
  if (legacyIncMatch) return Number.parseInt(legacyIncMatch[1], 10)

  return null
}

export function getNextIncidentNumber(existingNumbers: string[]): string {
  const maxSequence = existingNumbers.reduce((max, value) => {
    const sequence = parseIncidentNumber(value)
    if (sequence === null) return max
    return Math.max(max, sequence)
  }, 0)

  return formatIncidentNumber(maxSequence + 1)
}

export function formatIncidentDateTime(dateStr: string): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export type IncidentSortKey =
  | "incident_date_desc"
  | "incident_date_asc"
  | "recorded_desc"
  | "recorded_asc"
  | "participant_asc"
  | "participant_desc"
  | "category_asc"
  | "status_asc"

export const DEFAULT_INCIDENT_SORT: IncidentSortKey = "incident_date_desc"

export const INCIDENT_SORT_OPTIONS: { value: IncidentSortKey; label: string }[] = [
  { value: "incident_date_desc", label: "Incident date (newest)" },
  { value: "incident_date_asc", label: "Incident date (oldest)" },
  { value: "recorded_desc", label: "Recorded (newest)" },
  { value: "recorded_asc", label: "Recorded (oldest)" },
  { value: "participant_asc", label: "Participant (A–Z)" },
  { value: "participant_desc", label: "Participant (Z–A)" },
  { value: "category_asc", label: "Category (A–Z)" },
  { value: "status_asc", label: "Status (A–Z)" },
]

const INCIDENT_SORT_KEY_SET = new Set<string>(INCIDENT_SORT_OPTIONS.map((option) => option.value))

const INVESTIGATION_STATUS_SORT_ORDER: Record<IncidentInvestigationStatus, number> = {
  sent: 0,
  in_progress: 1,
  completed: 2,
  closed: 3,
  not_an_incident: 4,
}

export function parseIncidentSortKey(value: string | null | undefined): IncidentSortKey {
  if (value && INCIDENT_SORT_KEY_SET.has(value)) return value as IncidentSortKey
  return DEFAULT_INCIDENT_SORT
}

export function getIncidentSortLabel(sortKey: IncidentSortKey): string {
  return INCIDENT_SORT_OPTIONS.find((option) => option.value === sortKey)?.label ?? "Incident date (newest)"
}

interface IncidentSortable {
  clientNames: string
  category: string
  incidentDate: string
  createdAt: string
  investigationStatus: string | null | undefined
}

export function sortIncidents<T extends IncidentSortable>(incidents: T[], sortKey: IncidentSortKey): T[] {
  const sorted = [...incidents]

  sorted.sort((left, right) => {
    switch (sortKey) {
      case "incident_date_desc":
        return right.incidentDate.localeCompare(left.incidentDate)
      case "incident_date_asc":
        return left.incidentDate.localeCompare(right.incidentDate)
      case "recorded_desc":
        return right.createdAt.localeCompare(left.createdAt)
      case "recorded_asc":
        return left.createdAt.localeCompare(right.createdAt)
      case "participant_asc":
        return left.clientNames.localeCompare(right.clientNames, "en-AU", { sensitivity: "base" })
      case "participant_desc":
        return right.clientNames.localeCompare(left.clientNames, "en-AU", { sensitivity: "base" })
      case "category_asc":
        return getIncidentCategoryLabel(left.category).localeCompare(
          getIncidentCategoryLabel(right.category),
          "en-AU",
          { sensitivity: "base" },
        )
      case "status_asc": {
        const leftStatus = INVESTIGATION_STATUS_SORT_ORDER[normalizeInvestigationStatus(left.investigationStatus)]
        const rightStatus = INVESTIGATION_STATUS_SORT_ORDER[normalizeInvestigationStatus(right.investigationStatus)]
        if (leftStatus !== rightStatus) return leftStatus - rightStatus
        return getInvestigationStatusLabel(normalizeInvestigationStatus(left.investigationStatus)).localeCompare(
          getInvestigationStatusLabel(normalizeInvestigationStatus(right.investigationStatus)),
          "en-AU",
          { sensitivity: "base" },
        )
      }
      default:
        return 0
    }
  })

  return sorted
}
