"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Building2, CircleChevronDown, CircleDollarSign, ClipboardList, Plus } from "lucide-react"
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
import { useForms } from "@/lib/hooks/use-forms"
import { FORM_STATUS_LABELS, getFormProcess, type Form, type FormProcessKey, type FormTemplate } from "@/lib/form-definitions"
import { cn } from "@/lib/utils"
import { TemplateCenter } from "./_components/template-center"

export default function FormsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { forms, getFormProcessKey, isLoading, fetchError, createForm, createFormFromTemplate, deleteForm, setFormArchived, getSubmissionCount, refetch } = useForms()

  const [isTemplateOpen, setIsTemplateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [view, setView] = useState<"active" | "archived">("active")

  const activeForms = useMemo(() => forms.filter((form) => !form.archived), [forms])
  const archivedForms = useMemo(() => forms.filter((form) => form.archived), [forms])

  const filteredForms = useMemo(() => {
    const base = view === "archived" ? archivedForms : activeForms
    const query = searchQuery.trim().toLowerCase()
    if (!query) return base
    return base.filter((form) =>
      [form.name, form.description, ...form.tags].some((text) => text.toLowerCase().includes(query)),
    )
  }, [activeForms, archivedForms, view, searchQuery])

  const handleBlankForm = async () => {
    setIsTemplateOpen(false)
    const form = await createForm()
    if (form) router.push(`/forms/${form.id}?tab=builder`)
    else toast("Could not create form", "error")
  }

  const handleUseTemplate = async (template: FormTemplate) => {
    setIsTemplateOpen(false)
    const form = await createFormFromTemplate(template)
    if (form) router.push(`/forms/${form.id}?tab=builder`)
    else toast("Could not create form", "error")
  }

  const handleDelete = async (form: Form) => {
    await deleteForm(form.id)
    toast(`Deleted "${form.name}"`, "success")
  }

  const handleArchive = async (form: Form) => {
    await setFormArchived(form.id, !form.archived)
    toast(form.archived ? `Restored "${form.name}"` : `Archived "${form.name}"`, "success")
  }

  if (isLoading) return <PageLoader label="Loading forms…" />
  if (fetchError && forms.length === 0) return <PageError message={fetchError} onRetry={refetch} />

  return (
    <div className="flex h-full flex-col">
      <PageTitleBar title="Forms" />
      <div className="flex h-[44px] shrink-0 items-center justify-end gap-[8px] border-b border-folk-border-subtle bg-white px-[16px]">
        <button
          type="button"
          onClick={() => setIsTemplateOpen(true)}
          className={folkPrimaryAddBtnClass()}
          tabIndex={0}
          aria-label="Add new"
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>Add new</span>
        </button>
      </div>

      {forms.length === 0 ? (
        <div className="flex-1 overflow-y-auto bg-folk-surface">
          <EmptyState
            icon={ClipboardList}
            title="No forms yet"
            description="Build a form from scratch or start from a template, then attach it to a process like incident reports."
            action={{ label: "Create form", onClick: () => setIsTemplateOpen(true) }}
            className="h-full"
          />
        </div>
      ) : (
        <>
          <div className="flex h-[41px] shrink-0 items-center gap-[8px] border-b border-folk-border-subtle bg-white px-[16px]">
            <ExpandableTableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search forms…"
              ariaLabel="Search forms"
            />

            <div className="flex items-center gap-[2px] rounded-[7px] bg-folk-hover p-[2px]">
              <ViewToggle label="Active" count={activeForms.length} isActive={view === "active"} onClick={() => setView("active")} />
              <ViewToggle label="Archived" count={archivedForms.length} isActive={view === "archived"} onClick={() => setView("archived")} />
            </div>

            <span className="ml-auto text-[12px] text-folk-secondary">{filteredForms.length} {filteredForms.length === 1 ? "form" : "forms"}</span>
          </div>

          <div className="flex-1 overflow-y-auto bg-folk-surface p-[16px]">
            {filteredForms.length === 0 ? (
              <div className="flex flex-col items-center gap-[10px] pt-[48px] text-center">
                <p className="text-[13px] text-folk-tertiary">
                  {searchQuery.trim()
                    ? "No forms match your search."
                    : view === "archived"
                      ? "No archived forms."
                      : "No active forms — create one or restore an archived form."}
                </p>
                {!searchQuery.trim() && view === "active" && (
                  <button
                    type="button"
                    onClick={() => setIsTemplateOpen(true)}
                    className="outline-btn folk-pill-btn flex items-center gap-[5px] px-[10px] py-[5px] text-[13px] font-medium"
                    tabIndex={0}
                  >
                    <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                    Create form
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-[12px] [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                {filteredForms.map((form) => (
                  <FormCard
                    key={form.id}
                    form={form}
                    connectedProcess={getFormProcessKey(form.id)}
                    submissionCount={getSubmissionCount(form.id)}
                    onOpen={() => router.push(`/forms/${form.id}`)}
                    onEdit={() => router.push(`/forms/${form.id}?tab=builder`)}
                    onArchive={() => handleArchive(form)}
                    onDelete={() => handleDelete(form)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {isTemplateOpen && (
        <TemplateCenter
          onClose={() => setIsTemplateOpen(false)}
          onUseTemplate={handleUseTemplate}
          onBlankForm={handleBlankForm}
        />
      )}
    </div>
  )
}

interface ViewToggleProps {
  label: string
  count: number
  isActive: boolean
  onClick: () => void
}

function ViewToggle({ label, count, isActive, onClick }: ViewToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-[26px] items-center gap-[6px] rounded-[5px] px-[10px] text-[12px] font-medium transition-colors",
        isActive ? "bg-white text-folk-text shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-folk-secondary hover:text-folk-text",
      )}
      tabIndex={0}
      aria-pressed={isActive}
    >
      {label}
      <span className={cn("text-[11px]", isActive ? "text-folk-secondary" : "text-folk-tertiary")}>{count}</span>
    </button>
  )
}

interface FormCardProps {
  form: Form
  connectedProcess: FormProcessKey | null
  submissionCount: number
  onOpen: () => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}

function FormCard({ form, connectedProcess, submissionCount, onOpen, onEdit, onArchive, onDelete }: FormCardProps) {
  const isPublished = form.status === "published"
  const processDef = connectedProcess ? getFormProcess(connectedProcess) : undefined
  const fieldCount = form.schema.fields.length
  const avatarBackground = pastelFromHex(form.settings.coverColor || form.iconColor || "#8b5cf6")

  const rows = [
    {
      icon: Building2,
      content: form.description ? (
        <WorkspaceCardLinkText>{form.description}</WorkspaceCardLinkText>
      ) : (
        <WorkspaceCardText muted>No description</WorkspaceCardText>
      ),
    },
    {
      icon: Briefcase,
      content: <WorkspaceCardText>{fieldCount} {fieldCount === 1 ? "field" : "fields"}</WorkspaceCardText>,
    },
    {
      icon: CircleChevronDown,
      content: (
        <WorkspaceCardPill
          label={FORM_STATUS_LABELS[form.status]}
          tone={isPublished ? "green" : "neutral"}
        />
      ),
    },
    {
      icon: CircleChevronDown,
      content: processDef ? (
        <WorkspaceCardPill
          label={processDef.connectLabel}
          tone={connectedProcess === "incident_report" ? "rose" : "purple"}
        />
      ) : form.archived ? (
        <WorkspaceCardPill label="Archived" tone="neutral" />
      ) : form.locked ? (
        <WorkspaceCardPill label="Locked" tone="neutral" />
      ) : (
        <WorkspaceCardText muted>Not connected</WorkspaceCardText>
      ),
    },
    {
      icon: CircleDollarSign,
      content: (
        <WorkspaceCardText>
          {submissionCount} {submissionCount === 1 ? "submission" : "submissions"}
        </WorkspaceCardText>
      ),
    },
  ]

  return (
    <WorkspaceCard
      title={form.name || "Untitled form"}
      avatar={form.icon}
      avatarBackground={avatarBackground}
      rows={rows}
      onClick={onOpen}
      actions={
        <DeleteActionsMenu
          ariaLabel={`Actions for ${form.name}`}
          stopPropagation
          onEdit={onEdit}
          editLabel="Edit form"
          onArchive={onArchive}
          isArchived={form.archived}
          onDelete={onDelete}
          itemName={form.name}
          confirmTitle="Delete form?"
          confirmDescription={`This will permanently delete "${form.name}" and its submissions. This cannot be undone.`}
        />
      }
    />
  )
}
