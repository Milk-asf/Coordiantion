"use client"

import { useCallback, useMemo, useState } from "react"
import { AlertTriangle, FileCheck, LayoutGrid, Plus, Settings2, Table2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/button"
import { PageTitleBar, PageToolbarBar } from "@/components/page-title-bar"
import { folkPrimaryAddBtnClass } from "@/lib/folk-ui"
import { EmptyState } from "@/components/empty-state"
import { PageError, PageLoader } from "@/components/page-state"
import { listViewBodyClass, tabButtonClass } from "@/components/tab-active-indicator"
import { useToast } from "@/components/toast"
import { useClients } from "@/lib/hooks/use-clients"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useWorkspaceSettings } from "@/lib/hooks/use-workspace-settings"
import { useClaimPeriods } from "@/lib/hooks/use-claim-periods"
import { useBillableEntries } from "@/lib/billable-entries/use-billable-entries"
import { useClientRecipients } from "@/lib/finance-contacts/use-client-recipients"
import { validateBprProvider } from "@/lib/ndis/bulk-payment-request"
import {
  CLAIM_PAYMENT_STATUS_LABELS,
  CLAIM_PAYMENT_STATUS_THEME,
  CLAIM_PERIOD_STATUS_LABELS,
  claimParticipantKey,
  defaultClaimPeriodName,
  formatClaimPeriodRange,
  getClaimPeriodStatusClasses,
  type ClaimPaymentStatus,
  type ClaimPeriod,
  type ClaimPeriodStatus,
} from "@/lib/ndis/claim-period"
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
import { ClaimPeriodReview } from "./_components/claim-period-review"
import { ClaimPeriodKanban, type ClaimPeriodSummary } from "./_components/claim-period-kanban"

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function firstDayOfMonthIso(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function NdisClaimsPage() {
  const { toast } = useToast()
  const { clients, isLoading: clientsLoading, fetchError: clientsError, refetch: refetchClients } = useClients()
  const {
    billableEntries,
    isLoading: entriesLoading,
    fetchError: entriesError,
    setBillableEntryStatus,
    refetch: refetchEntries,
  } = useBillableEntries()
  const { getRecipient } = useClientRecipients()
  const { settings, isLoading: settingsLoading } = useWorkspaceSettings()
  const { canViewFinance, isLoading: permissionsLoading } = usePermissions()
  const {
    claimPeriods,
    isLoading: claimsLoading,
    fetchError: claimsError,
    addClaimPeriod,
    updateClaimPeriod,
    deleteClaimPeriod,
    refetch: refetchClaims,
  } = useClaimPeriods()

  const isNdiaRecipient = useCallback((clientId: string) => getRecipient(clientId).ndiaClaims, [getRecipient])

  const [view, setView] = useState<"list" | "board">("list")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [draftName, setDraftName] = useState("")
  const [draftStart, setDraftStart] = useState(firstDayOfMonthIso())
  const [draftEnd, setDraftEnd] = useState(todayIso())
  const [isCreating, setIsCreating] = useState(false)

  const provider = useMemo(
    () => ({ registrationNumber: settings.ndisNumber || "", abn: settings.orgAbn || "" }),
    [settings.ndisNumber, settings.orgAbn],
  )
  const providerErrors = useMemo(() => validateBprProvider(provider), [provider])

  // Live summary per claim period: included billable entries for NDIA Claims
  // participants whose service date falls in range and aren't yet invoiced.
  const claimableEntries = useMemo(
    () => billableEntries.filter((entry) => entry.clientId && !entry.invoiceId && isNdiaRecipient(entry.clientId)),
    [billableEntries, isNdiaRecipient],
  )

  const summaries = useMemo<Record<string, ClaimPeriodSummary>>(() => {
    const result: Record<string, ClaimPeriodSummary> = {}
    for (const period of claimPeriods) {
      const excluded = new Set(period.excludedKeys)
      const participantSet = new Set<string>()
      let lines = 0
      let total = 0

      for (const entry of claimableEntries) {
        const clientId = entry.clientId as string
        if (excluded.has(claimParticipantKey(clientId))) continue
        if (!entry.serviceDate || entry.serviceDate < period.startDate || entry.serviceDate > period.endDate) continue
        if (excluded.has(entry.id)) continue
        lines += 1
        total += entry.amount
        participantSet.add(clientId)
      }

      result[period.id] = { participants: participantSet.size, lines, total }
    }
    return result
  }, [claimPeriods, claimableEntries])

  const selectedPeriod = selectedId ? claimPeriods.find((p) => p.id === selectedId) ?? null : null

  const handleCreate = async () => {
    if (isCreating) return
    if (!draftStart || !draftEnd || draftEnd < draftStart) {
      toast("Choose a valid date range", "error")
      return
    }
    setIsCreating(true)
    try {
      const name = draftName.trim() || defaultClaimPeriodName(draftStart, draftEnd)
      const created = await addClaimPeriod({ name, startDate: draftStart, endDate: draftEnd })
      if (created) {
        setIsCreateOpen(false)
        setDraftName("")
        setSelectedId(created.id)
        toast("Claim period created", "success")
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to create claim period", "error")
    } finally {
      setIsCreating(false)
    }
  }

  const openCreate = () => {
    setDraftStart(firstDayOfMonthIso())
    setDraftEnd(todayIso())
    setDraftName("")
    setIsCreateOpen(true)
  }

  if (entriesLoading || clientsLoading || settingsLoading || permissionsLoading || claimsLoading)
    return <PageLoader label="Loading NDIS claims…" />
  if (!canViewFinance) {
    return (
      <div className="flex h-full flex-col">
        <PageTitleBar title="NDIS claims" />
        <EmptyState icon={FileCheck} title="No access" description="You do not have permission to manage NDIS claims." className="flex-1" />
      </div>
    )
  }
  if ((entriesError || clientsError || claimsError) && claimPeriods.length === 0 && billableEntries.length === 0)
    return <PageError message="Failed to load NDIS claims" onRetry={() => { refetchEntries(); refetchClients(); refetchClaims() }} />

  if (selectedPeriod) {
    return (
      <ClaimPeriodReview
        period={selectedPeriod}
        billableEntries={billableEntries}
        clients={clients}
        provider={provider}
        providerErrors={providerErrors}
        isNdiaRecipient={isNdiaRecipient}
        onBack={() => setSelectedId(null)}
        onUpdate={updateClaimPeriod}
        onDelete={deleteClaimPeriod}
        onSync={async () => {
          await Promise.all([refetchEntries(), refetchClients()])
        }}
        onMarkEntriesExported={async (entryIds) => {
          await setBillableEntryStatus(entryIds, "exported", { claimPeriodId: selectedPeriod.id })
        }}
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      <PageTitleBar title="NDIS claims" />
      <PageToolbarBar>
        <button type="button" onClick={openCreate} className={folkPrimaryAddBtnClass()} tabIndex={0}>
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>New claim period</span>
        </button>
      </PageToolbarBar>
      <div className="flex h-[44px] shrink-0 items-stretch border-b border-folk-border bg-white px-[16px]">
        <div className="folk-tab-bar flex h-full items-stretch [&_.folk-tab:last-child]:mr-0">
          {([
            { key: "list" as const, label: "List", icon: Table2 },
            { key: "board" as const, label: "Board", icon: LayoutGrid },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={tabButtonClass(view === key)}
              aria-current={view === key ? "page" : undefined}
              aria-selected={view === key}
              tabIndex={0}
            >
              <Icon className="h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
              <span className="folk-tab-label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {providerErrors.length > 0 && (
        <div className="flex items-start gap-[10px] border-b border-amber-200 bg-amber-50 px-[16px] py-[10px]">
          <AlertTriangle className="mt-[1px] h-[15px] w-[15px] shrink-0 text-amber-600" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-amber-900">Add your provider details before exporting claims</p>
            <ul className="mt-[2px] list-disc pl-[16px] text-[12px] text-amber-800">
              {providerErrors.map((error) => (
                <li key={error.field}>{error.message}</li>
              ))}
            </ul>
          </div>
          <Link
            href="/settings/general"
            className="flex shrink-0 items-center gap-[5px] rounded-none border border-amber-300 bg-white px-[8px] py-[4px] text-[12px] font-medium text-amber-800 transition-colors hover:bg-amber-100"
          >
            <Settings2 className="h-[12px] w-[12px]" strokeWidth={1.75} />
            Finance settings
          </Link>
        </div>
      )}

      {claimPeriods.length === 0 ? (
        <div className={listViewBodyClass()}>
          <EmptyState
            icon={FileCheck}
            title="No claim periods yet"
            description="Create a claim period for a date range to pull in eligible agency-managed services, review them, and export a portal-ready bulk payment request."
            className="py-[80px]"
            action={{ label: "New claim period", onClick: openCreate, icon: Plus }}
          />
        </div>
      ) : view === "board" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          <ClaimPeriodKanban
            periods={claimPeriods}
            summaries={summaries}
            canManage={canViewFinance}
            onSetStatus={(id, status) => updateClaimPeriod(id, { status })}
            onOpen={setSelectedId}
          />
        </div>
      ) : (
        <div className={listViewBodyClass()}>
          <table className={TABLE_FULL} style={{ tableLayout: "fixed", minWidth: 1090 }}>
            <thead>
              <tr>
                <th className={`${TABLE_PANEL_HEADER} w-[220px]`}>Claim period</th>
                <th className={`${TABLE_PANEL_HEADER} w-[200px]`}>Range</th>
                <th className={`${TABLE_PANEL_HEADER} w-[120px]`}>Status</th>
                <th className={`${TABLE_PANEL_HEADER} w-[110px]`}>Payment</th>
                <th className={`${TABLE_PANEL_HEADER} w-[100px]`}>Participants</th>
                <th className={`${TABLE_PANEL_HEADER} w-[90px]`}>Lines</th>
                <th className={`${TABLE_PANEL_HEADER_LAST} w-[140px]`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {claimPeriods.map((period) => {
                const summary = summaries[period.id] ?? { participants: 0, lines: 0, total: 0 }
                return (
                  <tr
                    key={period.id}
                    onClick={() => setSelectedId(period.id)}
                    className="cursor-pointer transition-colors hover:bg-folk-hover"
                  >
                    <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                      <div className={TABLE_CELL_INNER}>
                        <span className="truncate font-medium">{period.name}</span>
                        {period.exportCount > 0 && (
                          <span className="shrink-0 rounded-full bg-[#e7f5ec] px-[6px] py-[1px] text-[10px] font-medium text-[#1a7f43]">
                            ×{period.exportCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL} text-folk-secondary`}>
                      <div className={TABLE_CELL_INNER}>{formatClaimPeriodRange(period.startDate, period.endDate)}</div>
                    </td>
                    <td className={TABLE_PROFILE_CELL}>
                      <div className={TABLE_CELL_INNER}>
                        <span className={cn("inline-flex h-[22px] items-center rounded-full px-[8px] text-[11px] font-medium", getClaimPeriodStatusClasses(period.status))}>
                          {CLAIM_PERIOD_STATUS_LABELS[period.status as ClaimPeriodStatus]}
                        </span>
                      </div>
                    </td>
                    <td className={TABLE_PROFILE_CELL}>
                      <div className={TABLE_CELL_INNER}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const next: ClaimPaymentStatus = period.paymentStatus === "paid" ? "unpaid" : "paid"
                            updateClaimPeriod(period.id, { paymentStatus: next })
                          }}
                          className={cn(
                            "inline-flex h-[22px] items-center rounded-full px-[8px] text-[11px] font-medium transition-opacity hover:opacity-80",
                            CLAIM_PAYMENT_STATUS_THEME[period.paymentStatus],
                          )}
                          tabIndex={0}
                        >
                          {CLAIM_PAYMENT_STATUS_LABELS[period.paymentStatus]}
                        </button>
                      </div>
                    </td>
                    <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL} text-folk-secondary`}>
                      <div className={TABLE_CELL_INNER}>{summary.participants}</div>
                    </td>
                    <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL} text-folk-secondary`}>
                      <div className={TABLE_CELL_INNER}>{summary.lines}</div>
                    </td>
                    <td className={TABLE_PROFILE_CELL_LAST}>
                      <div className={TABLE_CELL_INNER}>{formatCurrency(summary.total)}</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-[16px]">
          <div className="w-full max-w-[440px] rounded-[8px] border border-folk-border bg-folk-surface p-[20px] shadow-folk">
            <h3 className="text-[15px] font-semibold text-folk-text">New claim period</h3>
            <p className="mt-[4px] text-[13px] text-folk-secondary">
              Pick the service dates to claim for. Eligible agency-managed services in this range are pulled in for review.
            </p>

            <div className="mt-[16px] flex flex-col gap-[12px]">
              <label className="flex flex-col gap-[4px]">
                <span className="text-[12px] font-medium text-folk-secondary">Name</span>
                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder={defaultClaimPeriodName(draftStart, draftEnd)}
                  className="rounded-none border border-folk-border bg-folk-page px-[10px] py-[7px] text-[13px] text-folk-text outline-none focus:border-[#a3c4f3]"
                />
              </label>
              <div className="flex gap-[10px]">
                <label className="flex flex-1 flex-col gap-[4px]">
                  <span className="text-[12px] font-medium text-folk-secondary">From</span>
                  <input
                    type="date"
                    value={draftStart}
                    max={draftEnd}
                    onChange={(event) => setDraftStart(event.target.value)}
                    className="rounded-none border border-folk-border bg-folk-page px-[10px] py-[7px] text-[13px] text-folk-text outline-none focus:border-[#a3c4f3]"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-[4px]">
                  <span className="text-[12px] font-medium text-folk-secondary">To</span>
                  <input
                    type="date"
                    value={draftEnd}
                    min={draftStart}
                    onChange={(event) => setDraftEnd(event.target.value)}
                    className="rounded-none border border-folk-border bg-folk-page px-[10px] py-[7px] text-[13px] text-folk-text outline-none focus:border-[#a3c4f3]"
                  />
                </label>
              </div>
            </div>

            <div className="mt-[18px] flex items-center justify-end gap-[8px]">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="outline-btn px-[12px] py-[7px] text-[13px] font-medium" tabIndex={0}>
                Cancel
              </button>
              <Button variant="primary" onClick={handleCreate} disabled={isCreating} className="rounded-none">
                {isCreating ? "Creating…" : "Create claim period"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
