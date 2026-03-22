"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import { dummyMembers } from "@/lib/dummy-data"
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
    created_at: row.created_at,
  }
}

export function useMembers() {
  const { activeWorkspace } = useWorkspace()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
      setMembers(dummyMembers)
      setIsLoading(false)
      return
    }
    const supabase = createClient()
    if (!supabase) { setIsLoading(false); return }

    setIsLoading(true)
    const { data } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", activeWorkspace.id)
      .order("created_at", { ascending: true })

    if (data) {
      const enriched = await Promise.all(
        data.map(async (row) => {
          const member = dbToMember(row)
          if (member.user_id) {
            const { data: { user } } = await supabase.auth.admin?.getUserById?.(member.user_id) || { data: { user: null } }
            if (user) {
              member.name = user.user_metadata?.full_name || user.email || ""
              member.email = user.email || ""
            }
          }
          if (!member.name && member.invited_email) {
            member.name = member.invited_email
            member.email = member.invited_email
          }
          return member
        })
      )
      setMembers(enriched)
    }
    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const inviteMember = useCallback(async (email: string, role: WorkspaceMember["role"] = "support-worker") => {
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

  const removeMember = useCallback(async (memberId: string) => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("workspace_members").delete().eq("id", memberId)
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
  }, [])

  return { members, isLoading, inviteMember, updateMemberRole, removeMember, refetch: fetchMembers }
}
