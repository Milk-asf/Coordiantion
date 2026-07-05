"use client"

import { useMemo, useState } from "react"
import { Download, Lock, LockOpen, Wallet } from "lucide-react"
import { Button } from "@/components/button"
import { PageTitleBar, PageToolbarBar } from "@/components/page-title-bar"
import { listViewBodyClass, listViewFilterBarClass } from "@/components/tab-active-indicator"
import { folkPrimaryAddBtnClass } from "@/lib/folk-ui"
import { EmptyState } from "@/components/empty-state"
import { PageError, PageLoader } from "@/components/page-state"
import { useToast } from "@/components/toast"
import { useStaff } from "@/lib/hooks/use-staff"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { usePayrollSettings } from "@/lib/hooks/use-payroll-settings"
import { usePayRunLocks } from "@/lib/hooks/use-pay-run-locks"
import { useTimesheets } from "@/lib/timesheets-context"
import {
  EMPLOYMENT_TYPES,
  SCHADS_LEVEL_RATES,
  computeShiftPay,
  formatPayCurrency,
  type EmploymentType,
} from "@/lib/payroll/schads"
import type { Timesheet } from "@/lib/timesheets/types"
import {
  TABLE_CELL_INNER,
  TABLE_FULL,
  TABLE_PANEL_HEADER,
  TABLE_PANEL_HEADER_LAST,
  TABLE_PROFILE_CELL,
  TABLE_PROFILE_CELL_LAST,
  TABLE_TEXT_CELL,
} from "@/lib/table-styles"

interface PayLine {
  timesheet: Timesheet
  hours: number
  hourlyRate: number
  gross: number
  penaltyLabel: string
}

interface StaffPayRow {
  key: string
  staffId: string | null
  name: string
  employmentType: EmploymentType
  baseRate: number
  level: string
  lines: PayLine[]
  totalHours: number
  totalGross: number
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export default function PayRunsPage() {
  const { toast } = useToast()
  const { timesheets, isLoading: timesheetsLoading, fetchError, refetch } = useTimesheets()
  const { staff, isLoading: staffLoading } = useStaff()
  const { getConfig, setConfig } = usePayrollSettings()
  const { canViewFinance, isLoading: permissionsLoading } = usePermissions()
  const { getLock, lock, unlock, recordExport } = usePayRunLocks()

  const [periodStart, setPeriodStart] = useState(isoDaysAgo(13))
  const [periodEnd, setPeriodEnd] = useState(todayIso())
  const [unlockReason, setUnlockReason] = useState("")
  const [isUnlockOpen, setIsUnlockOpen] = useState(false)

  const periodLock = getLock(periodStart, periodEnd)
  const isLocked = periodLock.locked
  const lastAudit = periodLock.audit[0] ?? null

  const staffName = useMemo(() => {
    const map = new Map<string, string>()
    for (const member of staff) map.set(member.id, member.name)
    return map
  }, [staff])

  const rows = useMemo<StaffPayRow[]>(() => {
    const approved = timesheets.filter(
      (t) => t.status === "approved" && t.startDate >= periodStart && t.startDate <= periodEnd,
    )

    const grouped = new Map<string, StaffPayRow>()
    for (const timesheet of approved) {
      const key = timesheet.staffId || `name:${timesheet.submittedByName}`
      const config = timesheet.staffId ? getConfig(timesheet.staffId) : { baseRate: 0, employmentType: "casual" as EmploymentType, level: "2" }
      const baseRate = config.baseRate > 0 ? config.baseRate : SCHADS_LEVEL_RATES[config.level] ?? 0

      const pay = computeShiftPay({
        baseRate,
        employmentType: config.employmentType,
        dateIso: timesheet.startDate,
        startTime: timesheet.startTime,
        endTime: timesheet.endTime,
        workedMinutes: timesheet.workedMinutes,
      })

      const existing = grouped.get(key)
      const line: PayLine = {
        timesheet,
        hours: pay.hours,
        hourlyRate: pay.hourlyRate,
        gross: pay.basePay,
        penaltyLabel: pay.penaltyLabel,
      }

      if (existing) {
        existing.lines.push(line)
        existing.totalHours = Number((existing.totalHours + pay.hours).toFixed(2))
        existing.totalGross = Number((existing.totalGross + pay.basePay).toFixed(2))
      } else {
        grouped.set(key, {
          key,
          staffId: timesheet.staffId,
          name: timesheet.staffId ? staffName.get(timesheet.staffId) || timesheet.submittedByName || "Unknown" : timesheet.submittedByName || "Unknown",
          employmentType: config.employmentType,
          baseRate,
          level: config.level,
          lines: [line],
          totalHours: pay.hours,
          totalGross: pay.basePay,
        })
      }
    }

    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [timesheets, periodStart, periodEnd, getConfig, staffName])

  const totalGross = useMemo(() => rows.reduce((sum, r) => sum + r.totalGross, 0), [rows])
  const totalHours = useMemo(() => rows.reduce((sum, r) => sum + r.totalHours, 0), [rows])
  const unconfigured = useMemo(() => rows.filter((r) => r.baseRate <= 0), [rows])

  const downloadCsv = () => {
    const headers = ["Employee", "Date", "Earnings", "Penalty", "Hours", "Rate", "Amount"]
    const csvRows: string[][] = []
    for (const row of rows) {
      for (const line of row.lines) {
        csvRows.push([
          row.name,
          line.timesheet.startDate,
          "Ordinary Hours",
          line.penaltyLabel,
          line.hours.toFixed(2),
          line.hourlyRate.toFixed(2),
          line.gross.toFixed(2),
        ])
      }
    }
    const csv = [headers.join(","), ...csvRows.map((r) => r.map(escapeCsv).join(","))].join("\r\n")
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `payrun_${periodStart}_${periodEnd}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Locking the period marks it ready for payroll and freezes the figures.
  const handleLockAndExport = async () => {
    if (rows.length === 0) return
    if (unconfigured.length > 0) {
      toast("Set a base rate for every employee before locking", "error")
      return
    }
    await lock(periodStart, periodEnd)
    downloadCsv()
    await recordExport(periodStart, periodEnd)
    toast(`Pay run locked & exported — ${rows.length} employee${rows.length === 1 ? "" : "s"}`, "success")
  }

  // Re-export a locked period for payroll without changing the locked figures.
  const handleReExport = async () => {
    if (rows.length === 0) return
    downloadCsv()
    await recordExport(periodStart, periodEnd)
    toast("Pay run re-exported", "success")
  }

  const handleConfirmUnlock = async () => {
    await unlock(periodStart, periodEnd, unlockReason.trim())
    setIsUnlockOpen(false)
    setUnlockReason("")
    toast("Pay run unlocked — edits are allowed again", "info")
  }

  if (timesheetsLoading || staffLoading || permissionsLoading) return <PageLoader label="Loading pay runs…" />
  if (!canViewFinance) {
    return (
      <div className="flex h-full flex-col">
        <PageTitleBar title="Pay runs" />
        <EmptyState icon={Wallet} title="No access" description="You do not have permission to view pay runs." className="flex-1" />
      </div>
    )
  }
  if (fetchError && timesheets.length === 0) return <PageError message="Failed to load pay runs" onRetry={refetch} />

  return (
    <div className="flex h-full flex-col">
      <PageTitleBar title="Pay runs" />
      <PageToolbarBar align="between">
        <div className="flex min-w-0 items-center gap-[6px]">
          <input
            type="date"
            value={periodStart}
            max={periodEnd}
            disabled={isLocked}
            onChange={(event) => setPeriodStart(event.target.value)}
            className="rounded-[6px] border border-folk-border bg-white px-[8px] py-[4px] text-[12px] text-folk-text outline-none focus:border-[#a3c4f3] disabled:cursor-not-allowed disabled:bg-folk-page disabled:text-folk-secondary"
            aria-label="Pay period start"
          />
          <span className="text-[12px] text-folk-secondary">to</span>
          <input
            type="date"
            value={periodEnd}
            min={periodStart}
            disabled={isLocked}
            onChange={(event) => setPeriodEnd(event.target.value)}
            className="rounded-[6px] border border-folk-border bg-white px-[8px] py-[4px] text-[12px] text-folk-text outline-none focus:border-[#a3c4f3] disabled:cursor-not-allowed disabled:bg-folk-page disabled:text-folk-secondary"
            aria-label="Pay period end"
          />
          {isLocked && (
            <span className="inline-flex h-[22px] items-center gap-[4px] rounded-full bg-[#e7f5ec] px-[8px] text-[11px] font-medium text-[#1a7f43]">
              <Lock className="h-[11px] w-[11px]" strokeWidth={2} />
              Locked
            </span>
          )}
        </div>
        <div className="flex items-center gap-[8px]">
          {isLocked ? (
            <>
              <button
                type="button"
                onClick={() => setIsUnlockOpen(true)}
                className="flex items-center gap-[5px] rounded-[6px] border border-folk-border px-[10px] py-[6px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                tabIndex={0}
              >
                <LockOpen className="h-[12px] w-[12px]" strokeWidth={1.75} />
                Unlock
              </button>
              <Button variant="primary" onClick={handleReExport} disabled={rows.length === 0} className="rounded-[6px]">
                <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
                <span>Re-export CSV</span>
              </Button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleLockAndExport}
              disabled={rows.length === 0}
              className={folkPrimaryAddBtnClass("disabled:opacity-50")}
              tabIndex={0}
            >
              <Lock className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>Lock &amp; export</span>
            </button>
          )}
        </div>
      </PageToolbarBar>

      <div className={listViewFilterBarClass()}>
        <p className="text-[12px] text-folk-secondary">
          Gross wages estimated from approved timesheets using SCHADS penalty rates. Set each employee&apos;s base rate and
          type below. Travel is paid through travel claims.
        </p>
        {unconfigured.length > 0 && (
          <span className="ml-auto shrink-0 rounded-[6px] bg-amber-50 px-[8px] py-[3px] text-[11px] font-medium text-amber-700">
            {unconfigured.length} need a base rate
          </span>
        )}
      </div>

      <div className={listViewBodyClass()}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No approved timesheets"
            description="Approved timesheets in this pay period will appear here, ready to compute and export."
            className="py-[80px]"
          />
        ) : (
          <table className={TABLE_FULL} style={{ tableLayout: "fixed", minWidth: 1040 }}>
            <thead>
              <tr>
                <th className={`${TABLE_PANEL_HEADER} w-[200px]`}>Employee</th>
                <th className={`${TABLE_PANEL_HEADER} w-[150px]`}>Type</th>
                <th className={`${TABLE_PANEL_HEADER} w-[150px]`}>Base rate ($/hr)</th>
                <th className={`${TABLE_PANEL_HEADER} w-[110px]`}>Shifts</th>
                <th className={`${TABLE_PANEL_HEADER} w-[110px]`}>Hours</th>
                <th className={`${TABLE_PANEL_HEADER_LAST} w-[140px]`}>Gross</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="transition-colors hover:bg-folk-hover">
                  <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                    <div className={TABLE_CELL_INNER}>
                      <span className="truncate font-medium">{row.name}</span>
                    </div>
                  </td>
                  <td className={TABLE_PROFILE_CELL}>
                    <div className={TABLE_CELL_INNER}>
                      <select
                        value={row.employmentType}
                        disabled={!row.staffId || isLocked}
                        onChange={(event) => row.staffId && setConfig(row.staffId, { employmentType: event.target.value as EmploymentType })}
                        className="w-full rounded-[6px] border border-folk-border bg-white px-[6px] py-[3px] text-[12px] text-folk-text outline-none focus:border-[#a3c4f3] disabled:cursor-not-allowed disabled:bg-folk-page"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {EMPLOYMENT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className={TABLE_PROFILE_CELL}>
                    <div className={TABLE_CELL_INNER}>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.baseRate || ""}
                        disabled={!row.staffId || isLocked}
                        placeholder={String(SCHADS_LEVEL_RATES[row.level] ?? 0)}
                        onChange={(event) => row.staffId && setConfig(row.staffId, { baseRate: Number(event.target.value) })}
                        onClick={(event) => event.stopPropagation()}
                        className="w-[110px] rounded-[6px] border border-folk-border bg-white px-[6px] py-[3px] text-[12px] text-folk-text outline-none focus:border-[#a3c4f3] disabled:cursor-not-allowed disabled:bg-folk-page"
                      />
                    </div>
                  </td>
                  <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL} text-folk-secondary`}>
                    <div className={TABLE_CELL_INNER}>{row.lines.length}</div>
                  </td>
                  <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL} text-folk-secondary`}>
                    <div className={TABLE_CELL_INNER}>{row.totalHours.toFixed(2)}</div>
                  </td>
                  <td className={TABLE_PROFILE_CELL_LAST}>
                    <div className={TABLE_CELL_INNER}>
                      {row.totalGross > 0 ? (
                        <span className="inline-flex h-[22px] items-center rounded-[6px] bg-green-50 px-[8px] text-[12px] font-medium text-green-700">
                          {formatPayCurrency(row.totalGross)}
                        </span>
                      ) : (
                        <span className="text-[#ccc]">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-[12px] border-t border-folk-border px-[16px] py-[10px]">
        <span className="min-w-0 truncate text-[12px] font-medium text-folk-secondary">
          {lastAudit ? (
            <>
              {lastAudit.action === "locked" && "Locked"}
              {lastAudit.action === "unlocked" && "Unlocked"}
              {lastAudit.action === "exported" && `Exported ×${periodLock.exportCount}`}
              {" "}by {lastAudit.by} · {new Date(lastAudit.at).toLocaleString("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              {lastAudit.reason ? ` · “${lastAudit.reason}”` : ""}
            </>
          ) : (
            <>
              {rows.length} employee{rows.length === 1 ? "" : "s"} · {totalHours.toFixed(2)} hours
            </>
          )}
        </span>
        <span className="shrink-0 text-[12px] font-semibold text-folk-text">Total gross {formatPayCurrency(totalGross)}</span>
      </div>

      {isUnlockOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-[16px]">
          <div className="w-full max-w-[420px] rounded-[8px] border border-folk-border bg-folk-surface p-[20px] shadow-folk">
            <h3 className="text-[14px] font-semibold text-folk-text">Unlock this pay run?</h3>
            <p className="mt-[4px] text-[12px] text-folk-secondary">
              Unlocking lets you edit figures again. The reason is recorded against this period so post-export corrections
              stay traceable.
            </p>
            <textarea
              value={unlockReason}
              onChange={(event) => setUnlockReason(event.target.value)}
              placeholder="Reason for unlocking (e.g. corrected start time for J. Smith)"
              className="mt-[12px] min-h-[80px] w-full resize-y rounded-[6px] border border-folk-border bg-white px-[12px] py-[8px] text-[13px] font-medium leading-[1.5] text-folk-text outline-none placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
              autoFocus
            />
            <div className="mt-[14px] flex items-center justify-end gap-[8px]">
              <button
                type="button"
                onClick={() => {
                  setIsUnlockOpen(false)
                  setUnlockReason("")
                }}
                className="outline-btn folk-pill-btn h-[32px] px-[12px] text-[13px] font-medium"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlock}
                disabled={unlockReason.trim().length === 0}
                className="rounded-[6px] border border-[#fdba74] bg-[#fff7ed] px-[12px] py-[6px] text-[12px] font-medium text-[#c2410c] transition-colors hover:bg-[#ffedd5] disabled:opacity-50"
                tabIndex={0}
              >
                Unlock pay run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
