"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, Check, Download, Eye, Globe, LayoutTemplate, Pencil } from "lucide-react"
import { PageTitleBar, PageToolbarBar } from "@/components/page-title-bar"
import { pageTitleTextClass } from "@/components/tab-active-indicator"
import { PageLoader } from "@/components/page-state"
import { EmptyState } from "@/components/empty-state"
import { useToast } from "@/components/toast"
import { useForms } from "@/lib/hooks/use-forms"
import {
  getFormProcess,
  isContentField,
  withProcessFields,
  withoutProcessFields,
  type Form,
  type FormProcessKey,
} from "@/lib/form-definitions"
import { cn } from "@/lib/utils"
import { FormBuilder } from "../_components/form-builder"
import { FormPreviewModal } from "../_components/form-preview"
import { FormSubmissionsTable } from "../_components/form-submissions-table"

type WorkspaceTab = "builder" | "submissions"

// isIncidentForm is intentionally excluded: it mirrors the active process binding and is only written by setIncidentForm.
const PERSISTED_KEYS: (keyof Form)[] = [
  "name",
  "description",
  "icon",
  "iconColor",
  "schema",
  "settings",
  "tags",
  "status",
  "locked",
  "publishedAt",
]

export default function FormWorkspacePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { getForm, processForms, isLoading, updateForm, setProcessForm, getSubmissionsForForm, ensureSubmissionsLoaded } = useForms()

  const contextForm = getForm(params.id)
  const [workingForm, setWorkingForm] = useState<Form | null>(contextForm ?? null)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(
    searchParams.get("tab") === "builder" ? "builder" : "submissions",
  )
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false)
  const [connectConfirmChecked, setConnectConfirmChecked] = useState(false)

  const formRef = useRef<Form | null>(workingForm)
  const dirtyRef = useRef(false)

  useEffect(() => {
    formRef.current = workingForm
  }, [workingForm])

  useEffect(() => {
    dirtyRef.current = isDirty
  }, [isDirty])

  useEffect(() => {
    if (contextForm && (!workingForm || workingForm.id !== contextForm.id)) {
      setWorkingForm(contextForm)
      setIsDirty(false)
    }
  }, [contextForm, workingForm])

  const persist = useCallback(
    async (form: Form) => {
      const updates: Partial<Form> = {}
      for (const key of PERSISTED_KEYS) (updates as Record<string, unknown>)[key] = form[key]
      await updateForm(params.id, updates)
    },
    [params.id, updateForm],
  )

  // Persist any unsaved edits when leaving so work is never lost.
  useEffect(() => {
    return () => {
      if (dirtyRef.current && formRef.current) persist(formRef.current)
    }
  }, [persist])

  const handleChange = useCallback((updates: Partial<Form>) => {
    setWorkingForm((prev) => (prev ? { ...prev, ...updates } : prev))
    setIsDirty(true)
  }, [])

  // Keep process bindings in sync: a form is bound to its connected process only while published.
  const reconcileProcessBinding = useCallback(
    async (form: Form) => {
      const target = form.status === "published" ? form.settings.connectedProcess : null
      // Clear any binding that still points at this form but no longer matches its connected process.
      for (const key of Object.keys(processForms) as FormProcessKey[]) {
        if (processForms[key] === form.id && key !== target) await setProcessForm(key, null)
      }
      if (target && processForms[target] !== form.id) await setProcessForm(target, form.id)
    },
    [processForms, setProcessForm],
  )

  // Saving and publishing are one action: saving always publishes the form (or republishes with the latest edits).
  const handleSave = useCallback(async () => {
    const form = formRef.current
    if (!form || isSaving) return
    const nextForm: Form = {
      ...form,
      status: "published",
      publishedAt: new Date().toISOString(),
    }
    setWorkingForm(nextForm)
    formRef.current = nextForm
    setIsSaving(true)
    await persist(nextForm)
    await reconcileProcessBinding(nextForm)
    setIsDirty(false)
    setIsSaving(false)
    toast("Form saved & published", "success")
  }, [isSaving, persist, reconcileProcessBinding, toast])

  // Connect the form to a process (adds mandatory fields) or disconnect (next = null).
  const handleConnectProcess = useCallback(
    (next: FormProcessKey | null) => {
      const form = formRef.current
      if (!form) return

      if (next) {
        const def = getFormProcess(next)
        handleChange({
          ...(def?.renameOnConnect ? { name: def.formName } : {}),
          schema: withProcessFields(form.schema, next),
          settings: { ...form.settings, connectedProcess: next, useAsIncidentForm: next === "incident_report" },
        })
        toast(`${def?.label ?? "Process"} fields added — publish to connect it`, "success")
      } else {
        handleChange({
          schema: withoutProcessFields(form.schema, form.settings.connectedProcess ?? undefined),
          settings: { ...form.settings, connectedProcess: null, useAsIncidentForm: false },
        })
        toast("Disconnected from process", "success")
      }
    },
    [handleChange, toast],
  )

  const handleUnpublish = useCallback(async () => {
    const form = formRef.current
    if (!form || isSaving) return
    const nextForm: Form = { ...form, status: "draft" }
    setWorkingForm(nextForm)
    formRef.current = nextForm
    setIsSaving(true)
    await persist(nextForm)
    await reconcileProcessBinding(nextForm)
    setIsDirty(false)
    setIsSaving(false)
    toast("Form moved to draft", "success")
  }, [isSaving, persist, reconcileProcessBinding, toast])

  const handleBack = useCallback(async () => {
    if (dirtyRef.current && formRef.current) {
      await persist(formRef.current)
      await reconcileProcessBinding(formRef.current)
    }
    router.push("/forms")
  }, [persist, reconcileProcessBinding, router])

  useEffect(() => {
    ensureSubmissionsLoaded(params.id)
  }, [ensureSubmissionsLoaded, params.id])

  const submissions = useMemo(() => getSubmissionsForForm(params.id), [getSubmissionsForForm, params.id])

  const handleDownloadCsv = useCallback(() => {
    const form = formRef.current
    if (!form) return
    if (submissions.length === 0) {
      toast("No submissions to export", "error")
      return
    }
    const dataFields = form.schema.fields.filter((field) => !isContentField(field.type))
    const headers = [...dataFields.map((field) => field.label || "Field"), "Submitted by", "Submitted"]
    const escapeCell = (value: unknown): string => {
      if (value === null || value === undefined) return ""
      const text = Array.isArray(value)
        ? value.join(", ")
        : typeof value === "boolean"
          ? value ? "Yes" : "No"
          : String(value)
      return `"${text.replace(/"/g, '""')}"`
    }
    const rows = submissions.map((submission) =>
      [
        ...dataFields.map((field) => escapeCell(submission.answers[field.id])),
        escapeCell(submission.submittedByName),
        escapeCell(submission.createdAt),
      ].join(","),
    )
    const csv = [headers.map(escapeCell).join(","), ...rows].join("\n")
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const safeName = (form.name || "form").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()
    link.href = url
    link.download = `${safeName || "form"}-submissions.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [submissions, toast])

  if (isLoading && !workingForm) return <PageLoader label="Loading form…" />

  if (!workingForm) {
    return (
      <div className="flex h-full flex-col">
        <PageTitleBar title="Forms" onBack={() => router.push("/forms")} backLabel="Back to forms" />
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={LayoutTemplate}
            title="Form not found"
            description="This form may have been deleted."
            action={{ label: "Back to forms", onClick: () => router.push("/forms") }}
          />
        </div>
      </div>
    )
  }

  const isPublished = workingForm.status === "published"
  const connectedProcess = workingForm.settings.connectedProcess
  const connectedProcessDef = connectedProcess ? getFormProcess(connectedProcess) : undefined

  const handleSaveClick = () => {
    // Saving a process-connected form that isn't yet the active binding requires explicit confirmation.
    if (connectedProcess && processForms[connectedProcess] !== params.id) {
      setConnectConfirmChecked(false)
      setIsPublishConfirmOpen(true)
      return
    }
    handleSave()
  }

  const headerActions = (
    <div className="flex items-center gap-[8px]">
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[6px] border border-folk-border text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
          aria-label="Preview form"
          title="Preview form"
        >
          <Eye className="h-[15px] w-[15px]" strokeWidth={1.75} />
        </button>
        {isPublished && (
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={isSaving}
            className="flex h-[29px] items-center justify-center rounded-[6px] border border-folk-border px-[12px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover disabled:opacity-60"
            tabIndex={0}
          >
            Unpublish
          </button>
        )}
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={isSaving || (isPublished && !isDirty)}
          className="flex h-[29px] flex-1 items-center justify-center gap-[6px] rounded-[6px] bg-folk-text px-[12px] text-[13px] font-medium text-white transition-colors hover:bg-black disabled:opacity-60"
          tabIndex={0}
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      <PageTitleBar
        onBack={handleBack}
        backLabel="Back to forms"
        title={
          <input
            value={workingForm.name}
            onChange={(event) => handleChange({ name: event.target.value })}
            className={pageTitleTextClass("min-w-0 max-w-[280px] flex-shrink bg-transparent outline-none")}
            aria-label="Form name"
            tabIndex={0}
          />
        }
      />
      {activeTab === "submissions" ? (
        <PageToolbarBar align="between">
          <span className="text-[16px]">{workingForm.icon}</span>
          <div className="flex items-center gap-[8px]">
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={submissions.length === 0}
              className="flex items-center gap-[6px] rounded-[6px] border border-folk-border px-[12px] py-[6px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover disabled:cursor-default disabled:text-folk-tertiary disabled:hover:bg-transparent"
              tabIndex={0}
            >
              <Download className="h-[14px] w-[14px]" strokeWidth={1.75} />
              Download CSV
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("builder")}
              className="flex items-center gap-[6px] rounded-[6px] border border-folk-border px-[12px] py-[6px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
              tabIndex={0}
            >
              <Pencil className="h-[14px] w-[14px]" strokeWidth={1.75} />
              Edit
            </button>
          </div>
        </PageToolbarBar>
      ) : (
        <PageToolbarBar>{headerActions}</PageToolbarBar>
      )}

      <div className="min-h-0 flex-1">
        {activeTab === "builder" ? (
          <FormBuilder
            form={workingForm}
            onChange={handleChange}
            connectedProcess={connectedProcess}
            onConnectProcess={handleConnectProcess}
          />
        ) : (
          <FormSubmissionsTable form={workingForm} submissions={submissions} />
        )}
      </div>

      <FormPreviewModal form={workingForm} isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} />

      {isPublishConfirmOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/25 p-[16px]"
          onClick={() => setIsPublishConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-[440px] rounded-[12px] bg-white p-[20px] shadow-folk"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-[12px]">
              <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#fdecec] text-[#c0392b]">
                <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-folk-text">
                  Connect to {connectedProcessDef?.label ?? "process"}
                </h3>
                <p className="mt-[4px] text-[13px] leading-[1.55] text-folk-secondary">
                  Publishing this form connects it to the{" "}
                  <span className="font-medium text-folk-text">{connectedProcessDef?.label ?? "process"}</span> process.{" "}
                  {connectedProcessDef?.description} It replaces any previously connected form.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setConnectConfirmChecked((prev) => !prev)}
              className="mt-[16px] flex w-full items-center gap-[10px] rounded-[8px] border border-folk-border px-[12px] py-[10px] text-left transition-colors hover:bg-folk-hover"
              tabIndex={0}
            >
              <span
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                  connectConfirmChecked ? "border-folk-text bg-folk-text text-white" : "border-folk-border-strong bg-white",
                )}
              >
                {connectConfirmChecked && <Check className="h-[12px] w-[12px]" strokeWidth={2.5} />}
              </span>
              <span className="text-[13px] font-medium text-folk-text">
                Set as the active {connectedProcessDef?.connectLabel.toLowerCase() ?? "process"} form
              </span>
            </button>

            <div className="mt-[18px] flex items-center gap-[10px]">
              <button
                type="button"
                onClick={() => setIsPublishConfirmOpen(false)}
                className="flex-1 rounded-[6px] border border-folk-border px-[14px] py-[8px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!connectConfirmChecked}
                onClick={() => {
                  setIsPublishConfirmOpen(false)
                  handleSave()
                }}
                className="flex flex-1 items-center justify-center gap-[6px] rounded-[6px] bg-folk-text px-[14px] py-[8px] text-[13px] font-medium text-white transition-colors hover:bg-black disabled:opacity-50"
                tabIndex={0}
              >
                <Globe className="h-[14px] w-[14px]" strokeWidth={1.75} />
                Publish &amp; connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
