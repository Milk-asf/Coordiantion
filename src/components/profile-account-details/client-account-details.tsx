"use client"

import { useState, type RefObject } from "react"
import type { ActivityEntry, Client, Contact, ParticipantDetails } from "@/lib/types"
import { relationshipConfig } from "@/lib/types"
import {
  SidebarDetailRow,
  SidebarEditableField,
  SidebarCheckInField,
  SidebarContactChip,
  SidebarDiagnosisChip,
  SidebarDateOfBirthField,
  SidebarAddressField,
  mergeDiagnoses,
  getFieldPillClass,
} from "@/app/(dashboard)/clients/[id]/_components/client-profile-helpers"
import { ProfileAccordionSection } from "@/components/profile-account-details/profile-accordion-section"
import { ProfileAccountDetailsPanel, type AccountDetailsTab } from "@/components/profile-account-details/profile-account-details-panel"
import { AccountActivityFeed } from "@/components/profile-account-details/account-activity-feed"
import { AccountRosterShifts } from "@/components/profile-account-details/account-roster-shifts"
import {
  Mail,
  Smartphone,
  MapPin,
  Languages,
  UserRound,
  CalendarDays,
  Plus,
  Info,
  ChevronDown,
} from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"
import { CategoryChip } from "@/components/category-chip"
import {
  TABLE_FULL,
  TABLE_PANEL_CELL,
  TABLE_PANEL_CELL_LAST,
  TABLE_PANEL_HEADER_STICKY,
  TABLE_PANEL_HEADER_STICKY_LAST,
  TABLE_PANEL_TEXT,
} from "@/lib/table-styles"

interface ClientAccountDetailsProps {
  client: Client
  p: ParticipantDetails
  pf: (key: string) => boolean
  staffNames: string[]
  canAssignClients: boolean
  activityLog: ActivityEntry[]
  currentUserName: string
  stakeholders: Contact[]
  isCoordinatorOpen: boolean
  coordinatorSearch: string
  coordinatorInputRef: RefObject<HTMLInputElement | null>
  onSetIsCoordinatorOpen: (open: boolean) => void
  onSetCoordinatorSearch: (search: string) => void
  onAddStakeholder: () => void
  onUpdateField: (field: keyof ParticipantDetails, value: string) => void
  onUpdateFields: (fields: Partial<ParticipantDetails>) => void
  onUpdateClient: (id: string, updates: Partial<Client>) => void
  activeTab: AccountDetailsTab
  onTabChange: (tab: AccountDetailsTab) => void
  onHideSidebar?: () => void
  hideTabBar?: boolean
}

const defaultOpenSections = {
  clientInformation: true,
  team: false,
  fundingInformation: false,
  medicalInformation: false,
  financialDetails: false,
}

export function ClientAccountDetails({
  client,
  p,
  pf,
  staffNames,
  canAssignClients,
  activityLog,
  currentUserName,
  stakeholders,
  isCoordinatorOpen,
  coordinatorSearch,
  coordinatorInputRef,
  onSetIsCoordinatorOpen,
  onSetCoordinatorSearch,
  onAddStakeholder,
  onUpdateField,
  onUpdateFields,
  onUpdateClient,
  activeTab,
  onTabChange,
  onHideSidebar,
  hideTabBar,
}: ClientAccountDetailsProps) {
  const [openSections, setOpenSections] = useState(defaultOpenSections)

  const toggleSection = (key: keyof typeof defaultOpenSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <ProfileAccountDetailsPanel
      activeTab={activeTab}
      onTabChange={onTabChange}
      onHideSidebar={onHideSidebar}
      hideTabBar={hideTabBar}
      activity={<AccountActivityFeed entries={activityLog} currentUserName={currentUserName} />}
      roster={
        <AccountRosterShifts
          mode="client"
          entityId={client.id}
          emptyMessage="No shifts assigned to this participant yet"
        />
      }
      details={
        <>
      <ProfileAccordionSection
        title="Client Information"
        isOpen={openSections.clientInformation}
        onToggle={() => toggleSection("clientInformation")}
      >
        {pf("p-email") && (
          <SidebarDetailRow icon={Mail} label="Email">
            <SidebarContactChip value={p.email} onChange={(v) => onUpdateField("email", v)} placeholder="Enter email" />
          </SidebarDetailRow>
        )}
        {pf("p-phone") && (
          <SidebarDetailRow icon={Smartphone} label="Phone">
            <SidebarContactChip value={p.phone} onChange={(v) => onUpdateField("phone", v)} placeholder="Enter phone number" />
          </SidebarDetailRow>
        )}
        {pf("p-address") && (
          <SidebarDetailRow icon={MapPin} label="Address">
            <SidebarAddressField value={p.address} onChange={(v) => onUpdateField("address", v)} />
          </SidebarDetailRow>
        )}
        {pf("p-language") && (
          <SidebarDetailRow icon={Languages} label="Language">
            <SidebarEditableField
              value={p.language}
              onChange={(v) => onUpdateField("language", v)}
              placeholder="Select language"
              displayClassName={p.language ? getFieldPillClass("language", p.language) : undefined}
            />
          </SidebarDetailRow>
        )}
        {pf("p-gender") && (
          <SidebarDetailRow icon={UserRound} label="Gender">
            <SidebarEditableField
              value={p.gender}
              onChange={(v) => onUpdateField("gender", v)}
              type="select"
              options={["Male", "Female", "Non-binary", "Other", "Prefer not to say"]}
              displayClassName={p.gender ? getFieldPillClass("gender", p.gender.toLowerCase()) : undefined}
            />
          </SidebarDetailRow>
        )}
        {pf("p-date-of-birth") && (
          <SidebarDetailRow icon={CalendarDays} label="Date of Birth">
            <SidebarDateOfBirthField value={p.dateOfBirth} onChange={(v) => onUpdateField("dateOfBirth", v)} />
          </SidebarDetailRow>
        )}
        {pf("p-service-start") && (
          <SidebarDetailRow icon={CalendarDays} label="Start Date">
            <SidebarEditableField value={p.serviceCommencementDate} onChange={(v) => onUpdateField("serviceCommencementDate", v)} type="date" placeholder="Select start date" />
          </SidebarDetailRow>
        )}
        {pf("p-first-name") && (
          <SidebarDetailRow label="First Name">
            <SidebarEditableField value={p.firstName} onChange={(v) => onUpdateField("firstName", v)} placeholder="First name" />
          </SidebarDetailRow>
        )}
        {pf("p-last-name") && (
          <SidebarDetailRow label="Last Name">
            <SidebarEditableField value={p.lastName} onChange={(v) => onUpdateField("lastName", v)} placeholder="Last name" />
          </SidebarDetailRow>
        )}
        {pf("p-preferred-name") && (
          <SidebarDetailRow label="Preferred Name">
            <SidebarEditableField value={p.preferredName} onChange={(v) => onUpdateField("preferredName", v)} placeholder="Preferred name" />
          </SidebarDetailRow>
        )}
        <SidebarDetailRow label="Coordinator">
          {canAssignClients ? (
            <div className="relative min-w-0 flex-1">
              <button
                onClick={() => { onSetIsCoordinatorOpen(!isCoordinatorOpen); setTimeout(() => coordinatorInputRef.current?.focus(), 50) }}
                className="flex min-w-0 items-center gap-[6px] rounded-none px-[6px] py-[3px] text-[13px] transition-colors hover:bg-folk-hover"
                tabIndex={0}
              >
                {client.owner ? (
                  <>
                    <EntityIcon text={client.owner.split(" ").filter(Boolean).map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)} size="xsm" />
                    <span className="truncate font-medium text-folk-text">{client.owner}</span>
                  </>
                ) : (
                  <span className="font-medium text-[#ccc]">Assign coordinator</span>
                )}
                <ChevronDown className="ml-[2px] h-[10px] w-[10px] shrink-0 text-folk-placeholder" strokeWidth={1.5} />
              </button>
              {isCoordinatorOpen && (
                <>
                  <div className="fixed inset-0 z-[49]" onClick={() => { onSetIsCoordinatorOpen(false); onSetCoordinatorSearch("") }} />
                  <div className="absolute left-0 top-full z-[50] mt-[4px] w-[240px] overflow-hidden rounded-none border border-folk-border bg-folk-surface shadow-folk">
                    <div className="border-b border-folk-border-subtle px-[12px] py-[8px]">
                      <input
                        ref={coordinatorInputRef}
                        value={coordinatorSearch}
                        onChange={(e) => onSetCoordinatorSearch(e.target.value)}
                        placeholder="Search staff..."
                        className="w-full text-[13px] text-folk-text placeholder-[#ccc] outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto py-[4px]">
                      <button
                        onClick={() => { onUpdateClient(client.id, { owner: "" }); onSetIsCoordinatorOpen(false); onSetCoordinatorSearch("") }}
                        className="flex w-full items-center px-[12px] py-[8px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover"
                        tabIndex={0}
                      >
                        None
                      </button>
                      {staffNames
                        .filter((n) => !coordinatorSearch || n.toLowerCase().includes(coordinatorSearch.toLowerCase()))
                        .map((name) => {
                          const initials = name.split(" ").filter(Boolean).map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                          const isSelected = client.owner === name
                          return (
                            <button
                              key={name}
                              onClick={() => { onUpdateClient(client.id, { owner: name }); onSetIsCoordinatorOpen(false); onSetCoordinatorSearch("") }}
                              className={`flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium transition-colors hover:bg-folk-hover ${isSelected ? "bg-blue-50 text-blue-600" : "text-folk-text"}`}
                              tabIndex={0}
                            >
                              <EntityIcon text={initials} size="xsm" />
                              {name}
                              {isSelected && <span className="ml-auto text-[11px] text-blue-500">✓</span>}
                            </button>
                          )
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-[6px] px-[6px] py-[3px]">
              {client.owner ? (
                <>
                  <EntityIcon text={client.owner.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)} size="xsm" />
                  <span className="text-[13px] font-medium text-folk-text">{client.owner}</span>
                </>
              ) : (
                <span className="text-[13px] font-medium text-[#ccc]">No coordinator</span>
              )}
            </div>
          )}
        </SidebarDetailRow>
        <SidebarDetailRow label="Check-in">
          <SidebarCheckInField
            period={p.checkInPeriod}
            startDate={p.checkInStartDate}
            onChangePeriod={(v) => onUpdateField("checkInPeriod", v)}
            onChangeStartDate={(v) => onUpdateField("checkInStartDate", v)}
          />
        </SidebarDetailRow>
        {pf("p-contact-method") && (
          <SidebarDetailRow label="Contact">
            <SidebarEditableField
              value={p.preferredContactMethod}
              onChange={(v) => onUpdateField("preferredContactMethod", v)}
              type="select"
              options={["SMS", "Email", "Call (Mobile)", "Call (Phone)"]}
              displayClassName={p.preferredContactMethod ? getFieldPillClass("preferredContactMethod", p.preferredContactMethod) : undefined}
            />
          </SidebarDetailRow>
        )}
        {pf("p-sign-method") && (
          <SidebarDetailRow label="Sign Method">
            <SidebarEditableField
              value={p.preferredSignMethod}
              onChange={(v) => onUpdateField("preferredSignMethod", v)}
              type="select"
              options={["In Person", "Electronically"]}
              displayClassName={p.preferredSignMethod ? getFieldPillClass("preferredSignMethod", p.preferredSignMethod) : undefined}
            />
          </SidebarDetailRow>
        )}
      </ProfileAccordionSection>

      <ProfileAccordionSection
        title="Team"
        isOpen={openSections.team}
        onToggle={() => toggleSection("team")}
      >
        <div className="mb-[8px] flex items-center justify-end">
          <button
            type="button"
            onClick={onAddStakeholder}
            className="outline-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
            tabIndex={0}
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Add new</span>
          </button>
        </div>
        {stakeholders.length === 0 ? (
          <p className="py-[4px] text-[13px] font-medium text-folk-placeholder">No contacts yet</p>
        ) : (
          <div className="-mx-[16px] overflow-x-auto border-t border-folk-border">
            <table className={`${TABLE_FULL} min-w-[480px]`}>
              <thead>
                <tr>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Contact name</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Relationship</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Email</th>
                  <th className={TABLE_PANEL_HEADER_STICKY_LAST}>Phone number</th>
                </tr>
              </thead>
              <tbody>
                {stakeholders.map((c) => {
                  const rel = relationshipConfig[c.relationship] ?? { label: c.relationship || "—" }
                  const initials = c.name.split(" ").filter(Boolean).map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-folk-hover">
                      <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>
                        <div className="flex min-w-0 items-center gap-[8px]">
                          <EntityIcon text={initials || "?"} size="sm" />
                          <span className="truncate">{c.name}</span>
                        </div>
                      </td>
                      <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>
                        {c.relationship ? (
                          <CategoryChip label={rel.label} categoryKey={c.relationship} size="lg" />
                        ) : (
                          <span className="text-folk-placeholder">—</span>
                        )}
                      </td>
                      <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>
                        {c.email || <span className="text-folk-placeholder">—</span>}
                      </td>
                      <td className={`${TABLE_PANEL_CELL_LAST} ${TABLE_PANEL_TEXT}`}>
                        {c.phone || <span className="text-folk-placeholder">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="border-t border-folk-border px-[16px] py-[8px]">
              <span className="text-[12px] font-medium text-folk-secondary">
                {stakeholders.length} {stakeholders.length === 1 ? "contact" : "contacts"}
              </span>
            </div>
          </div>
        )}
      </ProfileAccordionSection>

      <ProfileAccordionSection
        title="Funding Information"
        isOpen={openSections.fundingInformation}
        onToggle={() => toggleSection("fundingInformation")}
      >
        <SidebarDetailRow label="Funding Type">
          <SidebarEditableField
            value={p.fundingType}
            onChange={(v) => onUpdateField("fundingType", v)}
            type="select"
            options={["plan-managed", "ndia-managed", "self-managed"]}
            displayClassName={p.fundingType ? getFieldPillClass("fundingType", p.fundingType) : undefined}
          />
        </SidebarDetailRow>
        {(p.fundingType === "plan-managed" || !p.fundingType) && (
          <>
            <SidebarDetailRow label="PM Organisation">
              <SidebarEditableField value={p.planManagerOrg} onChange={(v) => onUpdateField("planManagerOrg", v)} placeholder="Plan manager org" />
            </SidebarDetailRow>
            <SidebarDetailRow label="Plan Manager Name">
              <SidebarEditableField value={p.planManagerName} onChange={(v) => onUpdateField("planManagerName", v)} placeholder="Plan manager name" />
            </SidebarDetailRow>
          </>
        )}
        {p.fundingType !== "ndia-managed" && (
          <SidebarDetailRow label="Invoice Email">
            <div className="flex min-w-0 flex-1 items-center gap-[6px]">
              <div className="min-w-0 flex-1">
                {p.fundingType === "self-managed" ? (
                  <SidebarContactChip value={p.email} onChange={(v) => onUpdateField("email", v)} placeholder="Invoice email" variant="white" />
                ) : (
                  <SidebarContactChip value={p.planManagerEmail} onChange={(v) => onUpdateField("planManagerEmail", v)} placeholder="Invoice email" variant="white" />
                )}
              </div>
              <span className="group/info relative flex shrink-0">
                <Info className="h-[13px] w-[13px] cursor-help text-folk-placeholder transition-colors hover:text-folk-secondary" strokeWidth={1.5} />
                <span className="pointer-events-none absolute bottom-[calc(100%+6px)] right-0 z-20 w-[170px] rounded-none bg-[#1a1a1a] px-[8px] py-[5px] text-[11px] leading-[1.4] text-white opacity-0 transition-opacity duration-75 group-hover/info:opacity-100">
                  Invoices are sent to this email address.
                </span>
              </span>
            </div>
          </SidebarDetailRow>
        )}
        {pf("p-ndis-number") && (
          <SidebarDetailRow label="NDIS">
            <SidebarContactChip value={p.ndisNumber} onChange={(v) => onUpdateField("ndisNumber", v)} placeholder="NDIS number" variant="white" />
          </SidebarDetailRow>
        )}
        {pf("p-medicare-number") && (
          <SidebarDetailRow label="Medicare">
            <SidebarContactChip value={p.medicareNumber} onChange={(v) => onUpdateField("medicareNumber", v)} placeholder="Medicare number" variant="white" />
          </SidebarDetailRow>
        )}
        {pf("p-centrelink-number") && (
          <SidebarDetailRow label="Centrelink">
            <SidebarContactChip value={p.centrelinkNumber} onChange={(v) => onUpdateField("centrelinkNumber", v)} placeholder="Centrelink number" variant="white" />
          </SidebarDetailRow>
        )}
        {pf("p-external-id") && (
          <SidebarDetailRow label="External ID">
            <SidebarContactChip value={p.externalId} onChange={(v) => onUpdateField("externalId", v)} placeholder="External ID" variant="white" />
          </SidebarDetailRow>
        )}
      </ProfileAccordionSection>

      <ProfileAccordionSection
        title="Medical Information"
        isOpen={openSections.medicalInformation}
        onToggle={() => toggleSection("medicalInformation")}
      >
        {pf("p-primary-diagnosis") && (
          <SidebarDetailRow label="Diagnosis">
            <SidebarDiagnosisChip
              value={mergeDiagnoses(p.primaryDiagnosis, p.secondaryDiagnosis)}
              onChange={(v) => onUpdateFields(p.secondaryDiagnosis ? { primaryDiagnosis: v, secondaryDiagnosis: "" } : { primaryDiagnosis: v })}
              placeholder="Add diagnosis"
            />
          </SidebarDetailRow>
        )}
        {pf("p-pronouns") && (
          <SidebarDetailRow label="Pronouns">
            <SidebarEditableField
              value={p.pronouns}
              onChange={(v) => onUpdateField("pronouns", v)}
              type="select"
              options={["He/Him", "She/Her", "They/Them", "Other"]}
              displayClassName={p.pronouns ? getFieldPillClass("pronouns", p.pronouns) : undefined}
            />
          </SidebarDetailRow>
        )}
      </ProfileAccordionSection>

      <ProfileAccordionSection
        title="Client Service Details"
        isOpen={openSections.financialDetails}
        onToggle={() => toggleSection("financialDetails")}
      >
        {pf("p-service-exit") && (
          <SidebarDetailRow label="Service Exit">
            <SidebarEditableField value={p.serviceExitDate} onChange={(v) => onUpdateField("serviceExitDate", v)} type="date" placeholder="Exit date" />
          </SidebarDetailRow>
        )}
        <SidebarDetailRow label="Plan Start">
          <SidebarEditableField value={p.planStartDate} onChange={(v) => onUpdateField("planStartDate", v)} type="date" placeholder="Plan start date" />
        </SidebarDetailRow>
        <SidebarDetailRow label="Plan End">
          <SidebarEditableField value={p.planEndDate} onChange={(v) => onUpdateField("planEndDate", v)} type="date" placeholder="Plan end date" />
        </SidebarDetailRow>
      </ProfileAccordionSection>
        </>
      }
    />
  )
}
