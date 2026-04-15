"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from "react"
import Link from "next/link"
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ListFilter,
  Receipt,
  SlidersHorizontal,
  Table2,
  User,
  X,
} from "lucide-react"
import { useInvoices } from "@/lib/hooks/use-invoices"
import { useSavedViews } from "@/lib/hooks/use-saved-views"
import type { Invoice, InvoiceStatus } from "@/lib/types"

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
}

const invoiceColumnDefs: InvoiceColumnDef[] = [
  { key: "invoice", label: "Invoice", width: "140px" },
  { key: "participant", label: "Participant", width: "minmax(180px,1.5fr)" },
  { key: "email", label: "Invoicing Email", width: "minmax(220px,1.7fr)" },
  { key: "issued", label: "Issued", width: "110px" },
  { key: "sent", label: "Sent", width: "110px" },
  { key: "amount", label: "Total Cost", width: "110px" },
  { key: "status", label: "Status", width: "110px" },
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
  const status = typeof value === "string" ? value : getInvoiceStatusValue(value)
  if (status === "ndia-portal") return "Portal claim"
  if (status === "paid") return "Paid"
  if (status === "overdue") return "Overdue"
  return "Sent"
}

function getInvoiceStatusClasses(invoice: Invoice): string {
  if (invoice.deliveryMethod === "ndia-portal") return "border-[#d7e6ff] bg-[#eef5ff] text-[#2563eb]"
  if (invoice.status === "paid") return "border-[#d7eadf] bg-[#f3faf6] text-[#286847]"
  if (invoice.status === "overdue") return "border-[#f0d4d4] bg-[#fff7f7] text-[#a54848]"
  return "border-[#dcdcdc] bg-[#f7f7f7] text-[#262626]"
}

function getInvoiceActivityDate(invoice: Invoice): Date | null {
  const value = invoice.sentAt || invoice.createdAt || invoice.issueDate
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export default function InvoicesPage() {
  const { invoices, updateInvoiceStatus } = useInvoices()
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
  const [viewContextMenu, setViewContextMenu] = useState<{ viewId: string; x: number; y: number } | null>(null)
  const [statusMenu, setStatusMenu] = useState<{ invoiceId: string; x: number; y: number } | null>(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  const filterPillRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const pageSizeButtonRef = useRef<HTMLButtonElement>(null)
  const displayButtonRef = useRef<HTMLButtonElement>(null)

  const sentInvoices = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.status !== "unsent")
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
    setVisibleColumnKeys(view.visibleColumnKeys)
    setDisplayParticipants(view.displayParticipants)
    setDisplayEmails(view.displayEmails)
    setDisplayStatuses(view.displayStatuses)
    setDateFilter(view.dateFilter)
    setParticipantFilter(view.participantFilter)
    setStatusFilter(view.statusFilter)
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
      if (dateFilter.length === 0) return true
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
      })
    })
  }, [
    dateFilter,
    displayEmails,
    displayParticipants,
    displayStatuses,
    participantFilter,
    sentInvoices,
    statusFilter,
  ])

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      const aDate = getInvoiceActivityDate(a)?.getTime() || 0
      const bDate = getInvoiceActivityDate(b)?.getTime() || 0
      return bDate - aDate
    })
  }, [filteredInvoices])

  const hasDisplayFilters = displayParticipants.length > 0 || displayEmails.length > 0 || displayStatuses.length > 0
  const isColumnVisible = (key: string) => visibleColumnKeys.includes(key)
  const visibleColumns = invoiceColumnDefs.filter((column) => visibleColumnKeys.includes(column.key))
  const gridTemplateColumns = visibleColumns.map((column) => column.width).join(" ")

  const handleToggleDisplayItem = (items: string[], setItems: (value: string[]) => void, value: string) => {
    setItems(items.includes(value) ? items.filter((item) => item !== value) : [...items, value])
  }

  const handleStatusChange = (invoiceId: string, newStatus: InvoiceStatus) => {
    updateInvoiceStatus(invoiceId, newStatus)
    setStatusMenu(null)
  }

  const renderInvoiceRow = (invoice: Invoice) => {
    return (
      <div
        key={invoice.id}
        className="grid cursor-pointer items-center border-b border-[#f0f0f0] px-[24px] transition-colors hover:bg-[#fafafa]"
        style={{ gridTemplateColumns: gridTemplateColumns }}
        onClick={() => setSelectedInvoiceId(invoice.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") setSelectedInvoiceId(invoice.id) }}
      >
        {isColumnVisible("invoice") && (
          <div className="whitespace-nowrap py-[12px] text-[13px] font-medium text-[#262626]">
            {invoice.invoiceNumber}
          </div>
        )}
        {isColumnVisible("participant") && (
          <div className="min-w-0 whitespace-nowrap py-[12px]">
            <span className="inline-flex max-w-full items-center rounded-[4px] border border-[#e2e2e2] bg-[#f7f7f7] px-[10px] py-[4px] text-[12px] font-medium text-[#262626] whitespace-nowrap">
              <span className="truncate">{invoice.clientName}</span>
            </span>
          </div>
        )}
        {isColumnVisible("email") && (
          <div className="truncate whitespace-nowrap py-[12px] text-[13px] text-[#666]">
            {invoice.deliveryMethod === "ndia-portal"
              ? (invoice.sentTo || "NDIA myplace provider portal")
              : (invoice.sentTo || <span className="text-[#ccc]">—</span>)}
          </div>
        )}
        {isColumnVisible("issued") && (
          <div className="whitespace-nowrap py-[12px] text-[13px] text-[#666]">
            {formatDate(invoice.issueDate) || <span className="text-[#ccc]">—</span>}
          </div>
        )}
        {isColumnVisible("sent") && (
          <div className="whitespace-nowrap py-[12px] text-[13px] text-[#666]">
            {formatDate(invoice.sentAt) || <span className="text-[#ccc]">—</span>}
          </div>
        )}
        {isColumnVisible("amount") && (
          <div className="whitespace-nowrap py-[12px] text-[13px] text-[#666]">
            <span className="font-medium text-[#262626]">{formatCurrency(invoice.total)}</span>
          </div>
        )}
        {isColumnVisible("status") && (
          <div className="whitespace-nowrap py-[12px]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                const rect = (e.target as HTMLElement).getBoundingClientRect()
                setStatusMenu({ invoiceId: invoice.id, x: rect.left, y: rect.bottom + 4 })
              }}
              className={`inline-flex items-center gap-[4px] rounded-[4px] border px-[10px] py-[4px] text-[12px] font-medium transition-colors hover:opacity-80 ${getInvoiceStatusClasses(invoice)}`}
              tabIndex={0}
              aria-label="Change invoice status"
            >
              {getInvoiceStatusLabel(invoice)}
              <ChevronDown className="h-[10px] w-[10px]" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
        <div className="flex items-center gap-[8px]">
          <span className="text-[13px] font-medium text-[#262626]">Invoicing</span>
          <div className="h-[16px] w-px bg-[#e5e5e5]" />
          <Link
            href="/invoicing"
            className="flex items-center gap-[6px] rounded-[4px] border border-transparent px-[8px] py-[4px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
          >
            <Table2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
            <span>Draft invoices</span>
          </Link>
          <div className="flex items-center gap-[6px] rounded-[4px] border border-[#e0e0e0] bg-[#f0f0f0] px-[8px] py-[4px] text-[13px] font-medium text-[#262626]">
            <Receipt className="h-[14px] w-[14px]" strokeWidth={1.75} />
            <span>Invoices</span>
          </div>
          {savedViews.length > 0 && <div className="h-[16px] w-px bg-[#dcdcdc]" />}
          {savedViews.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => selectView(view)}
              onContextMenu={(event) => {
                event.preventDefault()
                setViewContextMenu({ viewId: view.id, x: event.clientX, y: event.clientY })
              }}
              className={`flex items-center gap-[6px] rounded-[4px] border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${activeViewId === view.id ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-transparent text-[#888] hover:bg-[#f5f5f5] hover:text-[#262626]"}`}
              tabIndex={0}
            >
              <Table2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
              <span>{view.name}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-[6px] rounded border border-[#dcdcdc] bg-white px-[8px] py-[4px] text-[13px] font-medium text-[#262626]">
          <Receipt className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>{sentInvoices.length} sent</span>
        </div>
      </div>

      <div className="flex h-[41px] shrink-0 items-center gap-[8px] border-b border-[#dcdcdc] px-[16px]">
        <div className="relative">
          <button
            type="button"
            ref={filterButtonRef}
            onClick={() => {
              setIsFilterMenuOpen((current) => !current)
              setActiveFilterDropdown(null)
            }}
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
                    className="flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                    tabIndex={0}
                  >
                    <Icon className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
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

        <div className="relative ml-auto">
          <button
            type="button"
            ref={pageSizeButtonRef}
            onClick={() => setIsPageSizeOpen((current) => !current)}
            className="flex items-center gap-[5px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            <span>{pageSize} per page</span>
            <ChevronDown className="h-[11px] w-[11px] text-[#888]" strokeWidth={1.5} />
          </button>
          {isPageSizeOpen && (
            <>
              <div className="fixed inset-0 z-[55]" onClick={() => setIsPageSizeOpen(false)} />
              <div className="absolute right-0 top-full z-[60] mt-[4px] w-[120px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                {[10, 20, 50, 100].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size)
                      setVisibleCount(size)
                      setIsPageSizeOpen(false)
                    }}
                    className={`flex w-full items-center px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${pageSize === size ? "bg-[#f5f5f5] text-[#262626]" : "text-[#262626]"}`}
                    tabIndex={0}
                  >
                    {size} per page
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          ref={displayButtonRef}
          onClick={() => setIsDisplayOpen((current) => !current)}
          className={`flex items-center gap-[5px] rounded border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${hasDisplayFilters ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" : "border-[#dcdcdc] text-[#262626] hover:bg-[#f5f5f5]"}`}
          tabIndex={0}
        >
          <SlidersHorizontal className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span className="hidden sm:inline">Display</span>
          {hasDisplayFilters && (
            <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded-[4px] bg-blue-500 px-[4px] text-[10px] font-bold text-white">
              {displayParticipants.length + displayEmails.length + displayStatuses.length}
            </span>
          )}
        </button>

        {isDisplayOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsDisplayOpen(false)} />
            <div
              className="fixed z-50 w-[420px] rounded-lg border border-[#dcdcdc] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
              style={(() => {
                const rect = displayButtonRef.current?.getBoundingClientRect()
                if (!rect) return {}
                return { top: rect.bottom + 4, right: window.innerWidth - rect.right }
              })()}
            >
              <div className="max-h-[520px] overflow-y-auto">
                <div className="px-[20px] pb-[16px] pt-[16px]">
                  <div className="rounded-xl border border-[#d0d0d0] bg-white px-[14px] py-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-[8px]">
                      <Table2 className="h-[18px] w-[18px] text-[#262626]" strokeWidth={1.5} />
                      <span className="text-[13px] font-medium text-[#262626]">List</span>
                    </div>
                  </div>
                </div>

                <DisplaySection
                  title="Participants"
                  items={uniqueParticipants}
                  activeItems={displayParticipants}
                  onToggle={(value) => handleToggleDisplayItem(displayParticipants, setDisplayParticipants, value)}
                />
                <DisplaySection
                  title="Emails"
                  items={uniqueEmails}
                  activeItems={displayEmails}
                  onToggle={(value) => handleToggleDisplayItem(displayEmails, setDisplayEmails, value)}
                />
                <DisplaySection
                  title="Statuses"
                  items={uniqueStatuses}
                  activeItems={displayStatuses}
                  onToggle={(value) => handleToggleDisplayItem(displayStatuses, setDisplayStatuses, value)}
                  formatLabel={getInvoiceStatusLabel}
                />
              </div>

              <div className="flex items-center gap-[20px] border-t border-[#f0f0f0] px-[20px] py-[12px]">
                <button
                  type="button"
                  onClick={() => {
                    setDisplayParticipants([])
                    setDisplayEmails([])
                    setDisplayStatuses([])
                  }}
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

      <div className="flex-1 overflow-y-auto bg-[#fafafa]">
        <div
          className="sticky top-0 z-[1] grid items-center border-b border-[#e0e0e0] bg-[#fafafa] px-[24px]"
          style={{ gridTemplateColumns: gridTemplateColumns }}
        >
          {visibleColumns.map((column) => (
            <div
              key={column.key}
              className="whitespace-nowrap py-[11px] text-[12px] font-medium text-[#666]"
            >
              {column.label}
            </div>
          ))}
        </div>

        {sortedInvoices.slice(0, visibleCount).map(renderInvoiceRow)}

        {sortedInvoices.length === 0 && (
          <EmptyState />
        )}

        {sortedInvoices.length > visibleCount && (
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + pageSize)}
            className="flex w-full items-center justify-center gap-[6px] border-b border-[#f0f0f0] py-[10px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#fafafa] hover:text-[#262626]"
            tabIndex={0}
          >
            Show more ({sortedInvoices.length - visibleCount} remaining)
          </button>
        )}
      </div>

      <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
        <span className="text-[12px] font-medium text-[#999]">
          {sortedInvoices.length} {sortedInvoices.length === 1 ? "invoice" : "invoices"} sent
        </span>
      </div>

      {viewContextMenu && (
        <>
          <div className="fixed inset-0 z-[69]" onClick={() => setViewContextMenu(null)} />
          <div
            className="fixed z-[70] min-w-[160px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_6px_20px_rgba(0,0,0,0.12)]"
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

      {statusMenu && (
        <>
          <div className="fixed inset-0 z-[69]" onClick={() => setStatusMenu(null)} />
          <div
            className="fixed z-[70] min-w-[140px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_6px_20px_rgba(0,0,0,0.12)]"
            style={{ left: statusMenu.x, top: statusMenu.y }}
          >
            {([
              { value: "sent" as InvoiceStatus, label: "Sent", dot: "bg-[#888]" },
              { value: "paid" as InvoiceStatus, label: "Paid", dot: "bg-[#286847]" },
              { value: "overdue" as InvoiceStatus, label: "Overdue", dot: "bg-[#a54848]" },
            ]).map(({ value, label, dot }) => {
              const inv = sentInvoices.find((i) => i.id === statusMenu.invoiceId)
              const currentStatus = inv ? getInvoiceStatusValue(inv) : ""
              const isActive = currentStatus === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleStatusChange(statusMenu.invoiceId, value)}
                  className={`flex w-full items-center gap-[8px] px-[14px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-[#f5f5f5]" : ""}`}
                  tabIndex={0}
                >
                  <div className={`h-[6px] w-[6px] rounded-full ${dot}`} />
                  {label}
                  {isActive && <span className="ml-auto text-[11px] text-[#888]">✓</span>}
                </button>
              )
            })}
          </div>
        </>
      )}

      {selectedInvoiceId && (() => {
        const invoice = sentInvoices.find((i) => i.id === selectedInvoiceId)
        if (!invoice) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
            <div className="absolute inset-0 bg-black/20" onClick={() => setSelectedInvoiceId(null)} />
            <div className="relative z-10 flex w-[560px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[20px] border border-[#e7e7e7] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] px-[24px] py-[16px]">
                <div className="flex items-center gap-[10px]">
                  <Receipt className="h-[16px] w-[16px] text-[#888]" strokeWidth={1.5} />
                  <h3 className="text-[16px] font-semibold text-[#262626]">{invoice.invoiceNumber}</h3>
                  <span className={`inline-flex rounded-[4px] border px-[10px] py-[3px] text-[12px] font-medium ${getInvoiceStatusClasses(invoice)}`}>
                    {getInvoiceStatusLabel(invoice)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceId(null)}
                  className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                  tabIndex={0}
                  aria-label="Close"
                >
                  <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
                </button>
              </div>

              <div className="px-[24px] py-[20px]">
                <div className="space-y-[12px]">
                  <DetailRow label="Participant" value={invoice.clientName} />
                  <DetailRow label="Sent to" value={invoice.sentTo || "—"} />
                  <DetailRow label="Delivery" value={
                    invoice.deliveryMethod === "ndia-portal" ? "NDIA portal claim"
                    : invoice.deliveryMethod === "plan-manager-email" ? "Plan manager email"
                    : invoice.deliveryMethod === "participant-email" ? "Participant email"
                    : "Email"
                  } />
                  <DetailRow label="Issue date" value={formatDate(invoice.issueDate) || "—"} />
                  <DetailRow label="Due date" value={formatDate(invoice.dueDate) || "—"} />
                  <DetailRow label="Sent" value={formatDate(invoice.sentAt) || "—"} />
                  {invoice.paidAt && <DetailRow label="Paid" value={formatDate(invoice.paidAt)} />}
                </div>

                <div className="mt-[20px] rounded-[10px] border border-[#e5e5e5]">
                  <div className="grid grid-cols-[1fr_80px_80px_90px] border-b border-[#e5e5e5] px-[12px] py-[8px]">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-[#888]">Item</span>
                    <span className="text-right text-[11px] font-medium uppercase tracking-wide text-[#888]">Qty</span>
                    <span className="text-right text-[11px] font-medium uppercase tracking-wide text-[#888]">Rate</span>
                    <span className="text-right text-[11px] font-medium uppercase tracking-wide text-[#888]">Amount</span>
                  </div>
                  {invoice.lineItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_80px_80px_90px] border-b border-[#f0f0f0] px-[12px] py-[8px] last:border-b-0">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-[#262626]">{item.description || item.chargeName}</div>
                        <div className="text-[11px] text-[#888]">{item.chargeItemNumber}</div>
                      </div>
                      <div className="text-right text-[13px] text-[#666]">{item.quantity.toFixed(2)}</div>
                      <div className="text-right text-[13px] text-[#666]">{formatCurrency(item.rate)}</div>
                      <div className="text-right text-[13px] font-medium text-[#262626]">{formatCurrency(item.amount)}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-[12px] flex flex-col items-end gap-[4px]">
                  <div className="flex w-[200px] items-center justify-between text-[13px]">
                    <span className="text-[#888]">Subtotal</span>
                    <span className="text-[#262626]">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex w-[200px] items-center justify-between text-[13px]">
                    <span className="text-[#888]">GST</span>
                    <span className="text-[#262626]">{formatCurrency(invoice.gst)}</span>
                  </div>
                  <div className="mt-[4px] flex w-[200px] items-center justify-between border-t border-[#e5e5e5] pt-[6px] text-[14px] font-semibold">
                    <span className="text-[#262626]">Total</span>
                    <span className="text-[#262626]">{formatCurrency(invoice.total)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#f0f0f0] px-[24px] py-[14px]">
                <div className="flex items-center gap-[6px]">
                  <span className="text-[12px] text-[#888]">Status:</span>
                  {([
                    { value: "sent" as InvoiceStatus, label: "Sent", classes: "border-[#dcdcdc] bg-[#f7f7f7] text-[#262626]" },
                    { value: "paid" as InvoiceStatus, label: "Paid", classes: "border-[#d7eadf] bg-[#f3faf6] text-[#286847]" },
                    { value: "overdue" as InvoiceStatus, label: "Overdue", classes: "border-[#f0d4d4] bg-[#fff7f7] text-[#a54848]" },
                  ]).map(({ value, label, classes }) => {
                    const isActive = invoice.status === value || (value === "sent" && invoice.deliveryMethod === "ndia-portal" && invoice.status === "sent")
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleStatusChange(invoice.id, value)}
                        className={`rounded-[4px] border px-[10px] py-[4px] text-[12px] font-medium transition-colors ${isActive ? classes + " ring-2 ring-offset-1 ring-[#262626]/20" : "border-[#e5e5e5] bg-white text-[#888] hover:bg-[#f5f5f5]"}`}
                        tabIndex={0}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceId(null)}
                  className="rounded-[4px] bg-[#262626] px-[12px] py-[7px] text-[13px] font-medium text-white transition-colors hover:bg-black"
                  tabIndex={0}
                >
                  Done
                </button>
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
    <div className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626]">
      <Icon className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
      <button ref={buttonRef} onClick={onOpen} className="hover:underline" tabIndex={0}>
        {label}
      </button>
      <span className="text-[#888]">is</span>
      <span>{count} {count === 1 ? "value" : "values"}</span>
      <button onClick={onClear} className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded text-[#888] transition-colors hover:text-[#262626]" tabIndex={0} aria-label={`Clear ${label.toLowerCase()} filter`}>
        <X className="h-[12px] w-[12px]" strokeWidth={1.5} />
      </button>
    </div>
  )
}

function DisplaySection({
  title,
  items,
  activeItems,
  onToggle,
  formatLabel,
}: {
  title: string
  items: string[]
  activeItems: string[]
  onToggle: (value: string) => void
  formatLabel?: (value: string) => string
}) {
  if (items.length === 0) return null

  return (
    <div className="px-[20px] pb-[16px] pt-[2px]">
      <div className="pb-[12px] text-[13px] font-medium text-[#888]">{title}</div>
      <div className="flex flex-wrap gap-[8px]">
        {items.map((item) => {
          const isActive = activeItems.includes(item)
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className={`inline-flex items-center rounded-[4px] border px-[10px] py-[5px] text-[12px] font-medium transition-colors ${isActive ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-[#dcdcdc] bg-transparent text-[#262626] hover:bg-[#f5f5f5]"}`}
              tabIndex={0}
            >
              {formatLabel ? formatLabel(item) : item}
            </button>
          )
        })}
      </div>
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
    <div className="fixed z-[60] max-h-[280px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]" style={style}>
      <button onClick={onBack} className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
        <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
        <span>Back</span>
      </button>
      <p className="px-[16px] py-[4px] text-[11px] font-medium text-[#888]">{title}</p>
      {items.map((item) => {
        const isActive = selectedValues.includes(item.value)
        return (
          <button
            key={item.value}
            onClick={() => onToggle(item.value)}
            className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-[#f5f5f5]" : ""}`}
            tabIndex={0}
          >
            <div className={`flex h-[16px] w-[16px] items-center justify-center rounded border ${isActive ? "border-[#262626] bg-[#262626]" : "border-[#d0d0d0]"}`}>
              {isActive && <span className="text-[10px] text-white">✓</span>}
            </div>
            <span className="text-[#262626]">{item.label}</span>
          </button>
        )
      })}
      {items.length === 0 && <p className="px-[16px] py-[8px] text-[13px] text-[#888]">{emptyLabel}</p>}
      <div className="border-t border-[#f0f0f0] px-[8px] py-[4px]">
        <button onClick={onClear} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>
          Clear
        </button>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-center">
      <span className="text-[13px] font-medium text-[#888]">{label}</span>
      <span className={`text-[13px] font-medium ${value === "—" ? "text-[#ccc]" : "text-[#262626]"}`}>{value}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-[24px] py-[56px] text-center">
      <div className="rounded-full bg-[#f5f5f5] p-[12px]">
        <Receipt className="h-[20px] w-[20px] text-[#999]" strokeWidth={1.5} />
      </div>
      <h3 className="mt-[14px] text-[15px] font-semibold text-[#262626]">No sent invoices yet</h3>
      <p className="mt-[6px] max-w-[320px] text-[13px] text-[#888]">
        Invoices that have been confirmed and emailed will appear here automatically.
      </p>
    </div>
  )
}
