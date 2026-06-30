"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { getNdisReportableTypeLabel, getNextIncidentNumber, normalizeInvestigationStatus, resolveInvestigationStatusForSave } from "@/lib/incident-definitions"
import { useWorkspace } from "@/lib/workspace-context"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useCurrentStaffId } from "@/lib/hooks/use-current-staff"
import type { Attachment, Incident, IncidentInvestigationStatus } from "@/lib/types"
import {
  getUnviewedIncidentCount,
  hasViewedIncidentsStorage,
  loadViewedIncidentIds,
  saveViewedIncidentIds,
} from "@/lib/viewed-incidents"

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
  userActivities: string
  witnessDetails: string
  impactDetails: string
  actionsTaken: string
  emergencyServicesContacted: "no" | "yes"
  organisationNotified: boolean
  providerAwareAt: string | null
  contributingFactors: string
  preventativeMeasures: string
  referredToNotifier: string
  commissionAdvisedAt: string | null
  familyCarerGuardianNotified: "yes" | "no" | ""
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
  investigationWellbeingActions: string
  investigationRequiredFlag: "yes" | "no" | ""
  investigationIncidentDetails: string
  investigationFindings: string
  investigationMitigationActions: string
  investigationActionsCompleted: string
  investigationActionsCompletedAt: string | null
  participantFeedbackProcess: string
  participantFeedbackComments: string
  improvementActions: string
  staffPerformanceManagementRequired: "yes" | "no" | ""
  improvementActionsImplemented: string
  incidentResolvedAt: string | null
  resolvedByStaffId: string | null
  resolvedByName: string
  investigationAttachments: Attachment[]
  closedByStaffId?: string | null
  closedByName?: string
  closureNotes?: string
  closedAt?: string | null
}

export interface IncidentClosureInput {
  closedByStaffId: string | null
  closedByName: string
  closureNotes: string
}

export interface IncidentCloseContext {
  userId: string | null
  isSuperAdmin: boolean
}

export interface IncidentMutationResult {
  incident: Incident | null
  error: string | null
}

export interface IncidentStatusUpdateResult {
  incident: Incident | null
  error: string | null
}

interface IncidentRow {
  id: string
  incident_number: string
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
  user_activities: string
  witness_details: string
  impact_details: string
  actions_taken: string
  emergency_services_contacted: "no" | "yes"
  organisation_notified: boolean
  provider_aware_at: string | null
  contributing_factors: string
  preventative_measures: string
  referred_to_notifier: string
  commission_advised_at: string | null
  family_carer_guardian_notified: string
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
  investigation_wellbeing_actions: string
  investigation_ndis_reportable_type: string
  investigation_referred_to_notifier: string
  investigation_commission_advised_at: string | null
  investigation_family_carer_notified: string
  investigation_required_flag: string
  investigation_incident_details: string
  investigation_findings: string
  investigation_mitigation_actions: string
  investigation_actions_completed: string
  investigation_actions_completed_at: string | null
  investigation_participant_feedback_process: string
  investigation_participant_feedback_comments: string
  investigation_improvement_actions: string
  investigation_staff_performance_required: string
  investigation_improvement_implemented: string
  investigation_resolved_at: string | null
  investigation_resolved_by_staff_id: string | null
  investigation_resolved_by_name: string
  investigation_attachments: Attachment[] | null
  closed_by_staff_id: string | null
  closed_by_name: string
  closure_notes: string
  closed_at: string | null
}

function storageKey(workspaceId: string | undefined) {
  return workspaceId ? `workspace-incidents-${workspaceId}` : "workspace-incidents"
}

function generateLocalIncidentNumber(incidents: Incident[]): string {
  return getNextIncidentNumber(incidents.map((incident) => incident.incidentNumber))
}

async function resolveIncidentNumber(
  supabase: ReturnType<typeof createClient> | null,
  workspaceId: string,
  incidents: Incident[],
): Promise<string> {
  if (supabase) {
    const { data, error } = await supabase.rpc("next_incident_number", { ws_id: workspaceId })
    if (!error && data) return String(data)
  }

  return generateLocalIncidentNumber(incidents)
}

function dbToIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    incidentNumber: row.incident_number || "",
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
    userActivities: row.user_activities || "",
    witnessDetails: row.witness_details || "",
    impactDetails: row.impact_details || "",
    actionsTaken: row.actions_taken || "",
    emergencyServicesContacted: row.emergency_services_contacted || "no",
    organisationNotified: row.organisation_notified ?? false,
    providerAwareAt: row.provider_aware_at ?? null,
    contributingFactors: row.contributing_factors || "",
    preventativeMeasures: row.preventative_measures || "",
    referredToNotifier: row.referred_to_notifier || row.investigation_referred_to_notifier || "",
    commissionAdvisedAt: row.commission_advised_at ?? row.investigation_commission_advised_at,
    familyCarerGuardianNotified: (row.family_carer_guardian_notified || row.investigation_family_carer_notified || "") as "yes" | "no" | "",
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdBy: row.created_by,
    createdByName: row.created_by_name || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    investigationStatus: normalizeInvestigationStatus(row.investigation_status),
    investigatedByStaffId: row.investigated_by_staff_id,
    investigatedByName: row.investigated_by_name || "",
    investigationSummary: row.investigation_summary || "",
    investigationRootCause: row.investigation_root_cause || "",
    investigationCorrectiveActions: row.investigation_corrective_actions || "",
    investigationPreventativeActions: row.investigation_preventative_actions || "",
    investigationCompletedAt: row.investigation_completed_at,
    investigationWellbeingActions: row.investigation_wellbeing_actions || "",
    ndisReportableIncidentType: row.investigation_ndis_reportable_type || "",
    investigationRequiredFlag: (row.investigation_required_flag as "yes" | "no" | "") || "",
    investigationIncidentDetails: row.investigation_incident_details || row.investigation_root_cause || "",
    investigationFindings: row.investigation_findings || row.investigation_summary || "",
    investigationMitigationActions: row.investigation_mitigation_actions || row.investigation_preventative_actions || "",
    investigationActionsCompleted: row.investigation_actions_completed || row.investigation_corrective_actions || "",
    investigationActionsCompletedAt: row.investigation_actions_completed_at,
    participantFeedbackProcess: row.investigation_participant_feedback_process || "",
    participantFeedbackComments: row.investigation_participant_feedback_comments || "",
    improvementActions: row.investigation_improvement_actions || "",
    staffPerformanceManagementRequired: (row.investigation_staff_performance_required as "yes" | "no" | "") || "",
    improvementActionsImplemented: row.investigation_improvement_implemented || "",
    incidentResolvedAt: row.investigation_resolved_at,
    resolvedByStaffId: row.investigation_resolved_by_staff_id,
    resolvedByName: row.investigation_resolved_by_name || "",
    investigationAttachments: Array.isArray(row.investigation_attachments) ? row.investigation_attachments : [],
    closedByStaffId: row.closed_by_staff_id,
    closedByName: row.closed_by_name || "",
    closureNotes: row.closure_notes || "",
    closedAt: row.closed_at,
  }
}

function incidentReportToDbBase(
  input: IncidentInput,
  workspaceId: string,
  extras: Partial<Record<string, unknown>> = {},
) {
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
    user_activities: input.userActivities.trim(),
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

function incidentReportToDbNdis(
  input: IncidentInput,
  workspaceId: string,
  extras: Partial<Record<string, unknown>> = {},
) {
  return {
    ...incidentReportToDbBase(input, workspaceId, extras),
    provider_aware_at: input.providerAwareAt,
    contributing_factors: input.contributingFactors.trim(),
    preventative_measures: input.preventativeMeasures.trim(),
    referred_to_notifier: input.referredToNotifier.trim(),
    commission_advised_at: input.commissionAdvisedAt,
    family_carer_guardian_notified: input.familyCarerGuardianNotified,
  }
}

function incidentToDb(input: IncidentInput, workspaceId: string, extras: Partial<Record<string, unknown>> = {}) {
  return {
    ...incidentReportToDbNdis(input, workspaceId, extras),
    investigation_referred_to_notifier: input.referredToNotifier.trim(),
    investigation_commission_advised_at: input.commissionAdvisedAt,
    investigation_family_carer_notified: input.familyCarerGuardianNotified,
    investigation_ndis_reportable_type: input.isReportable && input.ndisReportableCategory
      ? getNdisReportableTypeLabel(input.ndisReportableCategory)
      : "",
  }
}

function incidentReportDbPayloads(
  input: IncidentInput,
  workspaceId: string,
  extras: Partial<Record<string, unknown>> = {},
) {
  return [
    incidentToDb(input, workspaceId, extras),
    incidentReportToDbNdis(input, workspaceId, extras),
    incidentReportToDbBase(input, workspaceId, extras),
  ]
}

function investigationToDbLegacy(input: IncidentInvestigationInput) {
  const findings = input.investigationFindings.trim()
  const incidentDetails = input.investigationIncidentDetails.trim()
  const mitigation = input.investigationMitigationActions.trim()
  const actionsCompleted = input.investigationActionsCompleted.trim()
  const investigationStatus = resolveInvestigationStatusForSave(input.investigationStatus)

  return {
    investigation_status: investigationStatus,
    investigated_by_staff_id: input.investigatedByStaffId,
    investigated_by_name: input.investigatedByName.trim(),
    investigation_summary: findings || input.investigationSummary.trim(),
    investigation_root_cause: incidentDetails || input.investigationRootCause.trim(),
    investigation_corrective_actions: actionsCompleted || input.investigationCorrectiveActions.trim(),
    investigation_preventative_actions: mitigation || input.investigationPreventativeActions.trim(),
    investigation_completed_at: investigationStatus === "completed"
      ? input.investigationCompletedAt ?? new Date().toISOString()
      : null,
    updated_at: new Date().toISOString(),
  }
}

function investigationToDb(input: IncidentInvestigationInput) {
  return {
    ...investigationToDbLegacy(input),
    investigation_wellbeing_actions: input.investigationWellbeingActions.trim(),
    investigation_required_flag: input.investigationRequiredFlag,
    investigation_incident_details: input.investigationIncidentDetails.trim(),
    investigation_findings: input.investigationFindings.trim(),
    investigation_mitigation_actions: input.investigationMitigationActions.trim(),
    investigation_actions_completed: input.investigationActionsCompleted.trim(),
    investigation_actions_completed_at: input.investigationActionsCompletedAt,
    investigation_participant_feedback_process: input.participantFeedbackProcess.trim(),
    investigation_participant_feedback_comments: input.participantFeedbackComments.trim(),
    investigation_improvement_actions: input.improvementActions.trim(),
    investigation_staff_performance_required: input.staffPerformanceManagementRequired,
    investigation_improvement_implemented: input.improvementActionsImplemented.trim(),
    investigation_resolved_at: input.incidentResolvedAt,
    investigation_resolved_by_staff_id: input.resolvedByStaffId,
    investigation_resolved_by_name: input.resolvedByName.trim(),
    investigation_attachments: input.investigationAttachments ?? [],
  }
}

function isMissingColumnError(message: string | undefined): boolean {
  if (!message) return false
  const normalized = message.toLowerCase()
  return (
    normalized.includes("does not exist")
    || normalized.includes("42703")
    || normalized.includes("schema cache")
    || normalized.includes("could not find")
  )
}

const INVESTIGATION_MIGRATION_HINT =
  "Investigation saved locally. Run supabase/migrations/029_incident_investigation_bundle.sql in the Supabase SQL editor, then reload the page."

async function runDbWrite<T>(
  attempts: Array<() => PromiseLike<{ data: T | null; error: { message: string } | null }>>,
): Promise<{ data: T | null; error: { message: string } | null }> {
  let lastError: { message: string } | null = null

  for (const attempt of attempts) {
    const { data, error } = await attempt()
    if (!error && data) return { data, error: null }
    lastError = error
    if (!isMissingColumnError(error?.message)) break
  }

  return { data: null, error: lastError }
}

function closureToDb(input: IncidentClosureInput) {
  const now = new Date().toISOString()
  return {
    investigation_status: "closed" as const,
    closed_by_staff_id: input.closedByStaffId,
    closed_by_name: input.closedByName.trim(),
    closure_notes: input.closureNotes.trim(),
    closed_at: now,
    updated_at: now,
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
    incidentNumber: incident.incidentNumber ?? "",
    investigationStatus: normalizeInvestigationStatus(incident.investigationStatus),
    investigatedByStaffId: incident.investigatedByStaffId ?? null,
    investigatedByName: incident.investigatedByName ?? "",
    investigationSummary: incident.investigationSummary ?? "",
    investigationRootCause: incident.investigationRootCause ?? "",
    investigationCorrectiveActions: incident.investigationCorrectiveActions ?? "",
    investigationPreventativeActions: incident.investigationPreventativeActions ?? "",
    investigationCompletedAt: incident.investigationCompletedAt ?? null,
    investigationWellbeingActions: incident.investigationWellbeingActions ?? "",
    providerAwareAt: incident.providerAwareAt ?? null,
    contributingFactors: incident.contributingFactors ?? "",
    preventativeMeasures: incident.preventativeMeasures ?? "",
    referredToNotifier: incident.referredToNotifier ?? "",
    commissionAdvisedAt: incident.commissionAdvisedAt ?? null,
    familyCarerGuardianNotified: incident.familyCarerGuardianNotified ?? "",
    ndisReportableIncidentType: incident.ndisReportableIncidentType ?? "",
    investigationRequiredFlag: incident.investigationRequiredFlag ?? "",
    investigationIncidentDetails: incident.investigationIncidentDetails || incident.investigationRootCause || "",
    investigationFindings: incident.investigationFindings || incident.investigationSummary || "",
    investigationMitigationActions: incident.investigationMitigationActions || incident.investigationPreventativeActions || "",
    investigationActionsCompleted: incident.investigationActionsCompleted || incident.investigationCorrectiveActions || "",
    investigationActionsCompletedAt: incident.investigationActionsCompletedAt ?? null,
    participantFeedbackProcess: incident.participantFeedbackProcess ?? "",
    participantFeedbackComments: incident.participantFeedbackComments ?? "",
    improvementActions: incident.improvementActions ?? "",
    staffPerformanceManagementRequired: incident.staffPerformanceManagementRequired ?? "",
    improvementActionsImplemented: incident.improvementActionsImplemented ?? "",
    incidentResolvedAt: incident.incidentResolvedAt ?? null,
    resolvedByStaffId: incident.resolvedByStaffId ?? null,
    resolvedByName: incident.resolvedByName ?? "",
    investigationAttachments: incident.investigationAttachments ?? [],
    closedByStaffId: incident.closedByStaffId ?? null,
    closedByName: incident.closedByName ?? "",
    closureNotes: incident.closureNotes ?? "",
    closedAt: incident.closedAt ?? null,
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
  unviewedCount: number
  markIncidentViewed: (incidentId: string) => void
  addIncident: (input: IncidentInput, createdByName: string, createdBy?: string | null) => Promise<Incident | null>
  updateIncident: (id: string, input: IncidentInput) => Promise<Incident | null>
  updateIncidentInvestigationStatus: (id: string, status: IncidentInvestigationStatus) => Promise<IncidentStatusUpdateResult>
  updateIncidentInvestigation: (id: string, input: IncidentInvestigationInput) => Promise<IncidentMutationResult>
  closeIncident: (id: string, input: IncidentClosureInput, context: IncidentCloseContext) => Promise<Incident | null>
  deleteIncident: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

const IncidentsContext = createContext<IncidentsContextValue | null>(null)

function isIncidentRelevantToStaff(incident: Incident, staffId: string | null): boolean {
  if (!staffId) return false
  if (incident.reportedByStaffId === staffId) return true
  if (incident.completedByStaffId === staffId) return true
  if (incident.investigatedByStaffId === staffId) return true
  if (incident.resolvedByStaffId === staffId) return true
  if (incident.closedByStaffId === staffId) return true
  return incident.workerIds.includes(staffId)
}

export function IncidentsProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace } = useWorkspace()
  const { isSupportWorker } = usePermissions()
  const currentStaffId = useCurrentStaffId()
  const workspaceId = activeWorkspace?.id
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [viewedIncidentIds, setViewedIncidentIds] = useState<Set<string>>(() => loadViewedIncidentIds(workspaceId))

  useEffect(() => {
    setViewedIncidentIds(loadViewedIncidentIds(workspaceId))
  }, [workspaceId])

  useEffect(() => {
    if (!workspaceId || hasViewedIncidentsStorage(workspaceId) || incidents.length === 0) return

    const initialViewedIds = new Set(incidents.map((incident) => incident.id))
    saveViewedIncidentIds(workspaceId, initialViewedIds)
    setViewedIncidentIds(initialViewedIds)
  }, [workspaceId, incidents])

  // Support workers only see incidents they were involved in (reported,
  // completed, investigated, resolved, closed, or named as an involved worker).
  const visibleIncidents = useMemo(
    () =>
      isSupportWorker
        ? incidents.filter((incident) => isIncidentRelevantToStaff(incident, currentStaffId))
        : incidents,
    [incidents, isSupportWorker, currentStaffId],
  )

  const unviewedCount = useMemo(
    () => getUnviewedIncidentCount(visibleIncidents.map((incident) => incident.id), viewedIncidentIds),
    [visibleIncidents, viewedIncidentIds],
  )

  const markIncidentViewed = useCallback((incidentId: string) => {
    if (!workspaceId) return

    setViewedIncidentIds((current) => {
      if (current.has(incidentId)) return current

      const next = new Set(current)
      next.add(incidentId)
      saveViewedIncidentIds(workspaceId, next)
      return next
    })
  }, [workspaceId])

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
    } finally {
      setIsLoading(false)
    }
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
    const supabase = isSupabaseConfigured() ? createClient() : null
    const incidentNumber = await resolveIncidentNumber(supabase, activeWorkspace.id, incidents)

    const localIncident: Incident = {
      id: crypto.randomUUID(),
      incidentNumber,
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
      userActivities: input.userActivities.trim(),
      witnessDetails: input.witnessDetails.trim(),
      impactDetails: input.impactDetails.trim(),
      actionsTaken: input.actionsTaken.trim(),
      emergencyServicesContacted: input.emergencyServicesContacted,
      organisationNotified: input.organisationNotified,
      providerAwareAt: input.providerAwareAt,
      contributingFactors: input.contributingFactors.trim(),
      preventativeMeasures: input.preventativeMeasures.trim(),
      referredToNotifier: input.referredToNotifier.trim(),
      commissionAdvisedAt: input.commissionAdvisedAt,
      familyCarerGuardianNotified: input.familyCarerGuardianNotified,
      attachments: input.attachments ?? [],
      createdBy,
      createdByName,
      createdAt: now,
      updatedAt: now,
      investigationStatus: "sent",
      investigatedByStaffId: null,
      investigatedByName: "",
      investigationSummary: "",
      investigationRootCause: "",
      investigationCorrectiveActions: "",
      investigationPreventativeActions: "",
      investigationCompletedAt: null,
      investigationWellbeingActions: "",
      ndisReportableIncidentType: "",
      investigationRequiredFlag: "",
      investigationIncidentDetails: "",
      investigationFindings: "",
      investigationMitigationActions: "",
      investigationActionsCompleted: "",
      investigationActionsCompletedAt: null,
      participantFeedbackProcess: "",
      participantFeedbackComments: "",
      improvementActions: "",
      staffPerformanceManagementRequired: "",
      improvementActionsImplemented: "",
      incidentResolvedAt: null,
      resolvedByStaffId: null,
      resolvedByName: "",
      investigationAttachments: [],
      closedByStaffId: null,
      closedByName: "",
      closureNotes: "",
      closedAt: null,
    }

    if (!isSupabaseConfigured()) {
      persistLocal((prev) => [localIncident, ...prev])
      return localIncident
    }

    if (!supabase) {
      persistLocal((prev) => [localIncident, ...prev])
      return localIncident
    }

    const insertExtras = {
      created_by: createdBy,
      created_by_name: createdByName,
      created_at: now,
      incident_number: incidentNumber,
    }

    const { data, error } = await runDbWrite(
      incidentReportDbPayloads(input, activeWorkspace.id, insertExtras).map((payload) => () =>
        supabase
          .from("incidents")
          .insert(payload)
          .select("*")
          .single(),
      ),
    )

    if (error || !data) {
      persistLocal((prev) => [localIncident, ...prev])
      return localIncident
    }

    const saved = dbToIncident(data as IncidentRow)
    setIncidents((prev) => [saved, ...prev.filter((item) => item.id !== localIncident.id)])
    return saved
  }, [activeWorkspace, incidents, persistLocal])

  const updateIncident = useCallback(async (
    id: string,
    input: IncidentInput,
  ): Promise<Incident | null> => {
    if (!activeWorkspace) return null

    const now = new Date().toISOString()
    const applyUpdate = (item: Incident): Incident => ({
      ...item,
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
      userActivities: input.userActivities.trim(),
      witnessDetails: input.witnessDetails.trim(),
      impactDetails: input.impactDetails.trim(),
      actionsTaken: input.actionsTaken.trim(),
      emergencyServicesContacted: input.emergencyServicesContacted,
      organisationNotified: input.organisationNotified,
      providerAwareAt: input.providerAwareAt,
      contributingFactors: input.contributingFactors.trim(),
      preventativeMeasures: input.preventativeMeasures.trim(),
      referredToNotifier: input.referredToNotifier.trim(),
      commissionAdvisedAt: input.commissionAdvisedAt,
      familyCarerGuardianNotified: input.familyCarerGuardianNotified,
      attachments: input.attachments ?? [],
      updatedAt: now,
    })

    if (isSupabaseConfigured()) {
      const supabase = createClient()
      if (!supabase) return null

      const { data, error } = await runDbWrite(
        incidentReportDbPayloads(input, activeWorkspace.id).map((payload) => () =>
          supabase
            .from("incidents")
            .update(payload)
            .eq("id", id)
            .eq("workspace_id", activeWorkspace.id)
            .select("*")
            .single(),
        ),
      )

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

  const updateIncidentInvestigationStatus = useCallback(async (
    id: string,
    status: IncidentInvestigationStatus,
  ): Promise<IncidentStatusUpdateResult> => {
    if (!activeWorkspace) return { incident: null, error: "No active workspace." }

    const normalized = normalizeInvestigationStatus(status)
    if (normalized === "closed") {
      return { incident: null, error: "Open the investigation to complete quality check and archive." }
    }

    const existing = incidents.find((item) => item.id === id)
    if (!existing) return { incident: null, error: "Incident not found." }
    if (existing.investigationStatus === "closed" || existing.investigationStatus === "not_an_incident") {
      return { incident: null, error: "This incident can no longer be moved." }
    }
    if (normalizeInvestigationStatus(existing.investigationStatus) === normalized) {
      return { incident: existing, error: null }
    }

    const now = new Date().toISOString()
    const completedAt = normalized === "completed" ? existing.investigationCompletedAt ?? now : null
    const applyUpdate = (item: Incident): Incident => ({
      ...item,
      investigationStatus: normalized,
      investigationCompletedAt: completedAt,
      updatedAt: now,
    })

    const payload = {
      investigation_status: normalized,
      investigation_completed_at: completedAt,
      updated_at: now,
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient()
      if (!supabase) return { incident: null, error: "Unable to connect to the database." }

      const { data, error } = await supabase
        .from("incidents")
        .update(payload)
        .eq("id", id)
        .eq("workspace_id", activeWorkspace.id)
        .select("*")
        .single()

      if (error && isMissingColumnError(error.message)) {
        let saved: Incident | null = null
        persistLocal((prev) => prev.map((item) => {
          if (item.id !== id) return item
          saved = applyUpdate(item)
          return saved
        }))
        if (saved) setIncidents((prev) => prev.map((item) => (item.id === id ? saved! : item)))
        return { incident: saved, error: INVESTIGATION_MIGRATION_HINT }
      }

      if (error) return { incident: null, error: error.message }
      if (!data) return { incident: null, error: "Failed to update status." }

      const saved = dbToIncident(data as IncidentRow)
      persistLocal((prev) => prev.map((item) => (item.id === id ? saved : item)))
      setIncidents((prev) => prev.map((item) => (item.id === id ? saved : item)))
      return { incident: saved, error: null }
    }

    let saved: Incident | null = null
    persistLocal((prev) => prev.map((item) => {
      if (item.id !== id) return item
      saved = applyUpdate(item)
      return saved
    }))
    if (saved) setIncidents((prev) => prev.map((item) => (item.id === id ? saved! : item)))
    return saved
      ? { incident: saved, error: null }
      : { incident: null, error: "Unable to update status." }
  }, [activeWorkspace, incidents, persistLocal])

  const updateIncidentInvestigation = useCallback(async (
    id: string,
    input: IncidentInvestigationInput,
  ): Promise<IncidentMutationResult> => {
    if (!activeWorkspace) return { incident: null, error: "No active workspace." }
    if (input.investigationStatus === "closed") {
      return { incident: null, error: "Closed incidents cannot be edited." }
    }

    const now = new Date().toISOString()
    const investigationStatus = resolveInvestigationStatusForSave(input.investigationStatus)
    const applyUpdate = (item: Incident): Incident => ({
      ...item,
      investigationStatus,
      investigatedByStaffId: input.investigatedByStaffId,
      investigatedByName: input.investigatedByName.trim(),
      investigationSummary: input.investigationFindings.trim() || input.investigationSummary.trim(),
      investigationRootCause: input.investigationIncidentDetails.trim() || input.investigationRootCause.trim(),
      investigationCorrectiveActions: input.investigationActionsCompleted.trim() || input.investigationCorrectiveActions.trim(),
      investigationPreventativeActions: input.investigationMitigationActions.trim() || input.investigationPreventativeActions.trim(),
      investigationCompletedAt: investigationStatus === "completed"
        ? input.investigationCompletedAt ?? new Date().toISOString()
        : null,
      investigationWellbeingActions: input.investigationWellbeingActions.trim(),
      investigationRequiredFlag: input.investigationRequiredFlag,
      investigationIncidentDetails: input.investigationIncidentDetails.trim(),
      investigationFindings: input.investigationFindings.trim(),
      investigationMitigationActions: input.investigationMitigationActions.trim(),
      investigationActionsCompleted: input.investigationActionsCompleted.trim(),
      investigationActionsCompletedAt: input.investigationActionsCompletedAt,
      participantFeedbackProcess: input.participantFeedbackProcess.trim(),
      participantFeedbackComments: input.participantFeedbackComments.trim(),
      improvementActions: input.improvementActions.trim(),
      staffPerformanceManagementRequired: input.staffPerformanceManagementRequired,
      improvementActionsImplemented: input.improvementActionsImplemented.trim(),
      incidentResolvedAt: input.incidentResolvedAt,
      resolvedByStaffId: input.resolvedByStaffId,
      resolvedByName: input.resolvedByName.trim(),
      investigationAttachments: input.investigationAttachments ?? [],
      updatedAt: now,
    })

    if (isSupabaseConfigured()) {
      const supabase = createClient()
      if (!supabase) return { incident: null, error: "Unable to connect to the database." }

      const existingIncident = incidents.find((item) => item.id === id)
      if (!existingIncident) return { incident: null, error: "Incident not found." }
      if (existingIncident.investigationStatus === "closed" || existingIncident.investigationStatus === "not_an_incident") {
        return { incident: null, error: "This incident can no longer be edited." }
      }

      const runUpdate = (payload: ReturnType<typeof investigationToDb> | ReturnType<typeof investigationToDbLegacy>) => () =>
        supabase
          .from("incidents")
          .update(payload)
          .eq("id", id)
          .eq("workspace_id", activeWorkspace.id)
          .select("*")
          .single()

      const { data, error } = await runDbWrite([
        runUpdate(investigationToDb(input)),
        runUpdate(investigationToDbLegacy(input)),
      ])

      if (error && isMissingColumnError(error.message)) {
        let saved: Incident | null = null
        persistLocal((prev) => prev.map((item) => {
          if (item.id !== id) return item
          saved = applyUpdate(item)
          return saved
        }))
        if (saved) setIncidents((prev) => prev.map((item) => (item.id === id ? saved! : item)))
        return { incident: saved, error: INVESTIGATION_MIGRATION_HINT }
      }

      if (error) return { incident: null, error: error.message }
      if (!data) return { incident: null, error: "Failed to save investigation." }

      const saved = dbToIncident(data as IncidentRow)
      persistLocal((prev) => prev.map((item) => (item.id === id ? saved : item)))
      setIncidents((prev) => prev.map((item) => (item.id === id ? saved : item)))
      return { incident: saved, error: null }
    }

    let saved: Incident | null = null
    persistLocal((prev) => prev.map((item) => {
      if (item.id !== id) return item
      if (item.investigationStatus === "closed") return item
      saved = applyUpdate(item)
      return saved
    }))
    if (saved) setIncidents((prev) => prev.map((item) => (item.id === id ? saved! : item)))
    return saved
      ? { incident: saved, error: null }
      : { incident: null, error: "Unable to save investigation." }
  }, [activeWorkspace, incidents, persistLocal])

  const closeIncident = useCallback(async (
    id: string,
    input: IncidentClosureInput,
    context: IncidentCloseContext,
  ): Promise<Incident | null> => {
    if (!activeWorkspace) return null

    const now = new Date().toISOString()
    const applyClose = (item: Incident): Incident => ({
      ...item,
      investigationStatus: "closed",
      closedByStaffId: input.closedByStaffId,
      closedByName: input.closedByName.trim(),
      closureNotes: input.closureNotes.trim(),
      closedAt: now,
      updatedAt: now,
    })

    const canClose = (item: Incident | undefined) => {
      if (!item) return false
      if (item.investigationStatus === "closed") return false
      return item.investigationStatus === "completed"
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient()
      if (!supabase) return null

      const existingIncident = incidents.find((item) => item.id === id)
      if (!existingIncident || !canClose(existingIncident)) return null

      const { data, error } = await supabase
        .from("incidents")
        .update(closureToDb(input))
        .eq("id", id)
        .eq("workspace_id", activeWorkspace.id)
        .select("*")
        .single()

      if (error && isMissingColumnError(error.message)) {
        let saved: Incident | null = null
        persistLocal((prev) => {
          if (!canClose(prev.find((entry) => entry.id === id))) return prev
          saved = applyClose(prev.find((entry) => entry.id === id)!)
          return prev.map((entry) => (entry.id === id ? saved! : entry))
        })
        if (saved) setIncidents((prev) => prev.map((item) => (item.id === id ? saved! : item)))
        return saved
      }

      if (error || !data) return null

      const saved = dbToIncident(data as IncidentRow)
      persistLocal((prev) => prev.map((item) => (item.id === id ? saved : item)))
      setIncidents((prev) => prev.map((item) => (item.id === id ? saved : item)))
      return saved
    }

    let saved: Incident | null = null
    persistLocal((prev) => {
      const item = prev.find((entry) => entry.id === id)
      if (!canClose(item)) return prev
      saved = applyClose(item!)
      return prev.map((entry) => (entry.id === id ? saved! : entry))
    })
    if (saved) setIncidents((prev) => prev.map((item) => (item.id === id ? saved! : item)))
    return saved
  }, [activeWorkspace, incidents, persistLocal])

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
    <IncidentsContext.Provider value={{ incidents: visibleIncidents, isLoading, fetchError, unviewedCount, markIncidentViewed, addIncident, updateIncident, updateIncidentInvestigationStatus, updateIncidentInvestigation, closeIncident, deleteIncident, refetch: fetchIncidents }}>
      {children}
    </IncidentsContext.Provider>
  )
}

export function useIncidentsContext() {
  const context = useContext(IncidentsContext)
  if (!context) throw new Error("useIncidentsContext must be used within IncidentsProvider")
  return context
}
