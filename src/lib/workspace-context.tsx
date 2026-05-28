"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import type { Workspace } from "@/lib/types"

interface WorkspaceContextType {
  activeWorkspace: Workspace | null
  renameWorkspace: (name: string) => Promise<void>
  isLoading: boolean
  currentUserName: string
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserName, setCurrentUserName] = useState("You")

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

      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error("Workspace query failed:", error.message)
      }

      if (data) {
        setActiveWorkspace(data)
      }

      setIsLoading(false)
    }

    init().catch((err) => {
      console.error("Workspace init failed:", err)
      setIsLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  const renameWorkspace = useCallback(async (name: string) => {
    if (!activeWorkspace || !isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("workspaces").update({ name }).eq("id", activeWorkspace.id)
    setActiveWorkspace((prev) => prev ? { ...prev, name } : prev)
  }, [activeWorkspace])

  return (
    <WorkspaceContext.Provider value={{ activeWorkspace, renameWorkspace, isLoading, currentUserName }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider")
  return ctx
}
