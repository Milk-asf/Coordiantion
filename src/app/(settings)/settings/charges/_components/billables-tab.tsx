"use client"

import { useMemo, useState } from "react"
import { Tag } from "lucide-react"
import { DeleteActionsMenu } from "@/components/delete-actions-menu"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { FormModal } from "@/components/form-modal"
import { useToast } from "@/components/toast"
import { cn } from "@/lib/utils"
import {
  claimTypes,
  formatChargeUnitLabel,
  ndisPricingCatalogue,
  type BillableStatus,
  type ChargeItem,
} from "@/lib/ndis-charges"
import { useCharges } from "@/lib/hooks/use-charges"
import { BillableSidebarForm } from "./billable-sidebar-form"
import {
  TABLE_CELL_INNER,
  TABLE_FULL,
  TABLE_PROFILE_CELL,
  TABLE_PROFILE_CELL_LAST,
  TABLE_PROFILE_HEADER,
  TABLE_PROFILE_HEADER_LAST,
  TABLE_TEXT_CELL,
} from "@/lib/table-styles"

type SidebarMode = "add" | "edit"

export function BillablesTab() {
  const { chargeItems, addChargeItem, removeChargeItem, updateChargeItem, isEnabled } = useCharges()
  const [sidebarMode, setSidebarMode] = useState<SidebarMode | null>(null)
  const [editingItem, setEditingItem] = useState<ChargeItem | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()

  const isSidebarOpen = sidebarMode !== null

  const openAddSidebar = () => {
    setEditingItem(null)
    setSidebarMode("add")
  }

  const openEditSidebar = (item: ChargeItem) => {
    setEditingItem(item)
    setSidebarMode("edit")
  }

  const closeSidebar = () => {
    setSidebarMode(null)
    setEditingItem(null)
  }

  const handleSave = (data: Omit<ChargeItem, "id"> & { id?: string }) => {
    if (sidebarMode === "edit" && data.id) {
      updateChargeItem(data.id, {
        name: data.name,
        reference: data.reference,
        claimType: data.claimType,
        gstCode: data.gstCode,
        status: data.status,
      })
      toast(`Updated ${data.reference || data.name}`, "success")
      closeSidebar()
      return
    }

    if (!data.itemNumber.trim()) return
    if (isEnabled(data.itemNumber)) {
      toast("This billable is already added", "error")
      return
    }

    addChargeItem({ ...data, id: crypto.randomUUID() })
    toast(`Added ${data.reference || data.name}`, "success")
    closeSidebar()
  }

  const handleRemove = (item: ChargeItem) => {
    removeChargeItem(item.id)
    if (editingItem?.id === item.id) closeSidebar()
    toast(`Removed ${item.reference || item.name}`, "success")
  }

  const claimLabel = (val: string) => claimTypes.find((c) => c.value === val)?.label ?? val
  const gstShortLabel = (code: string) => (code === "P1" ? "GST" : code === "P5" ? "Out of scope" : "GST-free")

  const renderStatusBadge = (status: BillableStatus) => {
    const isActive = status !== "inactive"
    return (
      <span
        className={cn(
          "inline-flex h-[22px] items-center rounded-none px-[8px] text-[11px] font-medium",
          isActive ? "bg-green-50 text-green-700" : "bg-[var(--folk-border-subtle)] text-folk-secondary"
        )}
      >
        {isActive ? "Active" : "Inactive"}
      </span>
    )
  }

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return chargeItems
    return chargeItems.filter((item) => {
      const haystack = [
        item.reference,
        item.name,
        item.itemNumber,
        claimLabel(item.claimType),
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [chargeItems, searchQuery])

  const activeCount = chargeItems.filter((item) => item.status !== "inactive").length
  const inactiveCount = chargeItems.length - activeCount

  const excludeItemNumbers = chargeItems
    .filter((item) => item.id !== editingItem?.id)
    .map((item) => item.itemNumber)

  const renderChargeRow = (item: ChargeItem) => {
    const isSelected = editingItem?.id === item.id && sidebarMode === "edit"

    return (
      <tr
        key={item.id}
        onClick={() => openEditSidebar(item)}
        className={cn(
          "cursor-pointer transition-colors hover:bg-folk-hover",
          isSelected && "bg-[#eef4fc] hover:bg-[#eef4fc]",
          item.status === "inactive" && !isSelected && "opacity-70"
        )}
      >
        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
          <div className={TABLE_CELL_INNER}>{item.reference || item.name}</div>
        </td>
        <td className={TABLE_PROFILE_CELL}>
          <div className={TABLE_CELL_INNER}>
            <span className="inline-flex items-center rounded-none border border-folk-border bg-folk-page px-[8px] py-[3px] font-mono text-[12px] font-medium text-[#555]">
              {item.itemNumber}
            </span>
          </div>
        </td>
        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL} text-folk-secondary`}>
          <div className={TABLE_CELL_INNER}>{claimLabel(item.claimType)}</div>
        </td>
        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
          <div className={TABLE_CELL_INNER}>{item.price > 0 ? `$${item.price.toFixed(2)}` : "Quote"}</div>
        </td>
        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL} text-folk-secondary`}>
          <div className={TABLE_CELL_INNER}>{formatChargeUnitLabel(item.unit)}</div>
        </td>
        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL} text-folk-secondary`}>
          <div className={TABLE_CELL_INNER}>{gstShortLabel(item.gstCode)}</div>
        </td>
        <td className={TABLE_PROFILE_CELL}>
          <div className={TABLE_CELL_INNER}>{renderStatusBadge(item.status)}</div>
        </td>
        <td className={TABLE_PROFILE_CELL_LAST} onClick={(e) => e.stopPropagation()}>
          <div className={`${TABLE_CELL_INNER} justify-end`}>
            <DeleteActionsMenu
              onDelete={() => handleRemove(item)}
              itemName={item.reference || item.name}
              confirmTitle="Remove billable"
              confirmDescription={`This will remove ${item.reference || item.name} from your price book.`}
              ariaLabel="Billable actions"
            />
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="flex min-h-[560px]">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-[16px] flex flex-wrap items-center justify-between gap-[12px]">
          <h2 className="text-[14px] font-medium text-folk-text">Billables</h2>
          <div className="flex items-center gap-[10px]">
            <ExpandableTableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search billables…"
              ariaLabel="Search billables"
            />
            <Button onClick={openAddSidebar} className="h-[36px] px-[16px]">
              Add
            </Button>
          </div>
        </div>

        {chargeItems.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No billables added"
            description="Add NDIS support catalogue items to use across tasks, shifts, and invoicing."
            action={{ label: "Add", onClick: openAddSidebar }}
            className="flex-1 rounded-none border border-folk-border-subtle"
          />
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-none border border-folk-border-subtle py-[48px]">
            <p className="text-[13px] text-folk-secondary">No billables match your search.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-none border border-folk-border">
              <table className={`${TABLE_FULL} min-w-[980px]`}>
                <thead>
                  <tr>
                    <th className={TABLE_PROFILE_HEADER}>Name</th>
                    <th className={TABLE_PROFILE_HEADER}>Item number</th>
                    <th className={TABLE_PROFILE_HEADER}>Claim type</th>
                    <th className={TABLE_PROFILE_HEADER}>Price</th>
                    <th className={TABLE_PROFILE_HEADER}>Unit</th>
                    <th className={TABLE_PROFILE_HEADER}>GST</th>
                    <th className={TABLE_PROFILE_HEADER}>Status</th>
                    <th className={TABLE_PROFILE_HEADER_LAST} />
                  </tr>
                </thead>
                <tbody>{filteredItems.map((item) => renderChargeRow(item))}</tbody>
              </table>
            </div>

            <div className="mt-[12px] flex flex-wrap items-center justify-between gap-[8px]">
              <span className="text-[12px] font-medium text-folk-secondary">
                {activeCount} active · {inactiveCount} inactive
              </span>
              <span className="text-[12px] text-folk-placeholder">
                Source: {ndisPricingCatalogue.source} ({ndisPricingCatalogue.version})
              </span>
            </div>
          </>
        )}
      </div>

      {isSidebarOpen && sidebarMode && (
        <FormModal onClose={closeSidebar} width={460}>
          <BillableSidebarForm
            key={editingItem?.id ?? "add"}
            mode={sidebarMode}
            item={editingItem ?? undefined}
            excludeItemNumbers={excludeItemNumbers}
            onSave={handleSave}
            onClose={closeSidebar}
            onDelete={editingItem ? () => handleRemove(editingItem) : undefined}
          />
        </FormModal>
      )}
    </div>
  )
}
