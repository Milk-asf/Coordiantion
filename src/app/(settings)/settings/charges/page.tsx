"use client"

import { useState, useEffect } from "react"
import { Tag, Check, Info } from "lucide-react"
import { ndisCharges, chargeCategories, type NdisChargeItem } from "@/lib/ndis-charges"

const STORAGE_KEY = "coordination:enabled-charges"

function getDefaults(): string[] {
  return ndisCharges
    .filter((c) => c.category === "support-coordination")
    .map((c) => c.itemNumber)
}

function loadEnabled(): string[] {
  if (typeof window === "undefined") return getDefaults()
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return getDefaults()
  try { return JSON.parse(stored) } catch { return getDefaults() }
}

function saveEnabled(items: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event("charges-updated"))
}

const categoryOrder: NdisChargeItem["category"][] = [
  "support-coordination",
  "psychosocial-recovery",
  "travel",
]

export default function ChargesSettingsPage() {
  const [enabled, setEnabled] = useState<string[]>(getDefaults)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { setEnabled(loadEnabled()) }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const handleToggle = (itemNumber: string) => {
    setEnabled((prev) => {
      const next = prev.includes(itemNumber)
        ? prev.filter((n) => n !== itemNumber)
        : [...prev, itemNumber]
      saveEnabled(next)
      return next
    })
  }

  const handleEnableCategory = (category: NdisChargeItem["category"]) => {
    const categoryItems = ndisCharges.filter((c) => c.category === category).map((c) => c.itemNumber)
    setEnabled((prev) => {
      const next = [...new Set([...prev, ...categoryItems])]
      saveEnabled(next)
      return next
    })
    setToast(`Enabled all ${chargeCategories[category]} items`)
  }

  const handleDisableCategory = (category: NdisChargeItem["category"]) => {
    const categoryItems = new Set(ndisCharges.filter((c) => c.category === category).map((c) => c.itemNumber))
    setEnabled((prev) => {
      const next = prev.filter((n) => !categoryItems.has(n))
      saveEnabled(next)
      return next
    })
    setToast(`Disabled all ${chargeCategories[category]} items`)
  }

  const enabledCount = enabled.length

  return (
    <div className="px-6">
      <div className="mb-[6px] flex items-center gap-[10px]">
        <div className="flex h-[32px] w-[32px] items-center justify-center rounded-lg bg-[#f0f0f0]">
          <Tag className="h-[16px] w-[16px] text-[#555]" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-[18px] font-semibold text-[#262626]">Charges</h1>
        </div>
      </div>
      <p className="mb-[24px] text-[13px] font-medium leading-[1.5] text-[#888]">
        Select which NDIS line items are available when logging charges against tasks. Items are sourced from the NDIS Pricing Arrangements 2025–26 (Support Coordination category).
      </p>

      <div className="mb-[16px] flex items-center gap-[8px] rounded-lg border border-blue-100 bg-blue-50/50 px-[12px] py-[10px]">
        <Info className="h-[14px] w-[14px] shrink-0 text-blue-400" strokeWidth={2} />
        <p className="text-[12px] font-medium text-blue-600">
          {enabledCount} of {ndisCharges.length} charge types enabled. Only enabled items appear in the task charge selector.
        </p>
      </div>

      {categoryOrder.map((category) => {
        const items = ndisCharges.filter((c) => c.category === category)
        const allEnabled = items.every((c) => enabled.includes(c.itemNumber))
        const noneEnabled = items.every((c) => !enabled.includes(c.itemNumber))

        return (
          <div key={category} className="mb-[24px]">
            <div className="mb-[8px] flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-[#262626]">
                {chargeCategories[category]}
              </h2>
              <button
                type="button"
                onClick={() => allEnabled ? handleDisableCategory(category) : handleEnableCategory(category)}
                className="text-[12px] font-medium text-blue-500 transition-colors hover:text-blue-600"
                tabIndex={0}
              >
                {allEnabled ? "Disable all" : noneEnabled ? "Enable all" : "Enable all"}
              </button>
            </div>

            <div className="rounded-lg border border-[#e8e8e8] bg-white">
              {items.map((item, idx) => {
                const isOn = enabled.includes(item.itemNumber)
                return (
                  <div
                    key={item.itemNumber}
                    className={`flex items-center gap-[12px] px-[14px] py-[10px] transition-colors hover:bg-[#fafafa] ${
                      idx < items.length - 1 ? "border-b border-[#f0f0f0]" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(item.itemNumber)}
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${
                        isOn
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-[#d0d0d0] hover:border-[#999]"
                      }`}
                      tabIndex={0}
                      aria-label={isOn ? `Disable ${item.shortName}` : `Enable ${item.shortName}`}
                    >
                      {isOn && <Check className="h-[10px] w-[10px]" strokeWidth={3} />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-[8px]">
                        <span className="text-[13px] font-medium text-[#262626]">{item.shortName}</span>
                        <span className="rounded bg-[#f5f5f5] px-[6px] py-[1px] font-mono text-[10px] font-medium text-[#999]">
                          {item.itemNumber}
                        </span>
                      </div>
                      <p className="mt-[1px] text-[11px] font-medium text-[#999]">{item.name}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="text-[13px] font-semibold text-[#262626]">
                        ${item.price.toFixed(2)}
                      </span>
                      <span className="ml-[2px] text-[11px] font-medium text-[#999]">
                        /{item.unit === "hour" ? "hr" : "ea"}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <p className="mt-[8px] text-[11px] font-medium text-[#bbb]">
        Source: NDIS Support Catalogue 2025–26 v1.1, effective 24 Nov 2025. Prices shown are NSW maximums.
      </p>

      {toast && (
        <div className="fixed bottom-[24px] left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[#e0e0e0] bg-white px-[16px] py-[10px] text-[13px] font-medium text-[#262626] shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
