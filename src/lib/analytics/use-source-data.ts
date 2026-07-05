"use client"

import { useEffect, useMemo } from "react"
import { useClients } from "@/lib/hooks/use-clients"
import { useIncidents } from "@/lib/hooks/use-incidents"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useInvoices } from "@/lib/hooks/use-invoices"
import { useReimbursements } from "@/lib/hooks/use-reimbursements"
import { useTimesheets } from "@/lib/timesheets-context"
import { useRosterContext } from "@/lib/roster-context"
import { useStaff } from "@/lib/hooks/use-staff"
import { useDocuments } from "@/lib/hooks/use-documents"
import { useForms } from "@/lib/hooks/use-forms"
import { buildFormSubmissionRecords } from "./form-submissions"
import type { AnalyticsDataSourceKey } from "./definitions"

export type AnalyticsSourceData = Record<AnalyticsDataSourceKey, unknown[]>

/**
 * Pulls live records from every analytics data source. Source hooks already
 * scope to the active workspace, so the builder simply consumes them.
 */
export function useAnalyticsSourceData(): { data: AnalyticsSourceData; isLoading: boolean } {
  const { clients } = useClients()
  const { incidents } = useIncidents()
  const { tasks } = useTasks()
  const { invoices, isLoading: invoicesLoading } = useInvoices()
  const { reimbursements, isLoading: reimbursementsLoading } = useReimbursements()
  const { timesheets } = useTimesheets()
  const { shifts } = useRosterContext()
  const { staff } = useStaff()
  const { documents } = useDocuments()
  const {
    forms,
    getAllSubmissions,
    getFormProcessKey,
    ensureAllSubmissionsLoaded,
    isLoading: formsLoading,
  } = useForms()

  useEffect(() => {
    void ensureAllSubmissionsLoaded()
  }, [ensureAllSubmissionsLoaded])

  const formSubmissions = useMemo(
    () => buildFormSubmissionRecords(forms, getAllSubmissions(), getFormProcessKey),
    [forms, getAllSubmissions, getFormProcessKey],
  )

  const data = useMemo<AnalyticsSourceData>(
    () => ({
      shifts,
      incidents,
      tasks,
      timesheets,
      invoices,
      reimbursements,
      clients,
      staff,
      documents,
      forms,
      formSubmissions,
    }),
    [shifts, incidents, tasks, timesheets, invoices, reimbursements, clients, staff, documents, forms, formSubmissions],
  )

  return { data, isLoading: invoicesLoading || reimbursementsLoading || formsLoading }
}
