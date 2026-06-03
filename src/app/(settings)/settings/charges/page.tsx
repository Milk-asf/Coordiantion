"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, X, Search, Trash2, MoreHorizontal, Tag } from "lucide-react"
import { ndisCharges, claimTypes, gstCodes, type ChargeItem } from "@/lib/ndis-charges"
import { useCharges } from "@/lib/hooks/use-charges"
import { SettingsGuard } from "@/components/settings-guard"
import { Switch } from "@/components/switch"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/button"
import { useToast } from "@/components/toast"
import { cn } from "@/lib/utils"

const emptyForm: Omit<ChargeItem, "id"> = {
  name: "",
  itemNumber: "",
  claimType: "direct-service",
  price: 0,
  unit: "hour",
  gstCode: "P2",
  reference: "",
}

export default function ChargesSettingsPage() {
  const { chargeItems, addChargeItem, removeChargeItem, updateChargeItem } = useCharges()
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchIdx, setSearchIdx] = useState(-1)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [disabledItems, setDisabledItems] = useState<ChargeItem[]>([])
  const { toast } = useToast()
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAdding) setTimeout(() => searchRef.current?.focus(), 50)
  }, [isAdding])

  const searchResults = searchQuery.trim().length > 0
    ? ndisCharges.filter((c) => {
        const q = searchQuery.toLowerCase()
        return c.name.toLowerCase().includes(q)
          || c.itemNumber.toLowerCase().includes(q)
          || c.shortName.toLowerCase().includes(q)
      })
    : ndisCharges

  const handleSelectFromSearch = (item: typeof ndisCharges[number]) => {
    setForm({
      name: item.name,
      itemNumber: item.itemNumber,
      claimType: "direct-service",
      price: item.price,
      unit: item.unit,
      gstCode: "P2",
      reference: item.shortName,
    })
    setSearchQuery(item.name)
    setIsSearchOpen(false)
    setSearchIdx(-1)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchOpen || searchResults.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSearchIdx((i) => Math.min(i + 1, searchResults.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSearchIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && searchIdx >= 0) {
      e.preventDefault()
      handleSelectFromSearch(searchResults[searchIdx])
    } else if (e.key === "Escape") {
      setIsSearchOpen(false)
    }
  }

  useEffect(() => {
    if (searchIdx >= 0 && listRef.current) {
      const items = listRef.current.children
      if (items[searchIdx]) (items[searchIdx] as HTMLElement).scrollIntoView({ block: "nearest" })
    }
  }, [searchIdx])

  const handleAdd = () => {
    if (!form.name.trim() || !form.itemNumber.trim()) return
    addChargeItem({ ...form, id: crypto.randomUUID() })
    setForm(emptyForm)
    setSearchQuery("")
    setIsAdding(false)
    toast(`Added ${form.reference || form.name}`, "success")
  }

  const handleRemove = (item: ChargeItem) => {
    removeChargeItem(item.id)
    setDisabledItems((prev) => prev.filter((d) => d.id !== item.id))
    setMenuOpen(null)
    toast(`Removed ${item.reference || item.name}`, "success")
  }

  const handleToggleEnabled = (item: ChargeItem, currentlyEnabled: boolean) => {
    setMenuOpen(null)
    if (currentlyEnabled) {
      removeChargeItem(item.id)
      setDisabledItems((prev) => [item, ...prev.filter((d) => d.itemNumber !== item.itemNumber)])
      return
    }
    setDisabledItems((prev) => prev.filter((d) => d.id !== item.id))
    addChargeItem(item)
  }

  const handleCancel = () => {
    setIsAdding(false)
    setForm(emptyForm)
    setSearchQuery("")
    setIsSearchOpen(false)
  }

  const unitLabel = (u: string) => u === "hour" ? "Hour" : u === "km" ? "Km" : "Each"
  const claimLabel = (val: string) => claimTypes.find((c) => c.value === val)?.label ?? val
  const gstShortLabel = (code: string) => code === "P1" ? "GST" : code === "P5" ? "Out of scope" : "GST-free"

  const visibleDisabledItems = disabledItems.filter((d) => !chargeItems.some((ci) => ci.itemNumber === d.itemNumber))

  const renderChargeRow = (item: ChargeItem, enabled: boolean) => (
    <div
      key={item.id}
      className={cn(
        "grid grid-cols-[1fr_140px_88px_64px_48px_108px_56px_40px] items-center border-b border-[#f5f5f5] px-[20px] py-[14px] transition-colors",
        enabled ? "hover:bg-[#fafafa]" : "opacity-60"
      )}
    >
      <span className="text-[14px] font-medium text-[#262626]">{item.reference || item.name}</span>
      <span>
        <span className="inline-flex items-center rounded-[6px] border border-[#e5e5e5] bg-[#f7f7f7] px-[8px] py-[3px] font-mono text-[12px] font-medium text-[#555]">
          {item.itemNumber}
        </span>
      </span>
      <span className="text-[13px] text-[#888]">{claimLabel(item.claimType)}</span>
      <span className="text-[13px] font-medium text-[#262626] text-right">${item.price.toFixed(2)}</span>
      <span className="text-[13px] text-[#888]">{unitLabel(item.unit)}</span>
      <div className="pr-[8px]">
        <select
          value={item.gstCode}
          onChange={(e) => updateChargeItem(item.id, { gstCode: e.target.value })}
          disabled={!enabled}
          className="w-full rounded-[6px] border border-[#eee] bg-[#fafafa] px-[6px] py-[5px] text-[12px] font-medium text-[#262626] outline-none transition-colors focus:border-[#ddd] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="GST treatment"
          title={gstCodes.find((g) => g.value === item.gstCode)?.label}
        >
          {gstCodes.map((g) => (
            <option key={g.value} value={g.value}>{gstShortLabel(g.value)}</option>
          ))}
        </select>
      </div>
      <div>
        <Switch
          checked={enabled}
          onChange={() => handleToggleEnabled(item, enabled)}
          ariaLabel={enabled ? "Disable charge item" : "Enable charge item"}
        />
      </div>
      <div className="relative flex justify-end">
        <button
          type="button"
          onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)}
          className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#bbb] transition-all hover:bg-[#f0f0f0] hover:text-[#666]"
          tabIndex={0}
          aria-label="More options"
        >
          <MoreHorizontal className="h-[16px] w-[16px]" />
        </button>
        {menuOpen === item.id && (
          <>
            <div className="fixed inset-0 z-[59]" onClick={() => setMenuOpen(null)} />
            <div className="absolute right-0 top-full z-[60] mt-[4px] w-[140px] rounded-[8px] border border-[#f0f0f0] bg-white py-[4px] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-left text-[13px] text-red-500 transition-colors hover:bg-red-50"
                tabIndex={0}
              >
                <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.75} />
                Remove
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return (
    <SettingsGuard requireAdmin>
      <div className="mb-[32px]">
        <h1 className="text-[20px] font-bold text-[#262626]">Charges</h1>
        <p className="mt-[4px] text-[14px] text-[#888]">
          Manage NDIS line items for Support Coordination. These are used when logging charges against tasks.
        </p>
      </div>

      <Button onClick={() => setIsAdding(true)} className="mb-[24px] px-[12px] py-[7px]">
        <Plus className="h-[14px] w-[14px]" strokeWidth={1.75} />
        Add charge item
      </Button>

      {/* Add modal */}
      {isAdding && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20" onClick={handleCancel} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[480px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-[12px] border border-[#f0f0f0] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] px-[24px] py-[16px]">
              <h2 className="text-[15px] font-semibold text-[#262626]">Add charge item</h2>
              <button
                onClick={handleCancel}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#999] transition-colors hover:bg-[#f0f0f0] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.75} />
              </button>
            </div>

            <div className="px-[24px] py-[20px]">
              <label className="mb-[6px] block text-[12px] font-medium text-[#888]">Search NDIS Support Coordination items</label>
              <div className="relative">
                <div className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2">
                  <Search className="h-[14px] w-[14px] text-[#bbb]" strokeWidth={1.75} />
                </div>
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); setSearchIdx(-1) }}
                  onFocus={() => setIsSearchOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search by name or item number..."
                  className="w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] py-[9px] pl-[32px] pr-[32px] text-[13px] text-[#262626] placeholder:text-[#bbb] focus:border-[#999] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); setIsSearchOpen(true) }}
                    className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#888]"
                    tabIndex={0}
                    aria-label="Clear search"
                  >
                    <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
                  </button>
                )}
                {isSearchOpen && searchResults.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-[55]" onClick={() => setIsSearchOpen(false)} />
                    <div
                      ref={listRef}
                      className="absolute left-0 top-full z-[60] mt-[4px] max-h-[220px] w-full overflow-y-auto rounded-[8px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
                    >
                      {searchResults.map((item, idx) => (
                        <button
                          key={item.itemNumber}
                          onClick={() => handleSelectFromSearch(item)}
                          className={cn(
                            "flex w-full flex-col px-[14px] py-[10px] text-left transition-colors hover:bg-[#f5f5f5]",
                            idx === searchIdx && "bg-[#f0f0f0]"
                          )}
                          tabIndex={0}
                        >
                          <span className="text-[13px] font-medium text-[#262626]">{item.shortName}</span>
                          <div className="mt-[2px] flex items-center gap-[8px]">
                            <span className="font-mono text-[11px] text-[#999]">{item.itemNumber}</span>
                            <span className="text-[11px] text-[#bbb]">·</span>
                            <span className="text-[11px] text-[#999]">${item.price.toFixed(2)}/{item.unit === "hour" ? "hr" : item.unit === "km" ? "km" : "ea"}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {form.itemNumber && (
                <div className="mt-[20px] space-y-[12px] border-t border-[#f0f0f0] pt-[16px]">
                  <div className="grid grid-cols-[90px_1fr] items-center gap-[8px]">
                    <span className="text-[12px] font-medium text-[#888]">Name</span>
                    <input
                      value={form.reference}
                      onChange={(e) => setForm({ ...form, reference: e.target.value })}
                      placeholder="Charge name"
                      className="rounded-[6px] border border-[#eee] bg-[#fafafa] px-[10px] py-[7px] text-[13px] text-[#262626] placeholder:text-[#ccc] outline-none focus:border-[#ddd]"
                    />
                  </div>
                  <div className="grid grid-cols-[90px_1fr] items-center gap-[8px]">
                    <span className="text-[12px] font-medium text-[#888]">Item number</span>
                    <span>
                      <span className="inline-flex items-center rounded-[6px] border border-[#e5e5e5] bg-[#f7f7f7] px-[8px] py-[3px] font-mono text-[12px] font-medium text-[#555]">
                        {form.itemNumber}
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-[90px_1fr] items-center gap-[8px]">
                    <span className="text-[12px] font-medium text-[#888]">Price</span>
                    <span className="px-[10px] py-[7px] text-[13px] text-[#555]">${form.price.toFixed(2)} / {unitLabel(form.unit).toLowerCase()}</span>
                  </div>
                  <div className="grid grid-cols-[90px_1fr] items-center gap-[8px]">
                    <span className="text-[12px] font-medium text-[#888]">Claim type</span>
                    <select
                      value={form.claimType}
                      onChange={(e) => setForm({ ...form, claimType: e.target.value })}
                      className="rounded-[6px] border border-[#eee] bg-[#fafafa] px-[10px] py-[7px] text-[13px] text-[#262626] outline-none focus:border-[#ddd]"
                    >
                      {claimTypes.map((ct) => (
                        <option key={ct.value} value={ct.value}>{ct.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-[90px_1fr] items-center gap-[8px]">
                    <span className="text-[12px] font-medium text-[#888]">GST</span>
                    <select
                      value={form.gstCode}
                      onChange={(e) => setForm({ ...form, gstCode: e.target.value })}
                      className="rounded-[6px] border border-[#eee] bg-[#fafafa] px-[10px] py-[7px] text-[13px] text-[#262626] outline-none focus:border-[#ddd]"
                    >
                      {gstCodes.map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-[8px] border-t border-[#f0f0f0] px-[24px] py-[14px]">
              <Button variant="ghost" onClick={handleCancel} className="px-[14px] py-[6px]">
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!form.name.trim() || !form.itemNumber.trim()}
                className="px-[14px] py-[6px]"
              >
                Add
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Charge items table */}
      {chargeItems.length === 0 && visibleDisabledItems.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No charge items added"
          description="Add items from the NDIS Support Coordination price list"
          action={{ label: "Add charge item", onClick: () => setIsAdding(true) }}
        />
      ) : (
        <div className="w-full">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_88px_64px_48px_108px_56px_40px] items-center border-b border-[#f0f0f0] px-[20px] py-[12px]">
            <span className="text-[12px] font-medium text-[#888]">Name</span>
            <span className="text-[12px] font-medium text-[#888]">Item Number</span>
            <span className="text-[12px] font-medium text-[#888]">Claim Type</span>
            <span className="text-[12px] font-medium text-[#888] text-right">Price</span>
            <span className="text-[12px] font-medium text-[#888]">Unit</span>
            <span className="text-[12px] font-medium text-[#888]">GST</span>
            <span className="text-[12px] font-medium text-[#888]">Enabled</span>
            <span />
          </div>

          {/* Enabled rows */}
          {chargeItems.map((item) => renderChargeRow(item, true))}

          {/* Disabled rows */}
          {visibleDisabledItems.length > 0 && (
            <>
              <div className="border-b border-[#efefef] px-[20px] pb-[8px] pt-[20px]">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#999]">Disabled</span>
              </div>
              {visibleDisabledItems.map((item) => renderChargeRow(item, false))}
            </>
          )}
        </div>
      )}

      <p className="mt-[20px] text-[12px] text-[#bbb]">
        Source: NDIS Pricing Arrangements and Price Limits 2025–26, effective 1 July 2025.
      </p>
    </SettingsGuard>
  )
}
