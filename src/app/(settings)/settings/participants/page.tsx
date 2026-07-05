"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Plus, X, UserRound } from "lucide-react"
import { useClients } from "@/lib/hooks/use-clients"
import { useContacts } from "@/lib/hooks/use-contacts"
import { CsvDropdown } from "@/components/csv-dropdown"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { Switch } from "@/components/switch"
import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { EntityIcon } from "@/components/entity-icon"
import { DeleteActionsMenu } from "@/components/delete-actions-menu"
import { useToast } from "@/components/toast"
import { cn } from "@/lib/utils"
import { contactCsvColumns, parseContactsFromCsvRow } from "@/lib/participants/csv-contacts"
import type { ParticipantDetails } from "@/lib/types"

export default function ParticipantsSettingsPage() {
  const { clients, addClient, updateClient, deleteClient } = useClients()
  const { addContact } = useContacts()
  const { toast } = useToast()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const firstNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAddOpen) setTimeout(() => firstNameRef.current?.focus(), 50)
  }, [isAddOpen])

  const query = search.trim().toLowerCase()
  const matchesSearch = (c: typeof clients[number]) => {
    if (!query) return true
    return [c.displayName, c.name, c.owner, c.participant?.email]
      .some((field) => (field || "").toLowerCase().includes(query))
  }
  const activeClients = clients.filter((c) => c.status !== "archived" && matchesSearch(c))
  const archivedClients = clients.filter((c) => c.status === "archived" && matchesSearch(c))

  const handleToggle = (id: string, currentStatus: "active" | "archived") => {
    updateClient(id, { status: currentStatus === "active" ? "archived" : "active" })
  }

  const handleDelete = async (id: string, name: string) => {
    await deleteClient(id)
    toast(`Removed ${name}`, "success")
  }

  const resetAddForm = () => {
    setFirstName("")
    setLastName("")
    setEmail("")
    setAddError(null)
  }

  const handleAdd = async () => {
    const trimmedFirst = firstName.trim()
    const trimmedLast = lastName.trim()
    if (!trimmedFirst && !trimmedLast) {
      setAddError("Enter at least a first or last name")
      return
    }
    setIsSaving(true)
    setAddError(null)
    const name = [trimmedFirst, trimmedLast].filter(Boolean).join(" ")
    const created = await addClient({
      name,
      iconText: (trimmedFirst[0] || trimmedLast[0] || "?").toUpperCase(),
      participant: {
        firstName: trimmedFirst,
        lastName: trimmedLast,
        email: email.trim(),
      },
    })
    setIsSaving(false)
    if (!created) {
      setAddError("Failed to add participant")
      return
    }
    toast(`${name} added`, "success")
    resetAddForm()
    setIsAddOpen(false)
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

  const exportCsvData = useMemo(() =>
    activeClients.map((c) => {
      const p = c.participant
      return {
        firstName: p.firstName || "",
        lastName: p.lastName || "",
        preferredName: p.preferredName || "",
        dateOfBirth: p.dateOfBirth || "",
        gender: p.gender || "",
        pronouns: p.pronouns || "",
        email: p.email || "",
        phone: p.phone || "",
        ndisNumber: p.ndisNumber || "",
        medicareNumber: p.medicareNumber || "",
        centrelinkNumber: p.centrelinkNumber || "",
        externalId: p.externalId || "",
        primaryDiagnosis: p.primaryDiagnosis || "",
        secondaryDiagnosis: p.secondaryDiagnosis || "",
        ethnicity: p.ethnicity || "",
        language: p.language || "",
        fundingType: p.fundingType || "",
        planManagerName: p.planManagerName || "",
        planManagerEmail: p.planManagerEmail || "",
        planManagerOrg: p.planManagerOrg || "",
        planStartDate: p.planStartDate || "",
        planEndDate: p.planEndDate || "",
        serviceCommencementDate: p.serviceCommencementDate || "",
        serviceExitDate: p.serviceExitDate || "",
      }
    }),
    [activeClients]
  )

  const handleCsvImport = useCallback(async (rows: Record<string, string>[]) => {
    let contactCount = 0
    for (const row of rows) {
      const rowFirst = row.firstName || ""
      const rowLast = row.lastName || ""
      const name = [rowFirst, rowLast].filter(Boolean).join(" ") || "Unnamed"
      const created = await addClient({
        name,
        iconText: name[0]?.toUpperCase() || "?",
        participant: {
          firstName: rowFirst,
          lastName: rowLast,
          preferredName: row.preferredName || "",
          dateOfBirth: row.dateOfBirth || "",
          gender: row.gender || "",
          pronouns: row.pronouns || "",
          email: row.email || "",
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
    const participantMsg = `${rows.length} participant${rows.length > 1 ? "s" : ""} imported`
    const contactMsg = contactCount > 0 ? ` with ${contactCount} contact${contactCount > 1 ? "s" : ""}` : ""
    toast(`${participantMsg}${contactMsg}`, "success")
  }, [addClient, addContact, toast])

  return (
    <>
      <div className="mb-[24px]">
        <h1 className="text-[20px] font-bold text-folk-text">Participants</h1>
        <p className="mt-[4px] text-[14px] text-folk-secondary">
          Manage participant status. Toggle off to archive a participant.
        </p>
      </div>

      {isAddOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsAddOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
            <div className="w-full max-w-[420px] rounded-[6px] border border-folk-border-subtle bg-folk-surface p-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <div className="mb-[16px] flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-folk-text">Add a participant</h2>
                <button onClick={() => setIsAddOpen(false)} className="icon-btn flex h-[28px] w-[28px] items-center justify-center text-folk-secondary" tabIndex={0} aria-label="Close">
                  <X className="h-[16px] w-[16px]" strokeWidth={1.75} />
                </button>
              </div>
              <div className="flex gap-[12px]">
                <div className="flex-1">
                  <label className="mb-[4px] block text-[13px] font-medium text-[#555]">First name</label>
                  <input
                    ref={firstNameRef}
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
                    placeholder="Jane"
                    className="mb-[12px] w-full rounded-[6px] border border-folk-border bg-folk-page px-[12px] py-[9px] text-[14px] text-folk-text outline-none transition-colors focus:border-[#bbb]"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-[4px] block text-[13px] font-medium text-[#555]">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
                    placeholder="Doe"
                    className="mb-[12px] w-full rounded-[6px] border border-folk-border bg-folk-page px-[12px] py-[9px] text-[14px] text-folk-text outline-none transition-colors focus:border-[#bbb]"
                  />
                </div>
              </div>
              <label className="mb-[4px] block text-[13px] font-medium text-[#555]">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
                placeholder="jane@example.com"
                className="mb-[16px] w-full rounded-[6px] border border-folk-border bg-folk-page px-[12px] py-[9px] text-[14px] text-folk-text outline-none transition-colors focus:border-[#bbb]"
              />
              {addError && <p className="mb-[12px] text-[13px] text-red-500">{addError}</p>}
              <div className="flex justify-end gap-[8px]">
                <Button variant="secondary" onClick={() => setIsAddOpen(false)} className="px-[14px] py-[6px]">
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={isSaving || (!firstName.trim() && !lastName.trim())}
                  className="px-[14px] py-[6px]"
                >
                  {isSaving ? "Adding…" : "Add participant"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="mb-[16px] flex items-center gap-[10px]">
        <ExpandableTableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search participants…"
          ariaLabel="Search participants"
        />
        <div className="flex-1" />
        <CsvDropdown
          entityType="clients"
          columns={csvColumns}
          exportColumns={csvColumns}
          data={exportCsvData}
          onImport={handleCsvImport}
        />
        <Button onClick={() => setIsAddOpen(true)} className="h-[36px] shrink-0 px-[12px]">
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          Add participant
        </Button>
      </div>

      <div className="overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_80px_40px] items-center border-b border-[#d9d9d9] px-[20px] py-[10px]">
          <span className="text-[12px] font-medium text-folk-secondary">Name</span>
          <span className="text-[12px] font-medium text-folk-secondary">Status</span>
          <span className="text-[12px] font-medium text-folk-secondary">Active</span>
          <span />
        </div>

        {activeClients.map((client) => (
          <ParticipantRow
            key={client.id}
            name={client.displayName}
            initials={client.iconText}
            coordinator={client.owner}
            isActive
            onToggle={() => handleToggle(client.id, "active")}
            onDelete={() => handleDelete(client.id, client.displayName)}
          />
        ))}

        {clients.length === 0 && (
          <EmptyState
            icon={UserRound}
            title="No participants yet"
            description="Add a participant or import a CSV to get started."
            action={{ label: "Add participant", onClick: () => setIsAddOpen(true) }}
          />
        )}

        {clients.length > 0 && activeClients.length === 0 && archivedClients.length === 0 && (
          <div className="px-[20px] py-[40px] text-center text-[13px] text-folk-placeholder">
            No participants match &ldquo;{search.trim()}&rdquo;.
          </div>
        )}
      </div>

      {archivedClients.length > 0 && (
        <div className="mt-[28px]">
          <h2 className="mb-[10px] text-[13px] font-semibold uppercase tracking-wide text-folk-secondary">Archived</h2>
          <div className="overflow-hidden">
            {archivedClients.map((client) => (
              <ParticipantRow
                key={client.id}
                name={client.displayName}
                initials={client.iconText}
                coordinator={client.owner}
                isActive={false}
                onToggle={() => handleToggle(client.id, "archived")}
                onDelete={() => handleDelete(client.id, client.displayName)}
                isDisabledRow
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function ParticipantRow({
  name,
  initials,
  coordinator,
  isActive,
  onToggle,
  onDelete,
  isDisabledRow,
}: {
  name: string
  initials: string
  coordinator: string
  isActive: boolean
  onToggle: () => void
  onDelete: () => void
  isDisabledRow?: boolean
}) {
  return (
    <div className={cn(
      "grid grid-cols-[1fr_100px_80px_40px] items-center border-b border-[#d9d9d9] px-[20px] py-[10px] transition-colors last:border-b-0",
      isDisabledRow ? "opacity-60" : "hover:bg-folk-hover"
    )}>
      <div className="flex items-center gap-[12px]">
        <EntityIcon text={initials} size="base" className={isDisabledRow ? "opacity-50" : undefined} />
        <div className="min-w-0">
          <span className="block truncate text-[14px] font-medium text-folk-text">{name}</span>
          {coordinator && (
            <span className="block truncate text-[12px] text-folk-secondary">{coordinator}</span>
          )}
        </div>
      </div>

      <div>
        {isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="neutral">Archived</Badge>
        )}
      </div>

      <div>
        <Switch
          checked={isActive}
          onChange={onToggle}
          ariaLabel={isActive ? "Archive participant" : "Activate participant"}
        />
      </div>

      <div className="flex justify-end">
        <DeleteActionsMenu
          onDelete={onDelete}
          itemName={name}
          confirmTitle="Remove participant"
          confirmDescription={`This will permanently remove ${name} and all associated data. This action cannot be undone.`}
          ariaLabel="Participant actions"
        />
      </div>
    </div>
  )
}
