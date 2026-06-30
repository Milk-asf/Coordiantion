"use client"

import { useMemo } from "react"
import { useClients } from "@/lib/hooks/use-clients"
import { useIncidents } from "@/lib/hooks/use-incidents"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useInvoices } from "@/lib/hooks/use-invoices"
import { useReimbursements } from "@/lib/hooks/use-reimbursements"
import { useTimesheets } from "@/lib/timesheets-context"
import { useRosterContext } from "@/lib/roster-context"
import { useStaff } from "@/lib/hooks/use-staff"
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

  const data = useMemo<AnalyticsSourceData>(
    () => ({ shifts, incidents, tasks, timesheets, invoices, reimbursements, clients, staff }),
    [shifts, incidents, tasks, timesheets, invoices, reimbursements, clients, staff],
  )

  return { data, isLoading: invoicesLoading || reimbursementsLoading }
}
