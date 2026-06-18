"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { Attachment, Incident, IncidentInvestigationStatus } from "@/lib/types"

export interface IncidentInput {
  completedByStaffId: string | null
  completedByName: string
  reportedByStaffId: string | null
  reportedByName: string
  clientIds: string[]
  clientNames: string
  workerIds: string[]
  workerNames: string
  incidentDate: string
  incidentStartTime: string
  incidentEndTime: string
  location: string
  otherParties: string
  category: string
  incidentStatus: Incident["incidentStatus"]
  isReportable: boolean
  ndisReportableCategory: string | null
  description: string
  witnessDetails: string
  impactDetails: string
  actionsTaken: string
  emergencyServicesContacted: "no" | "yes"
  organisationNotified: boolean
  attachments?: Attachment[]
}

export interface IncidentInvestigationInput {
  investigationStatus: IncidentInvestigationStatus
  investigatedByStaffId: string | null
  investigatedByName: string
  investigationSummary: string
  investigationRootCause: string
  investigationCorrectiveActions: string
  investigationPreventativeActions: string
  investigationCompletedAt: string | null
}

interface IncidentRow {
  id: string
  workspace_id: string
  completed_by_staff_id: string | null
  completed_by_name: string
  reported_by_staff_id: string | null
  reported_by_name: string
  client_ids: string[] | null
  client_names: string
  worker_ids: string[] | null
  worker_names: string
  incident_date: string
  incident_start_time: string
  incident_end_time: string
  location: string
  other_parties: string
  category: string
  incident_status: Incident["incidentStatus"]
  is_reportable: boolean
  ndis_reportable_category: string | null
  description: string
  witness_details: string
  impact_details: string
  actions_taken: string
  emergency_services_contacted: "no" | "yes"
  organisation_notified: boolean
  attachments: Attachment[] | null
  created_by: string | null
  created_by_name: string
  created_at: string
  updated_at: string
  investigation_status: IncidentInvestigationStatus
  investigated_by_staff_id: string | null
  investigated_by_name: string
  investigation_summary: string
  investigation_root_cause: string
  investigation_corrective_actions: string
  investigation_preventative_actions: string
  investigation_completed_at: string | null
}

function storageKey(workspaceId: string | undefined) {
  return workspaceId ? `workspace-incidents-${workspaceId}` : "workspace-incidents"
}

function dbToIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    completedByStaffId: row.completed_by_staff_id,
    completedByName: row.completed_by_name || "",
    reportedByStaffId: row.reported_by_staff_id,
    reportedByName: row.reported_by_name || "",
    clientIds: Array.isArray(row.client_ids) ? row.client_ids : [],
    clientNames: row.client_names || "",
    workerIds: Array.isArray(row.worker_ids) ? row.worker_ids : [],
    workerNames: row.worker_names || "",
    incidentDate: row.incident_date || "",
    incidentStartTime: row.incident_start_time || "",
    incidentEndTime: row.incident_end_time || "",
    location: row.location || "",
    otherParties: row.other_parties || "",
    category: row.category || "",
    incidentStatus: row.incident_status || "confirmed",
    isReportable: row.is_reportable ?? false,
    ndisReportableCategory: row.ndis_reportable_category,
    description: row.description || "",
    witnessDetails: row.witness_details || "",
    impactDetails: row.impact_details || "",
    actionsTaken: row.actions_taken || "",
    emergencyServicesContacted: row.emergency_services_contacted || "no",
    organisationNotified: row.organisation_notified ?? false,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdBy: row.created_by,
    createdByName: row.created_by_name || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    investigationStatus: row.investigation_status || "not_started",
    investigatedByStaffId: row.investigated_by_staff_id,
    investigatedByName: row.investigated_by_name || "",
    investigationSummary: row.investigation_summary || "",
    investigationRootCause: row.investigation_root_cause || "",
    investigationCorrectiveActions: row.investigation_corrective_actions || "",
    investigationPreventativeActions: row.investigation_preventative_actions || "",
    investigationCompletedAt: row.investigation_completed_at,
  }
}

function incidentToDb(input: IncidentInput, workspaceId: string, extras: Partial<Record<string, unknown>> = {}) {
  return {
    workspace_id: workspaceId,
    completed_by_staff_id: input.completedByStaffId,
    completed_by_name: input.completedByName,
    reported_by_staff_id: input.reportedByStaffId,
    reported_by_name: input.reportedByName,
    client_ids: input.clientIds,
    client_names: input.clientNames,
    worker_ids: input.workerIds,
    worker_names: input.workerNames,
    incident_date: input.incidentDate,
    incident_start_time: input.incidentStartTime,
    incident_end_time: input.incidentEndTime,
    location: input.location.trim(),
    other_parties: input.otherParties.trim(),
    category: input.category,
    incident_status: input.incidentStatus,
    is_reportable: input.isReportable,
    ndis_reportable_category: input.ndisReportableCategory,
    description: input.description.trim(),
    witness_details: input.witnessDetails.trim(),
    impact_details: input.impactDetails.trim(),
    actions_taken: input.actionsTaken.trim(),
    emergency_services_contacted: input.emergencyServicesContacted,
    organisation_notified: input.organisationNotified,
    attachments: input.attachments ?? [],
    updated_at: new Date().toISOString(),
    ...extras,
  }
}

function investigationToDb(input: IncidentInvestigationInput) {
  return {
    investigation_status: input.investigationStatus,
    investigated_by_staff_id: input.investigatedByStaffId,
    investigated_by_name: input.investigatedByName.trim(),
    investigation_summary: input.investigationSummary.trim(),
    investigation_root_cause: input.investigationRootCause.trim(),
    investigation_corrective_actions: input.investigationCorrectiveActions.trim(),
    investigation_preventative_actions: input.investigationPreventativeActions.trim(),
    investigation_completed_at: input.investigationCompletedAt,
    updated_at: new Date().toISOString(),
  }
}

function loadLocalIncidents(workspaceId: string | undefined): Incident[] {
  if (typeof window === "undefined" || !workspaceId) return []
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Incident[]
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeIncident)
  } catch {
    return []
  }
}

function normalizeIncident(incident: Incident): Incident {
  return {
    ...incident,
    investigationStatus: incident.investigationStatus ?? "not_started",
    investigatedByStaffId: incident.investigatedByStaffId ?? null,
    investigatedByName: incident.investigatedByName ?? "",
    investigationSummary: incident.investigationSummary ?? "",
    investigationRootCause: incident.investigationRootCause ?? "",
    investigationCorrectiveActions: incident.investigationCorrectiveActions ?? "",
    investigationPreventativeActions: incident.investigationPreventativeActions ?? "",
    investigationCompletedAt: incident.investigationCompletedAt ?? null,
  }
}

function saveLocalIncidents(workspaceId: string | undefined, incidents: Incident[]) {
  if (typeof window === "undefined" || !workspaceId) return
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(incidents))
}

interface IncidentsContextValue {
  incidents: Incident[]
  isLoading: boolean
  fetchError: string | null
  addIncident: (input: IncidentInput, createdByName: string, createdBy?: string | null) => Promise<Incident | null>
  updateIncidentInvestigation: (id: string, input: IncidentInvestigationInput) => Promise<Incident | null>
  deleteIncident: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

const IncidentsContext = createContext<IncidentsContextValue | null>(null)

export function IncidentsProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace } = useWorkspace()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const persistLocal = useCallback((updater: Incident[] | ((prev: Incident[]) => Incident[])) => {
    setIncidents((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater
      saveLocalIncidents(activeWorkspace?.id, next)
      return next
    })
  }, [activeWorkspace?.id])

  const fetchIncidents = useCallback(async () => {
    if (!activeWorkspace) {
      setIncidents([])
      setIsLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setIncidents(loadLocalIncidents(activeWorkspace.id))
      setFetchError(null)
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    if (!supabase) {
      setIncidents(loadLocalIncidents(activeWorkspace.id))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setFetchError(null)

    try {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("incident_date", { ascending: false })
        .order("created_at", { ascending: false })

      if (error || !data) {
        setFetchError(error?.message || "Failed to load incidents")
        setIncidents(loadLocalIncidents(activeWorkspace.id))
      } else {
        setIncidents((data as IncidentRow[]).map(dbToIncident))
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load incidents")
      setIncidents(loadLocalIncidents(activeWorkspace.id))
    }

    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => {
    fetchIncidents()
  }, [fetchIncidents])

  const addIncident = useCallback(async (
    input: IncidentInput,
    createdByName: string,
    createdBy: string | null = null,
  ): Promise<Incident | null> => {
    if (!activeWorkspace) return null

    const now = new Date().toISOString()
    const localIncident: Incident = {
      id: crypto.randomUUID(),
      workspaceId: activeWorkspace.id,
      completedByStaffId: input.completedByStaffId,
      completedByName: input.completedByName,
      reportedByStaffId: input.reportedByStaffId,
      reportedByName: input.reportedByName,
      clientIds: input.clientIds,
      clientNames: input.clientNames,
      workerIds: input.workerIds,
      workerNames: input.workerNames,
      incidentDate: input.incidentDate,
      incidentStartTime: input.incidentStartTime,
      incidentEndTime: input.incidentEndTime,
      location: input.location.trim(),
      otherParties: input.otherParties.trim(),
      category: input.category,
      incidentStatus: input.incidentStatus,
      isReportable: input.isReportable,
      ndisReportableCategory: input.ndisReportableCategory,
      description: input.description.trim(),
      witnessDetails: input.witnessDetails.trim(),
      impactDetails: input.impactDetails.trim(),
      actionsTaken: input.actionsTaken.trim(),
      emergencyServicesContacted: input.emergencyServicesContacted,
      organisationNotified: input.organisationNotified,
      attachments: input.attachments ?? [],
      createdBy,
      createdByName,
      createdAt: now,
      updatedAt: now,
      investigationStatus: "not_started",
      investigatedByStaffId: null,
      investigatedByName: "",
      investigationSummary: "",
      investigationRootCause: "",
      investigationCorrectiveActions: "",
      investigationPreventativeActions: "",
      investigationCompletedAt: null,
    }

    if (!isSupabaseConfigured()) {
      persistLocal((prev) => [localIncident, ...prev])
      return localIncident
    }

    const supabase = createClient()
    if (!supabase) {
      persistLocal((prev) => [localIncident, ...prev])
      return localIncident
    }

    const { data, error } = await supabase
      .from("incidents")
      .insert(incidentToDb(input, activeWorkspace.id, {
        created_by: createdBy,
        created_by_name: createdByName,
        created_at: now,
      }))
      .select("*")
      .single()

    if (error || !data) {
      persistLocal((prev) => [localIncident, ...prev])
      return localIncident
    }

    const saved = dbToIncident(data as IncidentRow)
    setIncidents((prev) => [saved, ...prev.filter((item) => item.id !== localIncident.id)])
    return saved
  }, [activeWorkspace, persistLocal])

  const updateIncidentInvestigation = useCallback(async (
    id: string,
    input: IncidentInvestigationInput,
  ): Promise<Incident | null> => {
    if (!activeWorkspace) return null

    const now = new Date().toISOString()
    const applyUpdate = (item: Incident): Incident => ({
      ...item,
      investigationStatus: input.investigationStatus,
      investigatedByStaffId: input.investigatedByStaffId,
      investigatedByName: input.investigatedByName.trim(),
      investigationSummary: input.investigationSummary.trim(),
      investigationRootCause: input.investigationRootCause.trim(),
      investigationCorrectiveActions: input.investigationCorrectiveActions.trim(),
      investigationPreventativeActions: input.investigationPreventativeActions.trim(),
      investigationCompletedAt: input.investigationCompletedAt,
      updatedAt: now,
    })

    if (isSupabaseConfigured()) {
      const supabase = createClient()
      if (!supabase) return null

      const { data, error } = await supabase
        .from("incidents")
        .update(investigationToDb(input))
        .eq("id", id)
        .eq("workspace_id", activeWorkspace.id)
        .select("*")
        .single()

      if (error || !data) return null

      const saved = dbToIncident(data as IncidentRow)
      persistLocal((prev) => prev.map((item) => (item.id === id ? saved : item)))
      setIncidents((prev) => prev.map((item) => (item.id === id ? saved : item)))
      return saved
    }

    let saved: Incident | null = null
    persistLocal((prev) => prev.map((item) => {
      if (item.id !== id) return item
      saved = applyUpdate(item)
      return saved
    }))
    if (saved) setIncidents((prev) => prev.map((item) => (item.id === id ? saved! : item)))
    return saved
  }, [activeWorkspace, persistLocal])

  const deleteIncident = useCallback(async (id: string) => {
    if (!activeWorkspace) return

    if (isSupabaseConfigured()) {
      const supabase = createClient()
      if (!supabase) return

      const { error } = await supabase
        .from("incidents")
        .delete()
        .eq("id", id)
        .eq("workspace_id", activeWorkspace.id)

      if (error) return
    }

    persistLocal((prev) => prev.filter((item) => item.id !== id))
    setIncidents((prev) => prev.filter((item) => item.id !== id))
  }, [activeWorkspace, persistLocal])

  return (
    <IncidentsContext.Provider value={{ incidents, isLoading, fetchError, addIncident, updateIncidentInvestigation, deleteIncident, refetch: fetchIncidents }}>
      {children}
    </IncidentsContext.Provider>
  )
}

export function useIncidentsContext() {
  const context = useContext(IncidentsContext)
  if (!context) throw new Error("useIncidentsContext must be used within IncidentsProvider")
  return context
}
