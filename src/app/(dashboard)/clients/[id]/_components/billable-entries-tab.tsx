"use client"

import { useMemo, useRef, useState } from "react"
import { ChevronDown, Coins, ListFilter, Plus, RefreshCw, Trash2, X } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { BillableEntryStatusChip } from "@/components/billable-entry-status-chip"
import { FixedSelectDropdown } from "@/components/fixed-select-dropdown"
import { useToast } from "@/components/toast"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useBillableEntries } from "@/lib/billable-entries/use-billable-entries"
import { useClientRecipients } from "@/lib/finance-contacts/use-client-recipients"
import { useFinanceContacts } from "@/lib/finance-contacts/use-finance-contacts"
import {
  BILLABLE_ENTRY_SOURCE_LABELS,
  computeBillableAmount,
  formatBillableAmount,
  formatBillableDate,
  formatBillableQuantity,
  isBillableEntryEditable,
  type BillableEntry,
  type BillableEntryUnit,
} from "@/lib/billable-entries/types"
import type { NdisChargeItem } from "@/lib/ndis-charges"
import {
  TABLE_FULL,
  TABLE_PANEL_CELL,
  TABLE_PANEL_CELL_LAST,
  TABLE_PANEL_HEADER_STICKY,
  TABLE_PANEL_HEADER_STICKY_LAST,
  TABLE_PANEL_TEXT,
} from "@/lib/table-styles"

interface BillableEntriesTabProps {
  clientId: string
  clientName: string
  enabledCharges: NdisChargeItem[]
}

interface DraftEntry {
  chargeItemNumber: string
  serviceDate: string
  quantity: string
  rate: string
  description: string
}

function emptyDraft(): DraftEntry {
  return {
    chargeItemNumber: "",
    serviceDate: new Date().toISOString().slice(0, 10),
    quantity: "1",
    rate: "",
    description: "",
  }
}

const inputClass =
  "h-[38px] w-full rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none transition-colors focus:border-[#a3c4f3]"

const labelClass = "mb-[4px] block text-[12px] font-medium text-folk-secondary"

export function BillableEntriesTab({ clientId, clientName, enabledCharges }: BillableEntriesTabProps) {
  const { getEntriesForClient, addBillableEntry, updateBillableEntry, deleteBillableEntry, syncEntries } =
    useBillableEntries()
  const { tasks } = useTasks()
  const { financeContacts } = useFinanceContacts()
  const { getRecipient, setRecipient } = useClientRecipients()
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRecipientOpen, setIsRecipientOpen] = useState(false)
  const recipientTriggerRef = useRef<HTMLButtonElement>(null)

  const recipient = getRecipient(clientId)
  const recipientContact = financeContacts.find((contact) => contact.id === recipient.invoiceContactId) ?? null
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftEntry>(emptyDraft)
  const [isChargeOpen, setIsChargeOpen] = useState(false)
  const chargeTriggerRef = useRef<HTMLButtonElement>(null)

  const entries = useMemo(
    () => getEntriesForClient(clientId).sort((a, b) => b.serviceDate.localeCompare(a.serviceDate)),
    [getEntriesForClient, clientId],
  )

  const chargeOptions = useMemo(
    () => enabledCharges.map((charge) => ({ value: charge.itemNumber, label: charge.shortName || charge.name })),
    [enabledCharges],
  )

  const selectedCharge = enabledCharges.find((charge) => charge.itemNumber === draft.chargeItemNumber)
  const draftUnit: BillableEntryUnit = ((selectedCharge?.unit as BillableEntryUnit) || "hour") as BillableEntryUnit
  const previewAmount = computeBillableAmount(Number(draft.quantity) || 0, Number(draft.rate) || 0)
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0)

  const openCreate = () => {
    setEditingId(null)
    setDraft(emptyDraft())
    setIsFormOpen(true)
  }

  const openEdit = (entry: BillableEntry) => {
    if (!isBillableEntryEditable(entry.status)) {
      toast("This entry is locked into a claim or invoice and can't be edited", "error")
      return
    }
    setEditingId(entry.id)
    setDraft({
      chargeItemNumber: entry.chargeItemNumber,
      serviceDate: entry.serviceDate,
      quantity: String(entry.quantity),
      rate: String(entry.rate),
      description: entry.description,
    })
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingId(null)
  }

  const handleSelectCharge = (itemNumber: string) => {
    const charge = enabledCharges.find((c) => c.itemNumber === itemNumber)
    setDraft((prev) => ({
      ...prev,
      chargeItemNumber: itemNumber,
      rate: charge && charge.price > 0 ? String(charge.price) : prev.rate,
    }))
    setIsChargeOpen(false)
  }

  const selectedChargeLabel = selectedCharge?.shortName || selectedCharge?.name || ""

  const handleSave = async () => {
    if (!draft.chargeItemNumber) {
      toast("Select a charge item", "error")
      return
    }
    const quantity = Number(draft.quantity) || 0
    const rate = Number(draft.rate) || 0
    if (quantity <= 0 || rate <= 0) {
      toast("Quantity and rate must be greater than zero", "error")
      return
    }
    const charge = enabledCharges.find((c) => c.itemNumber === draft.chargeItemNumber)
    const input = {
      clientId,
      clientName,
      source: "manual" as const,
      serviceDate: draft.serviceDate,
      chargeItemNumber: draft.chargeItemNumber,
      chargeName: charge?.shortName || charge?.name || "",
      unit: draftUnit,
      quantity,
      rate,
      gstCode: "P2",
      description: draft.description,
    }

    try {
      if (editingId) await updateBillableEntry(editingId, input)
      else await addBillableEntry(input)
      toast(editingId ? "Billable entry updated" : "Billable entry added", "success")
      closeForm()
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to save billable entry", "error")
    }
  }

  const handleDelete = async (entry: BillableEntry) => {
    if (!isBillableEntryEditable(entry.status)) {
      toast("This entry is locked into a claim or invoice and can't be deleted", "error")
      return
    }
    await deleteBillableEntry(entry.id)
    toast("Billable entry deleted", "success")
  }

  const handleSyncFromTasks = async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      const clientTasks = tasks.filter(
        (task) =>
          task.status === "done" &&
          (task.billingApproval ?? "none") === "approved" &&
          (task.clientId === clientId || task.client === clientName) &&
          (task.chargeType || task.secondaryChargeType),
      )

      const inputs = clientTasks.flatMap((task) => {
        const serviceDate = task.dueDate || new Date().toISOString().slice(0, 10)
        const lines: ReturnType<typeof buildTaskLine>[] = []
        if (task.chargeType && task.timeSpent > 0)
          lines.push(buildTaskLine(task.id, task.chargeType, task.timeSpent, serviceDate))
        if (task.secondaryChargeType && (task.secondaryTimeSpent || 0) > 0)
          lines.push(buildTaskLine(task.id, task.secondaryChargeType, task.secondaryTimeSpent || 0, serviceDate))
        return lines.filter((line): line is NonNullable<typeof line> => line !== null)
      })

      if (inputs.length === 0) {
        toast("No completed billable tasks to sync for this participant", "info")
        return
      }

      const added = await syncEntries(inputs)
      toast(
        added > 0
          ? `Synced ${added} billable ${added === 1 ? "entry" : "entries"} from tasks`
          : "Already up to date — no new entries",
        added > 0 ? "success" : "info",
      )
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to sync from tasks", "error")
    } finally {
      setIsSyncing(false)
    }
  }

  function buildTaskLine(taskId: string, chargeItemNumber: string, minutes: number, serviceDate: string) {
    const charge = enabledCharges.find((c) => c.itemNumber === chargeItemNumber)
    if (!charge) return null
    const unit = (charge.unit as BillableEntryUnit) || "hour"
    const quantity = unit === "hour" ? Number((minutes / 60).toFixed(2)) : 1
    return {
      clientId,
      clientName,
      source: "task" as const,
      sourceId: taskId,
      serviceDate,
      chargeItemNumber,
      chargeName: charge.shortName || charge.name,
      unit,
      quantity,
      rate: charge.price,
      gstCode: "P2",
      description: charge.shortName || charge.name,
    }
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-folk-border bg-white px-[16px]">
        <button
          className="flex items-center gap-[6px] folk-pill-btn border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
          tabIndex={0}
        >
          <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>Filter</span>
        </button>
        <div className="flex items-center gap-[8px]">
          <button
            onClick={handleSyncFromTasks}
            disabled={isSyncing}
            className="flex items-center gap-[5px] folk-pill-btn border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover disabled:opacity-50"
            tabIndex={0}
          >
            <RefreshCw className={`h-[13px] w-[13px] ${isSyncing ? "animate-spin" : ""}`} strokeWidth={1.5} />
            <span>Sync from tasks</span>
          </button>
          <button
            onClick={openCreate}
            className="primary-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
            tabIndex={0}
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Add new</span>
          </button>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-[16px] gap-y-[8px] border-b border-folk-border bg-folk-page px-[16px] py-[8px]">
        <div className="flex items-center gap-[8px]">
          <span className="text-[12px] font-medium text-folk-secondary">Invoice recipient</span>
          <div className="relative">
            <button
              ref={recipientTriggerRef}
              type="button"
              onClick={() => setIsRecipientOpen((v) => !v)}
              className="flex h-[28px] min-w-[160px] items-center justify-between gap-[8px] rounded-[6px] border border-folk-border bg-folk-surface px-[10px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
              tabIndex={0}
            >
              <span className={recipientContact ? "text-folk-text" : "text-folk-placeholder"}>
                {recipientContact?.name || "Not set"}
              </span>
              <ChevronDown
                className={`h-[13px] w-[13px] text-folk-secondary transition-transform ${isRecipientOpen ? "rotate-180" : ""}`}
                strokeWidth={1.5}
              />
            </button>
            <FixedSelectDropdown
              isOpen={isRecipientOpen}
              anchorRef={recipientTriggerRef}
              onClose={() => setIsRecipientOpen(false)}
              estimatedHeight={260}
              minWidth={220}
              isEmpty={financeContacts.length === 0}
              emptyMessage="No finance contacts — add them under Finance → Finance contacts"
            >
              <button
                type="button"
                onClick={() => {
                  setRecipient(clientId, { invoiceContactId: null })
                  setIsRecipientOpen(false)
                }}
                className="flex w-full items-center px-[12px] py-[7px] text-left text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover"
                tabIndex={0}
              >
                Not set
              </button>
              {financeContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => {
                    setRecipient(clientId, { invoiceContactId: contact.id })
                    setIsRecipientOpen(false)
                  }}
                  className={`flex w-full flex-col px-[12px] py-[6px] text-left transition-colors hover:bg-folk-hover ${recipient.invoiceContactId === contact.id ? "bg-folk-hover" : ""}`}
                  tabIndex={0}
                >
                  <span className="text-[13px] font-medium text-folk-text">{contact.name}</span>
                  {contact.email && <span className="text-[11px] text-folk-secondary">{contact.email}</span>}
                </button>
              ))}
            </FixedSelectDropdown>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-[6px] text-[12px] font-medium text-folk-text">
          <input
            type="checkbox"
            checked={recipient.ndiaClaims}
            onChange={(e) => setRecipient(clientId, { ndiaClaims: e.target.checked })}
            className="h-[14px] w-[14px] accent-[#2563EB]"
          />
          NDIA Claims recipient
        </label>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={Coins}
          title="No billable entries yet"
          description="Billable entries are the chargeable services delivered to this participant. They flow into NDIS claims and invoices. Add one manually or sync from completed shifts and tasks."
          action={{ label: "Add billable entry", onClick: openCreate }}
          className="flex-1"
        />
      ) : (
        <>
          <div className="flex-1 overflow-auto">
            <table className={TABLE_FULL}>
              <thead>
                <tr>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Service</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Date</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Qty</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Rate</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Amount</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Source</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Status</th>
                  <th className={TABLE_PANEL_HEADER_STICKY_LAST} />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => openEdit(entry)}
                    className="group cursor-pointer transition-colors hover:bg-folk-hover"
                  >
                    <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{entry.description || entry.chargeName || "Service"}</span>
                        <span className="truncate text-[11px] font-normal text-folk-secondary">{entry.chargeItemNumber}</span>
                      </div>
                    </td>
                    <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>{formatBillableDate(entry.serviceDate)}</td>
                    <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>{formatBillableQuantity(entry.quantity, entry.unit)}</td>
                    <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>{formatBillableAmount(entry.rate)}</td>
                    <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>{formatBillableAmount(entry.amount)}</td>
                    <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>{BILLABLE_ENTRY_SOURCE_LABELS[entry.source]}</td>
                    <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>
                      <BillableEntryStatusChip status={entry.status} />
                    </td>
                    <td className={`${TABLE_PANEL_CELL_LAST} ${TABLE_PANEL_TEXT}`}>
                      {isBillableEntryEditable(entry.status) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(entry)
                          }}
                          className="flex h-[24px] w-[24px] items-center justify-center rounded-[6px] text-folk-secondary opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                          aria-label="Delete entry"
                          tabIndex={0}
                        >
                          <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.75} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex shrink-0 items-center justify-between border-t border-folk-border px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-folk-secondary">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </span>
            <span className="text-[12px] font-semibold text-folk-text">Total {formatBillableAmount(total)}</span>
          </div>
        </>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={closeForm} />
          <div className="relative z-10 w-[440px] rounded-[6px] bg-folk-surface shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between px-[24px] pt-[20px]">
              <div className="flex items-center gap-[8px]">
                <Coins className="h-[16px] w-[16px] text-[#555]" strokeWidth={1.5} />
                <h2 className="text-[15px] font-semibold text-folk-text">
                  {editingId ? "Edit billable entry" : "Add billable entry"}
                </h2>
              </div>
              <button
                onClick={closeForm}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
                aria-label="Close"
                tabIndex={0}
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="px-[24px] pb-[20px] pt-[16px]">
              <div className="mb-[14px]">
                <label className={labelClass}>Charge item *</label>
                <div className="relative">
                  <button
                    ref={chargeTriggerRef}
                    type="button"
                    onClick={() => setIsChargeOpen((v) => !v)}
                    className="flex h-[38px] w-full items-center justify-between rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] font-medium outline-none transition-colors focus:border-[#a3c4f3]"
                    tabIndex={0}
                  >
                    <span className={selectedChargeLabel ? "text-folk-text" : "text-folk-placeholder"}>
                      {selectedChargeLabel || "Select a charge"}
                    </span>
                    <ChevronDown
                      className={`h-[14px] w-[14px] text-folk-secondary transition-transform ${isChargeOpen ? "rotate-180" : ""}`}
                      strokeWidth={1.5}
                    />
                  </button>
                  <FixedSelectDropdown
                    isOpen={isChargeOpen}
                    anchorRef={chargeTriggerRef}
                    onClose={() => setIsChargeOpen(false)}
                    estimatedHeight={280}
                    minWidth={chargeTriggerRef.current?.getBoundingClientRect().width ?? 360}
                    isEmpty={chargeOptions.length === 0}
                    emptyMessage="No charges enabled — add them in Settings → Charges"
                  >
                    {chargeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelectCharge(option.value)}
                        className={`flex w-full items-center px-[12px] py-[7px] text-left text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover ${draft.chargeItemNumber === option.value ? "bg-folk-hover" : ""}`}
                        tabIndex={0}
                      >
                        {option.label}
                      </button>
                    ))}
                  </FixedSelectDropdown>
                </div>
              </div>

              <div className="mb-[14px]">
                <label className={labelClass}>Service date *</label>
                <input
                  type="date"
                  value={draft.serviceDate}
                  onChange={(e) => setDraft((prev) => ({ ...prev, serviceDate: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="mb-[14px] grid grid-cols-2 gap-[12px]">
                <div>
                  <label className={labelClass}>Quantity ({draftUnit}) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.quantity}
                    onChange={(e) => setDraft((prev) => ({ ...prev, quantity: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Rate *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.rate}
                    onChange={(e) => setDraft((prev) => ({ ...prev, rate: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mb-[16px]">
                <label className={labelClass}>Description</label>
                <input
                  type="text"
                  placeholder="Optional note"
                  value={draft.description}
                  onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="mb-[18px] flex items-center justify-between border-t border-folk-border-subtle pt-[12px]">
                <span className="text-[12px] font-medium text-folk-secondary">Amount</span>
                <span className="text-[15px] font-semibold text-folk-text">{formatBillableAmount(previewAmount)}</span>
              </div>

              <div className="flex justify-end gap-[8px]">
                <button
                  onClick={closeForm}
                  className="outline-btn px-[12px] py-[7px] text-[13px] font-medium transition-colors"
                  tabIndex={0}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="primary-btn px-[16px] py-[7px] text-[13px] font-medium transition-colors"
                  tabIndex={0}
                >
                  {editingId ? "Save" : "Add entry"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
