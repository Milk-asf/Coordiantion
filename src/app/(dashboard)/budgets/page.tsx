"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useClients } from "@/lib/hooks/use-clients"
import { useInvoices } from "@/lib/hooks/use-invoices"
import { useCharges } from "@/lib/hooks/use-charges"
import { getBudgetRowMetrics, RELEASE_CADENCE_LABELS } from "@/lib/budget-utils"
import { getBudgetComponentLabel } from "@/lib/ndis-funding-pools"
import { EntityIcon } from "@/components/entity-icon"
import { PageLoader, PageError } from "@/components/page-state"
import { FolkMetricNumber } from "@/components/folk-metrics"
import { UsageBar } from "@/components/usage-bar"
import type { Budget } from "@/lib/types"
import {
  TABLE_FULL,
  TABLE_PANEL_CELL,
  TABLE_PANEL_CELL_LAST,
  TABLE_PANEL_CELL_STICKY_EDGE,
  TABLE_PANEL_HEADER_STICKY,
  TABLE_PANEL_HEADER_STICKY_EDGE,
  TABLE_PANEL_HEADER_STICKY_LAST,
  TABLE_PANEL_TEXT,
} from "@/lib/table-styles"
import { TableDisplayPopover } from "@/components/display-popover"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { matchesTableSearch } from "@/lib/table-search"
import {
  UserRound,
  CalendarDays,
  DollarSign,
  TrendingUp,
  Hash,
  ArrowUpRight,
  ListFilter,
  SlidersHorizontal,
  Clock,
  List,
  LayoutGrid,
  X,
  ChevronDown,
  Building2,
  CircleDot,
  Tag,
} from "lucide-react"

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—"
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

interface BudgetRow {
  clientId: string
  clientName: string
  clientIcon: string
  budget: Budget
  total: number
  used: number
  remaining: number
  usagePct: number
  status: { label: string; color: string }
  daysRemaining: number | null
}

const allColumns = [
  { key: "name", label: "Budget", icon: Hash },
  { key: "pool", label: "Funding pool", icon: Tag },
  { key: "total", label: "Total", icon: DollarSign },
  { key: "used", label: "Used", icon: DollarSign },
  { key: "remaining", label: "Remaining", icon: DollarSign },
  { key: "usage", label: "Usage", icon: TrendingUp },
  { key: "release", label: "Release", icon: CalendarDays },
  { key: "period", label: "Period", icon: CalendarDays },
  { key: "items", label: "Items", icon: Hash },
  { key: "daysRemaining", label: "Days left", icon: Clock },
  { key: "status", label: "Status", icon: Hash },
] as const

const defaultVisibleKeys = ["name", "pool", "total", "used", "remaining", "usage", "release", "status"]

const displayBudgetFields = allColumns.map((col) => ({
  key: col.key,
  label: col.label,
  locked: col.key === "name",
}))

export default function BudgetsPage() {
  const router = useRouter()
  const { clients, isLoading, fetchError, refetch } = useClients()
  const { invoices } = useInvoices()
  const { enabledCharges } = useCharges()

  const [viewMode, setViewMode] = useState<"list" | "card">("list")
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>([...defaultVisibleKeys])
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [clientFilter, setClientFilter] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const displayBtnRef = useRef<HTMLButtonElement>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)

  const budgetRows: BudgetRow[] = useMemo(() => {
    const rows: BudgetRow[] = []
    const activeClients = clients.filter((c) => c.status !== "archived")

    for (const client of activeClients) {
      const budgets = client.participant.budgets || []
      const clientInvoices = invoices.filter(
        (inv) => inv.clientId === client.id || inv.clientName === client.name || inv.clientName === client.displayName
      )

      for (const budget of budgets) {
        const metrics = getBudgetRowMetrics(budget, clientInvoices, enabledCharges)
        rows.push({
          clientId: client.id,
          clientName: client.displayName,
          clientIcon: client.iconText,
          budget,
          ...metrics,
        })
      }
    }

    return rows.sort((a, b) => {
      const aEnd = a.budget.endDate || ""
      const bEnd = b.budget.endDate || ""
      return bEnd.localeCompare(aEnd)
    })
  }, [clients, invoices, enabledCharges])

  const uniqueClients = useMemo(
    () => [...new Set(budgetRows.map((row) => row.clientName))].sort(),
    [budgetRows]
  )

  const displayRows = useMemo(() => {
    return budgetRows.filter((row) => {
      if (statusFilter.length > 0 && !statusFilter.includes(row.status.label)) return false
      if (clientFilter.length > 0 && !clientFilter.includes(row.clientName)) return false
      if (!matchesTableSearch(searchQuery, row.clientName, row.budget.name, row.status.label)) return false
      return true
    })
  }, [budgetRows, statusFilter, clientFilter, searchQuery])

  const visibleColumns = visibleColumnKeys
    .map((key) => allColumns.find((col) => col.key === key))
    .filter(Boolean) as typeof allColumns[number][]

  const summary = useMemo(() => {
    const total = displayRows.reduce((sum, row) => sum + row.total, 0)
    const used = displayRows.reduce((sum, row) => sum + row.used, 0)
    const remaining = displayRows.reduce((sum, row) => sum + row.remaining, 0)
    const usagePct = total > 0 ? (used / total) * 100 : 0
    return { total, used, remaining, usagePct }
  }, [displayRows])

  const handleToggleColumn = (key: string) => {
    if (key === "name") return
    setVisibleColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  if (isLoading) return <PageLoader />
  if (fetchError) return <PageError message={fetchError} onRetry={refetch} />

  return (
    <div className="flex h-full flex-col bg-folk-surface">
      <div className="flex h-[52px] shrink-0 items-center border-b border-folk-border bg-folk-nav px-[20px]">
        <h1 className="text-[15px] font-semibold text-folk-text">Budgets</h1>
        <span className="ml-[10px] text-[13px] font-medium text-folk-secondary">
          {displayRows.length} {displayRows.length === 1 ? "budget" : "budgets"}
        </span>
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-[16px] border-b border-folk-border bg-folk-nav px-[20px] py-[16px] sm:grid-cols-2 xl:grid-cols-4">
        <FolkMetricNumber title="Total allocated" value={formatCurrency(summary.total)} />
        <FolkMetricNumber title="Used" value={formatCurrency(summary.used)} />
        <FolkMetricNumber title="Remaining" value={formatCurrency(summary.remaining)} />
        <FolkMetricNumber title="Overall usage" value={`${Math.round(summary.usagePct)}%`} />
      </div>

      <div className="flex h-[44px] shrink-0 items-center gap-[8px] border-b border-folk-border bg-folk-nav px-[20px]">
        <div className="relative">
          <button
            ref={filterBtnRef}
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className="flex items-center gap-[5px] rounded-none border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
            tabIndex={0}
          >
            <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Filter</span>
          </button>
          {isFilterMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)} />
              <div className="absolute left-0 top-full z-50 mt-[4px] w-[220px] rounded-none border border-folk-border bg-folk-surface py-[4px] shadow-folk">
                {["Active", "Upcoming", "Expired", "Inactive"].map((status) => {
                  const isActive = statusFilter.includes(status)
                  return (
                    <button
                      key={status}
                      onClick={() => setStatusFilter((prev) => isActive ? prev.filter((s) => s !== status) : [...prev, status])}
                      className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                      tabIndex={0}
                    >
                      <div className={`flex h-[16px] w-[16px] items-center justify-center rounded-none border ${isActive ? "border-[#2563EB] bg-[#2563EB]" : "border-[#d0d0d0]"}`}>
                        {isActive && <span className="text-[10px] text-white">✓</span>}
                      </div>
                      {status}
                    </button>
                  )
                })}
                {statusFilter.length > 0 && (
                  <button
                    onClick={() => setStatusFilter([])}
                    className="mt-[4px] w-full border-t border-folk-border-subtle px-[12px] py-[8px] text-left text-[13px] font-medium text-folk-secondary hover:text-folk-text"
                    tabIndex={0}
                  >
                    Clear status
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {statusFilter.length > 0 && (
          <div className="flex items-center gap-[6px] rounded-none border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text">
            <CircleDot className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
            <span>Status</span>
            <span className="text-folk-secondary">{statusFilter.length} selected</span>
            <button onClick={() => setStatusFilter([])} className="text-folk-secondary hover:text-folk-text" aria-label="Clear status filter">
              <X className="h-[12px] w-[12px]" strokeWidth={1.5} />
            </button>
          </div>
        )}

        {clientFilter.length > 0 && (
          <div className="flex items-center gap-[6px] rounded-none border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text">
            <Building2 className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
            <span>Client</span>
            <span className="text-folk-secondary">{clientFilter.length} selected</span>
            <button onClick={() => setClientFilter([])} className="text-folk-secondary hover:text-folk-text" aria-label="Clear client filter">
              <X className="h-[12px] w-[12px]" strokeWidth={1.5} />
            </button>
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-[8px]">
          <ExpandableTableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search budgets…"
            ariaLabel="Search budgets"
          />
          <TableDisplayPopover
            fields={displayBudgetFields}
            visibleKeys={visibleColumnKeys}
            onToggle={handleToggleColumn}
            onReset={() => setVisibleColumnKeys([...defaultVisibleKeys])}
            isOpen={isDisplayOpen}
            onOpenChange={setIsDisplayOpen}
            buttonRef={displayBtnRef}
            topContent={
            <div className="flex gap-[8px] border-b border-folk-border-subtle px-[12px] py-[12px]">
              {([
                { key: "list" as const, label: "Table", Icon: List },
                { key: "card" as const, label: "Card", Icon: LayoutGrid },
              ]).map(({ key, label, Icon }) => {
                const isActive = viewMode === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setViewMode(key)}
                    className={`flex flex-1 flex-col items-center gap-[6px] rounded-none border py-[12px] transition-colors ${isActive ? "border-folk-border bg-[#f5f5f5] text-folk-text" : "border-transparent bg-white text-folk-secondary hover:bg-[#f5f5f5]"}`}
                    tabIndex={0}
                    aria-label={`${label} view`}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                    <span className="text-[12px] font-medium">{label}</span>
                  </button>
                )
              })}
            </div>
          }
          />
        </div>
      </div>

      {viewMode === "list" ? (
        <>
          <div className="flex-1 overflow-auto">
            <table className={TABLE_FULL}>
              <thead>
                <tr>
                  <th className={TABLE_PANEL_HEADER_STICKY_EDGE}>
                    <div className="flex items-center gap-[6px]">
                      <UserRound className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                      <span>Participant</span>
                    </div>
                  </th>
                  {visibleColumns.map((col, i) => {
                    const ColIcon = col.icon
                    const isLast = i === visibleColumns.length - 1
                    return (
                      <th
                        key={col.key}
                        className={`sticky top-0 z-20 ${isLast ? TABLE_PANEL_HEADER_STICKY_LAST : TABLE_PANEL_HEADER_STICKY}`}
                      >
                        <div className="flex items-center gap-[6px]">
                          <ColIcon className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                          <span>{col.label}</span>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="h-[200px] text-center text-[13px] font-medium text-folk-placeholder">
                      No budgets found
                    </td>
                  </tr>
                ) : (
                  displayRows.map((row) => {
                    const rowKey = `${row.clientId}-${row.budget.id}`
                    return (
                      <tr
                        key={rowKey}
                        className="group cursor-pointer transition-colors hover:bg-folk-hover"
                        onClick={() => router.push(`/clients/${row.clientId}?tab=budgets`)}
                      >
                        <td className={`sticky left-0 z-10 ${TABLE_PANEL_CELL_STICKY_EDGE} group-hover:bg-[#fafafa]`}>
                          <div className="flex items-center gap-[10px]">
                            <EntityIcon text={row.clientIcon} size="sm" />
                            <span className="truncate text-[13px] font-medium text-folk-text">{row.clientName}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/clients/${row.clientId}?tab=budgets`) }}
                              className="ml-auto flex h-[22px] w-[22px] items-center justify-center rounded-none text-folk-secondary opacity-0 transition-opacity hover:bg-[var(--folk-border-subtle)] hover:text-folk-text group-hover:opacity-100"
                              aria-label={`Open ${row.clientName} budgets`}
                              tabIndex={0}
                            >
                              <ArrowUpRight className="h-[13px] w-[13px]" strokeWidth={1.75} />
                            </button>
                          </div>
                        </td>
                        {visibleColumns.map((col, i) => {
                          const isLast = i === visibleColumns.length - 1
                          const cellClass = `${isLast ? TABLE_PANEL_CELL_LAST : TABLE_PANEL_CELL} text-[13px] font-normal text-folk-text group-hover:bg-[#fafafa]`
                          switch (col.key) {
                            case "name":
                              return <td key={col.key} className={cellClass}>{row.budget.name}</td>
                            case "pool":
                              return <td key={col.key} className={cellClass}>{getBudgetComponentLabel(row.budget)}</td>
                            case "total":
                              return <td key={col.key} className={cellClass}>{formatCurrency(row.total)}</td>
                            case "used":
                              return <td key={col.key} className={cellClass}>{formatCurrency(row.used)}</td>
                            case "remaining":
                              return <td key={col.key} className={cellClass}>{formatCurrency(row.remaining)}</td>
                            case "usage":
                              return (
                                <td key={col.key} className={cellClass}>
                                  <UsageBar percent={row.usagePct} tooltip={`${Math.round(row.usagePct)}% used`} />
                                </td>
                              )
                            case "release":
                              return (
                                <td key={col.key} className={cellClass}>
                                  {row.budget.releaseCadence
                                    ? RELEASE_CADENCE_LABELS[row.budget.releaseCadence]
                                    : "—"}
                                </td>
                              )
                            case "period":
                              return <td key={col.key} className={cellClass}>{formatDate(row.budget.startDate)} – {formatDate(row.budget.endDate)}</td>
                            case "items":
                              return <td key={col.key} className={cellClass}>{row.budget.lineItems.length}</td>
                            case "daysRemaining":
                              return <td key={col.key} className={cellClass}>{row.daysRemaining ?? "—"}</td>
                            case "status":
                              return (
                                <td key={col.key} className={cellClass}>
                                  <span className={`inline-flex h-[24px] items-center rounded-none px-[10px] text-[12px] font-medium ${row.status.color}`}>
                                    {row.status.label}
                                  </span>
                                </td>
                              )
                            default:
                              return null
                          }
                        })}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-folk-secondary">
              {displayRows.length} {displayRows.length === 1 ? "budget" : "budgets"}
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-auto px-[24px] py-[24px]">
            {displayRows.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center">
                <span className="text-[13px] font-medium text-folk-placeholder">No budgets found</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-[16px] md:grid-cols-2 xl:grid-cols-3">
                {displayRows.map((row) => (
                  <div
                    key={`${row.clientId}-${row.budget.id}`}
                    className="group cursor-pointer rounded-none border border-[#e2e2e2] p-[20px] transition-colors hover:border-folk-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                    onClick={() => router.push(`/clients/${row.clientId}?tab=budgets`)}
                  >
                    <div className="flex items-center gap-[8px]">
                      <EntityIcon text={row.clientIcon} size="sm" />
                      <span className="truncate text-[13px] font-semibold text-folk-text">{row.clientName}</span>
                      <span className={`ml-auto inline-flex h-[22px] items-center rounded-none px-[8px] text-[11px] font-medium ${row.status.color}`}>
                        {row.status.label}
                      </span>
                    </div>
                    <p className="mt-[12px] truncate text-[14px] font-semibold text-folk-text">{row.budget.name}</p>
                    <p className="mt-[4px] text-[12px] text-folk-secondary">
                      {formatDate(row.budget.startDate)} – {formatDate(row.budget.endDate)}
                    </p>
                    <div className="mt-[16px] grid grid-cols-3 gap-[12px]">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-folk-secondary">Total</p>
                        <p className="mt-[2px] text-[13px] font-semibold text-[#7c3aed]">{formatCurrency(row.total)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-folk-secondary">Used</p>
                        <p className="mt-[2px] text-[13px] font-semibold text-folk-text">{formatCurrency(row.used)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-folk-secondary">Left</p>
                        <p className="mt-[2px] text-[13px] font-semibold text-folk-text">{formatCurrency(row.remaining)}</p>
                      </div>
                    </div>
                    <div className="mt-[14px]">
                      <UsageBar percent={row.usagePct} tooltip={`${Math.round(row.usagePct)}% used`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-folk-secondary">
              {displayRows.length} {displayRows.length === 1 ? "budget" : "budgets"}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
