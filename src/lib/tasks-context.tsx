"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import { useClients } from "@/lib/hooks/use-clients"
import type { Task, Attachment } from "@/lib/types"

interface TaskRow {
  id: string
  title: string
  description: string | null
  status: Task["status"] | null
  assignee: string | null
  client_name: string | null
  client_id: string | null
  due_date: string | null
  attachments: Attachment[] | null
  charge_type: string | null
  time_spent: number | null
  secondary_charge_type: string | null
  secondary_time_spent: number | null
  is_check_up: boolean | null
}

interface TaskRowUpdate {
  updated_at?: string
  title?: string
  description?: string
  status?: Task["status"]
  assignee?: string
  client_name?: string
  client_id?: string | null
  due_date?: string | null
  attachments?: Attachment[]
  charge_type?: string
  time_spent?: number
  secondary_charge_type?: string
  secondary_time_spent?: number
  is_check_up?: boolean
}

function dbToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    status: row.status || "todo",
    assignee: row.assignee || "",
    client: row.client_name || "",
    clientId: row.client_id || null,
    dueDate: row.due_date || null,
    attachments: row.attachments || [],
    chargeType: row.charge_type || "",
    timeSpent: row.time_spent || 0,
    secondaryChargeType: row.secondary_charge_type || "",
    secondaryTimeSpent: row.secondary_time_spent || 0,
    isCheckUp: row.is_check_up || false,
  }
}

function getNextCheckUpDate(currentDue: string | null, period: string): string {
  const base = currentDue ? new Date(currentDue + "T00:00:00") : new Date()
  const next = new Date(base)
  const days = parseInt(period, 10)
  if (/^\d+$/.test(period) && days > 0) {
    next.setDate(next.getDate() + days)
  } else {
    switch (period) {
      case "Weekly": next.setDate(next.getDate() + 7); break
      case "Fortnightly": next.setDate(next.getDate() + 14); break
      case "Monthly": next.setMonth(next.getMonth() + 1); break
      case "Quarterly": next.setMonth(next.getMonth() + 3); break
      default: next.setMonth(next.getMonth() + 1); break
    }
  }
  return next.toISOString().split("T")[0]
}

const PAGE_SIZE = 50

interface TasksContextValue {
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  isLoading: boolean
  fetchError: string | null
  hasMore: boolean
  isLoadingMore: boolean
  loadMore: () => Promise<void>
  addTask: (input: {
    title: string
    description?: string
    status?: Task["status"]
    assignee?: string
    client?: string
    clientId?: string | null
    dueDate?: string | null
    attachments?: Attachment[]
    chargeType?: string
    timeSpent?: number
    secondaryChargeType?: string
    secondaryTimeSpent?: number
    isCheckUp?: boolean
  }) => Promise<Task | null>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

const TasksContext = createContext<TasksContextValue | null>(null)

export function TasksProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace } = useWorkspace()
  const { clients } = useClients()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const fetchTasks = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
      setTasks([])
      setIsLoading(false)
      setHasMore(false)
      return
    }
    const supabase = createClient()
    if (!supabase) { setTasks([]); setIsLoading(false); setHasMore(false); return }

    setIsLoading(true)
    setFetchError(null)
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: true })
        .range(0, PAGE_SIZE - 1)

      if (error) {
        setFetchError(error.message)
        setTasks([])
        setHasMore(false)
      } else {
        const rows = data || []
        setTasks(rows.map(dbToTask))
        setHasMore(rows.length === PAGE_SIZE)
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load tasks")
      setTasks([])
      setHasMore(false)
    }
    setIsLoading(false)
  }, [activeWorkspace])

  const loadMore = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured() || !hasMore || isLoadingMore) return
    const supabase = createClient()
    if (!supabase) return

    setIsLoadingMore(true)
    try {
      const offset = tasks.length
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)

      if (!error && data) {
        setTasks((prev) => [...prev, ...data.map(dbToTask)])
        setHasMore(data.length === PAGE_SIZE)
      }
    } catch {
      // silently fail on load-more
    }
    setIsLoadingMore(false)
  }, [activeWorkspace, hasMore, isLoadingMore, tasks.length])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  useEffect(() => {
    if (!activeWorkspace || !isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel(`tasks-${activeWorkspace.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `workspace_id=eq.${activeWorkspace.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newTask = dbToTask(payload.new as TaskRow)
          setTasks((prev) => {
            if (prev.some((t) => t.id === newTask.id)) return prev
            return [...prev, newTask]
          })
        } else if (payload.eventType === 'UPDATE') {
          const updated = dbToTask(payload.new as TaskRow)
          setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))
        } else if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as { id: string }).id
          setTasks((prev) => prev.filter((t) => t.id !== oldId))
        }
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [activeWorkspace])

  const addTask = useCallback(async (input: {
    title: string
    description?: string
    status?: Task["status"]
    assignee?: string
    client?: string
    clientId?: string | null
    dueDate?: string | null
    attachments?: Attachment[]
    chargeType?: string
    timeSpent?: number
    secondaryChargeType?: string
    secondaryTimeSpent?: number
    isCheckUp?: boolean
  }) => {
    if (!activeWorkspace || !isSupabaseConfigured()) return null
    const supabase = createClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        workspace_id: activeWorkspace.id,
        title: input.title,
        description: input.description || "",
        status: input.status || "todo",
        assignee: input.assignee || "",
        client_name: input.client || "",
        client_id: input.clientId || null,
        due_date: input.dueDate || null,
        attachments: input.attachments || [],
        charge_type: input.chargeType || "",
        time_spent: input.timeSpent || 0,
        secondary_charge_type: input.secondaryChargeType || "",
        secondary_time_spent: input.secondaryTimeSpent || 0,
        is_check_up: input.isCheckUp || false,
      })
      .select()
      .single()

    if (error || !data) return null
    const newTask = dbToTask(data)
    setTasks((prev) => [...prev, newTask])
    return newTask
  }, [activeWorkspace])

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const prevTask = tasks.find((t) => t.id === id)
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const dbUpdates: TaskRowUpdate = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.assignee !== undefined) dbUpdates.assignee = updates.assignee
    if (updates.client !== undefined) dbUpdates.client_name = updates.client
    if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate || null
    if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments
    if (updates.chargeType !== undefined) dbUpdates.charge_type = updates.chargeType
    if (updates.timeSpent !== undefined) dbUpdates.time_spent = updates.timeSpent
    if (updates.secondaryChargeType !== undefined) dbUpdates.secondary_charge_type = updates.secondaryChargeType
    if (updates.secondaryTimeSpent !== undefined) dbUpdates.secondary_time_spent = updates.secondaryTimeSpent
    if (updates.isCheckUp !== undefined) dbUpdates.is_check_up = updates.isCheckUp

    await supabase.from("tasks").update(dbUpdates).eq("id", id)

    if (updates.status === "done" && prevTask?.status !== "done" && (prevTask?.isCheckUp || updates.isCheckUp) && activeWorkspace) {
      const task = { ...prevTask!, ...updates }
      const client = clients.find((c) => c.id === task.clientId || c.name === task.client || c.displayName === task.client)
      const period = client?.participant?.checkInPeriod || "Monthly"
      if (period !== "As needed") {
        const nextDue = getNextCheckUpDate(task.dueDate, period)
        const { data: newRow } = await supabase
          .from("tasks")
          .insert({
            workspace_id: activeWorkspace.id,
            title: task.title || "Check-up",
            description: "",
            status: "todo",
            assignee: task.assignee || "",
            client_name: task.client || "",
            client_id: task.clientId || null,
            due_date: nextDue,
            attachments: [],
            charge_type: task.chargeType || "",
            time_spent: 0,
            secondary_charge_type: "",
            secondary_time_spent: 0,
            is_check_up: true,
          })
          .select()
          .single()

        if (newRow) {
          const nextTask = dbToTask(newRow)
          setTasks((prev) => [...prev, nextTask])
        }
      }
    }
  }, [tasks, clients, activeWorkspace])

  const deleteTask = useCallback(async (id: string) => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("tasks").delete().eq("id", id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <TasksContext.Provider value={{ tasks, setTasks, isLoading, fetchError, hasMore, isLoadingMore, loadMore, addTask, updateTask, deleteTask, refetch: fetchTasks }}>
      {children}
    </TasksContext.Provider>
  )
}

export function useTasks() {
  const ctx = useContext(TasksContext)
  if (!ctx) throw new Error("useTasks must be used within TasksProvider")
  return ctx
}
