"use client"

import { useState, useRef, useEffect } from "react"
import { Tag, Plus, X, Search, Trash2, FileText, Hash, Receipt, DollarSign, Clock, BookOpen } from "lucide-react"
import { ndisCharges, claimTypes, gstCodes, type ChargeItem } from "@/lib/ndis-charges"
import { useCharges } from "@/lib/hooks/use-charges"

const emptyForm: Omit<ChargeItem, "id"> = {
  name: "",
  itemNumber: "",
  claimType: "direct-service",
  price: 0,
  unit: "hour",
  gstCode: "P2",
  reference: "",
}

interface CustomSelectProps {
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
  placeholder?: string
  icon?: React.ReactNode
}

function CustomSelect({ value, options, onChange, placeholder, icon }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isOpen])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] text-left text-[13px] font-medium text-[#262626] outline-none"
        tabIndex={0}
      >
        {icon}
        <span className={selected ? "text-[#262626]" : "text-[#ccc]"}>{selected?.label ?? placeholder ?? "Empty"}</span>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[59]" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-[60] mt-[4px] max-h-[200px] w-full min-w-[180px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false) }}
                className={`flex w-full items-center px-[12px] py-[7px] text-left text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${opt.value === value ? "bg-[#f0f0f0] text-[#262626]" : "text-[#555]"}`}
                tabIndex={0}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function ChargesSettingsPage() {
  const { chargeItems, addChargeItem, removeChargeItem } = useCharges()
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchIdx, setSearchIdx] = useState(-1)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

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
    : []

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
    setToast(`Added ${form.reference || form.name}`)
  }

  const handleRemove = (item: ChargeItem) => {
    removeChargeItem(item.id)
    setToast(`Removed ${item.reference || item.name}`)
  }

  const handleCancel = () => {
    setIsAdding(false)
    setForm(emptyForm)
    setSearchQuery("")
    setIsSearchOpen(false)
  }

  const claimLabel = (val: string) => claimTypes.find((c) => c.value === val)?.label ?? val

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
        Add NDIS line items that are available when logging charges against tasks. Search the NDIS Pricing Arrangements to auto-fill, or add details manually.
      </p>

      <button
        onClick={() => setIsAdding(true)}
        className="mb-[20px] flex items-center gap-[6px] rounded-lg border border-[#dcdcdc] px-[12px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
        tabIndex={0}
      >
        <Plus className="h-[14px] w-[14px]" strokeWidth={1.75} />
        Add charge item
      </button>

      {/* Popup modal */}
      {isAdding && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20" onClick={() => handleCancel()} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[540px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-[#e7e7e7] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#f0f0f0] px-[24px] py-[16px]">
              <h2 className="text-[15px] font-semibold text-[#262626]">Add charge item</h2>
              <button
                onClick={handleCancel}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-md text-[#999] transition-colors hover:bg-[#f0f0f0] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.75} />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-[24px] py-[20px]">
              {/* Search */}
              <div className="mb-[20px]">
                <label className="mb-[6px] block text-[12px] font-medium text-[#888]">Search current NDIS Pricing Arrangements</label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2">
                    <Search className="h-[14px] w-[14px] text-[#bbb]" strokeWidth={1.75} />
                  </div>
                  <input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); setSearchIdx(-1) }}
                    onFocus={() => { if (searchQuery.trim()) setIsSearchOpen(true) }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search by name or item number..."
                    className="w-full rounded-lg border border-[#dcdcdc] py-[9px] pl-[32px] pr-[32px] text-[13px] text-[#262626] placeholder:text-[#bbb] focus:border-[#999] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(""); setIsSearchOpen(false) }}
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
                        className="absolute left-0 top-full z-[60] mt-[4px] max-h-[200px] w-full overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
                      >
                        {searchResults.map((item, idx) => (
                          <button
                            key={item.itemNumber}
                            onClick={() => handleSelectFromSearch(item)}
                            className={`flex w-full flex-col px-[14px] py-[8px] text-left transition-colors hover:bg-[#f5f5f5] ${idx === searchIdx ? "bg-[#f0f0f0]" : ""}`}
                            tabIndex={0}
                          >
                            <span className="text-[13px] font-medium text-[#262626]">{item.name}</span>
                            <div className="mt-[2px] flex items-center gap-[8px]">
                              <span className="font-mono text-[11px] text-[#999]">{item.itemNumber}</span>
                              <span className="text-[11px] text-[#bbb]">·</span>
                              <span className="text-[11px] text-[#999]">${item.price.toFixed(2)}/{item.unit === "hour" ? "hr" : "ea"}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {isSearchOpen && searchQuery.trim() && searchResults.length === 0 && (
                    <>
                      <div className="fixed inset-0 z-[55]" onClick={() => setIsSearchOpen(false)} />
                      <div className="absolute left-0 top-full z-[60] mt-[4px] w-full rounded-lg border border-[#e0e0e0] bg-white px-[14px] py-[12px] text-[12px] text-[#999] shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                        No matching items found. You can add details manually below.
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-[2px] border-t border-[#f0f0f0] pt-[16px]">
                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Name</span>
                  <div className="flex items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] transition-colors hover:bg-[#f7f7f7]">
                    <FileText className={`h-[13px] w-[13px] shrink-0 ${form.name ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Empty"
                      className="w-full bg-transparent text-[13px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Number</span>
                  <div className="flex items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] transition-colors hover:bg-[#f7f7f7]">
                    <Hash className={`h-[13px] w-[13px] shrink-0 ${form.itemNumber ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                    <input
                      value={form.itemNumber}
                      onChange={(e) => setForm({ ...form, itemNumber: e.target.value })}
                      placeholder="Empty"
                      className="w-full bg-transparent text-[13px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Claim type</span>
                  <div className="rounded-[10px] transition-colors hover:bg-[#f7f7f7]">
                    <CustomSelect
                      value={form.claimType}
                      options={claimTypes}
                      onChange={(v) => setForm({ ...form, claimType: v })}
                      icon={<Receipt className="h-[13px] w-[13px] shrink-0 text-[#888]" strokeWidth={1.5} />}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Price</span>
                  <div className="flex items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] transition-colors hover:bg-[#f7f7f7]">
                    <DollarSign className={`h-[13px] w-[13px] shrink-0 ${form.price ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                    <input
                      type="number"
                      step="0.01"
                      value={form.price || ""}
                      onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-full bg-transparent text-[13px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Unit</span>
                  <div className="rounded-[10px] transition-colors hover:bg-[#f7f7f7]">
                    <CustomSelect
                      value={form.unit}
                      options={[{ value: "hour", label: "Hour" }, { value: "each", label: "Each" }]}
                      onChange={(v) => setForm({ ...form, unit: v as "hour" | "each" })}
                      icon={<Clock className="h-[13px] w-[13px] shrink-0 text-[#888]" strokeWidth={1.5} />}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">GST Code</span>
                  <div className="rounded-[10px] transition-colors hover:bg-[#f7f7f7]">
                    <CustomSelect
                      value={form.gstCode}
                      options={gstCodes}
                      onChange={(v) => setForm({ ...form, gstCode: v })}
                      icon={<Tag className="h-[13px] w-[13px] shrink-0 text-[#888]" strokeWidth={1.5} />}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Reference</span>
                  <div className="flex items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] transition-colors hover:bg-[#f7f7f7]">
                    <BookOpen className={`h-[13px] w-[13px] shrink-0 ${form.reference ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                    <input
                      value={form.reference}
                      onChange={(e) => setForm({ ...form, reference: e.target.value })}
                      placeholder="Empty"
                      className="w-full bg-transparent text-[13px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-[8px] border-t border-[#f0f0f0] px-[24px] py-[14px]">
              <button
                onClick={handleCancel}
                className="rounded-lg px-[14px] py-[7px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!form.name.trim() || !form.itemNumber.trim()}
                className="rounded-lg bg-[#262626] px-[14px] py-[7px] text-[13px] font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-30"
                tabIndex={0}
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}

      {/* Charge items table */}
      {chargeItems.length === 0 ? (
        <div className="px-[20px] py-[40px] text-center">
          <Tag className="mx-auto h-[24px] w-[24px] text-[#ddd]" strokeWidth={1.5} />
          <p className="mt-[8px] text-[13px] font-medium text-[#999]">No charge items added</p>
          <p className="mt-[2px] text-[12px] text-[#bbb]">Add charge items to use when logging time against tasks</p>
        </div>
      ) : (
        <div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-sidebar-border">
                <th className="pb-[10px] text-left text-[12px] font-medium text-sidebar-muted">Reference</th>
                <th className="pb-[10px] text-left text-[12px] font-medium text-sidebar-muted">Item Number</th>
                <th className="pb-[10px] text-left text-[12px] font-medium text-sidebar-muted">Claim Type</th>
                <th className="pb-[10px] text-right text-[12px] font-medium text-sidebar-muted">Price</th>
                <th className="pb-[10px] text-left text-[12px] font-medium text-sidebar-muted">Unit</th>
                <th className="pb-[10px] text-left text-[12px] font-medium text-sidebar-muted">GST</th>
                <th className="w-[40px] pb-[10px]" />
              </tr>
            </thead>
            <tbody>
              {chargeItems.map((item) => (
                <tr
                  key={item.id}
                  className="group border-b border-sidebar-border transition-colors last:border-b-0 hover:bg-[#fafafa]"
                >
                  <td className="py-[12px]">
                    <span className="text-[13px] font-medium text-[#262626]">{item.reference || item.name}</span>
                  </td>
                  <td className="py-[12px]">
                    <span className="text-[13px] font-medium text-sidebar-muted">{item.itemNumber}</span>
                  </td>
                  <td className="py-[12px] text-[13px] font-medium text-sidebar-muted">{claimLabel(item.claimType)}</td>
                  <td className="py-[12px] text-right text-[13px] font-medium text-[#262626]">${item.price.toFixed(2)}</td>
                  <td className="py-[12px] text-[13px] font-medium text-sidebar-muted">{item.unit === "hour" ? "Hour" : "Each"}</td>
                  <td className="py-[12px] text-[13px] font-medium text-sidebar-muted">{item.gstCode}</td>
                  <td className="py-[12px]">
                    <button
                      onClick={() => handleRemove(item)}
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-[#ddd] opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-400"
                      tabIndex={0}
                      aria-label={`Remove ${item.reference || item.name}`}
                    >
                      <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-[16px] text-[11px] font-medium text-[#bbb]">
        Source: NDIS Support Catalogue 2025–26 v1.1, effective 24 Nov 2025.
      </p>

      {toast && (
        <div className="fixed bottom-[24px] left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[#e0e0e0] bg-white px-[16px] py-[10px] text-[13px] font-medium text-[#262626] shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
