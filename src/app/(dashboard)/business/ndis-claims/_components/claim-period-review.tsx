"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  ChevronDown,
  Download,
  RefreshCw,
  Settings2,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { PageTitleBar, PageToolbarBar } from "@/components/page-title-bar"
import { Button } from "@/components/button"
import { useToast } from "@/components/toast"
import {
  buildBulkPaymentRequest,
  buildClaimReference,
  type BprLineInput,
  type BprProvider,
  type BprValidationError,
} from "@/lib/ndis/bulk-payment-request"
import {
  claimParticipantKey,
  formatClaimPeriodRange,
  getClaimPeriodStatusClasses,
  CLAIM_PERIOD_STATUS_LABELS,
  type ClaimPeriod,
  type ClaimPeriodStatus,
} from "@/lib/ndis/claim-period"
import type { BillableEntry } from "@/lib/billable-entries/types"
import type { Client } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ClaimLine {
  key: string
  entry: BillableEntry
  bprLine: BprLineInput
  amount: number
  included: boolean
  errors: string[]
}

interface ParticipantGroup {
  client: Client | null
  clientId: string
  name: string
  ndisNumber: string
  excluded: boolean
  lines: ClaimLine[]
  includedCount: number
  total: number
  errorCount: number
}

interface ClaimPeriodReviewProps {
  period: ClaimPeriod
  billableEntries: BillableEntry[]
  clients: Client[]
  provider: BprProvider
  providerErrors: BprValidationError[]
  isNdiaRecipient: (clientId: string) => boolean
  onBack: () => void
  onUpdate: (
    id: string,
    updates: Partial<Pick<ClaimPeriod, "status" | "excludedKeys" | "exportedAt" | "exportCount">>,
  ) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onSync: () => Promise<void>
  onMarkEntriesExported: (entryIds: string[]) => Promise<void>
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function downloadCsv(csv: string) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `BPR_${stamp}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const NEXT_STATUS: Record<ClaimPeriodStatus, ClaimPeriodStatus> = {
  draft: "ready",
  ready: "exported",
  exported: "reconciled",
  reconciled: "reconciled",
}

export function ClaimPeriodReview({
  period,
  billableEntries,
  clients,
  provider,
  providerErrors,
  isNdiaRecipient,
  onBack,
  onUpdate,
  onDelete,
  onSync,
  onMarkEntriesExported,
}: ClaimPeriodReviewProps) {
  const { toast } = useToast()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [isSyncing, setIsSyncing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const excluded = useMemo(() => new Set(period.excludedKeys), [period.excludedKeys])

  const groups = useMemo<ParticipantGroup[]>(() => {
    const byClient = new Map<string, ParticipantGroup>()

    for (const entry of billableEntries) {
      if (!entry.clientId) continue
      // Only participants billed via the NDIA bulk payment request.
      if (!isNdiaRecipient(entry.clientId)) continue
      // Skip entries already rolled into an invoice (those are claimed elsewhere).
      if (entry.invoiceId) continue
      if (!entry.serviceDate || entry.serviceDate < period.startDate || entry.serviceDate > period.endDate) continue

      const client = clients.find((c) => c.id === entry.clientId) ?? null
      const clientId = entry.clientId
      const participantExcluded = excluded.has(claimParticipantKey(clientId))
      const included = !excluded.has(entry.id) && !participantExcluded

      const bprLine: BprLineInput = {
        ndisNumber: client?.participant.ndisNumber ?? "",
        supportsDeliveredFrom: entry.serviceDate,
        supportsDeliveredTo: entry.serviceDate,
        supportNumber: entry.chargeItemNumber,
        claimReference: buildClaimReference(entry.id, 0),
        isHourly: entry.unit === "hour",
        quantity: entry.quantity,
        unitPrice: entry.rate,
        gstCode: entry.gstCode || "P2",
        claimType: entry.claimType || "direct-service",
      }

      const validation = buildBulkPaymentRequest({ registrationNumber: "PLACEHOLDER", abn: "53004085616" }, [bprLine])
      const errors = validation.errors.filter((e) => e.index >= 0).map((e) => `${e.field}: ${e.message}`)

      const line: ClaimLine = { key: entry.id, entry, bprLine, amount: entry.amount, included, errors }

      const existing = byClient.get(clientId)
      if (existing) {
        existing.lines.push(line)
      } else {
        byClient.set(clientId, {
          client,
          clientId,
          name: client?.displayName || entry.clientName || "Unknown participant",
          ndisNumber: client?.participant.ndisNumber ?? "",
          excluded: participantExcluded,
          lines: [line],
          includedCount: 0,
          total: 0,
          errorCount: 0,
        })
      }
    }

    const result = Array.from(byClient.values())
    for (const group of result) {
      group.includedCount = group.lines.filter((l) => l.included).length
      group.total = group.lines.filter((l) => l.included).reduce((sum, l) => sum + l.amount, 0)
      group.errorCount = group.lines.filter((l) => l.included && l.errors.length > 0).length
    }
    return result.sort((a, b) => a.name.localeCompare(b.name))
  }, [billableEntries, clients, excluded, isNdiaRecipient, period.startDate, period.endDate])

  const includedLines = useMemo(() => groups.flatMap((g) => g.lines.filter((l) => l.included)), [groups])
  const validLines = useMemo(() => includedLines.filter((l) => l.errors.length === 0), [includedLines])
  const totalAmount = useMemo(() => includedLines.reduce((sum, l) => sum + l.amount, 0), [includedLines])
  const participantsIncluded = useMemo(() => groups.filter((g) => g.includedCount > 0).length, [groups])
  const errorCount = includedLines.length - validLines.length
  const isLocked = period.status === "exported" || period.status === "reconciled"

  const toggleKey = async (key: string) => {
    if (isLocked) return
    const next = new Set(period.excludedKeys)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    await onUpdate(period.id, { excludedKeys: Array.from(next) })
  }

  const toggleCollapse = (clientId: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(clientId)) next.delete(clientId)
      else next.add(clientId)
      return next
    })

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await onSync()
      toast("Claim refreshed with the latest billable entries", "success")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleExport = async () => {
    if (validLines.length === 0 || isExporting) return
    setIsExporting(true)
    try {
      const lines: BprLineInput[] = validLines.map((line, index) => ({
        ...line.bprLine,
        claimReference: buildClaimReference(line.entry.id, index),
      }))
      const built = buildBulkPaymentRequest(provider, lines)
      if (built.lineCount === 0) {
        toast("No valid claim lines to export", "error")
        return
      }
      downloadCsv(built.csv)
      await onMarkEntriesExported(validLines.map((line) => line.entry.id))
      await onUpdate(period.id, {
        status: "exported",
        exportedAt: new Date().toISOString(),
        exportCount: period.exportCount + 1,
      })
      toast(`Bulk payment request exported — ${built.lineCount} claim line${built.lineCount === 1 ? "" : "s"}`, "success")
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to export claim", "error")
    } finally {
      setIsExporting(false)
    }
  }

  const handleAdvanceStatus = async () => {
    const next = NEXT_STATUS[period.status]
    if (next === period.status) return
    await onUpdate(period.id, { status: next })
  }

  return (
    <div className="flex h-full flex-col">
      <PageTitleBar title={period.name} onBack={onBack} backLabel="Back to claim periods" />
      <PageToolbarBar align="between">
        <div className="flex min-w-0 items-center gap-[12px]">
          <span className="shrink-0 text-[12px] text-folk-secondary">{formatClaimPeriodRange(period.startDate, period.endDate)}</span>
          <span className={cn("inline-flex h-[20px] shrink-0 items-center rounded-full px-[8px] text-[11px] font-medium", getClaimPeriodStatusClasses(period.status))}>
            {CLAIM_PERIOD_STATUS_LABELS[period.status]}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-[8px]">
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-[5px] rounded-none border border-folk-border px-[8px] py-[5px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover disabled:opacity-50"
            tabIndex={0}
          >
            <RefreshCw className={cn("h-[12px] w-[12px]", isSyncing && "animate-spin")} strokeWidth={1.75} />
            Sync
          </button>
          {period.status !== "exported" && period.status !== "reconciled" && (
            <button
              type="button"
              onClick={handleAdvanceStatus}
              className="rounded-none border border-folk-border px-[8px] py-[5px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
              tabIndex={0}
            >
              Mark {CLAIM_PERIOD_STATUS_LABELS[NEXT_STATUS[period.status]]}
            </button>
          )}
          {period.status === "exported" && (
            <button
              type="button"
              onClick={handleAdvanceStatus}
              className="rounded-none border border-folk-border px-[8px] py-[5px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
              tabIndex={0}
            >
              Mark Reconciled
            </button>
          )}
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={validLines.length === 0 || isExporting || providerErrors.length > 0}
            className="rounded-none"
          >
            <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>
              {isExporting
                ? "Exporting…"
                : period.exportCount > 0
                ? "Re-export claim file"
                : "Export claim file"}
            </span>
          </Button>
        </div>
      </PageToolbarBar>

      {providerErrors.length > 0 && (
        <div className="flex items-start gap-[10px] border-b border-amber-200 bg-amber-50 px-[16px] py-[10px]">
          <AlertTriangle className="mt-[1px] h-[15px] w-[15px] shrink-0 text-amber-600" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-amber-900">Provider details needed before claiming</p>
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

      <div className="grid shrink-0 grid-cols-4 gap-px border-b border-folk-border bg-folk-border">
        {[
          { label: "Participants", value: String(participantsIncluded) },
          { label: "Claim lines", value: String(includedLines.length) },
          { label: "Total claim", value: formatCurrency(totalAmount) },
          { label: "Issues", value: String(errorCount) },
        ].map((stat) => (
          <div key={stat.label} className="bg-white px-[16px] py-[10px]">
            <p className="text-[11px] font-medium uppercase tracking-wide text-folk-secondary">{stat.label}</p>
            <p className={cn("mt-[2px] text-[16px] font-semibold", stat.label === "Issues" && errorCount > 0 ? "text-red-600" : "text-folk-text")}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto bg-folk-page p-[16px]">
        {groups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[14px] font-semibold text-folk-text">No billable entries in this period</p>
            <p className="mt-[4px] max-w-[380px] text-[13px] text-folk-secondary">
              There are no unbilled entries for NDIA Claims participants dated between {formatClaimPeriodRange(period.startDate, period.endDate)}.
              Make sure participants have “NDIA Claims” set as a recipient and that billable entries exist, then sync.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {groups.map((group) => {
              const isCollapsed = collapsed.has(group.clientId)
              return (
                <div key={group.clientId} className="overflow-hidden rounded-[6px] border border-folk-border bg-white">
                  <div className="flex items-center gap-[10px] px-[14px] py-[10px]">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => toggleKey(claimParticipantKey(group.clientId))}
                      className={cn(
                        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border border-folk-text bg-white text-folk-text transition-colors",
                        isLocked && "cursor-not-allowed opacity-50",
                      )}
                      aria-label={group.excluded ? "Include participant" : "Exclude participant"}
                      tabIndex={0}
                    >
                      {!group.excluded && <span className="text-[9px] leading-none">✓</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCollapse(group.clientId)}
                      className="flex min-w-0 flex-1 items-center gap-[8px] text-left"
                      tabIndex={0}
                    >
                      <ChevronDown
                        className={cn("h-[13px] w-[13px] shrink-0 text-folk-secondary transition-transform", isCollapsed && "-rotate-90")}
                        strokeWidth={1.75}
                      />
                      <span className="truncate text-[13px] font-semibold text-folk-text">{group.name}</span>
                      <span className="shrink-0 text-[12px] text-folk-secondary">{group.ndisNumber || "No NDIS number"}</span>
                      {group.errorCount > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-[3px] rounded-full bg-red-50 px-[7px] py-[1px] text-[11px] font-medium text-red-600">
                          <AlertTriangle className="h-[10px] w-[10px]" strokeWidth={2} />
                          {group.errorCount}
                        </span>
                      )}
                    </button>
                    <span className="shrink-0 text-[12px] text-folk-secondary">
                      {group.includedCount}/{group.lines.length} lines
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold text-folk-text">{formatCurrency(group.total)}</span>
                  </div>

                  {!isCollapsed && (
                    <div className="border-t border-folk-border-subtle">
                      {group.lines.map((line) => (
                        <div
                          key={line.key}
                          className={cn(
                            "flex items-center gap-[10px] border-b border-folk-border-subtle px-[14px] py-[8px] last:border-b-0",
                            !line.included && "opacity-45",
                          )}
                        >
                          <button
                            type="button"
                            disabled={isLocked || group.excluded}
                            onClick={() => toggleKey(line.key)}
                            className={cn(
                              "flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border border-folk-text bg-white text-folk-text transition-colors",
                              (isLocked || group.excluded) && "cursor-not-allowed opacity-60",
                            )}
                            aria-label={line.included ? "Exclude line" : "Include line"}
                            tabIndex={0}
                          >
                            {line.included && <span className="text-[8px] leading-none">✓</span>}
                          </button>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[12px] font-medium text-folk-text">
                              {line.entry.description || line.entry.chargeName || "Support item"}
                            </span>
                            <span className="truncate text-[11px] text-folk-secondary">
                              {line.entry.chargeItemNumber} · {line.bprLine.supportsDeliveredFrom}
                            </span>
                            {line.included && line.errors.length > 0 && (
                              <span className="mt-[2px] truncate text-[11px] font-medium text-red-600">{line.errors[0]}</span>
                            )}
                          </div>
                          <span className="shrink-0 text-[11px] text-folk-secondary">
                            {line.entry.quantity} {line.entry.unit === "hour" ? "hr" : line.entry.unit} × {formatCurrency(line.entry.rate)}
                          </span>
                          <span className="w-[90px] shrink-0 text-right text-[12px] font-medium text-folk-text">
                            {formatCurrency(line.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-folk-border bg-white px-[16px] py-[10px]">
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-[5px] text-[12px] font-medium text-red-500 transition-colors hover:text-red-600"
          tabIndex={0}
        >
          <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.75} />
          Delete claim
        </button>
        <span className="text-[12px] text-folk-secondary">
          {period.exportCount > 0
            ? `Exported ${period.exportCount} time${period.exportCount === 1 ? "" : "s"}${period.exportedAt ? ` · last ${new Date(period.exportedAt).toLocaleDateString("en-AU")}` : ""}`
            : "Not yet exported"}
        </span>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-[16px]">
          <div className="w-full max-w-[420px] rounded-[8px] border border-folk-border bg-folk-surface p-[20px] shadow-folk">
            <h3 className="text-[14px] font-semibold text-folk-text">Delete this claim period?</h3>
            <p className="mt-[4px] text-[12px] text-folk-secondary">
              This only removes the claim period. All billable entries stay intact and can be claimed again.
            </p>
            <div className="mt-[14px] flex items-center justify-end gap-[8px]">
              <button type="button" onClick={() => setConfirmDelete(false)} className="outline-btn px-[12px] py-[6px] text-[12px] font-medium" tabIndex={0}>
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDelete(period.id)
                  setConfirmDelete(false)
                  onBack()
                }}
                className="rounded-none border border-red-200 bg-red-50 px-[12px] py-[6px] text-[12px] font-medium text-red-600 transition-colors hover:bg-red-100"
                tabIndex={0}
              >
                Delete claim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
