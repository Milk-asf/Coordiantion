export type IncidentStatus = "confirmed" | "alleged"

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

export function getDefaultReportableForCategory(category: string): {
  isReportable: boolean
  ndisReportableCategory: NdisReportableCategory | null
} {
  const definition = getIncidentCategoryDefinition(category)
  if (!definition?.ndisCategory) return { isReportable: false, ndisReportableCategory: null }
  return { isReportable: true, ndisReportableCategory: definition.ndisCategory }
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
