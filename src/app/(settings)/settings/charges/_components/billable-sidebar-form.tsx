"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  billableStatuses,
  chargeItemFromNdis,
  claimTypes,
  formatChargePriceLabel,
  formatChargeUnitLabel,
  gstCodes,
  ndisChargeCategories,
  ndisPricingCatalogue,
  searchNdisCharges,
  type ChargeItem,
} from "@/lib/ndis-charges"

const emptyForm: Omit<ChargeItem, "id"> = {
  name: "",
  itemNumber: "",
  claimType: "direct-service",
  price: 0,
  unit: "hour",
  gstCode: "P2",
  reference: "",
  status: "active",
}

interface BillableSidebarFormProps {
  mode: "add" | "edit"
  item?: ChargeItem
  excludeItemNumbers: string[]
  onSave: (data: Omit<ChargeItem, "id"> & { id?: string }) => void
  onClose: () => void
  onDelete?: () => void
}

export function BillableSidebarForm({
  mode,
  item,
  excludeItemNumbers,
  onSave,
  onClose,
  onDelete,
}: BillableSidebarFormProps) {
  const isEditing = mode === "edit"
  const [form, setForm] = useState<Omit<ChargeItem, "id">>(() =>
    item
      ? {
          name: item.name,
          itemNumber: item.itemNumber,
          claimType: item.claimType,
          price: item.price,
          unit: item.unit,
          gstCode: item.gstCode,
          reference: item.reference,
          status: item.status === "inactive" ? "inactive" : "active",
        }
      : emptyForm
  )
  const [searchQuery, setSearchQuery] = useState(item?.name ?? "")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchIdx, setSearchIdx] = useState(-1)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const categoryOptions = useMemo(
    () => Object.entries(ndisChargeCategories).sort(([, a], [, b]) => a.localeCompare(b)),
    []
  )

  const searchResults = useMemo(
    () =>
      searchNdisCharges(searchQuery, {
        category: categoryFilter || undefined,
        excludeItemNumbers,
        limit: searchQuery.trim() ? 80 : 50,
      }),
    [categoryFilter, excludeItemNumbers, searchQuery]
  )

  useEffect(() => {
    if (!isEditing) setTimeout(() => searchRef.current?.focus(), 50)
  }, [isEditing])

  useEffect(() => {
    if (searchIdx >= 0 && listRef.current) {
      const items = listRef.current.children
      if (items[searchIdx]) (items[searchIdx] as HTMLElement).scrollIntoView({ block: "nearest" })
    }
  }, [searchIdx])

  const handleSelectFromSearch = (selected: ReturnType<typeof searchNdisCharges>[number]) => {
    setForm(chargeItemFromNdis(selected))
    setSearchQuery(selected.name)
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

  const canSave = isEditing ? Boolean(form.itemNumber) : Boolean(form.itemNumber.trim())

  const handleSubmit = () => {
    if (!canSave) return
    onSave(isEditing && item ? { ...form, id: item.id } : form)
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-folk-border bg-folk-surface">
      <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
        <div>
          <h2 className="text-[13px] font-semibold text-folk-text">
            {isEditing ? "Billable details" : "Add billable"}
          </h2>
          {!isEditing && (
            <p className="mt-[2px] text-[12px] text-folk-secondary">
              Search {ndisPricingCatalogue.itemCount} items from the NDIS Support Catalogue
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-[24px] w-[24px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
          aria-label="Close billable form"
        >
          <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[24px] py-[14px]">
        {!isEditing && (
          <>
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Support category</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setIsSearchOpen(true)
                setSearchIdx(-1)
              }}
              className="mb-[14px] h-[36px] w-full rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text outline-none focus:border-[#a3c4f3]"
            >
              <option value="">All categories</option>
              {categoryOptions.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>

            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Search NDIS pricing booklet</label>
            <div className="relative mb-[14px]">
              <div className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2">
                <Search className="h-[14px] w-[14px] text-folk-placeholder" strokeWidth={1.75} />
              </div>
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsSearchOpen(true)
                  setSearchIdx(-1)
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by name, item number, or registration group..."
                className="w-full rounded-none border border-folk-border bg-folk-page py-[9px] pl-[32px] pr-[32px] text-[13px] text-folk-text placeholder:text-folk-placeholder focus:border-[#a3c4f3] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    setIsSearchOpen(true)
                  }}
                  className="absolute right-[10px] top-1/2 -translate-y-1/2 text-folk-placeholder hover:text-folk-secondary"
                  tabIndex={0}
                  aria-label="Clear search"
                >
                  <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
                </button>
              )}
              {isSearchOpen && (
                <>
                  <div className="fixed inset-0 z-[40]" onClick={() => setIsSearchOpen(false)} />
                  <div
                    ref={listRef}
                    className="absolute left-0 top-full z-[50] mt-[4px] max-h-[240px] w-full overflow-y-auto rounded-none border border-folk-border bg-folk-surface py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
                  >
                    {searchResults.length === 0 ? (
                      <p className="px-[14px] py-[12px] text-[13px] text-folk-secondary">
                        {!searchQuery.trim() && !categoryFilter
                          ? "All matching items are already added."
                          : "No matching charge items found."}
                      </p>
                    ) : (
                      searchResults.map((result, idx) => (
                        <button
                          key={result.itemNumber}
                          type="button"
                          onClick={() => handleSelectFromSearch(result)}
                          className={cn(
                            "flex w-full flex-col px-[14px] py-[10px] text-left transition-colors hover:bg-folk-hover",
                            idx === searchIdx && "bg-[var(--folk-border-subtle)]"
                          )}
                          tabIndex={0}
                        >
                          <span className="text-[13px] font-medium text-folk-text">{result.shortName}</span>
                          <span className="mt-[2px] line-clamp-1 text-[12px] text-folk-secondary">{result.name}</span>
                          <div className="mt-[4px] flex flex-wrap items-center gap-[8px]">
                            <span className="font-mono text-[11px] text-folk-secondary">{result.itemNumber}</span>
                            <span className="text-[11px] text-folk-placeholder">·</span>
                            <span className="text-[11px] text-folk-secondary">{formatChargePriceLabel(result)}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {(isEditing || form.itemNumber) && (
          <div className={cn(!isEditing && "border-t border-folk-border-subtle pt-[16px]")}>
            <div className="mb-[14px]">
              <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Name</label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Billable name"
                className="h-[36px] w-full rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
              />
            </div>

            <div className="mb-[14px]">
              <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Item number</label>
              <span className="inline-flex items-center rounded-none border border-folk-border bg-folk-page px-[8px] py-[3px] font-mono text-[12px] font-medium text-[#555]">
                {form.itemNumber}
              </span>
            </div>

            <div className="mb-[14px]">
              <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Price</label>
              <p className="text-[13px] font-medium text-[#555]">
                {form.price > 0
                  ? `$${form.price.toFixed(2)} / ${formatChargeUnitLabel(form.unit).toLowerCase()}`
                  : "Quote required"}
              </p>
            </div>

            <div className="mb-[14px]">
              <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Status</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value === "inactive" ? "inactive" : "active" })
                }
                className="h-[36px] w-full rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text outline-none focus:border-[#a3c4f3]"
              >
                {billableStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <p className="mt-[6px] text-[11px] text-folk-secondary">
                {form.status === "inactive"
                  ? "Inactive billables stay in your list but won't appear when claiming."
                  : "Active billables can be selected on tasks, shifts, and invoices."}
              </p>
            </div>

            <div className="mb-[14px]">
              <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Claim type</label>
              <select
                value={form.claimType}
                onChange={(e) => setForm({ ...form, claimType: e.target.value })}
                className="h-[36px] w-full rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text outline-none focus:border-[#a3c4f3]"
              >
                {claimTypes.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-[14px]">
              <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">GST</label>
              <select
                value={form.gstCode}
                onChange={(e) => setForm({ ...form, gstCode: e.target.value })}
                className="h-[36px] w-full rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text outline-none focus:border-[#a3c4f3]"
              >
                {gstCodes.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {!isEditing && !form.itemNumber && (
          <p className="text-[12px] text-folk-secondary">Select an NDIS item from search to configure this billable.</p>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-[8px] border-t border-folk-border-subtle px-[24px] py-[12px]">
        {isEditing && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="text-[12px] font-medium text-red-600 transition-colors hover:text-red-700"
            tabIndex={0}
          >
            Remove
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-none border border-folk-border bg-folk-surface px-[12px] py-[6px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
            tabIndex={0}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSave}
            className="primary-btn px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
            tabIndex={0}
          >
            {isEditing ? "Save and close" : "Add"}
          </button>
        </div>
      </div>
    </div>
  )
}
