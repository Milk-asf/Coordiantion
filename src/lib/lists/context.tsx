"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import { createList, listIdsMatch, resolveListDbId, type CustomList, type ListColumn, type ListViewMode } from "./definitions"

interface ListRow {
  id: string
  workspace_id: string
  name: string
  icon: string | null
  icon_color: string | null
  source: string
  view: ListViewMode | null
  columns: ListColumn[] | null
  kanban_field: string | null
  kanban_stages: string[] | null
  kanban_record_stages: Record<string, string> | null
  kanban_stage_colors?: Record<string, string> | null
  record_ids: string[] | null
  custom_values: Record<string, Record<string, unknown>> | null
  pinned: boolean | null
  created_by: string | null
  created_by_name: string | null
  created_at: string
  updated_at: string
}

function storageKey(workspaceId: string | undefined) {
  return workspaceId ? `custom-lists-${workspaceId}` : "custom-lists"
}

function loadLocal(workspaceId: string | undefined): CustomList[] {
  if (typeof window === "undefined" || !workspaceId) return []
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as CustomList[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((list) => ({
      ...list,
      id: resolveListDbId(list.id) ?? list.id,
    }))
  } catch {
    return []
  }
}

function saveLocal(workspaceId: string | undefined, lists: CustomList[]) {
  if (typeof window === "undefined" || !workspaceId) return
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(lists))
}

function dbToList(row: ListRow): CustomList {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name || "Untitled list",
    icon: row.icon || "📋",
    iconColor: row.icon_color || "#3BA3F8",
    source: row.source,
    view: row.view || "table",
    columns: Array.isArray(row.columns) ? row.columns : [],
    kanbanField: row.kanban_field,
    kanbanStages: Array.isArray(row.kanban_stages) ? row.kanban_stages : null,
    kanbanRecordStages:
      row.kanban_record_stages && typeof row.kanban_record_stages === "object"
        ? row.kanban_record_stages
        : null,
    kanbanStageColors:
      row.kanban_stage_colors && typeof row.kanban_stage_colors === "object"
        ? row.kanban_stage_colors
        : null,
    recordIds: Array.isArray(row.record_ids) ? row.record_ids : [],
    customValues:
      row.custom_values && typeof row.custom_values === "object" ? row.custom_values : {},
    pinned: Boolean(row.pinned),
    createdBy: row.created_by ?? "",
    createdByName: row.created_by_name || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function listToRow(list: CustomList) {
  return {
    id: resolveListDbId(list.id) ?? list.id,
    workspace_id: list.workspaceId,
    name: list.name,
    icon: list.icon,
    icon_color: list.iconColor,
    source: list.source,
    view: list.view,
    columns: list.columns,
    kanban_field: list.kanbanField,
    kanban_stages: list.kanbanStages,
    kanban_record_stages: list.kanbanRecordStages,
    // Only sent once a colour is set, so lists keep saving before the
    // kanban_stage_colors migration (061) is applied.
    ...(list.kanbanStageColors ? { kanban_stage_colors: list.kanbanStageColors } : {}),
    record_ids: list.recordIds,
    custom_values: list.customValues ?? {},
    pinned: list.pinned,
    created_by_name: list.createdByName,
    created_at: list.createdAt,
    updated_at: list.updatedAt,
  }
}

interface ListsContextValue {
  lists: CustomList[]
  isLoading: boolean
  fetchError: string | null
  getList: (id: string) => CustomList | undefined
  createCustomList: (params: {
    name?: string
    icon?: string
    iconColor?: string
    source: string
    columns?: string[]
    view?: ListViewMode
    kanbanField?: string | null
  }) => Promise<CustomList | null>
  updateList: (id: string, updates: Partial<CustomList>) => Promise<void>
  togglePin: (id: string) => Promise<void>
  deleteList: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

const ListsContext = createContext<ListsContextValue | null>(null)

export function ListsProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace, currentUserName } = useWorkspace()
  const [lists, setLists] = useState<CustomList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const persist = useCallback(
    (updater: CustomList[] | ((prev: CustomList[]) => CustomList[])) => {
      setLists((prev) => {
        const next = typeof updater === "function" ? (updater as (p: CustomList[]) => CustomList[])(prev) : updater
        saveLocal(activeWorkspace?.id, next)
        return next
      })
    },
    [activeWorkspace?.id],
  )

  const fetchLists = useCallback(async () => {
    if (!activeWorkspace) {
      setLists([])
      setIsLoading(false)
      return
    }

    const supabase = isSupabaseConfigured() ? createClient() : null
    if (!supabase) {
      setLists(loadLocal(activeWorkspace.id))
      setFetchError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setFetchError(null)
    try {
      const { data, error } = await supabase
        .from("custom_lists")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("updated_at", { ascending: false })

      if (error || !data) {
        // Table may not exist yet — fall back to local persistence.
        setLists(loadLocal(activeWorkspace.id))
      } else {
        const mapped = (data as ListRow[]).map(dbToList)
        saveLocal(activeWorkspace.id, mapped)
        setLists(mapped)
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load lists")
      setLists(loadLocal(activeWorkspace.id))
    }
    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  const createCustomList = useCallback(
    async (params: {
      name?: string
      icon?: string
      iconColor?: string
      source: string
      columns?: string[]
      view?: ListViewMode
      kanbanField?: string | null
    }): Promise<CustomList | null> => {
      if (!activeWorkspace) return null
      const list = createList({
        workspaceId: activeWorkspace.id,
        createdByName: currentUserName,
        name: params.name,
        icon: params.icon,
        iconColor: params.iconColor,
        source: params.source,
        columns: params.columns,
        view: params.view,
        kanbanField: params.kanbanField,
      })
      const supabase = isSupabaseConfigured() ? createClient() : null
      if (!supabase) {
        persist((prev) => [list, ...prev])
        return list
      }
      const { data, error } = await supabase.from("custom_lists").insert(listToRow(list)).select("*").single()
      if (error || !data) {
        persist((prev) => [list, ...prev])
        return list
      }
      const saved = dbToList(data as ListRow)
      persist((prev) => [saved, ...prev])
      return saved
    },
    [activeWorkspace, currentUserName, persist],
  )

  const updateList = useCallback(
    async (id: string, updates: Partial<CustomList>) => {
      if (!activeWorkspace) return
      const updatedAt = new Date().toISOString()
      let nextList: CustomList | null = null
      persist((prev) =>
        prev.map((list) => {
          if (!listIdsMatch(list.id, id)) return list
          nextList = { ...list, ...updates, updatedAt }
          return nextList
        }),
      )
      if (!nextList) return
      const supabase = isSupabaseConfigured() ? createClient() : null
      const dbId = resolveListDbId(id)
      if (supabase && dbId) {
        await supabase.from("custom_lists").update(listToRow(nextList)).eq("id", dbId).eq("workspace_id", activeWorkspace.id)
      }
    },
    [activeWorkspace, persist],
  )

  const togglePin = useCallback(
    async (id: string) => {
      const current = lists.find((list) => list.id === id)
      if (!current) return
      await updateList(id, { pinned: !current.pinned })
    },
    [lists, updateList],
  )

  const deleteList = useCallback(
    async (id: string) => {
      const target = lists.find((list) => listIdsMatch(list.id, id))
      const workspaceId = target?.workspaceId ?? activeWorkspace?.id

      persist((prev) => prev.filter((list) => !listIdsMatch(list.id, id)))

      const supabase = isSupabaseConfigured() ? createClient() : null
      if (!supabase || !workspaceId) return

      const dbIds = new Set<string>()
      const resolvedId = resolveListDbId(id)
      if (resolvedId) dbIds.add(resolvedId)
      if (target) {
        const targetResolvedId = resolveListDbId(target.id)
        if (targetResolvedId) dbIds.add(targetResolvedId)
      }

      for (const dbId of dbIds) {
        const { error } = await supabase
          .from("custom_lists")
          .delete()
          .eq("id", dbId)
          .eq("workspace_id", workspaceId)

        if (error && error.code !== "22P02") {
          console.warn("[lists] custom_lists delete failed:", error.message, { dbId, workspaceId })
        }
      }
    },
    [activeWorkspace?.id, lists, persist],
  )

  const getList = useCallback((id: string) => {
    const list = lists.find((item) => listIdsMatch(item.id, id))
    if (!list) return undefined
    return { ...list, recordIds: list.recordIds ?? [], customValues: list.customValues ?? {} }
  }, [lists])

  return (
    <ListsContext.Provider
      value={{ lists, isLoading, fetchError, getList, createCustomList, updateList, togglePin, deleteList, refetch: fetchLists }}
    >
      {children}
    </ListsContext.Provider>
  )
}

export function useLists() {
  const ctx = useContext(ListsContext)
  if (!ctx) throw new Error("useLists must be used within ListsProvider")
  return ctx
}
