"use client"

import { useMemo, useRef, useState } from "react"
import { ArrowDownUp, Banknote, Check, CircleDot, KanbanSquare, Plus, Table2, Tag, User, Wallet } from "lucide-react"
import { Button } from "@/components/button"
import { PageTitleBar } from "@/components/page-title-bar"
import { EmptyState } from "@/components/empty-state"
import { PageError, PageLoader } from "@/components/page-state"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { TableMultiFilter, type TableFilterDefinition } from "@/components/table-multi-filter"
import { FixedSelectDropdown, FixedSelectOption } from "@/components/fixed-select-dropdown"
import { listViewBodyClass, listViewFilterBarClass, tabButtonClass } from "@/components/tab-active-indicator"
import { useToast } from "@/components/toast"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useReimbursements } from "@/lib/hooks/use-reimbursements"
import {
  formatReimbursementAmount,
  formatReimbursementDate,
  getReimbursementCategoryLabel,
  getReimbursementStatusClasses,
  getReimbursementStatusLabel,
} from "@/lib/reimbursements"
import type { Reimbursement } from "@/lib/types"
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
import { FormModal } from "@/components/form-modal"
import { ReimbursementKanban } from "./_components/reimbursement-kanban"
import { ReimbursementSidebarForm } from "./_components/reimbursement-sidebar-form"

type SidebarMode = "add" | "edit"
type ViewMode = "table" | "kanban"
type SortDir = "asc" | "desc"

const FILTER_DEFINITIONS: TableFilterDefinition[] = [
  { key: "status", label: "Status", icon: CircleDot },
  { key: "category", label: "Category", icon: Tag },
  { key: "participant", label: "Participant", icon: User },
]

const SORT_FIELDS: Array<{ key: string; label: string }> = [
  { key: "title", label: "What for" },
  { key: "amount", label: "Amount" },
  { key: "category", label: "Category" },
  { key: "participant", label: "Participant" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
  { key: "submittedBy", label: "Submitted by" },
]

function getReimbursementDisplayStatus(item: Reimbursement): string {
  if (item.paidAt) return "Paid"
  return getReimbursementStatusLabel(item.status)
}

function getReimbursementSortValue(item: Reimbursement, key: string): string | number {
  if (key === "amount") return item.amount
  if (key === "title") return (item.title ?? "").toLowerCase()
  if (key === "category") return getReimbursementCategoryLabel(item.category).toLowerCase()
  if (key === "participant") return (item.clientName ?? "").toLowerCase()
  if (key === "date") return item.dateIncurred ?? ""
  if (key === "status") return getReimbursementDisplayStatus(item).toLowerCase()
  if (key === "submittedBy") return (item.createdByName ?? "").toLowerCase()
  return ""
}

export default function ReimbursementsPage() {
  const { toast } = useToast()
  const { role } = usePermissions()
  const isAdmin = role === "admin" || role === "super-admin"
  const {
    reimbursements,
    isLoading,
    fetchError,
    addReimbursement,
    updateReimbursement,
    updateReimbursementStatus,
    markReimbursementsPaid,
    deleteReimbursement,
    getAttachmentUrl,
    refetch,
  } = useReimbursements()

  const [sidebarMode, setSidebarMode] = useState<SidebarMode | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [listFilters, setListFilters] = useState<Record<string, string[]>>({ status: [], category: [], participant: [] })
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [isSortOpen, setIsSortOpen] = useState(false)
  const sortTriggerRef = useRef<HTMLButtonElement>(null)
  const [view, setView] = useState<ViewMode>("table")
  const [isSaving, setIsSaving] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  const filterOptions = useMemo<Record<string, string[]>>(() => {
    const statuses = new Set<string>()
    const categories = new Set<string>()
    const participants = new Set<string>()
    for (const item of reimbursements) {
      statuses.add(getReimbursementDisplayStatus(item))
      categories.add(getReimbursementCategoryLabel(item.category))
      if (item.clientName) participants.add(item.clientName)
    }
    return { status: [...statuses].sort(), category: [...categories].sort(), participant: [...participants].sort() }
  }, [reimbursements])

  // Approved reimbursements that have not yet been paid form the pay queue.
  const toPay = useMemo(
    () => reimbursements.filter((item) => item.status === "approved" && !item.paidAt),
    [reimbursements],
  )

  const editing = useMemo(
    () => reimbursements.find((item) => item.id === editingId) ?? null,
    [editingId, reimbursements],
  )
  const isSidebarOpen = sidebarMode !== null

  const openAddSidebar = () => {
    setEditingId(null)
    setSidebarMode("add")
  }

  const openEditSidebar = (item: Reimbursement) => {
    setEditingId(item.id)
    setSidebarMode("edit")
  }

  const closeSidebar = () => {
    setSidebarMode(null)
    setEditingId(null)
  }

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const statusValues = listFilters.status ?? []
    const categoryValues = listFilters.category ?? []
    const participantValues = listFilters.participant ?? []
    const result = reimbursements.filter((item) => {
      if (statusValues.length > 0 && !statusValues.includes(getReimbursementDisplayStatus(item))) return false
      if (categoryValues.length > 0 && !categoryValues.includes(getReimbursementCategoryLabel(item.category))) return false
      if (participantValues.length > 0 && !participantValues.includes(item.clientName ?? "")) return false
      if (!query) return true
      const haystack = [
        item.title,
        item.createdByName,
        item.clientName,
        getReimbursementCategoryLabel(item.category),
        getReimbursementDisplayStatus(item),
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(query)
    })

    if (sortKey) {
      result.sort((a, b) => {
        const aVal = getReimbursementSortValue(a, sortKey)
        const bVal = getReimbursementSortValue(b, sortKey)
        let cmp = 0
        if (typeof aVal === "number" && typeof bVal === "number") cmp = aVal - bVal
        else cmp = String(aVal).localeCompare(String(bVal))
        return sortDir === "asc" ? cmp : -cmp
      })
    }

    return result
  }, [reimbursements, searchQuery, listFilters, sortKey, sortDir])

  const handleFilterChange = (key: string, values: string[]) =>
    setListFilters((prev) => ({ ...prev, [key]: values }))

  const handleSelectSort = (key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))
        return prev
      }
      setSortDir("asc")
      return key
    })
  }

  const sortLabel = sortKey ? SORT_FIELDS.find((field) => field.key === sortKey)?.label ?? "Sort" : "Sort"

  const handleSave = async (input: Parameters<typeof addReimbursement>[0], file: File | null) => {
    setIsSaving(true)
    try {
      if (sidebarMode === "edit" && editing) {
        await updateReimbursement(editing.id, input, file)
        if (input.status !== editing.status) await updateReimbursementStatus(editing.id, input.status)
        toast("Reimbursement updated", "success")
      } else {
        const created = await addReimbursement(input, file)
        if (created && input.status !== "draft") await updateReimbursementStatus(created.id, input.status)
        toast("Reimbursement created", "success")
      }
      closeSidebar()
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to save reimbursement", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (
    status: Reimbursement["status"],
    successMessage: string,
    note?: string,
  ) => {
    if (!editing) return
    setIsSaving(true)
    try {
      await updateReimbursementStatus(editing.id, status, note)
      toast(successMessage, "success")
      closeSidebar()
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to update reimbursement", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleKanbanStatus = async (
    id: string,
    status: "sent" | "returned" | "approved",
    note?: string,
  ) => {
    try {
      await updateReimbursementStatus(id, status, note)
      toast(
        status === "approved" ? "Reimbursement approved" : status === "returned" ? "Reimbursement returned" : "Reimbursement updated",
        "success",
      )
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to update reimbursement", "error")
    }
  }

  const handleDelete = async () => {
    if (!editing) return
    setIsSaving(true)
    try {
      await deleteReimbursement(editing.id)
      toast("Reimbursement deleted", "success")
      closeSidebar()
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to delete reimbursement", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportToPay = async () => {
    if (toPay.length === 0 || isPaying) return
    setIsPaying(true)
    try {
      const headers = ["Pay to", "What for", "Category", "Participant", "Amount", "Date incurred", "Approved by", "Approved at"]
      const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`
      const csvRows = toPay.map((item) => [
        item.createdByName || "",
        item.title || "",
        getReimbursementCategoryLabel(item.category),
        item.clientName || "",
        item.amount.toFixed(2),
        item.dateIncurred || "",
        item.approvedByName || "",
        item.approvedAt ? new Date(item.approvedAt).toISOString().slice(0, 10) : "",
      ])
      const csv = [headers.join(","), ...csvRows.map((r) => r.map(escapeCsv).join(","))].join("\r\n")
      const stamp = new Date().toISOString().slice(0, 10)
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `reimbursements_to_pay_${stamp}.csv`
      link.click()
      URL.revokeObjectURL(url)

      await markReimbursementsPaid(toPay.map((item) => item.id))
      toast(`Exported ${toPay.length} reimbursement${toPay.length === 1 ? "" : "s"} for payment`, "success")
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to export reimbursements", "error")
    } finally {
      setIsPaying(false)
    }
  }

  const handleDownloadAttachment = async () => {
    if (!editing?.attachmentStoragePath) return
    const url = await getAttachmentUrl(editing.attachmentStoragePath)
    if (!url) {
      toast("Receipt unavailable", "error")
      return
    }
    window.open(url, "_blank", "noopener,noreferrer")
  }

  if (isLoading) return <PageLoader label="Loading reimbursements…" />
  if (fetchError && reimbursements.length === 0) return <PageError message="Failed to load reimbursements" onRetry={refetch} />

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <PageTitleBar
            title="Reimbursements"
            trailing={
              <>
                {isAdmin && toPay.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportToPay}
                    disabled={isPaying}
                    className="outline-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors disabled:opacity-50"
                    tabIndex={0}
                  >
                    <Banknote className="h-[13px] w-[13px]" strokeWidth={1.75} />
                    <span>{isPaying ? "Exporting…" : `Export to pay (${toPay.length})`}</span>
                  </button>
                )}
                <Button onClick={openAddSidebar} variant="primary" className="folk-pill-btn h-[29px] px-[12px]">
                  <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>Add new</span>
                </Button>
              </>
            }
          />

          <div className="flex h-[44px] shrink-0 items-stretch border-b border-folk-border bg-white px-[16px]">
            <div className="folk-tab-bar flex h-full items-stretch [&_.folk-tab:last-child]:mr-0">
              <button
                type="button"
                onClick={() => setView("table")}
                className={tabButtonClass(view === "table")}
                aria-current={view === "table" ? "page" : undefined}
                aria-selected={view === "table"}
                tabIndex={0}
              >
                <Table2 className="h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
                <span className="folk-tab-label">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setView("kanban")}
                className={tabButtonClass(view === "kanban")}
                aria-current={view === "kanban" ? "page" : undefined}
                aria-selected={view === "kanban"}
                tabIndex={0}
              >
                <KanbanSquare className="h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
                <span className="folk-tab-label">Kanban</span>
              </button>
            </div>
          </div>

          <div className={listViewFilterBarClass("flex-nowrap")}>
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
                placeholder="Search reimbursements…"
                ariaLabel="Search reimbursements"
              />
              <div className="relative">
                <button
                  ref={sortTriggerRef}
                  type="button"
                  onClick={() => setIsSortOpen((open) => !open)}
                  className={cn(
                    "outline-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[12px] font-medium transition-colors",
                    sortKey && "text-folk-text",
                  )}
                  tabIndex={0}
                >
                  <ArrowDownUp className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  <span>{sortLabel}</span>
                  {sortKey && <span className="text-folk-secondary">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </button>
                <FixedSelectDropdown
                  isOpen={isSortOpen}
                  anchorRef={sortTriggerRef}
                  onClose={() => setIsSortOpen(false)}
                  minWidth={200}
                  align="right"
                >
                  {sortKey && (
                    <FixedSelectOption
                      muted
                      onClick={() => {
                        setSortKey(null)
                        setIsSortOpen(false)
                      }}
                    >
                      <span className="flex-1">Clear sort</span>
                    </FixedSelectOption>
                  )}
                  {SORT_FIELDS.map((field) => (
                    <FixedSelectOption
                      key={field.key}
                      isActive={field.key === sortKey}
                      onClick={() => handleSelectSort(field.key)}
                    >
                      <span className="flex-1">{field.label}</span>
                      {field.key === sortKey && (
                        <span className="flex items-center gap-[4px] text-folk-secondary">
                          <span>{sortDir === "asc" ? "↑" : "↓"}</span>
                          <Check className="h-[14px] w-[14px] text-folk-text" strokeWidth={2} />
                        </span>
                      )}
                    </FixedSelectOption>
                  ))}
                </FixedSelectDropdown>
              </div>
            </div>
          </div>

          {view === "table" ? (
            <div className={listViewBodyClass()}>
              {filtered.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="No reimbursements yet"
                  description="Submit a reimbursement to claim back an out-of-pocket expense."
                  className="py-[80px]"
                />
              ) : (
                <table className={TABLE_FULL} style={{ tableLayout: "fixed", minWidth: 1080 }}>
                  <thead>
                    <tr>
                      <th className={`${TABLE_PANEL_HEADER} w-[240px]`}>What for</th>
                      <th className={`${TABLE_PANEL_HEADER} w-[120px]`}>Amount</th>
                      <th className={`${TABLE_PANEL_HEADER} w-[160px]`}>Category</th>
                      <th className={`${TABLE_PANEL_HEADER} w-[160px]`}>Participant</th>
                      <th className={`${TABLE_PANEL_HEADER} w-[120px]`}>Date</th>
                      <th className={`${TABLE_PANEL_HEADER} w-[110px]`}>Status</th>
                      <th className={`${TABLE_PANEL_HEADER_LAST} w-[170px]`}>Submitted by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => {
                      const isSelected = editingId === item.id && sidebarMode === "edit"
                      return (
                        <tr
                          key={item.id}
                          onClick={() => openEditSidebar(item)}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-folk-hover",
                            isSelected && "bg-[#eef4fc] hover:bg-[#eef4fc]",
                          )}
                        >
                          <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                            <div className={TABLE_CELL_INNER}>
                              <span className="truncate">{item.title || "—"}</span>
                            </div>
                          </td>
                          <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                            <div className={TABLE_CELL_INNER}>{formatReimbursementAmount(item.amount)}</div>
                          </td>
                          <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL} text-folk-secondary`}>
                            <div className={TABLE_CELL_INNER}>{getReimbursementCategoryLabel(item.category)}</div>
                          </td>
                          <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL} text-folk-secondary`}>
                            <div className={TABLE_CELL_INNER}>
                              <span className="truncate">{item.clientName || "—"}</span>
                            </div>
                          </td>
                          <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL} text-folk-secondary`}>
                            <div className={TABLE_CELL_INNER}>{formatReimbursementDate(item.dateIncurred)}</div>
                          </td>
                          <td className={TABLE_PROFILE_CELL}>
                            <div className={TABLE_CELL_INNER}>
                              {item.paidAt ? (
                                <span className="inline-flex h-[22px] items-center gap-[4px] rounded-[6px] bg-[#e7f5ec] px-[8px] text-[11px] font-medium text-[#1a7f43]">
                                  <Banknote className="h-[11px] w-[11px]" strokeWidth={2} />
                                  Paid
                                </span>
                              ) : (
                                <span className={cn("inline-flex h-[22px] items-center rounded-[6px] px-[8px] text-[11px] font-medium", getReimbursementStatusClasses(item.status))}>
                                  {getReimbursementStatusLabel(item.status)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`${TABLE_PROFILE_CELL_LAST} ${TABLE_TEXT_CELL}`}>
                            <div className={TABLE_CELL_INNER}>
                              <span className="truncate">{item.createdByName || "—"}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="min-h-0 flex-1">
              <ReimbursementKanban
                reimbursements={reimbursements}
                canManage={isAdmin}
                onSetStatus={handleKanbanStatus}
                onOpen={(id) => {
                  setEditingId(id)
                  setSidebarMode("edit")
                }}
              />
            </div>
          )}
        </div>

        {isSidebarOpen && (
          <FormModal onClose={closeSidebar} width={500}>
            <ReimbursementSidebarForm
              mode={sidebarMode === "edit" ? "edit" : "add"}
              reimbursement={editing}
              isAdmin={isAdmin}
              isSaving={isSaving}
              onSave={handleSave}
              onSend={() => handleStatusChange("sent", "Reimbursement sent for approval")}
              onApprove={() => handleStatusChange("approved", "Reimbursement approved")}
              onReturn={(note) => handleStatusChange("returned", "Reimbursement returned", note)}
              onDelete={editing ? handleDelete : undefined}
              onDownloadAttachment={handleDownloadAttachment}
              getAttachmentUrl={getAttachmentUrl}
              onClose={closeSidebar}
            />
          </FormModal>
        )}
      </div>
    </div>
  )
}

