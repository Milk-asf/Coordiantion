"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import type { Workspace } from "@/lib/types"

interface WorkspaceContextType {
  activeWorkspace: Workspace | null
  renameWorkspace: (name: string) => Promise<void>
  isLoading: boolean
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

      const { data, error } = await supabase.from("workspaces").select("*").order("created_at", { ascending: true }).limit(1).single()

      if (cancelled) return

      if (data) {
        setActiveWorkspace(data)
        setIsLoading(false)
        return
      }

      if (error) {
        console.error("Workspace query failed:", error.message)
      }

      const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "My"
      const { data: wsId } = await supabase.rpc("create_workspace_for_user", {
        workspace_name: `${fullName}'s Workspace`,
        owner_id: user.id,
      })

      if (cancelled) return

      if (wsId) {
        await supabase.from("workspace_members").upsert({
          workspace_id: wsId,
          user_id: user.id,
          role: "super-admin",
          status: "active",
        }, { onConflict: "workspace_id,user_id" })

        await supabase.from("clients").insert({
          workspace_id: wsId,
          name: "Jane Cooper",
          icon_text: "JC",
          icon_color: "#6b7280",
          icon_shape: "square",
          participant: {
            firstName: "Jane",
            middleName: "",
            lastName: "Cooper",
            preferredName: "",
            dateOfBirth: "1990-04-15",
            gender: "Female",
            pronouns: "She/Her",
            ethnicity: "",
            language: "English",
            primaryDiagnosis: "Cerebral Palsy",
            secondaryDiagnosis: "",
            email: "jane.cooper@example.com",
            mobile: "0412 345 678",
            phone: "",
            preferredContactMethod: "Email",
            preferredSignMethod: "Electronically",
            ndisNumber: "430 012 345",
            medicareNumber: "",
            centrelinkNumber: "",
            externalId: "",
            serviceCommencementDate: "2024-01-10",
            serviceExitDate: "",
          },
          industry: [],
        })

        if (cancelled) return
        const { data: ws } = await supabase.from("workspaces").select("*").eq("id", wsId).single()
        if (ws && !cancelled) setActiveWorkspace(ws)
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
    <WorkspaceContext.Provider value={{ activeWorkspace, renameWorkspace, isLoading }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider")
  return ctx
}
