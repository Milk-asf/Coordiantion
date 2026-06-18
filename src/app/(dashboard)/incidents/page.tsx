"use client"

import { useMemo, useRef, useState, type RefObject } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ChevronDown, ListFilter, Plus, X } from "lucide-react"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { FixedDropdownMenu } from "@/components/fixed-dropdown-menu"
import { FixedSelectDropdown, FixedSelectOption } from "@/components/fixed-select-dropdown"
import { PageError, PageLoader } from "@/components/page-state"
import { SearchBar } from "@/components/search-bar"
import { useClients } from "@/lib/hooks/use-clients"
import { useIncidents } from "@/lib/hooks/use-incidents"
import { usePermissions } from "@/lib/hooks/use-permissions"
import {
  formatIncidentDate,
  getIncidentCategoryLabel,
  INCIDENT_CATEGORIES,
} from "@/lib/incident-definitions"
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

export default function IncidentsPage() {
  const router = useRouter()
  const { clients } = useClients()
  const { canViewIncidents, canManageIncidents } = usePermissions()
  const { incidents, isLoading, fetchError, refetch } = useIncidents()

  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [reportableFilter, setReportableFilter] = useState<"all" | "yes" | "no">("all")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeFilterSelect, setActiveFilterSelect] = useState<"category" | "reportable" | "client" | null>(null)
  const categoryFilterRef = useRef<HTMLButtonElement>(null)
  const reportableFilterRef = useRef<HTMLButtonElement>(null)
  const clientFilterRef = useRef<HTMLButtonElement>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)

  const categoryFilterOptions = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...INCIDENT_CATEGORIES.map((category) => ({ value: category.value, label: category.label })),
    ],
    []
  )

  const reportableFilterOptions = useMemo(
    () => [
      { value: "all", label: "All incidents" },
      { value: "yes", label: "Reportable only" },
      { value: "no", label: "Non-reportable only" },
    ],
    []
  )

  const clientFilterOptions = useMemo(
    () => [
      { value: "all", label: "All participants" },
      ...clients.map((client) => ({ value: client.id, label: client.displayName })),
    ],
    [clients]
  )

  const toggleFilterSelect = (select: "category" | "reportable" | "client") => {
    setActiveFilterSelect((current) => (current === select ? null : select))
  }

  const closeFilterSelects = () => setActiveFilterSelect(null)

  const closeFilterPanel = () => {
    setIsFilterOpen(false)
    closeFilterSelects()
  }

  const getFilterLabel = (options: { value: string; label: string }[], value: string) =>
    options.find((option) => option.value === value)?.label ?? "Select"

  const filteredIncidents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return incidents.filter((incident) => {
      if (categoryFilter !== "all" && incident.category !== categoryFilter) return false
      if (reportableFilter === "yes" && !incident.isReportable) return false
      if (reportableFilter === "no" && incident.isReportable) return false
      if (clientFilter !== "all" && !incident.clientIds.includes(clientFilter)) return false
      if (!query) return true
      const haystack = [
        incident.clientNames,
        incident.completedByName,
        incident.reportedByName,
        incident.location,
        incident.description,
        getIncidentCategoryLabel(incident.category),
        incident.incidentStatus,
      ].join(" ").toLowerCase()
      return haystack.includes(query)
    })
  }, [categoryFilter, clientFilter, incidents, reportableFilter, searchQuery])

  const activeFilterCount = [
    categoryFilter !== "all",
    reportableFilter !== "all",
    clientFilter !== "all",
  ].filter(Boolean).length

  if (!canViewIncidents && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center px-[24px]">
        <EmptyState
          icon={AlertTriangle}
          title="Admin access required"
          description="Incident reports are only visible to workspace admins."
          className="py-[40px]"
        />
      </div>
    )
  }

  if (isLoading) return <PageLoader label="Loading incidents…" />
  if (fetchError && incidents.length === 0) return <PageError message="Failed to load incidents" onRetry={refetch} />

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-folk-border bg-folk-nav px-[16px]">
        <span className="text-[13px] font-medium text-folk-text">Incidents</span>
        {canManageIncidents && (
          <Button onClick={() => router.push("/incidents/new")} className="h-[32px] rounded-none px-[14px]">
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Report incident</span>
          </Button>
        )}
      </div>

      <div className="flex h-[41px] shrink-0 items-center gap-[8px] border-b border-folk-border bg-folk-nav px-[16px]">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search incidents"
          className="w-[220px]"
          ariaLabel="Search incidents"
        />
        <div className="relative">
          <button
            ref={filterBtnRef}
            type="button"
            onClick={() => setIsFilterOpen((open) => !open)}
            className="flex items-center gap-[6px] rounded-none border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
            tabIndex={0}
          >
            <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="rounded-none bg-[#eef4fc] px-[5px] py-[0.5px] text-[10px] font-semibold text-[#2563EB]">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className="h-[12px] w-[12px] text-folk-secondary" strokeWidth={1.75} />
          </button>
          <FixedDropdownMenu
            isOpen={isFilterOpen}
            anchorRef={filterBtnRef}
            onClose={closeFilterPanel}
            estimatedHeight={320}
            minWidth={240}
            className="p-[12px]"
          >
                <div className="mb-[10px]">
                  <label className="mb-[4px] block text-[11px] font-medium text-folk-secondary">Category</label>
                  <IncidentFilterSelect
                    value={categoryFilter}
                    label={getFilterLabel(categoryFilterOptions, categoryFilter)}
                    options={categoryFilterOptions}
                    isOpen={activeFilterSelect === "category"}
                    onToggle={() => toggleFilterSelect("category")}
                    onClose={closeFilterSelects}
                    onChange={setCategoryFilter}
                    buttonRef={categoryFilterRef}
                    wrapLabels
                  />
                </div>
                <div className="mb-[10px]">
                  <label className="mb-[4px] block text-[11px] font-medium text-folk-secondary">Reportable</label>
                  <IncidentFilterSelect
                    value={reportableFilter}
                    label={getFilterLabel(reportableFilterOptions, reportableFilter)}
                    options={reportableFilterOptions}
                    isOpen={activeFilterSelect === "reportable"}
                    onToggle={() => toggleFilterSelect("reportable")}
                    onClose={closeFilterSelects}
                    onChange={(value) => setReportableFilter(value as "all" | "yes" | "no")}
                    buttonRef={reportableFilterRef}
                  />
                </div>
                <div>
                  <label className="mb-[4px] block text-[11px] font-medium text-folk-secondary">Participant</label>
                  <IncidentFilterSelect
                    value={clientFilter}
                    label={getFilterLabel(clientFilterOptions, clientFilter)}
                    options={clientFilterOptions}
                    isOpen={activeFilterSelect === "client"}
                    onToggle={() => toggleFilterSelect("client")}
                    onClose={closeFilterSelects}
                    onChange={setClientFilter}
                    buttonRef={clientFilterRef}
                  />
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter("all")
                      setReportableFilter("all")
                      setClientFilter("all")
                      closeFilterSelects()
                    }}
                    className="mt-[10px] flex items-center gap-[4px] text-[12px] font-medium text-folk-secondary transition-colors hover:text-folk-text"
                    tabIndex={0}
                  >
                    <X className="h-[12px] w-[12px]" strokeWidth={1.5} />
                    Clear filters
                  </button>
                )}
          </FixedDropdownMenu>
        </div>
        <span className="ml-auto text-[12px] font-medium text-folk-secondary">
          {filteredIncidents.length} {filteredIncidents.length === 1 ? "report" : "reports"}
        </span>
      </div>

      <div className="flex-1 overflow-auto bg-folk-surface">
        <table className={TABLE_FULL} style={{ tableLayout: "fixed", minWidth: 1080 }}>
          <thead>
            <tr>
              <th className={`${TABLE_PANEL_HEADER} w-[120px]`}>Date</th>
              <th className={`${TABLE_PANEL_HEADER} w-[180px]`}>Participant/s</th>
              <th className={`${TABLE_PANEL_HEADER} w-[180px]`}>Category</th>
              <th className={`${TABLE_PANEL_HEADER} w-[90px]`}>Status</th>
              <th className={`${TABLE_PANEL_HEADER} w-[110px]`}>Reportable</th>
              <th className={`${TABLE_PANEL_HEADER} w-[140px]`}>Completed by</th>
              <th className={`${TABLE_PANEL_HEADER_LAST} w-[120px]`}>Recorded</th>
            </tr>
          </thead>
          <tbody>
            {filteredIncidents.map((incident) => (
              <tr
                key={incident.id}
                onClick={() => router.push(`/incidents/${incident.id}`)}
                className="cursor-pointer transition-colors hover:bg-folk-hover"
              >
                <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                  <div className={TABLE_CELL_INNER}>{formatIncidentDate(incident.incidentDate)}</div>
                </td>
                <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                  <div className={TABLE_CELL_INNER}>
                    <span className="truncate">{incident.clientNames || "—"}</span>
                  </div>
                </td>
                <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                  <div className={TABLE_CELL_INNER}>
                    <span className="line-clamp-2">{getIncidentCategoryLabel(incident.category)}</span>
                  </div>
                </td>
                <td className={TABLE_PROFILE_CELL}>
                  <div className={TABLE_CELL_INNER}>
                    <span className="inline-flex h-[22px] items-center rounded-none border border-folk-border px-[8px] text-[11px] font-medium capitalize text-folk-text">
                      {incident.incidentStatus}
                    </span>
                  </div>
                </td>
                <td className={TABLE_PROFILE_CELL}>
                  <div className={TABLE_CELL_INNER}>
                    <span className={cn(
                      "inline-flex h-[22px] items-center rounded-none px-[8px] text-[11px] font-medium",
                      incident.isReportable
                        ? "bg-[#fef2f2] text-[#b91c1c]"
                        : "bg-folk-hover text-folk-secondary"
                    )}>
                      {incident.isReportable ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                  <div className={TABLE_CELL_INNER}>
                    <span className="truncate">{incident.completedByName || "—"}</span>
                  </div>
                </td>
                <td className={`${TABLE_PROFILE_CELL_LAST} ${TABLE_TEXT_CELL} text-folk-secondary`}>
                  <div className={TABLE_CELL_INNER}>{formatIncidentDate(incident.createdAt.slice(0, 10))}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const FILTER_SELECT_BUTTON_CLASS =
  "flex h-[32px] w-full items-center justify-between rounded-none border border-folk-border bg-folk-surface px-[8px] text-left text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"

interface IncidentFilterSelectProps {
  value: string
  label: string
  options: { value: string; label: string }[]
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onChange: (value: string) => void
  buttonRef: RefObject<HTMLButtonElement | null>
  wrapLabels?: boolean
}

function IncidentFilterSelect({
  value,
  label,
  options,
  isOpen,
  onToggle,
  onClose,
  onChange,
  buttonRef,
  wrapLabels = false,
}: IncidentFilterSelectProps) {
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        className={FILTER_SELECT_BUTTON_CLASS}
        aria-expanded={isOpen}
        tabIndex={0}
      >
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown
          className={cn("ml-[6px] h-[12px] w-[12px] shrink-0 text-folk-secondary transition-transform", isOpen && "rotate-180")}
          strokeWidth={1.75}
        />
      </button>
      <FixedSelectDropdown
        isOpen={isOpen}
        anchorRef={buttonRef}
        onClose={onClose}
        estimatedHeight={Math.min(options.length * (wrapLabels ? 44 : 36) + 8, 320)}
        minWidth={240}
      >
        {options.map((option) => {
          const isSelected = value === option.value
          if (wrapLabels) {
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  onClose()
                }}
                className={cn(
                  "flex w-full px-[12px] py-[8px] text-left transition-colors hover:bg-folk-hover",
                  isSelected && "bg-[var(--folk-border-subtle)]"
                )}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
              >
                <span className="text-[12px] font-medium leading-[1.45] text-folk-text">{option.label}</span>
              </button>
            )
          }

          return (
            <FixedSelectOption
              key={option.value}
              isActive={isSelected}
              onClick={() => {
                onChange(option.value)
                onClose()
              }}
            >
              {option.label}
            </FixedSelectOption>
          )
        })}
      </FixedSelectDropdown>
    </>
  )
}
