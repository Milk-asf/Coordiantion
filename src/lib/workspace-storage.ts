export const ACTIVE_WORKSPACE_STORAGE_KEY = "coordination-active-workspace-id"

export function readStoredWorkspaceId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY)
}

export function writeStoredWorkspaceId(workspaceId: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspaceId)
}
