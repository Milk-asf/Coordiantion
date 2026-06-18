"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ListFilter, Plus, ShoppingCart, X } from "lucide-react"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { PageError, PageLoader } from "@/components/page-state"
import { SearchBar } from "@/components/search-bar"
import { useToast } from "@/components/toast"
import { useClients } from "@/lib/hooks/use-clients"
import { useOrders } from "@/lib/hooks/use-orders"
import { usePermissions } from "@/lib/hooks/use-permissions"
import {
  formatOrderAmount,
  formatOrderDate,
  getOrderFundingSourceLabel,
  getOrderStatusClasses,
  getOrderStatusLabel,
  orderFundingSources,
  orderStatuses,
} from "@/lib/orders"
import type { Order, OrderFundingSource, OrderStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  TABLE_CELL_INNER,
  TABLE_FULL,
  TABLE_PANEL_HEADER,
  TABLE_PANEL_HEADER_LAST,
  TABLE_PROFILE_CELL,
  TABLE_PROFILE_CELL_LAST,
  TABLE_TEXT_CELL,
} from "@/lib/table-styles"
import { OrderSidebarForm } from "./_components/order-sidebar-form"

type SidebarMode = "add" | "edit"

export default function OrdersPage() {
  const { toast } = useToast()
  const { clients } = useClients()
  const { role } = usePermissions()
  const isAdmin = role === "admin" || role === "super-admin"
  const {
    orders,
    isLoading,
    fetchError,
    addOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    getAttachmentUrl,
    refetch,
  } = useOrders()

  const [sidebarMode, setSidebarMode] = useState<SidebarMode | null>(null)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all")
  const [fundingFilter, setFundingFilter] = useState<OrderFundingSource | "all">("all")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const isSidebarOpen = sidebarMode !== null

  const openAddSidebar = () => {
    setEditingOrder(null)
    setSidebarMode("add")
  }

  const openEditSidebar = (order: Order) => {
    setEditingOrder(order)
    setSidebarMode("edit")
  }

  const closeSidebar = () => {
    setSidebarMode(null)
    setEditingOrder(null)
  }

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false
      if (fundingFilter !== "all" && order.fundingSource !== fundingFilter) return false
      if (clientFilter !== "all" && order.clientId !== clientFilter) return false
      if (!query) return true
      const haystack = [
        order.title,
        order.clientName,
        order.createdByName,
        getOrderFundingSourceLabel(order.fundingSource),
        getOrderStatusLabel(order.status),
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [clientFilter, fundingFilter, orders, searchQuery, statusFilter])

  const activeFilterCount = [
    statusFilter !== "all",
    fundingFilter !== "all",
    clientFilter !== "all",
  ].filter(Boolean).length

  const handleSave = async (input: Parameters<typeof addOrder>[0], file: File | null) => {
    setIsSaving(true)
    try {
      if (sidebarMode === "edit" && editingOrder) {
        await updateOrder(editingOrder.id, input, file)
        toast("Order updated", "success")
      } else {
        await addOrder(input, file)
        toast("Order created", "success")
      }
      closeSidebar()
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to save order", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (status: OrderStatus, successMessage: string) => {
    if (!editingOrder) return
    setIsSaving(true)
    try {
      await updateOrderStatus(editingOrder.id, status)
      toast(successMessage, "success")
      closeSidebar()
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to update order", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingOrder) return
    setIsSaving(true)
    try {
      await deleteOrder(editingOrder.id)
      toast("Order deleted", "success")
      closeSidebar()
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to delete order", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadAttachment = async () => {
    if (!editingOrder?.attachmentStoragePath) return
    const url = await getAttachmentUrl(editingOrder.attachmentStoragePath)
    if (!url) {
      toast("Attachment unavailable", "error")
      return
    }
    window.open(url, "_blank", "noopener,noreferrer")
  }

  if (isLoading) return <PageLoader label="Loading orders…" />
  if (fetchError && orders.length === 0) return <PageError message="Failed to load orders" onRetry={refetch} />

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-folk-border bg-folk-nav px-[16px]">
            <span className="text-[13px] font-medium text-folk-text">Orders</span>
            <Button onClick={openAddSidebar} className="h-[32px] rounded-none px-[14px]">
              <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>Add new</span>
            </Button>
          </div>

          <div className="flex h-[41px] shrink-0 items-center gap-[8px] border-b border-folk-border bg-folk-nav px-[16px]">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search orders"
              className="w-[220px]"
              ariaLabel="Search orders"
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterOpen((open) => !open)}
                className="flex items-center gap-[6px] rounded-none border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                tabIndex={0}
              >
                <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="rounded-none bg-[#eef4fc] px-[5px] py-[0.5px] text-[10px] font-semibold text-[#2563EB]">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className="h-[12px] w-[12px] text-folk-secondary" strokeWidth={1.75} />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-[55]" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute left-0 top-full z-[60] mt-[4px] w-[240px] rounded-none border border-folk-border bg-folk-surface p-[12px] shadow-folk">
                    <div className="mb-[10px]">
                      <label className="mb-[4px] block text-[11px] font-medium text-folk-secondary">Status</label>
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "all")}
                        className="h-[32px] w-full rounded-none border border-folk-border px-[8px] text-[13px] font-medium text-folk-text"
                      >
                        <option value="all">All statuses</option>
                        {orderStatuses.map((status) => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-[10px]">
                      <label className="mb-[4px] block text-[11px] font-medium text-folk-secondary">Funding source</label>
                      <select
                        value={fundingFilter}
                        onChange={(event) => setFundingFilter(event.target.value as OrderFundingSource | "all")}
                        className="h-[32px] w-full rounded-none border border-folk-border px-[8px] text-[13px] font-medium text-folk-text"
                      >
                        <option value="all">All funding sources</option>
                        {orderFundingSources.map((source) => (
                          <option key={source.value} value={source.value}>{source.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-[4px] block text-[11px] font-medium text-folk-secondary">Client</label>
                      <select
                        value={clientFilter}
                        onChange={(event) => setClientFilter(event.target.value)}
                        className="h-[32px] w-full rounded-none border border-folk-border px-[8px] text-[13px] font-medium text-folk-text"
                      >
                        <option value="all">All clients</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>{client.displayName}</option>
                        ))}
                      </select>
                    </div>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("all")
                          setFundingFilter("all")
                          setClientFilter("all")
                        }}
                        className="mt-[10px] flex items-center gap-[4px] text-[12px] font-medium text-folk-secondary transition-colors hover:text-folk-text"
                        tabIndex={0}
                      >
                        <X className="h-[12px] w-[12px]" strokeWidth={1.5} />
                        Clear filters
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <span className="ml-auto text-[12px] font-medium text-folk-secondary">
              {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
            </span>
          </div>

          <div className="flex-1 overflow-auto bg-folk-surface">
            {filteredOrders.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="No orders yet"
                description="Create an order to track purchases and approvals."
                className="py-[80px]"
              />
            ) : (
              <table className={TABLE_FULL} style={{ tableLayout: "fixed", minWidth: 980 }}>
                <thead>
                  <tr>
                    <th className={`${TABLE_PANEL_HEADER} w-[220px]`}>Title</th>
                    <th className={`${TABLE_PANEL_HEADER} w-[180px]`}>Client</th>
                    <th className={`${TABLE_PANEL_HEADER} w-[120px]`}>Amount</th>
                    <th className={`${TABLE_PANEL_HEADER} w-[130px]`}>Funding</th>
                    <th className={`${TABLE_PANEL_HEADER} w-[110px]`}>Status</th>
                    <th className={`${TABLE_PANEL_HEADER} w-[150px]`}>Created by</th>
                    <th className={`${TABLE_PANEL_HEADER_LAST} w-[110px]`}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const isSelected = editingOrder?.id === order.id && sidebarMode === "edit"
                    return (
                      <tr
                        key={order.id}
                        onClick={() => openEditSidebar(order)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-folk-hover",
                          isSelected && "bg-[#eef4fc] hover:bg-[#eef4fc]"
                        )}
                      >
                        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                          <div className={TABLE_CELL_INNER}>
                            <span className="truncate">{order.title}</span>
                          </div>
                        </td>
                        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                          <div className={TABLE_CELL_INNER}>
                            <span className="truncate">{order.clientName || "—"}</span>
                          </div>
                        </td>
                        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                          <div className={TABLE_CELL_INNER}>{formatOrderAmount(order.amount)}</div>
                        </td>
                        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL} text-folk-secondary`}>
                          <div className={TABLE_CELL_INNER}>{getOrderFundingSourceLabel(order.fundingSource)}</div>
                        </td>
                        <td className={TABLE_PROFILE_CELL}>
                          <div className={TABLE_CELL_INNER}>
                            <span className={cn("inline-flex h-[22px] items-center rounded-none px-[8px] text-[11px] font-medium", getOrderStatusClasses(order.status))}>
                              {getOrderStatusLabel(order.status)}
                            </span>
                          </div>
                        </td>
                        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                          <div className={TABLE_CELL_INNER}>
                            <span className="truncate">{order.createdByName || "—"}</span>
                          </div>
                        </td>
                        <td className={`${TABLE_PROFILE_CELL_LAST} ${TABLE_TEXT_CELL} text-folk-secondary`}>
                          <div className={TABLE_CELL_INNER}>{formatOrderDate(order.createdAt)}</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {isSidebarOpen && (
          <>
            <div className="w-[4px] shrink-0 border-l border-folk-border" />
            <div className="flex h-full w-[360px] shrink-0 flex-col overflow-y-auto bg-folk-surface">
              <OrderSidebarForm
                mode={sidebarMode === "edit" ? "edit" : "add"}
                order={editingOrder}
                clients={clients}
                isAdmin={isAdmin}
                isSaving={isSaving}
                onSave={handleSave}
                onSend={() => handleStatusChange("sent", "Order sent for approval")}
                onApprove={() => handleStatusChange("approved", "Order approved")}
                onReturn={() => handleStatusChange("returned", "Order returned")}
                onDelete={editingOrder ? handleDelete : undefined}
                onDownloadAttachment={handleDownloadAttachment}
                onClose={closeSidebar}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
