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
import { useTasks } from "@/lib/tasks-context"
import type { Client, ParticipantDetails } from "@/lib/types"
import { EntityIcon } from "@/components/entity-icon"
import { EditableField } from "@/components/editable-field"
import { ContactChip } from "@/components/contact-chip"
import { DetailRow } from "@/components/detail-row"
import {
  UserRound,
  ListFilter,
  Plus,
  SlidersHorizontal,
  ArrowUpRight,
  Users,
  Globe,
  Table2,
  X,
  Ellipsis,
  Expand,
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
  ChevronLeft,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  ArrowLeft,
  EyeOff,
  SquarePen,
  CheckSquare,
  File,
  UserPlus,
  Info,
  Clock,
  DollarSign,
} from "lucide-react"
import { CsvDropdown } from "@/components/csv-dropdown"
import { PageLoader, PageError } from "@/components/page-state"
import { useToast } from "@/components/toast"

const allPropertyColumns = [
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
  { key: "ndisPlans", label: "NDIS Plans", icon: FileText, minWidth: 240 },
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


interface ActivityItem {
  id: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  content: React.ReactNode
  time: string
  attachment?: string
  showMenu?: boolean
}

function getActivities(name: string): ActivityItem[] {
  return [
    {
      id: "1",
      icon: SquarePen,
      content: <><strong>{name}</strong> updated the note <strong>case note</strong></>,
      time: "5h ago",
    },
    {
      id: "2",
      icon: SquarePen,
      content: <><strong>{name}</strong> updated Name for the note <strong>case note</strong> from Untitled note to case note</>,
      time: "5h ago",
    },
    {
      id: "3",
      icon: SquarePen,
      content: <><strong>{name}</strong> created the note <strong>case note</strong></>,
      time: "5h ago",
    },
    {
      id: "4",
      icon: CheckSquare,
      content: <><strong>{name}</strong> created the task <strong>task</strong></>,
      time: "5h ago",
    },
    {
      id: "5",
      icon: File,
      content: <><strong>{name}</strong> created the file</>,
      time: "2d ago",
    },
    {
      id: "6",
      icon: FileText,
      content: <><strong>Lightfield</strong> updated 7 fields</>,
      time: "3w ago",
    },
    {
      id: "7",
      icon: UserPlus,
      content: <><strong>Lightfield</strong> created the contact <strong>andrew.hastings@pickerings.com.au</strong></>,
      time: "3w ago",
    },
    {
      id: "8",
      icon: FileText,
      content: <><strong>Lightfield</strong> added <strong>andrew.hastings@pickerings.com.au</strong> to <strong>Pickerings</strong></>,
      time: "3w ago",
    },
    {
      id: "9",
      icon: FileText,
      content: <><strong>Lightfield</strong> updated 2 fields</>,
      time: "3w ago",
    },
    {
      id: "10",
      icon: Info,
      content: <><strong>{name}</strong> sent the email <strong>credential</strong> to andrew.hastings@pickerings.com.au</>,
      time: "3w ago",
      attachment: "credential.pdf",
      showMenu: true,
    },
  ]
}

function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="px-[20px] py-[16px]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mb-[12px] flex items-center gap-[6px] text-[13px] font-medium text-[#888] transition-colors hover:text-[#262626]"
        tabIndex={0}
        aria-expanded={isOpen}
      >
        <ChevronDown className={`h-[12px] w-[12px] transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`} strokeWidth={1.5} />
        <span>Activity</span>
      </button>
      {isOpen && (
      <div className="relative">
        {activities.map((activity, idx) => {
          const isLast = idx === activities.length - 1
          const IconComp = activity.icon
          return (
            <div key={activity.id} className="relative flex gap-[12px]">
              <div className="relative flex flex-col items-center">
                <div className="relative z-10 flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-white">
                  <IconComp className="h-[16px] w-[16px] text-[#999]" strokeWidth={1.5} />
                </div>
                {!isLast && (
                  <div className="w-[1px] flex-1 bg-[#e8e8e8]" />
                )}
              </div>
              <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-[16px]"}`}>
                <div className="flex items-start justify-between gap-[8px]">
                  <p className="text-[13px] font-medium leading-[20px] text-[#555]">
                    {activity.content}
                    <span className="ml-[6px] text-[#bbb]">·</span>
                    <span className="ml-[6px] text-[12px] text-[#bbb]">{activity.time}</span>
                  </p>
                  {activity.showMenu && (
                    <button
                      className="mt-[2px] shrink-0 rounded p-[2px] text-[#bbb] transition-colors hover:bg-[#f5f5f5] hover:text-[#888]"
                      tabIndex={0}
                      aria-label="More options"
                    >
                      <Ellipsis className="h-[14px] w-[14px]" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
                {activity.attachment && (
                  <div className="mt-[8px] inline-flex items-center gap-[6px] rounded border border-[#dcdcdc] bg-transparent px-[10px] py-[6px] text-[13px] font-medium text-[#262626]">
                    <FileText className="h-[14px] w-[14px] text-[#999]" strokeWidth={1.5} />
                    {activity.attachment}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}

function ClientProfile({
  client,
  participantData,
  onUpdateField,
  onClose,
  staffNames,
  canAssignClients,
  onAssign,
}: {
  client: Client
  participantData: ParticipantDetails
  onUpdateField: (field: keyof ParticipantDetails, value: string) => void
  onClose: () => void
  staffNames: string[]
  canAssignClients: boolean
  onAssign: (coordinatorName: string) => void
}) {
  const [isPersonalExpanded, setIsPersonalExpanded] = useState(false)
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const router = useRouter()
  const { isFieldEnabled } = useFieldConfig()
  const pf = isFieldEnabled

  const handleExpand = () => {
    router.push(`/clients/${client.id}`)
  }

  return (
    <div className="h-full shrink-0 p-[10px]">
    <div className="flex h-full w-[625px] flex-col rounded-lg border border-[#dcdcdc] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
        <div className="flex min-w-0 items-center gap-[8px]">
          <EntityIcon text={client.iconText} size="sm" />
          <span className="truncate text-[13px] font-medium text-[#262626]">
            {client.displayName}
          </span>
        </div>
        <div className="flex items-center gap-[4px]">
          <button
            className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#999] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            aria-label="More options"
            tabIndex={0}
          >
            <Ellipsis className="h-[14px] w-[14px]" strokeWidth={1.75} />
          </button>
          <button
            onClick={handleExpand}
            className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#999] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            aria-label="Expand"
            tabIndex={0}
          >
            <Expand className="h-[13px] w-[13px]" strokeWidth={1.75} />
          </button>
          <button
            onClick={onClose}
            className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#999] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            aria-label="Close panel"
            tabIndex={0}
          >
            <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="flex items-center gap-[12px] px-[20px] pb-[20px] pt-[24px]">
          <EntityIcon text={client.iconText} size="lg" />
          <h2 className="text-[18px] font-semibold text-[#262626]">
            {client.displayName}
          </h2>
        </div>

        {/* Account details */}
        <div className="border-b border-[#f0f0f0] px-[20px] pb-[16px]">
          <h3 className="mb-[6px] text-[12px] font-semibold text-[#262626]">Account details</h3>
          {pf("p-first-name") && <DetailRow label="First Name" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
            <EditableField value={participantData.firstName} onChange={(v) => onUpdateField("firstName", v)} placeholder="First name" size="compact" />
          </DetailRow>}
          {pf("p-middle-name") && <DetailRow label="Middle Name" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
            <EditableField value={participantData.middleName} onChange={(v) => onUpdateField("middleName", v)} placeholder="Middle name" size="compact" />
          </DetailRow>}
          {pf("p-last-name") && <DetailRow label="Last Name" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
            <EditableField value={participantData.lastName} onChange={(v) => onUpdateField("lastName", v)} placeholder="Last name" size="compact" />
          </DetailRow>}
          {pf("p-preferred-name") && <DetailRow label="Preferred Name" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
            <EditableField value={participantData.preferredName} onChange={(v) => onUpdateField("preferredName", v)} placeholder="Preferred name" size="compact" />
          </DetailRow>}
          <DetailRow label="Coordinator" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
            {canAssignClients ? (
              <div className="relative">
                <button
                  onClick={() => setIsAssignOpen(!isAssignOpen)}
                  className="flex min-w-0 items-center gap-[6px] rounded px-[6px] py-[3px] text-[13px] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  {client.owner ? (
                    <>
                      <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-semibold text-blue-600">
                        {client.owner.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <span className="truncate font-medium text-[#262626]">{client.owner}</span>
                    </>
                  ) : (
                    <span className="font-medium text-[#ccc]">Assign coordinator</span>
                  )}
                  <ChevronDown className="ml-[2px] h-[10px] w-[10px] shrink-0 text-[#bbb]" strokeWidth={1.5} />
                </button>
                {isAssignOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsAssignOpen(false)} />
                    <div className="absolute left-0 top-full z-50 mt-[2px] max-h-[200px] min-w-[180px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                      <div
                        onClick={() => { onAssign(""); setIsAssignOpen(false) }}
                        className="flex w-full cursor-pointer items-center px-[12px] py-[8px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5]"
                        role="option"
                        aria-selected={!client.owner}
                      >
                        None
                      </div>
                      {staffNames.map((name) => (
                        <div
                          key={name}
                          onClick={() => { onAssign(name); setIsAssignOpen(false) }}
                          className={`flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] ${client.owner === name ? "bg-[#f5f5f5]" : ""}`}
                          role="option"
                          aria-selected={client.owner === name}
                        >
                          <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] bg-[#DBEAFE] text-[9px] font-semibold text-[#2563EB]">
                            {name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          {name}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-[6px] px-[6px] py-[3px]">
                {client.owner ? (
                  <>
                    <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-semibold text-blue-600">
                      {client.owner.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <span className="text-[13px] font-medium text-[#262626]">{client.owner}</span>
                  </>
                ) : (
                  <span className="text-[13px] font-medium text-[#ccc]">No coordinator</span>
                )}
              </div>
            )}
          </DetailRow>
          {pf("p-date-of-birth") && <DetailRow label="Date of Birth" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
            <EditableField value={participantData.dateOfBirth} onChange={(v) => onUpdateField("dateOfBirth", v)} type="date" placeholder="Date of birth" size="compact" />
          </DetailRow>}
          {pf("p-primary-diagnosis") && <DetailRow label="Primary Dx" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
            <ContactChip value={participantData.primaryDiagnosis} onChange={(v) => onUpdateField("primaryDiagnosis", v)} placeholder="Add diagnosis" variant="white" enableCopy={false} size="compact" emptyPrefix="+" />
          </DetailRow>}
          {pf("p-secondary-diagnosis") && <DetailRow label="Secondary Dx" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
            <ContactChip value={participantData.secondaryDiagnosis} onChange={(v) => onUpdateField("secondaryDiagnosis", v)} placeholder="Add diagnosis" variant="white" enableCopy={false} size="compact" emptyPrefix="+" />
          </DetailRow>}

          {!isPersonalExpanded && (
            <button
              onClick={() => setIsPersonalExpanded(true)}
              className="mt-[8px] flex items-center gap-[4px] text-[13px] font-medium text-[#888] transition-colors hover:text-[#262626]"
              tabIndex={0}
              aria-expanded={false}
            >
              <ChevronDown className="h-[12px] w-[12px]" strokeWidth={1.5} />
              <span>Show more</span>
            </button>
          )}

          {isPersonalExpanded && (
            <>
              {pf("p-gender") && <DetailRow label="Gender" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                <EditableField value={participantData.gender} onChange={(v) => onUpdateField("gender", v)} type="select" options={["Male", "Female", "Non-binary", "Other", "Prefer not to say"]} size="compact" />
              </DetailRow>}
              {pf("p-pronouns") && <DetailRow label="Pronouns" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                <EditableField value={participantData.pronouns} onChange={(v) => onUpdateField("pronouns", v)} type="select" options={["He/Him", "She/Her", "They/Them", "Other"]} size="compact" />
              </DetailRow>}
              {pf("p-ethnicity") && <DetailRow label="Ethnicity" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                <EditableField value={participantData.ethnicity} onChange={(v) => onUpdateField("ethnicity", v)} placeholder="Ethnicity" size="compact" />
              </DetailRow>}
              {pf("p-language") && <DetailRow label="Language" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                <EditableField value={participantData.language} onChange={(v) => onUpdateField("language", v)} placeholder="Language" size="compact" />
              </DetailRow>}

              <div className="my-[12px] h-px bg-[#e8e8e8]" />
              <h3 className="mb-[6px] text-[12px] font-semibold text-[#262626]">Contact Information</h3>
              {pf("p-email") && <DetailRow label="Email" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                <ContactChip value={participantData.email} onChange={(v) => onUpdateField("email", v)} placeholder="Email address" size="compact" emptyPrefix="+" />
              </DetailRow>}
              {pf("p-phone") && <DetailRow label="Phone" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                <ContactChip value={participantData.phone} onChange={(v) => onUpdateField("phone", v)} placeholder="Phone number" size="compact" emptyPrefix="+" />
              </DetailRow>}
              {pf("p-contact-method") && <DetailRow label="Contact" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                <EditableField value={participantData.preferredContactMethod} onChange={(v) => onUpdateField("preferredContactMethod", v)} type="select" options={["SMS", "Email", "Call (Mobile)", "Call (Phone)"]} size="compact" />
              </DetailRow>}
              {pf("p-sign-method") && <DetailRow label="Sign Method" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                <EditableField value={participantData.preferredSignMethod} onChange={(v) => onUpdateField("preferredSignMethod", v)} type="select" options={["In Person", "Electronically"]} size="compact" />
              </DetailRow>}

              <div className="my-[12px] h-px bg-[#e8e8e8]" />
              <h3 className="mb-[6px] text-[12px] font-semibold text-[#262626]">Reference Numbers</h3>
              {pf("p-ndis-number") && <DetailRow label="NDIS" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                <ContactChip value={participantData.ndisNumber} onChange={(v) => onUpdateField("ndisNumber", v)} placeholder="NDIS number" variant="white" size="compact" emptyPrefix="+" />
              </DetailRow>}
              {pf("p-medicare-number") && <DetailRow label="Medicare" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                <ContactChip value={participantData.medicareNumber} onChange={(v) => onUpdateField("medicareNumber", v)} placeholder="Medicare number" variant="white" size="compact" emptyPrefix="+" />
              </DetailRow>}
              {pf("p-centrelink-number") && <DetailRow label="Centrelink" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                <ContactChip value={participantData.centrelinkNumber} onChange={(v) => onUpdateField("centrelinkNumber", v)} placeholder="Centrelink number" variant="white" size="compact" emptyPrefix="+" />
              </DetailRow>}
              {pf("p-external-id") && <DetailRow label="External ID" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                <ContactChip value={participantData.externalId} onChange={(v) => onUpdateField("externalId", v)} placeholder="External ID" variant="white" size="compact" emptyPrefix="+" />
              </DetailRow>}

              <div className="my-[12px] h-px bg-[#e8e8e8]" />
              <h3 className="mb-[6px] text-[12px] font-semibold text-[#262626]">Other Details</h3>
              {pf("p-service-start") && <DetailRow label="Service Start" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                <EditableField value={participantData.serviceCommencementDate} onChange={(v) => onUpdateField("serviceCommencementDate", v)} type="date" placeholder="Commencement date" size="compact" />
              </DetailRow>}
              {pf("p-service-exit") && <DetailRow label="Service Exit" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                <EditableField value={participantData.serviceExitDate} onChange={(v) => onUpdateField("serviceExitDate", v)} type="date" placeholder="Exit date" size="compact" />
              </DetailRow>}

              <button
                onClick={() => setIsPersonalExpanded(false)}
                className="mt-[8px] flex items-center gap-[4px] text-[13px] font-medium text-[#888] transition-colors hover:text-[#262626]"
                tabIndex={0}
                aria-expanded={true}
              >
                <ChevronDown className="h-[12px] w-[12px] rotate-180" strokeWidth={1.5} />
                <span>Show less</span>
              </button>
            </>
          )}
        </div>

        {/* Upcoming reminders */}
        <div className="border-b border-[#f0f0f0] px-[20px] py-[16px]">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#262626]">Upcoming reminders</h3>
            <button
              className="text-[12px] font-medium text-[#888] transition-colors hover:text-[#262626]"
              tabIndex={0}
            >
              See all
            </button>
          </div>
          <p className="mt-[8px] text-[13px] font-medium text-[#bbb]">No upcoming reminders</p>
        </div>

        {/* Open tasks */}
        <div className="border-b border-[#f0f0f0] px-[20px] py-[16px]">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#262626]">Open tasks</h3>
            <button
              className="text-[12px] font-medium text-[#888] transition-colors hover:text-[#262626]"
              tabIndex={0}
            >
              See all
            </button>
          </div>
          <p className="mt-[8px] text-[13px] font-medium text-[#bbb]">No open tasks</p>
        </div>

        {/* Activity feed */}
        <ActivityFeed activities={getActivities("izak reeves")} />
      </div>
    </div>
    </div>
  )
}

interface SavedView {
  id: string
  name: string
  columnKeys: string[]
  sortKey: string | null
  sortDirection: "asc" | "desc"
}

export default function ClientsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { clients, isLoading, fetchError, hasMore, isLoadingMore, loadMore, addClient, updateClient, updateParticipantField, refetch } = useClients()
  const { getContactsForClient, addContact } = useContacts()
  const { participantDisabled } = useFieldConfig()
  const staffNames = useAssignableCoordinators()
  const { canManageClients, canAssignClients } = usePermissions()
  const { tasks: allTasks } = useTasks()

  const availablePropertyColumns = useMemo(
    () => allPropertyColumns.filter((col) => !participantDisabled.has(col.key)),
    [participantDisabled]
  )
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(defaultVisibleKeys)
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const [columnMenuKey, setColumnMenuKey] = useState<string | null>(null)
  const [columnMenuPos, setColumnMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [isCreateViewOpen, setIsCreateViewOpen] = useState(false)
  const [newViewName, setNewViewName] = useState("")
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false)
  const [newClientName, setNewClientName] = useState("")
  const [viewContextMenu, setViewContextMenu] = useState<{ viewId: string; x: number; y: number } | null>(null)
  const [deleteViewConfirm, setDeleteViewConfirm] = useState<SavedView | null>(null)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [coordinatorFilter, setCoordinatorFilter] = useState<string[]>([])
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const filterPillRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const displayBtnRef = useRef<HTMLButtonElement>(null)
  const viewNameInputRef = useRef<HTMLInputElement>(null)

  const applySavedView = useCallback((view: SavedView) => {
    setVisibleColumnKeys(view.columnKeys)
    setSortKey(view.sortKey)
    setSortDirection(view.sortDirection)
  }, [])

  const resetSavedViewState = useCallback(() => {
    setVisibleColumnKeys(defaultVisibleKeys)
    setSortKey(null)
    setSortDirection("asc")
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
      sortKey,
      sortDirection,
    }),
    applyView: applySavedView,
    resetState: resetSavedViewState,
    syncView: (view) => ({
      ...view,
      columnKeys: [...visibleColumnKeys],
      sortKey,
      sortDirection,
    }),
  })

  useEffect(() => {
    syncActiveView()
  }, [sortDirection, sortKey, syncActiveView, visibleColumnKeys])

  const visibleColumns = visibleColumnKeys
    .filter((key) => !participantDisabled.has(key))
    .map((key) => allPropertyColumns.find((col) => col.key === key))
    .filter(Boolean) as typeof allPropertyColumns

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

  const uniqueStatuses = useMemo(() => [...new Set(clients.map((c) => c.status))].sort(), [clients])
  const uniqueCoordinators = useMemo(() => [...new Set(clients.map((c) => c.owner).filter(Boolean))].sort(), [clients])

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (statusFilter.length > 0) {
        if (!statusFilter.includes(c.status)) return false
      } else {
        if (c.status === "archived") return false
      }
      if (coordinatorFilter.length > 0 && !coordinatorFilter.includes(c.owner)) return false
      return true
    })
  }, [clients, statusFilter, coordinatorFilter])

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

  const sortedClients = (() => {
    if (!sortKey) return filteredClients
    return [...filteredClients].sort((a, b) => {
      const pA = getParticipantData(a)
      const pB = getParticipantData(b)
      let valA = ""
      let valB = ""
      switch (sortKey) {
        case "name": valA = a.name; valB = b.name; break
        case "ndisNumber": valA = pA.ndisNumber; valB = pB.ndisNumber; break
        case "diagnosis": valA = pA.primaryDiagnosis; valB = pB.primaryDiagnosis; break
        case "email": valA = pA.email; valB = pB.email; break
        case "phone": valA = pA.phone; valB = pB.phone; break
        case "dob": valA = pA.dateOfBirth; valB = pB.dateOfBirth; break
        case "gender": valA = pA.gender; valB = pB.gender; break
        case "pronouns": valA = pA.pronouns; valB = pB.pronouns; break
        case "ethnicity": valA = pA.ethnicity; valB = pB.ethnicity; break
        case "language": valA = pA.language; valB = pB.language; break
        case "preferredName": valA = pA.preferredName; valB = pB.preferredName; break
        case "medicareNumber": valA = pA.medicareNumber; valB = pB.medicareNumber; break
        case "centrelinkNumber": valA = pA.centrelinkNumber; valB = pB.centrelinkNumber; break
        case "externalId": valA = pA.externalId; valB = pB.externalId; break
        case "preferredContactMethod": valA = pA.preferredContactMethod; valB = pB.preferredContactMethod; break
        case "preferredSignMethod": valA = pA.preferredSignMethod; valB = pB.preferredSignMethod; break
        case "serviceCommencementDate": valA = pA.serviceCommencementDate; valB = pB.serviceCommencementDate; break
        case "serviceExitDate": valA = pA.serviceExitDate; valB = pB.serviceExitDate; break
        case "nextCheckUp": valA = getNextCheckUp(a.id, a.name) || "9999"; valB = getNextCheckUp(b.id, b.name) || "9999"; break
        default: {
          if (sortKey.startsWith("contact-")) {
            const relKey = sortKey.replace("contact-", "")
            const cA = getContactsForClient(a.name).find((c) => c.relationship === relKey)
            const cB = getContactsForClient(b.name).find((c) => c.relationship === relKey)
            valA = cA?.name || ""; valB = cB?.name || ""
          }
          break
        }
      }
      const cmp = valA.localeCompare(valB)
      return sortDirection === "asc" ? cmp : -cmp
    })
  })()

  if (isLoading) return <PageLoader label="Loading clients…" />
  if (fetchError) return <PageError message="Failed to load clients" onRetry={refetch} />

  return (
    <div className="relative flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-[44px] shrink-0 items-center justify-between gap-[8px] border-b border-[#f0f0f0] px-[16px]">
          <div className="flex min-w-0 flex-1 items-center gap-[8px] overflow-x-auto">
            <span className="shrink-0 text-[13px] font-medium text-[#262626]">Clients</span>
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
          {canManageClients && (
            <div className="flex items-center gap-[8px]">
              <CsvDropdown
                entityType="clients"
                columns={csvColumns}
                exportColumns={exportCsvColumns}
                data={exportCsvData}
                onImport={handleCsvImport}
              />
              <button
                onClick={() => setIsCreateClientOpen(true)}
                className="primary-btn flex items-center gap-[5px] rounded-[4px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
                tabIndex={0}
              >
                <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                <span className="hidden sm:inline">Add new</span>
              </button>
            </div>
          )}
        </div>

        
        <div className="flex h-[41px] shrink-0 items-center gap-[8px] border-b border-[#dcdcdc] px-[16px]">
          <div className="relative">
            <button
              ref={filterBtnRef}
              onClick={() => { setIsFilterMenuOpen(!isFilterMenuOpen); setActiveFilterDropdown(null) }}
              className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>Filter</span>
            </button>
            {isFilterMenuOpen && (
              <>
                <div className="fixed inset-0 z-[55]" onClick={() => setIsFilterMenuOpen(false)} />
                <div className="absolute left-0 top-full z-[60] mt-[4px] w-[180px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                  <p className="px-[16px] py-[6px] text-[11px] font-medium text-[#888]">Filter by</p>
                  {[
                    { key: "status", label: "Status", icon: ListFilter },
                    { key: "coordinator", label: "Coordinator", icon: User },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.key}
                        onClick={() => { setActiveFilterDropdown(item.key); setIsFilterMenuOpen(false) }}
                        className="flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                        tabIndex={0}
                      >
                        <Icon className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
          {statusFilter.length > 0 && (
            <div className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626]">
              <ListFilter className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
              <button ref={(el) => { filterPillRefs.current["status"] = el }} onClick={() => setActiveFilterDropdown(activeFilterDropdown === "status" ? null : "status")} className="hover:underline" tabIndex={0}>Status</button>
              <span className="text-[#888]">is</span>
              <span>{statusFilter.length} {statusFilter.length === 1 ? "value" : "values"}</span>
              <button onClick={() => setStatusFilter([])} className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded text-[#888] transition-colors hover:text-[#262626]" tabIndex={0} aria-label="Clear status filter"><X className="h-[12px] w-[12px]" strokeWidth={1.5} /></button>
            </div>
          )}
          {coordinatorFilter.length > 0 && (
            <div className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626]">
              <User className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
              <button ref={(el) => { filterPillRefs.current["coordinator"] = el }} onClick={() => setActiveFilterDropdown(activeFilterDropdown === "coordinator" ? null : "coordinator")} className="hover:underline" tabIndex={0}>Coordinator</button>
              <span className="text-[#888]">is</span>
              <span>{coordinatorFilter.length} {coordinatorFilter.length === 1 ? "value" : "values"}</span>
              <button onClick={() => setCoordinatorFilter([])} className="ml-[2px] flex h-[16px] w-[16px] items-center justify-center rounded text-[#888] transition-colors hover:text-[#262626]" tabIndex={0} aria-label="Clear coordinator filter"><X className="h-[12px] w-[12px]" strokeWidth={1.5} /></button>
            </div>
          )}
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
                        <span>Last interaction</span>
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

                  <div className="flex items-center gap-[20px] border-t border-[#f0f0f0] px-[20px] py-[12px]">
                    <button
                      onClick={() => setVisibleColumnKeys(defaultVisibleKeys)}
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

        <div className="flex-1 overflow-auto bg-[#fafafa]">
          <table className="w-full border-separate border-spacing-0 text-left" style={{ tableLayout: "fixed", minWidth: visibleColumns.reduce((sum, col) => sum + getWidth(col.key, col.minWidth), 240) }}>
            <thead>
              <tr>
                <th
                  className="sticky left-0 top-0 z-30 h-[44px] overflow-hidden whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]"
                  style={{ width: 240 }}
                >
                  <div className="flex items-center gap-[6px]">
                    <UserRound className="h-[13px] w-[13px] shrink-0 text-[#999]" strokeWidth={1.5} />
                    <span className="truncate">Participant</span>
                  </div>
                </th>
                {visibleColumns.map((col, i) => {
                  const ColIcon = col.icon
                  const isLast = i === visibleColumns.length - 1
                  const isFirst = i === 0
                  const isMenuOpen = columnMenuKey === col.key
                  return (
                    <th
                      key={col.key}
                      className={`group/col relative sticky top-0 z-20 h-[44px] overflow-hidden whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888] ${isLast ? "" : "border-r"}`}
                      style={{ width: getWidth(col.key, col.minWidth) }}
                    >
                      <div className="flex items-center gap-[6px]">
                        <ColIcon className="h-[13px] w-[13px] shrink-0 text-[#999]" strokeWidth={1.5} />
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
                          className={`ml-auto flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded transition-all ${isMenuOpen ? "bg-[#ebebeb] text-[#262626] opacity-100" : "text-[#999] opacity-0 hover:bg-[#ebebeb] hover:text-[#262626] group-hover/col:opacity-100"}`}
                          tabIndex={0}
                          aria-label={`Column options for ${col.label}`}
                        >
                          <ChevronDown className="h-[12px] w-[12px]" strokeWidth={2} />
                        </button>
                      </div>
                      {isMenuOpen && columnMenuPos && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => { setColumnMenuKey(null); setColumnMenuPos(null) }} />
                          <div
                            className="fixed z-50 w-[200px] overflow-hidden rounded-lg border border-[#dcdcdc] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                            style={{ top: columnMenuPos.top, left: columnMenuPos.left }}
                          >
                            <button
                              onClick={() => { setSortKey(col.key); setSortDirection("asc"); setColumnMenuKey(null); setColumnMenuPos(null) }}
                              className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                              tabIndex={0}
                            >
                              <ArrowUp className="h-[15px] w-[15px] text-[#888]" strokeWidth={1.75} />
                              <span>Sort ascending</span>
                            </button>
                            <button
                              onClick={() => { setSortKey(col.key); setSortDirection("desc"); setColumnMenuKey(null); setColumnMenuPos(null) }}
                              className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                              tabIndex={0}
                            >
                              <ArrowDown className="h-[15px] w-[15px] text-[#888]" strokeWidth={1.75} />
                              <span>Sort descending</span>
                            </button>
                            <div className="my-[4px] border-t border-[#f0f0f0]" />
                            <button
                              onClick={() => handleMoveColumn(col.key, "left")}
                              disabled={isFirst}
                              className={`flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium transition-colors ${isFirst ? "text-[#bbb]" : "text-[#262626] hover:bg-[#f5f5f5]"}`}
                              tabIndex={0}
                            >
                              <ArrowLeft className={`h-[15px] w-[15px] ${isFirst ? "text-[#ccc]" : "text-[#888]"}`} strokeWidth={1.75} />
                              <span>Move left</span>
                            </button>
                            <button
                              onClick={() => handleMoveColumn(col.key, "right")}
                              disabled={isLast}
                              className={`flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium transition-colors ${isLast ? "text-[#bbb]" : "text-[#262626] hover:bg-[#f5f5f5]"}`}
                              tabIndex={0}
                            >
                              <ArrowRight className={`h-[15px] w-[15px] ${isLast ? "text-[#ccc]" : "text-[#888]"}`} strokeWidth={1.75} />
                              <span>Move right</span>
                            </button>
                            <div className="my-[4px] border-t border-[#f0f0f0]" />
                            <button
                              onClick={() => { handleToggleColumn(col.key); setColumnMenuKey(null); setColumnMenuPos(null) }}
                              className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                              tabIndex={0}
                            >
                              <EyeOff className="h-[15px] w-[15px] text-[#888]" strokeWidth={1.75} />
                              <span>Hide column</span>
                            </button>
                          </div>
                        </>
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
              {sortedClients.map((client) => {
                const isSelected = selectedClient?.id === client.id
                const rowBg = isSelected ? "bg-[#f5f5ff]" : "bg-[#fafafa]"
                const rowHover = isSelected ? "" : "group-hover:bg-[#f5f5f5]"
                const p = getParticipantData(client)
                const clientContacts = getContactsForClient(client.name)
                const cellClass = `h-[44px] overflow-hidden whitespace-nowrap border-b border-r border-[#dcdcdc] px-[20px] ${rowBg} ${rowHover}`

                const renderCell = (key: string, isLast: boolean) => {
                  const cls = isLast
                    ? `h-[44px] overflow-hidden whitespace-nowrap border-b px-[20px] ${rowBg} ${rowHover}`
                    : cellClass
                  const whiteChip = "inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] bg-[#e8edf2] px-[12px] text-[12px] font-medium text-[#334155]"
                  const dash = <span className="text-[#bbb]">—</span>
                  const textCls = `${cls} text-[13px] font-medium text-[#262626]`

                  switch (key) {
                    case "ndisNumber":
                      return <td key={key} className={cls}>{p.ndisNumber ? <span className={whiteChip}>{p.ndisNumber}</span> : dash}</td>
                    case "diagnosis":
                      return (
                        <td key={key} className={cls}>
                          <div className="flex items-center gap-[6px]">
                            {p.primaryDiagnosis && <span className={whiteChip}>{p.primaryDiagnosis}</span>}
                            {p.secondaryDiagnosis && <span className={whiteChip}>{p.secondaryDiagnosis}</span>}
                            {!p.primaryDiagnosis && !p.secondaryDiagnosis && dash}
                          </div>
                        </td>
                      )
                    case "email":
                      return <td key={key} className={textCls}>{p.email || dash}</td>
                    case "phone":
                      return <td key={key} className={textCls}>{p.phone || dash}</td>
                    case "dob":
                      return (
                        <td key={key} className={textCls}>
                          {p.dateOfBirth ? new Date(p.dateOfBirth + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : dash}
                        </td>
                      )
                    case "gender":
                      return <td key={key} className={textCls}>{p.gender || dash}</td>
                    case "pronouns":
                      return <td key={key} className={textCls}>{p.pronouns || dash}</td>
                    case "ethnicity":
                      return <td key={key} className={textCls}>{p.ethnicity || dash}</td>
                    case "language":
                      return <td key={key} className={textCls}>{p.language || dash}</td>
                    case "preferredName":
                      return <td key={key} className={textCls}>{p.preferredName || dash}</td>
                    case "medicareNumber":
                      return <td key={key} className={cls}>{p.medicareNumber ? <span className={whiteChip}>{p.medicareNumber}</span> : dash}</td>
                    case "centrelinkNumber":
                      return <td key={key} className={cls}>{p.centrelinkNumber ? <span className={whiteChip}>{p.centrelinkNumber}</span> : dash}</td>
                    case "externalId":
                      return <td key={key} className={cls}>{p.externalId ? <span className={whiteChip}>{p.externalId}</span> : dash}</td>
                    case "preferredContactMethod":
                      return <td key={key} className={textCls}>{p.preferredContactMethod || dash}</td>
                    case "preferredSignMethod":
                      return <td key={key} className={textCls}>{p.preferredSignMethod || dash}</td>
                    case "nextCheckUp": {
                      const nextDate = getNextCheckUp(client.id, client.name)
                      if (!nextDate) return <td key={key} className={textCls}>{dash}</td>
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
                        <td key={key} className={cls}>
                          <span className={`inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] px-[12px] text-[12px] font-medium ${chipColor}`}>
                            {daysLabel}
                          </span>
                        </td>
                      )
                    }
                    case "serviceCommencementDate":
                      return (
                        <td key={key} className={textCls}>
                          {p.serviceCommencementDate ? new Date(p.serviceCommencementDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : dash}
                        </td>
                      )
                    case "serviceExitDate":
                      return (
                        <td key={key} className={textCls}>
                          {p.serviceExitDate ? new Date(p.serviceExitDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : dash}
                        </td>
                      )
                    case "ndisPlans": {
                      const plans = p.plans || []
                      if (plans.length === 0) return <td key={key} className={cls}>{dash}</td>
                      const fmtDate = (d: string) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "?"
                      return (
                        <td key={key} className={cls}>
                          <div className="flex items-center gap-[6px]">
                            {plans.map((plan) => (
                              <span key={plan.id} className={whiteChip}>
                                {fmtDate(plan.startDate)} – {fmtDate(plan.endDate)}{plan.isPacePlan ? " · PACE" : ""}
                              </span>
                            ))}
                          </div>
                        </td>
                      )
                    }
                    case "budgets": {
                      const budgets = p.budgets || []
                      if (budgets.length === 0) return <td key={key} className={cls}>{dash}</td>
                      return (
                        <td key={key} className={cls}>
                          <div className="flex items-center gap-[6px]">
                            {budgets.map((budget) => (
                              <span key={budget.id} className={whiteChip}>{budget.name || "Budget"}</span>
                            ))}
                          </div>
                        </td>
                      )
                    }
                    default: {
                      if (key.startsWith("contact-")) {
                        const relKey = key.replace("contact-", "")
                        const matchingContacts = clientContacts.filter((c) => c.relationship === relKey)
                        return (
                          <td key={key} className={cls}>
                            {matchingContacts.length > 0 ? (
                              <div className="flex items-center gap-[6px]">
                                {matchingContacts.map((c) => <span key={c.id} className={whiteChip}>{c.name}</span>)}
                              </div>
                            ) : dash}
                          </td>
                        )
                      }
                      return <td key={key} className={textCls}>{dash}</td>
                    }
                  }
                }

                return (
                  <tr key={client.id} className="group">
                    <td
                      onClick={() => setSelectedClient(client)}
                      className={`sticky left-0 z-10 h-[44px] cursor-pointer overflow-hidden whitespace-nowrap border-b border-r border-[#dcdcdc] px-[20px] ${rowBg} ${rowHover}`}
                    >
                      <div className="flex items-center gap-[10px]">
                        <EntityIcon text={client.iconText} size="sm" />
                        <span className="truncate text-[13px] font-medium text-[#262626]">{client.displayName}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.id}`) }}
                          className="ml-auto flex h-[22px] w-[22px] items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 text-[#999] hover:bg-[#f0f0f0] hover:text-[#262626]"
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
          </table>
          {hasMore && (
            <div className="flex justify-center py-[16px]">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="text-[13px] font-medium text-[#888] transition-colors hover:text-[#262626] disabled:opacity-50"
                tabIndex={0}
              >
                {isLoadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
          <span className="text-[12px] font-medium text-[#999]">
            {filteredClients.length} clients
          </span>
        </div>
      </div>

      {activeFilterDropdown && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setActiveFilterDropdown(null)} />
          {(() => {
            const anchor = filterPillRefs.current[activeFilterDropdown] || filterBtnRef.current
            const rect = anchor?.getBoundingClientRect()
            if (!rect) return null
            const dropdownStyle = { top: rect.bottom + 4, left: rect.left, minWidth: 200 }

            if (activeFilterDropdown === "status") return (
              <div className="fixed z-[60] max-h-[280px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]" style={dropdownStyle}>
                <button onClick={() => { setActiveFilterDropdown(null); setIsFilterMenuOpen(true) }} className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
                  <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
                  <span>Back</span>
                </button>
                <p className="px-[16px] py-[4px] text-[11px] font-medium text-[#888]">Filter by status</p>
                {uniqueStatuses.map((val) => {
                  const isActive = statusFilter.includes(val)
                  return (
                    <button key={val} onClick={() => setStatusFilter((prev) => isActive ? prev.filter((f) => f !== val) : [...prev, val])} className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-[#f5f5f5]" : ""}`} tabIndex={0}>
                      <div className={`flex h-[16px] w-[16px] items-center justify-center rounded border ${isActive ? "border-[#262626] bg-[#262626]" : "border-[#d0d0d0]"}`}>
                        {isActive && <span className="text-[10px] text-white">✓</span>}
                      </div>
                      <span className="text-[#262626] capitalize">{val}</span>
                    </button>
                  )
                })}
                {uniqueStatuses.length === 0 && <p className="px-[16px] py-[8px] text-[13px] text-[#888]">No statuses</p>}
                <div className="border-t border-[#f0f0f0] px-[8px] py-[4px]">
                  <button onClick={() => { setStatusFilter([]); setActiveFilterDropdown(null) }} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>Clear</button>
                </div>
              </div>
            )

            if (activeFilterDropdown === "coordinator") return (
              <div className="fixed z-[60] max-h-[280px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]" style={dropdownStyle}>
                <button onClick={() => { setActiveFilterDropdown(null); setIsFilterMenuOpen(true) }} className="flex w-full items-center gap-[6px] px-[16px] py-[6px] text-[11px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
                  <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={1.5} />
                  <span>Back</span>
                </button>
                <p className="px-[16px] py-[4px] text-[11px] font-medium text-[#888]">Filter by coordinator</p>
                {uniqueCoordinators.map((name) => {
                  const isActive = coordinatorFilter.includes(name)
                  return (
                    <button key={name} onClick={() => setCoordinatorFilter((prev) => isActive ? prev.filter((f) => f !== name) : [...prev, name])} className={`flex w-full items-center gap-[8px] px-[16px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isActive ? "bg-[#f5f5f5]" : ""}`} tabIndex={0}>
                      <div className={`flex h-[16px] w-[16px] items-center justify-center rounded border ${isActive ? "border-[#262626] bg-[#262626]" : "border-[#d0d0d0]"}`}>
                        {isActive && <span className="text-[10px] text-white">✓</span>}
                      </div>
                      <span className="text-[#262626]">{name}</span>
                    </button>
                  )
                })}
                {uniqueCoordinators.length === 0 && <p className="px-[16px] py-[8px] text-[13px] text-[#888]">No coordinators</p>}
                <div className="border-t border-[#f0f0f0] px-[8px] py-[4px]">
                  <button onClick={() => { setCoordinatorFilter([]); setActiveFilterDropdown(null) }} className="w-full rounded px-[8px] py-[6px] text-left text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0}>Clear</button>
                </div>
              </div>
            )

            return null
          })()}
        </>
      )}

      {openClient && (
        <div className="absolute right-0 top-0 z-40 h-full overflow-hidden">
          <ClientProfile
            client={openClient}
            participantData={getParticipantData(openClient)}
            onUpdateField={(field, value) => handleUpdateField(openClient.id, field, value)}
            onClose={() => setSelectedClient(null)}
            staffNames={staffNames}
            canAssignClients={canAssignClients}
            onAssign={(name) => updateClient(openClient.id, { owner: name })}
          />
        </div>
      )}

      {isCreateViewOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20" onClick={() => { setIsCreateViewOpen(false); setNewViewName("") }} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#262626]">Create a view for account</h3>
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
                className={`rounded-[4px] px-[16px] py-[6px] text-[13px] font-medium transition-colors ${newViewName.trim() ? "primary-btn" : "border border-[#dcdcdc] text-[#bbb]"}`}
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
          <div className="relative z-10 w-[440px] rounded-lg bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between px-[24px] pt-[20px]">
              <div className="flex items-center gap-[8px]">
                <FileText className="h-[16px] w-[16px] text-[#555]" strokeWidth={1.5} />
                <h2 className="text-[15px] font-semibold text-[#262626]">Create client</h2>
              </div>
              <button
                onClick={() => { setIsCreateClientOpen(false); setNewClientName("") }}
                className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="px-[24px] pb-[20px] pt-[16px]">
              <div className="mb-[16px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Name</label>
                <input
                  type="text"
                  placeholder="Client name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateClient() }}
                  className="w-full border-b border-[#e0e0e0] pb-[8px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3]"
                  autoFocus
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreateClient}
                  disabled={!newClientName.trim()}
                  className={`text-[13px] font-medium transition-colors ${newClientName.trim() ? "text-[#262626] hover:text-[#555]" : "text-[#bbb]"}`}
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
