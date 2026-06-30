import { normalizeInvestigationStatus, resolveInvestigationStatusForSave } from "@/lib/incident-definitions"
import type { IncidentInvestigationInput } from "@/lib/hooks/use-incidents"
import type { Attachment, Incident } from "@/lib/types"
import { uploadAttachments, type UploadProgress } from "@/lib/upload-attachments"

export function formatInvestigationFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function incidentToInvestigationInput(incident: Incident): IncidentInvestigationInput {
  return {
    investigationStatus: normalizeInvestigationStatus(incident.investigationStatus),
    investigatedByStaffId: incident.investigatedByStaffId,
    investigatedByName: incident.investigatedByName,
    investigationSummary: incident.investigationSummary,
    investigationRootCause: incident.investigationRootCause,
    investigationCorrectiveActions: incident.investigationCorrectiveActions,
    investigationPreventativeActions: incident.investigationPreventativeActions,
    investigationCompletedAt: incident.investigationCompletedAt,
    investigationWellbeingActions: incident.investigationWellbeingActions,
    investigationRequiredFlag: incident.investigationRequiredFlag,
    investigationIncidentDetails: incident.investigationIncidentDetails || incident.investigationRootCause || "",
    investigationFindings: incident.investigationFindings || incident.investigationSummary || "",
    investigationMitigationActions: incident.investigationMitigationActions || incident.investigationPreventativeActions,
    investigationActionsCompleted: incident.investigationActionsCompleted || incident.investigationCorrectiveActions,
    investigationActionsCompletedAt: incident.investigationActionsCompletedAt,
    participantFeedbackProcess: incident.participantFeedbackProcess,
    participantFeedbackComments: incident.participantFeedbackComments,
    improvementActions: incident.improvementActions,
    staffPerformanceManagementRequired: incident.staffPerformanceManagementRequired,
    improvementActionsImplemented: incident.improvementActionsImplemented,
    incidentResolvedAt: incident.incidentResolvedAt,
    resolvedByStaffId: incident.resolvedByStaffId,
    resolvedByName: incident.resolvedByName,
    investigationAttachments: incident.investigationAttachments ?? [],
  }
}

export function syncLegacyInvestigationFields(input: IncidentInvestigationInput): IncidentInvestigationInput {
  return {
    ...input,
    investigationSummary: input.investigationFindings,
    investigationRootCause: input.investigationIncidentDetails,
    investigationCorrectiveActions: input.investigationActionsCompleted,
    investigationPreventativeActions: input.investigationMitigationActions,
  }
}

export function prepareInvestigationInputForSave(input: IncidentInvestigationInput): IncidentInvestigationInput {
  const investigationStatus = resolveInvestigationStatusForSave(input.investigationStatus)

  return syncLegacyInvestigationFields({
    ...input,
    investigationStatus,
    investigationCompletedAt: investigationStatus === "completed"
      ? input.investigationCompletedAt ?? new Date().toISOString()
      : null,
  })
}

export async function uploadInvestigationAttachments(
  incidentId: string,
  files: File[],
  existing: Attachment[],
  options?: { signal?: AbortSignal; onProgress?: (progress: UploadProgress) => void },
): Promise<Attachment[]> {
  const newAttachments = await uploadAttachments({
    files,
    getStoragePath: (id, file) => `incident-investigation-attachments/${incidentId}/${id}-${file.name}`,
    signal: options?.signal,
    onProgress: options?.onProgress,
  })

  return [...existing, ...newAttachments]
}

export async function removeInvestigationAttachment(attachment: Attachment, remaining: Attachment[]): Promise<Attachment[]> {
  const { createClient, isSupabaseConfigured } = await import("@/lib/supabase/client")
  if (attachment.storagePath && isSupabaseConfigured()) {
    const supabase = createClient()
    if (supabase) await supabase.storage.from("documents").remove([attachment.storagePath])
  }
  return remaining.filter((item) => item.id !== attachment.id)
}
