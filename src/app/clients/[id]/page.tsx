"use client"

import { useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useContacts, relationshipConfig } from "@/lib/contacts-context"
import {
  UserRound,
  Ellipsis,
  FileText,
  User,
  Mail,
  Phone,
  Smartphone,
  MessageSquare,
  PenLine,
  Hash,
  CalendarDays,
  Heart,
  Languages,
  Stethoscope,
  ChevronDown,
  Plus,
  SquarePen,
  CheckSquare,
  File,
  UserPlus,
  Info,
  Globe,
  Clock,
  DollarSign,
  Users,
  Building2,
  Landmark,
  ArrowLeft,
  FolderOpen,
  Wallet,
  Target,
  BarChart3,
  PanelRightOpen,
  PanelRightClose,
  ClipboardList,
  ListFilter,
  X,
} from "lucide-react"

interface ParticipantDetails {
  firstName: string
  middleName: string
  lastName: string
  preferredName: string
  dateOfBirth: string
  gender: string
  pronouns: string
  ethnicity: string
  language: string
  primaryDiagnosis: string
  secondaryDiagnosis: string
  email: string
  mobile: string
  phone: string
  preferredContactMethod: string
  preferredSignMethod: string
  ndisNumber: string
  medicareNumber: string
  centrelinkNumber: string
  externalId: string
  serviceCommencementDate: string
  serviceExitDate: string
}

interface Client {
  name: string
  iconColor: string
  iconText: string
  iconShape: "square" | "circle"
  industry: string[]
  lastInteraction: string
  revenue: string
  headcount: string
  lastFunding: string
  website: string
  owner: string
  summary: string
  about: string
  participant: ParticipantDetails
}

interface ProfileContact {
  id: string
  firstName: string
  email: string
  phone: string
  relationship: string
}


const clients: Client[] = [
  {
    name: "Rappi",
    iconColor: "#e87040",
    iconText: "R",
    iconShape: "square",
    industry: ["E-commerce", "Food Delivery", "Financial Tech"],
    lastInteraction: "6h ago",
    revenue: "$1B to $10B",
    headcount: "1001-5000",
    lastFunding: "Series F",
    website: "rappi",
    owner: "Sam Lee",
    summary:
      "Rappi's team reached out to explore integration opportunities for their delivery logistics platform. Initial discovery call completed, follow-up demo scheduled for next week.",
    about:
      "Rappi is a Latin American super-app offering delivery, payments, and financial services across multiple countries, serving millions of users with on-demand commerce solutions.",
    participant: {
      firstName: "Rafael",
      middleName: "Andres",
      lastName: "Perez",
      preferredName: "Rappi",
      dateOfBirth: "1992-03-15",
      gender: "Male",
      pronouns: "He/Him",
      ethnicity: "Hispanic",
      language: "Spanish",
      primaryDiagnosis: "Autism Spectrum Disorder",
      secondaryDiagnosis: "ADHD",
      email: "rafael.perez@email.com",
      mobile: "0412 345 678",
      phone: "02 9876 5432",
      preferredContactMethod: "Call (Mobile)",
      preferredSignMethod: "Electronically",
      ndisNumber: "4312345678",
      medicareNumber: "2345 67890 1",
      centrelinkNumber: "123 456 789A",
      externalId: "EXT-001",
      serviceCommencementDate: "2024-01-15",
      serviceExitDate: "",
    },
  },
  {
    name: "Content-mobbin",
    iconColor: "#3b82f6",
    iconText: "C",
    iconShape: "circle",
    industry: ["Workforce Management"],
    lastInteraction: "17h ago",
    revenue: "$50M to $100M",
    headcount: "101-250",
    lastFunding: "Undisclosed",
    website: "mobbin",
    owner: "Sam Lee",
    summary:
      "Robert from Content-mobbin emailed inbound to learn more about the documenting flows service and requested a short call; no further interactions or opportunities are recorded yet. Next step is to respond to Robert's email, share an overview of the service and collaboration process, and propose times for an introductory call.",
    about:
      "Content-mobbin provides a documenting flows service that helps organizations efficiently document multiple product flows, likely generating revenue by offering this as a paid, collaborative service for product teams.",
    participant: {
      firstName: "Robert",
      middleName: "James",
      lastName: "Chen",
      preferredName: "Rob",
      dateOfBirth: "1988-07-22",
      gender: "Male",
      pronouns: "He/Him",
      ethnicity: "Chinese Australian",
      language: "English",
      primaryDiagnosis: "Cerebral Palsy",
      secondaryDiagnosis: "",
      email: "robert.chen@content-mobbin.com",
      mobile: "0423 456 789",
      phone: "",
      preferredContactMethod: "Email",
      preferredSignMethod: "Electronically",
      ndisNumber: "4398765432",
      medicareNumber: "3456 78901 2",
      centrelinkNumber: "234 567 890B",
      externalId: "EXT-002",
      serviceCommencementDate: "2023-09-01",
      serviceExitDate: "",
    },
  },
  {
    name: "Lovi",
    iconColor: "#6b7280",
    iconText: "L",
    iconShape: "square",
    industry: ["Artificial Intelligence", "Health Technology"],
    lastInteraction: "5d ago",
    revenue: "Less than $1M",
    headcount: "11-50",
    lastFunding: "Series B",
    website: "lovi-care",
    owner: "Sam Lee",
    summary:
      "Lovi is exploring AI-driven health monitoring solutions. Early-stage conversations about potential partnership for patient engagement tools.",
    about:
      "Lovi is a health technology startup leveraging artificial intelligence to provide personalized care recommendations and remote patient monitoring solutions.",
    participant: {
      firstName: "Olivia",
      middleName: "",
      lastName: "Nguyen",
      preferredName: "Lovi",
      dateOfBirth: "1995-11-08",
      gender: "Female",
      pronouns: "She/Her",
      ethnicity: "Vietnamese Australian",
      language: "English",
      primaryDiagnosis: "Intellectual Disability",
      secondaryDiagnosis: "Anxiety Disorder",
      email: "olivia.nguyen@email.com",
      mobile: "0434 567 890",
      phone: "03 8765 4321",
      preferredContactMethod: "SMS",
      preferredSignMethod: "In Person",
      ndisNumber: "4356789012",
      medicareNumber: "4567 89012 3",
      centrelinkNumber: "345 678 901C",
      externalId: "EXT-003",
      serviceCommencementDate: "2024-06-10",
      serviceExitDate: "",
    },
  },
  {
    name: "Anthropic",
    iconColor: "#1a1a1a",
    iconText: "A",
    iconShape: "square",
    industry: ["Software"],
    lastInteraction: "4w ago",
    revenue: "$1B to $10B",
    headcount: "1001-5000",
    lastFunding: "Series F",
    website: "anthropic",
    owner: "Sam Lee",
    summary:
      "Initial outreach sent to Anthropic's partnerships team regarding potential collaboration on enterprise AI tooling. Awaiting response.",
    about:
      "Anthropic is an AI safety company building reliable, interpretable, and steerable AI systems, known for developing the Claude family of AI assistants.",
    participant: {
      firstName: "Anthony",
      middleName: "Paul",
      lastName: "Roberts",
      preferredName: "Ant",
      dateOfBirth: "1980-02-28",
      gender: "Male",
      pronouns: "He/Him",
      ethnicity: "Caucasian",
      language: "English",
      primaryDiagnosis: "Spinal Cord Injury",
      secondaryDiagnosis: "Depression",
      email: "anthony.roberts@email.com",
      mobile: "0445 678 901",
      phone: "02 7654 3210",
      preferredContactMethod: "Call (Phone)",
      preferredSignMethod: "In Person",
      ndisNumber: "4345678901",
      medicareNumber: "5678 90123 4",
      centrelinkNumber: "456 789 012D",
      externalId: "EXT-004",
      serviceCommencementDate: "2022-03-20",
      serviceExitDate: "",
    },
  },
]

const tabs = [
  { key: "overview", label: "Overview", icon: FileText },
  { key: "plan", label: "Plan", icon: ClipboardList },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "notes", label: "Notes", icon: SquarePen },
  { key: "files", label: "Files", icon: FolderOpen },
]

interface ActivityItem {
  id: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  content: React.ReactNode
  time: string
}

function getActivities(clientName: string): ActivityItem[] {
  return [
    { id: "1", icon: FileText, content: <><strong>Lightfield</strong> set About their business</>, time: "7m ago" },
    { id: "2", icon: UserPlus, content: <><strong>Lightfield</strong> set Name for the contact <strong>Sam Lee</strong> to Sam Lee</>, time: "7m ago" },
    { id: "3", icon: FileText, content: <><strong>Lightfield</strong> updated 9 fields</>, time: "7m ago" },
    { id: "4", icon: UserPlus, content: <><strong>Lightfield</strong> created the contact <strong>Sam Lee</strong></>, time: "7m ago" },
  ]
}

function ClientIcon({ client, size = "md" }: { client: Client; size?: "sm" | "md" | "lg" | "xl" }) {
  const dims = size === "xl" ? "h-[48px] w-[48px]" : size === "lg" ? "h-[36px] w-[36px]" : size === "md" ? "h-[28px] w-[28px]" : "h-[20px] w-[20px]"
  const textSize = size === "xl" ? "text-[20px]" : size === "lg" ? "text-[16px]" : size === "md" ? "text-[12px]" : "text-[10px]"
  const radius = size === "xl" ? "rounded-lg" : "rounded-[4px]"
  return (
    <div className={`${dims} ${radius} flex items-center justify-center bg-[#d4d4d4] ${textSize} font-semibold text-[#555]`}>
      {client.iconText}
    </div>
  )
}

function SidebarDetailRow({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center py-[6px]">
      <div className="flex w-[130px] shrink-0 items-center gap-[8px] text-[13px] font-medium text-[#888]">
        <Icon className="h-[14px] w-[14px] text-[#999]" strokeWidth={1.5} />
        <span>{label}</span>
      </div>
      <div className="min-w-0 flex-1 text-[13px] font-medium text-[#262626]">{children}</div>
    </div>
  )
}

function SidebarSection({ title, emptyText, actionLabel }: { title: string; emptyText: string; actionLabel?: string }) {
  return (
    <div className="border-t border-[#f0f0f0] px-[24px] py-[16px]">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-[#262626]">{title}</h3>
        {actionLabel && (
          <button className="text-[12px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
            {actionLabel}
          </button>
        )}
      </div>
      <p className="mt-[6px] text-[13px] font-medium text-[#bbb]">{emptyText}</p>
    </div>
  )
}

export default function ParticipantProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [planSubTab, setPlanSubTab] = useState("current-plan")
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(404)
  const { addContact, getContactsForClient } = useContacts()
  const [isAddContactOpen, setIsAddContactOpen] = useState(false)
  const [newContact, setNewContact] = useState({ firstName: "", email: "", phone: "", relationship: "" })
  const [isRelationshipOpen, setIsRelationshipOpen] = useState(false)
  const relationshipRef = useRef<HTMLButtonElement>(null)
  const isResizing = useRef(false)

  const handleMouseDown = useCallback(() => {
    isResizing.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const newWidth = window.innerWidth - e.clientX
      setSidebarWidth(Math.max(280, Math.min(600, newWidth)))
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [])

  const clientId = params.id as string
  const client = clients.find((c) => c.name.toLowerCase().replace(/\s+/g, "-") === clientId)

  if (!client) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-[14px] font-medium text-[#888]">Participant not found</p>
          <button onClick={() => router.push("/clients")} className="mt-[8px] text-[13px] font-medium text-[#555] underline transition-colors hover:text-[#262626]" tabIndex={0}>
            Back to clients
          </button>
        </div>
      </div>
    )
  }

  const p = client.participant
  const activities = getActivities(client.name)

  const clientContacts = getContactsForClient(client.name)
  const allContacts: ProfileContact[] = [
    { id: "owner", firstName: client.owner, email: p.email, phone: p.phone || p.mobile, relationship: "support-coordinator" },
    ...clientContacts.map((c) => ({ id: c.id, firstName: c.name, email: c.email, phone: c.phone, relationship: c.relationship })),
  ]

  const handleCreateContact = () => {
    if (!newContact.firstName) return
    addContact({ name: newContact.firstName, clientName: client.name, relationship: newContact.relationship, email: newContact.email, phone: newContact.phone })
    setNewContact({ firstName: "", email: "", phone: "", relationship: "" })
    setIsAddContactOpen(false)
    setIsRelationshipOpen(false)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top header bar */}
      <div className="flex h-[44px] shrink-0 items-center border-b border-[#f0f0f0] bg-white px-[16px]">
        <div className="flex items-center gap-[10px]">
          <button
            onClick={() => router.push("/clients")}
            className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            tabIndex={0}
            aria-label="Back to clients"
          >
            <ArrowLeft className="h-[16px] w-[16px]" strokeWidth={1.75} />
          </button>
          <ClientIcon client={client} size="sm" />
          <span className="max-w-[160px] truncate text-[13px] font-semibold text-[#262626]">{client.name}</span>
          <button className="rounded p-[2px] text-[#bbb] transition-colors hover:text-[#888]" tabIndex={0} aria-label="More options">
            <Ellipsis className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
        </div>

        <div className="ml-[12px] flex items-center gap-[2px]">
          {tabs.map((tab) => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-[5px] rounded px-[10px] py-[5px] text-[13px] font-medium transition-colors ${isActive ? "bg-[#f0f0f0] text-[#262626]" : "text-[#888] hover:bg-[#f5f5f5] hover:text-[#262626]"}`}
                tabIndex={0}
              >
                <TabIcon className="h-[13px] w-[13px]" strokeWidth={1.5} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-[6px]">
          <button
            className="flex items-center gap-[5px] rounded border border-[#dcdcdc] bg-white px-[10px] py-[5px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "plan" ? (
            <div className="flex h-full flex-col">
              {/* Sub-tabs */}
              <div className="flex items-center gap-[4px] border-b border-[#f0f0f0] px-[20px] py-[8px]">
                {[
                  { key: "current-plan", label: "Current plan" },
                  { key: "services", label: "Services" },
                  { key: "goals", label: "Goals" },
                  { key: "budget", label: "Budget" },
                  { key: "utilisation", label: "Utilisation" },
                  { key: "notes", label: "Notes" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setPlanSubTab(tab.key)}
                    className={`rounded-md px-[12px] py-[5px] text-[13px] font-medium transition-colors ${planSubTab === tab.key ? "bg-[#f0f0f0] text-[#262626]" : "text-[#888] hover:text-[#262626]"}`}
                    tabIndex={0}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Action bar */}
              <div className="flex items-center px-[20px] py-[12px]">
                <button
                  className="flex items-center gap-[5px] rounded border border-[#dcdcdc] bg-white px-[10px] py-[5px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>{planSubTab === "current-plan" ? "Create plan" : planSubTab === "services" ? "Add service" : planSubTab === "goals" ? "Add goal" : planSubTab === "budget" ? "Add budget" : planSubTab === "utilisation" ? "Add entry" : "Add note"}</span>
                </button>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto px-[20px] pb-[20px]">
                <div className="overflow-hidden rounded-lg border border-[#e8e8e8]">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr>
                        {planSubTab === "current-plan" && (
                          <>
                            <th className="w-[30%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Plan name</th>
                            <th className="w-[20%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Start date</th>
                            <th className="w-[20%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">End date</th>
                            <th className="w-[15%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Funding</th>
                            <th className="w-[10%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Status</th>
                            <th className="w-[5%] border-b border-[#e8e8e8] bg-[#fafafa] px-[12px] py-[12px]" />
                          </>
                        )}
                        {planSubTab === "services" && (
                          <>
                            <th className="w-[30%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Service name</th>
                            <th className="w-[20%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Provider</th>
                            <th className="w-[20%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Frequency</th>
                            <th className="w-[15%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Budget</th>
                            <th className="w-[10%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Status</th>
                            <th className="w-[5%] border-b border-[#e8e8e8] bg-[#fafafa] px-[12px] py-[12px]" />
                          </>
                        )}
                        {planSubTab === "goals" && (
                          <>
                            <th className="w-[35%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Goal name</th>
                            <th className="w-[25%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Goal type</th>
                            <th className="w-[20%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Target date</th>
                            <th className="w-[15%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Status</th>
                            <th className="w-[5%] border-b border-[#e8e8e8] bg-[#fafafa] px-[12px] py-[12px]" />
                          </>
                        )}
                        {planSubTab === "budget" && (
                          <>
                            <th className="w-[25%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Category</th>
                            <th className="w-[20%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Allocated</th>
                            <th className="w-[20%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Spent</th>
                            <th className="w-[15%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Remaining</th>
                            <th className="w-[15%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Status</th>
                            <th className="w-[5%] border-b border-[#e8e8e8] bg-[#fafafa] px-[12px] py-[12px]" />
                          </>
                        )}
                        {planSubTab === "utilisation" && (
                          <>
                            <th className="w-[25%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Service</th>
                            <th className="w-[20%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Hours allocated</th>
                            <th className="w-[20%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Hours used</th>
                            <th className="w-[15%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Remaining</th>
                            <th className="w-[15%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">% Used</th>
                            <th className="w-[5%] border-b border-[#e8e8e8] bg-[#fafafa] px-[12px] py-[12px]" />
                          </>
                        )}
                        {planSubTab === "notes" && (
                          <>
                            <th className="w-[35%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Note title</th>
                            <th className="w-[25%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Date added</th>
                            <th className="w-[20%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Author</th>
                            <th className="w-[15%] border-b border-[#e8e8e8] bg-[#fafafa] px-[20px] py-[12px] text-[13px] font-medium text-[#888]">Type</th>
                            <th className="w-[5%] border-b border-[#e8e8e8] bg-[#fafafa] px-[12px] py-[12px]" />
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={6} className="bg-white px-[20px] py-[32px] text-center text-[13px] font-medium text-[#bbb]">
                          {planSubTab === "current-plan" && "No active plan"}
                          {planSubTab === "services" && "No services added"}
                          {planSubTab === "goals" && "No goals set"}
                          {planSubTab === "budget" && "No budget entries"}
                          {planSubTab === "utilisation" && "No utilisation data"}
                          {planSubTab === "notes" && "No notes"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === "contacts" ? (
            <div className="relative flex h-full flex-col">
              {/* Toolbar */}
              <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
                <button
                  className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>Filter</span>
                </button>
                <button
                  onClick={() => setIsAddContactOpen(true)}
                  className="flex items-center gap-[5px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>Add contact</span>
                </button>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-left">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Contact name</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Relationship</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Email</th>
                      <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Phone number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allContacts.map((contact) => {
                      const rel = relationshipConfig[contact.relationship]
                      const fullName = contact.firstName
                      const initials = fullName.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase()
                      return (
                        <tr key={contact.id} className="transition-colors hover:bg-[#f5f5f5]">
                          <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[14px] font-medium text-[#262626]">
                            <div className="flex items-center gap-[8px]">
                              <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#d4d4d4] text-[9px] font-semibold text-[#555]">
                                {initials}
                              </div>
                              {fullName}
                            </div>
                          </td>
                          <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[14px] font-medium text-[#262626]">
                            {rel ? (
                              <span className="inline-flex h-[28px] items-center whitespace-nowrap rounded border border-[#dcdcdc] px-[8px] text-[13px] font-medium text-[#262626]">{rel.label}</span>
                            ) : (
                              <span className="text-[#bbb]">—</span>
                            )}
                          </td>
                          <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[14px] font-medium text-[#262626]">{contact.email || <span className="text-[#bbb]">—</span>}</td>
                          <td className="h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[14px] font-medium text-[#262626]">{contact.phone || <span className="text-[#bbb]">—</span>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-[#f0f0f0] px-[20px] py-[10px]">
                <span className="text-[12px] font-medium text-[#999]">{allContacts.length} {allContacts.length === 1 ? "contact" : "contacts"}</span>
              </div>

              {/* Create contact modal */}
              {isAddContactOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/20" onClick={() => { setIsAddContactOpen(false); setIsRelationshipOpen(false); setNewContact({ firstName: "", email: "", phone: "", relationship: "" }) }} />
                  <div className="relative z-10 w-[440px] rounded-lg bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                    {/* Modal header */}
                    <div className="flex items-center justify-between px-[24px] pt-[20px]">
                      <div className="flex items-center gap-[8px]">
                        <UserPlus className="h-[16px] w-[16px] text-[#555]" strokeWidth={1.5} />
                        <h2 className="text-[15px] font-semibold text-[#262626]">Create contact</h2>
                      </div>
                      <button
                        onClick={() => { setIsAddContactOpen(false); setIsRelationshipOpen(false); setNewContact({ firstName: "", email: "", phone: "", relationship: "" }) }}
                        className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                        tabIndex={0}
                        aria-label="Close"
                      >
                        <X className="h-[16px] w-[16px]" strokeWidth={1.5} />
                      </button>
                    </div>

                    {/* Modal body */}
                    <div className="px-[24px] pb-[20px] pt-[16px]">
                      {/* Account */}
                      <div className="mb-[14px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Account</label>
                        <div className="flex h-[36px] items-center rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px]">
                          <div className="flex items-center gap-[6px]">
                            <ClientIcon client={client} size="sm" />
                            <span className="text-[13px] font-medium text-[#262626]">{client.name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Name */}
                      <div className="mb-[14px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Name *</label>
                        <input
                          type="text"
                          placeholder="Full name"
                          value={newContact.firstName}
                          onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                          className="h-[36px] w-full rounded-md border border-[#e0e0e0] px-[10px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3]"
                        />
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

                      {/* Relationship */}
                      <div className="mb-[20px]">
                        <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Relationship</label>
                        <button
                          ref={relationshipRef}
                          type="button"
                          onClick={() => setIsRelationshipOpen(!isRelationshipOpen)}
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

                      {/* Create button */}
                      <div className="flex justify-end">
                        <button
                          onClick={handleCreateContact}
                          className="rounded-md bg-[#262626] px-[16px] py-[7px] text-[13px] font-medium text-white transition-colors hover:bg-[#333]"
                          tabIndex={0}
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  </div>
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
          ) : activeTab !== "overview" ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[13px] font-medium text-[#bbb]">No content yet</p>
            </div>
          ) : (
          <div className="mx-auto max-w-[720px] px-[40px] py-[32px]">
            {/* Participant name header */}
            <div className="flex items-center gap-[14px] pb-[28px]">
              <ClientIcon client={client} size="xl" />
              <h1 className="text-[24px] font-semibold text-[#262626]">{client.name}</h1>
            </div>

            {/* Account summary */}
            <div className="mb-[24px]">
              <h3 className="mb-[8px] text-[13px] font-medium text-[#888]">Account summary</h3>
              <p className="text-[14px] font-medium leading-[22px] text-[#262626]">{client.summary}</p>
            </div>

            {/* About their business */}
            <div className="mb-[24px]">
              <h3 className="mb-[8px] text-[13px] font-medium text-[#888]">About their business</h3>
              <p className="text-[14px] font-medium leading-[22px] text-[#262626]">{client.about}</p>
            </div>

            {/* Upcoming meetings */}
            <div className="mb-[24px]">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-[#888]">Upcoming meetings</h3>
                <button className="text-[12px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>See all</button>
              </div>
              <p className="mt-[8px] text-[13px] font-medium text-[#bbb]">No upcoming meetings</p>
            </div>

            {/* Open tasks */}
            <div className="mb-[24px]">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-[#888]">Open tasks</h3>
                <button className="text-[12px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>See all</button>
              </div>
              <p className="mt-[8px] text-[13px] font-medium text-[#bbb]">No open tasks</p>
            </div>

            {/* Activity */}
            <div>
              <h3 className="mb-[12px] text-[13px] font-medium text-[#888]">Activity</h3>
              <div className="relative">
                {activities.map((activity, idx) => {
                  const isLast = idx === activities.length - 1
                  const IconComp = activity.icon
                  return (
                    <div key={activity.id} className="relative flex gap-[12px]">
                      <div className="relative flex flex-col items-center">
                        <div className="relative z-10 flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#fafafa]">
                          <IconComp className="h-[16px] w-[16px] text-[#999]" strokeWidth={1.5} />
                        </div>
                        {!isLast && <div className="w-[1px] flex-1 bg-[#e8e8e8]" />}
                      </div>
                      <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-[16px]"}`}>
                        <p className="text-[13px] font-medium leading-[20px] text-[#555]">
                          {activity.content}
                          <span className="ml-[6px] text-[#bbb]">·</span>
                          <span className="ml-[6px] text-[12px] text-[#bbb]">{activity.time}</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Right sidebar */}
        {isSidebarVisible ? (
          <>
            <div
              onMouseDown={handleMouseDown}
              className="w-[4px] shrink-0 cursor-col-resize border-l border-[#f0f0f0] transition-colors hover:border-[#aaa] hover:bg-[#f0f0f0]"
            />
            <div className="shrink-0 overflow-y-auto bg-white" style={{ width: sidebarWidth }}>
          <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
            <h2 className="text-[13px] font-semibold text-[#262626]">Account details</h2>
            <button
              onClick={() => setIsSidebarVisible(false)}
              className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
              tabIndex={0}
              aria-label="Hide sidebar"
            >
              <PanelRightClose className="h-[14px] w-[14px]" strokeWidth={1.5} />
            </button>
          </div>

          <div className="border-b border-[#f0f0f0] px-[24px] pb-[12px]">
            <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Personal Information</h3>
            <SidebarDetailRow icon={User} label="First Name">{p.firstName}</SidebarDetailRow>
            <SidebarDetailRow icon={User} label="Middle Name">{p.middleName || <span className="text-[#bbb]">—</span>}</SidebarDetailRow>
            <SidebarDetailRow icon={User} label="Last Name">{p.lastName}</SidebarDetailRow>
            <SidebarDetailRow icon={Heart} label="Preferred">{p.preferredName || <span className="text-[#bbb]">—</span>}</SidebarDetailRow>
            <SidebarDetailRow icon={CalendarDays} label="Date of Birth">
              {p.dateOfBirth ? new Date(p.dateOfBirth + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : <span className="text-[#bbb]">—</span>}
            </SidebarDetailRow>
            <SidebarDetailRow icon={Stethoscope} label="Primary Dx">
              {p.primaryDiagnosis
                ? <span className="inline-flex items-center rounded border border-[#e0e0e0] bg-white px-[8px] py-[2px] text-[12px] font-medium text-[#262626]">{p.primaryDiagnosis}</span>
                : <span className="text-[#bbb]">—</span>}
            </SidebarDetailRow>
            <SidebarDetailRow icon={Stethoscope} label="Secondary Dx">
              {p.secondaryDiagnosis
                ? <span className="inline-flex items-center rounded border border-[#e0e0e0] bg-white px-[8px] py-[2px] text-[12px] font-medium text-[#262626]">{p.secondaryDiagnosis}</span>
                : <span className="text-[#bbb]">—</span>}
            </SidebarDetailRow>

            {!isSidebarExpanded && (
              <button
                onClick={() => setIsSidebarExpanded(true)}
                className="mt-[6px] flex items-center gap-[4px] text-[13px] font-medium text-[#888] transition-colors hover:text-[#262626]"
                tabIndex={0}
              >
                <ChevronDown className="h-[12px] w-[12px]" strokeWidth={1.5} />
                <span>See more</span>
              </button>
            )}

            {isSidebarExpanded && (
              <>
                <SidebarDetailRow icon={User} label="Gender">{p.gender || <span className="text-[#bbb]">—</span>}</SidebarDetailRow>
                <SidebarDetailRow icon={MessageSquare} label="Pronouns">{p.pronouns || <span className="text-[#bbb]">—</span>}</SidebarDetailRow>
                <SidebarDetailRow icon={Globe} label="Ethnicity">{p.ethnicity || <span className="text-[#bbb]">—</span>}</SidebarDetailRow>
                <SidebarDetailRow icon={Languages} label="Language">{p.language || <span className="text-[#bbb]">—</span>}</SidebarDetailRow>

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Contact Information</h3>
                <SidebarDetailRow icon={Mail} label="Email">
                  {p.email
                    ? <span className="inline-flex items-center rounded border border-[#dcdcdc] bg-[#f5f5f5] px-[8px] py-[2px] text-[12px] font-medium text-[#262626]">{p.email}</span>
                    : <span className="text-[#bbb]">—</span>}
                </SidebarDetailRow>
                <SidebarDetailRow icon={Smartphone} label="Mobile">
                  {p.mobile
                    ? <span className="inline-flex items-center rounded border border-[#dcdcdc] bg-[#f5f5f5] px-[8px] py-[2px] text-[12px] font-medium text-[#262626]">{p.mobile}</span>
                    : <span className="text-[#bbb]">—</span>}
                </SidebarDetailRow>
                <SidebarDetailRow icon={Phone} label="Phone">
                  {p.phone
                    ? <span className="inline-flex items-center rounded border border-[#dcdcdc] bg-[#f5f5f5] px-[8px] py-[2px] text-[12px] font-medium text-[#262626]">{p.phone}</span>
                    : <span className="text-[#bbb]">—</span>}
                </SidebarDetailRow>
                <SidebarDetailRow icon={MessageSquare} label="Contact">{p.preferredContactMethod || <span className="text-[#bbb]">—</span>}</SidebarDetailRow>
                <SidebarDetailRow icon={PenLine} label="Sign Method">{p.preferredSignMethod || <span className="text-[#bbb]">—</span>}</SidebarDetailRow>

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Reference Numbers</h3>
                <SidebarDetailRow icon={Hash} label="NDIS">
                  {p.ndisNumber
                    ? <span className="inline-flex items-center rounded border border-[#e0e0e0] bg-white px-[8px] py-[2px] text-[12px] font-medium text-[#262626]">{p.ndisNumber}</span>
                    : <span className="text-[#bbb]">—</span>}
                </SidebarDetailRow>
                <SidebarDetailRow icon={Hash} label="Medicare">
                  {p.medicareNumber
                    ? <span className="inline-flex items-center rounded border border-[#e0e0e0] bg-white px-[8px] py-[2px] text-[12px] font-medium text-[#262626]">{p.medicareNumber}</span>
                    : <span className="text-[#bbb]">—</span>}
                </SidebarDetailRow>
                <SidebarDetailRow icon={Hash} label="Centrelink">
                  {p.centrelinkNumber
                    ? <span className="inline-flex items-center rounded border border-[#e0e0e0] bg-white px-[8px] py-[2px] text-[12px] font-medium text-[#262626]">{p.centrelinkNumber}</span>
                    : <span className="text-[#bbb]">—</span>}
                </SidebarDetailRow>
                <SidebarDetailRow icon={Hash} label="External ID">
                  {p.externalId
                    ? <span className="inline-flex items-center rounded border border-[#e0e0e0] bg-white px-[8px] py-[2px] text-[12px] font-medium text-[#262626]">{p.externalId}</span>
                    : <span className="text-[#bbb]">—</span>}
                </SidebarDetailRow>

                <h3 className="mb-[2px] ml-[22px] mt-[10px] text-[11px] font-medium tracking-wide text-[#888]">Other Details</h3>
                <SidebarDetailRow icon={CalendarDays} label="Service Start">
                  {p.serviceCommencementDate ? new Date(p.serviceCommencementDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : <span className="text-[#bbb]">—</span>}
                </SidebarDetailRow>
                <SidebarDetailRow icon={CalendarDays} label="Service Exit">
                  {p.serviceExitDate ? new Date(p.serviceExitDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : <span className="text-[#bbb]">—</span>}
                </SidebarDetailRow>

                <button
                  onClick={() => setIsSidebarExpanded(false)}
                  className="mt-[6px] flex items-center gap-[4px] text-[13px] font-medium text-[#888] transition-colors hover:text-[#262626]"
                  tabIndex={0}
                >
                  <ChevronDown className="h-[12px] w-[12px] rotate-180" strokeWidth={1.5} />
                  <span>See less</span>
                </button>
              </>
            )}
          </div>

          <SidebarSection title="Upcoming reminders" emptyText="No upcoming reminders" actionLabel="See all" />
          <SidebarSection title="Tasks" emptyText="No tasks" actionLabel="See all" />
          <SidebarSection title="Notes" emptyText="No notes" actionLabel="See all" />
            </div>
          </>
        ) : (
          <div className="flex shrink-0 flex-col items-center border-l border-[#f0f0f0] bg-white px-[8px] pt-[16px]">
            <button
              onClick={() => setIsSidebarVisible(true)}
              className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
              tabIndex={0}
              aria-label="Show sidebar"
            >
              <PanelRightOpen className="h-[15px] w-[15px]" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
