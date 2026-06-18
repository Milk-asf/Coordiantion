"use client"

import { useState, useEffect } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { WorkspaceMember } from "@/lib/types"

type Role = WorkspaceMember["role"]

export interface Permissions {
  role: Role | null
  userId: string | null
  userEmail: string | null
  isLoading: boolean
  isSuperAdmin: boolean

  canAccessBilling: boolean
  canManageWorkspaceSettings: boolean
  canManageMembers: boolean
  canManageStaff: boolean
  canViewStaff: boolean
  canManageClients: boolean
  canCreateTasks: boolean
  canManageDocuments: boolean
  canViewIncidents: boolean
  canManageIncidents: boolean
  canAssignClients: boolean
  canAssignTasks: boolean
}

const noPermissions: Permissions = {
  role: null,
  userId: null,
  userEmail: null,
  isLoading: true,
  isSuperAdmin: false,
  canAccessBilling: false,
  canManageWorkspaceSettings: false,
  canManageMembers: false,
  canManageStaff: false,
  canViewStaff: false,
  canManageClients: false,
  canCreateTasks: false,
  canManageDocuments: false,
  canViewIncidents: false,
  canManageIncidents: false,
  canAssignClients: false,
  canAssignTasks: false,
}

function derivePermissions(role: Role, userId: string | null = null, userEmail: string | null = null): Permissions {
  const isAdmin = role === "super-admin" || role === "admin"

  return {
    role,
    userId,
    userEmail,
    isLoading: false,
    isSuperAdmin: role === "super-admin",
    canAccessBilling: role === "super-admin",
    canManageWorkspaceSettings: isAdmin,
    canManageMembers: isAdmin,
    canManageStaff: isAdmin,
    canViewStaff: isAdmin,
    canManageClients: true,
    canCreateTasks: true,
    canManageDocuments: true,
    canViewIncidents: isAdmin,
    canManageIncidents: isAdmin,
    canAssignClients: isAdmin,
    canAssignTasks: isAdmin,
  }
}

export function usePermissions(): Permissions {
  const { activeWorkspace } = useWorkspace()
  const [permissions, setPermissions] = useState<Permissions>(noPermissions)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setPermissions(derivePermissions("admin"))
      return
    }

    if (!activeWorkspace) {
      setPermissions({ ...noPermissions, isLoading: false })
      return
    }

    const supabase = createClient()
    if (!supabase) { setPermissions({ ...noPermissions, isLoading: false }); return }

    let cancelled = false

    const resolve = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        if (!user) { setPermissions({ ...noPermissions, isLoading: false }); return }

        const { data, error } = await supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", activeWorkspace.id)
          .eq("user_id", user.id)
          .single()

        if (cancelled) return

        if (error || !data?.role) {
          setPermissions({ ...noPermissions, isLoading: false, userId: user.id, userEmail: user.email || null })
        } else {
          setPermissions(derivePermissions(data.role as Role, user.id, user.email || null))
        }
      } catch {
        if (!cancelled) setPermissions({ ...noPermissions, isLoading: false })
      }
    }

    resolve()
    return () => { cancelled = true }
  }, [activeWorkspace])

  return permissions
}
