"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTasks } from "@/lib/tasks-context"
import { useClients } from "@/lib/hooks/use-clients"
import { useStaff } from "@/lib/hooks/use-staff"
import { useIncidents } from "@/lib/hooks/use-incidents"
import { useRosterContext } from "@/lib/roster-context"
import { useTimesheets } from "@/lib/timesheets-context"
import { useForms } from "@/lib/hooks/use-forms"
import { useReimbursements } from "@/lib/hooks/use-reimbursements"
import { getRecordId, getSourceField, type ListField } from "@/lib/lists/definitions"
import {
  canUpdateKanbanField,
  getKanbanStageKey,
  parseKanbanStageValue,
} from "@/lib/lists/kanban-utils"
import { appendListReturnParam } from "@/lib/lists/list-return"
import type { Incident, IncidentInvestigationStatus } from "@/lib/types"
import type { IncidentInput } from "@/lib/incidents-context"
import type { Timesheet, TravelClaimStatus } from "@/lib/timesheets/types"

interface TravelClaimListRecord {
  claim: { id: string; status: string }
  timesheet: Timesheet
}

interface BudgetListRecord {
  id: string
  clientId: string
}

interface SpendingPlanListRecord {
  id: string
  clientId: string
}

function incidentToInput(incident: Incident): IncidentInput {
  return {
    completedByStaffId: incident.completedByStaffId,
    completedByName: incident.completedByName,
    reportedByStaffId: incident.reportedByStaffId,
    reportedByName: incident.reportedByName,
    clientIds: incident.clientIds,
    clientNames: incident.clientNames,
    workerIds: incident.workerIds,
    workerNames: incident.workerNames,
    incidentDate: incident.incidentDate,
    incidentStartTime: incident.incidentStartTime,
    incidentEndTime: incident.incidentEndTime,
    location: incident.location,
    otherParties: incident.otherParties,
    category: incident.category,
    incidentStatus: incident.incidentStatus,
    isReportable: incident.isReportable,
    ndisReportableCategory: incident.ndisReportableCategory,
    description: incident.description,
    userActivities: incident.userActivities,
    witnessDetails: incident.witnessDetails,
    impactDetails: incident.impactDetails,
    actionsTaken: incident.actionsTaken,
    emergencyServicesContacted: incident.emergencyServicesContacted,
    organisationNotified: incident.organisationNotified,
    providerAwareAt: incident.providerAwareAt,
    contributingFactors: incident.contributingFactors,
    preventativeMeasures: incident.preventativeMeasures,
    referredToNotifier: incident.referredToNotifier,
    commissionAdvisedAt: incident.commissionAdvisedAt,
    familyCarerGuardianNotified: incident.familyCarerGuardianNotified,
    attachments: incident.attachments,
  }
}

export function useListRecordActions(sourceKey: string, listId?: string) {
  const router = useRouter()
  const { updateTask } = useTasks()
  const { updateClient } = useClients()
  const { updateStaff, staff } = useStaff()
  const { updateIncident, updateIncidentInvestigationStatus, incidents } = useIncidents()
  const { updateShift } = useRosterContext()
  const { setStatus, setTravelClaimStatus } = useTimesheets()
  const { updateForm } = useForms()
  const { updateReimbursementStatus } = useReimbursements()

  const canDragKanban = useCallback(
    (fieldKey: string) => canUpdateKanbanField(sourceKey, fieldKey),
    [sourceKey],
  )

  const openRecord = useCallback(
    (record: unknown, index = 0) => {
      const id = getRecordId(record, index)
      const withReturn = (href: string) => (listId ? appendListReturnParam(href, listId) : href)

      switch (sourceKey) {
        case "clients":
          router.push(withReturn(`/clients/${id}`))
          return
        case "staff":
          router.push(withReturn(`/staff/${id}`))
          return
        case "tasks":
          router.push(withReturn(`/tasks?task=${encodeURIComponent(id)}`))
          return
        case "incidents":
          router.push(withReturn(`/incidents/${id}`))
          return
        case "shifts":
          router.push(withReturn("/roster"))
          return
        case "timesheets":
          router.push(withReturn("/business/timesheets"))
          return
        case "timesheets.travelClaims":
          router.push(withReturn("/business/travel-claims"))
          return
        case "invoices":
          router.push(withReturn("/invoices"))
          return
        case "reimbursements":
          router.push(withReturn("/business/reimbursements"))
          return
        case "documents":
          router.push(withReturn("/documents"))
          return
        case "forms":
          router.push(withReturn(`/forms/${id}`))
          return
        case "budgets": {
          const clientId = (record as BudgetListRecord).clientId
          if (clientId) router.push(withReturn(`/clients/${clientId}`))
          return
        }
        case "spending-plans": {
          const clientId = (record as SpendingPlanListRecord).clientId
          if (clientId) router.push(withReturn(`/clients/${clientId}`))
          return
        }
        default:
          return
      }
    },
    [router, sourceKey, listId],
  )

  const moveRecordToStage = useCallback(
    async (record: unknown, field: ListField, stageKey: string): Promise<boolean> => {
      if (!canUpdateKanbanField(sourceKey, field.key)) return false

      const currentStageKey = getKanbanStageKey(field, record)
      if (currentStageKey === stageKey) return true

      const parsed = parseKanbanStageValue(sourceKey, field.key, field, stageKey)
      const id = getRecordId(record, 0)

      try {
        switch (sourceKey) {
          case "tasks":
            await updateTask(id, { status: parsed as "todo" | "in-progress" | "done" })
            return true

          case "incidents":
            if (field.key === "investigationStatus") {
              await updateIncidentInvestigationStatus(id, parsed as IncidentInvestigationStatus)
              return true
            }
            if (field.key === "incidentStatus") {
              const incident = incidents.find((item) => item.id === id)
              if (!incident) return false
              const saved = await updateIncident(id, {
                ...incidentToInput(incident),
                incidentStatus: parsed as Incident["incidentStatus"],
              })
              return Boolean(saved)
            }
            return false

          case "clients":
            if (field.key === "status") {
              await updateClient(id, { status: parsed as "active" | "archived" })
              return true
            }
            return false

          case "staff": {
            const member = staff.find((s) => s.id === id)
            if (!member) return false
            if (field.key === "status") {
              await updateStaff(id, { status: parsed as typeof member.status })
              return true
            }
            await updateStaff(id, {
              details: { ...member.details, [field.key]: String(parsed) },
            })
            return true
          }

          case "shifts":
            await updateShift(id, { status: parsed as "scheduled" | "completed" | "cancelled" })
            return true

          case "timesheets":
            await setStatus(id, parsed as Timesheet["status"])
            return true

          case "timesheets.travelClaims": {
            const entry = record as TravelClaimListRecord
            await setTravelClaimStatus(
              entry.timesheet.id,
              entry.claim.id,
              parsed as TravelClaimStatus,
            )
            return true
          }

          case "reimbursements":
            await updateReimbursementStatus(id, parsed as "draft" | "sent" | "returned" | "approved")
            return true

          case "forms":
            await updateForm(id, { status: parsed as "draft" | "published" })
            return true

          default:
            return false
        }
      } catch {
        return false
      }
    },
    [
      sourceKey,
      updateTask,
      updateIncident,
      updateIncidentInvestigationStatus,
      incidents,
      updateClient,
      updateStaff,
      staff,
      updateShift,
      setStatus,
      setTravelClaimStatus,
      updateReimbursementStatus,
      updateForm,
    ],
  )

  return {
    canDragKanban,
    openRecord,
    moveRecordToStage,
    getField: (fieldKey: string) => getSourceField(sourceKey, fieldKey),
  }
}
