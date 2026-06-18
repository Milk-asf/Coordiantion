"use client"

import { useState, type RefObject, type ReactNode, type ComponentType } from "react"
import { useRouter } from "next/navigation"
import type { Client, StaffDetails, StaffMember } from "@/lib/types"
import {
  SidebarDetailRow,
  SidebarEditableField,
  SidebarContactChip,
  SidebarDateOfBirthField,
  SidebarAddressField,
  getFieldPillClass,
} from "@/app/(dashboard)/clients/[id]/_components/client-profile-helpers"
import { ProfileAccordionSection } from "@/components/profile-account-details/profile-accordion-section"
import { ProfileAccountDetailsPanel, type AccountDetailsTab } from "@/components/profile-account-details/profile-account-details-panel"
import { StaffActivityFeed } from "@/components/profile-account-details/staff-activity-feed"
import { AccountRosterShifts } from "@/components/profile-account-details/account-roster-shifts"
import {
  Mail,
  Smartphone,
  MapPin,
  UserRound,
  CalendarDays,
  ChevronDown,
} from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"
import { getCategoryChipClasses } from "@/lib/chip-colors"

interface StaffActivityItem {
  id: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  content: ReactNode
  time: string
}

interface StaffAccountDetailsProps {
  member: StaffMember
  d: StaffDetails
  sf: (key: string) => boolean
  canAssignClients: boolean
  assignedClients: Client[]
  unassignedClients: Client[]
  filteredUnassignedClients: Client[]
  activities: StaffActivityItem[]
  isSidebarAssignOpen: boolean
  assignClientSearch: string
  sidebarAssignBtnRef: RefObject<HTMLButtonElement | null>
  sidebarAssignInputRef: RefObject<HTMLInputElement | null>
  onSetIsSidebarAssignOpen: (open: boolean) => void
  onSetAssignClientSearch: (search: string) => void
  onAssignClient: (clientId: string) => void
  onUpdateField: (field: keyof StaffDetails, value: string) => void
  activeTab: AccountDetailsTab
  onTabChange: (tab: AccountDetailsTab) => void
  onHideSidebar?: () => void
  hideTabBar?: boolean
}

const defaultOpenSections = {
  staffInformation: true,
  employment: false,
  teamAssignments: false,
  emergencyContact: false,
}

export function StaffAccountDetails({
  member,
  d,
  sf,
  canAssignClients,
  assignedClients,
  filteredUnassignedClients,
  unassignedClients,
  activities,
  isSidebarAssignOpen,
  assignClientSearch,
  sidebarAssignBtnRef,
  sidebarAssignInputRef,
  onSetIsSidebarAssignOpen,
  onSetAssignClientSearch,
  onAssignClient,
  onUpdateField,
  activeTab,
  onTabChange,
  onHideSidebar,
  hideTabBar,
}: StaffAccountDetailsProps) {
  const router = useRouter()
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
      activity={<StaffActivityFeed activities={activities} />}
      roster={
        <AccountRosterShifts
          mode="staff"
          entityId={member.id}
          emptyMessage="No shifts assigned to this staff member yet"
        />
      }
      details={
        <>
      <ProfileAccordionSection
        title="Staff Information"
        isOpen={openSections.staffInformation}
        onToggle={() => toggleSection("staffInformation")}
      >
        {sf("s-email") && (
          <SidebarDetailRow icon={Mail} label="Email">
            <SidebarContactChip value={d.email} onChange={(v) => onUpdateField("email", v)} placeholder="Enter email" />
          </SidebarDetailRow>
        )}
        {sf("s-phone") && (
          <SidebarDetailRow icon={Smartphone} label="Phone">
            <SidebarContactChip value={d.phone} onChange={(v) => onUpdateField("phone", v)} placeholder="Enter phone number" />
          </SidebarDetailRow>
        )}
        {sf("s-address") && (
          <SidebarDetailRow icon={MapPin} label="Address">
            <SidebarAddressField value={d.address} onChange={(v) => onUpdateField("address", v)} />
          </SidebarDetailRow>
        )}
        {sf("s-gender") && (
          <SidebarDetailRow icon={UserRound} label="Gender">
            <SidebarEditableField
              value={d.gender}
              onChange={(v) => onUpdateField("gender", v)}
              type="select"
              options={["Male", "Female", "Non-binary", "Other", "Prefer not to say"]}
              displayClassName={d.gender ? getFieldPillClass("gender", d.gender.toLowerCase()) : undefined}
            />
          </SidebarDetailRow>
        )}
        {sf("s-date-of-birth") && (
          <SidebarDetailRow icon={CalendarDays} label="Date of Birth">
            <SidebarDateOfBirthField value={d.dateOfBirth} onChange={(v) => onUpdateField("dateOfBirth", v)} />
          </SidebarDetailRow>
        )}
        {sf("s-start-date") && (
          <SidebarDetailRow icon={CalendarDays} label="Start Date">
            <SidebarEditableField value={d.startDate} onChange={(v) => onUpdateField("startDate", v)} type="date" placeholder="Select start date" />
          </SidebarDetailRow>
        )}
        {sf("s-first-name") && (
          <SidebarDetailRow label="First Name">
            <SidebarEditableField value={d.firstName} onChange={(v) => onUpdateField("firstName", v)} placeholder="First name" />
          </SidebarDetailRow>
        )}
        {sf("s-last-name") && (
          <SidebarDetailRow label="Last Name">
            <SidebarEditableField value={d.lastName} onChange={(v) => onUpdateField("lastName", v)} placeholder="Last name" />
          </SidebarDetailRow>
        )}
        {sf("s-preferred-name") && (
          <SidebarDetailRow label="Preferred Name">
            <SidebarEditableField value={d.preferredName} onChange={(v) => onUpdateField("preferredName", v)} placeholder="Preferred name" />
          </SidebarDetailRow>
        )}
        {sf("s-pronouns") && (
          <SidebarDetailRow label="Pronouns">
            <SidebarEditableField
              value={d.pronouns}
              onChange={(v) => onUpdateField("pronouns", v)}
              type="select"
              options={["He/Him", "She/Her", "They/Them", "Other"]}
              displayClassName={d.pronouns ? getFieldPillClass("pronouns", d.pronouns) : undefined}
            />
          </SidebarDetailRow>
        )}
      </ProfileAccordionSection>

      <ProfileAccordionSection
        title="Employment"
        isOpen={openSections.employment}
        onToggle={() => toggleSection("employment")}
      >
        {sf("s-role") && (
          <SidebarDetailRow label="Role">
            <SidebarEditableField
              value={d.role}
              onChange={(v) => onUpdateField("role", v)}
              placeholder="Job role"
              displayClassName={d.role ? getFieldPillClass("role", d.role) : undefined}
            />
          </SidebarDetailRow>
        )}
        {sf("s-employment-type") && (
          <SidebarDetailRow label="Type">
            <SidebarEditableField
              value={d.employmentType}
              onChange={(v) => onUpdateField("employmentType", v)}
              type="select"
              options={["Full-time", "Part-time", "Casual", "Contract"]}
              displayClassName={d.employmentType ? getFieldPillClass("employmentType", d.employmentType.toLowerCase()) : undefined}
            />
          </SidebarDetailRow>
        )}
        {sf("s-start-date") && (
          <SidebarDetailRow label="Start Date">
            <SidebarEditableField value={d.startDate} onChange={(v) => onUpdateField("startDate", v)} type="date" placeholder="Start date" />
          </SidebarDetailRow>
        )}
        {sf("s-end-date") && (
          <SidebarDetailRow label="End Date">
            <SidebarEditableField value={d.endDate} onChange={(v) => onUpdateField("endDate", v)} type="date" placeholder="End date" />
          </SidebarDetailRow>
        )}
      </ProfileAccordionSection>

      <ProfileAccordionSection
        title="Team and Assignments"
        isOpen={openSections.teamAssignments}
        onToggle={() => toggleSection("teamAssignments")}
      >
        <SidebarDetailRow label="Assigned clients">
          <div className="relative min-w-0 flex-1">
            {canAssignClients ? (
              <button
                ref={sidebarAssignBtnRef}
                onClick={() => { onSetIsSidebarAssignOpen(!isSidebarAssignOpen); setTimeout(() => sidebarAssignInputRef.current?.focus(), 50) }}
                className="flex w-full min-w-0 items-center justify-between gap-[6px] rounded-none px-[6px] py-[3px] text-left transition-colors hover:bg-folk-hover"
                tabIndex={0}
                aria-label="Manage assigned clients"
              >
                {assignedClients.length === 0 ? (
                  <span className="text-[13px] font-medium text-[#ccc]">Assign clients</span>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-wrap gap-[4px]">
                    {assignedClients.map((client) => (
                      <span
                        key={client.id}
                        onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.id}`) }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); router.push(`/clients/${client.id}`) } }}
                        role="link"
                        tabIndex={0}
                        className={`${getCategoryChipClasses(client.id, { size: "sm" })} max-w-full cursor-pointer gap-[4px] py-[2px] transition-colors hover:brightness-[0.97]`}
                      >
                        <EntityIcon text={client.iconText} size="xs" />
                        <span className="truncate">{client.displayName}</span>
                      </span>
                    ))}
                  </div>
                )}
                <ChevronDown className="ml-[2px] h-[10px] w-[10px] shrink-0 text-folk-placeholder" strokeWidth={1.5} />
              </button>
            ) : assignedClients.length === 0 ? (
              <span className="px-[6px] py-[3px] text-[13px] font-medium text-[#ccc]">No clients assigned</span>
            ) : (
              <div className="flex flex-wrap gap-[4px] px-[6px] py-[3px]">
                {assignedClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className={`${getCategoryChipClasses(client.id, { size: "sm" })} max-w-full cursor-pointer gap-[4px] py-[2px] transition-colors hover:brightness-[0.97]`}
                    tabIndex={0}
                  >
                    <EntityIcon text={client.iconText} size="xs" />
                    <span className="truncate">{client.displayName}</span>
                  </button>
                ))}
              </div>
            )}
            {isSidebarAssignOpen && canAssignClients && (
              <>
                <div className="fixed inset-0 z-[49]" onClick={() => { onSetIsSidebarAssignOpen(false); onSetAssignClientSearch("") }} />
                <div className="absolute left-0 top-full z-[50] mt-[4px] w-[260px] overflow-hidden rounded-none border border-folk-border bg-folk-surface shadow-folk">
                  <div className="border-b border-folk-border-subtle px-[12px] py-[8px]">
                    <input
                      ref={sidebarAssignInputRef}
                      value={assignClientSearch}
                      onChange={(e) => onSetAssignClientSearch(e.target.value)}
                      placeholder="Search participants..."
                      className="w-full text-[13px] text-folk-text placeholder-[#ccc] outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto py-[4px]">
                    {filteredUnassignedClients.length === 0 ? (
                      <p className="px-[12px] py-[8px] text-[13px] text-folk-secondary">
                        {unassignedClients.length === 0 ? "All participants are assigned" : "No matches"}
                      </p>
                    ) : filteredUnassignedClients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => onAssignClient(c.id)}
                        className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-left text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                        tabIndex={0}
                      >
                        <EntityIcon text={c.iconText} size="xsm" />
                        <span className="truncate">{c.displayName}</span>
                        {c.owner && <span className="ml-auto shrink-0 text-[11px] text-folk-placeholder">{c.owner}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </SidebarDetailRow>
      </ProfileAccordionSection>

      <ProfileAccordionSection
        title="Emergency Contact"
        isOpen={openSections.emergencyContact}
        onToggle={() => toggleSection("emergencyContact")}
      >
        {sf("s-emergency-contact") && (
          <SidebarDetailRow label="Name">
            <SidebarEditableField value={d.emergencyContactName} onChange={(v) => onUpdateField("emergencyContactName", v)} placeholder="Emergency contact" />
          </SidebarDetailRow>
        )}
        {sf("s-emergency-phone") && (
          <SidebarDetailRow label="Phone">
            <SidebarContactChip value={d.emergencyContactPhone} onChange={(v) => onUpdateField("emergencyContactPhone", v)} placeholder="Phone number" />
          </SidebarDetailRow>
        )}
      </ProfileAccordionSection>
        </>
      }
    />
  )
}
