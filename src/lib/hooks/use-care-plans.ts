"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { CarePlan } from "@/lib/types"

/* eslint-disable @typescript-eslint/no-explicit-any */
function dbToCarePlan(row: any): CarePlan {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    documentId: row.document_id,
    createdDate: row.created_date || "",
    renewalDate: row.renewal_date || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  }
}

interface UpsertCarePlanInput {
  clientId: string
  documentId: string
  createdDate: string
  renewalDate: string
}

export function useCarePlans() {
  const { activeWorkspace } = useWorkspace()
  const [carePlans, setCarePlans] = useState<CarePlan[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchCarePlans = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
      setCarePlans([])
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    if (!supabase) {
      setCarePlans([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("care_plans")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("updated_at", { ascending: false })

      if (error || !data) {
        setCarePlans([])
      } else {
        setCarePlans(data.map(dbToCarePlan))
      }
    } catch {
      setCarePlans([])
    }
    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => {
    fetchCarePlans()
  }, [fetchCarePlans])

  const getCarePlanForClient = useCallback(
    (clientId: string) => carePlans.find((plan) => plan.clientId === clientId) ?? null,
    [carePlans]
  )

  const upsertCarePlan = useCallback(async (input: UpsertCarePlanInput) => {
    if (!activeWorkspace || !isSupabaseConfigured()) return null

    const supabase = createClient()
    if (!supabase) return null

    const payload = {
      workspace_id: activeWorkspace.id,
      client_id: input.clientId,
      document_id: input.documentId,
      created_date: input.createdDate,
      renewal_date: input.renewalDate,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("care_plans")
      .upsert(payload, { onConflict: "client_id" })
      .select()
      .single()

    if (error || !data) return null
    const saved = dbToCarePlan(data)
    setCarePlans((prev) => {
      const withoutClient = prev.filter((plan) => plan.clientId !== saved.clientId)
      return [saved, ...withoutClient]
    })
    return saved
  }, [activeWorkspace])

  const deleteCarePlan = useCallback(async (carePlanId: string) => {
    if (!isSupabaseConfigured()) return false

    const supabase = createClient()
    if (!supabase) return false

    const { error } = await supabase.from("care_plans").delete().eq("id", carePlanId)
    if (error) return false

    setCarePlans((prev) => prev.filter((plan) => plan.id !== carePlanId))
    return true
  }, [])

  return {
    carePlans,
    isLoading,
    getCarePlanForClient,
    upsertCarePlan,
    deleteCarePlan,
    refetch: fetchCarePlans,
  }
}

export function getCarePlanFolder(clientFolder: string) {
  return `${clientFolder}/Care plan`
}
