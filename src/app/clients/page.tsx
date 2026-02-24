"use client"

import { useState } from "react"
import {
  UserRound,
  ListFilter,
  Plus,
  Download,
  SlidersHorizontal,
  ArrowDown,
  ArrowUpRight,
  Building2,
  Clock,
  DollarSign,
  Users,
  Landmark,
  Globe,
  Table2,
  X,
  Ellipsis,
  Expand,
  FileText,
  Target,
  User,
} from "lucide-react"

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
  opportunities: string | null
  summary: string
  about: string
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
    opportunities: null,
    summary:
      "Rappi's team reached out to explore integration opportunities for their delivery logistics platform. Initial discovery call completed, follow-up demo scheduled for next week.",
    about:
      "Rappi is a Latin American super-app offering delivery, payments, and financial services across multiple countries, serving millions of users with on-demand commerce solutions.",
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
    opportunities: null,
    summary:
      "Robert from Content-mobbin emailed inbound to learn more about the documenting flows service and requested a short call; no further interactions or opportunities are recorded yet. Next step is to respond to Robert's email, share an overview of the service and collaboration process, and propose times for an introductory call.",
    about:
      "Content-mobbin provides a documenting flows service that helps organizations efficiently document multiple product flows, likely generating revenue by offering this as a paid, collaborative service for product teams.",
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
    opportunities: null,
    summary:
      "Lovi is exploring AI-driven health monitoring solutions. Early-stage conversations about potential partnership for patient engagement tools.",
    about:
      "Lovi is a health technology startup leveraging artificial intelligence to provide personalized care recommendations and remote patient monitoring solutions.",
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
    opportunities: null,
    summary:
      "Initial outreach sent to Anthropic's partnerships team regarding potential collaboration on enterprise AI tooling. Awaiting response.",
    about:
      "Anthropic is an AI safety company building reliable, interpretable, and steerable AI systems, known for developing the Claude family of AI assistants.",
  },
]

const columns = [
  { key: "name", label: "Client", sortable: true, sorted: false, icon: UserRound },
  { key: "industry", label: "Industry", sortable: true, sorted: false, icon: Building2 },
  { key: "lastInteraction", label: "Last interaction", sortable: true, sorted: true, icon: Clock },
  { key: "revenue", label: "Revenue", sortable: true, sorted: false, icon: DollarSign },
  { key: "headcount", label: "Headcount", sortable: true, sorted: false, icon: Users },
  { key: "lastFunding", label: "Last funding", sortable: true, sorted: false, icon: Landmark },
  { key: "website", label: "Website", sortable: true, sorted: false, icon: Globe },
]

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded border border-[#e5e5e5] px-[8px] py-[3px] text-[13px] font-medium text-[#262626]">
      {label}
    </span>
  )
}

function ClientIcon({ client, size = "sm" }: { client: Client; size?: "sm" | "lg" }) {
  const dims = size === "lg" ? "h-[40px] w-[40px]" : "h-[22px] w-[22px]"
  const textSize = size === "lg" ? "text-[16px]" : "text-[10px]"

  return (
    <div
      className={`flex ${dims} shrink-0 items-center justify-center ${textSize} font-semibold text-white`}
      style={{
        backgroundColor: client.iconColor,
        borderRadius: client.iconShape === "circle" ? "50%" : size === "lg" ? "8px" : "4px",
      }}
    >
      {client.iconText}
    </div>
  )
}

interface PropertyRowProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  children: React.ReactNode
}

function PropertyRow({ icon: Icon, label, children }: PropertyRowProps) {
  return (
    <div className="flex items-start py-[6px]">
      <div className="flex w-[140px] shrink-0 items-center gap-[8px] text-[13px] font-medium text-[#888]">
        <Icon className="h-[14px] w-[14px] text-[#999]" strokeWidth={1.5} />
        <span>{label}</span>
      </div>
      <div className="min-w-0 flex-1 text-[13px] font-medium text-[#262626]">{children}</div>
    </div>
  )
}

function ClientProfile({ client, onClose }: { client: Client; onClose: () => void }) {
  return (
    <div className="flex h-full w-[625px] shrink-0 flex-col border-l border-[#f0f0f0] bg-white">
      {/* Panel header bar */}
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Client name hero */}
        <div className="flex items-center gap-[12px] px-[20px] pb-[20px] pt-[24px]">
          <ClientIcon client={client} size="lg" />
          <h2 className="text-[20px] font-semibold text-[#262626]">{client.name}</h2>
        </div>

        {/* Properties */}
        <div className="border-b border-[#f0f0f0] px-[20px] pb-[16px]">
          <PropertyRow icon={FileText} label="Name">
            {client.name}
          </PropertyRow>
          <PropertyRow icon={Target} label="Opportunities">
            {client.opportunities ? (
              <span>{client.opportunities}</span>
            ) : (
              <span className="text-[#bbb]">Set opportunities</span>
            )}
          </PropertyRow>
          <PropertyRow icon={User} label="Owner">
            <div className="flex items-center gap-[6px]">
              <div className="h-[8px] w-[8px] rounded-full bg-green-500" />
              <span>{client.owner}</span>
            </div>
          </PropertyRow>
          <PropertyRow icon={Building2} label="Industry">
            <div className="flex flex-wrap gap-[4px]">
              {client.industry.map((tag) => (
                <Tag key={tag} label={tag} />
              ))}
            </div>
          </PropertyRow>
          <PropertyRow icon={Users} label="Headcount">
            {client.headcount}
          </PropertyRow>
          <PropertyRow icon={DollarSign} label="Revenue">
            {client.revenue}
          </PropertyRow>
          <PropertyRow icon={Globe} label="Website">
            {client.website}.com
          </PropertyRow>
          <PropertyRow icon={Clock} label="Last interaction">
            {client.lastInteraction}
          </PropertyRow>

          <button
            className="mt-[8px] flex items-center gap-[4px] text-[13px] font-medium text-[#888] transition-colors hover:text-[#262626]"
            tabIndex={0}
          >
            <span>See more</span>
            <ArrowDown className="h-[12px] w-[12px]" strokeWidth={1.5} />
          </button>
        </div>

        {/* Account summary */}
        <div className="border-b border-[#f0f0f0] px-[20px] py-[16px]">
          <h3 className="mb-[8px] text-[13px] font-semibold text-[#262626]">Account summary</h3>
          <p className="text-[13px] font-medium leading-[20px] text-[#555]">
            {client.summary}
          </p>
        </div>

        {/* About their business */}
        <div className="border-b border-[#f0f0f0] px-[20px] py-[16px]">
          <h3 className="mb-[8px] text-[13px] font-semibold text-[#262626]">
            About their business
          </h3>
          <p className="text-[13px] font-medium leading-[20px] text-[#555]">
            {client.about}
          </p>
        </div>

        {/* Upcoming meetings */}
        <div className="border-b border-[#f0f0f0] px-[20px] py-[16px]">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#262626]">Upcoming meetings</h3>
            <button
              className="text-[12px] font-medium text-[#888] transition-colors hover:text-[#262626]"
              tabIndex={0}
            >
              See all
            </button>
          </div>
          <p className="mt-[8px] text-[13px] font-medium text-[#bbb]">No upcoming meetings</p>
        </div>

        {/* Open tasks */}
        <div className="px-[20px] py-[16px]">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#262626]">Open tasks</h3>
            <button
              className="text-[12px] font-medium text-[#888] transition-colors hover:text-[#262626]"
              tabIndex={0}
            >
              See all
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  return (
    <div className="flex h-full">
      {/* Main table area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
          <div className="flex items-center gap-[12px]">
            <div className="flex items-center gap-[6px]">
              <UserRound className="h-[14px] w-[14px] text-[#262626]" strokeWidth={1.5} />
              <span className="text-[13px] font-medium text-[#262626]">Clients</span>
            </div>
            <div className="h-[16px] w-px bg-[#e5e5e5]" />
            <div className="flex items-center gap-[6px] rounded bg-[#f0f0f0] px-[6px] py-[3px] text-[14px] font-medium text-[#262626]">
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
              className="flex items-center gap-[5px] rounded px-[8px] py-[4px] text-[14px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>Import CSV</span>
            </button>
            <button
              className="flex items-center gap-[5px] rounded border border-[#e5e5e5] bg-white px-[8px] py-[4px] text-[14px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>Create client</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex h-[41px] shrink-0 items-center border-b border-[#f0f0f0] px-[16px]">
          <button
            className="flex items-center gap-[6px] rounded border border-[#e5e5e5] px-[8px] py-[4px] text-[14px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Filter</span>
          </button>
          <div className="ml-auto flex items-center">
            <button
              className="flex items-center gap-[5px] rounded border border-[#e5e5e5] px-[8px] py-[4px] text-[14px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
            >
              <SlidersHorizontal className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>Display</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="min-w-full border-collapse text-left">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[#e5e5e5] bg-[#fafafa]">
                {columns.map((col, i) => {
                  const ColIcon = col.icon
                  return (
                    <th
                      key={col.key}
                      className={`h-[44px] whitespace-nowrap px-[20px] text-[12px] font-medium text-[#888] ${i < columns.length - 1 ? "border-r border-[#e5e5e5]" : ""}`}
                      style={{ minWidth: col.key === "industry" ? 240 : col.key === "name" ? 180 : 130 }}
                    >
                      <div className="flex items-center gap-[6px]">
                        <ColIcon className="h-[13px] w-[13px] text-[#999]" strokeWidth={1.5} />
                        <span>{col.label}</span>
                        {col.sorted && <ArrowDown className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const isSelected = selectedClient?.name === client.name
                return (
                  <tr
                    key={client.name}
                    className={`group border-b border-[#e5e5e5] transition-colors ${isSelected ? "bg-[#f5f5ff]" : "hover:bg-[#fafafa]"}`}
                  >
                    <td className="h-[44px] whitespace-nowrap border-r border-[#e5e5e5] px-[20px]">
                      <div className="flex items-center gap-[10px]">
                        <ClientIcon client={client} />
                        <span className="text-[14px] font-medium text-[#262626]">{client.name}</span>
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="ml-auto flex h-[22px] w-[22px] items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 text-[#999] hover:bg-[#f0f0f0] hover:text-[#262626]"
                          aria-label={`Open ${client.name} profile`}
                          tabIndex={0}
                        >
                          <ArrowUpRight className="h-[13px] w-[13px]" strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                    <td className="h-[44px] border-r border-[#e5e5e5] px-[20px]">
                      <div className="flex items-center gap-[6px]">
                        {client.industry.map((tag) => (
                          <Tag key={tag} label={tag} />
                        ))}
                      </div>
                    </td>
                    <td className="h-[44px] whitespace-nowrap border-r border-[#e5e5e5] px-[20px] text-[14px] font-medium text-[#262626]">
                      {client.lastInteraction}
                    </td>
                    <td className="h-[44px] whitespace-nowrap border-r border-[#e5e5e5] px-[20px] text-[14px] font-medium text-[#262626]">
                      {client.revenue}
                    </td>
                    <td className="h-[44px] whitespace-nowrap border-r border-[#e5e5e5] px-[20px] text-[14px] font-medium text-[#262626]">
                      {client.headcount}
                    </td>
                    <td className="h-[44px] whitespace-nowrap border-r border-[#e5e5e5] px-[20px] text-[14px] font-medium text-[#262626]">
                      {client.lastFunding}
                    </td>
                    <td className="h-[44px] whitespace-nowrap px-[20px] text-[14px] font-medium text-[#262626]">
                      {client.website}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Count */}
          <div className="px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-[#999]">
              {clients.length} clients
            </span>
          </div>
        </div>
      </div>

      {/* Client profile side panel */}
      {selectedClient && (
        <ClientProfile
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  )
}
