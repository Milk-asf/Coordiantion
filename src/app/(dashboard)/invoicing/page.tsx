"use client"

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, ChevronDown, FileText, Mail, Download as DownloadIcon } from "lucide-react"
import { useClients } from "@/lib/hooks/use-clients"
import { useInvoices } from "@/lib/hooks/use-invoices"
import { useWorkspace } from "@/lib/workspace-context"
import { useWorkspaceSettings } from "@/lib/hooks/use-workspace-settings"
import { useBillableEntries } from "@/lib/billable-entries/use-billable-entries"
import { useClientRecipients } from "@/lib/finance-contacts/use-client-recipients"
import { useFinanceContacts } from "@/lib/finance-contacts/use-finance-contacts"
import { useTimesheets } from "@/lib/timesheets-context"
import { useRosterContext } from "@/lib/roster-context"
import { useCharges } from "@/lib/hooks/use-charges"
import { buildBillableInputsFromShiftTimesheet } from "@/lib/roster/compliance"
import { getRosterSettings } from "@/lib/roster/settings"
import { FixedSelectDropdown } from "@/components/fixed-select-dropdown"
import { Switch } from "@/components/switch"
import type { BillableEntry } from "@/lib/billable-entries/types"
import { formatBillableAmount, formatBillableDate, formatBillableQuantity } from "@/lib/billable-entries/types"
import type { Client, InvoiceLineItem } from "@/lib/types"
import { listViewBodyClass } from "@/components/tab-active-indicator"
import { PageLoader, PageError } from "@/components/page-state"
import { EmptyState } from "@/components/empty-state"
import { useToast } from "@/components/toast"
import {
  TABLE_FULL,
  TABLE_HEADER_CELL,
  TABLE_HEADER_CELL_LAST,
  TABLE_CELL_BASE,
  TABLE_CELL_LAST,
  TABLE_CELL_INNER,
  TABLE_ROW_HOVER,
  TABLE_TEXT_CELL,
  TABLE_NAME_CELL,
} from "@/lib/table-styles"
import { cn } from "@/lib/utils"
import { roundMoney, computeGstAmount } from "./_components/invoicing-utils"
import { InvoicingNav } from "./_components/invoicing-nav"

function firstDayOfMonthIso(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

type SendMethod = "create" | "email"

interface ParticipantGroup {
  client: Client | null
  clientId: string
  name: string
    recipientName: string
  recipientEmail: string
  entries: BillableEntry[]
}

const NUMERIC_INNER = "flex h-full items-center justify-end gap-[6px] overflow-hidden text-right"

interface TriCheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
  ariaLabel: string
}

function TriCheckbox({ checked, indeterminate = false, onChange, ariaLabel }: TriCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked
  }, [indeterminate, checked])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      className="h-[14px] w-[14px] cursor-pointer accent-[#2563EB]"
    />
  )
}

export default function InvoicingPage() {
  const { toast } = useToast()
  const { clients, isLoading: clientsLoading, fetchError: clientsError } = useClients()
  const {
    billableEntries,
    isLoading: entriesLoading,
    fetchError: entriesError,
    setBillableEntryStatus,
    syncEntries,
    refetch: refetchEntries,
  } = useBillableEntries()
  const { getRecipient } = useClientRecipients()
  const { financeContacts } = useFinanceContacts()
  const { addInvoice, markInvoiceSent } = useInvoices()
  const { activeWorkspace } = useWorkspace()
  const { settings } = useWorkspaceSettings()
  const { billableTimesheets, markInvoiced, isLoading: timesheetsLoading } = useTimesheets()
  const { shifts, isLoading: shiftsLoading } = useRosterContext()
  const { enabledCharges, chargeItems, isLoading: chargesLoading } = useCharges()

  // Funnel approved, uninvoiced timesheets into billable entries so delivered
  // shift work is invoiced through this single Create invoices flow. Deduped by
  // timesheet id, so re-running never double-creates a line.
  const shiftSyncSigRef = useRef("")
  useEffect(() => {
    if (entriesLoading || timesheetsLoading || shiftsLoading || clientsLoading || chargesLoading) return
    if (billableTimesheets.length === 0) return
    const signature = billableTimesheets.map((t) => t.id).sort().join(",")
    if (signature === shiftSyncSigRef.current) return
    shiftSyncSigRef.current = signature

    const shiftById = new Map(shifts.map((s) => [s.id, s]))
    const compliance = getRosterSettings().compliance
    const inputs = billableTimesheets.flatMap((timesheet) => {
      const shift = timesheet.shiftId ? shiftById.get(timesheet.shiftId) : undefined
      if (!shift) return []
      const client = clients.find((c) => c.id === shift.clientId)
      if (!client) return []
      return buildBillableInputsFromShiftTimesheet(
        timesheet,
        { ...shift, clientName: client.displayName || client.name },
        enabledCharges,
        chargeItems,
        { billAllChargeTypes: compliance.billAllChargeTypes },
      ).map((input) => ({
        ...input,
        description: `Support delivered ${formatBillableDate(timesheet.startDate)}`,
      }))
    })
    if (inputs.length > 0) void syncEntries(inputs)
  }, [
    billableTimesheets,
    shifts,
    clients,
    enabledCharges,
    chargeItems,
    entriesLoading,
    timesheetsLoading,
    shiftsLoading,
    clientsLoading,
    chargesLoading,
    syncEntries,
  ])

  const [fromDate, setFromDate] = useState(firstDayOfMonthIso())
  const [toDate, setToDate] = useState(todayIso())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [amountsIncludeGst, setAmountsIncludeGst] = useState(true)
  const [sendMethod, setSendMethod] = useState<SendMethod>("create")
  const [isCreating, setIsCreating] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [summary, setSummary] = useState<{ created: number; emailed: number; failed: number; messages: string[] } | null>(null)
  const createTriggerRef = useRef<HTMLButtonElement>(null)

  const getClient = useCallback(
    (clientId: string | null) => (clientId ? clients.find((c) => c.id === clientId) ?? null : null),
    [clients],
  )

  // Invoiceable entries: unpaid, linked to a participant, dated in range, and not
  // routed to NDIA bulk claims (those are handled on the NDIS claims screen).
  const invoiceableEntries = useMemo(
    () =>
      billableEntries.filter((entry) => {
        if (entry.status !== "unpaid" || !entry.clientId || entry.invoiceId) return false
        if (getRecipient(entry.clientId).ndiaClaims) return false
        if (!entry.serviceDate || entry.serviceDate < fromDate || entry.serviceDate > toDate) return false
        return true
      }),
    [billableEntries, getRecipient, fromDate, toDate],
  )

  const groups = useMemo<ParticipantGroup[]>(() => {
    const byClient = new Map<string, ParticipantGroup>()
    for (const entry of invoiceableEntries) {
      const clientId = entry.clientId as string
      const existing = byClient.get(clientId)
      if (existing) {
        existing.entries.push(entry)
        continue
      }
      const client = getClient(clientId)
      const recipientSettings = getRecipient(clientId)
      const contact = recipientSettings.invoiceContactId
        ? financeContacts.find((c) => c.id === recipientSettings.invoiceContactId) ?? null
        : null
      const fallbackEmail =
        client?.participant.fundingType === "plan-managed"
          ? client.participant.planManagerEmail || ""
          : client?.participant.email || client?.participant.planManagerEmail || ""
      byClient.set(clientId, {
        client,
        clientId,
        name: client?.displayName || entry.clientName || "Unknown participant",
        recipientName: contact?.name || client?.participant.planManagerName || client?.displayName || entry.clientName || "Participant",
        recipientEmail: contact?.email || fallbackEmail,
        entries: [entry],
      })
    }
    return Array.from(byClient.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [invoiceableEntries, getClient, getRecipient, financeContacts])

  const isIncluded = useCallback((entryId: string) => selected.has(entryId), [selected])

  const includedEntries = useMemo(
    () => invoiceableEntries.filter((entry) => isIncluded(entry.id)),
    [invoiceableEntries, isIncluded],
  )

  const includedGroups = useMemo(
    () => groups.map((g) => ({ ...g, entries: g.entries.filter((e) => isIncluded(e.id)) })).filter((g) => g.entries.length > 0),
    [groups, isIncluded],
  )

  const totalAmount = includedEntries.reduce((sum, e) => sum + e.amount, 0)

  const allEntriesIncluded = invoiceableEntries.length > 0 && includedEntries.length === invoiceableEntries.length
  const someEntriesIncluded = includedEntries.length > 0 && !allEntriesIncluded

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const entry of invoiceableEntries) {
        if (allEntriesIncluded) next.delete(entry.id)
        else next.add(entry.id)
      }
      return next
    })

  const toggleEntry = (entryId: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(entryId)) next.delete(entryId)
      else next.add(entryId)
      return next
    })

  const toggleGroup = (group: ParticipantGroup) => {
    const allIncluded = group.entries.every((e) => isIncluded(e.id))
    setSelected((prev) => {
      const next = new Set(prev)
      for (const entry of group.entries) {
        if (allIncluded) next.delete(entry.id)
        else next.add(entry.id)
      }
      return next
    })
  }

  const toggleCollapse = (clientId: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(clientId)) next.delete(clientId)
      else next.add(clientId)
      return next
    })

  const buildLineItems = useCallback(
    (group: ParticipantGroup): InvoiceLineItem[] =>
      group.entries.map((entry) => {
        const gstCode = entry.gstCode || "P2"
        // When amounts already include GST, extract it; otherwise add it on top.
        const gstAmount = amountsIncludeGst
          ? entry.gstAmount || computeGstAmount(entry.amount, gstCode)
          : roundMoney(gstCode === "P1" ? entry.amount * 0.1 : 0)
        return {
          id: crypto.randomUUID(),
          description: entry.description || entry.chargeName || "Support item",
          chargeItemNumber: entry.chargeItemNumber,
          chargeName: entry.chargeName,
          quantity: entry.quantity,
          unit: entry.unit,
          rate: entry.rate,
          amount: entry.amount,
          serviceDate: entry.serviceDate,
          gstCode,
          gstAmount,
          clientId: group.clientId,
        }
      }),
    [amountsIncludeGst],
  )

  const handleCreate = async () => {
    if (includedGroups.length === 0 || isCreating) return
    if (!activeWorkspace) {
      toast("No active workspace", "error")
      return
    }
    setIsCreating(true)
    setSummary(null)
    let created = 0
    let emailed = 0
    let failed = 0
    const messages: string[] = []

    for (const group of includedGroups) {
      const lineItems = buildLineItems(group)
      if (lineItems.length === 0) continue
      const subtotal = roundMoney(lineItems.reduce((sum, item) => sum + item.amount, 0))
      const gst = roundMoney(lineItems.reduce((sum, item) => sum + (item.gstAmount || 0), 0))
      const total = amountsIncludeGst ? subtotal : roundMoney(subtotal + gst)

      const invoice = await addInvoice({
        clientName: group.name,
        clientId: group.clientId,
        taskIds: [],
        lineItems,
        subtotal,
        gst,
        total,
        createdBy: "Finance",
      })

      if (!invoice) {
        failed += 1
        messages.push(`${group.name}: failed to create invoice`)
        continue
      }

      created += 1
      await setBillableEntryStatus(
        group.entries.map((e) => e.id),
        "draft",
        { invoiceId: invoice.id },
      )

      // Close the loop for shift-sourced entries: stamp the originating timesheet
      // as invoiced so it leaves the billing queue and is never billed twice.
      const invoicedTimesheetIds = new Set<string>()
      for (const entry of group.entries) {
        if (entry.source !== "shift" || !entry.sourceId) continue
        const timesheetId = entry.sourceId.split(":")[0]
        if (!timesheetId || invoicedTimesheetIds.has(timesheetId)) continue
        invoicedTimesheetIds.add(timesheetId)
        await markInvoiced(timesheetId, invoice.id)
      }

      if (sendMethod === "email") {
        if (!group.recipientEmail) {
          messages.push(`${group.name}: created, but no recipient email to send to`)
          continue
        }
        try {
        const response = await fetch("/api/email/send-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice,
              recipientEmail: group.recipientEmail,
              recipientName: group.recipientName,
              participantName: group.name,
              ndisNumber: group.client?.participant.ndisNumber || "",
            orgSettings: settings,
              workspaceId: activeWorkspace.id,
          }),
        })
        const result = await response.json()
          if (!response.ok) throw new Error(result.error || "Failed to send")
          await markInvoiceSent(invoice.id, { sentTo: group.recipientEmail, deliveryMethod: "participant-email" })
          emailed += 1
      } catch (error) {
          messages.push(`${group.name}: ${error instanceof Error ? error.message : "send failed"}`)
        }
      }
    }

    setSummary({ created, emailed, failed, messages })
    setIsCreating(false)
    setIsCreateOpen(false)
    if (created > 0) toast(`${created} invoice${created === 1 ? "" : "s"} created`, "success")
    else if (failed > 0) toast("No invoices were created", "error")
  }

  const isLoading = clientsLoading || entriesLoading
  if (isLoading) return <PageLoader label="Loading invoicing…" />
  if ((clientsError || entriesError) && billableEntries.length === 0)
    return <PageError message="Failed to load invoicing" onRetry={refetchEntries} />

  return (
    <div className="flex h-full flex-col">
      <InvoicingNav
        actions={
          <div className="flex items-center gap-[8px]">
            <div className="flex items-center gap-[6px]">
              <CalendarDays className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.75} />
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-[8px] border border-folk-border bg-folk-page px-[8px] py-[4px] text-[12px] text-folk-text outline-none focus:border-[#a3c4f3]"
              />
              <span className="text-[12px] text-folk-secondary">to</span>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-[8px] border border-folk-border bg-folk-page px-[8px] py-[4px] text-[12px] text-folk-text outline-none focus:border-[#a3c4f3]"
              />
            </div>
          <div className="relative">
          <button
                ref={createTriggerRef}
                    type="button"
                    onClick={() => {
                  setSummary(null)
                  setIsCreateOpen((v) => !v)
                }}
                disabled={includedGroups.length === 0}
                className={cn(
                  "flex items-center gap-[6px] folk-pill-btn px-[10px] py-[6px] text-[13px] font-medium transition-colors",
                  includedGroups.length > 0 ? "primary-btn" : "cursor-not-allowed bg-[#efefef] text-[#b8b8b8]",
                )}
            tabIndex={0}
          >
                <span>Create invoices</span>
          </button>
              <FixedSelectDropdown
                isOpen={isCreateOpen}
                anchorRef={createTriggerRef}
                onClose={() => setIsCreateOpen(false)}
                estimatedHeight={190}
                minWidth={280}
                align="right"
              >
                <div className="px-[8px] py-[4px]">
                  <div
                    onClick={() => setSendMethod(sendMethod === "email" ? "create" : "email")}
                    className="flex cursor-pointer items-center justify-between gap-[12px] rounded-[6px] px-[8px] py-[7px] hover:bg-folk-hover"
                  >
                    <p className="text-[13px] font-medium text-folk-text">Email to recipients</p>
                    <Switch
                      checked={sendMethod === "email"}
                      onChange={() => setSendMethod(sendMethod === "email" ? "create" : "email")}
                      ariaLabel="Email invoices to recipients"
                    />
              </div>
                  <div
                    onClick={() => setAmountsIncludeGst((v) => !v)}
                    className="flex cursor-pointer items-center justify-between gap-[12px] rounded-[6px] px-[8px] py-[7px] hover:bg-folk-hover"
                  >
                    <p className="text-[13px] font-medium text-folk-text">Amounts include GST</p>
                    <Switch
                      checked={amountsIncludeGst}
                      onChange={() => setAmountsIncludeGst((v) => !v)}
                      ariaLabel="Amounts include GST"
              />
              </div>
                  <div className="mt-[4px] border-t border-folk-border-subtle px-[8px] pb-[2px] pt-[8px]">
              <button
                type="button"
                      onClick={handleCreate}
                      disabled={isCreating || includedGroups.length === 0}
                      className="primary-btn folk-pill-btn flex w-full items-center justify-center gap-[6px] px-[10px] py-[7px] text-[13px] font-medium disabled:opacity-50"
                tabIndex={0}
              >
                      {sendMethod === "email" ? <Mail className="h-[13px] w-[13px]" strokeWidth={1.75} /> : <DownloadIcon className="h-[13px] w-[13px]" strokeWidth={1.75} />}
                      {isCreating
                        ? "Working…"
                        : sendMethod === "email"
                          ? `Create & email ${includedGroups.length}`
                          : `Create ${includedGroups.length} ${includedGroups.length === 1 ? "invoice" : "invoices"}`}
              </button>
                    <p className="mt-[6px] text-center text-[11px] text-folk-secondary">
                      {includedEntries.length} {includedEntries.length === 1 ? "line" : "lines"} · {formatBillableAmount(totalAmount)}
                    </p>
            </div>
            </div>
              </FixedSelectDropdown>
        </div>
      </div>
        }
      />

      <div className={listViewBodyClass()}>
        {groups.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoiceable entries in this range"
            description="Billable entries that are unpaid, linked to a participant, and not routed to NDIA Claims appear here for invoicing. Adjust the date range or add entries on a participant's profile."
            className="py-[80px]"
          />
        ) : (
          <>
            <table className={TABLE_FULL}>
              <thead>
                <tr>
                  <th className={TABLE_HEADER_CELL}>
                    <div className="flex items-center gap-[10px]">
                      <TriCheckbox
                        checked={allEntriesIncluded}
                        indeterminate={someEntriesIncluded}
                        onChange={toggleAll}
                        ariaLabel={allEntriesIncluded ? "Exclude all entries" : "Include all entries"}
                      />
                      <span>Participant / item</span>
                    </div>
                  </th>
                  <th className={TABLE_HEADER_CELL}>Charge item</th>
                  <th className={TABLE_HEADER_CELL}>Service date</th>
                  <th className={TABLE_HEADER_CELL}>
                    <span className="flex justify-end">Qty × rate</span>
                  </th>
                  <th className={TABLE_HEADER_CELL}>
                    <span className="flex justify-end">GST</span>
                  </th>
                  <th className={TABLE_HEADER_CELL_LAST}>
                    <span className="flex justify-end">Amount</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const isCollapsed = collapsed.has(group.clientId)
                  const groupIncluded = group.entries.filter((e) => isIncluded(e.id))
                  const allIncluded = groupIncluded.length === group.entries.length
                  const groupTotal = groupIncluded.reduce((sum, e) => sum + e.amount, 0)
            return (
                    <Fragment key={group.clientId}>
                      <tr
                        className={cn("group cursor-pointer bg-folk-page", allIncluded && "[&>td]:bg-folk-hover")}
                        onClick={() => toggleCollapse(group.clientId)}
                      >
                        <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER, "bg-folk-page")}>
                          <div className={cn(TABLE_CELL_INNER, "gap-[10px]")}>
                            <span
                              className={cn(
                                "flex items-center transition-opacity",
                                allIncluded || groupIncluded.length > 0
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100",
                              )}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <TriCheckbox
                                checked={allIncluded}
                                indeterminate={groupIncluded.length > 0}
                                onChange={() => toggleGroup(group)}
                                ariaLabel={allIncluded ? "Exclude participant" : "Include participant"}
                              />
                            </span>
                            <span className={cn("truncate", TABLE_NAME_CELL)}>{group.name}</span>
                            <ChevronDown
                              className={cn(
                                "ml-auto h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform",
                                isCollapsed && "-rotate-90",
                              )}
                              strokeWidth={1.75}
                            />
                          </div>
                        </td>
                        <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)} />
                        <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)} />
                        <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)}>
                          <div className={NUMERIC_INNER}>
                            <span className="truncate text-[12px] text-folk-secondary">
                              {groupIncluded.length}/{group.entries.length} lines
                            </span>
                          </div>
                        </td>
                        <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)} />
                        <td className={cn(TABLE_CELL_LAST, TABLE_ROW_HOVER)}>
                          <div className={NUMERIC_INNER}>
                            <span className="truncate text-[13px] font-semibold text-folk-text">{formatBillableAmount(groupTotal)}</span>
                          </div>
                        </td>
                      </tr>

                      {!isCollapsed &&
                        group.entries.map((entry) => {
                          const included = isIncluded(entry.id)
                  return (
                            <tr key={entry.id} className={cn("group", included && "[&>td]:bg-folk-hover", !included && "opacity-45")}>
                              <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)}>
                                <div className={cn(TABLE_CELL_INNER, "gap-[10px]")}>
                                  <span
                                    className={cn(
                                      "flex items-center transition-opacity",
                                      included ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                                    )}
                                  >
                                    <TriCheckbox
                                      checked={included}
                                      onChange={() => toggleEntry(entry.id)}
                                      ariaLabel={included ? "Exclude line" : "Include line"}
                                    />
                            </span>
                                  <span className={cn("truncate pl-[21px]", TABLE_TEXT_CELL)}>
                                    {entry.description || entry.chargeName || "Support item"}
                            </span>
                                </div>
                              </td>
                              <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)}>
                                <div className={TABLE_CELL_INNER}>
                                  <span className={cn("truncate", TABLE_TEXT_CELL, "text-folk-secondary")}>
                                    {entry.chargeItemNumber || "—"}
                              </span>
                          </div>
                        </td>
                              <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)}>
                                <div className={TABLE_CELL_INNER}>
                                  <span className={cn("truncate", TABLE_TEXT_CELL, "text-folk-secondary")}>
                                    {formatBillableDate(entry.serviceDate)}
                          </span>
                        </div>
                      </td>
                              <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)}>
                                <div className={NUMERIC_INNER}>
                                  <span className={cn("truncate", TABLE_TEXT_CELL, "text-folk-secondary")}>
                                    {formatBillableQuantity(entry.quantity, entry.unit)} × {formatBillableAmount(entry.rate)}
                                  </span>
                                </div>
                              </td>
                              <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)}>
                                <div className={NUMERIC_INNER}>
                                  <span className={cn("truncate", TABLE_TEXT_CELL, "text-folk-secondary")}>{entry.gstCode || "—"}</span>
                                </div>
                              </td>
                              <td className={cn(TABLE_CELL_LAST, TABLE_ROW_HOVER)}>
                                <div className={NUMERIC_INNER}>
                                  <span className={cn("truncate", TABLE_TEXT_CELL, "font-medium")}>{formatBillableAmount(entry.amount)}</span>
                                </div>
                              </td>
                    </tr>
                          )
                        })}
                  </Fragment>
                  )
                })}
          </tbody>
        </table>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-folk-border bg-white px-[16px] py-[10px]">
        <span className="text-[12px] font-medium text-folk-secondary">
          {includedGroups.length} {includedGroups.length === 1 ? "invoice" : "invoices"} ready · {includedEntries.length} lines
        </span>
        <span className="text-[12px] font-semibold text-folk-text">Total {formatBillableAmount(totalAmount)}</span>
      </div>

      {summary && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setSummary(null)} />
          <div className="fixed inset-0 z-[51] flex items-center justify-center p-[16px]">
            <div className="w-full max-w-[460px] rounded-[12px] border border-folk-border bg-folk-surface p-[20px] shadow-folk">
              <h3 className="text-[15px] font-semibold text-folk-text">Invoicing complete</h3>
                  <p className="mt-[6px] text-[13px] text-folk-secondary">
                {summary.created} {summary.created === 1 ? "invoice" : "invoices"} created
                {summary.emailed > 0 && `, ${summary.emailed} emailed`}
                {summary.failed > 0 && `, ${summary.failed} failed`}.
              </p>
              {summary.messages.length > 0 && (
                <div className="mt-[12px] max-h-[180px] overflow-y-auto rounded-[8px] border border-folk-border bg-folk-page px-[12px] py-[10px] text-[12px] font-medium text-folk-secondary">
                  {summary.messages.join(" · ")}
                    </div>
                  )}
              <div className="mt-[16px] flex justify-end">
                    <button
                      type="button"
                  onClick={() => setSummary(null)}
                  className="primary-btn px-[12px] py-[7px] text-[13px] font-medium"
                  tabIndex={0}
                    >
                      Close
                    </button>
                  </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
