"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { WorkspaceMember } from "@/lib/types"

/* eslint-disable @typescript-eslint/no-explicit-any */
function dbToMember(row: any): WorkspaceMember {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    user_id: row.user_id,
    role: row.role,
    status: row.status,
    invited_email: row.invited_email,
    team: row.team || null,
    created_at: row.created_at,
  }
}

export function useMembers() {
  const { activeWorkspace } = useWorkspace()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
      setMembers([])
      setIsLoading(false)
      return
    }
    const supabase = createClient()
    if (!supabase) { setMembers([]); setIsLoading(false); return }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("workspace_members_with_profile")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: true })

      if (!error && data) {
        const enriched = data.map((row: any) => {
          const member = dbToMember(row)
          member.name = row.user_full_name || member.invited_email || member.name || ""
          member.email = row.user_email || member.invited_email || member.email || ""
          return member
        })
        setMembers(enriched)
      } else {
        // The profile view joins auth.users and can fail for non-privileged
        // callers; fall back to the base table so members (including newly
        // invited ones) still load, using the invited email as the label.
        const { data: baseData } = await supabase
          .from("workspace_members")
          .select("*")
          .eq("workspace_id", activeWorkspace.id)
          .order("created_at", { ascending: true })

        const fallback = (baseData || []).map((row: any) => {
          const member = dbToMember(row)
          member.name = member.invited_email || member.name || ""
          member.email = member.invited_email || member.email || ""
          return member
        })
        setMembers(fallback)
      }
    } catch {
      setMembers([])
    }
    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const inviteMember = useCallback(async (email: string, role: WorkspaceMember["role"] = "coordinator") => {
    if (!activeWorkspace || !isSupabaseConfigured()) return null
    const supabase = createClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: activeWorkspace.id,
        invited_email: email,
        role,
        status: "invited",
      })
      .select()
      .single()

    if (error || !data) return null
    const newMember = dbToMember(data)
    newMember.name = email
    newMember.email = email
    setMembers((prev) => [...prev, newMember])
    return newMember
  }, [activeWorkspace])

  const updateMemberRole = useCallback(async (memberId: string, role: WorkspaceMember["role"]) => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("workspace_members").update({ role }).eq("id", memberId)
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m))
  }, [])

  const updateMemberStatus = useCallback(async (memberId: string, status: WorkspaceMember["status"]) => {
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, status } : m))
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("workspace_members").update({ status }).eq("id", memberId)
  }, [])

  const removeMember = useCallback(async (memberId: string) => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("workspace_members").delete().eq("id", memberId)
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
  }, [])

  return { members, isLoading, inviteMember, updateMemberRole, updateMemberStatus, removeMember, refetch: fetchMembers }
}
