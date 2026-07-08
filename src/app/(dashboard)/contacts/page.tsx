"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import {
  Handshake,
  Plus,
  Table2,
  UserRound,
  Building2,
  Mail,
  Phone,
  ChevronDown,
  X,
  UserPlus,
  SlidersHorizontal,
} from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"
import { ListViewToolbar } from "@/components/list-view-toolbar"
import { PageTitleBar } from "@/components/page-title-bar"
import { listViewBodyClass, pageNavTabsScrollClass } from "@/components/tab-active-indicator"
import { useContacts } from "@/lib/hooks/use-contacts"
import { useClients } from "@/lib/hooks/use-clients"
import { useFieldConfig } from "@/lib/hooks/use-field-config"
import { useListQueryState } from "@/lib/hooks/use-list-query-state"
import { useSavedViews } from "@/lib/hooks/use-saved-views"
import { useColumnResize } from "@/lib/hooks/use-column-resize"
import {
  applyListQuery,
  CONTACT_QUERY_FIELDS,
  matchContactFilter,
  type ListQuerySort,
} from "@/lib/list-query"
import type { TableFilterDefinition } from "@/components/table-multi-filter"
import { relationshipConfig } from "@/lib/types"
import { CategoryChip } from "@/components/category-chip"
import { CsvDropdown } from "@/components/csv-dropdown"
import { FixedDropdownMenu } from "@/components/fixed-dropdown-menu"
import { PageLoader, PageError } from "@/components/page-state"
import {
  TABLE_CELL_BASE,
  TABLE_CELL_INNER,
  TABLE_CELL_LAST,
  TABLE_CHIP,
  TABLE_FULL,
  TABLE_HEADER_CELL,
  TABLE_HEADER_CELL_LAST,
  TABLE_TEXT_CELL,
} from "@/lib/table-styles"
import { useToast } from "@/components/toast"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { TableAddFooterRow, TableAddNewButton } from "@/components/table-add-row"
import { DisplayFieldList, TableDisplayPopover } from "@/components/display-popover"

const allColumns = [
  { key: "name", label: "Name", icon: UserRound, isSystem: true },
  { key: "client", label: "Client", icon: Building2 },
  { key: "relationship", label: "Relationship", icon: Handshake },
  { key: "email", label: "Email", icon: Mail },
  { key: "phone", label: "Phone number", icon: Phone },
]

const defaultVisibleKeys = allColumns.map((c) => c.key)

interface SavedView {
  id: string
  name: string
  columnKeys: string[]
  displayRelationships: string[]
  filters: Record<string, string[]>
  search: string
  sort: ListQuerySort | null
}

export default function ContactsPage() {
  const { toast } = useToast()
  const { contacts, isLoading, fetchError, hasMore, isLoadingMore, loadMore, addContact, refetch } = useContacts()
  const { clients, clientNames } = useClients()
  const { contactDisabled } = useFieldConfig()

  const availablePropertyColumns = useMemo(
    () => allColumns.filter((col) => !col.isSystem && !contactDisabled.has(col.key)),
    [contactDisabled]
  )

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRelationshipOpen, setIsRelationshipOpen] = useState(false)
  const [isClientOpen, setIsClientOpen] = useState(false)
  const [newContact, setNewContact] = useState({ name: "", clientName: "", clientId: null as string | null, relationship: "", email: "", phone: "" })
  const relationshipRef = useRef<HTMLButtonElement>(null)
  const clientRef = useRef<HTMLButtonElement>(null)

  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(defaultVisibleKeys)
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const [displayRelationships, setDisplayRelationships] = useState<string[]>([])

  const {
    state: queryState,
    setSearch,
    setFilters,
    setSort,
    handleFilterChange,
    handleSelectSort,
    clearSort,
  } = useListQueryState()

  const [isCreateViewOpen, setIsCreateViewOpen] = useState(false)
  const [newViewName, setNewViewName] = useState("")
  const [viewContextMenu, setViewContextMenu] = useState<{ viewId: string; x: number; y: number } | null>(null)
  const [deleteViewConfirm, setDeleteViewConfirm] = useState<SavedView | null>(null)

  const displayBtnRef = useRef<HTMLButtonElement>(null)
  const viewNameInputRef = useRef<HTMLInputElement>(null)

  const applySavedView = useCallback((view: SavedView) => {
    setVisibleColumnKeys(
      Array.isArray(view.columnKeys) && view.columnKeys.length > 0
        ? view.columnKeys
        : defaultVisibleKeys
    )
    setDisplayRelationships(Array.isArray(view.displayRelationships) ? view.displayRelationships : [])
    setFilters(view.filters && typeof view.filters === "object" ? view.filters : {})
    setSearch(typeof view.search === "string" ? view.search : "")
    setSort(view.sort ?? null)
  }, [setFilters, setSearch, setSort])

  const resetSavedViewState = useCallback(() => {
    setVisibleColumnKeys(defaultVisibleKeys)
    setDisplayRelationships([])
    setFilters({})
    setSearch("")
    setSort(null)
  }, [setFilters, setSearch, setSort])

  const {
    savedViews,
    activeViewId,
    createView,
    selectView,
    selectDefaultView,
    deleteView,
    syncActiveView,
  } = useSavedViews<SavedView>({
    viewsStorageKey: "contact-views",
    activeViewStorageKey: "contact-active-view",
    buildView: ({ id, name }) => ({
      id,
      name,
      columnKeys: [...visibleColumnKeys],
      displayRelationships: [...displayRelationships],
      filters: { ...queryState.filters },
      search: queryState.search,
      sort: queryState.sort,
    }),
    applyView: applySavedView,
    resetState: resetSavedViewState,
    syncView: (view) => ({
      ...view,
      columnKeys: [...visibleColumnKeys],
      displayRelationships: [...displayRelationships],
      filters: { ...queryState.filters },
      search: queryState.search,
      sort: queryState.sort,
    }),
    defaultColumnKeys: defaultVisibleKeys,
  })

  useEffect(() => {
    syncActiveView()
  }, [displayRelationships, queryState.filters, queryState.search, queryState.sort, syncActiveView, visibleColumnKeys])

  const safeVisibleColumnKeys = Array.isArray(visibleColumnKeys) ? visibleColumnKeys : defaultVisibleKeys

  const visibleColumns = safeVisibleColumnKeys
    .filter((key) => key === "name" || !contactDisabled.has(key))
    .map((key) => allColumns.find((col) => col.key === key))
    .filter(Boolean) as typeof allColumns

  const displayFields = useMemo(
    () =>
      allColumns
        .filter((col) => !contactDisabled.has(col.key))
        .map((col) => ({ key: col.key, label: col.label, locked: col.key === "name" })),
    [contactDisabled]
  )

  const relationshipFields = useMemo(
    () => Object.entries(relationshipConfig).map(([key, config]) => ({ key, label: config.label })),
    []
  )

  const allRelationshipKeys = useMemo(() => relationshipFields.map((field) => field.key), [relationshipFields])

  const visibleRelationshipKeys = displayRelationships.length === 0 ? allRelationshipKeys : displayRelationships

  const handleRelationshipDisplayToggle = useCallback((key: string) => {
    const current = displayRelationships.length === 0 ? allRelationshipKeys : displayRelationships
    if (current.includes(key)) {
      setDisplayRelationships(current.filter((k) => k !== key))
      return
    }
    const next = [...current, key]
    setDisplayRelationships(next.length === allRelationshipKeys.length ? [] : next)
  }, [allRelationshipKeys, displayRelationships])

  const { getWidth, handleMouseDown: handleColResize } = useColumnResize(
    visibleColumns.map((c) => c.key),
    { minWidth: 80, maxWidth: 500, defaultWidth: 200 }
  )

  const handleToggleColumn = useCallback((key: string) => {
    setVisibleColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }, [])

  const uniqueClientNames = useMemo(
    () => [...new Set(contacts.map((c) => c.clientName).filter(Boolean))].sort(),
    [contacts],
  )
  const uniqueRelationships = useMemo(
    () => [...new Set(contacts.map((c) => c.relationship).filter(Boolean))].sort(),
    [contacts],
  )

  const contactFilters: TableFilterDefinition[] = useMemo(
    () => [
      { key: "client", label: "Client", icon: Building2 },
      { key: "relationship", label: "Relationship", icon: Handshake },
    ],
    [],
  )

  const filterOptions = useMemo(
    () => ({
      client: uniqueClientNames,
      relationship: uniqueRelationships,
    }),
    [uniqueClientNames, uniqueRelationships],
  )

  const sortFields = useMemo(
    () =>
      CONTACT_QUERY_FIELDS.filter((field) => field.sortable !== false).map((field) => ({
        key: field.key,
        label: field.label,
      })),
    [],
  )

  const formatFilterOption = useCallback((filterKey: string, value: string) => {
    if (filterKey === "relationship") return relationshipConfig[value]?.label ?? value
    return value
  }, [])

  const queriedContacts = useMemo(
    () =>
      applyListQuery(contacts, queryState, {
        fields: CONTACT_QUERY_FIELDS,
        matchFilter: matchContactFilter,
      }),
    [contacts, queryState],
  )

  const filteredContacts = useMemo(() => {
    if (displayRelationships.length === 0) return queriedContacts
    return queriedContacts.filter((contact) => displayRelationships.includes(contact.relationship))
  }, [displayRelationships, queriedContacts])

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

  const handleCreate = async () => {
    if (!newContact.name) return
    const result = await addContact({ ...newContact, clientId: newContact.clientId })
    if (result) toast("Contact created", "success")
    setNewContact({ name: "", clientName: "", clientId: null, relationship: "", email: "", phone: "" })
    setIsModalOpen(false)
    setIsRelationshipOpen(false)
    setIsClientOpen(false)
  }

  const csvColumns = useMemo(() => [
    { key: "name", label: "Name" },
    { key: "clientName", label: "Client" },
    { key: "relationship", label: "Relationship" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
  ], [])

  const exportCsvColumns = useMemo(() =>
    visibleColumnKeys
      .map((k) => allColumns.find((c) => c.key === k))
      .filter(Boolean)
      .map((c) => ({ key: c!.key === "client" ? "clientName" : c!.key, label: c!.label })),
    [visibleColumnKeys]
  )

  const exportCsvData = useMemo(() =>
    filteredContacts.map((c) => ({
      name: c.name,
      clientName: c.clientName,
      relationship: relationshipConfig[c.relationship]?.label || c.relationship,
      email: c.email,
      phone: c.phone,
    })),
    [filteredContacts]
  )

  const handleCsvImport = useCallback(async (rows: Record<string, string>[]) => {
    const relLabelToKey = new Map<string, string>()
    for (const [key, cfg] of Object.entries(relationshipConfig)) {
      relLabelToKey.set(cfg.label.toLowerCase(), key)
    }

    for (const row of rows) {
      const name = row.name || ""
      if (!name) continue
      const clientName = row.clientName || ""
      const matchedClient = clients.find((c) => c.displayName === clientName || c.name === clientName)
      const rawRel = (row.relationship || "").toLowerCase()
      const relationship = relLabelToKey.get(rawRel) || row.relationship || ""
      await addContact({
        name,
        clientName: matchedClient?.displayName || clientName,
        clientId: matchedClient?.id || null,
        relationship,
        email: row.email || "",
        phone: row.phone || "",
      })
    }
    toast(`${rows.length} contact${rows.length > 1 ? "s" : ""} imported`, "success")
  }, [addContact, clients, toast])

  if (isLoading) return <PageLoader label="Loading contacts…" />
  if (fetchError) return <PageError message="Failed to load contacts" onRetry={refetch} />

  return (
    <div className="flex h-full flex-col">
      <PageTitleBar
        title="Contacts"
        trailing={
          <button
            onClick={() => setIsModalOpen(true)}
            className="primary-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
            tabIndex={0}
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Add new</span>
          </button>
        }
      />
      {/* View tabs */}
      <div className="flex h-[44px] shrink-0 items-stretch justify-between gap-[8px] border-b border-folk-border bg-white px-[16px]">
        <div className={pageNavTabsScrollClass()}>
          <div className="folk-tab-bar flex items-stretch gap-0 overflow-y-visible">
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
        </div>
        <div className="flex items-center gap-[8px]">
          <CsvDropdown
            entityType="contacts"
            columns={csvColumns}
            exportColumns={exportCsvColumns}
            data={exportCsvData}
            onImport={handleCsvImport}
          />
        </div>
      </div>

      <ListViewToolbar
        filters={contactFilters}
        filterValues={queryState.filters}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        formatFilterOption={formatFilterOption}
        search={queryState.search}
        onSearchChange={setSearch}
        searchPlaceholder="Search contacts…"
        searchAriaLabel="Search contacts"
        sortFields={sortFields}
        sort={queryState.sort}
        onSelectSort={handleSelectSort}
        onClearSort={clearSort}
        trailing={
          <TableDisplayPopover
            fields={displayFields}
            visibleKeys={visibleColumnKeys}
            onToggle={handleToggleColumn}
            onReset={() => {
              setVisibleColumnKeys(defaultVisibleKeys)
              setDisplayRelationships([])
            }}
            isOpen={isDisplayOpen}
            onOpenChange={setIsDisplayOpen}
            buttonRef={displayBtnRef}
            triggerHiddenCount={
              displayFields.filter((field) => !field.locked && !safeVisibleColumnKeys.includes(field.key)).length
              + allRelationshipKeys.length
              - visibleRelationshipKeys.length
            }
            bottomContent={
              <DisplayFieldList
                fields={relationshipFields}
                visibleKeys={visibleRelationshipKeys}
                onToggle={handleRelationshipDisplayToggle}
                showSearch={false}
                headerLabel={`Relationships · ${allRelationshipKeys.length - visibleRelationshipKeys.length} hidden ${allRelationshipKeys.length - visibleRelationshipKeys.length === 1 ? "field" : "fields"}`}
              />
            }
          />
        }
      />

      {/* Table */}
      <div className={listViewBodyClass()}>
        <table className={TABLE_FULL} style={{ tableLayout: "fixed", minWidth: visibleColumns.reduce((sum, col) => sum + getWidth(col.key, 200), 0) }}>
          <thead>
            <tr>
              {visibleColumns.map((col, i) => {
                const ColIcon = col.icon
                const isLast = i === visibleColumns.length - 1
                return (
                  <th
                    key={col.key}
                    className={`group/col relative sticky top-0 z-20 ${isLast ? TABLE_HEADER_CELL_LAST : TABLE_HEADER_CELL}`}
                    style={{ width: getWidth(col.key, 200) }}
                  >
                    <div className="flex items-center gap-[6px]">
                      <ColIcon className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                      <span className="truncate">{col.label}</span>
                    </div>
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
            {filteredContacts.map((contact) => {
              const rel = relationshipConfig[contact.relationship] ?? { label: contact.relationship || "—", color: "bg-gray-50 text-gray-600", dotColor: "bg-gray-400" }
              const initials = contact.name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase()
              const dash = <span className="text-folk-placeholder">—</span>

              const renderCell = (key: string, isLast: boolean) => {
                const cls = isLast
                  ? `${TABLE_CELL_LAST} bg-folk-surface group-hover:bg-[#fafafa]`
                  : `${TABLE_CELL_BASE} bg-folk-surface group-hover:bg-[#fafafa]`
                const textCls = `${cls} ${TABLE_TEXT_CELL}`
                const wrapCell = (content: React.ReactNode) => (
                  <div className={TABLE_CELL_INNER}>{content}</div>
                )

                switch (key) {
                  case "name":
                    return (
                      <td key={key} className={textCls}>
                        {wrapCell(
                          <>
                            <EntityIcon text={initials} size="sm" />
                            <span className="truncate">{contact.name}</span>
                          </>
                        )}
                      </td>
                    )
                  case "client":
                    return <td key={key} className={cls}>{wrapCell(contact.clientName ? <CategoryChip label={contact.clientName} categoryKey={contact.clientName} size="sm" /> : dash)}</td>
                  case "relationship":
                    return <td key={key} className={cls}>{wrapCell(contact.relationship ? <CategoryChip label={rel.label} categoryKey={contact.relationship} size="sm" /> : <span className={`${TABLE_TEXT_CELL} text-folk-placeholder`}>—</span>)}</td>
                  case "email":
                    return <td key={key} className={textCls}>{wrapCell(contact.email || dash)}</td>
                  case "phone":
                    return <td key={key} className={textCls}>{wrapCell(contact.phone || dash)}</td>
                  default:
                    return <td key={key} className={textCls}>{wrapCell(dash)}</td>
                }
              }

              return (
                <tr key={contact.id} className="group transition-colors hover:bg-folk-hover">
                  {visibleColumns.map((col, i) => renderCell(col.key, i === visibleColumns.length - 1))}
                </tr>
              )
            })}
          </tbody>
          <TableAddFooterRow colSpan={visibleColumns.length} stickyFirst={false}>
            <TableAddNewButton onClick={() => setIsModalOpen(true)} />
          </TableAddFooterRow>
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

      {/* Footer */}
      <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
        <span className="text-[12px] font-medium text-folk-secondary">
          {filteredContacts.length} {filteredContacts.length === 1 ? "contact" : "contacts"}
        </span>
      </div>

      {/* Create contact modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => { setIsModalOpen(false); setIsRelationshipOpen(false); setIsClientOpen(false) }} />
          <div className="relative z-10 w-[440px] rounded-[6px] bg-folk-surface shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between px-[24px] pt-[20px]">
              <div className="flex items-center gap-[8px]">
                <UserPlus className="h-[16px] w-[16px] text-[#555]" strokeWidth={1.5} />
                <h2 className="text-[15px] font-semibold text-folk-text">Create contact</h2>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setIsRelationshipOpen(false); setIsClientOpen(false) }}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="px-[24px] pb-[20px] pt-[16px]">
              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="h-[38px] w-full rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none transition-colors focus:border-[#a3c4f3]"
                />
              </div>

              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Client (optional)</label>
                <button
                  ref={clientRef}
                  type="button"
                  onClick={() => { setIsClientOpen(!isClientOpen); setIsRelationshipOpen(false) }}
                  className="flex h-[38px] w-full items-center justify-between rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] font-medium outline-none transition-colors focus:border-[#a3c4f3]"
                  tabIndex={0}
                >
                  {newContact.clientName ? (
                    <span className="text-folk-text">{newContact.clientName}</span>
                  ) : (
                    <span className="text-folk-placeholder">Select client</span>
                  )}
                  <ChevronDown className={`h-[14px] w-[14px] text-folk-secondary transition-transform ${isClientOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                </button>
              </div>

              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Relationship</label>
                <button
                  ref={relationshipRef}
                  type="button"
                  onClick={() => { setIsRelationshipOpen(!isRelationshipOpen); setIsClientOpen(false) }}
                  className="flex h-[38px] w-full items-center justify-between rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] font-medium outline-none transition-colors focus:border-[#a3c4f3]"
                  tabIndex={0}
                >
                  {newContact.relationship ? (
                    (() => {
                      const rel = relationshipConfig[newContact.relationship]
                      return <CategoryChip label={rel?.label ?? newContact.relationship} categoryKey={newContact.relationship} size="lg" />
                    })()
                  ) : (
                    <span className="text-folk-placeholder">Select relationship</span>
                  )}
                  <ChevronDown className={`h-[14px] w-[14px] text-folk-secondary transition-transform ${isRelationshipOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                </button>
              </div>

              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Email</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="h-[38px] w-full rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none transition-colors focus:border-[#a3c4f3]"
                />
              </div>

              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Phone</label>
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="h-[38px] w-full rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none transition-colors focus:border-[#a3c4f3]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreate}
                  className="primary-btn px-[16px] py-[7px] text-[13px] font-medium transition-colors"
                  tabIndex={0}
                >
                  Create
                </button>
              </div>
            </div>
          </div>

          <FixedDropdownMenu
            isOpen={isClientOpen}
            anchorRef={clientRef}
            onClose={() => setIsClientOpen(false)}
            estimatedHeight={200}
            minWidth={clientRef.current?.getBoundingClientRect().width ?? 220}
            className="py-[4px]"
          >
            {clientNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  const matchedClient = clients.find((c) => c.name === name || c.displayName === name)
                  setNewContact({ ...newContact, clientName: name, clientId: matchedClient?.id ?? null })
                  setIsClientOpen(false)
                }}
                className={`flex w-full items-center px-[12px] py-[10px] text-left text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover ${newContact.clientName === name ? "bg-folk-hover" : ""}`}
                tabIndex={0}
              >
                {name}
              </button>
            ))}
          </FixedDropdownMenu>

          <FixedDropdownMenu
            isOpen={isRelationshipOpen}
            anchorRef={relationshipRef}
            onClose={() => setIsRelationshipOpen(false)}
            estimatedHeight={240}
            minWidth={relationshipRef.current?.getBoundingClientRect().width ?? 220}
            className="py-[4px]"
          >
            {Object.entries(relationshipConfig).map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setNewContact({ ...newContact, relationship: key })
                  setIsRelationshipOpen(false)
                }}
                className={`flex w-full items-center gap-[10px] px-[12px] py-[10px] text-left transition-colors hover:bg-folk-hover ${newContact.relationship === key ? "bg-folk-hover" : ""}`}
                tabIndex={0}
              >
                <CategoryChip label={config.label} categoryKey={key} size="lg" />
              </button>
            ))}
          </FixedDropdownMenu>
        </div>
      )}

      {/* Create view modal */}
      {isCreateViewOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20" onClick={() => { setIsCreateViewOpen(false); setNewViewName("") }} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-[6px] bg-folk-surface p-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-folk-text">Create a view for contacts</h3>
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

      {/* View context menu */}
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

      {/* Delete view confirmation */}
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
