"use client"

import { useMemo, useState } from "react"
import {
  AlignLeft,
  CalendarDays,
  Check,
  CircleDot,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Hash,
  ListTodo,
  MapPin,
  Save,
  Tag,
  Table2,
  User as UserIcon,
  Users,
} from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { PageTitleBar } from "@/components/page-title-bar"
import { EntityIcon } from "@/components/entity-icon"
import { PageError, PageLoader } from "@/components/page-state"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { ApprovalDetailPanel } from "./_components/approval-detail-panel"
import { TableMultiFilter, type TableFilterDefinition } from "@/components/table-multi-filter"
import {
  profileMainTabScrollClass,
  profilePageTabBarClass,
  profilePageTabRowClass,
  listViewBodyClass,
  listViewFilterBarClass,
} from "@/components/tab-active-indicator"
import { useToast } from "@/components/toast"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useApprovals, type ApprovalItem, type ApprovalKind } from "@/lib/approvals/use-approvals"
import {
  TABLE_CELL_BASE,
  TABLE_CELL_INNER,
  TABLE_CELL_LAST,
  TABLE_FULL,
  TABLE_HEADER_CELL,
  TABLE_HEADER_CELL_LAST,
  TABLE_NAME_CELL,
  TABLE_ROW_HOVER,
  TABLE_TEXT_CELL,
} from "@/lib/table-styles"
import { cn } from "@/lib/utils"

type KindFilter = "all" | ApprovalKind

const KIND_META: Record<ApprovalKind, { label: string; chip: string; icon: typeof ListTodo }> = {
  task: { label: "Task", chip: "bg-[#ede9fe] text-[#6d28d9]", icon: ListTodo },
  timesheet: { label: "Timesheet", chip: "bg-[#dbeafe] text-[#1d4ed8]", icon: Clock },
  travel: { label: "Travel", chip: "bg-[#e7f5ec] text-[#1a7f43]", icon: MapPin },
  note: { label: "Shift note", chip: "bg-[#fef3c7] text-[#b45309]", icon: FileText },
}

const TABS: Array<{ key: KindFilter; label: string; icon: typeof Table2 }> = [
  { key: "all", label: "All", icon: Table2 },
  { key: "task", label: "Tasks", icon: ListTodo },
  { key: "timesheet", label: "Timesheets", icon: Clock },
  { key: "travel", label: "Travel", icon: MapPin },
  { key: "note", label: "Shift notes", icon: FileText },
]

const FILTER_DEFINITIONS: TableFilterDefinition[] = [
  { key: "user", label: "User", icon: UserIcon },
  { key: "participant", label: "Participant", icon: Users },
]

type StagedStatus = "approved" | "returned"
type ApprovalStatus = "pending" | StagedStatus

const STATUS_CYCLE: ApprovalStatus[] = ["pending", "approved", "returned"]

const STATUS_META: Record<ApprovalStatus, { label: string; chip: string; dot: string }> = {
  pending: { label: "Pending", chip: "bg-[#fef3c7] text-[#b45309]", dot: "bg-[#d97706]" },
  approved: { label: "Approved", chip: "bg-[#e7f5ec] text-[#1a7f43]", dot: "bg-[#16a34a]" },
  returned: { label: "Returned", chip: "bg-[#fee2e2] text-[#b91c1c]", dot: "bg-[#dc2626]" },
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—"
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
}

/** Up to two initials from the start of the first two words. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function ApprovalsPage() {
  const { items, counts, isLoading, fetchError, approve, reject } = useApprovals()
  const { canViewFinance, isLoading: permissionsLoading } = usePermissions()
  const { toast } = useToast()
  const [kindFilter, setKindFilter] = useState<KindFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isBulkBusy, setIsBulkBusy] = useState(false)
  const [listFilters, setListFilters] = useState<Record<string, string[]>>({ user: [], participant: [] })
  const [activeItem, setActiveItem] = useState<ApprovalItem | null>(null)
  const [stagedStatuses, setStagedStatuses] = useState<Record<string, StagedStatus>>({})
  const [isSavingStatuses, setIsSavingStatuses] = useState(false)

  // Ignore staged entries whose item has since left the queue (e.g. approved
  // from the detail panel) so the Save count stays honest.
  const stagedEntries = useMemo(
    () =>
      Object.entries(stagedStatuses).filter(([id]) => items.some((item) => item.id === id)) as Array<
        [string, StagedStatus]
      >,
    [stagedStatuses, items]
  )
  const stagedCount = stagedEntries.length

  const filterOptions = useMemo<Record<string, string[]>>(() => {
    const users = new Set<string>()
    const participants = new Set<string>()
    for (const item of items) {
      if (item.person) users.add(item.person)
      if (item.clientName && item.clientName !== "—") participants.add(item.clientName)
    }
    return { user: [...users].sort(), participant: [...participants].sort() }
  }, [items])

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const userFilter = listFilters.user ?? []
    const participantFilter = listFilters.participant ?? []
    return items
      .filter((item) => kindFilter === "all" || item.kind === kindFilter)
      .filter((item) => userFilter.length === 0 || userFilter.includes(item.person))
      .filter((item) => participantFilter.length === 0 || participantFilter.includes(item.clientName))
      .filter((item) => {
        if (!query) return true
        return [item.title, item.person, item.clientName, item.detail].join(" ").toLowerCase().includes(query)
      })
  }, [items, kindFilter, listFilters, searchQuery])

  const handleFilterChange = (key: string, values: string[]) =>
    setListFilters((prev) => ({ ...prev, [key]: values }))

  const cycleStatus = (item: ApprovalItem) => {
    setStagedStatuses((prev) => {
      const current: ApprovalStatus = prev[item.id] ?? "pending"
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length]
      const draft = { ...prev }
      if (next === "pending") delete draft[item.id]
      else draft[item.id] = next
      return draft
    })
  }

  const handleSaveStatuses = async () => {
    if (stagedCount === 0 || isSavingStatuses) return
    setIsSavingStatuses(true)
    let applied = 0
    const failures: Record<string, StagedStatus> = {}
    for (const [id, status] of stagedEntries) {
      const item = items.find((entry) => entry.id === id)
      if (!item) continue
      try {
        if (status === "approved") await approve(item)
        else await reject(item)
        applied += 1
      } catch {
        failures[id] = status
      }
    }
    setStagedStatuses(failures)
    setIsSavingStatuses(false)
    const failedCount = Object.keys(failures).length
    if (failedCount > 0) {
      toast(`Applied ${applied} of ${applied + failedCount} — ${failedCount} failed`, "error")
    } else {
      toast(`${applied} ${applied === 1 ? "status" : "statuses"} applied`, "success")
    }
  }

  const handleApprove = async (item: ApprovalItem) => {
    setBusyId(item.id)
    try {
      await approve(item)
      toast(`${KIND_META[item.kind].label} approved`, "success")
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not approve", "error")
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (item: ApprovalItem, note?: string) => {
    setBusyId(item.id)
    try {
      await reject(item, note)
      toast(`${KIND_META[item.kind].label} returned to submitter`, "info")
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not return", "error")
    } finally {
      setBusyId(null)
    }
  }

  const handleApproveAll = async () => {
    if (filtered.length === 0 || isBulkBusy) return
    setIsBulkBusy(true)
    let approved = 0
    for (const item of filtered) {
      try {
        await approve(item)
        approved += 1
      } catch {
        // keep going; surface the tally at the end
      }
    }
    setIsBulkBusy(false)
    toast(approved > 0 ? `Approved ${approved} ${approved === 1 ? "item" : "items"}` : "Nothing approved", approved > 0 ? "success" : "error")
  }

  const handleExport = () => {
    if (filtered.length === 0) return
    const headers = ["User", "Type", "Item", "Participant", "Date", "Quantity"]
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`
    const rows = filtered.map((item) => [
      item.person,
      KIND_META[item.kind].label,
      item.title,
      item.clientName,
      item.date,
      item.quantityLabel,
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\r\n")
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `approvals_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading || permissionsLoading) return <PageLoader label="Loading approvals…" />

  if (!canViewFinance) {
    return (
      <div className="flex h-full flex-col">
        <PageTitleBar title="Approvals" />
        <EmptyState
          icon={ClipboardCheck}
          title="No access"
          description="You do not have permission to review billing approvals."
          className="flex-1"
        />
      </div>
    )
  }

  if (fetchError && items.length === 0) return <PageError message={fetchError} onRetry={() => window.location.reload()} />

  return (
    <div className="relative flex h-full min-h-0">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PageTitleBar title="Approvals" />
        <div className="flex h-[44px] shrink-0 items-center justify-end gap-[8px] border-b border-folk-border-subtle bg-white px-[16px]">
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="outline-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors disabled:opacity-50"
            tabIndex={0}
          >
            <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={handleApproveAll}
            disabled={filtered.length === 0 || isBulkBusy || isSavingStatuses}
            className="outline-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors disabled:opacity-50"
            tabIndex={0}
          >
            <Check className="h-[13px] w-[13px]" strokeWidth={1.75} />
            <span className="hidden sm:inline">{isBulkBusy ? "Approving…" : "Approve all"}</span>
          </button>
          <button
            onClick={handleSaveStatuses}
            disabled={stagedCount === 0 || isSavingStatuses || isBulkBusy}
            className="primary-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors disabled:opacity-50"
            aria-label={stagedCount > 0 ? `Save ${stagedCount} staged status ${stagedCount === 1 ? "change" : "changes"}` : "Save status changes"}
            tabIndex={0}
          >
            <Save className="h-[13px] w-[13px]" strokeWidth={1.75} />
            <span className="hidden sm:inline">
              {isSavingStatuses ? "Saving…" : stagedCount > 0 ? `Save (${stagedCount})` : "Save"}
            </span>
          </button>
        </div>

        {/* Tab views */}
        <div className={profilePageTabRowClass()}>
          <div className={profilePageTabBarClass()}>
            <div className={profileMainTabScrollClass()}>
              {TABS.map((tab) => (
                <ProfileTabButton
                  key={tab.key}
                  isActive={kindFilter === tab.key}
                  onClick={() => setKindFilter(tab.key)}
                  label={tab.label}
                  badge={tab.key === "all" ? counts.all : counts[tab.key]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className={listViewFilterBarClass()}>
          <TableMultiFilter
            filters={FILTER_DEFINITIONS}
            values={listFilters}
            options={filterOptions}
            onChange={handleFilterChange}
          />
          <div className="ml-auto flex shrink-0 items-center gap-[8px]">
            <ExpandableTableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search approvals…"
              ariaLabel="Search approvals"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Nothing to approve"
            description="Completed billable tasks, submitted timesheets, participant-travel claims, and shift notes appear here for review before they can be invoiced or claimed."
            className="flex-1"
          />
        ) : (
          <div className={listViewBodyClass()}>
            <table className={TABLE_FULL}>
              <thead>
                <tr>
                  <th className={TABLE_HEADER_CELL}>
                    <span className="truncate">{filtered.length} {filtered.length === 1 ? "item" : "items"}</span>
                  </th>
                  <ApprovalHeaderCell icon={Tag} label="Type" />
                  <ApprovalHeaderCell icon={AlignLeft} label="Item" />
                  <ApprovalHeaderCell icon={UserIcon} label="Participant" />
                  <ApprovalHeaderCell icon={CalendarDays} label="Date" />
                  <ApprovalHeaderCell icon={Hash} label="Quantity" />
                  <th className={TABLE_HEADER_CELL_LAST}>
                    <span className="flex items-center gap-[6px]">
                      <CircleDot className="h-[12px] w-[12px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                      Status
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const meta = KIND_META[item.kind]
                  const isBusy = busyId === item.id
                  return (
                    <tr
                      key={item.id}
                      className="group cursor-pointer"
                      onClick={() => setActiveItem(item)}
                    >
                      <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)}>
                        <div className={TABLE_CELL_INNER}>
                          <EntityIcon text={getInitials(item.person)} size="sm" />
                          <span className={cn("truncate", TABLE_NAME_CELL)}>{item.person}</span>
                        </div>
                      </td>
                      <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)}>
                        <div className={TABLE_CELL_INNER}>
                          <span className={cn("inline-flex items-center rounded-full px-[8px] py-[2px] text-[11px] font-medium", meta.chip)}>
                            {meta.label}
                          </span>
                        </div>
                      </td>
                      <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)}>
                        <div className={TABLE_CELL_INNER}>
                          <span className={cn("truncate", TABLE_TEXT_CELL)}>{item.title}</span>
                        </div>
                      </td>
                      <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)}>
                        <div className={TABLE_CELL_INNER}>
                          <span className={cn("truncate", TABLE_TEXT_CELL, "text-folk-secondary")}>{item.clientName}</span>
                        </div>
                      </td>
                      <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)}>
                        <div className={TABLE_CELL_INNER}>
                          <span className={cn("truncate", TABLE_TEXT_CELL, "text-folk-secondary")}>{formatDate(item.date)}</span>
                        </div>
                      </td>
                      <td className={cn(TABLE_CELL_BASE, TABLE_ROW_HOVER)}>
                        <div className={TABLE_CELL_INNER}>
                          <span className={cn("truncate", TABLE_TEXT_CELL)}>{item.quantityLabel}</span>
                        </div>
                      </td>
                      <td className={cn(TABLE_CELL_LAST, TABLE_ROW_HOVER)}>
                        <div className={TABLE_CELL_INNER} onClick={(event) => event.stopPropagation()}>
                          <ApprovalStatusCycle
                            status={stagedStatuses[item.id] ?? "pending"}
                            disabled={isBusy || isSavingStatuses || isBulkBusy}
                            onCycle={() => cycleStatus(item)}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeItem && (
        <ApprovalDetailPanel
          item={activeItem}
          isBusy={busyId === activeItem.id}
          onClose={() => setActiveItem(null)}
          onApprove={() => handleApprove(activeItem)}
          onReturn={(note) => handleReject(activeItem, note)}
        />
      )}
    </div>
  )
}

interface ApprovalHeaderCellProps {
  icon: typeof Table2
  label: string
}

function ApprovalHeaderCell({ icon: Icon, label }: ApprovalHeaderCellProps) {
  return (
    <th className={TABLE_HEADER_CELL}>
      <span className="flex items-center gap-[6px]">
        <Icon className="h-[12px] w-[12px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
        {label}
      </span>
    </th>
  )
}

interface ApprovalStatusCycleProps {
  status: ApprovalStatus
  disabled?: boolean
  onCycle: () => void
}

function ApprovalStatusCycle({ status, disabled, onCycle }: ApprovalStatusCycleProps) {
  const meta = STATUS_META[status]
  const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length]

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onCycle}
      title={`Click to mark as ${STATUS_META[next].label.toLowerCase()}, then Save to apply`}
      aria-label={`Status: ${meta.label}. Click to change to ${STATUS_META[next].label.toLowerCase()}`}
      className={cn(
        "inline-flex h-[22px] items-center gap-[6px] rounded-full px-[10px] text-[11px] font-medium transition-[opacity,box-shadow] hover:opacity-90 hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] disabled:opacity-50",
        meta.chip
      )}
      tabIndex={0}
    >
      <span className={cn("h-[6px] w-[6px] shrink-0 rounded-full", meta.dot)} />
      {meta.label}
    </button>
  )
}
