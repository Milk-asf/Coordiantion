import { getRecordId, type ListField } from "@/lib/lists/definitions"

export const UNASSIGNED_KANBAN_STAGE = "__unassigned__"

export interface KanbanGroup {
  key: string
  label: string
  records: unknown[]
}

export function getKanbanStageKey(field: ListField, record: unknown): string {
  const raw = field.get(record)
  if (raw === null || raw === undefined || raw === "") return UNASSIGNED_KANBAN_STAGE
  if (field.kind === "boolean") return raw ? "Yes" : "No"
  return String(raw)
}

export function getKanbanStageLabel(stageKey: string): string {
  if (stageKey === UNASSIGNED_KANBAN_STAGE) return "—"
  return stageKey
}

export function buildKanbanGroups(
  records: unknown[],
  field: ListField,
  customStages: string[] | null | undefined,
): KanbanGroup[] {
  const recordsByStage = new Map<string, unknown[]>()

  for (const record of records) {
    const key = getKanbanStageKey(field, record)
    const bucket = recordsByStage.get(key) ?? []
    bucket.push(record)
    recordsByStage.set(key, bucket)
  }

  const orderedKeys: string[] = []

  if (customStages?.length) {
    for (const stage of customStages) {
      if (stage && !orderedKeys.includes(stage)) orderedKeys.push(stage)
    }
  }

  const recordKeys = [...recordsByStage.keys()].sort((a, b) => {
    if (a === UNASSIGNED_KANBAN_STAGE) return 1
    if (b === UNASSIGNED_KANBAN_STAGE) return -1
    return getKanbanStageLabel(a).localeCompare(getKanbanStageLabel(b))
  })

  for (const key of recordKeys) {
    if (!orderedKeys.includes(key)) orderedKeys.push(key)
  }

  return orderedKeys.map((key) => ({
    key,
    label: getKanbanStageLabel(key),
    records: recordsByStage.get(key) ?? [],
  }))
}

/** Kanban columns from list-defined stages and per-record assignments (no source field grouping). */
export function buildCustomStageKanbanGroups(
  records: unknown[],
  customStages: string[] | null | undefined,
  recordStages: Record<string, string> | null | undefined,
): KanbanGroup[] {
  const stages = (customStages ?? []).filter(Boolean)
  const assignments = recordStages ?? {}
  const recordsByStage = new Map<string, unknown[]>()
  const unassigned: unknown[] = []

  for (const stage of stages) {
    recordsByStage.set(stage, [])
  }

  records.forEach((record, index) => {
    const recordId = getRecordId(record, index)
    const stage = assignments[recordId]
    if (stage && recordsByStage.has(stage)) {
      recordsByStage.get(stage)!.push(record)
      return
    }
    unassigned.push(record)
  })

  const groups: KanbanGroup[] = [
    {
      key: UNASSIGNED_KANBAN_STAGE,
      label: "Unassigned",
      records: unassigned,
    },
  ]

  for (const stage of stages) {
    groups.push({
      key: stage,
      label: stage,
      records: recordsByStage.get(stage) ?? [],
    })
  }

  return groups
}

export function parseKanbanStageValue(
  sourceKey: string,
  fieldKey: string,
  field: ListField,
  stageKey: string,
): unknown {
  if (stageKey === UNASSIGNED_KANBAN_STAGE) {
    if (field.kind === "boolean") return false
    return ""
  }

  if (field.kind === "boolean") return stageKey === "Yes"

  if (sourceKey === "clients" && fieldKey === "status") {
    if (stageKey === "Active") return "active"
    if (stageKey === "Archived") return "archived"
  }

  return stageKey
}

export function canUpdateKanbanField(sourceKey: string, fieldKey: string): boolean {
  return UPDATABLE_KANBAN_FIELDS.has(`${sourceKey}:${fieldKey}`)
}

const UPDATABLE_KANBAN_FIELDS = new Set([
  "tasks:status",
  "incidents:incidentStatus",
  "incidents:investigationStatus",
  "clients:status",
  "staff:status",
  "staff:department",
  "staff:role",
  "staff:employmentType",
  "shifts:status",
  "timesheets:status",
  "timesheets.travelClaims:status",
  "reimbursements:status",
  "forms:status",
])
