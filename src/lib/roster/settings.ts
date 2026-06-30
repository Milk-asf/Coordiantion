import type { RosterAssigneeView, RosterSessionTypeDefinition, RosterViewMode, SessionTypeTone } from "@/lib/roster/types"
import {
  defaultRosterComplianceSettings,
  normalizeRosterComplianceSettings,
  type RosterComplianceSettings,
} from "@/lib/roster/compliance-settings"
import { hashToChipTone, isFolkChipTone, type FolkChipTone } from "@/lib/chip-colors"

export const ROSTER_SETTINGS_STORAGE_KEY = "coordination:roster-settings"
export const ROSTER_SETTINGS_CHANGED_EVENT = "roster-settings-changed"

export const defaultSessionTypes: RosterSessionTypeDefinition[] = [
  { id: "none", label: "None", tone: "slate" },
  { id: "active-nights", label: "Active nights", tone: "purple" },
  { id: "sleepover", label: "Sleepover", tone: "blue" },
  { id: "nursing", label: "Nursing", tone: "rose" },
  { id: "buddy-shift", label: "Buddy shift", tone: "green" },
  { id: "training", label: "Training", tone: "yellow" },
  { id: "induction", label: "Induction", tone: "orange" },
]

export interface RosterSettings {
  defaultViewMode: RosterViewMode
  defaultAssigneeView: RosterAssigneeView
  weekStartsOn: 0 | 1
  defaultShiftDurationHours: number
  showConflictWarnings: boolean
  sessionTypes: RosterSessionTypeDefinition[]
  compliance: RosterComplianceSettings
}

export const defaultRosterSettings: RosterSettings = {
  defaultViewMode: "week",
  defaultAssigneeView: "employees",
  weekStartsOn: 1,
  defaultShiftDurationHours: 1,
  showConflictWarnings: true,
  sessionTypes: defaultSessionTypes,
  compliance: defaultRosterComplianceSettings,
}

function normalizeSessionTypeTone(value: unknown, id: string): SessionTypeTone {
  if (isFolkChipTone(value)) return value
  return hashToChipTone(id)
}

function mergeDefaultSessionTypes(stored: RosterSessionTypeDefinition[]): RosterSessionTypeDefinition[] {
  const storedById = new Map(stored.map((item) => [item.id, item]))
  const defaultIds = new Set(defaultSessionTypes.map((item) => item.id))

  const merged = defaultSessionTypes.map((item) => storedById.get(item.id) ?? item)
  for (const item of stored) {
    if (!defaultIds.has(item.id)) merged.push(item)
  }

  return merged
}

function normalizeSessionTypes(value: unknown): RosterSessionTypeDefinition[] {
  if (!Array.isArray(value) || value.length === 0) return defaultSessionTypes

  const normalized = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const record = entry as Partial<RosterSessionTypeDefinition>
      const label = typeof record.label === "string" ? record.label.trim() : ""
      const id = typeof record.id === "string" ? record.id.trim() : ""
      if (!label || !id) return null
      return {
        id,
        label,
        tone: normalizeSessionTypeTone(record.tone, id),
      }
    })
    .filter(Boolean) as RosterSessionTypeDefinition[]

  const unique: RosterSessionTypeDefinition[] = []
  for (const item of normalized) {
    if (unique.some((existing) => existing.id === item.id)) continue
    unique.push(item)
  }

  return mergeDefaultSessionTypes(unique.length > 0 ? unique : defaultSessionTypes)
}

function normalizeSettings(value: Partial<RosterSettings>): RosterSettings {
  return {
    defaultViewMode: value.defaultViewMode === "day" ? "day" : "week",
    defaultAssigneeView: value.defaultAssigneeView === "clients" ? "clients" : "employees",
    weekStartsOn: value.weekStartsOn === 0 ? 0 : 1,
    defaultShiftDurationHours: clampDuration(value.defaultShiftDurationHours),
    showConflictWarnings: value.showConflictWarnings ?? defaultRosterSettings.showConflictWarnings,
    sessionTypes: normalizeSessionTypes(value.sessionTypes),
    compliance: normalizeRosterComplianceSettings(value.compliance),
  }
}

export function slugifySessionTypeId(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function createSessionTypeId(label: string, existing: RosterSessionTypeDefinition[]): string {
  const base = slugifySessionTypeId(label) || "session-type"
  let id = base
  let suffix = 2
  while (existing.some((item) => item.id === id)) {
    id = `${base}-${suffix}`
    suffix += 1
  }
  return id
}

export function getNextSessionTypeTone(existing: RosterSessionTypeDefinition[]): SessionTypeTone {
  const used = new Set(existing.map((item) => item.tone ?? hashToChipTone(item.id)))
  const cycle: SessionTypeTone[] = ["blue", "green", "purple", "orange", "rose", "yellow", "slate"]
  return cycle.find((tone) => !used.has(tone)) ?? hashToChipTone(`${existing.length}-${Date.now()}`)
}

export function getSessionTypeTone(
  id: string,
  sessionTypes: RosterSessionTypeDefinition[] = getRosterSettings().sessionTypes
): FolkChipTone {
  const match = sessionTypes.find((item) => item.id === id)
  return match?.tone ?? hashToChipTone(id)
}

export function buildSessionTypeToneMap(
  sessionTypes: RosterSessionTypeDefinition[] = getRosterSettings().sessionTypes
): Record<string, FolkChipTone> {
  return Object.fromEntries(
    sessionTypes.map((item) => [item.id, item.tone ?? hashToChipTone(item.id)])
  )
}

export function getSessionTypeLabel(
  id: string,
  sessionTypes: RosterSessionTypeDefinition[] = getRosterSettings().sessionTypes
): string {
  return sessionTypes.find((item) => item.id === id)?.label ?? id
}

export function resolveSessionType(
  value: unknown,
  sessionTypes: RosterSessionTypeDefinition[] = getRosterSettings().sessionTypes
): string {
  const id = typeof value === "string" ? value.trim() : ""
  if (id && sessionTypes.some((item) => item.id === id)) return id
  return sessionTypes[0]?.id ?? defaultSessionTypes[0].id
}

function clampDuration(value: number | undefined): number {
  const allowed = [1, 2, 3, 4]
  if (value && allowed.includes(value)) return value
  return defaultRosterSettings.defaultShiftDurationHours
}

export function loadRosterSettings(): RosterSettings {
  if (typeof window === "undefined") return defaultRosterSettings

  try {
    const stored = window.localStorage.getItem(ROSTER_SETTINGS_STORAGE_KEY)
    if (!stored) return defaultRosterSettings
    return normalizeSettings(JSON.parse(stored) as Partial<RosterSettings>)
  } catch {
    return defaultRosterSettings
  }
}

export function saveRosterSettings(settings: RosterSettings) {
  if (typeof window === "undefined") return

  const normalized = normalizeSettings(settings)
  window.localStorage.setItem(ROSTER_SETTINGS_STORAGE_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(ROSTER_SETTINGS_CHANGED_EVENT, { detail: normalized }))
}

export function getRosterSettings(): RosterSettings {
  return loadRosterSettings()
}
