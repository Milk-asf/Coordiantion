"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import {
  Handshake,
  ListFilter,
  Plus,
  ArrowDown,
  ArrowUpDown,
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
import { useContacts } from "@/lib/hooks/use-contacts"
import { useClients } from "@/lib/hooks/use-clients"
import { useFieldConfig } from "@/lib/hooks/use-field-config"
import { useSavedViews } from "@/lib/hooks/use-saved-views"
import { relationshipConfig } from "@/lib/types"
import { CsvDropdown } from "@/components/csv-dropdown"

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
  sortKey: string | null
  sortDirection: "asc" | "desc"
  displayRelationships: string[]
}

export default function ContactsPage() {
  const { contacts, addContact } = useContacts()
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
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [displayRelationships, setDisplayRelationships] = useState<string[]>([])

  const [isCreateViewOpen, setIsCreateViewOpen] = useState(false)
  const [newViewName, setNewViewName] = useState("")
  const [viewContextMenu, setViewContextMenu] = useState<{ viewId: string; x: number; y: number } | null>(null)
  const [deleteViewConfirm, setDeleteViewConfirm] = useState<SavedView | null>(null)

  const displayBtnRef = useRef<HTMLButtonElement>(null)
  const viewNameInputRef = useRef<HTMLInputElement>(null)

  const applySavedView = useCallback((view: SavedView) => {
    setVisibleColumnKeys(view.columnKeys)
    setSortKey(view.sortKey)
    setSortDirection(view.sortDirection)
    setDisplayRelationships(view.displayRelationships || [])
  }, [])

  const resetSavedViewState = useCallback(() => {
    setVisibleColumnKeys(defaultVisibleKeys)
    setSortKey(null)
    setSortDirection("asc")
    setDisplayRelationships([])
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
    viewsStorageKey: "contact-views",
    activeViewStorageKey: "contact-active-view",
    buildView: ({ id, name }) => ({
      id,
      name,
      columnKeys: [...visibleColumnKeys],
      sortKey,
      sortDirection,
      displayRelationships: [...displayRelationships],
    }),
    applyView: applySavedView,
    resetState: resetSavedViewState,
    syncView: (view) => ({
      ...view,
      columnKeys: [...visibleColumnKeys],
      sortKey,
      sortDirection,
      displayRelationships: [...displayRelationships],
    }),
  })

  useEffect(() => {
    syncActiveView()
  }, [displayRelationships, sortDirection, sortKey, syncActiveView, visibleColumnKeys])

  const visibleColumns = visibleColumnKeys
    .filter((key) => key === "name" || !contactDisabled.has(key))
    .map((key) => allColumns.find((col) => col.key === key))
    .filter(Boolean) as typeof allColumns

  const handleToggleColumn = useCallback((key: string) => {
    setVisibleColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }, [])

  const handleToggleRelationship = useCallback((key: string) => {
    setDisplayRelationships((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }, [])

  const filteredContacts = useMemo(() => {
    if (displayRelationships.length === 0) return contacts
    return contacts.filter((c) => displayRelationships.includes(c.relationship))
  }, [contacts, displayRelationships])

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
    await addContact({ ...newContact, clientId: newContact.clientId })
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
  }, [addContact, clients])

  return (
    <div className="flex h-full flex-col">
      {/* View tabs */}
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
        <div className="flex items-center gap-[8px]">
          <span className="text-[13px] font-medium text-[#262626]">Contacts</span>
          <div className="h-[16px] w-px bg-[#e5e5e5]" />
          <button
            onClick={handleSelectAllView}
            className={`flex items-center gap-[6px] rounded-[4px] border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${activeViewId === null ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-transparent text-[#888] hover:bg-[#f5f5f5] hover:text-[#262626]"}`}
            tabIndex={0}
          >
            <Table2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
            <span>All</span>
          </button>
          {savedViews.length > 0 && <div className="h-[16px] w-px bg-[#dcdcdc]" />}
          {savedViews.map((view) => (
            <button
              key={view.id}
              onClick={() => handleSelectView(view)}
              onContextMenu={(e) => {
                e.preventDefault()
                setViewContextMenu({ viewId: view.id, x: e.clientX, y: e.clientY })
              }}
              className={`flex items-center gap-[6px] rounded-[4px] border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${activeViewId === view.id ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-transparent text-[#888] hover:bg-[#f5f5f5] hover:text-[#262626]"}`}
              tabIndex={0}
            >
              <Table2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
              <span>{view.name}</span>
            </button>
          ))}
          <button
            onClick={() => { setIsCreateViewOpen(true); setTimeout(() => viewNameInputRef.current?.focus(), 50) }}
            className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#999] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            aria-label="Add view"
            tabIndex={0}
          >
            <Plus className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex items-center gap-[8px]">
          <CsvDropdown
            entityType="contacts"
            columns={csvColumns}
            exportColumns={exportCsvColumns}
            data={exportCsvData}
            onImport={handleCsvImport}
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="primary-btn flex items-center gap-[5px] rounded-[4px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
            style={{ backgroundColor: "var(--primary-color)" }}
            tabIndex={0}
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Add new</span>
          </button>
        </div>
      </div>

      {/* Filter & display bar */}
      <div className="flex h-[41px] shrink-0 items-center border-b border-[#dcdcdc] px-[16px]">
        <button
          className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
          tabIndex={0}
        >
          <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>Filter</span>
        </button>
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
                      <span>Name</span>
                      <ChevronDown className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
                    </button>
                    <button className="flex h-[32px] w-[32px] items-center justify-center rounded-[4px] border border-[#dcdcdc] text-[#262626] transition-colors hover:bg-[#f5f5f5]" tabIndex={0}>
                      <ArrowDown className="h-[14px] w-[14px]" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>

                <div className="px-[20px] pb-[16px] pt-[14px]">
                  <div className="pb-[12px] text-[13px] font-medium text-[#888]">Display properties</div>
                  <div className="flex flex-wrap gap-[8px]">
                    {availablePropertyColumns.map((col) => {
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

                <div className="border-t border-[#f0f0f0] px-[20px] pb-[16px] pt-[14px]">
                  <div className="pb-[12px] text-[13px] font-medium text-[#888]">Relationships</div>
                  <div className="flex flex-wrap gap-[8px]">
                    {Object.entries(relationshipConfig).map(([key, config]) => {
                      const isActive = displayRelationships.includes(key)
                      return (
                        <button
                          key={key}
                          onClick={() => handleToggleRelationship(key)}
                          className={`inline-flex items-center rounded-[4px] border px-[10px] py-[5px] text-[12px] font-medium transition-colors ${isActive ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-[#dcdcdc] bg-transparent text-[#262626] hover:bg-[#f5f5f5]"}`}
                          tabIndex={0}
                        >
                          {config.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-[20px] border-t border-[#f0f0f0] px-[20px] py-[12px]">
                  <button
                    onClick={() => { setVisibleColumnKeys(defaultVisibleKeys); setDisplayRelationships([]) }}
                    className="text-[13px] font-medium text-[#bbb] transition-colors hover:text-[#262626]"
                    tabIndex={0}
                  >
                    Reset
                  </button>
                  <button
                    className="text-[13px] font-medium text-[#bbb] transition-colors hover:text-[#262626]"
                    tabIndex={0}
                  >
                    Save default for everyone
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-[#fafafa]">
        <table className="w-full border-separate border-spacing-0 text-left" style={{ tableLayout: "fixed", minWidth: visibleColumns.length * 200 }}>
          <thead>
            <tr>
              {visibleColumns.map((col, i) => {
                const ColIcon = col.icon
                return (
                  <th
                    key={col.key}
                    className={`sticky top-0 z-20 h-[44px] overflow-hidden whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888] ${i < visibleColumns.length - 1 ? "border-r border-[#dcdcdc]" : ""}`}
                  >
                    <div className="flex items-center gap-[6px]">
                      <ColIcon className="h-[13px] w-[13px] shrink-0 text-[#999]" strokeWidth={1.5} />
                      <span className="truncate">{col.label}</span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {filteredContacts.map((contact) => {
              const rel = relationshipConfig[contact.relationship] ?? { label: contact.relationship || "—", color: "bg-gray-50 text-gray-600", dotColor: "bg-gray-400" }
              const initials = contact.name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase()
              const dash = <span className="text-[#bbb]">—</span>

              const renderCell = (key: string, isLast: boolean) => {
                const cls = `h-[44px] overflow-hidden whitespace-nowrap border-b ${isLast ? "" : "border-r"} border-[#dcdcdc] bg-[#fafafa] px-[20px] group-hover:bg-[#f5f5f5]`
                const textCls = `${cls} text-[13px] font-medium text-[#262626]`

                switch (key) {
                  case "name":
                    return (
                      <td key={key} className={textCls}>
                        <div className="flex items-center gap-[10px]">
                          <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#d4d4d4] text-[9px] font-semibold text-[#555]">{initials}</div>
                          <span className="truncate">{contact.name}</span>
                        </div>
                      </td>
                    )
                  case "client":
                    return <td key={key} className={cls}>{contact.clientName ? <span className="inline-flex h-[28px] items-center whitespace-nowrap rounded border border-[#dcdcdc] px-[8px] text-[13px] font-medium text-[#262626]">{contact.clientName}</span> : dash}</td>
                  case "relationship":
                    return <td key={key} className={cls}>{rel ? <span className="inline-flex h-[28px] items-center whitespace-nowrap rounded border border-[#dcdcdc] px-[8px] text-[13px] font-medium text-[#262626]">{rel.label}</span> : <span className="text-[13px] font-medium text-[#bbb]">—</span>}</td>
                  case "email":
                    return <td key={key} className={textCls}>{contact.email || dash}</td>
                  case "phone":
                    return <td key={key} className={textCls}>{contact.phone || dash}</td>
                  default:
                    return <td key={key} className={textCls}>{dash}</td>
                }
              }

              return (
                <tr key={contact.id} className="group transition-colors hover:bg-[#f5f5f5]">
                  {visibleColumns.map((col, i) => renderCell(col.key, i === visibleColumns.length - 1))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
        <span className="text-[12px] font-medium text-[#999]">
          {filteredContacts.length} {filteredContacts.length === 1 ? "contact" : "contacts"}
        </span>
      </div>

      {/* Create contact modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => { setIsModalOpen(false); setIsRelationshipOpen(false); setIsClientOpen(false) }} />
          <div className="relative z-10 w-[440px] rounded-lg bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between px-[24px] pt-[20px]">
              <div className="flex items-center gap-[8px]">
                <UserPlus className="h-[16px] w-[16px] text-[#555]" strokeWidth={1.5} />
                <h2 className="text-[15px] font-semibold text-[#262626]">Create contact</h2>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setIsRelationshipOpen(false); setIsClientOpen(false) }}
                className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="px-[24px] pb-[20px] pt-[16px]">
              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="h-[36px] w-full rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3]"
                />
              </div>

              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Client (optional)</label>
                <button
                  ref={clientRef}
                  type="button"
                  onClick={() => { setIsClientOpen(!isClientOpen); setIsRelationshipOpen(false) }}
                  className="flex h-[36px] w-full items-center justify-between rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px] text-[13px] font-medium outline-none transition-colors focus:border-[#a3c4f3]"
                  tabIndex={0}
                >
                  {newContact.clientName ? (
                    <span className="text-[#262626]">{newContact.clientName}</span>
                  ) : (
                    <span className="text-[#bbb]">Select client</span>
                  )}
                  <ChevronDown className={`h-[14px] w-[14px] text-[#888] transition-transform ${isClientOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                </button>
              </div>

              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Relationship</label>
                <button
                  ref={relationshipRef}
                  type="button"
                  onClick={() => { setIsRelationshipOpen(!isRelationshipOpen); setIsClientOpen(false) }}
                  className="flex h-[36px] w-full items-center justify-between rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px] text-[13px] font-medium outline-none transition-colors focus:border-[#a3c4f3]"
                  tabIndex={0}
                >
                  {newContact.relationship ? (
                    (() => {
                      const rel = relationshipConfig[newContact.relationship]
                      return <span className="inline-flex h-[28px] items-center whitespace-nowrap rounded border border-[#dcdcdc] px-[8px] text-[13px] font-medium text-[#262626]">{rel?.label ?? newContact.relationship}</span>
                    })()
                  ) : (
                    <span className="text-[#bbb]">Select relationship</span>
                  )}
                  <ChevronDown className={`h-[14px] w-[14px] text-[#888] transition-transform ${isRelationshipOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                </button>
              </div>

              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Email</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="h-[36px] w-full rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3]"
                />
              </div>

              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Phone</label>
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="h-[36px] w-full rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreate}
                  className="rounded-[4px] bg-[#262626] px-[16px] py-[7px] text-[13px] font-medium text-white transition-colors hover:bg-[#333]"
                  tabIndex={0}
                >
                  Create
                </button>
              </div>
            </div>
          </div>

          {isClientOpen && clientRef.current && (() => {
            const rect = clientRef.current.getBoundingClientRect()
            return (
              <div
                className="fixed z-[60] max-h-[200px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                style={{ top: rect.bottom + 4, left: rect.left, width: rect.width }}
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
                    className={`flex w-full items-center px-[12px] py-[10px] text-left text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${newContact.clientName === name ? "bg-[#f5f5f5]" : ""}`}
                    tabIndex={0}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )
          })()}

          {isRelationshipOpen && relationshipRef.current && (() => {
            const rect = relationshipRef.current.getBoundingClientRect()
            return (
              <div
                className="fixed z-[60] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                style={{ top: rect.bottom + 4, left: rect.left, width: rect.width, maxHeight: Math.min(240, window.innerHeight - rect.bottom - 20) }}
              >
                {Object.entries(relationshipConfig).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setNewContact({ ...newContact, relationship: key })
                      setIsRelationshipOpen(false)
                    }}
                    className={`flex w-full items-center gap-[10px] px-[12px] py-[10px] text-left transition-colors hover:bg-[#f5f5f5] ${newContact.relationship === key ? "bg-[#f5f5f5]" : ""}`}
                    tabIndex={0}
                  >
                    <span className="inline-flex h-[28px] items-center whitespace-nowrap rounded border border-[#dcdcdc] px-[8px] text-[13px] font-medium text-[#262626]">{config.label}</span>
                  </button>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {/* Create view modal */}
      {isCreateViewOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20" onClick={() => { setIsCreateViewOpen(false); setNewViewName("") }} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#262626]">Create a view for contacts</h3>
              <button
                onClick={() => { setIsCreateViewOpen(false); setNewViewName("") }}
                className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.75} />
              </button>
            </div>
            <div className="mt-[20px]">
              <label className="text-[13px] font-medium text-[#888]">Name</label>
              <input
                ref={viewNameInputRef}
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateView() }}
                placeholder="Enter name here"
                className="mt-[8px] w-full rounded-lg border border-[#dcdcdc] bg-[#fafafa] px-[12px] py-[10px] text-[13px] font-medium text-[#262626] outline-none transition-colors placeholder:text-[#bbb] focus:border-[#a3c4f3]"
              />
            </div>
            <div className="mt-[20px] flex items-center justify-end gap-[12px]">
              <button
                onClick={() => { setIsCreateViewOpen(false); setNewViewName("") }}
                className="px-[12px] py-[6px] text-[13px] font-medium text-[#262626] transition-colors hover:text-[#888]"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateView}
                disabled={!newViewName.trim()}
                className={`rounded-[4px] border px-[16px] py-[6px] text-[13px] font-medium transition-colors ${newViewName.trim() ? "border-[#262626] bg-[#262626] text-white hover:bg-[#333]" : "border-[#dcdcdc] text-[#bbb]"}`}
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
            className="fixed z-50 w-[160px] overflow-hidden rounded-lg border border-[#dcdcdc] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
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
          <div className="relative z-10 w-[400px] rounded-lg bg-white p-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <h3 className="text-[15px] font-semibold text-[#262626]">Delete view</h3>
            <p className="mt-[8px] text-[13px] font-medium text-[#888]">
              Are you sure you want to delete <span className="text-[#262626]">&ldquo;{deleteViewConfirm.name}&rdquo;</span>? This action cannot be undone.
            </p>
            <div className="mt-[20px] flex items-center justify-end gap-[12px]">
              <button
                onClick={() => setDeleteViewConfirm(null)}
                className="px-[12px] py-[6px] text-[13px] font-medium text-[#262626] transition-colors hover:text-[#888]"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteView(deleteViewConfirm.id)}
                className="rounded-[4px] bg-red-500 px-[16px] py-[6px] text-[13px] font-medium text-white transition-colors hover:bg-red-600"
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
