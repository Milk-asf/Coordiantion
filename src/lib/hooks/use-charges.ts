"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  chargeItemFromNdis,
  getNdisChargeByItemNumber,
  ndisChargeCategories,
  ndisCharges,
  normalizeChargeItem,
  type ChargeItem,
} from "@/lib/ndis-charges"
import { useWorkspace } from "@/lib/workspace-context"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

function buildChargeItems(itemNumbers: string[]): ChargeItem[] {
  return itemNumbers
    .map((num) => {
      const ndis = getNdisChargeByItemNumber(num)
      if (!ndis) return null
      return normalizeChargeItem({
        id: num,
        ...chargeItemFromNdis(ndis),
      })
    })
    .filter(Boolean) as ChargeItem[]
}

const LEGACY_SEEDED_ITEM_NUMBERS = new Set(
  ndisCharges
    .filter((charge) => {
      if (charge.itemNumber === "07_799_0106_6_3_KM") return true
      return charge.category === "support-coordination-and-psychosocial-recovery-coaches"
    })
    .map((charge) => charge.itemNumber)
)

function isLegacySeededOnly(items: ChargeItem[]): boolean {
  if (items.length === 0 || items.length !== LEGACY_SEEDED_ITEM_NUMBERS.size) return false
  return items.every((item) => LEGACY_SEEDED_ITEM_NUMBERS.has(item.itemNumber))
}

function stripLegacySeededItems(items: ChargeItem[]): ChargeItem[] {
  return isLegacySeededOnly(items) ? [] : items
}

function normalizeChargeItems(items: ChargeItem[]): ChargeItem[] {
  return items.map(normalizeChargeItem)
}

function getActiveItemNumbers(items: ChargeItem[]): string[] {
  return items.filter((item) => item.status !== "inactive").map((item) => item.itemNumber)
}

export function useCharges() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id ?? null
  const [chargeItems, setChargeItems] = useState<ChargeItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (!workspaceId || !isSupabaseConfigured()) {
      setChargeItems([])
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    if (!supabase) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const saveConfig = async (items: ChargeItem[]) => {
      await supabase
        .from("charges_config")
        .upsert(
          {
            workspace_id: workspaceId,
            enabled_charges: getActiveItemNumbers(items),
            charge_items: items as unknown as Record<string, unknown>[],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" }
        )
    }

    const load = async () => {
      const { data } = await supabase
        .from("charges_config")
        .select("enabled_charges, charge_items")
        .eq("workspace_id", workspaceId)
        .single()

      if (cancelled) return

      const stored = data?.charge_items as ChargeItem[] | null | undefined
      if (Array.isArray(stored)) {
        const normalized = stripLegacySeededItems(normalizeChargeItems(stored))
        if (normalized.length !== stored.length) await saveConfig(normalized)
        setChargeItems(normalized)
        hasLoadedRef.current = true
        setIsLoading(false)
        return
      }

      if (data?.enabled_charges?.length) {
        const built = stripLegacySeededItems(buildChargeItems(data.enabled_charges))
        await saveConfig(built)
        if (cancelled) return
        setChargeItems(built)
        hasLoadedRef.current = true
        setIsLoading(false)
        return
      }

      await saveConfig([])
      if (cancelled) return
      setChargeItems([])
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
    async (items: ChargeItem[]) => {
      if (!workspaceId || !isSupabaseConfigured()) return
      const supabase = createClient()
      if (!supabase) return
      const { error } = await supabase
        .from("charges_config")
        .upsert(
          {
            workspace_id: workspaceId,
            enabled_charges: getActiveItemNumbers(items),
            charge_items: items as unknown as Record<string, unknown>[],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" }
        )
      if (error) console.error("Failed to save charges config:", error)
    },
    [workspaceId]
  )

  const enabledCharges = useMemo(() => {
    return chargeItems
      .filter((ci) => ci.status !== "inactive")
      .map((ci) => {
      const ndis = getNdisChargeByItemNumber(ci.itemNumber)
      return (
        ndis ?? {
          itemNumber: ci.itemNumber,
          name: ci.name,
          shortName: ci.reference,
          registrationGroup: "",
          registrationGroupNumber: "",
          supportCategory: "",
          supportCategoryNumber: 0,
          category: "other",
          unit: ci.unit,
          price: ci.price,
          quoteRequired: false,
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
        persistToSupabase(next)
        return next
      })
    },
    [persistToSupabase]
  )

  const removeChargeItem = useCallback(
    (id: string) => {
      setChargeItems((prev) => {
        const next = prev.filter((ci) => ci.id !== id)
        persistToSupabase(next)
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
        persistToSupabase(next)
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
    ndisChargeCategories,
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
