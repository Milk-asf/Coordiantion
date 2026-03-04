"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useContacts } from "@/lib/contacts-context"
import {
  UserRound,
  ListFilter,
  Plus,
  Download,
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
  Smartphone,
  MessageSquare,
  PenLine,
  Hash,
  CalendarDays,
  Heart,
  Languages,
  Stethoscope,
  ChevronDown,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  ArrowLeft,
  EyeOff,
  Copy,
  Check,
  SquarePen,
  CheckSquare,
  File,
  UserPlus,
  Info,
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

const allPropertyColumns = [
  { key: "ndisNumber", label: "NDIS Number", icon: Hash, minWidth: 160 },
  { key: "diagnosis", label: "Diagnosis", icon: Stethoscope, minWidth: 240 },
  { key: "email", label: "Email", icon: Mail, minWidth: 200 },
  { key: "phone", label: "Phone", icon: Phone, minWidth: 160 },
  { key: "mobile", label: "Mobile", icon: Smartphone, minWidth: 160 },
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
  { key: "serviceCommencementDate", label: "Service Start", icon: CalendarDays, minWidth: 150 },
  { key: "serviceExitDate", label: "Service Exit", icon: CalendarDays, minWidth: 150 },
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

const defaultVisibleKeys = ["ndisNumber", "diagnosis", "email", "phone", "dob", "contact-support-coordinator"]


function ClientIcon({ client, size = "sm" }: { client: Client; size?: "sm" | "lg" }) {
  const dims = size === "lg" ? "h-[40px] w-[40px]" : "h-[22px] w-[22px]"
  const textSize = size === "lg" ? "text-[16px]" : "text-[10px]"
  const radius = size === "lg" ? "rounded-lg" : "rounded-[4px]"

  return (
    <div className={`flex ${dims} ${radius} shrink-0 items-center justify-center bg-[#d4d4d4] ${textSize} font-semibold text-[#555]`}>
      {client.iconText}
    </div>
  )
}

function EditableField({
  value,
  onChange,
  placeholder,
  type = "text",
  options,
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  type?: "text" | "select" | "date"
  options?: string[]
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (!isEditing) return
    if (type === "select") selectRef.current?.focus()
    else inputRef.current?.focus()
  }, [isEditing, type])

  const handleSave = useCallback(() => {
    setIsEditing(false)
    onChange(draft)
  }, [draft, onChange])

  const handleCancel = useCallback(() => {
    setIsEditing(false)
    setDraft(value)
  }, [value])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") handleCancel()
  }, [handleSave, handleCancel])

  if (isEditing) {
    if (type === "select" && options) {
      return (
        <div className="relative -ml-[9px]">
          <select
            ref={selectRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              onChange(e.target.value)
              setIsEditing(false)
            }}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full appearance-none rounded-lg border border-[#a3c4f3] bg-white px-[10px] py-[7px] text-[13px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
          >
            <option value="">—</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-[10px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 text-[#999]" strokeWidth={1.5} />
        </div>
      )
    }

    return (
      <div className="relative -ml-[9px]">
        <input
          ref={inputRef}
          type={type === "date" ? "date" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[#a3c4f3] bg-white px-[10px] py-[7px] pr-[32px] text-[13px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
        />
        {draft && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              setDraft("")
              onChange("")
              setIsEditing(false)
            }}
            className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[#bbb] transition-colors hover:text-[#888]"
            tabIndex={-1}
            aria-label="Clear field"
          >
            <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
        )}
      </div>
    )
  }

  const displayValue = type === "date" && value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : value

  return (
    <span
      onClick={() => setIsEditing(true)}
      className="block -ml-[9px] cursor-default rounded-lg px-[10px] py-[7px] transition-colors hover:bg-[#f5f5f5]"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") setIsEditing(true) }}
      aria-label={`Click to edit ${placeholder || "field"}`}
    >
      {displayValue || <span className="text-[#bbb]">{placeholder || "—"}</span>}
    </span>
  )
}

interface DetailRowProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  children: React.ReactNode
}

function DetailRow({ icon: Icon, label, children }: DetailRowProps) {
  return (
    <div className="flex items-center py-[7px]">
      <div className="flex w-[180px] shrink-0 items-center gap-[8px] text-[13px] font-medium text-[#888]">
        <Icon className="h-[14px] w-[14px] text-[#999]" strokeWidth={1.5} />
        <span>{label}</span>
      </div>
      <div className="min-w-0 flex-1 text-[13px] font-medium text-[#262626]">{children}</div>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="mb-[4px] ml-[22px] mt-[12px] text-[11px] font-medium tracking-wide text-[#888]">
      {title}
    </h3>
  )
}

function ContactChip({ value, onChange, placeholder, variant = "grey" }: { value: string; onChange: (v: string) => void; placeholder: string; variant?: "grey" | "white" }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [isCopied, setIsCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (isEditing) inputRef.current?.focus() }, [isEditing])

  const handleSave = () => { setIsEditing(false); onChange(draft) }
  const handleCancel = () => { setIsEditing(false); setDraft(value) }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(value)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 1500)
  }

  const isWhite = variant === "white"
  const chipBg = isWhite ? "bg-transparent" : "bg-[#f5f5f5]"
  const chipHover = isWhite ? "hover:bg-[#f5f5f5]" : "hover:bg-[#efefef]"
  const chipBorder = isWhite ? "border-[#dcdcdc]" : "border-[#dcdcdc]"
  const copyHoverBg = isWhite ? "hover:bg-[#f0f0f0]" : "hover:bg-[#e5e5e5]"

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel() }}
        placeholder={placeholder}
        className="rounded border border-[#a3c4f3] bg-white px-[10px] py-[4px] text-[13px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
      />
    )
  }

  if (!value) {
    return (
      <span
        onClick={() => setIsEditing(true)}
        className={`inline-flex cursor-default items-center rounded border border-dashed border-[#d0d0d0] ${chipBg} px-[10px] py-[4px] text-[13px] font-medium text-[#bbb] transition-colors hover:border-[#999] hover:text-[#999]`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") setIsEditing(true) }}
      >
        {placeholder}
      </span>
    )
  }

  return (
    <span
      className={`group/chip inline-flex cursor-default items-center gap-[6px] rounded border ${chipBorder} ${chipBg} py-[4px] pl-[10px] pr-[6px] text-[13px] font-medium text-[#262626] transition-colors ${chipHover}`}
    >
      <span
        onClick={() => setIsEditing(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") setIsEditing(true) }}
        aria-label={`Click to edit ${placeholder || "field"}`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className={`shrink-0 rounded p-[3px] transition-all ${isCopied ? "text-green-600" : `text-[#bbb] opacity-0 group-hover/chip:opacity-100 ${copyHoverBg} hover:text-[#666]`}`}
        tabIndex={0}
        aria-label={`Copy ${placeholder || "value"}`}
      >
        {isCopied ? <Check className="h-[12px] w-[12px]" strokeWidth={2} /> : <Copy className="h-[12px] w-[12px]" strokeWidth={1.5} />}
      </button>
    </span>
  )
}

function DiagnosisChip({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (isEditing) inputRef.current?.focus() }, [isEditing])

  const handleSave = () => { setIsEditing(false); onChange(draft) }
  const handleCancel = () => { setIsEditing(false); setDraft(value) }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel() }}
        placeholder={placeholder}
        className="rounded border border-[#a3c4f3] bg-white px-[10px] py-[4px] text-[13px] font-medium text-[#262626] shadow-[0_0_0_3px_rgba(163,196,243,0.25)] outline-none"
      />
    )
  }

  if (!value) {
    return (
      <span
        onClick={() => setIsEditing(true)}
        className="inline-flex cursor-default items-center rounded border border-dashed border-[#d0d0d0] bg-transparent px-[10px] py-[4px] text-[13px] font-medium text-[#bbb] transition-colors hover:border-[#999] hover:text-[#999]"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") setIsEditing(true) }}
      >
        {placeholder}
      </span>
    )
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className="inline-flex cursor-default items-center rounded border border-[#dcdcdc] bg-transparent px-[10px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") setIsEditing(true) }}
    >
      {value}
    </span>
  )
}

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
}: {
  client: Client
  participantData: ParticipantDetails
  onUpdateField: (field: keyof ParticipantDetails, value: string) => void
  onClose: () => void
}) {
  const [isPersonalExpanded, setIsPersonalExpanded] = useState(false)
  const router = useRouter()

  const handleExpand = () => {
    router.push(`/clients/${client.name.toLowerCase().replace(/\s+/g, "-")}`)
  }

  return (
    <div className="h-full shrink-0 p-[10px]">
    <div className="flex h-full w-[625px] flex-col rounded-lg border border-[#dcdcdc] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
        <div className="flex min-w-0 items-center gap-[8px]">
          <ClientIcon client={client} />
          <span className="truncate text-[13px] font-medium text-[#262626]">
            {client.name}
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
          <ClientIcon client={client} size="lg" />
          <h2 className="text-[18px] font-semibold text-[#262626]">
            {participantData.preferredName || participantData.firstName} {participantData.lastName}
          </h2>
        </div>

        {/* Participant Details */}
        <div className="border-b border-[#f0f0f0] px-[20px] pb-[16px]">
          <SectionHeader title="Personal Information" />
          <DetailRow icon={User} label="First Name">
            <EditableField value={participantData.firstName} onChange={(v) => onUpdateField("firstName", v)} placeholder="First name" />
          </DetailRow>
          <DetailRow icon={User} label="Middle Name">
            <EditableField value={participantData.middleName} onChange={(v) => onUpdateField("middleName", v)} placeholder="Middle name" />
          </DetailRow>
          <DetailRow icon={User} label="Last Name">
            <EditableField value={participantData.lastName} onChange={(v) => onUpdateField("lastName", v)} placeholder="Last name" />
          </DetailRow>
          <DetailRow icon={Heart} label="Preferred Name">
            <EditableField value={participantData.preferredName} onChange={(v) => onUpdateField("preferredName", v)} placeholder="Preferred name" />
          </DetailRow>
          <DetailRow icon={CalendarDays} label="Date of Birth">
            <EditableField value={participantData.dateOfBirth} onChange={(v) => onUpdateField("dateOfBirth", v)} type="date" placeholder="Date of birth" />
          </DetailRow>
          <DetailRow icon={Stethoscope} label="Primary Diagnosis">
            <DiagnosisChip value={participantData.primaryDiagnosis} onChange={(v) => onUpdateField("primaryDiagnosis", v)} placeholder="Add diagnosis" />
          </DetailRow>
          <DetailRow icon={Stethoscope} label="Secondary Diagnosis">
            <DiagnosisChip value={participantData.secondaryDiagnosis} onChange={(v) => onUpdateField("secondaryDiagnosis", v)} placeholder="Add diagnosis" />
          </DetailRow>

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
              <DetailRow icon={User} label="Gender">
                <EditableField value={participantData.gender} onChange={(v) => onUpdateField("gender", v)} type="select" options={["Male", "Female", "Non-binary", "Other", "Prefer not to say"]} />
              </DetailRow>
              <DetailRow icon={MessageSquare} label="Pronouns">
                <EditableField value={participantData.pronouns} onChange={(v) => onUpdateField("pronouns", v)} type="select" options={["He/Him", "She/Her", "They/Them", "Other"]} />
              </DetailRow>
              <DetailRow icon={Globe} label="Ethnicity">
                <EditableField value={participantData.ethnicity} onChange={(v) => onUpdateField("ethnicity", v)} placeholder="Ethnicity" />
              </DetailRow>
              <DetailRow icon={Languages} label="Language">
                <EditableField value={participantData.language} onChange={(v) => onUpdateField("language", v)} placeholder="Language" />
              </DetailRow>

              <SectionHeader title="Contact Information" />
              <DetailRow icon={Mail} label="Email">
                <ContactChip value={participantData.email} onChange={(v) => onUpdateField("email", v)} placeholder="Email address" />
              </DetailRow>
              <DetailRow icon={Smartphone} label="Mobile">
                <ContactChip value={participantData.mobile} onChange={(v) => onUpdateField("mobile", v)} placeholder="Mobile number" />
              </DetailRow>
              <DetailRow icon={Phone} label="Phone">
                <ContactChip value={participantData.phone} onChange={(v) => onUpdateField("phone", v)} placeholder="Phone number" />
              </DetailRow>
              <DetailRow icon={MessageSquare} label="Contact Method">
                <EditableField value={participantData.preferredContactMethod} onChange={(v) => onUpdateField("preferredContactMethod", v)} type="select" options={["SMS", "Email", "Call (Mobile)", "Call (Phone)"]} />
              </DetailRow>
              <DetailRow icon={PenLine} label="Sign Documents">
                <EditableField value={participantData.preferredSignMethod} onChange={(v) => onUpdateField("preferredSignMethod", v)} type="select" options={["In Person", "Electronically"]} />
              </DetailRow>

              <SectionHeader title="Reference Numbers" />
              <DetailRow icon={Hash} label="NDIS Number">
                <ContactChip value={participantData.ndisNumber} onChange={(v) => onUpdateField("ndisNumber", v)} placeholder="NDIS number" variant="white" />
              </DetailRow>
              <DetailRow icon={Hash} label="Medicare Number">
                <ContactChip value={participantData.medicareNumber} onChange={(v) => onUpdateField("medicareNumber", v)} placeholder="Medicare number" variant="white" />
              </DetailRow>
              <DetailRow icon={Hash} label="Centrelink Number">
                <ContactChip value={participantData.centrelinkNumber} onChange={(v) => onUpdateField("centrelinkNumber", v)} placeholder="Centrelink number" variant="white" />
              </DetailRow>
              <DetailRow icon={Hash} label="External ID">
                <ContactChip value={participantData.externalId} onChange={(v) => onUpdateField("externalId", v)} placeholder="External ID" variant="white" />
              </DetailRow>

              <SectionHeader title="Other Details" />
              <DetailRow icon={CalendarDays} label="Service Start">
                <EditableField value={participantData.serviceCommencementDate} onChange={(v) => onUpdateField("serviceCommencementDate", v)} type="date" placeholder="Commencement date" />
              </DetailRow>
              <DetailRow icon={CalendarDays} label="Service Exit">
                <EditableField value={participantData.serviceExitDate} onChange={(v) => onUpdateField("serviceExitDate", v)} type="date" placeholder="Exit date" />
              </DetailRow>

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
  const router = useRouter()
  const { getContactsForClient } = useContacts()
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(defaultVisibleKeys)
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const [columnMenuKey, setColumnMenuKey] = useState<string | null>(null)
  const [columnMenuPos, setColumnMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    if (typeof window === "undefined") return []
    try { return JSON.parse(localStorage.getItem("client-views") || "[]") } catch { return [] }
  })
  const [activeViewId, setActiveViewId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("client-active-view") || null
  })
  const [isCreateViewOpen, setIsCreateViewOpen] = useState(false)
  const [newViewName, setNewViewName] = useState("")
  const displayBtnRef = useRef<HTMLButtonElement>(null)
  const viewNameInputRef = useRef<HTMLInputElement>(null)
  const isInitialMount = useRef(true)
  const [participantOverrides, setParticipantOverrides] = useState<Record<string, Partial<ParticipantDetails>>>({})

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      if (activeViewId) {
        const view = savedViews.find((v) => v.id === activeViewId)
        if (view) {
          setVisibleColumnKeys(view.columnKeys)
          setSortKey(view.sortKey)
          setSortDirection(view.sortDirection)
        }
      }
      return
    }
    localStorage.setItem("client-views", JSON.stringify(savedViews))
  }, [savedViews, activeViewId])

  useEffect(() => {
    if (isInitialMount.current) return
    if (activeViewId) {
      localStorage.setItem("client-active-view", activeViewId)
    } else {
      localStorage.removeItem("client-active-view")
    }
  }, [activeViewId])

  useEffect(() => {
    if (!activeViewId || isInitialMount.current) return
    setSavedViews((prev) =>
      prev.map((v) =>
        v.id === activeViewId ? { ...v, columnKeys: visibleColumnKeys, sortKey, sortDirection } : v
      )
    )
  }, [visibleColumnKeys, sortKey, sortDirection, activeViewId])

  const visibleColumns = visibleColumnKeys.map((key) => allPropertyColumns.find((col) => col.key === key)).filter(Boolean) as typeof allPropertyColumns

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
    if (!newViewName.trim()) return
    const view: SavedView = {
      id: Date.now().toString(),
      name: newViewName.trim(),
      columnKeys: [...visibleColumnKeys],
      sortKey,
      sortDirection,
    }
    setSavedViews((prev) => [...prev, view])
    setActiveViewId(view.id)
    setNewViewName("")
    setIsCreateViewOpen(false)
  }

  const handleSelectView = (view: SavedView) => {
    setActiveViewId(view.id)
    setVisibleColumnKeys(view.columnKeys)
    setSortKey(view.sortKey)
    setSortDirection(view.sortDirection)
  }

  const handleSelectAllView = () => {
    setActiveViewId(null)
    setVisibleColumnKeys(defaultVisibleKeys)
    setSortKey(null)
    setSortDirection("asc")
  }

  const getParticipantData = useCallback((client: Client): ParticipantDetails => {
    const overrides = participantOverrides[client.name] || {}
    return { ...client.participant, ...overrides }
  }, [participantOverrides])

  const handleUpdateField = useCallback((clientName: string, field: keyof ParticipantDetails, value: string) => {
    setParticipantOverrides((prev) => ({
      ...prev,
      [clientName]: { ...prev[clientName], [field]: value },
    }))
  }, [])

  const sortedClients = (() => {
    if (!sortKey) return clients
    return [...clients].sort((a, b) => {
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
        case "mobile": valA = pA.mobile; valB = pB.mobile; break
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

  return (
    <div className="relative flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
          <div className="flex items-center gap-[8px]">
            <button
              onClick={handleSelectAllView}
              className={`flex items-center gap-[6px] rounded-md border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${activeViewId === null ? "border-[#dcdcdc] bg-[#f5f5f5] text-[#262626]" : "border-transparent text-[#888] hover:bg-[#f5f5f5] hover:text-[#262626]"}`}
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
                className={`flex items-center gap-[6px] rounded-md px-[8px] py-[4px] text-[13px] font-medium transition-colors ${activeViewId === view.id ? "bg-[#f5f5f5] text-[#262626]" : "text-[#888] hover:bg-[#f5f5f5] hover:text-[#262626]"}`}
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
            <button
              className="flex items-center gap-[5px] rounded px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span className="hidden sm:inline">Import CSV</span>
            </button>
            <button
              className="flex items-center gap-[5px] rounded border border-[#dcdcdc] bg-white px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span className="hidden sm:inline">Create client</span>
            </button>
          </div>
        </div>

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
                      <button className="flex items-center gap-[6px] rounded-md border border-[#dcdcdc] px-[12px] py-[6px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]" tabIndex={0}>
                        <span>Last interaction</span>
                        <ChevronDown className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
                      </button>
                      <button className="flex h-[32px] w-[32px] items-center justify-center rounded-md border border-[#dcdcdc] text-[#262626] transition-colors hover:bg-[#f5f5f5]" tabIndex={0}>
                        <ArrowDown className="h-[14px] w-[14px]" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>

                  <div className="px-[20px] pb-[16px] pt-[14px]">
                    <div className="pb-[12px] text-[13px] font-medium text-[#888]">Display properties</div>
                    <div className="flex flex-wrap gap-[8px]">
                      {allPropertyColumns.map((col) => {
                        const isActive = visibleColumnKeys.includes(col.key)
                        return (
                          <button
                            key={col.key}
                            onClick={() => handleToggleColumn(col.key)}
                            className={`inline-flex items-center rounded-lg border px-[10px] py-[5px] text-[12px] font-medium transition-colors ${isActive ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-[#dcdcdc] bg-transparent text-[#262626] hover:bg-[#f5f5f5]"}`}
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
          <table className="w-full min-w-[1070px] border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th
                  className="sticky left-0 top-0 z-30 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]"
                  style={{ minWidth: 180 }}
                >
                  <div className="flex items-center gap-[6px]">
                    <UserRound className="h-[13px] w-[13px] text-[#999]" strokeWidth={1.5} />
                    <span>Participant</span>
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
                      className={`group/col sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888] ${isLast ? "" : "border-r"}`}
                      style={{ minWidth: col.minWidth }}
                    >
                      <div className="flex items-center gap-[6px]">
                        <ColIcon className="h-[13px] w-[13px] text-[#999]" strokeWidth={1.5} />
                        <span>{col.label}</span>
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
                          className={`ml-auto flex h-[22px] w-[22px] items-center justify-center rounded transition-all ${isMenuOpen ? "bg-[#ebebeb] text-[#262626] opacity-100" : "text-[#999] opacity-0 hover:bg-[#ebebeb] hover:text-[#262626] group-hover/col:opacity-100"}`}
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
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sortedClients.map((client) => {
                const isSelected = selectedClient?.name === client.name
                const rowBg = isSelected ? "bg-[#f5f5ff]" : "bg-[#fafafa]"
                const rowHover = isSelected ? "" : "group-hover:bg-[#f5f5f5]"
                const p = getParticipantData(client)
                const clientContacts = getContactsForClient(client.name)
                const cellClass = `h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] px-[20px] ${rowBg} ${rowHover}`

                const renderCell = (key: string, isLast: boolean) => {
                  const cls = isLast
                    ? `h-[44px] whitespace-nowrap border-b px-[20px] ${rowBg} ${rowHover}`
                    : cellClass
                  const whiteChip = "inline-flex h-[28px] items-center whitespace-nowrap rounded border border-[#dcdcdc] bg-transparent px-[8px] text-[12px] font-medium text-[#262626]"
                  const greyChip = "inline-flex h-[28px] items-center whitespace-nowrap rounded border border-[#dcdcdc] bg-[#f5f5f5] px-[8px] text-[12px] font-medium text-[#262626]"
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
                    case "mobile":
                      return <td key={key} className={cls}>{p.mobile ? <span className={greyChip}>{p.mobile}</span> : dash}</td>
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
                    default: {
                      if (key.startsWith("contact-")) {
                        const relKey = key.replace("contact-", "")
                        const contact = clientContacts.find((c) => c.relationship === relKey)
                        return <td key={key} className={cls}>{contact ? <span className={whiteChip}>{contact.name}</span> : dash}</td>
                      }
                      return <td key={key} className={textCls}>{dash}</td>
                    }
                  }
                }

                return (
                  <tr key={client.name} className="group">
                    <td
                      onClick={() => setSelectedClient(client)}
                      className={`sticky left-0 z-10 h-[44px] cursor-pointer whitespace-nowrap border-b border-r border-[#dcdcdc] px-[20px] ${rowBg} ${rowHover}`}
                    >
                      <div className="flex items-center gap-[10px]">
                        <ClientIcon client={client} />
                        <span className="text-[13px] font-medium text-[#262626]">{client.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.name.toLowerCase().replace(/\s+/g, "-")}`) }}
                          className="ml-auto flex h-[22px] w-[22px] items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 text-[#999] hover:bg-[#f0f0f0] hover:text-[#262626]"
                          aria-label={`Open ${client.name} full profile`}
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
        </div>

        <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
          <span className="text-[12px] font-medium text-[#999]">
            {clients.length} clients
          </span>
        </div>
      </div>

      {selectedClient && (
        <div className="absolute right-0 top-0 z-40 h-full overflow-hidden">
          <ClientProfile
            client={selectedClient}
            participantData={getParticipantData(selectedClient)}
            onUpdateField={(field, value) => handleUpdateField(selectedClient.name, field, value)}
            onClose={() => setSelectedClient(null)}
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
                className="mt-[8px] w-full rounded-lg border border-[#dcdcdc] bg-[#fafafa] px-[12px] py-[10px] text-[13px] font-medium text-[#262626] outline-none transition-colors placeholder:text-[#bbb] focus:border-[#a3c4f3] focus:bg-white"
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
                className={`rounded-lg border px-[16px] py-[6px] text-[13px] font-medium transition-colors ${newViewName.trim() ? "border-[#262626] bg-[#262626] text-white hover:bg-[#333]" : "border-[#dcdcdc] text-[#bbb]"}`}
                tabIndex={0}
              >
                Create
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
