"use client"

import { useMemo, useRef, useState } from "react"
import { Building2, ChevronDown, Download, Paperclip, Upload, X } from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"
import { SearchableEntityDropdown } from "@/components/searchable-entity-dropdown"
import { FixedSelectDropdown, FixedSelectOption } from "@/components/fixed-select-dropdown"
import { Button } from "@/components/button"
import {
  getOrderFundingSourceLabel,
  getOrderStatusClasses,
  getOrderStatusLabel,
  isOrderEditable,
  orderFundingSources,
  orderStatuses,
} from "@/lib/orders"
import type { OrderInput } from "@/lib/hooks/use-orders"
import type { Client, Order, OrderFundingSource, OrderStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface OrderSidebarFormProps {
  mode: "add" | "edit"
  order?: Order | null
  clients: Client[]
  isAdmin: boolean
  isSaving: boolean
  onSave: (input: OrderInput, file: File | null) => Promise<void>
  onSend?: () => Promise<void>
  onApprove?: () => Promise<void>
  onReturn?: () => Promise<void>
  onDelete?: () => Promise<void>
  onDownloadAttachment?: () => Promise<void>
  onClose: () => void
}

const emptyForm: OrderInput = {
  clientId: null,
  clientName: "",
  title: "",
  amount: 0,
  fundingSource: "none",
  description: "",
  status: "draft",
}

export function OrderSidebarForm({
  mode,
  order,
  clients,
  isAdmin,
  isSaving,
  onSave,
  onSend,
  onApprove,
  onReturn,
  onDelete,
  onDownloadAttachment,
  onClose,
}: OrderSidebarFormProps) {
  const isEditing = mode === "edit"
  const editable = !order || isOrderEditable(order.status)
  const [form, setForm] = useState<OrderInput>(() =>
    order
      ? {
          clientId: order.clientId,
          clientName: order.clientName,
          title: order.title,
          amount: order.amount,
          fundingSource: order.fundingSource,
          description: order.description,
          status: order.status,
        }
      : emptyForm
  )
  const [file, setFile] = useState<File | null>(null)
  const [isClientOpen, setIsClientOpen] = useState(false)
  const [isFundingOpen, setIsFundingOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const clientBtnRef = useRef<HTMLButtonElement>(null)
  const fundingBtnRef = useRef<HTMLButtonElement>(null)
  const statusBtnRef = useRef<HTMLButtonElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        id: client.id,
        label: client.displayName,
        iconText: client.iconText,
      })),
    [clients]
  )

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === form.clientId) ?? null,
    [clients, form.clientId]
  )

  const attachmentLabel = file?.name || order?.attachmentName || ""
  const statusChanged = !!order && form.status !== order.status
  const canSave = form.title.trim().length > 0 && form.amount >= 0 && (editable || statusChanged)

  const handleSelectClient = (clientId: string) => {
    const client = clients.find((item) => item.id === clientId)
    setForm((current) => ({
      ...current,
      clientId: clientId || null,
      clientName: client?.displayName || "",
    }))
    setIsClientOpen(false)
  }

  const handleSave = async () => {
    if (!canSave) return
    await onSave(form, file)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
        <div>
          <h2 className="text-[13px] font-semibold text-folk-text">
            {isEditing ? "Order details" : "Add order"}
          </h2>
          {order && (
            <span className={cn("mt-[6px] inline-flex h-[22px] items-center rounded-[6px] px-[8px] text-[11px] font-medium", getOrderStatusClasses(form.status))}>
              {getOrderStatusLabel(form.status)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-[24px] w-[24px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
          aria-label="Close order form"
        >
          <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-[24px] py-[14px]">
          {order?.createdByName && (
            <div className="mb-[14px] rounded-[6px] border border-folk-border bg-folk-page px-[12px] py-[10px]">
              <p className="text-[11px] font-medium text-folk-secondary">Created by</p>
              <p className="mt-[2px] text-[13px] font-medium text-folk-text">{order.createdByName}</p>
              {order.approvedByName && (
                <>
                  <p className="mt-[8px] text-[11px] font-medium text-folk-secondary">Approved by</p>
                  <p className="mt-[2px] text-[13px] font-medium text-folk-text">{order.approvedByName}</p>
                </>
              )}
            </div>
          )}

          <div className="mb-[14px]">
            <label className="mb-[6px] block text-[13px] font-medium text-folk-text">Status</label>
            <button
              ref={statusBtnRef}
              type="button"
              onClick={() => setIsStatusOpen((open) => !open)}
              className="flex h-[38px] w-full items-center justify-between rounded-[6px] border border-folk-border bg-white px-[10px] text-left transition-colors hover:border-[#bababa]"
              tabIndex={0}
            >
              <span className="text-[13px] font-medium text-folk-text">{getOrderStatusLabel(form.status)}</span>
              <ChevronDown className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
            </button>
            <FixedSelectDropdown
              isOpen={isStatusOpen}
              anchorRef={statusBtnRef}
              onClose={() => setIsStatusOpen(false)}
              estimatedHeight={orderStatuses.length * 32 + 8}
            >
              {orderStatuses.map((status) => (
                <FixedSelectOption
                  key={status.value}
                  isActive={form.status === status.value}
                  onClick={() => {
                    setForm((current) => ({ ...current, status: status.value as OrderStatus }))
                    setIsStatusOpen(false)
                  }}
                >
                  {status.label}
                </FixedSelectOption>
              ))}
            </FixedSelectDropdown>
          </div>

          <div className="mb-[14px]">
            <label className="mb-[6px] block text-[13px] font-medium text-folk-text">Client</label>
            <button
              ref={clientBtnRef}
              type="button"
              disabled={!editable}
              onClick={() => editable && setIsClientOpen((open) => !open)}
              className={cn(
                "flex h-[36px] w-full items-center gap-[8px] rounded-[6px] border border-folk-border px-[10px] text-left transition-colors",
                editable ? "bg-folk-surface hover:border-[#bababa]" : "cursor-not-allowed bg-folk-page text-folk-secondary"
              )}
              tabIndex={0}
            >
              {selectedClient ? (
                <>
                  <EntityIcon text={selectedClient.iconText} size="sm" />
                  <span className="truncate text-[13px] font-medium text-folk-text">{selectedClient.displayName}</span>
                </>
              ) : (
                <>
                  <Building2 className="h-[13px] w-[13px] shrink-0 text-[#ccc]" strokeWidth={1.5} />
                  <span className="text-[13px] font-medium text-[#ccc]">Select client</span>
                </>
              )}
              <ChevronDown className="ml-auto h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
            </button>
          </div>

          <div className="mb-[14px]">
            <label className="mb-[6px] block text-[13px] font-medium text-folk-text">Title</label>
            <input
              type="text"
              value={form.title}
              disabled={!editable}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="h-[38px] w-full rounded-[6px] border border-folk-border px-[10px] text-[13px] font-medium text-folk-text outline-none transition-colors focus:border-[#a3c4f3] disabled:bg-folk-page disabled:text-folk-secondary"
              placeholder="Order title"
            />
          </div>

          <div className="mb-[14px]">
            <label className="mb-[6px] block text-[13px] font-medium text-folk-text">Amount</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-[13px] font-medium text-folk-secondary">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={Number.isFinite(form.amount) ? form.amount : 0}
                disabled={!editable}
                onChange={(event) => setForm((current) => ({ ...current, amount: Number(event.target.value) || 0 }))}
                className="h-[38px] w-full rounded-[6px] border border-folk-border pl-[22px] pr-[10px] text-[13px] font-medium text-folk-text outline-none transition-colors focus:border-[#a3c4f3] disabled:bg-folk-page disabled:text-folk-secondary"
              />
            </div>
          </div>

          <div className="mb-[14px]">
            <label className="mb-[6px] block text-[13px] font-medium text-folk-text">Funding source</label>
            <button
              ref={fundingBtnRef}
              type="button"
              disabled={!editable}
              onClick={() => editable && setIsFundingOpen((open) => !open)}
              className={cn(
                "flex h-[36px] w-full items-center justify-between rounded-[6px] border border-folk-border px-[10px] text-left transition-colors",
                editable ? "bg-folk-surface hover:border-[#bababa]" : "cursor-not-allowed bg-folk-page text-folk-secondary"
              )}
              tabIndex={0}
            >
              <span className="text-[13px] font-medium text-folk-text">
                {getOrderFundingSourceLabel(form.fundingSource)}
              </span>
              <ChevronDown className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
            </button>
            <FixedSelectDropdown
              isOpen={isFundingOpen}
              anchorRef={fundingBtnRef}
              onClose={() => setIsFundingOpen(false)}
              estimatedHeight={orderFundingSources.length * 32 + 8}
            >
              {orderFundingSources.map((source) => (
                <FixedSelectOption
                  key={source.value}
                  isActive={form.fundingSource === source.value}
                  onClick={() => {
                    setForm((current) => ({ ...current, fundingSource: source.value as OrderFundingSource }))
                    setIsFundingOpen(false)
                  }}
                >
                  {source.label}
                </FixedSelectOption>
              ))}
            </FixedSelectDropdown>
          </div>

          <div className="mb-[14px]">
            <label className="mb-[6px] block text-[13px] font-medium text-folk-text">Description</label>
            <textarea
              value={form.description}
              disabled={!editable}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              rows={4}
              className="w-full resize-none rounded-[6px] border border-folk-border px-[10px] py-[8px] text-[13px] font-medium text-folk-text outline-none transition-colors focus:border-[#a3c4f3] disabled:bg-folk-page disabled:text-folk-secondary"
              placeholder="Add details about this order"
            />
          </div>

          <div className="mb-[14px]">
            <label className="mb-[6px] block text-[13px] font-medium text-folk-text">Attachment</label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              disabled={!editable}
              onChange={(event) => {
                const selected = event.target.files?.[0]
                if (selected) setFile(selected)
                event.target.value = ""
              }}
            />
            <div className="flex items-center gap-[8px]">
              <button
                type="button"
                disabled={!editable}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-[6px] rounded-[6px] border border-folk-border px-[10px] py-[6px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover disabled:cursor-not-allowed disabled:opacity-50"
                tabIndex={0}
              >
                <Upload className="h-[13px] w-[13px]" strokeWidth={1.5} />
                <span>{attachmentLabel ? "Replace file" : "Upload file"}</span>
              </button>
              {attachmentLabel && (
                <span className="inline-flex min-w-0 items-center gap-[4px] truncate text-[12px] font-medium text-folk-secondary">
                  <Paperclip className="h-[12px] w-[12px] shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{attachmentLabel}</span>
                </span>
              )}
              {order?.attachmentStoragePath && onDownloadAttachment && (
                <button
                  type="button"
                  onClick={onDownloadAttachment}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border border-folk-border text-folk-secondary transition-colors hover:bg-folk-hover"
                  tabIndex={0}
                  aria-label="Download attachment"
                >
                  <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-folk-border px-[24px] py-[14px]">
        <div className="flex flex-wrap gap-[8px]">
          {(editable || statusChanged) && (
            <Button onClick={handleSave} disabled={!canSave || isSaving} className="h-[36px] rounded-[6px] px-[16px]">
              {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create order"}
            </Button>
          )}
          {editable && onSend && order && (order.status === "draft" || order.status === "returned") && (
            <Button variant="secondary" onClick={onSend} disabled={isSaving} className="h-[36px] rounded-[6px] px-[16px]">
              Send for approval
            </Button>
          )}
          {isAdmin && order?.status === "sent" && onApprove && (
            <Button onClick={onApprove} disabled={isSaving} className="h-[36px] rounded-[6px] px-[16px]">
              Approve
            </Button>
          )}
          {isAdmin && order?.status === "sent" && onReturn && (
            <Button variant="secondary" onClick={onReturn} disabled={isSaving} className="h-[36px] rounded-[6px] px-[16px]">
              Return
            </Button>
          )}
          {onDelete && order && (order.status === "draft" || isAdmin) && (
            <Button variant="danger" onClick={onDelete} disabled={isSaving} className="h-[36px] rounded-[6px] px-[16px]">
              Delete
            </Button>
          )}
        </div>
      </div>

      <SearchableEntityDropdown
        isOpen={isClientOpen}
        anchorRef={clientBtnRef}
        options={clientOptions}
        selectedId={form.clientId || ""}
        searchPlaceholder="Search clients"
        onSelect={handleSelectClient}
        onClose={() => setIsClientOpen(false)}
        allowNone
        noneLabel="No client"
      />
    </div>
  )
}
