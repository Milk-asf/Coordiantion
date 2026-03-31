"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { Task, Attachment } from "@/lib/types"

/* eslint-disable @typescript-eslint/no-explicit-any */
function dbToTask(row: any): Task {
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
  }
}

export function useTasks() {
  const { activeWorkspace } = useWorkspace()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
      setTasks([])
      setIsLoading(false)
      return
    }
    const supabase = createClient()
    if (!supabase) { setTasks([]); setIsLoading(false); return }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: true })

      if (error || !data) {
        setTasks([])
      } else {
        setTasks(data.map(dbToTask))
      }
    } catch {
      setTasks([])
    }
    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => { fetchTasks() }, [fetchTasks])

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
      })
      .select()
      .single()

    if (error || !data) return null
    const newTask = dbToTask(data)
    setTasks((prev) => [...prev, newTask])
    return newTask
  }, [activeWorkspace])

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t))

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() }
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

    await supabase.from("tasks").update(dbUpdates).eq("id", id)
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("tasks").delete().eq("id", id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { tasks, setTasks, isLoading, addTask, updateTask, deleteTask, refetch: fetchTasks }
}
