"use client"

import { useState, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useClients } from "@/lib/hooks/use-clients"
import { useColumnResize } from "@/lib/hooks/use-column-resize"
import { useInvoices } from "@/lib/hooks/use-invoices"
import { EntityIcon } from "@/components/entity-icon"
import { PageLoader, PageError } from "@/components/page-state"
import type { NdisPlan } from "@/lib/types"
import {
  UserRound,
  CalendarDays,
  DollarSign,
  TrendingUp,
  Hash,
  ArrowUpRight,
  ListFilter,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  EyeOff,
  ChevronDown,
  ChevronLeft,
  CircleDot,
  Building2,
  X,
  Clock,
  Flame,
  Activity,
  List,
  LayoutGrid,
} from "lucide-react"

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function getPlanStatus(plan: NdisPlan): { label: string; color: string } {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = plan.endDate ? new Date(plan.endDate + "T00:00:00") : null
  const start = plan.startDate ? new Date(plan.startDate + "T00:00:00") : null

  if (!start && !end) return { label: "Inactive", color: "bg-red-50 text-red-600" }
  if (end && end < now) return { label: "Inactive", color: "bg-red-50 text-red-600" }
  if (start && start > now) return { label: "Upcoming", color: "bg-blue-50 text-blue-600" }
  if (start && start <= now && end && end >= now) return { label: "Active", color: "bg-green-100 text-green-700" }
  if (start && start <= now && !end) return { label: "Active", color: "bg-green-100 text-green-700" }
  return { label: "Inactive", color: "bg-red-50 text-red-600" }
}

interface PlanRow {
  clientId: string
  clientName: string
  clientIcon: string
  plan: NdisPlan
  totalBudget: number
  totalUsed: number
  remaining: number
  usagePct: number
  status: { label: string; color: string }
  daysRemaining: number
  totalDays: number
  timePct: number
  burnStatus: "over" | "under" | "on-track" | "n/a"
  monthlySpend: number
  projectedEnd: number
}

const allColumns = [
  { key: "total", label: "Total", icon: DollarSign, minWidth: 140 },
  { key: "used", label: "Used", icon: DollarSign, minWidth: 140 },
  { key: "remaining", label: "Remaining", icon: DollarSign, minWidth: 140 },
  { key: "usage", label: "Usage", icon: TrendingUp, minWidth: 180 },
  { key: "burnRate", label: "Burn Rate", icon: Flame, minWidth: 160 },
  { key: "daysRemaining", label: "Days Left", icon: Clock, minWidth: 120 },
  { key: "timeElapsed", label: "Time Elapsed", icon: Activity, minWidth: 180 },
  { key: "monthlySpend", label: "Monthly Spend", icon: DollarSign, minWidth: 150 },
  { key: "projectedEnd", label: "Projected End", icon: DollarSign, minWidth: 150 },
  { key: "startDate", label: "Start", icon: CalendarDays, minWidth: 120 },
  { key: "endDate", label: "End", icon: CalendarDays, minWidth: 120 },
  { key: "status", label: "Status", icon: Hash, minWidth: 120 },
]

const defaultVisibleKeys = allColumns.map((col) => col.key)

export default function NdisPlansPage() {
  const router = useRouter()
  const { clients, isLoading, fetchError, refetch } = useClients()
  const { invoices } = useInvoices()

  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(defaultVisibleKeys)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const [columnMenuKey, setColumnMenuKey] = useState<string | null>(null)
  const [columnMenuPos, setColumnMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null)
  const [hoveredSegment, setHoveredSegment] = useState<{ idx: number; x: number; y: number; amount: number; label: string } | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "card">("list")
  const displayBtnRef = useRef<HTMLButtonElement>(null)
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [clientFilter, setClientFilter] = useState<string[]>([])
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const filterPillRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const visibleColumns = visibleColumnKeys
    .map((key) => allColumns.find((col) => col.key === key))
    .filter(Boolean) as typeof allColumns

  const { getWidth, handleMouseDown: handleColResize } = useColumnResize(
    visibleColumns.map((c) => c.key),
    { minWidth: 80, maxWidth: 500, defaultWidth: 180 }
  )

  const handleToggleColumn = (key: string) => {
    setVisibleColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const handleMoveColumn = (key: string, direction: "left" | "right") => {
    setVisibleColumnKeys((prev) => {
      const idx = prev.indexOf(key)
      if (idx < 0) return prev
      const newIdx = direction === "left" ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]
      next[idx] = prev[newIdx]
      next[newIdx] = prev[idx]
      return next
    })
    setColumnMenuKey(null)
    setColumnMenuPos(null)
  }

  const planRows: PlanRow[] = useMemo(() => {
    const rows: PlanRow[] = []
    const activeClients = clients.filter((c) => c.status !== "archived")
    const now = new Date()

    for (const client of activeClients) {
      const plans = client.participant.plans || []
      const clientInvoices = invoices.filter(
        (inv) => inv.clientId === client.id || inv.clientName === client.name || inv.clientName === client.displayName
      )

      for (const plan of plans) {
        const services = plan.services || []
        const totalBudget = services.reduce((sum, svc) => sum + svc.budget, 0)

        let totalUsed = 0
        for (const inv of clientInvoices) {
          for (const li of inv.lineItems) {
            const isInPlan = services.some((svc) => svc.enabledChargeItems.includes(li.chargeItemNumber))
            if (isInPlan) totalUsed += li.amount
          }
        }

        const remaining = Math.max(0, totalBudget - totalUsed)
        const usagePct = totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0

        const start = plan.startDate ? new Date(plan.startDate + "T00:00:00") : null
        const end = plan.endDate ? new Date(plan.endDate + "T00:00:00") : null
        const totalDays = start && end ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000)) : 0
        const daysElapsed = start ? Math.max(0, Math.ceil((now.getTime() - start.getTime()) / 86400000)) : 0
        const daysRemaining = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000)) : 0
        const timePct = totalDays > 0 ? Math.min(100, (daysElapsed / totalDays) * 100) : 0

        const burnDiff = usagePct - timePct
        const burnStatus: PlanRow["burnStatus"] = totalDays === 0 ? "n/a" : burnDiff > 10 ? "over" : burnDiff < -10 ? "under" : "on-track"

        const monthsElapsed = daysElapsed / 30.44
        const monthlySpend = monthsElapsed >= 1 ? totalUsed / monthsElapsed : totalUsed

        const projectedEnd = monthlySpend > 0 && totalBudget > 0 ? (remaining / monthlySpend) * 30.44 : 0

        rows.push({
          clientId: client.id,
          clientName: client.displayName,
          clientIcon: client.iconText,
          plan,
          totalBudget,
          totalUsed,
          remaining,
          usagePct,
          status: getPlanStatus(plan),
          daysRemaining,
          totalDays,
          timePct,
          burnStatus,
          monthlySpend,
          projectedEnd,
        })
      }
    }

    return rows.filter((r) => r.status.label === "Active")
  }, [clients, invoices])

  const uniqueStatuses = useMemo(() => {
    const set = new Set(planRows.map((r) => r.status.label))
    return Array.from(set).sort()
  }, [planRows])

  const uniqueClients = useMemo(() => {
    const set = new Set(planRows.map((r) => r.clientName))
    return Array.from(set).sort()
  }, [planRows])

  const filteredRows = useMemo(() => {
    let rows = planRows
    if (statusFilter.length > 0) rows = rows.filter((r) => statusFilter.includes(r.status.label))
    if (clientFilter.length > 0) rows = rows.filter((r) => clientFilter.includes(r.clientName))
    return rows
  }, [planRows, statusFilter, clientFilter])

  const sortedRows = useMemo(() => {
    if (!sortKey) {
      return [...filteredRows].sort((a, b) => {
        if (a.status.label === "Active" && b.status.label !== "Active") return -1
        if (a.status.label !== "Active" && b.status.label === "Active") return 1
        return (b.plan.startDate || "").localeCompare(a.plan.startDate || "")
      })
    }

    return [...filteredRows].sort((a, b) => {
      let valA = 0, valB = 0
      let strA = "", strB = ""
      let isNumeric = false

      switch (sortKey) {
        case "participant": strA = a.clientName; strB = b.clientName; break
        case "total": valA = a.totalBudget; valB = b.totalBudget; isNumeric = true; break
        case "used": valA = a.totalUsed; valB = b.totalUsed; isNumeric = true; break
        case "remaining": valA = a.remaining; valB = b.remaining; isNumeric = true; break
        case "usage": valA = a.usagePct; valB = b.usagePct; isNumeric = true; break
        case "burnRate": valA = a.usagePct - a.timePct; valB = b.usagePct - b.timePct; isNumeric = true; break
        case "daysRemaining": valA = a.daysRemaining; valB = b.daysRemaining; isNumeric = true; break
        case "timeElapsed": valA = a.timePct; valB = b.timePct; isNumeric = true; break
        case "monthlySpend": valA = a.monthlySpend; valB = b.monthlySpend; isNumeric = true; break
        case "projectedEnd": valA = a.projectedEnd; valB = b.projectedEnd; isNumeric = true; break
        case "startDate": strA = a.plan.startDate || ""; strB = b.plan.startDate || ""; break
        case "endDate": strA = a.plan.endDate || ""; strB = b.plan.endDate || ""; break
        case "status": strA = a.status.label; strB = b.status.label; break
        default: break
      }

      const cmp = isNumeric ? valA - valB : strA.localeCompare(strB)
      return sortDirection === "asc" ? cmp : -cmp
    })
  }, [filteredRows, sortKey, sortDirection])

  if (isLoading) return <PageLoader label="Loading plans…" />
  if (fetchError) return <PageError message="Failed to load plans" onRetry={refetch} />

  const renderCell = (row: PlanRow, key: string, isSelected?: boolean) => {
    const cellBg = isSelected ? "bg-[#eef4ff]" : "bg-[#fafafa] group-hover:bg-[#f5f5f5]"
    const cellBase = `h-[44px] overflow-hidden whitespace-nowrap border-b border-r border-[#dcdcdc] px-[20px] ${cellBg}`
    const textCell = `${cellBase} text-[13px] font-medium text-[#262626]`
    const usageColor = row.usagePct >= 90 ? "bg-red-500" : row.usagePct >= 70 ? "bg-amber-400" : "bg-[#2563EB]"
    const dash = <span className="text-[#bbb]">—</span>

    switch (key) {
      case "total":
        return (
          <td key={key} className={cellBase}>
            <span className="inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] bg-[#e8edf2] px-[12px] text-[12px] font-medium text-[#334155]">
              ${row.totalBudget.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </td>
        )
      case "used":
        return (
          <td key={key} className={cellBase}>
            <span className="inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] bg-[#e8edf2] px-[12px] text-[12px] font-medium text-[#334155]">
              ${row.totalUsed.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </td>
        )
      case "remaining":
        return (
          <td key={key} className={cellBase}>
            <span className="inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] bg-green-100 px-[12px] text-[12px] font-medium text-green-700">
              ${row.remaining.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </td>
        )
      case "usage":
        return (
          <td key={key} className={cellBase}>
            <div className="flex items-center gap-[10px]">
              <div className="h-[12px] w-[80px] overflow-hidden rounded-full bg-[#f0f0f0]">
                <div className={`h-full rounded-full ${usageColor} transition-all`} style={{ width: `${Math.min(100, row.usagePct)}%` }} />
              </div>
              <span className="text-[12px] font-medium text-[#888]">{Math.round(row.usagePct)}%</span>
            </div>
          </td>
        )
      case "burnRate": {
        if (row.burnStatus === "n/a") return <td key={key} className={textCell}>{dash}</td>
        const burnLabel = row.burnStatus === "over" ? "Over" : row.burnStatus === "under" ? "Under" : "On track"
        const burnChip = row.burnStatus === "over"
          ? "bg-red-50 text-red-600"
          : row.burnStatus === "under"
            ? "bg-amber-50 text-amber-600"
            : "bg-green-100 text-green-700"
        return (
          <td key={key} className={cellBase}>
            <span className={`inline-flex rounded-[4px] px-[8px] py-[2px] text-[11px] font-medium ${burnChip}`}>
              {burnLabel}
            </span>
          </td>
        )
      }
      case "daysRemaining":
        return (
          <td key={key} className={textCell}>
            {row.totalDays > 0 ? (
              <span>{row.daysRemaining} <span className="text-[#999]">days</span></span>
            ) : dash}
          </td>
        )
      case "timeElapsed": {
        if (row.totalDays === 0) return <td key={key} className={textCell}>{dash}</td>
        const timeColor = row.timePct >= 90 ? "bg-red-500" : row.timePct >= 70 ? "bg-amber-400" : "bg-[#BFDBFE]"
        return (
          <td key={key} className={cellBase}>
            <div className="flex items-center gap-[10px]">
              <div className="h-[12px] w-[80px] overflow-hidden rounded-full bg-[#f0f0f0]">
                <div className={`h-full rounded-full ${timeColor} transition-all`} style={{ width: `${Math.min(100, row.timePct)}%` }} />
              </div>
              <span className="text-[12px] font-medium text-[#888]">{Math.round(row.timePct)}%</span>
            </div>
          </td>
        )
      }
      case "monthlySpend":
        return (
          <td key={key} className={textCell}>
            {row.monthlySpend > 0 ? (
              <span>${row.monthlySpend.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}<span className="text-[#999]">/mo</span></span>
            ) : dash}
          </td>
        )
      case "projectedEnd":
        return (
          <td key={key} className={textCell}>
            {row.projectedEnd > 0 && row.status.label === "Active" ? (
              <span>{Math.round(row.projectedEnd)} <span className="text-[#999]">days</span></span>
            ) : dash}
          </td>
        )
      case "startDate":
        return <td key={key} className={textCell}>{formatDate(row.plan.startDate)}</td>
      case "endDate":
        return <td key={key} className={textCell}>{formatDate(row.plan.endDate)}</td>
      case "status":
        return (
          <td key={key} className={cellBase}>
            <span className={`inline-flex rounded-[4px] px-[8px] py-[2px] text-[11px] font-medium ${row.status.color}`}>
              {row.status.label}
            </span>
          </td>
        )
      default:
        return <td key={key} className={textCell}>{dash}</td>
    }
  }

  const selectedRow = sortedRows.find((r) => `${r.clientId}-${r.plan.id}` === selectedRowKey) || null

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
        <span className="text-[13px] font-medium text-[#262626]">NDIS Plans</span>
      </div>

      <div className="shrink-0 bg-[#fafafa] px-[24px] py-[20px]">
        <div className="rounded-[8px] border border-[#e8e8e8] px-[28px] py-[24px]">
          {selectedRow ? (() => {
            const row = selectedRow
            const usedPct = Math.min(100, row.usagePct)

            const services = row.plan.services || []
            const allReleases: { period: number; amount: number }[] = []
            for (const svc of services) {
              if (svc.releasePeriods && svc.releasePeriods.length > 1) {
                for (const rp of svc.releasePeriods) {
                  const existing = allReleases.find((r) => r.period === rp.period)
                  if (existing) existing.amount += rp.amount
                  else allReleases.push({ period: rp.period, amount: rp.amount })
                }
              }
            }
            allReleases.sort((a, b) => a.period - b.period)
            const hasSegments = allReleases.length > 1

            const segments: { amount: number; pct: number; label: string }[] = []
            if (hasSegments) {
              for (let i = 0; i < allReleases.length; i++) {
                const pct = row.totalBudget > 0 ? (allReleases[i].amount / row.totalBudget) * 100 : 0
                segments.push({ amount: allReleases[i].amount, pct, label: `Release ${allReleases[i].period}` })
              }
            } else {
              segments.push({ amount: row.totalBudget, pct: 100, label: "Total budget" })
            }

            const gapWidth = 3

            return (
              <div className="flex flex-col gap-[14px]">
                <div className="flex items-baseline justify-between">
                  <span className="text-[18px] font-bold text-[#262626]">${row.totalBudget.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  <div className="flex items-center gap-[12px]">
                    <span className="text-[12px] font-semibold text-[#262626]">{Math.round(usedPct)}% <span className="font-medium text-[#888]">used</span></span>
                    <div className="h-[12px] w-px bg-[#e8e8e8]" />
                    <span className="text-[12px] font-semibold text-[#262626]">{row.daysRemaining} <span className="font-medium text-[#888]">days left</span></span>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex w-full items-stretch" style={{ height: 28, gap: hasSegments ? gapWidth : 0 }}>
                    {segments.map((seg, i) => {
                      const isFirst = i === 0
                      const isLast = i === segments.length - 1
                      const segUsedPct = row.totalBudget > 0 ? Math.min(100, (row.totalUsed / row.totalBudget) * 100) : 0

                      let cumulativeBefore = 0
                      for (let j = 0; j < i; j++) cumulativeBefore += segments[j].pct
                      const cumulativeAfter = cumulativeBefore + seg.pct

                      let fillPct = 0
                      if (segUsedPct >= cumulativeAfter) fillPct = 100
                      else if (segUsedPct > cumulativeBefore) fillPct = ((segUsedPct - cumulativeBefore) / seg.pct) * 100

                      const borderRadius = (() => {
                        if (!hasSegments) return "6px"
                        if (isFirst) return "6px 0 0 6px"
                        if (isLast) return "0 6px 6px 0"
                        return "0"
                      })()

                      return (
                        <div
                          key={i}
                          className="relative cursor-default overflow-hidden bg-[#f0f0f0]"
                          style={{ flex: seg.pct, borderRadius }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setHoveredSegment({ idx: i, x: rect.left + rect.width / 2, y: rect.top, amount: seg.amount, label: seg.label })
                          }}
                          onMouseLeave={() => setHoveredSegment(null)}
                        >
                          {fillPct > 0 && (
                            <div
                              className="absolute inset-y-0 left-0 bg-[#2563EB]"
                              style={{ width: `${fillPct}%`, borderRadius: fillPct >= 100 ? borderRadius : isFirst ? "6px 0 0 6px" : "0" }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {hoveredSegment && (
                    <div
                      className="pointer-events-none fixed z-50 rounded-[6px] border border-[#e0e0e0] bg-white px-[12px] py-[8px] shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                      style={{ left: hoveredSegment.x, top: hoveredSegment.y - 8, transform: "translate(-50%, -100%)" }}
                    >
                      <span className="text-[11px] font-medium text-[#888]">{hoveredSegment.label}</span>
                      <p className="text-[13px] font-bold text-[#262626]">${hoveredSegment.amount.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })() : (
            <div className="flex flex-col items-center justify-center py-[28px]">
              <span className="text-[14px] font-semibold text-[#262626]">NDIS Plans</span>
              <span className="mt-[4px] text-[12px] text-[#888]">Select a plan below to view details</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex h-[41px] shrink-0 items-center gap-[8px] border-b border-[#dcdcdc] px-[16px]">
        <div className="relative">
          <button
            ref={filterBtnRef}
            onClick={() => { setIsFilterMenuOpen(!isFilterMenuOpen); setActiveFilterDropdown(null) }}
            className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Filter</span>
          </button>
          {isFilterMenuOpen && (
            <>
              <div className="fixed inset-0 z-[55]" onClick={() => setIsFilterMenuOpen(false)} />
              <div className="absolute left-0 top-full z-[60] mt-[4px] w-[180px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                <p className="px-[16px] py-[6px] text-[11px] font-medium text-[#888]">Filter by</p>
                {[
                  { key: "status", label: "Status", icon: CircleDot },
                  { key: "client", label: "Client", icon: Building2 },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.key}
                      onClick={() => { setActiveFilterDropdown(item.key); setIsFilterMenuOpen(false) }}
                      className="flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                    >
                      <Icon className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
        {statusFilter.length > 0 && (
          <div className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626]">
            <CircleDot className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
            <button ref={(el) => { filterPillRefs.current["status"] = el }} onClick={() => setActiveFilterDropdown(activeFilterDropdown === "status" ? null : "status")} className="hover:underline" tabIndex={0}>Status</button>
            <span className="text-[#888]">is</span>
            <span>{statusFilter.length} {statusFilter.length === 1 ? "value" : "values"}</span>
            <button onClick={() => setStatusFilter([])} className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded text-[#888] transition-colors hover:text-[#262626]" tabIndex={0} aria-label="Clear status filter"><X className="h-[12px] w-[12px]" strokeWidth={1.5} /></button>
          </div>
        )}
        {clientFilter.length > 0 && (
          <div className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626]">
            <Building2 className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
            <button ref={(el) => { filterPillRefs.current["client"] = el }} onClick={() => setActiveFilterDropdown(activeFilterDropdown === "client" ? null : "client")} className="hover:underline" tabIndex={0}>Client</button>
            <span className="text-[#888]">is</span>
            <span>{clientFilter.length} {clientFilter.length === 1 ? "value" : "values"}</span>
            <button onClick={() => setClientFilter([])} className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded text-[#888] transition-colors hover:text-[#262626]" tabIndex={0} aria-label="Clear client filter"><X className="h-[12px] w-[12px]" strokeWidth={1.5} /></button>
          </div>
        )}
        <div className="ml-auto flex items-center">
          <button
            ref={displayBtnRef}
            onClick={() => setIsDisplayOpen(!isDisplayOpen)}
            className="flex items-center gap-[5px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            <SlidersHorizontal className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Display</span>
          </button>
          {isDisplayOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDisplayOpen(false)} />
              <div
                className="fixed z-50 w-[420px] rounded-lg border border-[#dcdcdc] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                style={(() => {
                  const rect = displayBtnRef.current?.getBoundingClientRect()
                  if (!rect) return {}
                  return { top: rect.bottom + 4, right: window.innerWidth - rect.right }
                })()}
              >
                <div className="flex items-center justify-between border-b border-[#f0f0f0] px-[20px] py-[14px]">
                  <div className="flex items-center gap-[8px] text-[13px] font-semibold text-[#262626]">
                    <ArrowUpDown className="h-[14px] w-[14px] text-[#888]" strokeWidth={1.75} />
                    <span>Sorting</span>
                  </div>
                  <div className="flex items-center gap-[6px]">
                    <button className="flex items-center gap-[6px] rounded-[4px] border border-[#dcdcdc] px-[12px] py-[6px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]" tabIndex={0}>
                      <span>{sortKey ? (allColumns.find((c) => c.key === sortKey)?.label || "Default") : "Default"}</span>
                      <ChevronDown className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                      className="flex h-[32px] w-[32px] items-center justify-center rounded-[4px] border border-[#dcdcdc] text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                    >
                      {sortDirection === "asc" ? (
                        <ArrowUp className="h-[14px] w-[14px]" strokeWidth={1.75} />
                      ) : (
                        <ArrowDown className="h-[14px] w-[14px]" strokeWidth={1.75} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="border-b border-[#f0f0f0] px-[20px] py-[14px]">
                  <div className="flex items-center gap-[8px]">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`flex flex-1 flex-col items-center gap-[8px] rounded-[12px] border py-[16px] transition-colors ${viewMode === "list" ? "border-[#c0c0c0] bg-white text-[#262626]" : "border-[#e8e8e8] bg-[#fafafa] text-[#bbb] hover:border-[#d0d0d0]"}`}
                      tabIndex={0}
                      aria-label="List view"
                    >
                      <List className="h-[20px] w-[20px]" strokeWidth={1.5} />
                      <span className="text-[13px] font-medium">List</span>
                    </button>
                    <button
                      onClick={() => setViewMode("card")}
                      className={`flex flex-1 flex-col items-center gap-[8px] rounded-[12px] border py-[16px] transition-colors ${viewMode === "card" ? "border-[#c0c0c0] bg-white text-[#262626]" : "border-[#e8e8e8] bg-[#fafafa] text-[#bbb] hover:border-[#d0d0d0]"}`}
                      tabIndex={0}
                      aria-label="Card view"
                    >
                      <LayoutGrid className="h-[20px] w-[20px]" strokeWidth={1.5} />
                      <span className="text-[13px] font-medium">Card</span>
                    </button>
                  </div>
                </div>

                <div className="px-[20px] pb-[16px] pt-[14px]">
                  <div className="pb-[12px] text-[13px] font-medium text-[#888]">Display properties</div>
                  <div className="flex flex-wrap gap-[8px]">
                    {allColumns.map((col) => {
                      const isActive = visibleColumnKeys.includes(col.key)
                      return (
                        <button
                          key={col.key}
                          onClick={() => handleToggleColumn(col.key)}
                          className={`inline-flex items-center rounded-[4px] border px-[10px] py-[5px] text-[12px] font-medium transition-colors ${isActive ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-[#dcdcdc] bg-transparent text-[#262626] hover:bg-[#f5f5f5]"}`}
                          tabIndex={0}
                        >
                          {col.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-[20px] border-t border-[#f0f0f0] px-[20px] py-[12px]">
                  <button
                    onClick={() => { setVisibleColumnKeys(defaultVisibleKeys); setSortKey(null); setSortDirection("asc"); setViewMode("list") }}
                    className="text-[13px] font-medium text-[#bbb] transition-colors hover:text-[#262626]"
                    tabIndex={0}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {activeFilterDropdown && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setActiveFilterDropdown(null)} />
          {(() => {
            const anchor = filterPillRefs.current[activeFilterDropdown] || filterBtnRef.current
            const rect = anchor?.getBoundingClientRect()
            if (!rect) return null
            const dropdownStyle = { top: rect.bottom + 4, left: rect.left, minWidth: 200 }

            if (activeFilterDropdown === "status") return (
              <div className="fixed z-[60] max-h-[280px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]" style={dropdownStyle}>
                <button onClick={() => { setActiveFilterDropdown(null); setIsFilterMenuOpen(true) }} className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
                  <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
                  <span>Back</span>
                </button>
                <p className="px-[16px] py-[4px] text-[11px] font-medium text-[#888]">Filter by status</p>
                {uniqueStatuses.map((label) => {
                  const isActive = statusFilter.includes(label)
                  return (
                    <button key={label} onClick={() => setStatusFilter((prev) => isActive ? prev.filter((f) => f !== label) : [...prev, label])} className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-[#f5f5f5]" : ""}`} tabIndex={0}>
                      <div className={`flex h-[16px] w-[16px] items-center justify-center rounded border ${isActive ? "border-[#262626] bg-[#262626]" : "border-[#d0d0d0]"}`}>
                        {isActive && <span className="text-[10px] text-white">✓</span>}
                      </div>
                      <span className="text-[#262626]">{label}</span>
                    </button>
                  )
                })}
                {uniqueStatuses.length === 0 && <p className="px-[16px] py-[8px] text-[13px] text-[#888]">No statuses</p>}
                <div className="border-t border-[#f0f0f0] px-[8px] py-[4px]">
                  <button onClick={() => { setStatusFilter([]); setActiveFilterDropdown(null) }} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>Clear</button>
                </div>
              </div>
            )

            if (activeFilterDropdown === "client") return (
              <div className="fixed z-[60] max-h-[280px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]" style={dropdownStyle}>
                <button onClick={() => { setActiveFilterDropdown(null); setIsFilterMenuOpen(true) }} className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
                  <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
                  <span>Back</span>
                </button>
                <p className="px-[16px] py-[4px] text-[11px] font-medium text-[#888]">Filter by client</p>
                {uniqueClients.map((name) => {
                  const isActive = clientFilter.includes(name)
                  return (
                    <button key={name} onClick={() => setClientFilter((prev) => isActive ? prev.filter((f) => f !== name) : [...prev, name])} className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-[#f5f5f5]" : ""}`} tabIndex={0}>
                      <div className={`flex h-[16px] w-[16px] items-center justify-center rounded border ${isActive ? "border-[#262626] bg-[#262626]" : "border-[#d0d0d0]"}`}>
                        {isActive && <span className="text-[10px] text-white">✓</span>}
                      </div>
                      <span className="text-[#262626]">{name}</span>
                    </button>
                  )
                })}
                {uniqueClients.length === 0 && <p className="px-[16px] py-[8px] text-[13px] text-[#888]">No clients</p>}
                <div className="border-t border-[#f0f0f0] px-[8px] py-[4px]">
                  <button onClick={() => { setClientFilter([]); setActiveFilterDropdown(null) }} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>Clear</button>
                </div>
              </div>
            )

            return null
          })()}
        </>
      )}

      {viewMode === "list" ? (
        <>
          <div className="flex-1 overflow-auto bg-[#fafafa]">
            <table className="w-full border-separate border-spacing-0 text-left" style={{ tableLayout: "fixed", minWidth: visibleColumns.reduce((sum, col) => sum + getWidth(col.key, 180), 240) }}>
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-30 h-[44px] overflow-hidden whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]" style={{ width: 240 }}>
                    <div className="flex items-center gap-[6px]">
                      <UserRound className="h-[13px] w-[13px] shrink-0 text-[#999]" strokeWidth={1.5} />
                      <span className="truncate">Participant</span>
                      <button
                        onClick={(e) => {
                          if (columnMenuKey === "participant") { setColumnMenuKey(null); setColumnMenuPos(null); return }
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setColumnMenuPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - 200) })
                          setColumnMenuKey("participant")
                        }}
                        className={`ml-auto flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded transition-all ${columnMenuKey === "participant" ? "bg-[#ebebeb] text-[#262626] opacity-100" : "text-[#999] opacity-0 hover:bg-[#ebebeb] hover:text-[#262626] group-hover/col:opacity-100"}`}
                        tabIndex={0}
                        aria-label="Column options for Participant"
                      >
                        <ChevronDown className="h-[12px] w-[12px]" strokeWidth={2} />
                      </button>
                    </div>
                    {columnMenuKey === "participant" && columnMenuPos && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => { setColumnMenuKey(null); setColumnMenuPos(null) }} />
                        <div
                          className="fixed z-50 w-[200px] overflow-hidden rounded-lg border border-[#dcdcdc] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                          style={{ top: columnMenuPos.top, left: columnMenuPos.left }}
                        >
                          <button
                            onClick={() => { setSortKey("participant"); setSortDirection("asc"); setColumnMenuKey(null); setColumnMenuPos(null) }}
                            className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                            tabIndex={0}
                          >
                            <ArrowUp className="h-[15px] w-[15px] text-[#888]" strokeWidth={1.75} />
                            <span>Sort ascending</span>
                          </button>
                          <button
                            onClick={() => { setSortKey("participant"); setSortDirection("desc"); setColumnMenuKey(null); setColumnMenuPos(null) }}
                            className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                            tabIndex={0}
                          >
                            <ArrowDown className="h-[15px] w-[15px] text-[#888]" strokeWidth={1.75} />
                            <span>Sort descending</span>
                          </button>
                        </div>
                      </>
                    )}
                  </th>
                  {visibleColumns.map((col, i) => {
                    const ColIcon = col.icon
                    const isLast = i === visibleColumns.length - 1
                    const isFirst = i === 0
                    const isMenuOpen = columnMenuKey === col.key
                    return (
                      <th
                        key={col.key}
                        className={`group/col relative sticky top-0 z-20 h-[44px] overflow-hidden whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888] ${isLast ? "" : "border-r"}`}
                        style={{ width: getWidth(col.key, 180) }}
                      >
                        <div className="flex items-center gap-[6px]">
                          <ColIcon className="h-[13px] w-[13px] shrink-0 text-[#999]" strokeWidth={1.5} />
                          <span className="truncate">{col.label}</span>
                          <button
                            onClick={(e) => {
                              if (isMenuOpen) { setColumnMenuKey(null); setColumnMenuPos(null); return }
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              const dropdownWidth = 200
                              let left = rect.right - dropdownWidth
                              if (left < 8) left = 8
                              if (rect.right > window.innerWidth - 8) left = window.innerWidth - dropdownWidth - 8
                              setColumnMenuPos({ top: rect.bottom + 4, left })
                              setColumnMenuKey(col.key)
                            }}
                            className={`ml-auto flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded transition-all ${isMenuOpen ? "bg-[#ebebeb] text-[#262626] opacity-100" : "text-[#999] opacity-0 hover:bg-[#ebebeb] hover:text-[#262626] group-hover/col:opacity-100"}`}
                            tabIndex={0}
                            aria-label={`Column options for ${col.label}`}
                          >
                            <ChevronDown className="h-[12px] w-[12px]" strokeWidth={2} />
                          </button>
                        </div>
                        {isMenuOpen && columnMenuPos && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => { setColumnMenuKey(null); setColumnMenuPos(null) }} />
                            <div
                              className="fixed z-50 w-[200px] overflow-hidden rounded-lg border border-[#dcdcdc] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                              style={{ top: columnMenuPos.top, left: columnMenuPos.left }}
                            >
                              <button
                                onClick={() => { setSortKey(col.key); setSortDirection("asc"); setColumnMenuKey(null); setColumnMenuPos(null) }}
                                className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                                tabIndex={0}
                              >
                                <ArrowUp className="h-[15px] w-[15px] text-[#888]" strokeWidth={1.75} />
                                <span>Sort ascending</span>
                              </button>
                              <button
                                onClick={() => { setSortKey(col.key); setSortDirection("desc"); setColumnMenuKey(null); setColumnMenuPos(null) }}
                                className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                                tabIndex={0}
                              >
                                <ArrowDown className="h-[15px] w-[15px] text-[#888]" strokeWidth={1.75} />
                                <span>Sort descending</span>
                              </button>
                              <div className="my-[4px] border-t border-[#f0f0f0]" />
                              <button
                                onClick={() => handleMoveColumn(col.key, "left")}
                                disabled={isFirst}
                                className={`flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium transition-colors ${isFirst ? "text-[#bbb]" : "text-[#262626] hover:bg-[#f5f5f5]"}`}
                                tabIndex={0}
                              >
                                <ArrowLeft className={`h-[15px] w-[15px] ${isFirst ? "text-[#ccc]" : "text-[#888]"}`} strokeWidth={1.75} />
                                <span>Move left</span>
                              </button>
                              <button
                                onClick={() => handleMoveColumn(col.key, "right")}
                                disabled={isLast}
                                className={`flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium transition-colors ${isLast ? "text-[#bbb]" : "text-[#262626] hover:bg-[#f5f5f5]"}`}
                                tabIndex={0}
                              >
                                <ArrowRight className={`h-[15px] w-[15px] ${isLast ? "text-[#ccc]" : "text-[#888]"}`} strokeWidth={1.75} />
                                <span>Move right</span>
                              </button>
                              <div className="my-[4px] border-t border-[#f0f0f0]" />
                              <button
                                onClick={() => { handleToggleColumn(col.key); setColumnMenuKey(null); setColumnMenuPos(null) }}
                                className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                                tabIndex={0}
                              >
                                <EyeOff className="h-[15px] w-[15px] text-[#888]" strokeWidth={1.75} />
                                <span>Hide column</span>
                              </button>
                            </div>
                          </>
                        )}
                        <div
                          onMouseDown={(e) => handleColResize(col.key, e)}
                          className="absolute right-0 top-0 z-10 h-full w-[4px] cursor-col-resize opacity-0 transition-opacity hover:bg-[#2563EB]/30 hover:opacity-100 group-hover/col:opacity-100"
                        />
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="h-[200px] text-center text-[13px] font-medium text-[#bbb]">
                      No NDIS plans found
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((row) => {
                    const rowKey = `${row.clientId}-${row.plan.id}`
                    const isSelected = selectedRowKey === rowKey
                    const cellBase = `h-[44px] overflow-hidden whitespace-nowrap border-b border-r border-[#dcdcdc] px-[20px] ${isSelected ? "bg-[#eef4ff]" : "bg-[#fafafa] group-hover:bg-[#f5f5f5]"}`

                    return (
                      <tr
                        key={rowKey}
                        className="group cursor-pointer"
                        onClick={() => setSelectedRowKey(isSelected ? null : rowKey)}
                      >
                        <td className={`sticky left-0 z-10 ${cellBase}`}>
                          <div className="flex items-center gap-[10px]">
                            <EntityIcon text={row.clientIcon} size="sm" />
                            <span className="truncate text-[13px] font-medium text-[#262626]">{row.clientName}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/clients/${row.clientId}?tab=plan`) }}
                              className="ml-auto flex h-[22px] w-[22px] items-center justify-center rounded text-[#999] opacity-0 transition-opacity hover:bg-[#f0f0f0] hover:text-[#262626] group-hover:opacity-100"
                              aria-label={`Open ${row.clientName} plans`}
                              tabIndex={0}
                            >
                              <ArrowUpRight className="h-[13px] w-[13px]" strokeWidth={1.75} />
                            </button>
                          </div>
                        </td>
                        {visibleColumns.map((col) => renderCell(row, col.key, isSelected))}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-[#999]">
              {sortedRows.length} {sortedRows.length === 1 ? "plan" : "plans"}
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-auto bg-[#fafafa] px-[24px] py-[24px]">
            {sortedRows.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center">
                <span className="text-[13px] font-medium text-[#bbb]">No NDIS plans found</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-[20px]">
                {sortedRows.map((row) => {
                  const usedPct = Math.min(100, row.usagePct)
                  const remPct = 100 - usedPct
                  const sz = 120
                  const sw = 22
                  const r = (sz - sw) / 2
                  const circ = 2 * Math.PI * r
                  const usedArc = (usedPct / 100) * circ
                  const remArc = (remPct / 100) * circ
                  const totalRemaining = row.remaining

                  return (
                    <div
                      key={`${row.clientId}-${row.plan.id}`}
                      className="group cursor-pointer rounded-[8px] border border-[#e8e8e8] p-[20px] transition-colors hover:border-[#d0d0d0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                      onClick={() => router.push(`/clients/${row.clientId}?tab=plan`)}
                    >
                      <div className="flex items-center gap-[8px]">
                        <EntityIcon text={row.clientIcon} size="sm" />
                        <span className="truncate text-[13px] font-semibold text-[#262626]">{row.clientName}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/clients/${row.clientId}?tab=plan`) }}
                          className="ml-auto flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded text-[#999] opacity-0 transition-opacity hover:bg-[#f0f0f0] hover:text-[#262626] group-hover:opacity-100"
                          aria-label={`Open ${row.clientName} plans`}
                          tabIndex={0}
                        >
                          <ArrowUpRight className="h-[12px] w-[12px]" strokeWidth={1.75} />
                        </button>
                      </div>

                      <div className="mt-[16px] flex items-center gap-[20px]">
                        <div className="relative shrink-0">
                          <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} className="-rotate-90">
                            <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={sw} />
                            {remPct > 0 && (
                              <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke="#BFDBFE" strokeWidth={sw} strokeDasharray={`${remArc} ${circ - remArc}`} strokeDashoffset={-usedArc} strokeLinecap="butt" />
                            )}
                            {usedPct > 0 && (
                              <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke="#2563EB" strokeWidth={sw} strokeDasharray={`${usedArc} ${circ - usedArc}`} strokeDashoffset={0} strokeLinecap="butt" />
                            )}
                          </svg>
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[13px] font-bold text-[#262626]">${totalRemaining.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            <span className="text-[9px] font-medium text-[#888]">Remaining</span>
                          </div>
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
                          <div className="flex items-center gap-[6px]">
                            <span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#2563EB]" />
                            <span className="text-[12px] font-semibold text-[#262626]">${row.totalBudget.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            <span className="text-[11px] text-[#888]">Total</span>
                          </div>
                          <div className="flex items-center gap-[6px]">
                            <span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#2563EB]" />
                            <span className="text-[12px] font-semibold text-[#262626]">${row.totalUsed.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            <span className="text-[11px] text-[#888]">Used</span>
                          </div>
                          <div className="flex items-center gap-[6px]">
                            <span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#BFDBFE]" />
                            <span className="text-[12px] font-semibold text-[#262626]">{row.daysRemaining}</span>
                            <span className="text-[11px] text-[#888]">Days left</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-[#999]">
              {sortedRows.length} {sortedRows.length === 1 ? "plan" : "plans"}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
