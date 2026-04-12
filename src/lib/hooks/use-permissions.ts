"use client"

import { useState, useEffect } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { WorkspaceMember } from "@/lib/types"

type Role = WorkspaceMember["role"]

export interface Permissions {
  role: Role | null
  userId: string | null
  isLoading: boolean

  canAccessBilling: boolean
  canManageWorkspaceSettings: boolean
  canManageMembers: boolean
  canManageStaff: boolean
  canViewStaff: boolean
  canManageClients: boolean
  canCreateTasks: boolean
  canManageDocuments: boolean
  canAssignClients: boolean
  canAssignTasks: boolean
}

const noPermissions: Permissions = {
  role: null,
  userId: null,
  isLoading: true,
  canAccessBilling: true,
  canManageWorkspaceSettings: true,
  canManageMembers: true,
  canManageStaff: true,
  canViewStaff: true,
  canManageClients: true,
  canCreateTasks: true,
  canManageDocuments: true,
  canAssignClients: true,
  canAssignTasks: true,
}

function derivePermissions(role: Role, userId: string | null = null): Permissions {
  const isAdmin = role === "super-admin" || role === "admin"

  return {
    role,
    userId,
    isLoading: false,
    canAccessBilling: role === "super-admin",
    canManageWorkspaceSettings: isAdmin,
    canManageMembers: isAdmin,
    canManageStaff: isAdmin,
    canViewStaff: isAdmin,
    canManageClients: true,
    canCreateTasks: true,
    canManageDocuments: true,
    canAssignClients: isAdmin,
    canAssignTasks: isAdmin,
  }
}

export function usePermissions(): Permissions {
  const { activeWorkspace } = useWorkspace()
  const [permissions, setPermissions] = useState<Permissions>(noPermissions)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setPermissions(derivePermissions("super-admin"))
      return
    }

    if (!activeWorkspace) {
      setPermissions({ ...noPermissions, isLoading: false })
      return
    }

    const supabase = createClient()
    if (!supabase) { setPermissions(derivePermissions("super-admin")); return }

    let cancelled = false

    const resolve = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        if (!user) { setPermissions(derivePermissions("super-admin")); return }

        const { data, error } = await supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", activeWorkspace.id)
          .eq("user_id", user.id)
          .single()

        if (cancelled) return

        if (error || !data?.role) {
          setPermissions(derivePermissions("super-admin", user.id))
        } else {
          setPermissions(derivePermissions(data.role as Role, user.id))
        }
      } catch {
        if (!cancelled) setPermissions(derivePermissions("super-admin"))
      }
    }

    resolve()
    return () => { cancelled = true }
  }, [activeWorkspace])

  return permissions
}
