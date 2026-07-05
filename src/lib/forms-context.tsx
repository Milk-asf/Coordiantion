"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import {
  buildFormFromTemplate,
  createEmptyForm,
  defaultFormSettings,
  FORM_PROCESSES,
  withoutProcessFields,
  withProcessFields,
  type Form,
  type FormProcessKey,
  type FormSchema,
  type FormSettings,
  type FormStatus,
  type FormSubmission,
  type FormTemplate,
} from "@/lib/form-definitions"

type ProcessBindings = Partial<Record<FormProcessKey, string | null>>

const PROCESS_KEYS = FORM_PROCESSES.map((process) => process.key)

interface FormRow {
  id: string
  workspace_id: string
  name: string
  description: string
  icon: string
  icon_color: string
  schema: FormSchema | null
  settings: Partial<FormSettings> | null
  status: FormStatus
  tags: string[] | null
  locked: boolean
  archived: boolean | null
  is_incident_form: boolean
  created_by: string | null
  created_by_name: string
  created_at: string
  updated_at: string
  published_at: string | null
}

interface SubmissionRow {
  id: string
  form_id: string
  workspace_id: string
  answers: Record<string, unknown> | null
  submitted_by_staff_id: string | null
  submitted_by_name: string
  created_at: string
  updated_at: string
}

function formsKey(workspaceId: string | undefined) {
  return workspaceId ? `workspace-forms-${workspaceId}` : "workspace-forms"
}

function submissionsKey(workspaceId: string | undefined) {
  return workspaceId ? `workspace-form-submissions-${workspaceId}` : "workspace-form-submissions"
}

function bindingsKey(workspaceId: string | undefined) {
  return workspaceId ? `workspace-form-bindings-${workspaceId}` : "workspace-form-bindings"
}

function loadLocalBindings(workspaceId: string | undefined): ProcessBindings {
  if (typeof window === "undefined" || !workspaceId) return {}
  try {
    const raw = localStorage.getItem(bindingsKey(workspaceId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ProcessBindings
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function saveLocalBindings(workspaceId: string | undefined, bindings: ProcessBindings) {
  if (typeof window === "undefined" || !workspaceId) return
  localStorage.setItem(bindingsKey(workspaceId), JSON.stringify(bindings))
}

function normalizeSettings(raw: Partial<FormSettings> | null): FormSettings {
  const merged = { ...defaultFormSettings(), ...(raw ?? {}) }
  // Back-compat: legacy forms only set useAsIncidentForm; derive the connected process from it.
  if (!merged.connectedProcess && merged.useAsIncidentForm) merged.connectedProcess = "incident_report"
  merged.useAsIncidentForm = merged.connectedProcess === "incident_report"
  return merged
}

function normalizeFormSchema(schema: FormSchema, settings: FormSettings): FormSchema {
  if (!settings.connectedProcess) return schema
  return withProcessFields(schema, settings.connectedProcess)
}

function dbToForm(row: FormRow): Form {
  const settings = normalizeSettings(row.settings)
  const baseSchema = row.schema && Array.isArray(row.schema.fields)
    ? { fields: row.schema.fields, steps: Array.isArray(row.schema.steps) ? row.schema.steps : [] }
    : { fields: [], steps: [] }

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name || "Untitled form",
    description: row.description || "",
    icon: row.icon || "📄",
    iconColor: row.icon_color || "#3b82f6",
    schema: normalizeFormSchema(baseSchema, settings),
    settings,
    status: row.status || "draft",
    tags: Array.isArray(row.tags) ? row.tags : [],
    locked: row.locked ?? false,
    archived: row.archived ?? false,
    isIncidentForm: row.is_incident_form ?? false,
    createdBy: row.created_by ?? "",
    createdByName: row.created_by_name || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  }
}

function formToRow(form: Form) {
  return {
    workspace_id: form.workspaceId,
    name: form.name,
    description: form.description,
    icon: form.icon,
    icon_color: form.iconColor,
    schema: form.schema,
    settings: form.settings,
    status: form.status,
    tags: form.tags,
    locked: form.locked,
    archived: form.archived,
    is_incident_form: form.isIncidentForm,
    created_by_name: form.createdByName,
    created_at: form.createdAt,
    updated_at: form.updatedAt,
    published_at: form.publishedAt,
  }
}

function dbToSubmission(row: SubmissionRow): FormSubmission {
  return {
    id: row.id,
    formId: row.form_id,
    workspaceId: row.workspace_id,
    answers: row.answers ?? {},
    submittedByStaffId: row.submitted_by_staff_id,
    submittedByName: row.submitted_by_name || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function loadLocalForms(workspaceId: string | undefined): Form[] {
  if (typeof window === "undefined" || !workspaceId) return []
  try {
    const raw = localStorage.getItem(formsKey(workspaceId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Form[]
    return Array.isArray(parsed)
      ? parsed.map((form) => ({
          ...form,
          settings: normalizeSettings(form.settings),
          schema: normalizeFormSchema(form.schema, normalizeSettings(form.settings)),
        }))
      : []
  } catch {
    return []
  }
}

function saveLocalForms(workspaceId: string | undefined, forms: Form[]) {
  if (typeof window === "undefined" || !workspaceId) return
  localStorage.setItem(formsKey(workspaceId), JSON.stringify(forms))
}

function groupSubmissions(list: FormSubmission[]): {
  byForm: Record<string, FormSubmission[]>
  counts: Record<string, number>
} {
  const byForm: Record<string, FormSubmission[]> = {}
  const counts: Record<string, number> = {}
  for (const submission of list) {
    ;(byForm[submission.formId] ??= []).push(submission)
    counts[submission.formId] = (counts[submission.formId] ?? 0) + 1
  }
  return { byForm, counts }
}

function loadLocalSubmissions(workspaceId: string | undefined): FormSubmission[] {
  if (typeof window === "undefined" || !workspaceId) return []
  try {
    const raw = localStorage.getItem(submissionsKey(workspaceId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as FormSubmission[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalSubmissions(workspaceId: string | undefined, submissions: FormSubmission[]) {
  if (typeof window === "undefined" || !workspaceId) return
  localStorage.setItem(submissionsKey(workspaceId), JSON.stringify(submissions))
}

interface FormsContextValue {
  forms: Form[]
  incidentFormId: string | null
  processForms: ProcessBindings
  isLoading: boolean
  fetchError: string | null
  getForm: (id: string) => Form | undefined
  getProcessFormId: (processKey: FormProcessKey) => string | null
  getFormProcessKey: (formId: string) => FormProcessKey | null
  getSubmissionsForForm: (formId: string) => FormSubmission[]
  getSubmissionCount: (formId: string) => number
  getAllSubmissions: () => FormSubmission[]
  ensureSubmissionsLoaded: (formId: string) => Promise<void>
  ensureAllSubmissionsLoaded: () => Promise<void>
  createForm: (params?: { name?: string }) => Promise<Form | null>
  createFormFromTemplate: (template: FormTemplate) => Promise<Form | null>
  updateForm: (id: string, updates: Partial<Form>) => Promise<void>
  setFormArchived: (id: string, archived: boolean) => Promise<void>
  duplicateForm: (id: string) => Promise<Form | null>
  deleteForm: (id: string) => Promise<void>
  setProcessForm: (processKey: FormProcessKey, formId: string | null) => Promise<void>
  setIncidentForm: (formId: string | null) => Promise<void>
  addSubmission: (
    formId: string,
    input: { answers: Record<string, unknown>; submittedByName?: string; submittedByStaffId?: string | null },
  ) => Promise<FormSubmission | null>
  refetch: () => Promise<void>
}

const FormsContext = createContext<FormsContextValue | null>(null)

export function FormsProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace, currentUserName } = useWorkspace()
  const [forms, setForms] = useState<Form[]>([])
  // Submissions are loaded lazily per form; only lightweight counts are fetched upfront.
  const [submissionsByForm, setSubmissionsByForm] = useState<Record<string, FormSubmission[]>>({})
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({})
  const [processForms, setProcessForms] = useState<ProcessBindings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  // Tracks which forms have had their full submissions loaded, so we don't refetch.
  const loadedFormsRef = useRef<Set<string>>(new Set())
  const allSubmissionsLoadedRef = useRef(false)

  const persistForms = useCallback(
    (updater: Form[] | ((prev: Form[]) => Form[])) => {
      setForms((prev) => {
        const next = typeof updater === "function" ? (updater as (p: Form[]) => Form[])(prev) : updater
        saveLocalForms(activeWorkspace?.id, next)
        return next
      })
    },
    [activeWorkspace?.id],
  )

  const persistLocalSubmission = useCallback(
    (submission: FormSubmission) => {
      if (!activeWorkspace?.id) return
      const all = loadLocalSubmissions(activeWorkspace.id)
      saveLocalSubmissions(activeWorkspace.id, [submission, ...all])
    },
    [activeWorkspace?.id],
  )

  const persistBinding = useCallback(
    (processKey: FormProcessKey, formId: string | null) => {
      setProcessForms((prev) => {
        const next = { ...prev, [processKey]: formId }
        saveLocalBindings(activeWorkspace?.id, next)
        return next
      })
    },
    [activeWorkspace?.id],
  )

  const fetchForms = useCallback(async () => {
    loadedFormsRef.current = new Set()
    allSubmissionsLoadedRef.current = false
    if (!activeWorkspace) {
      setForms([])
      setSubmissionsByForm({})
      setSubmissionCounts({})
      setProcessForms({})
      setIsLoading(false)
      return
    }

    const supabase = isSupabaseConfigured() ? createClient() : null
    if (!supabase) {
      const { byForm, counts } = groupSubmissions(loadLocalSubmissions(activeWorkspace.id))
      // Local submissions are fully in memory, so mark every form as loaded.
      loadedFormsRef.current = new Set(Object.keys(byForm))
      allSubmissionsLoadedRef.current = true
      setForms(loadLocalForms(activeWorkspace.id))
      setSubmissionsByForm(byForm)
      setSubmissionCounts(counts)
      setProcessForms(loadLocalBindings(activeWorkspace.id))
      setFetchError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setFetchError(null)

    try {
      // Only fetch lightweight form_id rows for counts; full answers are loaded lazily per form.
      const [formsRes, countsRes, bindingRes] = await Promise.all([
        supabase.from("forms").select("*").eq("workspace_id", activeWorkspace.id).order("updated_at", { ascending: false }),
        supabase.from("form_submissions").select("form_id").eq("workspace_id", activeWorkspace.id),
        supabase
          .from("workspace_form_bindings")
          .select("process_key, form_id, is_active")
          .eq("workspace_id", activeWorkspace.id),
      ])

      if (formsRes.error || !formsRes.data) {
        setFetchError(formsRes.error?.message || "Failed to load forms")
        setForms(loadLocalForms(activeWorkspace.id))
      } else {
        persistForms((formsRes.data as FormRow[]).map(dbToForm))
      }

      if (!countsRes.error && countsRes.data) {
        const counts: Record<string, number> = {}
        for (const row of countsRes.data as { form_id: string }[]) {
          counts[row.form_id] = (counts[row.form_id] ?? 0) + 1
        }
        setSubmissionCounts(counts)
      }
      // Reset any previously cached full submissions; they reload on demand.
      setSubmissionsByForm({})

      const bindings: ProcessBindings = {}
      if (!bindingRes.error && Array.isArray(bindingRes.data)) {
        for (const row of bindingRes.data as { process_key: FormProcessKey; form_id: string | null; is_active: boolean | null }[]) {
          if (row.is_active === false) continue
          if (PROCESS_KEYS.includes(row.process_key)) bindings[row.process_key] = row.form_id ?? null
        }
      }
      setProcessForms(bindings)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load forms")
      const { byForm, counts } = groupSubmissions(loadLocalSubmissions(activeWorkspace.id))
      loadedFormsRef.current = new Set(Object.keys(byForm))
      setForms(loadLocalForms(activeWorkspace.id))
      setSubmissionsByForm(byForm)
      setSubmissionCounts(counts)
    }

    setIsLoading(false)
  }, [activeWorkspace, persistForms])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  const persistFormToDb = useCallback(async (form: Form) => {
    const supabase = isSupabaseConfigured() ? createClient() : null
    if (!supabase) return
    await supabase.from("forms").update(formToRow(form)).eq("id", form.id)
  }, [])

  const insertForm = useCallback(
    async (form: Form): Promise<Form> => {
      const supabase = isSupabaseConfigured() ? createClient() : null
      if (!supabase) {
        persistForms((prev) => [form, ...prev])
        return form
      }

      const { data, error } = await supabase.from("forms").insert(formToRow(form)).select("*").single()
      if (error || !data) {
        persistForms((prev) => [form, ...prev])
        return form
      }

      const saved = dbToForm(data as FormRow)
      persistForms((prev) => [saved, ...prev])
      return saved
    },
    [persistForms],
  )

  const createForm = useCallback(
    async (params?: { name?: string }): Promise<Form | null> => {
      if (!activeWorkspace) return null
      const form = createEmptyForm({
        workspaceId: activeWorkspace.id,
        createdBy: "",
        createdByName: currentUserName,
        name: params?.name,
      })
      return insertForm(form)
    },
    [activeWorkspace, currentUserName, insertForm],
  )

  const createFormFromTemplate = useCallback(
    async (template: FormTemplate): Promise<Form | null> => {
      if (!activeWorkspace) return null
      const form = buildFormFromTemplate(template, {
        workspaceId: activeWorkspace.id,
        createdBy: "",
        createdByName: currentUserName,
      })
      return insertForm(form)
    },
    [activeWorkspace, currentUserName, insertForm],
  )

  const updateForm = useCallback(
    async (id: string, updates: Partial<Form>) => {
      if (!activeWorkspace) return
      const updatedAt = new Date().toISOString()
      let nextForm: Form | null = null

      persistForms((prev) =>
        prev.map((form) => {
          if (form.id !== id) return form
          nextForm = { ...form, ...updates, updatedAt }
          return nextForm
        }),
      )

      if (nextForm) await persistFormToDb(nextForm)
    },
    [activeWorkspace, persistForms, persistFormToDb],
  )

  const duplicateForm = useCallback(
    async (id: string): Promise<Form | null> => {
      if (!activeWorkspace) return null
      const source = forms.find((form) => form.id === id)
      if (!source) return null

      const copy = createEmptyForm({
        workspaceId: activeWorkspace.id,
        createdBy: "",
        createdByName: currentUserName,
        name: `${source.name} (copy)`,
      })
      // A duplicate isn't connected to any process, so drop the injected system fields and reset the connection.
      const copiedSchema = withoutProcessFields(JSON.parse(JSON.stringify(source.schema)) as FormSchema)
      const form: Form = {
        ...copy,
        description: source.description,
        icon: source.icon,
        iconColor: source.iconColor,
        schema: copiedSchema,
        settings: { ...source.settings, useAsIncidentForm: false, connectedProcess: null },
        tags: [...source.tags],
        isIncidentForm: false,
      }
      return insertForm(form)
    },
    [activeWorkspace, currentUserName, forms, insertForm],
  )

  const deleteForm = useCallback(
    async (id: string) => {
      if (!activeWorkspace) return
      // Clear any process bindings that pointed at this form.
      setProcessForms((prev) => {
        let changed = false
        const next: ProcessBindings = { ...prev }
        for (const key of PROCESS_KEYS) {
          if (next[key] === id) {
            next[key] = null
            changed = true
          }
        }
        if (changed) saveLocalBindings(activeWorkspace.id, next)
        return changed ? next : prev
      })
      persistForms((prev) => prev.filter((form) => form.id !== id))

      const supabase = isSupabaseConfigured() ? createClient() : null
      if (supabase) {
        await supabase.from("workspace_form_bindings").delete().eq("workspace_id", activeWorkspace.id).eq("form_id", id)
        await supabase.from("forms").delete().eq("id", id)
      }
    },
    [activeWorkspace, persistForms],
  )

  const setProcessForm = useCallback(
    async (processKey: FormProcessKey, formId: string | null) => {
      if (!activeWorkspace) return

      // Keep the incident column in sync so it never diverges from the active incident binding.
      const previouslyFlagged: string[] = []
      if (processKey === "incident_report") {
        persistForms((prev) =>
          prev.map((form) => {
            if (form.isIncidentForm && form.id !== formId) previouslyFlagged.push(form.id)
            return { ...form, isIncidentForm: form.id === formId }
          }),
        )
      }
      persistBinding(processKey, formId)

      const supabase = isSupabaseConfigured() ? createClient() : null
      if (!supabase) return

      if (formId) {
        await supabase
          .from("workspace_form_bindings")
          .upsert(
            { workspace_id: activeWorkspace.id, process_key: processKey, form_id: formId, is_active: true, updated_at: new Date().toISOString() },
            { onConflict: "workspace_id,process_key" },
          )
      } else {
        await supabase
          .from("workspace_form_bindings")
          .delete()
          .eq("workspace_id", activeWorkspace.id)
          .eq("process_key", processKey)
      }

      if (processKey === "incident_report") {
        if (formId) await supabase.from("forms").update({ is_incident_form: true }).eq("id", formId)
        if (previouslyFlagged.length > 0) {
          await supabase.from("forms").update({ is_incident_form: false }).in("id", previouslyFlagged)
        }
      }
    },
    [activeWorkspace, persistForms, persistBinding],
  )

  const setIncidentForm = useCallback(
    (formId: string | null) => setProcessForm("incident_report", formId),
    [setProcessForm],
  )

  const setFormArchived = useCallback(
    async (id: string, archived: boolean) => {
      // Archiving a form that's the active binding for a process disconnects it.
      if (archived) {
        for (const key of PROCESS_KEYS) {
          if (processForms[key] === id) await setProcessForm(key, null)
        }
      }
      await updateForm(id, { archived })
    },
    [processForms, setProcessForm, updateForm],
  )

  const recordSubmissionInState = useCallback((submission: FormSubmission) => {
    // Only prepend to a list that's already loaded; otherwise it will arrive on lazy load.
    setSubmissionsByForm((prev) =>
      prev[submission.formId] ? { ...prev, [submission.formId]: [submission, ...prev[submission.formId]] } : prev,
    )
    setSubmissionCounts((prev) => ({ ...prev, [submission.formId]: (prev[submission.formId] ?? 0) + 1 }))
  }, [])

  const ensureSubmissionsLoaded = useCallback(
    async (formId: string) => {
      if (!activeWorkspace || loadedFormsRef.current.has(formId)) return

      const supabase = isSupabaseConfigured() ? createClient() : null
      if (!supabase) {
        const list = loadLocalSubmissions(activeWorkspace.id).filter((submission) => submission.formId === formId)
        loadedFormsRef.current.add(formId)
        setSubmissionsByForm((prev) => ({ ...prev, [formId]: list }))
        return
      }

      const { data, error } = await supabase
        .from("form_submissions")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .eq("form_id", formId)
        .order("created_at", { ascending: false })

      if (!error && data) {
        const list = (data as SubmissionRow[]).map(dbToSubmission)
        loadedFormsRef.current.add(formId)
        setSubmissionsByForm((prev) => ({ ...prev, [formId]: list }))
        setSubmissionCounts((prev) => ({ ...prev, [formId]: list.length }))
      }
    },
    [activeWorkspace],
  )

  const ensureAllSubmissionsLoaded = useCallback(async () => {
    if (!activeWorkspace || allSubmissionsLoadedRef.current) return

    const supabase = isSupabaseConfigured() ? createClient() : null
    if (!supabase) {
      const { byForm, counts } = groupSubmissions(loadLocalSubmissions(activeWorkspace.id))
      loadedFormsRef.current = new Set(Object.keys(byForm))
      setSubmissionsByForm(byForm)
      setSubmissionCounts(counts)
      allSubmissionsLoadedRef.current = true
      return
    }

    const { data, error } = await supabase
      .from("form_submissions")
      .select("*")
      .eq("workspace_id", activeWorkspace.id)
      .order("created_at", { ascending: false })

    if (!error && data) {
      const list = (data as SubmissionRow[]).map(dbToSubmission)
      const { byForm, counts } = groupSubmissions(list)
      loadedFormsRef.current = new Set(Object.keys(byForm))
      setSubmissionsByForm(byForm)
      setSubmissionCounts(counts)
      allSubmissionsLoadedRef.current = true
    }
  }, [activeWorkspace])

  const getAllSubmissions = useCallback(
    () => Object.values(submissionsByForm).flat(),
    [submissionsByForm],
  )

  const addSubmission = useCallback(
    async (
      formId: string,
      input: { answers: Record<string, unknown>; submittedByName?: string; submittedByStaffId?: string | null },
    ): Promise<FormSubmission | null> => {
      if (!activeWorkspace) return null
      const now = new Date().toISOString()
      const local: FormSubmission = {
        id: crypto.randomUUID(),
        formId,
        workspaceId: activeWorkspace.id,
        answers: input.answers,
        submittedByStaffId: input.submittedByStaffId ?? null,
        submittedByName: input.submittedByName ?? currentUserName,
        createdAt: now,
        updatedAt: now,
      }

      const supabase = isSupabaseConfigured() ? createClient() : null
      if (!supabase) {
        persistLocalSubmission(local)
        recordSubmissionInState(local)
        return local
      }

      const { data, error } = await supabase
        .from("form_submissions")
        .insert({
          form_id: formId,
          workspace_id: activeWorkspace.id,
          answers: input.answers,
          submitted_by_staff_id: input.submittedByStaffId ?? null,
          submitted_by_name: input.submittedByName ?? currentUserName,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single()

      const saved = error || !data ? local : dbToSubmission(data as SubmissionRow)
      recordSubmissionInState(saved)
      return saved
    },
    [activeWorkspace, currentUserName, persistLocalSubmission, recordSubmissionInState],
  )

  const getForm = useCallback((id: string) => forms.find((form) => form.id === id), [forms])

  const getProcessFormId = useCallback(
    (processKey: FormProcessKey) => processForms[processKey] ?? null,
    [processForms],
  )

  const getFormProcessKey = useCallback(
    (formId: string): FormProcessKey | null => {
      for (const key of PROCESS_KEYS) {
        if (processForms[key] === formId) return key
      }
      return null
    },
    [processForms],
  )

  const incidentFormId = processForms.incident_report ?? null

  const getSubmissionsForForm = useCallback(
    (formId: string) => submissionsByForm[formId] ?? [],
    [submissionsByForm],
  )

  const getSubmissionCount = useCallback((formId: string) => submissionCounts[formId] ?? 0, [submissionCounts])

  return (
    <FormsContext.Provider
      value={{
        forms,
        incidentFormId,
        processForms,
        isLoading,
        fetchError,
        getForm,
        getProcessFormId,
        getFormProcessKey,
        getSubmissionsForForm,
        getSubmissionCount,
        getAllSubmissions,
        ensureSubmissionsLoaded,
        ensureAllSubmissionsLoaded,
        createForm,
        createFormFromTemplate,
        updateForm,
        setFormArchived,
        duplicateForm,
        deleteForm,
        setProcessForm,
        setIncidentForm,
        addSubmission,
        refetch: fetchForms,
      }}
    >
      {children}
    </FormsContext.Provider>
  )
}

export function useFormsContext() {
  const ctx = useContext(FormsContext)
  if (!ctx) throw new Error("useFormsContext must be used within FormsProvider")
  return ctx
}
