"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useContacts } from "@/lib/hooks/use-contacts"
import { useClients } from "@/lib/hooks/use-clients"
import { useFieldConfig } from "@/lib/hooks/use-field-config"
import { useSavedViews } from "@/lib/hooks/use-saved-views"
import { useColumnResize } from "@/lib/hooks/use-column-resize"
import { useAssignableCoordinators } from "@/lib/hooks/use-assignable-coordinators"
import { contactCsvColumns, parseContactsFromCsvRow } from "@/lib/participants/csv-contacts"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useCurrentStaffId } from "@/lib/hooks/use-current-staff"
import { useSuitabilityContext } from "@/lib/suitability-context"
import { useTasks } from "@/lib/tasks-context"
import type { Client, ParticipantDetails } from "@/lib/types"
import { EntityIcon } from "@/components/entity-icon"
import { mergeDiagnoses } from "@/app/(dashboard)/clients/[id]/_components/client-profile-helpers"
import {
  Plus,
  SlidersHorizontal,
  ArrowUpRight,
  Users,
  Globe,
  Table2,
  X,
  Ellipsis,
  FileText,
  User,
  Mail,
  Phone,
  MessageSquare,
  PenLine,
  Hash,
  CalendarDays,
  Heart,
  Languages,
  Stethoscope,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  EyeOff,
  SquarePen,
  File,
  UserPlus,
  Info,
  Clock,
  DollarSign,
  Tag,
} from "lucide-react"
import { CsvDropdown } from "@/components/csv-dropdown"
import { CategoryChip } from "@/components/category-chip"
import { PageLoader, PageError } from "@/components/page-state"
import { PageTitleBar } from "@/components/page-title-bar"
import {
  TABLE_CELL_BASE,
  TABLE_CELL_INNER,
  TABLE_CELL_LAST,
  TABLE_CHIP,
  TABLE_HEADER_CELL,
  TABLE_HEADER_CELL_LAST,
  TABLE_NAME_CELL,
  TABLE_ROW_HOVER,
  TABLE_TEXT_CELL,
  TABLE_GRID,
  TABLE_HEADER_STICKY_EDGE,
  TABLE_CELL_STICKY_EDGE,
  TABLE_NAME_COLUMN_KEY,
  tableCellSelectionClass,
  type TableCellSelection,
} from "@/lib/table-styles"
import { listViewBodyClass, listViewFilterBarClass, listViewTabBarClass } from "@/components/tab-active-indicator"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { TableAddFooterRow, TableAddNewButton } from "@/components/table-add-row"
import { FolkStatusPill } from "@/lib/folk-ui"
import { ClientProfilePanel } from "@/app/(dashboard)/clients/_components/client-profile-panel"
import { useToast } from "@/components/toast"
import { TableColumnMenuPortal } from "@/components/table-column-menu-portal"
import { TableMultiFilter, uniqueNonEmpty, type TableFilterDefinition } from "@/components/table-multi-filter"
import { TableDisplayPopover } from "@/components/display-popover"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { matchesTableSearch } from "@/lib/table-search"
import {
  CLIENT_BUDGET_LABELS,
  CLIENT_BUDGET_OPTIONS,
  CLIENT_CHECK_UP_LABELS,
  CLIENT_CHECK_UP_OPTIONS,
  CLIENT_FUNDING_LABELS,
  emptyClientListFilters,
  filterClients,
  type ClientListFilterState,
} from "@/lib/client-list-filters"

const allPropertyColumns = [
  { key: "status", label: "Status", icon: Tag, minWidth: 130 },
  { key: "ndisNumber", label: "NDIS Number", icon: Hash, minWidth: 160 },
  { key: "diagnosis", label: "Diagnosis", icon: Stethoscope, minWidth: 240 },
  { key: "email", label: "Email", icon: Mail, minWidth: 200 },
  { key: "phone", label: "Phone", icon: Phone, minWidth: 160 },
  { key: "dob", label: "Date of Birth", icon: CalendarDays, minWidth: 150 },
  { key: "gender", label: "Gender", icon: User, minWidth: 120 },
  { key: "pronouns", label: "Pronouns", icon: MessageSquare, minWidth: 120 },
  { key: "ethnicity", label: "Ethnicity", icon: Globe, minWidth: 140 },
  { key: "language", label: "Language", icon: Languages, minWidth: 140 },
  { key: "preferredName", label: "Preferred Name", icon: Heart, minWidth: 150 },
  { key: "medicareNumber", label: "Medicare Number", icon: Hash, minWidth: 170 },
  { key: "centrelinkNumber", label: "Centrelink Number", icon: Hash, minWidth: 180 },
  { key: "externalId", label: "External ID", icon: Hash, minWidth: 140 },
  { key: "preferredContactMethod", label: "Contact Method", icon: MessageSquare, minWidth: 160 },
  { key: "preferredSignMethod", label: "Sign Method", icon: PenLine, minWidth: 150 },
  { key: "nextCheckUp", label: "Next Check-up", icon: Clock, minWidth: 160 },
  { key: "serviceCommencementDate", label: "Service Start", icon: CalendarDays, minWidth: 150 },
  { key: "serviceExitDate", label: "Service Exit", icon: CalendarDays, minWidth: 150 },
  { key: "budgets", label: "Budgets", icon: DollarSign, minWidth: 220 },
  { key: "contact-support-coordinator", label: "Support Coordinator", icon: Users, minWidth: 180 },
  { key: "contact-general-practitioner", label: "General Practitioner", icon: Users, minWidth: 180 },
  { key: "contact-pharmacy", label: "Pharmacy", icon: Users, minWidth: 150 },
  { key: "contact-mental-health", label: "Mental Health", icon: Users, minWidth: 160 },
  { key: "contact-physiotherapist", label: "Physiotherapist", icon: Users, minWidth: 170 },
  { key: "contact-decision-maker-opg", label: "Decision Maker/OPG", icon: Users, minWidth: 190 },
  { key: "contact-public-trustee", label: "Public Trustee", icon: Users, minWidth: 160 },
  { key: "contact-next-of-kin", label: "Next of Kin", icon: Users, minWidth: 150 },
  { key: "contact-consumables", label: "Consumables", icon: Users, minWidth: 160 },
  { key: "contact-cas-provider", label: "CAS Provider", icon: Users, minWidth: 160 },
  { key: "contact-sil-provider", label: "SIL Provider", icon: Users, minWidth: 160 },
]

const defaultVisibleKeys = allPropertyColumns.map((col) => col.key)


interface SavedView {
  id: string
  name: string
  columnKeys: string[]
}

export default function ClientsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { clients, isLoading, fetchError, hasMore, isLoadingMore, loadMore, addClient, updateClient, updateParticipantField, updateParticipantFields, refetch } = useClients()
  const { getContactsForClient, addContact } = useContacts()
  const { participantDisabled } = useFieldConfig()
  const staffNames = useAssignableCoordinators()
  const { canManageClients, canAssignClients, isSupportWorker } = usePermissions()
  const currentStaffId = useCurrentStaffId()
  const { getStatus: getSuitabilityStatus } = useSuitabilityContext()
  const { tasks: allTasks } = useTasks()

  const availablePropertyColumns = useMemo(
    () => allPropertyColumns.filter((col) => !participantDisabled.has(col.key)),
    [participantDisabled]
  )

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedCell, setSelectedCell] = useState<TableCellSelection | null>(null)
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(defaultVisibleKeys)
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [columnMenuKey, setColumnMenuKey] = useState<string | null>(null)
  const [columnMenuPos, setColumnMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [isCreateViewOpen, setIsCreateViewOpen] = useState(false)
  const [newViewName, setNewViewName] = useState("")
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false)
  const [newClientName, setNewClientName] = useState("")
  const [viewContextMenu, setViewContextMenu] = useState<{ viewId: string; x: number; y: number } | null>(null)
  const [deleteViewConfirm, setDeleteViewConfirm] = useState<SavedView | null>(null)
  const [listFilters, setListFilters] = useState<ClientListFilterState>(emptyClientListFilters)
  const displayBtnRef = useRef<HTMLButtonElement>(null)
  const viewNameInputRef = useRef<HTMLInputElement>(null)

  const applySavedView = useCallback((view: SavedView) => {
    setVisibleColumnKeys(
      Array.isArray(view.columnKeys) && view.columnKeys.length > 0
        ? view.columnKeys
        : defaultVisibleKeys
    )
  }, [])

  const resetSavedViewState = useCallback(() => {
    setVisibleColumnKeys(defaultVisibleKeys)
  }, [])

  const {
    savedViews,
    activeViewId,
    createView,
    selectView,
    selectDefaultView,
    deleteView,
    syncActiveView,
  } = useSavedViews<SavedView>({
    viewsStorageKey: "client-views",
    activeViewStorageKey: "client-active-view",
    buildView: ({ id, name }) => ({
      id,
      name,
      columnKeys: [...visibleColumnKeys],
    }),
    applyView: applySavedView,
    resetState: resetSavedViewState,
    syncView: (view) => ({
      ...view,
      columnKeys: [...visibleColumnKeys],
    }),
    defaultColumnKeys: defaultVisibleKeys,
  })

  useEffect(() => {
    syncActiveView()
  }, [syncActiveView, visibleColumnKeys])

  const visibleColumns = (Array.isArray(visibleColumnKeys) ? visibleColumnKeys : defaultVisibleKeys)
    .filter((key) => !participantDisabled.has(key))
    .map((key) => allPropertyColumns.find((col) => col.key === key))
    .filter(Boolean) as typeof allPropertyColumns

  const displayFields = useMemo(
    () => availablePropertyColumns.map((col) => ({ key: col.key, label: col.label })),
    [availablePropertyColumns]
  )

  const { getWidth, handleMouseDown: handleColResize } = useColumnResize(
    visibleColumns.map((c) => c.key),
    { minWidth: 80, maxWidth: 500, defaultWidth: 200 }
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

  const handleCreateView = () => {
    const createdView = createView(newViewName)
    if (!createdView) return
    setNewViewName("")
    setIsCreateViewOpen(false)
  }

  const handleSelectView = (view: SavedView) => {
    selectView(view)
  }

  const handleSelectAllView = () => {
    selectDefaultView()
  }

  const handleDeleteView = (viewId: string) => {
    deleteView(viewId)
    setDeleteViewConfirm(null)
  }

  const getParticipantData = useCallback((client: Client): ParticipantDetails => {
    return client.participant
  }, [])

  const handleUpdateField = useCallback((clientId: string, field: keyof ParticipantDetails, value: string) => {
    updateParticipantField(clientId, field, value)
  }, [updateParticipantField])

  const handleUpdateFields = useCallback((clientId: string, fields: Partial<ParticipantDetails>) => {
    updateParticipantFields(clientId, fields)
  }, [updateParticipantFields])

  // Resolve the open panel's client from live context data so optimistic
  // edits (e.g. participant name fields) appear immediately and persist,
  // instead of reverting to the stale snapshot captured when the row was clicked.
  const openClient = useMemo(
    () => (selectedClient ? clients.find((c) => c.id === selectedClient.id) ?? selectedClient : null),
    [selectedClient, clients]
  )

  const handleCreateClient = async () => {
    const name = newClientName.trim()
    if (!name) return
    const names = name.split(/\s+/)
    const firstName = names[0] || ""
    const lastName = names.length > 1 ? names[names.length - 1] : ""

    const result = await addClient({
      name,
      iconText: name[0]?.toUpperCase() || "?",
      participant: { firstName, lastName },
    })
    if (result) toast("Client created", "success")

    setNewClientName("")
    setIsCreateClientOpen(false)
  }

  const csvColumns = useMemo(() => [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "preferredName", label: "Preferred Name" },
    { key: "dateOfBirth", label: "Date of Birth" },
    { key: "gender", label: "Gender" },
    { key: "pronouns", label: "Pronouns" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "ndisNumber", label: "NDIS Number" },
    { key: "medicareNumber", label: "Medicare Number" },
    { key: "centrelinkNumber", label: "Centrelink Number" },
    { key: "externalId", label: "External ID" },
    { key: "primaryDiagnosis", label: "Primary Diagnosis" },
    { key: "secondaryDiagnosis", label: "Secondary Diagnosis" },
    { key: "ethnicity", label: "Ethnicity" },
    { key: "language", label: "Language" },
    { key: "fundingType", label: "Funding Type" },
    { key: "planManagerName", label: "Plan Manager Name" },
    { key: "planManagerEmail", label: "Plan Manager Email" },
    { key: "planManagerOrg", label: "Plan Manager Org" },
    { key: "planStartDate", label: "Plan Start Date" },
    { key: "planEndDate", label: "Plan End Date" },
    { key: "serviceCommencementDate", label: "Service Start" },
    { key: "serviceExitDate", label: "Service Exit" },
    ...contactCsvColumns,
  ], [])

  const tableKeyToCsvKey: Record<string, string> = useMemo(() => ({
    ndisNumber: "ndisNumber", diagnosis: "primaryDiagnosis",
    email: "email", phone: "phone",
    dob: "dateOfBirth", gender: "gender", pronouns: "pronouns",
    ethnicity: "ethnicity", language: "language", preferredName: "preferredName",
    medicareNumber: "medicareNumber", centrelinkNumber: "centrelinkNumber",
    externalId: "externalId", preferredContactMethod: "preferredContactMethod",
    preferredSignMethod: "preferredSignMethod",
    serviceCommencementDate: "serviceCommencementDate", serviceExitDate: "serviceExitDate",
  }), [])

  const exportCsvColumns = useMemo(() => [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "middleName", label: "Middle Name" },
    { key: "dateOfBirth", label: "Date of Birth" },
    { key: "gender", label: "Gender" },
    { key: "pronouns", label: "Pronouns" },
    { key: "email", label: "Email" },
    { key: "mobile", label: "Mobile" },
    { key: "phone", label: "Phone" },
    { key: "ndisNumber", label: "NDIS Number" },
    { key: "fundingType", label: "Funding Type" },
    { key: "primaryDiagnosis", label: "Primary Diagnosis" },
    { key: "secondaryDiagnosis", label: "Secondary Diagnosis" },
    { key: "language", label: "Language" },
    { key: "ethnicity", label: "Ethnicity" },
    { key: "preferredContactMethod", label: "Preferred Contact Method" },
    { key: "medicareNumber", label: "Medicare Number" },
    { key: "centrelinkNumber", label: "Centrelink Number" },
    { key: "externalId", label: "External ID" },
    { key: "planManagerName", label: "Plan Manager Name" },
    { key: "planManagerEmail", label: "Plan Manager Email" },
    { key: "planManagerOrg", label: "Plan Manager Organisation" },
    { key: "checkInPeriod", label: "Check-in Period" },
    { key: "coordinator", label: "Coordinator" },
  ], [])

  const getNextCheckUp = useCallback((clientId: string, clientName: string): string | null => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const upcoming = allTasks
      .filter((t) => t.isCheckUp && (t.clientId === clientId || t.client === clientName) && t.status !== "done" && t.dueDate)
      .map((t) => ({ ...t, due: new Date(t.dueDate! + "T00:00:00") }))
      .filter((t) => t.due >= now)
      .sort((a, b) => a.due.getTime() - b.due.getTime())
    return upcoming.length > 0 ? upcoming[0].dueDate : null
  }, [allTasks])

  const activeClients = clients.filter((c) => c.status !== "archived")

  // Support workers only see participants marked "preferred" for them.
  const scopedClients = useMemo(() => {
    if (!isSupportWorker) return clients
    if (!currentStaffId) return []
    return clients.filter((client) => getSuitabilityStatus(currentStaffId, client.id) === "preferred")
  }, [clients, isSupportWorker, currentStaffId, getSuitabilityStatus])

  const uniqueStatuses = useMemo(() => [...new Set(scopedClients.map((c) => c.status))].sort(), [scopedClients])
  const uniqueCoordinators = useMemo(() => [...new Set(scopedClients.map((c) => c.owner).filter(Boolean))].sort(), [scopedClients])

  const clientFilterDefinitions = useMemo<TableFilterDefinition[]>(() => [
    { key: "status", label: "Status", icon: Tag },
    { key: "coordinator", label: "Coordinator", icon: User },
    { key: "fundingType", label: "Funding type", icon: DollarSign },
    { key: "gender", label: "Gender", icon: User },
    { key: "language", label: "Language", icon: Languages },
    { key: "checkUp", label: "Check-up", icon: Clock },
    { key: "budget", label: "Budget", icon: FileText },
  ], [])

  const clientFilterOptions = useMemo(() => ({
    status: uniqueStatuses,
    coordinator: uniqueCoordinators,
    fundingType: uniqueNonEmpty(scopedClients.map((c) => c.participant.fundingType)),
    gender: uniqueNonEmpty(scopedClients.map((c) => c.participant.gender)),
    language: uniqueNonEmpty(scopedClients.map((c) => c.participant.language)),
    checkUp: [...CLIENT_CHECK_UP_OPTIONS],
    budget: [...CLIENT_BUDGET_OPTIONS],
  }), [scopedClients, uniqueCoordinators, uniqueStatuses])

  const formatClientFilterOption = useCallback((key: string, value: string) => {
    if (key === "checkUp") return CLIENT_CHECK_UP_LABELS[value as keyof typeof CLIENT_CHECK_UP_LABELS] ?? value
    if (key === "budget") return CLIENT_BUDGET_LABELS[value] ?? value
    if (key === "fundingType") return CLIENT_FUNDING_LABELS[value] ?? value
    if (key === "status") return value.charAt(0).toUpperCase() + value.slice(1)
    return value
  }, [])

  const handleFilterChange = useCallback((key: string, values: string[]) => {
    setListFilters((prev) => ({ ...prev, [key]: values }))
  }, [])

  const filteredClients = useMemo(() => {
    const filtered = filterClients(scopedClients, listFilters, getNextCheckUp)
    if (!searchQuery.trim()) return filtered
    return filtered.filter((client) =>
      matchesTableSearch(
        searchQuery,
        client.displayName,
        client.name,
        client.owner,
        client.participant.email,
        client.participant.mobile,
        client.participant.phone,
        client.participant.ndisNumber,
        client.status
      )
    )
  }, [scopedClients, listFilters, getNextCheckUp, searchQuery])

  const exportCsvData = useMemo(() =>
    activeClients.map((c) => {
      const p = c.participant
      return {
        firstName: p.firstName || "",
        lastName: p.lastName || "",
        middleName: p.middleName || "",
        dateOfBirth: p.dateOfBirth || "",
        gender: p.gender || "",
        pronouns: p.pronouns || "",
        email: p.email || "",
        mobile: p.mobile || "",
        phone: p.phone || "",
        ndisNumber: p.ndisNumber || "",
        fundingType: p.fundingType || "",
        primaryDiagnosis: p.primaryDiagnosis || "",
        secondaryDiagnosis: p.secondaryDiagnosis || "",
        language: p.language || "",
        ethnicity: p.ethnicity || "",
        preferredContactMethod: p.preferredContactMethod || "",
        medicareNumber: p.medicareNumber || "",
        centrelinkNumber: p.centrelinkNumber || "",
        externalId: p.externalId || "",
        planManagerName: p.planManagerName || "",
        planManagerEmail: p.planManagerEmail || "",
        planManagerOrg: p.planManagerOrg || "",
        checkInPeriod: p.checkInPeriod || "",
        coordinator: c.owner || "",
      }
    }),
    [activeClients]
  )

  const handleCsvImport = useCallback(async (rows: Record<string, string>[]) => {
    let contactCount = 0
    for (const row of rows) {
      const firstName = row.firstName || ""
      const lastName = row.lastName || ""
      const name = [firstName, lastName].filter(Boolean).join(" ") || "Unnamed"
      const created = await addClient({
        name,
        iconText: name[0]?.toUpperCase() || "?",
        participant: {
          firstName, lastName,
          preferredName: row.preferredName || "",
          dateOfBirth: row.dateOfBirth || "",
          gender: row.gender || "",
          pronouns: row.pronouns || "",
          email: row.email || "",
          mobile: row.mobile || "",
          phone: row.phone || "",
          ndisNumber: row.ndisNumber || "",
          medicareNumber: row.medicareNumber || "",
          centrelinkNumber: row.centrelinkNumber || "",
          externalId: row.externalId || "",
          primaryDiagnosis: row.primaryDiagnosis || "",
          secondaryDiagnosis: row.secondaryDiagnosis || "",
          ethnicity: row.ethnicity || "",
          language: row.language || "",
          fundingType: (row.fundingType as ParticipantDetails["fundingType"]) || "",
          planManagerName: row.planManagerName || "",
          planManagerEmail: row.planManagerEmail || "",
          planManagerOrg: row.planManagerOrg || "",
          planStartDate: row.planStartDate || "",
          planEndDate: row.planEndDate || "",
          serviceCommencementDate: row.serviceCommencementDate || "",
          serviceExitDate: row.serviceExitDate || "",
        },
      })

      if (created) {
        const contacts = parseContactsFromCsvRow(row, { id: created.id, name: created.name })
        for (const contact of contacts) {
          const result = await addContact(contact)
          if (result) contactCount++
        }
      }
    }
    const clientMsg = `${rows.length} client${rows.length > 1 ? "s" : ""} imported`
    const contactMsg = contactCount > 0 ? ` with ${contactCount} contact${contactCount > 1 ? "s" : ""}` : ""
    toast(`${clientMsg}${contactMsg}`, "success")
  }, [addClient, addContact, toast])

  const tableMinWidth = visibleColumns.reduce((sum, col) => sum + getWidth(col.key, col.minWidth), 240)
  if (isLoading) return <PageLoader label="Loading clients…" />
  if (fetchError) return <PageError message="Failed to load clients" onRetry={refetch} />

  return (
    <div className="relative flex h-full min-h-0">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PageTitleBar
          title="Clients"
          trailing={
            canManageClients ? (
              <button
                onClick={() => setIsCreateClientOpen(true)}
                className="primary-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
                tabIndex={0}
              >
                <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                <span className="hidden sm:inline">Add new</span>
              </button>
            ) : null
          }
        />

        {/* Saved views + actions */}
        <div className={listViewTabBarClass("h-[44px] justify-between gap-[8px]")}>
          <div className="folk-tab-bar folk-tab-scroll flex min-w-0 flex-1 items-stretch gap-0 overflow-x-auto overflow-y-visible">
            <ProfileTabButton
              variant="profile"
              showIcon
              isActive={activeViewId === null}
              onClick={handleSelectAllView}
              icon={Table2}
              label="All"
            />
            {savedViews.map((view) => (
              <ProfileTabButton
                key={view.id}
                variant="profile"
                showIcon
                isActive={activeViewId === view.id}
                onClick={() => handleSelectView(view)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setViewContextMenu({ viewId: view.id, x: e.clientX, y: e.clientY })
                }}
                icon={Table2}
                label={view.name}
              />
            ))}
            <button
              onClick={() => { setIsCreateViewOpen(true); setTimeout(() => viewNameInputRef.current?.focus(), 50) }}
              className="flex h-[24px] w-[24px] shrink-0 self-center items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
              aria-label="Add view"
              tabIndex={0}
            >
              <Plus className="h-[14px] w-[14px]" strokeWidth={1.5} />
            </button>
          </div>
          {canManageClients && (
            <div className="flex shrink-0 items-center gap-[8px] self-center">
              <CsvDropdown
                entityType="clients"
                columns={csvColumns}
                exportColumns={exportCsvColumns}
                data={exportCsvData}
                onImport={handleCsvImport}
              />
            </div>
          )}
        </div>

        <div className={listViewFilterBarClass()}>
          <TableMultiFilter
            filters={clientFilterDefinitions}
            values={listFilters}
            options={clientFilterOptions}
            onChange={handleFilterChange}
            formatOption={formatClientFilterOption}
          />
          <div className="ml-auto flex shrink-0 items-center gap-[8px]">
            <ExpandableTableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search clients…"
              ariaLabel="Search clients"
            />
            <TableDisplayPopover
              fields={displayFields}
              visibleKeys={visibleColumnKeys}
              onToggle={handleToggleColumn}
              onReset={() => setVisibleColumnKeys(defaultVisibleKeys)}
              isOpen={isDisplayOpen}
              onOpenChange={setIsDisplayOpen}
              buttonRef={displayBtnRef}
            />
          </div>
        </div>

        <div className={listViewBodyClass()}>
          <table className={TABLE_GRID} style={{ tableLayout: "fixed", width: tableMinWidth, minWidth: tableMinWidth }}>
            <thead>
              <tr>
                <th
                  className={`sticky left-0 top-0 z-40 ${TABLE_HEADER_STICKY_EDGE}`}
                  style={{ width: 240, minWidth: 240, maxWidth: 240 }}
                >
                  <span className="truncate">{filteredClients.length} clients</span>
                </th>
                {visibleColumns.map((col, i) => {
                  const ColIcon = col.icon
                  const isLast = i === visibleColumns.length - 1
                  const isFirst = i === 0
                  const isMenuOpen = columnMenuKey === col.key
                  return (
                    <th
                      key={col.key}
                      className={`group/col relative sticky top-0 z-20 ${isLast ? TABLE_HEADER_CELL_LAST : TABLE_HEADER_CELL}`}
                      style={{ width: getWidth(col.key, col.minWidth) }}
                    >
                      <div className="flex items-center gap-[6px]">
                        <ColIcon className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
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
                          className={`ml-auto flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] transition-all ${isMenuOpen ? "bg-[#ebebeb] text-folk-text opacity-100" : "text-folk-secondary opacity-0 hover:bg-[#ebebeb] hover:text-folk-text group-hover/col:opacity-100"}`}
                          tabIndex={0}
                          aria-label={`Column options for ${col.label}`}
                        >
                          <ChevronDown className="h-[12px] w-[12px]" strokeWidth={2} />
                        </button>
                      </div>
                      {isMenuOpen && columnMenuPos && (
                        <TableColumnMenuPortal
                          isOpen={isMenuOpen}
                          position={columnMenuPos}
                          onClose={() => { setColumnMenuKey(null); setColumnMenuPos(null) }}
                        >
                          <button
                            onClick={() => handleMoveColumn(col.key, "left")}
                            disabled={isFirst}
                            className={`flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium transition-colors ${isFirst ? "text-folk-placeholder" : "text-folk-text hover:bg-folk-hover"}`}
                            tabIndex={0}
                          >
                            <ArrowLeft className={`h-[15px] w-[15px] ${isFirst ? "text-[#ccc]" : "text-folk-secondary"}`} strokeWidth={1.75} />
                            <span>Move left</span>
                          </button>
                          <button
                            onClick={() => handleMoveColumn(col.key, "right")}
                            disabled={isLast}
                            className={`flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium transition-colors ${isLast ? "text-folk-placeholder" : "text-folk-text hover:bg-folk-hover"}`}
                            tabIndex={0}
                          >
                            <ArrowRight className={`h-[15px] w-[15px] ${isLast ? "text-[#ccc]" : "text-folk-secondary"}`} strokeWidth={1.75} />
                            <span>Move right</span>
                          </button>
                          <div className="my-[4px] border-t border-folk-border-subtle" />
                          <button
                            onClick={() => { handleToggleColumn(col.key); setColumnMenuKey(null); setColumnMenuPos(null) }}
                            className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                            tabIndex={0}
                          >
                            <EyeOff className="h-[15px] w-[15px] text-folk-secondary" strokeWidth={1.75} />
                            <span>Hide column</span>
                          </button>
                        </TableColumnMenuPortal>
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
              {filteredClients.map((client) => {
                const p = getParticipantData(client)
                const clientContacts = getContactsForClient(client.name, client.id)

                const getCellClass = (columnKey: string, isLast: boolean, extra = "") =>
                  [
                    isLast ? TABLE_CELL_LAST : TABLE_CELL_BASE,
                    "bg-folk-surface cursor-pointer",
                    TABLE_ROW_HOVER,
                    tableCellSelectionClass(selectedCell, client.id, columnKey),
                    extra,
                  ].filter(Boolean).join(" ")

                const handleCellClick = (columnKey: string) => {
                  setSelectedClient(client)
                  setSelectedCell({ rowId: client.id, columnKey })
                }

                const renderCell = (key: string, isLast: boolean) => {
                  const cls = getCellClass(key, isLast)
                  const onCellClick = () => handleCellClick(key)
                  const dash = <span className="text-folk-placeholder">—</span>
                  const textCls = `${cls} ${TABLE_TEXT_CELL}`
                  const wrapCell = (content: React.ReactNode) => (
                    <div className={TABLE_CELL_INNER}>{content}</div>
                  )

                  switch (key) {
                    case "status":
                      return (
                        <td key={key} className={cls} onClick={onCellClick}>
                          {wrapCell(<FolkStatusPill label={client.status} />)}
                        </td>
                      )
                    case "ndisNumber":
                      return <td key={key} className={cls} onClick={onCellClick}>{wrapCell(p.ndisNumber ? <span className={TABLE_CHIP}>{p.ndisNumber}</span> : dash)}</td>
                    case "diagnosis": {
                      const diagnoses = mergeDiagnoses(p.primaryDiagnosis, p.secondaryDiagnosis)
                        .split(",")
                        .map((dx) => dx.trim())
                        .filter(Boolean)
                      return (
                        <td key={key} className={cls} onClick={onCellClick}>
                          {wrapCell(
                            diagnoses.length > 0
                              ? diagnoses.map((dx) => <CategoryChip key={dx} label={dx} categoryKey={dx} size="sm" />)
                              : dash
                          )}
                        </td>
                      )
                    }
                    case "email":
                      return <td key={key} className={textCls} onClick={onCellClick}>{wrapCell(p.email || dash)}</td>
                    case "phone":
                      return <td key={key} className={textCls} onClick={onCellClick}>{wrapCell(p.phone || dash)}</td>
                    case "dob":
                      return (
                        <td key={key} className={textCls} onClick={onCellClick}>
                          {wrapCell(p.dateOfBirth ? new Date(p.dateOfBirth + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : dash)}
                        </td>
                      )
                    case "gender":
                      return <td key={key} className={textCls} onClick={onCellClick}>{wrapCell(p.gender || dash)}</td>
                    case "pronouns":
                      return <td key={key} className={textCls} onClick={onCellClick}>{wrapCell(p.pronouns || dash)}</td>
                    case "ethnicity":
                      return <td key={key} className={textCls} onClick={onCellClick}>{wrapCell(p.ethnicity || dash)}</td>
                    case "language":
                      return <td key={key} className={textCls} onClick={onCellClick}>{wrapCell(p.language || dash)}</td>
                    case "preferredName":
                      return <td key={key} className={textCls} onClick={onCellClick}>{wrapCell(p.preferredName || dash)}</td>
                    case "medicareNumber":
                      return <td key={key} className={cls} onClick={onCellClick}>{wrapCell(p.medicareNumber ? <span className={TABLE_CHIP}>{p.medicareNumber}</span> : dash)}</td>
                    case "centrelinkNumber":
                      return <td key={key} className={cls} onClick={onCellClick}>{wrapCell(p.centrelinkNumber ? <span className={TABLE_CHIP}>{p.centrelinkNumber}</span> : dash)}</td>
                    case "externalId":
                      return <td key={key} className={cls} onClick={onCellClick}>{wrapCell(p.externalId ? <span className={TABLE_CHIP}>{p.externalId}</span> : dash)}</td>
                    case "preferredContactMethod":
                      return <td key={key} className={textCls} onClick={onCellClick}>{wrapCell(p.preferredContactMethod || dash)}</td>
                    case "preferredSignMethod":
                      return <td key={key} className={textCls} onClick={onCellClick}>{wrapCell(p.preferredSignMethod || dash)}</td>
                    case "nextCheckUp": {
                      const nextDate = getNextCheckUp(client.id, client.name)
                      if (!nextDate) return <td key={key} className={textCls} onClick={onCellClick}>{wrapCell(dash)}</td>
                      const checkUpDate = new Date(nextDate + "T00:00:00")
                      const today = new Date(); today.setHours(0, 0, 0, 0)
                      const daysUntil = Math.ceil((checkUpDate.getTime() - today.getTime()) / 86400000)
                      const isOverdue = daysUntil < 0
                      const absDays = Math.abs(daysUntil)
                      const daysLabel = isOverdue
                        ? `${absDays}d overdue`
                        : daysUntil === 0
                          ? "Today"
                          : `${absDays}d left`
                      const chipColor = isOverdue
                        ? "bg-red-100 text-red-700"
                        : daysUntil <= 3
                          ? "bg-red-50 text-red-600"
                          : daysUntil <= 7
                            ? "bg-amber-50 text-amber-600"
                            : daysUntil <= 14
                              ? "bg-amber-50 text-amber-500"
                              : "bg-green-50 text-green-600"
                      return (
                        <td key={key} className={cls} onClick={onCellClick}>
                          {wrapCell(
                            <span className={`inline-flex h-[24px] shrink-0 items-center whitespace-nowrap rounded-[6px] px-[12px] text-[12px] font-medium ${chipColor}`}>
                              {daysLabel}
                            </span>
                          )}
                        </td>
                      )
                    }
                    case "serviceCommencementDate":
                      return (
                        <td key={key} className={textCls} onClick={onCellClick}>
                          {wrapCell(p.serviceCommencementDate ? new Date(p.serviceCommencementDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : dash)}
                        </td>
                      )
                    case "serviceExitDate":
                      return (
                        <td key={key} className={textCls} onClick={onCellClick}>
                          {wrapCell(p.serviceExitDate ? new Date(p.serviceExitDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : dash)}
                        </td>
                      )
                    case "budgets": {
                      const budgets = p.budgets || []
                      if (budgets.length === 0) return <td key={key} className={cls} onClick={onCellClick}>{wrapCell(dash)}</td>
                      return (
                        <td key={key} className={cls} onClick={onCellClick}>
                          {wrapCell(budgets.map((budget) => (
                            <CategoryChip key={budget.id} label={budget.name || "Budget"} categoryKey={budget.id} size="sm" />
                          )))}
                        </td>
                      )
                    }
                    default: {
                      if (key.startsWith("contact-")) {
                        const relKey = key.replace("contact-", "")
                        const matchingContacts = clientContacts.filter((c) => c.relationship === relKey)
                        return (
                          <td key={key} className={cls} onClick={onCellClick}>
                            {wrapCell(
                              matchingContacts.length > 0
                                ? matchingContacts.map((c) => <CategoryChip key={c.id} label={c.name} categoryKey={c.id} size="sm" />)
                                : dash
                            )}
                          </td>
                        )
                      }
                      return <td key={key} className={textCls} onClick={onCellClick}>{wrapCell(dash)}</td>
                    }
                  }
                }

                return (
                  <tr key={client.id} className="group">
                    <td
                      onClick={() => handleCellClick(TABLE_NAME_COLUMN_KEY)}
                      className={`sticky left-0 z-30 ${TABLE_CELL_STICKY_EDGE} cursor-pointer ${TABLE_ROW_HOVER} ${tableCellSelectionClass(selectedCell, client.id, TABLE_NAME_COLUMN_KEY)}`}
                      style={{ width: 240, minWidth: 240, maxWidth: 240 }}
                    >
                      <div className={`${TABLE_CELL_INNER} gap-[10px]`}>
                        <EntityIcon text={client.iconText} size="sm" />
                        <span className={`truncate ${TABLE_NAME_CELL}`}>{client.displayName}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.id}`) }}
                          className="ml-auto flex h-[22px] w-[22px] items-center justify-center rounded-[6px] opacity-0 transition-opacity group-hover:opacity-100 text-folk-secondary hover:bg-[var(--folk-border-subtle)] hover:text-folk-text"
                          aria-label={`Open ${client.displayName} full profile`}
                          tabIndex={0}
                        >
                          <ArrowUpRight className="h-[13px] w-[13px]" strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                    {visibleColumns.map((col, i) => renderCell(col.key, i === visibleColumns.length - 1))}
                  </tr>
                )
              })}
            </tbody>
            {canManageClients && (
              <TableAddFooterRow colSpan={visibleColumns.length}>
                <TableAddNewButton onClick={() => setIsCreateClientOpen(true)} />
              </TableAddFooterRow>
            )}
          </table>
          {hasMore && (
            <div className="flex justify-center py-[16px]">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="text-[13px] font-medium text-folk-secondary transition-colors hover:text-folk-text disabled:opacity-50"
                tabIndex={0}
              >
                {isLoadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      </div>

      {openClient && (
        <ClientProfilePanel
          client={openClient}
          participantData={getParticipantData(openClient)}
          onUpdateField={(field, value) => handleUpdateField(openClient.id, field, value)}
          onUpdateFields={(fields) => handleUpdateFields(openClient.id, fields)}
          onClose={() => { setSelectedClient(null); setSelectedCell(null) }}
          staffNames={staffNames}
          canAssignClients={canAssignClients}
          onAssign={(name) => updateClient(openClient.id, { owner: name })}
        />
      )}

      {isCreateViewOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20" onClick={() => { setIsCreateViewOpen(false); setNewViewName("") }} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-[6px] bg-folk-surface p-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-folk-text">Create a view for account</h3>
              <button
                onClick={() => { setIsCreateViewOpen(false); setNewViewName("") }}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.75} />
              </button>
            </div>
            <div className="mt-[20px]">
              <label className="text-[13px] font-medium text-folk-secondary">Name</label>
              <input
                ref={viewNameInputRef}
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateView() }}
                placeholder="Enter name here"
                className="mt-[8px] w-full rounded-[6px] border border-folk-border bg-folk-surface px-[12px] py-[10px] text-[13px] font-medium text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
              />
            </div>
            <div className="mt-[20px] flex items-center justify-end gap-[12px]">
              <button
                onClick={() => { setIsCreateViewOpen(false); setNewViewName("") }}
                className="px-[12px] py-[6px] text-[13px] font-medium text-folk-text transition-colors hover:text-folk-secondary"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateView}
                disabled={!newViewName.trim()}
                className={`rounded-full px-[16px] py-[6px] text-[13px] font-medium transition-colors ${newViewName.trim() ? "primary-btn" : "border border-folk-border text-folk-placeholder"}`}
                tabIndex={0}
              >
                Create
              </button>
            </div>
          </div>
        </>
      )}

      {isCreateClientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => { setIsCreateClientOpen(false); setNewClientName("") }} />
          <div className="relative z-10 w-[440px] rounded-[6px] bg-folk-surface shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between px-[24px] pt-[20px]">
              <div className="flex items-center gap-[8px]">
                <FileText className="h-[16px] w-[16px] text-[#555]" strokeWidth={1.5} />
                <h2 className="text-[15px] font-semibold text-folk-text">Create client</h2>
              </div>
              <button
                onClick={() => { setIsCreateClientOpen(false); setNewClientName("") }}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="px-[24px] pb-[20px] pt-[16px]">
              <div className="mb-[16px]">
                <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Name</label>
                <input
                  type="text"
                  placeholder="Client name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateClient() }}
                  className="w-full border-b border-folk-border pb-[8px] text-[13px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none transition-colors focus:border-[#a3c4f3]"
                  autoFocus
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreateClient}
                  disabled={!newClientName.trim()}
                  className={`text-[13px] font-medium transition-colors ${newClientName.trim() ? "text-folk-text hover:text-[#555]" : "text-folk-placeholder"}`}
                  tabIndex={0}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewContextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setViewContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setViewContextMenu(null) }} />
          <div
            className="fixed z-50 w-[160px] overflow-hidden rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-folk"
            style={{ top: viewContextMenu.y, left: viewContextMenu.x }}
          >
            <button
              onClick={() => {
                const view = savedViews.find((v) => v.id === viewContextMenu.viewId)
                if (view) setDeleteViewConfirm(view)
                setViewContextMenu(null)
              }}
              className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
              tabIndex={0}
            >
              <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
              Delete view
            </button>
          </div>
        </>
      )}

      {deleteViewConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setDeleteViewConfirm(null)} />
          <div className="relative z-10 w-[400px] rounded-[6px] bg-folk-surface p-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <h3 className="text-[15px] font-semibold text-folk-text">Delete view</h3>
            <p className="mt-[8px] text-[13px] font-medium text-folk-secondary">
              Are you sure you want to delete <span className="text-folk-text">&ldquo;{deleteViewConfirm.name}&rdquo;</span>? This action cannot be undone.
            </p>
            <div className="mt-[20px] flex items-center justify-end gap-[12px]">
              <button
                onClick={() => setDeleteViewConfirm(null)}
                className="px-[12px] py-[6px] text-[13px] font-medium text-folk-text transition-colors hover:text-folk-secondary"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteView(deleteViewConfirm.id)}
                className="rounded-[6px] bg-red-500 px-[16px] py-[6px] text-[13px] font-medium text-white transition-colors hover:bg-red-600"
                tabIndex={0}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
