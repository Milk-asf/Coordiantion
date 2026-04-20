"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { ndisCharges, type ChargeItem } from "@/lib/ndis-charges"
import { useWorkspace } from "@/lib/workspace-context"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

function getDefaultItemNumbers(): string[] {
  return ndisCharges
    .filter((c) => c.category === "support-coordination")
    .map((c) => c.itemNumber)
}

function buildChargeItems(itemNumbers: string[]): ChargeItem[] {
  return itemNumbers
    .map((num) => {
      const ndis = ndisCharges.find((c) => c.itemNumber === num)
      if (!ndis) return null
      return {
        id: num,
        name: ndis.name,
        itemNumber: ndis.itemNumber,
        claimType: "direct-service",
        price: ndis.price,
        unit: ndis.unit,
        gstCode: "P2",
        reference: ndis.shortName,
      } as ChargeItem
    })
    .filter(Boolean) as ChargeItem[]
}

export function useCharges() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id ?? null
  const [chargeItems, setChargeItems] = useState<ChargeItem[]>(() =>
    buildChargeItems(getDefaultItemNumbers())
  )
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (!workspaceId || !isSupabaseConfigured()) {
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    if (!supabase) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      const { data } = await supabase
        .from("charges_config")
        .select("enabled_charges")
        .eq("workspace_id", workspaceId)
        .single()

      if (cancelled) return

      if (data?.enabled_charges) {
        setChargeItems(buildChargeItems(data.enabled_charges))
        hasLoadedRef.current = true
        setIsLoading(false)
        return
      }

      const defaults = getDefaultItemNumbers()
      await supabase
        .from("charges_config")
        .upsert(
          { workspace_id: workspaceId, enabled_charges: defaults },
          { onConflict: "workspace_id" }
        )

      if (cancelled) return
      setChargeItems(buildChargeItems(defaults))
      hasLoadedRef.current = true
      setIsLoading(false)
    }

    load().catch((err) => {
      console.error("Failed to load charges config:", err)
      if (!cancelled) {
        hasLoadedRef.current = true
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [workspaceId])

  const persistToSupabase = useCallback(
    async (itemNumbers: string[]) => {
      if (!workspaceId || !isSupabaseConfigured()) return
      const supabase = createClient()
      if (!supabase) return
      const { error } = await supabase
        .from("charges_config")
        .upsert(
          {
            workspace_id: workspaceId,
            enabled_charges: itemNumbers,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" }
        )
      if (error) console.error("Failed to save charges config:", error)
    },
    [workspaceId]
  )

  const enabledCharges = useMemo(() => {
    return chargeItems.map((ci) => {
      const ndis = ndisCharges.find((n) => n.itemNumber === ci.itemNumber)
      return (
        ndis ?? {
          itemNumber: ci.itemNumber,
          name: ci.name,
          shortName: ci.reference,
          registrationGroup: "",
          unit: ci.unit,
          price: ci.price,
          category: "support-coordination" as const,
        }
      )
    })
  }, [chargeItems])

  const enabledItemNumbers = useMemo(
    () => chargeItems.map((ci) => ci.itemNumber),
    [chargeItems]
  )

  const addChargeItem = useCallback(
    (item: ChargeItem) => {
      setChargeItems((prev) => {
        const next = [...prev, item]
        persistToSupabase(next.map((ci) => ci.itemNumber))
        return next
      })
    },
    [persistToSupabase]
  )

  const removeChargeItem = useCallback(
    (id: string) => {
      setChargeItems((prev) => {
        const next = prev.filter((ci) => ci.id !== id)
        persistToSupabase(next.map((ci) => ci.itemNumber))
        return next
      })
    },
    [persistToSupabase]
  )

  const updateChargeItem = useCallback(
    (id: string, updates: Partial<ChargeItem>) => {
      setChargeItems((prev) => {
        const next = prev.map((ci) =>
          ci.id === id ? { ...ci, ...updates } : ci
        )
        persistToSupabase(next.map((ci) => ci.itemNumber))
        return next
      })
    },
    [persistToSupabase]
  )

  const isEnabled = useCallback(
    (itemNumber: string) => {
      return chargeItems.some((ci) => ci.itemNumber === itemNumber)
    },
    [chargeItems]
  )

  return {
    allCharges: ndisCharges,
    enabledCharges,
    enabledItemNumbers,
    chargeItems,
    addChargeItem,
    removeChargeItem,
    updateChargeItem,
    isEnabled,
    isLoading,
  }
}
