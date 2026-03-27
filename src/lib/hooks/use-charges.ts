"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ndisCharges } from "@/lib/ndis-charges"

const STORAGE_KEY = "coordination:enabled-charges"

function loadEnabledItemNumbers(): string[] {
  if (typeof window === "undefined") return getDefaults()
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return getDefaults()
  try { return JSON.parse(stored) } catch { return getDefaults() }
}

function getDefaults(): string[] {
  return ndisCharges
    .filter((c) => c.category === "support-coordination")
    .map((c) => c.itemNumber)
}

export function useCharges() {
  const [enabledItemNumbers, setEnabledItemNumbers] = useState<string[]>(getDefaults)

  useEffect(() => {
    setEnabledItemNumbers(loadEnabledItemNumbers())

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEnabledItemNumbers(loadEnabledItemNumbers())
    }
    const handleCustom = () => setEnabledItemNumbers(loadEnabledItemNumbers())

    window.addEventListener("storage", handleStorage)
    window.addEventListener("charges-updated", handleCustom)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("charges-updated", handleCustom)
    }
  }, [])

  const enabledCharges = useMemo(() => {
    const set = new Set(enabledItemNumbers)
    return ndisCharges.filter((c) => set.has(c.itemNumber))
  }, [enabledItemNumbers])

  const toggleCharge = useCallback((itemNumber: string) => {
    setEnabledItemNumbers((prev) => {
      const next = prev.includes(itemNumber)
        ? prev.filter((n) => n !== itemNumber)
        : [...prev, itemNumber]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new Event("charges-updated"))
      return next
    })
  }, [])

  const setEnabled = useCallback((itemNumbers: string[]) => {
    setEnabledItemNumbers(itemNumbers)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(itemNumbers))
    window.dispatchEvent(new Event("charges-updated"))
  }, [])

  const isEnabled = useCallback((itemNumber: string) => {
    return enabledItemNumbers.includes(itemNumber)
  }, [enabledItemNumbers])

  return {
    allCharges: ndisCharges,
    enabledCharges,
    enabledItemNumbers,
    toggleCharge,
    setEnabled,
    isEnabled,
  }
}
