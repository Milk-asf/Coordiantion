"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, Briefcase, Building2, CircleChevronDown, CircleDollarSign, Plus, Sparkles, X } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { PageTitleBar } from "@/components/page-title-bar"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { PageError, PageLoader } from "@/components/page-state"
import { DeleteActionsMenu } from "@/components/delete-actions-menu"
import { useToast } from "@/components/toast"
import { folkPrimaryAddBtnClass } from "@/lib/folk-ui"
import {
  WorkspaceCard,
  WorkspaceCardLinkText,
  WorkspaceCardPill,
  WorkspaceCardText,
  pastelFromHex,
} from "@/components/workspace-card"
import { useAnalytics } from "@/lib/analytics/context"
import { SPACE_TEMPLATES, type AnalyticsSpace, type SpaceTemplate } from "@/lib/analytics/definitions"

function formatDate(value: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { spaces, isLoading, fetchError, createSpace, createSpaceFromTemplate, deleteSpace, refetch } = useAnalytics()
  const [searchQuery, setSearchQuery] = useState("")
  const [isChooserOpen, setIsChooserOpen] = useState(false)

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return spaces
    return spaces.filter((space) => [space.name, space.description].some((text) => text.toLowerCase().includes(query)))
  }, [spaces, searchQuery])

  const handleBlank = async () => {
    setIsChooserOpen(false)
    const space = await createSpace()
    if (space) router.push(`/reports/${space.id}`)
    else toast("Could not create space", "error")
  }

  const handleTemplate = async (template: SpaceTemplate) => {
    setIsChooserOpen(false)
    const space = await createSpaceFromTemplate(template)
    if (space) router.push(`/reports/${space.id}`)
    else toast("Could not create space", "error")
  }

  const handleDelete = async (space: AnalyticsSpace) => {
    await deleteSpace(space.id)
    toast(`Deleted "${space.name}"`, "success")
  }

  if (isLoading && spaces.length === 0) return <PageLoader label="Loading reports…" />
  if (fetchError && spaces.length === 0) return <PageError message={fetchError} onRetry={refetch} />

  return (
    <div className="flex h-full flex-col">
      <PageTitleBar title="Reports" />
      <div className="flex h-[44px] shrink-0 items-center justify-end gap-[8px] border-b border-folk-border-subtle bg-white px-[16px]">
        <button
          type="button"
          onClick={() => setIsChooserOpen(true)}
          className={folkPrimaryAddBtnClass()}
          tabIndex={0}
          aria-label="Add new"
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>Add new</span>
        </button>
      </div>

      {spaces.length === 0 ? (
        <div className="flex-1 overflow-y-auto bg-folk-surface">
          <EmptyState
            icon={BarChart3}
            title="No report spaces yet"
            description="Create a space to build live charts and metrics from your shifts, incidents, finance and more."
            action={{ label: "Create space", onClick: () => setIsChooserOpen(true) }}
            className="h-full"
          />
        </div>
      ) : (
        <>
          <div className="flex h-[41px] shrink-0 items-center gap-[8px] border-b border-folk-border-subtle bg-white px-[16px]">
            <ExpandableTableSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search spaces…" ariaLabel="Search spaces" />
            <span className="ml-auto text-[12px] text-folk-secondary">
              {filtered.length} {filtered.length === 1 ? "space" : "spaces"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto bg-folk-surface p-[16px]">
            {filtered.length === 0 ? (
              <p className="pt-[48px] text-center text-[13px] text-folk-tertiary">No spaces match your search.</p>
            ) : (
              <div className="grid gap-[12px] [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                {filtered.map((space) => (
                  <SpaceCard
                    key={space.id}
                    space={space}
                    onOpen={() => router.push(`/reports/${space.id}`)}
                    onDelete={() => handleDelete(space)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {isChooserOpen && (
        <SpaceChooser onClose={() => setIsChooserOpen(false)} onBlank={handleBlank} onTemplate={handleTemplate} />
      )}
    </div>
  )
}

interface SpaceCardProps {
  space: AnalyticsSpace
  onOpen: () => void
  onDelete: () => void
}

function SpaceCard({ space, onOpen, onDelete }: SpaceCardProps) {
  const reportCount = space.widgets.length
  const avatarBackground = pastelFromHex(space.iconColor || "#6366f1")

  const rows = [
    {
      icon: Building2,
      content: space.description ? (
        <WorkspaceCardLinkText>{space.description}</WorkspaceCardLinkText>
      ) : (
        <WorkspaceCardText muted>No description</WorkspaceCardText>
      ),
    },
    {
      icon: Briefcase,
      content: (
        <WorkspaceCardText>
          {reportCount} {reportCount === 1 ? "report" : "reports"}
        </WorkspaceCardText>
      ),
    },
    {
      icon: CircleChevronDown,
      content: (
        <WorkspaceCardPill
          label={reportCount > 0 ? "Active space" : "Empty space"}
          tone={reportCount > 0 ? "blue" : "neutral"}
        />
      ),
    },
    {
      icon: CircleChevronDown,
      content: (
        <WorkspaceCardPill
          label={reportCount === 1 ? "1 widget" : `${reportCount} widgets`}
          tone="purple"
        />
      ),
    },
    {
      icon: CircleDollarSign,
      content: <WorkspaceCardText>{formatDate(space.createdAt)}</WorkspaceCardText>,
    },
  ]

  return (
    <WorkspaceCard
      title={space.name || "Untitled space"}
      avatar={space.icon}
      avatarBackground={avatarBackground}
      rows={rows}
      onClick={onOpen}
      actions={
        <DeleteActionsMenu
          ariaLabel={`Actions for ${space.name}`}
          stopPropagation
          onEdit={onOpen}
          editLabel="Open space"
          onDelete={onDelete}
          itemName={space.name}
          confirmTitle="Delete space?"
          confirmDescription={`This will permanently delete "${space.name}" and its reports. This cannot be undone.`}
        />
      }
    />
  )
}

interface SpaceChooserProps {
  onClose: () => void
  onBlank: () => void
  onTemplate: (template: SpaceTemplate) => void
}

function SpaceChooser({ onClose, onBlank, onTemplate }: SpaceChooserProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-[16px]" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[12px] border border-folk-border bg-white shadow-folk"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-folk-border-subtle px-[18px]">
          <h2 className="text-[15px] font-semibold text-folk-text">Create a report space</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
            aria-label="Close"
            tabIndex={0}
          >
            <X className="h-[16px] w-[16px]" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[18px]">
          <button
            type="button"
            onClick={onBlank}
            className="mb-[18px] flex w-full items-center gap-[12px] rounded-[10px] border border-dashed border-folk-border-strong bg-folk-surface px-[16px] py-[14px] text-left transition-colors hover:border-[#a3c4f3] hover:bg-[#f5f9ff]"
            tabIndex={0}
          >
            <span className="flex h-[36px] w-[36px] items-center justify-center rounded-[8px] bg-folk-hover text-folk-secondary">
              <Plus className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <span>
              <span className="block text-[13px] font-semibold text-folk-text">Blank space</span>
              <span className="block text-[12px] text-folk-secondary">Start empty and add reports one by one.</span>
            </span>
          </button>

          <div className="mb-[10px] flex items-center gap-[6px] text-[11px] font-medium uppercase tracking-wide text-folk-tertiary">
            <Sparkles className="h-[12px] w-[12px]" strokeWidth={1.75} />
            Start from a template
          </div>
          <div className="grid gap-[12px] sm:grid-cols-2">
            {SPACE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onTemplate(template)}
                className="flex flex-col rounded-[10px] border border-folk-border bg-white p-[14px] text-left transition-colors hover:border-folk-border-strong hover:bg-folk-hover"
                tabIndex={0}
              >
                <span
                  className="mb-[10px] flex h-[36px] w-[36px] items-center justify-center rounded-[8px] text-[18px]"
                  style={{ backgroundColor: `${template.iconColor}1a` }}
                >
                  {template.icon}
                </span>
                <span className="text-[13px] font-semibold text-folk-text">{template.name}</span>
                <span className="mt-[3px] text-[12px] leading-[1.45] text-folk-secondary">{template.description}</span>
                <span className="mt-[8px] text-[11px] font-medium text-folk-tertiary">
                  {template.widgets.length} reports
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
