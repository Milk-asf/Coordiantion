"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ndisCharges, type ChargeItem } from "@/lib/ndis-charges"

const STORAGE_KEY = "coordination:charge-items"
const LEGACY_KEY = "coordination:enabled-charges"

function migrateFromLegacy(): ChargeItem[] {
  if (typeof window === "undefined") return []
  const legacy = localStorage.getItem(LEGACY_KEY)
  if (!legacy) return []
  try {
    const itemNumbers: string[] = JSON.parse(legacy)
    return itemNumbers
      .map((num) => {
        const ndis = ndisCharges.find((c) => c.itemNumber === num)
        if (!ndis) return null
        return {
          id: crypto.randomUUID(),
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
  } catch {
    return []
  }
}

function getDefaults(): ChargeItem[] {
  return ndisCharges
    .filter((c) => c.category === "support-coordination")
    .map((c) => ({
      id: crypto.randomUUID(),
      name: c.name,
      itemNumber: c.itemNumber,
      claimType: "direct-service",
      price: c.price,
      unit: c.unit,
      gstCode: "P2",
      reference: c.shortName,
    }))
}

function loadItems(): ChargeItem[] {
  if (typeof window === "undefined") return getDefaults()
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try { return JSON.parse(stored) } catch { /* fall through */ }
  }
  const migrated = migrateFromLegacy()
  if (migrated.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
    return migrated
  }
  return getDefaults()
}

function saveItems(items: ChargeItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event("charges-updated"))
}

export function useCharges() {
  const [chargeItems, setChargeItems] = useState<ChargeItem[]>(getDefaults)

  useEffect(() => {
    setChargeItems(loadItems())

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setChargeItems(loadItems())
    }
    const handleCustom = () => setChargeItems(loadItems())

    window.addEventListener("storage", handleStorage)
    window.addEventListener("charges-updated", handleCustom)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("charges-updated", handleCustom)
    }
  }, [])

  const enabledCharges = useMemo(() => {
    return chargeItems.map((ci) => {
      const ndis = ndisCharges.find((n) => n.itemNumber === ci.itemNumber)
      return ndis ?? {
        itemNumber: ci.itemNumber,
        name: ci.name,
        shortName: ci.reference,
        registrationGroup: "",
        unit: ci.unit,
        price: ci.price,
        category: "support-coordination" as const,
      }
    })
  }, [chargeItems])

  const enabledItemNumbers = useMemo(() => chargeItems.map((ci) => ci.itemNumber), [chargeItems])

  const addChargeItem = useCallback((item: ChargeItem) => {
    setChargeItems((prev) => {
      const next = [...prev, item]
      saveItems(next)
      return next
    })
  }, [])

  const removeChargeItem = useCallback((id: string) => {
    setChargeItems((prev) => {
      const next = prev.filter((ci) => ci.id !== id)
      saveItems(next)
      return next
    })
  }, [])

  const updateChargeItem = useCallback((id: string, updates: Partial<ChargeItem>) => {
    setChargeItems((prev) => {
      const next = prev.map((ci) => ci.id === id ? { ...ci, ...updates } : ci)
      saveItems(next)
      return next
    })
  }, [])

  const isEnabled = useCallback((itemNumber: string) => {
    return chargeItems.some((ci) => ci.itemNumber === itemNumber)
  }, [chargeItems])

  return {
    allCharges: ndisCharges,
    enabledCharges,
    enabledItemNumbers,
    chargeItems,
    addChargeItem,
    removeChargeItem,
    updateChargeItem,
    isEnabled,
  }
}
