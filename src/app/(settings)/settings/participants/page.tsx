"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Plus, X } from "lucide-react"
import { useClients } from "@/lib/hooks/use-clients"
import { useContacts } from "@/lib/hooks/use-contacts"
import { CsvDropdown } from "@/components/csv-dropdown"
import { useToast } from "@/components/toast"
import { cn } from "@/lib/utils"
import { contactCsvColumns, parseContactsFromCsvRow } from "@/lib/participants/csv-contacts"
import type { ParticipantDetails } from "@/lib/types"

export default function ParticipantsSettingsPage() {
  const { clients, addClient, updateClient } = useClients()
  const { addContact } = useContacts()
  const { toast } = useToast()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const firstNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAddOpen) setTimeout(() => firstNameRef.current?.focus(), 50)
  }, [isAddOpen])

  const activeClients = clients.filter((c) => c.status !== "archived")
  const archivedClients = clients.filter((c) => c.status === "archived")

  const handleToggle = (id: string, currentStatus: "active" | "archived") => {
    updateClient(id, { status: currentStatus === "active" ? "archived" : "active" })
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
      <div className="mb-[32px] flex items-start justify-between gap-[16px]">
        <div>
          <h1 className="text-[20px] font-bold text-[#262626]">Participants</h1>
          <p className="mt-[4px] text-[14px] text-[#888]">
            Manage participant status. Toggle off to archive a participant.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-[8px]">
          <CsvDropdown
            entityType="clients"
            columns={csvColumns}
            exportColumns={csvColumns}
            data={exportCsvData}
            onImport={handleCsvImport}
          />
          <button
            onClick={() => setIsAddOpen(true)}
            className="primary-btn flex items-center gap-[5px] rounded-[8px] px-[12px] py-[7px] text-[13px] font-medium transition-colors"
            tabIndex={0}
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            Add participant
          </button>
        </div>
      </div>

      {isAddOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setIsAddOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
            <div className="w-full max-w-[420px] rounded-[8px] border border-[#f0f0f0] bg-white p-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <div className="mb-[16px] flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-[#262626]">Add a participant</h2>
                <button onClick={() => setIsAddOpen(false)} className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#999] transition-colors hover:bg-[#f5f5f5]" tabIndex={0} aria-label="Close">
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
                    className="mb-[12px] w-full rounded-[8px] border border-[#e0e0e0] bg-white px-[12px] py-[9px] text-[14px] text-[#262626] outline-none transition-colors focus:border-[#bbb]"
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
                    className="mb-[12px] w-full rounded-[8px] border border-[#e0e0e0] bg-white px-[12px] py-[9px] text-[14px] text-[#262626] outline-none transition-colors focus:border-[#bbb]"
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
                className="mb-[16px] w-full rounded-[8px] border border-[#e0e0e0] bg-white px-[12px] py-[9px] text-[14px] text-[#262626] outline-none transition-colors focus:border-[#bbb]"
              />
              {addError && <p className="mb-[12px] text-[13px] text-red-500">{addError}</p>}
              <div className="flex justify-end gap-[8px]">
                <button onClick={() => setIsAddOpen(false)} className="rounded-[8px] border border-[#e0e0e0] bg-white px-[14px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]" tabIndex={0}>
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={isSaving || (!firstName.trim() && !lastName.trim())}
                  className="primary-btn rounded-[8px] px-[14px] py-[7px] text-[13px] font-medium transition-colors disabled:opacity-50"
                  tabIndex={0}
                >
                  {isSaving ? "Adding…" : "Add participant"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_80px] items-center border-b border-[#efefef] px-[20px] py-[10px]">
          <span className="text-[12px] font-medium text-[#999]">Name</span>
          <span className="text-[12px] font-medium text-[#999]">Status</span>
          <span className="text-[12px] font-medium text-[#999]">Active</span>
        </div>

        {activeClients.map((client) => (
          <ParticipantRow
            key={client.id}
            name={client.displayName}
            initials={client.iconText}
            coordinator={client.owner}
            isActive
            onToggle={() => handleToggle(client.id, "active")}
          />
        ))}

        {clients.length === 0 && (
          <div className="px-[20px] py-[40px] text-center text-[13px] text-[#bbb]">
            No participants yet. Add one or import a CSV to get started.
          </div>
        )}
      </div>

      {archivedClients.length > 0 && (
        <div className="mt-[28px]">
          <h2 className="mb-[10px] text-[13px] font-semibold uppercase tracking-wide text-[#999]">Archived</h2>
          <div className="overflow-hidden">
            {archivedClients.map((client) => (
              <ParticipantRow
                key={client.id}
                name={client.displayName}
                initials={client.iconText}
                coordinator={client.owner}
                isActive={false}
                onToggle={() => handleToggle(client.id, "archived")}
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
  isDisabledRow,
}: {
  name: string
  initials: string
  coordinator: string
  isActive: boolean
  onToggle: () => void
  isDisabledRow?: boolean
}) {
  return (
    <div className={cn(
      "grid grid-cols-[1fr_100px_80px] items-center border-b border-[#efefef] px-[20px] py-[14px] transition-colors last:border-b-0",
      isDisabledRow ? "opacity-60" : "hover:bg-[#f5f5f5]"
    )}>
      <div className="flex items-center gap-[12px]">
        <div className={cn(
          "flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px] text-[11px] font-semibold",
          isDisabledRow ? "bg-[#e8e8e8] text-[#bbb]" : "bg-[#e0e0e0] text-[#555]"
        )}>
          {initials}
        </div>
        <div className="min-w-0">
          <span className="block truncate text-[14px] font-medium text-[#262626]">{name}</span>
          {coordinator && (
            <span className="block truncate text-[12px] text-[#999]">{coordinator}</span>
          )}
        </div>
      </div>

      <div>
        {isActive ? (
          <span className="inline-flex items-center rounded-full border border-green-100 bg-green-50 px-[10px] py-[2px] text-[11px] font-medium text-green-600">Active</span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-[10px] py-[2px] text-[11px] font-medium text-gray-500">Archived</span>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={onToggle}
          className="relative h-[22px] w-[40px] rounded-full transition-colors"
          style={{ backgroundColor: isActive ? "var(--primary-color)" : "#d4d4d4" }}
          tabIndex={0}
          aria-label={isActive ? "Archive participant" : "Activate participant"}
          aria-checked={isActive}
          role="switch"
        >
          <span
            className={cn(
              "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform",
              isActive ? "left-[20px]" : "left-[2px]"
            )}
          />
        </button>
      </div>
    </div>
  )
}
