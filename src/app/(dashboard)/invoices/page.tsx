"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from "react"
import {
  AlignLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  CircleDot,
  Clock,
  DollarSign,
  Download,
  Link2,
  ListFilter,
  Mail,
  Receipt,
  RefreshCw,
  SlidersHorizontal,
  Table2,
  User,
  X,
} from "lucide-react"
import { useInvoices } from "@/lib/hooks/use-invoices"
import { useSavedViews } from "@/lib/hooks/use-saved-views"
import { useXero } from "@/lib/hooks/use-xero"
import { useWorkspace } from "@/lib/workspace-context"
import { useToast } from "@/components/toast"
import type { Invoice } from "@/lib/types"
import { listViewBodyClass, listViewFilterBarClass } from "@/components/tab-active-indicator"
import { PageLoader, PageError } from "@/components/page-state"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { InvoicingNav } from "@/app/(dashboard)/invoicing/_components/invoicing-nav"
import { DisplaySection } from "@/app/(dashboard)/invoicing/_components/invoicing-helpers"
import { DisplayPopoverPanel, DisplayPopoverTrigger, countHiddenDisplayFilters } from "@/components/display-popover"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { matchesTableSearch } from "@/lib/table-search"
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

interface InvoicesSavedView {
  id: string
  name: string
  visibleColumnKeys: string[]
  displayParticipants: string[]
  displayEmails: string[]
  displayStatuses: string[]
  dateFilter: string[]
  participantFilter: string[]
  statusFilter: string[]
}

interface InvoiceColumnDef {
  key: string
  label: string
  width: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}

const invoiceColumnDefs: InvoiceColumnDef[] = [
  { key: "invoice", label: "Invoice", width: "140px", icon: Receipt },
  { key: "participant", label: "Participant", width: "minmax(180px,1.5fr)", icon: User },
  { key: "email", label: "Invoicing Email", width: "minmax(220px,1.7fr)", icon: Mail },
  { key: "issued", label: "Issued", width: "110px", icon: CalendarDays },
  { key: "sent", label: "Sent", width: "110px", icon: Clock },
  { key: "amount", label: "Total Cost", width: "110px", icon: DollarSign },
  { key: "status", label: "Status", width: "110px", icon: CircleDot },
  { key: "payment", label: "Payment", width: "110px", icon: DollarSign },
]

const defaultVisibleColumnKeys = invoiceColumnDefs.map((column) => column.key)

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value?: string): string {
  if (!value) return ""

  return new Date(value).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function getInvoiceStatusValue(invoice: Invoice): string {
  if (invoice.deliveryMethod === "ndia-portal") return "ndia-portal"
  return invoice.status
}

function getInvoiceStatusLabel(value: string | Invoice): string {
  if (typeof value !== "string" && value.kind === "credit-note") return "Credit note"
  const status = typeof value === "string" ? value : getInvoiceStatusValue(value)
  if (status === "ndia-portal") return "Portal claim"
  if (status === "paid") return "Paid"
  if (status === "overdue") return "Overdue"
  if (status === "void") return "Void"
  return "Sent"
}

function getInvoiceStatusClasses(invoice: Invoice): string {
  if (invoice.kind === "credit-note") return "bg-[#ede9fe] text-[#6d28d9]"
  if (invoice.status === "void") return "bg-[#eef2f7] text-[#475569] line-through"
  if (invoice.deliveryMethod === "ndia-portal") return "bg-[#dbeafe] text-[#1d4ed8]"
  if (invoice.status === "paid") return "bg-[#e7f5ec] text-[#1a7f43]"
  if (invoice.status === "overdue") return "bg-[#fee2e2] text-[#b91c1c]"
  return "bg-[#eef2f7] text-[#475569]"
}

function getInvoicePaymentLabel(invoice: Invoice): string {
  if (invoice.status === "paid") return "Paid"
  if (invoice.status === "overdue") return "Overdue"
  return "Unpaid"
}

function getInvoicePaymentClasses(invoice: Invoice): string {
  if (invoice.status === "paid") return "bg-[#e7f5ec] text-[#1a7f43]"
  if (invoice.status === "overdue") return "bg-[#fee2e2] text-[#b91c1c]"
  return "bg-[#fef3c7] text-[#b45309]"
}

function hasInvoicePayment(invoice: Invoice): boolean {
  return invoice.kind !== "credit-note" && invoice.status !== "void"
}

function getInvoiceActivityDate(invoice: Invoice): Date | null {
  const value = invoice.sentAt || invoice.createdAt || invoice.issueDate
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export default function InvoicesPage() {
  const { invoices, isLoading, fetchError, exportInvoiceToCsv, exportAllToCsv, voidInvoice, createCreditNote, refetch } = useInvoices()
  const { status: xeroStatus, connectUrl } = useXero()
  const { activeWorkspace } = useWorkspace()
  const { toast } = useToast()
  const [pushingInvoiceId, setPushingInvoiceId] = useState<string | null>(null)

  const handlePushToXero = useCallback(
    async (invoice: Invoice) => {
      if (!activeWorkspace || pushingInvoiceId) return
      setPushingInvoiceId(invoice.id)
      try {
        const response = await fetch("/api/xero/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: activeWorkspace.id,
            invoiceId: invoice.id,
            contactEmail: invoice.sentTo || undefined,
          }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Failed to push to Xero")
        toast("Invoice pushed to Xero", "success")
        refetch()
      } catch (error) {
        toast(error instanceof Error ? error.message : "Failed to push to Xero", "error")
      } finally {
        setPushingInvoiceId(null)
      }
    },
    [activeWorkspace, pushingInvoiceId, toast, refetch],
  )
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(defaultVisibleColumnKeys)
  const [displayParticipants, setDisplayParticipants] = useState<string[]>([])
  const [displayEmails, setDisplayEmails] = useState<string[]>([])
  const [displayStatuses, setDisplayStatuses] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState<string[]>([])
  const [participantFilter, setParticipantFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [pageSize, setPageSize] = useState(10)
  const [visibleCount, setVisibleCount] = useState(10)
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false)
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null)
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewContextMenu, setViewContextMenu] = useState<{ viewId: string; x: number; y: number } | null>(null)
  const [invoiceView, setInvoiceView] = useState<"list" | "batches">("list")
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())


  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  const filterPillRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const pageSizeButtonRef = useRef<HTMLButtonElement>(null)
  const displayButtonRef = useRef<HTMLButtonElement>(null)

  const sentInvoices = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.status !== "unsent" || invoice.kind === "credit-note")
      .sort((a, b) => {
        const aDate = getInvoiceActivityDate(a)?.getTime() || 0
        const bDate = getInvoiceActivityDate(b)?.getTime() || 0
        return bDate - aDate
      })
  }, [invoices])

  const resetViewState = useCallback(() => {
    setVisibleColumnKeys(defaultVisibleColumnKeys)
    setDisplayParticipants([])
    setDisplayEmails([])
    setDisplayStatuses([])
    setDateFilter([])
    setParticipantFilter([])
    setStatusFilter([])
  }, [])

  const applySavedView = useCallback((view: InvoicesSavedView) => {
    setVisibleColumnKeys(
      Array.isArray(view.visibleColumnKeys) && view.visibleColumnKeys.length > 0
        ? view.visibleColumnKeys
        : defaultVisibleColumnKeys
    )
    setDisplayParticipants(Array.isArray(view.displayParticipants) ? view.displayParticipants : [])
    setDisplayEmails(Array.isArray(view.displayEmails) ? view.displayEmails : [])
    setDisplayStatuses(Array.isArray(view.displayStatuses) ? view.displayStatuses : [])
    setDateFilter(Array.isArray(view.dateFilter) ? view.dateFilter : [])
    setParticipantFilter(Array.isArray(view.participantFilter) ? view.participantFilter : [])
    setStatusFilter(Array.isArray(view.statusFilter) ? view.statusFilter : [])
  }, [])

  const {
    savedViews,
    activeViewId,
    selectView,
    deleteView,
    syncActiveView,
  } = useSavedViews<InvoicesSavedView>({
    viewsStorageKey: "sent-invoices-views",
    activeViewStorageKey: "sent-invoices-active-view",
    buildView: ({ id, name }) => ({
      id,
      name,
      visibleColumnKeys,
      displayParticipants,
      displayEmails,
      displayStatuses,
      dateFilter,
      participantFilter,
      statusFilter,
    }),
    applyView: applySavedView,
    resetState: resetViewState,
    syncView: (view) => ({
      ...view,
      visibleColumnKeys,
      displayParticipants,
      displayEmails,
      displayStatuses,
      dateFilter,
      participantFilter,
      statusFilter,
    }),
    sanitizeView: (view) => ({
      ...view,
      visibleColumnKeys:
        Array.isArray(view.visibleColumnKeys) && view.visibleColumnKeys.length > 0
          ? view.visibleColumnKeys
          : defaultVisibleColumnKeys,
      displayParticipants: Array.isArray(view.displayParticipants) ? view.displayParticipants : [],
      displayEmails: Array.isArray(view.displayEmails) ? view.displayEmails : [],
      displayStatuses: Array.isArray(view.displayStatuses) ? view.displayStatuses : [],
      dateFilter: Array.isArray(view.dateFilter) ? view.dateFilter : [],
      participantFilter: Array.isArray(view.participantFilter) ? view.participantFilter : [],
      statusFilter: Array.isArray(view.statusFilter) ? view.statusFilter : [],
    }),
  })

  useEffect(() => {
    syncActiveView()
  }, [
    syncActiveView,
    visibleColumnKeys,
    displayParticipants,
    displayEmails,
    displayStatuses,
    dateFilter,
    participantFilter,
    statusFilter,
  ])

  useEffect(() => {
    setVisibleCount(pageSize)
  }, [pageSize, sentInvoices.length])

  useEffect(() => {
    if (!viewContextMenu) return

    function handleClose() {
      setViewContextMenu(null)
    }

    document.addEventListener("click", handleClose)
    return () => document.removeEventListener("click", handleClose)
  }, [viewContextMenu])

  const uniqueParticipants = useMemo(
    () => Array.from(new Set(sentInvoices.map((invoice) => invoice.clientName).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [sentInvoices]
  )

  const uniqueEmails = useMemo(
    () => Array.from(new Set(sentInvoices.map((invoice) => invoice.sentTo || "").filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [sentInvoices]
  )

  const uniqueStatuses = useMemo(
    () => Array.from(new Set(sentInvoices.map((invoice) => getInvoiceStatusValue(invoice)))).sort(),
    [sentInvoices]
  )

  const filteredInvoices = useMemo(() => {
    return sentInvoices.filter((invoice) => {
      const activityDate = getInvoiceActivityDate(invoice)

      if (participantFilter.length > 0 && !participantFilter.includes(invoice.clientName)) return false
      if (statusFilter.length > 0 && !statusFilter.includes(getInvoiceStatusValue(invoice))) return false
      if (displayParticipants.length > 0 && !displayParticipants.includes(invoice.clientName)) return false
      if (displayEmails.length > 0 && !displayEmails.includes(invoice.sentTo || "")) return false
      if (displayStatuses.length > 0 && !displayStatuses.includes(getInvoiceStatusValue(invoice))) return false
      if (dateFilter.length === 0) {
        return matchesTableSearch(
          searchQuery,
          invoice.clientName,
          invoice.invoiceNumber,
          invoice.sentTo,
          getInvoiceStatusValue(invoice)
        )
      }
      if (!activityDate) return false

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const invoiceDate = new Date(activityDate)
      invoiceDate.setHours(0, 0, 0, 0)
      const dayMs = 86400000

      return dateFilter.some((filterValue) => {
        if (filterValue === "today") return invoiceDate.getTime() === today.getTime()
        if (filterValue === "this-week") {
          const startOfWeek = new Date(today)
          const day = startOfWeek.getDay()
          const diff = day === 0 ? -6 : 1 - day
          startOfWeek.setDate(startOfWeek.getDate() + diff)
          startOfWeek.setHours(0, 0, 0, 0)
          const endOfWeek = new Date(startOfWeek)
          endOfWeek.setDate(endOfWeek.getDate() + 6)
          return invoiceDate >= startOfWeek && invoiceDate <= endOfWeek
        }
        if (filterValue === "this-month")
          return invoiceDate.getMonth() === today.getMonth() && invoiceDate.getFullYear() === today.getFullYear()
        if (filterValue === "older") return invoiceDate.getTime() < today.getTime() - 7 * dayMs
        return false
      }) && matchesTableSearch(
        searchQuery,
        invoice.clientName,
        invoice.invoiceNumber,
        invoice.sentTo,
        getInvoiceStatusValue(invoice)
      )
    })
  }, [
    dateFilter,
    displayEmails,
    displayParticipants,
    displayStatuses,
    participantFilter,
    sentInvoices,
    statusFilter,
    searchQuery,
  ])

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      const aDate = getInvoiceActivityDate(a)?.getTime() || 0
      const bDate = getInvoiceActivityDate(b)?.getTime() || 0
      return bDate - aDate
    })
  }, [filteredInvoices])

  const hasDisplayFilters = displayParticipants.length > 0 || displayEmails.length > 0 || displayStatuses.length > 0
  const hiddenDisplayCount =
    countHiddenDisplayFilters(uniqueParticipants, displayParticipants)
    + countHiddenDisplayFilters(uniqueEmails, displayEmails)
    + countHiddenDisplayFilters(uniqueStatuses, displayStatuses)
  const visibleColumns = invoiceColumnDefs.filter((column) =>
    (Array.isArray(visibleColumnKeys) ? visibleColumnKeys : defaultVisibleColumnKeys).includes(column.key)
  )

  // "Batches" view: the same invoices grouped by the day they were issued, so a
  // bulk run can be audited as one unit. This replaces the old Batches tab.
  const invoiceBatches = useMemo(() => {
    const byDate = new Map<string, { date: string; invoices: Invoice[]; total: number; sentCount: number }>()
    for (const invoice of sortedInvoices) {
      const date = invoice.issueDate || invoice.createdAt?.slice(0, 10) || "—"
      const existing = byDate.get(date)
      if (existing) {
        existing.invoices.push(invoice)
        existing.total += invoice.total
        if (invoice.status !== "unsent") existing.sentCount += 1
      } else {
        byDate.set(date, { date, invoices: [invoice], total: invoice.total, sentCount: invoice.status !== "unsent" ? 1 : 0 })
      }
    }
    return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date))
  }, [sortedInvoices])

  const toggleBatch = (date: string) =>
    setExpandedBatches((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })

  const handleToggleDisplayItem = (items: string[], setItems: (value: string[]) => void, value: string) => {
    setItems(items.includes(value) ? items.filter((item) => item !== value) : [...items, value])
  }




  const renderInvoiceRow = (invoice: Invoice) => {
    const cols = visibleColumns
    return (
      <tr
        key={invoice.id}
        className="group cursor-pointer transition-colors hover:bg-folk-hover"
        onClick={() => setSelectedInvoiceId(invoice.id)}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") setSelectedInvoiceId(invoice.id) }}
      >
        {cols.map((column, colIndex) => {
          const isLast = colIndex === cols.length - 1
          const baseTd = `${isLast ? TABLE_PANEL_CELL_LAST : TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT} overflow-hidden group-hover:bg-[#fafafa]`

          if (column.key === "invoice") {
            return (
              <td key={column.key} className={`sticky left-0 z-10 ${TABLE_PANEL_CELL_STICKY_EDGE} ${TABLE_PANEL_TEXT} overflow-hidden group-hover:bg-[#fafafa]`}>
                {invoice.invoiceNumber}
              </td>
            )
          }
          if (column.key === "participant") {
            return <td key={column.key} className={baseTd}><span className="truncate">{invoice.clientName}</span></td>
          }
          if (column.key === "email") {
            return (
              <td key={column.key} className={`${baseTd} !text-folk-secondary`}>
                {invoice.deliveryMethod === "ndia-portal"
                  ? (invoice.sentTo || "NDIA myplace provider portal")
                  : (invoice.sentTo || <span className="text-[#ccc]">—</span>)}
              </td>
            )
          }
          if (column.key === "issued") {
            return (
              <td key={column.key} className={`${baseTd} !text-folk-secondary`}>
                {formatDate(invoice.issueDate) || <span className="text-[#ccc]">—</span>}
              </td>
            )
          }
          if (column.key === "sent") {
            return (
              <td key={column.key} className={`${baseTd} !text-folk-secondary`}>
                {formatDate(invoice.sentAt) || <span className="text-[#ccc]">—</span>}
              </td>
            )
          }
          if (column.key === "amount") {
            return (
              <td key={column.key} className={baseTd}>
                <span className="inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] bg-green-50 px-[10px] text-[12px] font-medium text-green-700">{formatCurrency(invoice.total)}</span>
              </td>
            )
          }
          if (column.key === "status") {
            return (
              <td key={column.key} className={baseTd}>
                <span className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-[8px] text-[11px] font-medium ${getInvoiceStatusClasses(invoice)}`}>
                  {getInvoiceStatusLabel(invoice)}
                </span>
              </td>
            )
          }
          if (column.key === "payment") {
            return (
              <td key={column.key} className={baseTd}>
                {hasInvoicePayment(invoice) ? (
                  <span className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-[8px] text-[11px] font-medium ${getInvoicePaymentClasses(invoice)}`}>
                    {getInvoicePaymentLabel(invoice)}
                  </span>
                ) : (
                  <span className="text-folk-secondary">—</span>
                )}
              </td>
            )
          }
          return null
        })}
      </tr>
    )
  }

  if (isLoading) return <PageLoader label="Loading invoices…" />
  if (fetchError) return <PageError message="Failed to load invoices" onRetry={refetch} />

  return (
    <div className="flex h-full flex-col">
      <InvoicingNav
        suffix={
          savedViews.length > 0 ? (
            <>
              {savedViews.map((view) => (
                <ProfileTabButton
                  key={view.id}
                  variant="profile"
                  showIcon
                  isActive={activeViewId === view.id}
                  onClick={() => selectView(view)}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    setViewContextMenu({ viewId: view.id, x: event.clientX, y: event.clientY })
                  }}
                  icon={Table2}
                  label={view.name}
                />
              ))}
            </>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-[6px]">
            {xeroStatus?.connected ? (
              <span className="flex items-center gap-[5px] rounded-[6px] border border-[#cfe8da] bg-[#e7f5ec] px-[8px] py-[4px] text-[12px] font-medium text-[#1a7f43]">
                <CircleDot className="h-[12px] w-[12px]" strokeWidth={2} />
                Xero connected
              </span>
            ) : (
              <a
                href={connectUrl}
                className="flex items-center gap-[5px] rounded-[6px] border border-folk-border px-[8px] py-[4px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                tabIndex={0}
              >
                <Link2 className="h-[12px] w-[12px]" strokeWidth={1.75} />
                Connect Xero
              </a>
            )}
            <button
              type="button"
              onClick={() => exportAllToCsv(sortedInvoices)}
              disabled={sortedInvoices.length === 0}
              className="flex items-center gap-[5px] rounded-[6px] border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover disabled:cursor-not-allowed disabled:opacity-40"
              tabIndex={0}
              aria-label="Export invoices to CSV"
            >
              <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>Export</span>
            </button>
          </div>
        }
      />

      <div className={listViewFilterBarClass("flex-nowrap")}>
        <div className="flex items-center gap-[2px] rounded-[6px] border border-folk-border p-[2px]">
          {([
            { key: "list" as const, label: "List", icon: Table2 },
            { key: "batches" as const, label: "Batches", icon: AlignLeft },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setInvoiceView(key)}
              className={`flex items-center gap-[5px] rounded-[6px] px-[8px] py-[3px] text-[12px] font-medium transition-colors ${
                invoiceView === key ? "bg-folk-hover text-folk-text" : "text-folk-secondary hover:text-folk-text"
              }`}
              tabIndex={0}
            >
              <Icon className="h-[12px] w-[12px]" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <button
            type="button"
            ref={filterButtonRef}
            onClick={() => {
              setIsFilterMenuOpen((current) => !current)
              setActiveFilterDropdown(null)
            }}
            className="flex items-center gap-[6px] folk-pill-btn border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
            tabIndex={0}
          >
            <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Filter</span>
          </button>
          {isFilterMenuOpen && (
            <>
              <div className="fixed inset-0 z-[55]" onClick={() => setIsFilterMenuOpen(false)} />
              <div className="absolute left-0 top-full z-[60] mt-[4px] w-[180px] rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-folk">
                <p className="px-[16px] py-[6px] text-[11px] font-medium text-folk-secondary">Filter by</p>
                {[
                  { key: "date", label: "Date", icon: CalendarDays },
                  { key: "participant", label: "Participant", icon: User },
                  { key: "status", label: "Status", icon: Receipt },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveFilterDropdown(key)
                      setIsFilterMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                    tabIndex={0}
                  >
                    <Icon className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {dateFilter.length > 0 && (
          <FilterPill
            icon={CalendarDays}
            label="Date"
            count={dateFilter.length}
            onOpen={() => setActiveFilterDropdown(activeFilterDropdown === "date" ? null : "date")}
            onClear={() => setDateFilter([])}
            buttonRef={(element) => {
              filterPillRefs.current.date = element
            }}
          />
        )}
        {participantFilter.length > 0 && (
          <FilterPill
            icon={User}
            label="Participant"
            count={participantFilter.length}
            onOpen={() => setActiveFilterDropdown(activeFilterDropdown === "participant" ? null : "participant")}
            onClear={() => setParticipantFilter([])}
            buttonRef={(element) => {
              filterPillRefs.current.participant = element
            }}
          />
        )}
        {statusFilter.length > 0 && (
          <FilterPill
            icon={Receipt}
            label="Status"
            count={statusFilter.length}
            onOpen={() => setActiveFilterDropdown(activeFilterDropdown === "status" ? null : "status")}
            onClear={() => setStatusFilter([])}
            buttonRef={(element) => {
              filterPillRefs.current.status = element
            }}
          />
        )}

        <div className="relative ml-auto flex shrink-0 items-center gap-[8px]">
          <ExpandableTableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search invoices…"
            ariaLabel="Search invoices"
          />
          <div className="relative">
          <button
            type="button"
            ref={pageSizeButtonRef}
            onClick={() => setIsPageSizeOpen((current) => !current)}
            className="folk-pill-btn flex items-center gap-[5px] border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
            tabIndex={0}
          >
            <span>{pageSize} per page</span>
            <ChevronDown className="h-[11px] w-[11px] text-folk-secondary" strokeWidth={1.5} />
          </button>
          {isPageSizeOpen && (
            <>
              <div className="fixed inset-0 z-[55]" onClick={() => setIsPageSizeOpen(false)} />
              <div className="absolute right-0 top-full z-[60] mt-[4px] w-[120px] rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-folk">
                {[10, 20, 50, 100].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size)
                      setVisibleCount(size)
                      setIsPageSizeOpen(false)
                    }}
                    className={`flex w-full items-center px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-folk-hover ${pageSize === size ? "bg-folk-hover text-folk-text" : "text-folk-text"}`}
                    tabIndex={0}
                  >
                    {size} per page
                  </button>
                ))}
              </div>
            </>
          )}
          </div>

          <DisplayPopoverTrigger
            hiddenCount={hiddenDisplayCount}
            isOpen={isDisplayOpen}
            onClick={() => setIsDisplayOpen((current) => !current)}
            buttonRef={displayButtonRef}
          />

          <DisplayPopoverPanel
            isOpen={isDisplayOpen}
            onClose={() => setIsDisplayOpen(false)}
            buttonRef={displayButtonRef}
            widthClassName="w-[280px]"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <DisplaySection
                title="Participants"
                items={uniqueParticipants}
                activeItems={displayParticipants}
                setActiveItems={setDisplayParticipants}
              />
              <DisplaySection
                title="Emails"
                items={uniqueEmails}
                activeItems={displayEmails}
                setActiveItems={setDisplayEmails}
              />
              <DisplaySection
                title="Statuses"
                items={uniqueStatuses}
                activeItems={displayStatuses}
                setActiveItems={setDisplayStatuses}
                formatLabel={getInvoiceStatusLabel}
              />
              </div>

            <div className="shrink-0 border-t border-folk-border-subtle px-[12px] py-[10px]">
              <button
                type="button"
                onClick={() => {
                  setDisplayParticipants([])
                  setDisplayEmails([])
                  setDisplayStatuses([])
                }}
                className="text-[13px] font-normal text-folk-placeholder transition-colors hover:text-folk-text"
                tabIndex={0}
              >
                Reset
              </button>
            </div>
            </div>
          </DisplayPopoverPanel>
        </div>
      </div>

      {activeFilterDropdown && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setActiveFilterDropdown(null)} />
          {(() => {
            const anchor = filterPillRefs.current[activeFilterDropdown] || filterButtonRef.current
            const rect = anchor?.getBoundingClientRect()
            if (!rect) return null

            const dropdownStyle = { top: rect.bottom + 4, left: rect.left, minWidth: 220 }

            if (activeFilterDropdown === "date") {
              return (
                <MultiSelectDropdown
                  title="Filter by date"
                  items={[
                    { value: "today", label: "Today" },
                    { value: "this-week", label: "This week" },
                    { value: "this-month", label: "This month" },
                    { value: "older", label: "Older" },
                  ]}
                  selectedValues={dateFilter}
                  onToggle={(value) => setDateFilter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}
                  onBack={() => {
                    setActiveFilterDropdown(null)
                    setIsFilterMenuOpen(true)
                  }}
                  onClear={() => {
                    setDateFilter([])
                    setActiveFilterDropdown(null)
                  }}
                  style={dropdownStyle}
                />
              )
            }

            if (activeFilterDropdown === "participant") {
              return (
                <MultiSelectDropdown
                  title="Filter by participant"
                  items={uniqueParticipants.map((value) => ({ value, label: value }))}
                  selectedValues={participantFilter}
                  onToggle={(value) => setParticipantFilter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}
                  onBack={() => {
                    setActiveFilterDropdown(null)
                    setIsFilterMenuOpen(true)
                  }}
                  onClear={() => {
                    setParticipantFilter([])
                    setActiveFilterDropdown(null)
                  }}
                  emptyLabel="No participants"
                  style={dropdownStyle}
                />
              )
            }

            return (
              <MultiSelectDropdown
                title="Filter by status"
                items={uniqueStatuses.map((value) => ({ value, label: getInvoiceStatusLabel(value) }))}
                selectedValues={statusFilter}
                onToggle={(value) => setStatusFilter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}
                onBack={() => {
                  setActiveFilterDropdown(null)
                  setIsFilterMenuOpen(true)
                }}
                onClear={() => {
                  setStatusFilter([])
                  setActiveFilterDropdown(null)
                }}
                emptyLabel="No statuses"
                style={dropdownStyle}
              />
            )
          })()}
        </>
      )}

      <div className={listViewBodyClass()}>
        {invoiceView === "batches" ? (
          <div className="bg-folk-page p-[16px]">
            {invoiceBatches.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col gap-[12px]">
                {invoiceBatches.map((batch) => {
                  const isOpen = expandedBatches.has(batch.date)
                  return (
                    <div key={batch.date} className="overflow-hidden rounded-[6px] border border-folk-border bg-white">
                      <button
                        type="button"
                        onClick={() => toggleBatch(batch.date)}
                        className="flex w-full items-center gap-[10px] px-[14px] py-[11px] text-left transition-colors hover:bg-folk-hover"
                        tabIndex={0}
                      >
                        <ChevronDown
                          className={`h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform ${isOpen ? "" : "-rotate-90"}`}
                          strokeWidth={1.75}
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="text-[13px] font-semibold text-folk-text">{formatDate(batch.date) || batch.date}</span>
                          <span className="text-[11px] text-folk-secondary">
                            {batch.invoices.length} {batch.invoices.length === 1 ? "invoice" : "invoices"} · {batch.sentCount} sent
                          </span>
                        </div>
                        <span className="shrink-0 text-[13px] font-semibold text-folk-text">{formatCurrency(batch.total)}</span>
                      </button>
                      {isOpen && (
                        <div className="overflow-x-auto border-t border-folk-border-subtle">
                          <table className={TABLE_FULL}>
                            <tbody>{batch.invoices.map(renderInvoiceRow)}</tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            <table className={TABLE_FULL}>
              <thead>
                <tr>
                  {visibleColumns.map((column, colIndex) => {
                    const ColIcon = column.icon
                    const isLast = colIndex === visibleColumns.length - 1
                    const isFirst = colIndex === 0
                    const headerClass = isFirst
                      ? TABLE_PANEL_HEADER_STICKY_EDGE
                      : isLast
                        ? TABLE_PANEL_HEADER_STICKY_LAST
                        : TABLE_PANEL_HEADER_STICKY
                    return (
                      <th key={column.key} className={headerClass}>
                        <div className="flex items-center gap-[6px]">
                          <ColIcon className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                          <span>{column.label}</span>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedInvoices.slice(0, visibleCount).map(renderInvoiceRow)}
              </tbody>
            </table>

            {sortedInvoices.length === 0 && (
              <EmptyState />
            )}

            {sortedInvoices.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + pageSize)}
                className="flex w-full items-center justify-center gap-[6px] border-b border-folk-border-subtle py-[10px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-page hover:text-folk-text"
                tabIndex={0}
              >
                Show more ({sortedInvoices.length - visibleCount} remaining)
              </button>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
        <span className="text-[12px] font-medium text-folk-secondary">
          {sortedInvoices.length} {sortedInvoices.length === 1 ? "invoice" : "invoices"} sent
        </span>
      </div>

      {viewContextMenu && (
        <>
          <div className="fixed inset-0 z-[69]" onClick={() => setViewContextMenu(null)} />
          <div
            className="fixed z-[70] min-w-[160px] rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-[0_6px_20px_rgba(0,0,0,0.12)]"
            style={{ left: viewContextMenu.x, top: viewContextMenu.y }}
          >
            <button
              type="button"
              onClick={() => {
                deleteView(viewContextMenu.viewId)
                setViewContextMenu(null)
              }}
              className="flex w-full items-center px-[14px] py-[8px] text-left text-[13px] font-medium text-[#cf5b5b] transition-colors hover:bg-[#faf5f5]"
            >
              Delete view
            </button>
          </div>
        </>
      )}




      {selectedInvoiceId && (() => {
        const invoice = sentInvoices.find((i) => i.id === selectedInvoiceId)
        if (!invoice) return null
        const deliveryLabel = invoice.deliveryMethod === "ndia-portal" ? "NDIA portal claim"
          : invoice.deliveryMethod === "plan-manager-email" ? "Plan manager email"
          : invoice.deliveryMethod === "participant-email" ? "Participant email"
          : "Email"
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
            <div className="absolute inset-0 bg-black/20" onClick={() => setSelectedInvoiceId(null)} />
            <div className="relative z-10 flex h-[680px] max-h-[calc(100vh-32px)] w-[960px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[20px] border border-[#d9d9d9] bg-folk-surface shadow-[0_12px_40px_rgba(0,0,0,0.12)] max-md:h-full max-md:max-h-full max-md:w-full max-md:max-w-full max-md:rounded-[6px]">
              <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex min-h-0 flex-col px-[28px] py-[22px]">
                  <div className="flex items-center gap-[6px] text-[11px] font-medium uppercase tracking-[0.03em] text-folk-placeholder">
                    <Receipt className="h-[12px] w-[12px]" strokeWidth={1.5} />
                    <span>Invoice</span>
                  </div>

                  <div className="mt-[14px] rounded-[6px] bg-folk-page px-[12px] py-[10px]">
                    <div className="flex items-center gap-[10px]">
                      <span className="text-[18px] font-semibold text-folk-text">{invoice.invoiceNumber}</span>
                      <span className={`inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] px-[10px] text-[12px] font-medium ${getInvoiceStatusClasses(invoice)}`}>
                        {getInvoiceStatusLabel(invoice)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-[14px] flex-1 overflow-y-auto text-[14px] leading-[1.6] text-[#4b4b4b]">
                    <div className="rounded-[6px] border border-folk-border">
                      <div className="grid grid-cols-[1fr_80px_80px_90px] border-b border-folk-border px-[12px] py-[8px]">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-folk-secondary">Item</span>
                        <span className="text-right text-[11px] font-medium uppercase tracking-wide text-folk-secondary">Qty</span>
                        <span className="text-right text-[11px] font-medium uppercase tracking-wide text-folk-secondary">Rate</span>
                        <span className="text-right text-[11px] font-medium uppercase tracking-wide text-folk-secondary">Amount</span>
                      </div>
                      {invoice.lineItems.map((item) => (
                        <div key={item.id} className="grid grid-cols-[1fr_80px_80px_90px] border-b border-folk-border-subtle px-[12px] py-[8px] last:border-b-0">
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-medium text-folk-text">{item.description || item.chargeName}</div>
                            <div className="text-[11px] text-folk-secondary">{item.chargeItemNumber}</div>
                          </div>
                          <div className="text-right text-[13px] text-folk-secondary">{item.quantity.toFixed(2)}</div>
                          <div className="text-right text-[13px] text-folk-secondary">{formatCurrency(item.rate)}</div>
                          <div className="text-right text-[13px] font-medium text-folk-text">{formatCurrency(item.amount)}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-[12px] flex flex-col items-end gap-[4px]">
                      <div className="flex w-[200px] items-center justify-between text-[13px]">
                        <span className="text-folk-secondary">Subtotal</span>
                        <span className="text-folk-text">{formatCurrency(invoice.subtotal)}</span>
                      </div>
                      <div className="flex w-[200px] items-center justify-between text-[13px]">
                        <span className="text-folk-secondary">GST</span>
                        <span className="text-folk-text">{formatCurrency(invoice.gst)}</span>
                      </div>
                      <div className="mt-[4px] flex w-[200px] items-center justify-between border-t border-folk-border pt-[6px] text-[14px] font-semibold">
                        <span className="text-folk-text">Total</span>
                        <span className="text-[#16a34a]">{formatCurrency(invoice.total)}</span>
                      </div>
                    </div>

                    {invoice.notes && (
                      <div className="mt-[16px] rounded-[6px] bg-folk-page px-[12px] py-[10px]">
                        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-folk-placeholder">Notes</div>
                        <p className="mt-[4px] text-[13px] leading-[1.5] text-[#4b4b4b]">{invoice.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-[16px] flex items-center gap-[8px] border-t border-[#f1f1f1] pt-[14px]">
                    <button
                      type="button"
                      onClick={() => exportInvoiceToCsv(invoice)}
                      className="flex items-center gap-[5px] rounded-[6px] border border-folk-border bg-folk-surface px-[10px] py-[5px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                      tabIndex={0}
                      aria-label="Export invoice to CSV"
                    >
                      <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
                      Export
                    </button>
                    {xeroStatus?.connected && invoice.kind !== "credit-note" && invoice.status !== "void" && (
                      <button
                        type="button"
                        onClick={() => handlePushToXero(invoice)}
                        disabled={pushingInvoiceId === invoice.id}
                        className="flex items-center gap-[5px] rounded-[6px] border border-folk-border bg-folk-surface px-[10px] py-[5px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover disabled:opacity-50"
                        tabIndex={0}
                        aria-label="Push invoice to Xero"
                      >
                        <RefreshCw className={`h-[13px] w-[13px] ${pushingInvoiceId === invoice.id ? "animate-spin" : ""}`} strokeWidth={1.5} />
                        {pushingInvoiceId === invoice.id ? "Pushing…" : "Push to Xero"}
                      </button>
                    )}
                    {invoice.kind !== "credit-note" && invoice.status !== "void" && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            const creditNote = await createCreditNote(invoice)
                            if (creditNote) setSelectedInvoiceId(creditNote.id)
                          }}
                          className="flex items-center gap-[5px] rounded-[6px] border border-folk-border bg-folk-surface px-[10px] py-[5px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                          tabIndex={0}
                          aria-label="Issue credit note"
                        >
                          Issue credit note
                        </button>
                        <button
                          type="button"
                          onClick={() => voidInvoice(invoice.id)}
                          className="flex items-center gap-[5px] rounded-[6px] border border-[#e7caca] bg-folk-surface px-[10px] py-[5px] text-[12px] font-medium text-[#cf5b5b] transition-colors hover:bg-[#faf5f5]"
                          tabIndex={0}
                          aria-label="Void invoice"
                        >
                          Void
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedInvoiceId(null)}
                      className="ml-auto flex items-center gap-[5px] rounded-[6px] border border-folk-border bg-folk-surface px-[10px] py-[5px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                      tabIndex={0}
                    >
                      Done
                    </button>
                  </div>
                </div>

                <div className="flex min-h-0 flex-col border-t border-folk-border px-[20px] py-[18px] md:border-l md:border-t-0">
                  <div className="flex justify-end gap-[4px]">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoiceId(null)}
                      className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
                      tabIndex={0}
                      aria-label="Close"
                    >
                      <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
                    </button>
                  </div>

                  <div className="mt-[18px] flex flex-col gap-[14px] overflow-y-auto">
                    <div className="space-y-[10px]">
                      <div className="px-[8px] text-[11px] font-semibold uppercase tracking-[0.08em] text-folk-placeholder">
                        Invoice details
                      </div>
                      <DetailRow label="Participant" value={invoice.clientName} />
                      <DetailRow label="Status" value={getInvoiceStatusLabel(invoice)} />
                      <DetailRow label="Delivery" value={deliveryLabel} />
                    </div>

                    <div className="border-t border-[#d9d9d9] pt-[14px]">
                      <div className="space-y-[10px]">
                        <div className="px-[8px] text-[11px] font-semibold uppercase tracking-[0.08em] text-folk-placeholder">
                          Dates
                        </div>
                        <DetailRow label="Issued" value={formatDate(invoice.issueDate) || "—"} />
                        <DetailRow label="Due" value={formatDate(invoice.dueDate) || "—"} />
                        <DetailRow label="Sent" value={formatDate(invoice.sentAt) || "—"} />
                        {invoice.paidAt && <DetailRow label="Paid" value={formatDate(invoice.paidAt)} />}
                      </div>
                    </div>

                    <div className="border-t border-[#d9d9d9] pt-[14px]">
                      <div className="space-y-[10px]">
                        <div className="px-[8px] text-[11px] font-semibold uppercase tracking-[0.08em] text-folk-placeholder">
                          Recipient
                        </div>
                        <DetailRow label="Sent to" value={invoice.sentTo || "—"} />
                        <DetailRow label="Amount" value={formatCurrency(invoice.total)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function FilterPill({
  icon: Icon,
  label,
  count,
  onOpen,
  onClear,
  buttonRef,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  count: number
  onOpen: () => void
  onClear: () => void
  buttonRef: (element: HTMLButtonElement | null) => void
}) {
  return (
    <div className="flex items-center gap-[6px] rounded-[6px] border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text">
      <Icon className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
      <button ref={buttonRef} onClick={onOpen} className="hover:underline" tabIndex={0}>
        {label}
      </button>
      <span className="text-folk-secondary">is</span>
      <span>{count} {count === 1 ? "value" : "values"}</span>
      <button onClick={onClear} className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:text-folk-text" tabIndex={0} aria-label={`Clear ${label.toLowerCase()} filter`}>
        <X className="h-[12px] w-[12px]" strokeWidth={1.5} />
      </button>
    </div>
  )
}

function MultiSelectDropdown({
  title,
  items,
  selectedValues,
  onToggle,
  onBack,
  onClear,
  emptyLabel = "No options",
  style,
}: {
  title: string
  items: Array<{ value: string; label: string }>
  selectedValues: string[]
  onToggle: (value: string) => void
  onBack: () => void
  onClear: () => void
  emptyLabel?: string
  style: CSSProperties
}) {
  return (
    <div className="fixed z-[60] max-h-[280px] overflow-y-auto rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-folk" style={style}>
      <button onClick={onBack} className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-folk-secondary transition-colors hover:text-folk-text" tabIndex={0}>
        <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
        <span>Back</span>
      </button>
      <p className="px-[16px] py-[4px] text-[11px] font-medium text-folk-secondary">{title}</p>
      {items.map((item) => {
        const isActive = selectedValues.includes(item.value)
        return (
          <button
            key={item.value}
            onClick={() => onToggle(item.value)}
            className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-folk-hover ${isActive ? "bg-folk-hover" : ""}`}
            tabIndex={0}
          >
            <div className={`flex h-[16px] w-[16px] items-center justify-center rounded-[4px] border border-folk-text bg-white`}>
              {isActive && <span className="text-[10px] leading-none text-folk-text">✓</span>}
            </div>
            <span className="text-folk-text">{item.label}</span>
          </button>
        )
      })}
      {items.length === 0 && <p className="px-[16px] py-[8px] text-[13px] text-folk-secondary">{emptyLabel}</p>}
      <div className="border-t border-folk-border-subtle px-[8px] py-[4px]">
        <button onClick={onClear} className="w-full rounded-[6px] px-[8px] py-[6px] text-left text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text" tabIndex={0}>
          Clear
        </button>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-center">
      <span className="text-[13px] font-medium text-folk-secondary">{label}</span>
      <span className={`text-[13px] font-medium ${value === "—" ? "text-[#ccc]" : "text-folk-text"}`}>{value}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-[24px] py-[56px] text-center">
      <div className="rounded-full bg-folk-hover p-[12px]">
        <Receipt className="h-[20px] w-[20px] text-folk-secondary" strokeWidth={1.5} />
      </div>
      <h3 className="mt-[14px] text-[15px] font-semibold text-folk-text">No sent invoices yet</h3>
      <p className="mt-[6px] max-w-[320px] text-[13px] text-folk-secondary">
        Invoices that have been confirmed and emailed will appear here automatically.
      </p>
    </div>
  )
}
