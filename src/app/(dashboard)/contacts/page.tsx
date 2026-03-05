"use client"

import { useState, useRef } from "react"
import {
  Handshake,
  ListFilter,
  Plus,
  Download,
  ArrowDown,
  Table2,
  UserRound,
  Building2,
  Mail,
  Phone,
  ChevronDown,
  X,
  UserPlus,
} from "lucide-react"
import { useContacts } from "@/lib/hooks/use-contacts"
import { useClients } from "@/lib/hooks/use-clients"
import { relationshipConfig } from "@/lib/types"

const columns = [
  { key: "name", label: "Name", icon: UserRound },
  { key: "client", label: "Client", icon: Building2, sorted: true },
  { key: "relationship", label: "Relationship", icon: Handshake },
  { key: "email", label: "Email", icon: Mail },
  { key: "phone", label: "Phone number", icon: Phone },
]

export default function ContactsPage() {
  const { contacts, addContact } = useContacts()
  const { clientNames } = useClients()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRelationshipOpen, setIsRelationshipOpen] = useState(false)
  const [isClientOpen, setIsClientOpen] = useState(false)
  const [newContact, setNewContact] = useState({ name: "", clientName: "", clientId: null as string | null, relationship: "", email: "", phone: "" })
  const relationshipRef = useRef<HTMLButtonElement>(null)
  const clientRef = useRef<HTMLButtonElement>(null)

  const handleCreate = async () => {
    if (!newContact.name) return
    await addContact({ ...newContact, clientId: newContact.clientId })
    setNewContact({ name: "", clientName: "", clientId: null, relationship: "", email: "", phone: "" })
    setIsModalOpen(false)
    setIsRelationshipOpen(false)
    setIsClientOpen(false)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
        <div className="flex items-center gap-[12px]">
          <div className="flex items-center gap-[6px]">
            <Handshake className="h-[14px] w-[14px] text-[#262626]" strokeWidth={1.5} />
            <span className="text-[13px] font-medium text-[#262626]">Contacts</span>
          </div>
          <div className="h-[16px] w-px bg-[#e5e5e5]" />
          <div className="flex items-center gap-[6px] rounded bg-[#f0f0f0] px-[6px] py-[3px] text-[13px] font-medium text-[#262626]">
            <Table2 className="h-[14px] w-[14px] text-[#262626]" strokeWidth={1.75} />
            <span>All</span>
          </div>
          <button
            className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#999] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            aria-label="Add view"
            tabIndex={0}
          >
            <Plus className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex items-center gap-[8px]">
          <button
            className="flex items-center gap-[5px] rounded px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Import CSV</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-[5px] rounded border border-[#dcdcdc] bg-white px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Create contact</span>
          </button>
        </div>
      </div>

          {/* Filter bar */}
          <div className="flex h-[41px] shrink-0 items-center border-b border-[#dcdcdc] px-[16px]">
            <button
              className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>Filter</span>
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto bg-[#fafafa]">
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  {columns.map((col, i) => {
                    const ColIcon = col.icon
                    return (
                      <th
                        key={col.key}
                        className={`sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888] ${i < columns.length - 1 ? "border-r border-[#dcdcdc]" : ""}`}
                        style={{ minWidth: col.key === "name" ? 180 : col.key === "email" ? 200 : 150 }}
                      >
                        <div className="flex items-center gap-[6px]">
                          <ColIcon className="h-[13px] w-[13px] text-[#999]" strokeWidth={1.5} />
                          <span>{col.label}</span>
                          {"sorted" in col && col.sorted && <ArrowDown className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => {
                const rel = relationshipConfig[contact.relationship]
                const initials = contact.name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase()
                return (
                  <tr key={contact.id} className="group transition-colors hover:bg-[#f5f5f5]">
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626] group-hover:bg-[#f5f5f5]">
                      <div className="flex items-center gap-[10px]">
                        <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#d4d4d4] text-[9px] font-semibold text-[#555]">
                          {initials}
                        </div>
                        {contact.name}
                      </div>
                    </td>
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] group-hover:bg-[#f5f5f5]">
                      {contact.clientName ? (
                        <span className="inline-flex h-[28px] items-center whitespace-nowrap rounded border border-[#dcdcdc] px-[8px] text-[13px] font-medium text-[#262626]">
                          {contact.clientName}
                        </span>
                      ) : <span className="text-[#bbb]">—</span>}
                    </td>
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] group-hover:bg-[#f5f5f5]">
                      {rel ? (
                        <span className="inline-flex h-[28px] items-center whitespace-nowrap rounded border border-[#dcdcdc] px-[8px] text-[13px] font-medium text-[#262626]">{rel.label}</span>
                      ) : (
                        <span className="text-[13px] font-medium text-[#bbb]">—</span>
                      )}
                    </td>
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626] group-hover:bg-[#f5f5f5]">
                      {contact.email || <span className="text-[#bbb]">—</span>}
                    </td>
                    <td className="h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626] group-hover:bg-[#f5f5f5]">
                      {contact.phone || <span className="text-[#bbb]">—</span>}
                    </td>
                  </tr>
                )
              })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-[#999]">
              {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
            </span>
          </div>

      {/* Create contact modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => { setIsModalOpen(false); setIsRelationshipOpen(false); setIsClientOpen(false) }} />
          <div className="relative z-10 w-[440px] rounded-lg bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            {/* Modal header */}
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

            {/* Modal body */}
            <div className="px-[24px] pb-[20px] pt-[16px]">
              {/* Name */}
              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="h-[36px] w-full rounded-md border border-[#e0e0e0] px-[10px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3]"
                />
              </div>

              {/* Client */}
              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Client (optional)</label>
                <button
                  ref={clientRef}
                  type="button"
                  onClick={() => { setIsClientOpen(!isClientOpen); setIsRelationshipOpen(false) }}
                  className="flex h-[36px] w-full items-center justify-between rounded-md border border-[#e0e0e0] bg-white px-[10px] text-[13px] font-medium outline-none transition-colors focus:border-[#a3c4f3]"
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

              {/* Relationship */}
              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Relationship</label>
                <button
                  ref={relationshipRef}
                  type="button"
                  onClick={() => { setIsRelationshipOpen(!isRelationshipOpen); setIsClientOpen(false) }}
                  className="flex h-[36px] w-full items-center justify-between rounded-md border border-[#e0e0e0] bg-white px-[10px] text-[13px] font-medium outline-none transition-colors focus:border-[#a3c4f3]"
                  tabIndex={0}
                >
                  {newContact.relationship ? (
                    (() => {
                      const rel = relationshipConfig[newContact.relationship]
                      return <span className="inline-flex h-[28px] items-center whitespace-nowrap rounded border border-[#dcdcdc] px-[8px] text-[13px] font-medium text-[#262626]">{rel.label}</span>
                    })()
                  ) : (
                    <span className="text-[#bbb]">Select relationship</span>
                  )}
                  <ChevronDown className={`h-[14px] w-[14px] text-[#888] transition-transform ${isRelationshipOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                </button>
              </div>

              {/* Email */}
              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Email</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="h-[36px] w-full rounded-md border border-[#e0e0e0] px-[10px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3]"
                />
              </div>

              {/* Phone */}
              <div className="mb-[14px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Phone</label>
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="h-[36px] w-full rounded-md border border-[#e0e0e0] px-[10px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3]"
                />
              </div>

              {/* Create button */}
              <div className="flex justify-end">
                <button
                  onClick={handleCreate}
                  className="rounded-md bg-[#262626] px-[16px] py-[7px] text-[13px] font-medium text-white transition-colors hover:bg-[#333]"
                  tabIndex={0}
                >
                  Create
                </button>
              </div>
            </div>
          </div>

          {/* Client dropdown portal */}
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
                      setNewContact({ ...newContact, clientName: name })
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

          {/* Relationship dropdown portal */}
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
    </div>
  )
}
