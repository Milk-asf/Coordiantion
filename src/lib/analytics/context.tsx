"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import {
  buildSpaceFromTemplate,
  createEmptySpace,
  normalizeWidget,
  spaceToInsertRow,
  type AnalyticsSpace,
  type AnalyticsWidget,
  type SpaceTemplate,
} from "./definitions"

interface SpaceRow {
  id: string
  workspace_id: string
  name: string
  description: string | null
  icon: string | null
  icon_color: string | null
  widgets: AnalyticsWidget[] | null
  created_by: string | null
  created_by_name: string | null
  created_at: string
  updated_at: string
}

function storageKey(workspaceId: string | undefined) {
  return workspaceId ? `analytics-spaces-${workspaceId}` : "analytics-spaces"
}

function loadLocal(workspaceId: string | undefined): AnalyticsSpace[] {
  if (typeof window === "undefined" || !workspaceId) return []
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as AnalyticsSpace[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((space) => ({ ...space, widgets: (space.widgets ?? []).map(normalizeWidget) }))
  } catch {
    return []
  }
}

function saveLocal(workspaceId: string | undefined, spaces: AnalyticsSpace[]) {
  if (typeof window === "undefined" || !workspaceId) return
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(spaces))
}

function dbToSpace(row: SpaceRow): AnalyticsSpace {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name || "Untitled space",
    description: row.description || "",
    icon: row.icon || "📊",
    iconColor: row.icon_color || "#3b82f6",
    widgets: Array.isArray(row.widgets) ? row.widgets.map(normalizeWidget) : [],
    createdBy: row.created_by ?? "",
    createdByName: row.created_by_name || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

interface AnalyticsContextValue {
  spaces: AnalyticsSpace[]
  isLoading: boolean
  fetchError: string | null
  getSpace: (id: string) => AnalyticsSpace | undefined
  createSpace: (params?: { name?: string }) => Promise<AnalyticsSpace | null>
  createSpaceFromTemplate: (template: SpaceTemplate) => Promise<AnalyticsSpace | null>
  updateSpace: (id: string, updates: Partial<AnalyticsSpace>) => Promise<void>
  deleteSpace: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace, currentUserName } = useWorkspace()
  const [spaces, setSpaces] = useState<AnalyticsSpace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const persist = useCallback(
    (updater: AnalyticsSpace[] | ((prev: AnalyticsSpace[]) => AnalyticsSpace[])) => {
      setSpaces((prev) => {
        const next = typeof updater === "function" ? (updater as (p: AnalyticsSpace[]) => AnalyticsSpace[])(prev) : updater
        saveLocal(activeWorkspace?.id, next)
        return next
      })
    },
    [activeWorkspace?.id],
  )

  const fetchSpaces = useCallback(async () => {
    if (!activeWorkspace) {
      setSpaces([])
      setIsLoading(false)
      return
    }

    const supabase = isSupabaseConfigured() ? createClient() : null
    if (!supabase) {
      setSpaces(loadLocal(activeWorkspace.id))
      setFetchError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setFetchError(null)
    try {
      const { data, error } = await supabase
        .from("analytics_spaces")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("updated_at", { ascending: false })

      if (error || !data) {
        setFetchError(error?.message || "Failed to load analytics")
        setSpaces(loadLocal(activeWorkspace.id))
      } else {
        const mapped = (data as SpaceRow[]).map(dbToSpace)
        saveLocal(activeWorkspace.id, mapped)
        setSpaces(mapped)
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load analytics")
      setSpaces(loadLocal(activeWorkspace.id))
    }
    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => {
    fetchSpaces()
  }, [fetchSpaces])

  const insertSpace = useCallback(
    async (space: AnalyticsSpace): Promise<AnalyticsSpace> => {
      const supabase = isSupabaseConfigured() ? createClient() : null
      if (!supabase) {
        persist((prev) => [space, ...prev])
        return space
      }
      const { data, error } = await supabase.from("analytics_spaces").insert(spaceToInsertRow(space)).select("*").single()
      if (error || !data) {
        persist((prev) => [space, ...prev])
        return space
      }
      const saved = dbToSpace(data as SpaceRow)
      persist((prev) => [saved, ...prev])
      return saved
    },
    [persist],
  )

  const createSpace = useCallback(
    async (params?: { name?: string }): Promise<AnalyticsSpace | null> => {
      if (!activeWorkspace) return null
      return insertSpace(
        createEmptySpace({ workspaceId: activeWorkspace.id, createdBy: "", createdByName: currentUserName, name: params?.name }),
      )
    },
    [activeWorkspace, currentUserName, insertSpace],
  )

  const createSpaceFromTemplate = useCallback(
    async (template: SpaceTemplate): Promise<AnalyticsSpace | null> => {
      if (!activeWorkspace) return null
      return insertSpace(
        buildSpaceFromTemplate(template, { workspaceId: activeWorkspace.id, createdBy: "", createdByName: currentUserName }),
      )
    },
    [activeWorkspace, currentUserName, insertSpace],
  )

  const updateSpace = useCallback(
    async (id: string, updates: Partial<AnalyticsSpace>) => {
      if (!activeWorkspace) return
      const updatedAt = new Date().toISOString()
      let nextSpace: AnalyticsSpace | null = null
      persist((prev) =>
        prev.map((space) => {
          if (space.id !== id) return space
          nextSpace = { ...space, ...updates, updatedAt }
          return nextSpace
        }),
      )
      if (!nextSpace) return
      const supabase = isSupabaseConfigured() ? createClient() : null
      if (supabase) await supabase.from("analytics_spaces").update(spaceToInsertRow(nextSpace)).eq("id", id)
    },
    [activeWorkspace, persist],
  )

  const deleteSpace = useCallback(
    async (id: string) => {
      persist((prev) => prev.filter((space) => space.id !== id))
      const supabase = isSupabaseConfigured() ? createClient() : null
      if (supabase) await supabase.from("analytics_spaces").delete().eq("id", id)
    },
    [persist],
  )

  const getSpace = useCallback((id: string) => spaces.find((space) => space.id === id), [spaces])

  return (
    <AnalyticsContext.Provider
      value={{
        spaces,
        isLoading,
        fetchError,
        getSpace,
        createSpace,
        createSpaceFromTemplate,
        updateSpace,
        deleteSpace,
        refetch: fetchSpaces,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext)
  if (!ctx) throw new Error("useAnalytics must be used within AnalyticsProvider")
  return ctx
}
