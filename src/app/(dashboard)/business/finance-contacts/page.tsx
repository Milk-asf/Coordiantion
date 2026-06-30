"use client"

import { useMemo, useState } from "react"
import { Building2, Contact, Plus, Trash2, User, X } from "lucide-react"
import { folkPrimaryAddBtnClass } from "@/lib/folk-ui"
import { EmptyState } from "@/components/empty-state"
import { PageTitleBar } from "@/components/page-title-bar"
import { listViewBodyClass, listViewFilterBarClass } from "@/components/tab-active-indicator"
import { FormModal } from "@/components/form-modal"
import { PageError, PageLoader } from "@/components/page-state"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { EntityIcon } from "@/components/entity-icon"
import { useToast } from "@/components/toast"
import { useFinanceContacts } from "@/lib/finance-contacts/use-finance-contacts"
import {
  FINANCE_CONTACT_TYPES,
  getFinanceContactTypeLabel,
  type FinanceContact,
  type FinanceContactInput,
  type FinanceContactType,
} from "@/lib/finance-contacts/types"
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

type SidebarMode = "add" | "edit"

interface DraftContact {
  type: FinanceContactType
  name: string
  email: string
  phone: string
  abn: string
  address: string
  bsb: string
  accountNumber: string
  notes: string
}

function emptyDraft(): DraftContact {
  return { type: "person", name: "", email: "", phone: "", abn: "", address: "", bsb: "", accountNumber: "", notes: "" }
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "?"
}

const inputClass =
  "h-[36px] w-full rounded-none border border-folk-border bg-folk-page px-[10px] text-[13px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none transition-colors focus:border-[#a3c4f3]"

const labelClass = "mb-[4px] block text-[12px] font-medium text-folk-secondary"

export default function FinanceContactsPage() {
  const { financeContacts, isLoading, fetchError, addFinanceContact, updateFinanceContact, deleteFinanceContact, refetch } =
    useFinanceContacts()
  const { toast } = useToast()

  const [sidebarMode, setSidebarMode] = useState<SidebarMode | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftContact>(emptyDraft)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return financeContacts
    return financeContacts.filter((contact) =>
      [contact.name, contact.email, contact.abn, getFinanceContactTypeLabel(contact.type)].join(" ").toLowerCase().includes(query),
    )
  }, [financeContacts, searchQuery])

  const openAdd = () => {
    setEditingId(null)
    setDraft(emptyDraft())
    setSidebarMode("add")
  }

  const openEdit = (contact: FinanceContact) => {
    setEditingId(contact.id)
    setDraft({
      type: contact.type,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      abn: contact.abn,
      address: contact.address,
      bsb: contact.bsb,
      accountNumber: contact.accountNumber,
      notes: contact.notes,
    })
    setSidebarMode("edit")
  }

  const closeSidebar = () => {
    setSidebarMode(null)
    setEditingId(null)
  }

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast("Name is required", "error")
      return
    }
    if (!draft.email.trim()) {
      toast("Email is required", "error")
      return
    }
    setIsSaving(true)
    try {
      const input: FinanceContactInput = { ...draft }
      if (sidebarMode === "edit" && editingId) {
        await updateFinanceContact(editingId, input)
        toast("Contact updated", "success")
      } else {
        await addFinanceContact(input)
        toast("Contact created", "success")
      }
      closeSidebar()
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to save contact", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingId) return
    setIsSaving(true)
    try {
      await deleteFinanceContact(editingId)
      toast("Contact deleted", "success")
      closeSidebar()
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to delete contact", "error")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <PageLoader label="Loading finance contacts…" />
  if (fetchError && financeContacts.length === 0) return <PageError message="Failed to load finance contacts" onRetry={refetch} />

  const isSidebarOpen = sidebarMode !== null

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <PageTitleBar title="Finance contacts" />
          <div className="flex h-[44px] shrink-0 items-center justify-end gap-[8px] border-b border-folk-border-subtle bg-white px-[16px]">
            <button type="button" onClick={openAdd} className={folkPrimaryAddBtnClass()} tabIndex={0}>
              <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>New contact</span>
            </button>
          </div>

          <div className={listViewFilterBarClass("flex-nowrap")}>
            <ExpandableTableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search contacts…"
              ariaLabel="Search finance contacts"
            />
            <span className="ml-auto text-[12px] font-medium text-folk-secondary">
              {filtered.length} {filtered.length === 1 ? "contact" : "contacts"}
            </span>
          </div>

          <div className={listViewBodyClass()}>
            {filtered.length === 0 ? (
              <EmptyState
                icon={Contact}
                title="No finance contacts yet"
                description="Add the people and organisations who receive invoices — plan managers, the NDIA, support coordinators, or family members who manage billing."
                action={{ label: "New contact", onClick: openAdd }}
                className="py-[80px]"
              />
            ) : (
              <table className={TABLE_FULL} style={{ tableLayout: "fixed", minWidth: 880 }}>
                <thead>
                  <tr>
                    <th className={`${TABLE_PANEL_HEADER} w-[240px]`}>Name</th>
                    <th className={`${TABLE_PANEL_HEADER} w-[110px]`}>Type</th>
                    <th className={`${TABLE_PANEL_HEADER} w-[220px]`}>Email</th>
                    <th className={`${TABLE_PANEL_HEADER} w-[140px]`}>Phone</th>
                    <th className={`${TABLE_PANEL_HEADER_LAST} w-[150px]`}>ABN</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((contact) => {
                    const isSelected = editingId === contact.id && sidebarMode === "edit"
                    return (
                      <tr
                        key={contact.id}
                        onClick={() => openEdit(contact)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-folk-hover",
                          isSelected && "bg-[#eef4fc] hover:bg-[#eef4fc]",
                        )}
                      >
                        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                          <div className={TABLE_CELL_INNER}>
                            <EntityIcon text={initials(contact.name)} size="sm" />
                            <span className="truncate font-medium">{contact.name || "—"}</span>
                          </div>
                        </td>
                        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                          <div className={TABLE_CELL_INNER}>
                            <span className="inline-flex items-center gap-[5px] text-folk-secondary">
                              {contact.type === "company" ? <Building2 className="h-[13px] w-[13px]" strokeWidth={1.75} /> : <User className="h-[13px] w-[13px]" strokeWidth={1.75} />}
                              {getFinanceContactTypeLabel(contact.type)}
                            </span>
                          </div>
                        </td>
                        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL} text-folk-secondary`}>
                          <div className={TABLE_CELL_INNER}>{contact.email || "—"}</div>
                        </td>
                        <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL} text-folk-secondary`}>
                          <div className={TABLE_CELL_INNER}>{contact.phone || "—"}</div>
                        </td>
                        <td className={`${TABLE_PROFILE_CELL_LAST} ${TABLE_TEXT_CELL} text-folk-secondary`}>
                          <div className={TABLE_CELL_INNER}>{contact.abn || "—"}</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {isSidebarOpen && (
          <FormModal onClose={closeSidebar} width={460}>
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between px-[20px] pb-[4px] pt-[18px]">
                <h2 className="text-[13px] font-semibold text-folk-text">
                  {sidebarMode === "edit" ? "Edit contact" : "New contact"}
                </h2>
                <button
                  onClick={closeSidebar}
                  className="flex h-[24px] w-[24px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
                  aria-label="Close"
                  tabIndex={0}
                >
                  <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-[14px] px-[20px] py-[14px]">
                <div>
                  <label className={labelClass}>Type</label>
                  <div className="flex gap-[8px]">
                    {FINANCE_CONTACT_TYPES.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDraft((prev) => ({ ...prev, type: option.value }))}
                        className={cn(
                          "flex h-[36px] flex-1 items-center justify-center gap-[6px] rounded-none border text-[13px] font-medium transition-colors",
                          draft.type === option.value
                            ? "border-[#a3c4f3] bg-[#eef4fd] text-[#2563EB]"
                            : "border-folk-border bg-folk-page text-folk-secondary hover:bg-folk-hover",
                        )}
                        tabIndex={0}
                      >
                        {option.value === "company" ? <Building2 className="h-[13px] w-[13px]" strokeWidth={1.75} /> : <User className="h-[13px] w-[13px]" strokeWidth={1.75} />}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Name *</label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={draft.type === "company" ? "Organisation name" : "Full name"}
                    className={inputClass}
                    autoFocus
                  />
                </div>

                <div>
                  <label className={labelClass}>Email *</label>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="name@company.com"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>ABN</label>
                  <input
                    type="text"
                    value={draft.abn}
                    onChange={(e) => setDraft((prev) => ({ ...prev, abn: e.target.value }))}
                    placeholder="11 digit ABN"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Address</label>
                  <input
                    type="text"
                    value={draft.address}
                    onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Physical address"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-[12px]">
                  <div>
                    <label className={labelClass}>BSB</label>
                    <input
                      type="text"
                      value={draft.bsb}
                      onChange={(e) => setDraft((prev) => ({ ...prev, bsb: e.target.value }))}
                      placeholder="000-000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Account number</label>
                    <input
                      type="text"
                      value={draft.accountNumber}
                      onChange={(e) => setDraft((prev) => ({ ...prev, accountNumber: e.target.value }))}
                      placeholder="Account number"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-[8px] border-t border-folk-border-subtle px-[20px] py-[12px]">
                {sidebarMode === "edit" ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSaving}
                    className="flex items-center gap-[5px] text-[12px] font-medium text-red-500 transition-colors hover:text-red-600 disabled:opacity-50"
                    tabIndex={0}
                  >
                    <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.75} />
                    Delete
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-[8px]">
                  <button
                    onClick={closeSidebar}
                    className="rounded-none border border-folk-border bg-folk-surface px-[12px] py-[6px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                    tabIndex={0}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="primary-btn px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
                    tabIndex={0}
                  >
                    {sidebarMode === "edit" ? "Save changes" : "Create contact"}
                  </button>
                </div>
              </div>
            </div>
          </FormModal>
        )}
      </div>
    </div>
  )
}
