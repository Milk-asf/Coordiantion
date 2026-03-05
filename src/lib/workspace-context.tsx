"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import type { Workspace } from "@/lib/types"

interface WorkspaceContextType {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  switchWorkspace: (id: string) => void
  createWorkspace: (name: string) => Promise<Workspace | null>
  isLoading: boolean
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) { setIsLoading(false); return }
    const supabase = createClient()
    if (!supabase) { setIsLoading(false); return }

    supabase.from("workspaces").select("*").then(({ data }) => {
      if (data && data.length > 0) {
        setWorkspaces(data)
        const savedId = typeof window !== "undefined" ? localStorage.getItem("active-workspace") : null
        const active = data.find((w) => w.id === savedId) || data[0]
        setActiveWorkspace(active)
        if (typeof window !== "undefined") localStorage.setItem("active-workspace", active.id)
      }
      setIsLoading(false)
    })
  }, [])

  const switchWorkspace = useCallback((id: string) => {
    const ws = workspaces.find((w) => w.id === id)
    if (!ws) return
    setActiveWorkspace(ws)
    localStorage.setItem("active-workspace", ws.id)
  }, [workspaces])

  const createWorkspace = useCallback(async (name: string): Promise<Workspace | null> => {
    if (!isSupabaseConfigured()) return null
    const supabase = createClient()
    if (!supabase) return null

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: wsId, error } = await supabase.rpc("create_workspace_for_user", {
      workspace_name: name,
      owner_id: user.id,
    })
    if (error || !wsId) return null

    const { data: ws } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", wsId)
      .single()

    if (!ws) return null
    setWorkspaces((prev) => [...prev, ws])
    setActiveWorkspace(ws)
    localStorage.setItem("active-workspace", ws.id)
    return ws
  }, [])

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, switchWorkspace, createWorkspace, isLoading }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider")
  return ctx
}
