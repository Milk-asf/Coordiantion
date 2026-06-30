const STORAGE_PREFIX = "coordination:viewed-incidents"

function getStorageKey(workspaceId: string) {
  return `${STORAGE_PREFIX}:${workspaceId}`
}

export function loadViewedIncidentIds(workspaceId: string | undefined): Set<string> {
  if (!workspaceId || typeof window === "undefined") return new Set()

  try {
    const stored = localStorage.getItem(getStorageKey(workspaceId))
    if (stored) return new Set(JSON.parse(stored) as string[])
  } catch {
    /* fall through */
  }

  return new Set()
}

export function hasViewedIncidentsStorage(workspaceId: string | undefined): boolean {
  if (!workspaceId || typeof window === "undefined") return false
  return localStorage.getItem(getStorageKey(workspaceId)) !== null
}

export function saveViewedIncidentIds(workspaceId: string, ids: Set<string>) {
  if (typeof window === "undefined") return
  localStorage.setItem(getStorageKey(workspaceId), JSON.stringify([...ids]))
}

export function getUnviewedIncidentCount(incidentIds: string[], viewedIds: Set<string>): number {
  return incidentIds.filter((id) => !viewedIds.has(id)).length
}
