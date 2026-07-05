"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import {
  readStoredWorkspaceId,
  writeStoredWorkspaceId,
} from "@/lib/workspace-storage"
import type { Workspace } from "@/lib/types"

interface WorkspaceContextType {
  activeWorkspace: Workspace | null
  workspaces: Workspace[]
  switchWorkspace: (workspaceId: string) => void
  renameWorkspace: (name: string) => Promise<void>
  isLoading: boolean
  currentUserName: string
  currentUserEmail: string
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

function pickActiveWorkspace(allWorkspaces: Workspace[]): Workspace | null {
  if (allWorkspaces.length === 0) return null
  const storedId = readStoredWorkspaceId()
  if (storedId) {
    const match = allWorkspaces.find((workspace) => workspace.id === storedId)
    if (match) return match
  }
  return allWorkspaces[0]
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserName, setCurrentUserName] = useState("You")
  const [currentUserEmail, setCurrentUserEmail] = useState("")

  useEffect(() => {
    if (!isSupabaseConfigured()) { setIsLoading(false); return }
    const supabase = createClient()
    if (!supabase) { setIsLoading(false); return }

    let cancelled = false

    const init = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login"
        }
        setIsLoading(false)
        return
      }

      const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "You"
      setCurrentUserName(userName)
      setCurrentUserEmail(user.email || "")

      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .order("created_at", { ascending: true })

      if (cancelled) return

      if (error) {
        console.error("Workspace query failed:", error.message)
      }

      const allWorkspaces = data ?? []
      setWorkspaces(allWorkspaces)

      const selected = pickActiveWorkspace(allWorkspaces)
      if (selected) {
        setActiveWorkspace(selected)
        writeStoredWorkspaceId(selected.id)
      }

      setIsLoading(false)
    }

    init().catch((err) => {
      console.error("Workspace init failed:", err)
      setIsLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  const switchWorkspace = useCallback((workspaceId: string) => {
    const next = workspaces.find((workspace) => workspace.id === workspaceId)
    if (!next || next.id === activeWorkspace?.id) return
    writeStoredWorkspaceId(workspaceId)
    window.location.assign("/")
  }, [workspaces, activeWorkspace?.id])

  const renameWorkspace = useCallback(async (name: string) => {
    if (!activeWorkspace || !isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("workspaces").update({ name }).eq("id", activeWorkspace.id)
    setActiveWorkspace((prev) => prev ? { ...prev, name } : prev)
    setWorkspaces((prev) => prev.map((workspace) => (
      workspace.id === activeWorkspace.id ? { ...workspace, name } : workspace
    )))
  }, [activeWorkspace])

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        workspaces,
        switchWorkspace,
        renameWorkspace,
        isLoading,
        currentUserName,
        currentUserEmail,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider")
  return ctx
}
