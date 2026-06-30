"use client"

import { useCallback, useMemo } from "react"
import { useTasks } from "@/lib/tasks-context"
import { useTimesheets } from "@/lib/timesheets-context"
import { useClients } from "@/lib/hooks/use-clients"
import { useCharges } from "@/lib/hooks/use-charges"
import { useRosterContext } from "@/lib/roster-context"
import { useBillableEntries } from "@/lib/billable-entries/use-billable-entries"
import { buildBillableInputsFromShiftTimesheet } from "@/lib/roster/compliance"
import { getRosterSettings } from "@/lib/roster/settings"
import type { BillableEntryInput, BillableEntryUnit } from "@/lib/billable-entries/types"
import type { Task } from "@/lib/types"

/** The kinds of delivered work that pass through the quality gate. */
export type ApprovalKind = "task" | "timesheet" | "travel" | "note"

export interface ApprovalItem {
  /** Stable composite id, e.g. "task:<id>" or "travel:<timesheetId>:<claimId>". */
  id: string
  kind: ApprovalKind
  title: string
  person: string
  clientName: string
  date: string
  /** Time being claimed (e.g. "3.5 hr") or distance ("12 km"). */
  quantityLabel: string
  detail: string
  taskId?: string
  timesheetId?: string
  claimId?: string
  shiftId?: string
}

const GST_DEFAULT = "P2"

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatHours(minutes: number): string {
  const hours = Number((minutes / 60).toFixed(2))
  if (hours <= 0) return "—"
  return `${hours} hr`
}

export interface UseApprovalsResult {
  items: ApprovalItem[]
  counts: { all: number; task: number; timesheet: number; travel: number; note: number }
  isLoading: boolean
  fetchError: string | null
  approve: (item: ApprovalItem) => Promise<void>
  reject: (item: ApprovalItem, note?: string) => Promise<void>
}

/**
 * Unified billing-approval queue. Aggregates completed-but-unapproved billable
 * tasks, submitted timesheets, and submitted participant-travel claims into one
 * inbox. Approving a task or travel claim creates the corresponding billable
 * entries; approving a timesheet flips it to "approved" so the Create invoices
 * funnel picks it up. Rejecting returns the item to the submitter.
 */
export function useApprovals(): UseApprovalsResult {
  const { tasks, updateTask, isLoading: tasksLoading, fetchError: tasksError } = useTasks()
  const {
    timesheets,
    reviewTravelClaims,
    setStatus,
    setTravelClaimStatus,
    isLoading: timesheetsLoading,
    fetchError: timesheetsError,
  } = useTimesheets()
  const { clients } = useClients()
  const { enabledCharges, chargeItems } = useCharges()
  const { shifts, updateShiftProgressNote } = useRosterContext()
  const { syncEntries } = useBillableEntries()

  const clientName = useCallback(
    (id: string) => clients.find((c) => c.id === id)?.displayName ?? clients.find((c) => c.id === id)?.name ?? "Unknown",
    [clients],
  )

  const kmCharge = useMemo(() => enabledCharges.find((charge) => charge.unit === "km") ?? null, [enabledCharges])

  const gstFor = useCallback(
    (itemNumber: string) => chargeItems.find((ci) => ci.itemNumber === itemNumber)?.gstCode || GST_DEFAULT,
    [chargeItems],
  )

  // ----- Task lines (mirrors the client billable-entries sync) -----
  const buildTaskLine = useCallback(
    (task: Task, chargeItemNumber: string, minutes: number, serviceDate: string): BillableEntryInput | null => {
      const charge = enabledCharges.find((c) => c.itemNumber === chargeItemNumber)
      if (!charge) return null
      const unit = (charge.unit as BillableEntryUnit) || "hour"
      const quantity = unit === "hour" ? Number((minutes / 60).toFixed(2)) : 1
      return {
        clientId: task.clientId,
        clientName: task.client,
        source: "task",
        sourceId: task.id,
        serviceDate,
        chargeItemNumber,
        chargeName: charge.shortName || charge.name,
        unit,
        quantity,
        rate: charge.price,
        gstCode: gstFor(chargeItemNumber),
        description: charge.shortName || charge.name,
      }
    },
    [enabledCharges, gstFor],
  )

  const taskInputs = useCallback(
    (task: Task): BillableEntryInput[] => {
      const serviceDate = task.dueDate || todayIso()
      const lines: Array<BillableEntryInput | null> = []
      if (task.chargeType && task.timeSpent > 0) lines.push(buildTaskLine(task, task.chargeType, task.timeSpent, serviceDate))
      if (task.secondaryChargeType && (task.secondaryTimeSpent || 0) > 0)
        lines.push(buildTaskLine(task, task.secondaryChargeType, task.secondaryTimeSpent || 0, serviceDate))
      return lines.filter((l): l is BillableEntryInput => l !== null)
    },
    [buildTaskLine],
  )

  // ----- Pending items -----
  const items = useMemo<ApprovalItem[]>(() => {
    const result: ApprovalItem[] = []

    // Completed tasks with a charge, awaiting the billing decision.
    for (const task of tasks) {
      if (task.status !== "done") continue
      if ((task.billingApproval ?? "none") !== "none") continue
      if (!task.chargeType && !task.secondaryChargeType) continue
      const charge = enabledCharges.find((c) => c.itemNumber === task.chargeType)
      result.push({
        id: `task:${task.id}`,
        kind: "task",
        title: task.title || "Task",
        person: task.assignee || "Unassigned",
        clientName: task.client || "—",
        date: task.dueDate || "",
        quantityLabel: formatHours((task.timeSpent || 0) + (task.secondaryTimeSpent || 0)),
        detail: charge?.shortName || charge?.name || "Billable task",
        taskId: task.id,
      })
    }

    // Submitted timesheets awaiting review.
    const shiftById = new Map(shifts.map((s) => [s.id, s]))
    for (const ts of timesheets) {
      if (ts.status !== "sent") continue
      const shift = ts.shiftId ? shiftById.get(ts.shiftId) : undefined
      let participant = "—"
      if (shift) {
        const client = clients.find((c) => c.id === shift.clientId)
        participant = client?.displayName || client?.name || "—"
      }
      result.push({
        id: `timesheet:${ts.id}`,
        kind: "timesheet",
        title: "Delivered shift",
        person: ts.submittedByName || "—",
        clientName: participant,
        date: ts.startDate,
        quantityLabel: formatHours(ts.workedMinutes),
        detail: "Delivered shift",
        timesheetId: ts.id,
      })
    }

    // Submitted participant-travel claims awaiting review.
    for (const entry of reviewTravelClaims) {
      if (entry.claim.status !== "sent") continue
      const participants = entry.claim.clientIds.map(clientName).filter(Boolean)
      result.push({
        id: `travel:${entry.key}`,
        kind: "travel",
        title: `${entry.claim.startLocation || "—"} → ${entry.claim.endLocation || "—"}`,
        person: entry.submittedByName || "—",
        clientName: participants.length ? participants.join(", ") : "—",
        date: entry.date,
        quantityLabel: entry.claim.distanceKm > 0 ? `${entry.claim.distanceKm} km` : "—",
        detail: entry.claim.purpose || "Participant travel",
        timesheetId: entry.timesheetId,
        claimId: entry.claim.id,
      })
    }

    // Recorded shift progress notes awaiting review.
    for (const shift of shifts) {
      const note = shift.progressNote
      if (!note) continue
      if ((note.approvalStatus ?? "none") !== "none") continue
      const summary = note.supportProvided || note.goalProgress || note.observations || "Progress note"
      result.push({
        id: `note:${shift.id}`,
        kind: "note",
        title: summary.length > 80 ? `${summary.slice(0, 80)}…` : summary,
        person: note.authorName || shift.staffName || "—",
        clientName: shift.clientName || "—",
        date: shift.date,
        quantityLabel: "—",
        detail: "Progress note",
        shiftId: shift.id,
      })
    }

    return result.sort((a, b) => b.date.localeCompare(a.date))
  }, [tasks, timesheets, reviewTravelClaims, shifts, clients, enabledCharges, kmCharge, clientName])

  const counts = useMemo(
    () => ({
      all: items.length,
      task: items.filter((i) => i.kind === "task").length,
      timesheet: items.filter((i) => i.kind === "timesheet").length,
      travel: items.filter((i) => i.kind === "travel").length,
      note: items.filter((i) => i.kind === "note").length,
    }),
    [items],
  )

  const approve = useCallback(
    async (item: ApprovalItem) => {
      if (item.kind === "task") {
        const task = tasks.find((t) => t.id === item.taskId)
        if (!task) return
        await updateTask(task.id, { billingApproval: "approved" })
        const inputs = taskInputs(task)
        if (inputs.length > 0) await syncEntries(inputs)
        return
      }

      if (item.kind === "timesheet") {
        if (!item.timesheetId) return
        const timesheet = timesheets.find((t) => t.id === item.timesheetId)
        await setStatus(item.timesheetId, "approved")
        const compliance = getRosterSettings().compliance
        if (compliance.syncBillablesOnTimesheetApproval && timesheet?.shiftId) {
          const shift = shifts.find((s) => s.id === timesheet.shiftId)
          if (shift) {
            const inputs = buildBillableInputsFromShiftTimesheet(
              timesheet,
              shift,
              enabledCharges,
              chargeItems,
              { billAllChargeTypes: compliance.billAllChargeTypes },
            )
            if (inputs.length > 0) await syncEntries(inputs)
          }
        }
        return
      }

      if (item.kind === "note") {
        if (!item.shiftId) return
        const shift = shifts.find((s) => s.id === item.shiftId)
        if (!shift?.progressNote) return
        await updateShiftProgressNote(item.shiftId, { ...shift.progressNote, approvalStatus: "approved" })
        return
      }

      // travel
      if (!item.timesheetId || !item.claimId) return
      await setTravelClaimStatus(item.timesheetId, item.claimId, "approved")
      const entry = reviewTravelClaims.find((e) => e.timesheetId === item.timesheetId && e.claim.id === item.claimId)
      if (!entry || !kmCharge || entry.claim.clientIds.length === 0) return
      const perClientKm = Number((entry.claim.distanceKm / entry.claim.clientIds.length).toFixed(2))
      if (perClientKm <= 0) return
      const inputs: BillableEntryInput[] = entry.claim.clientIds.map((clientId) => ({
        clientId,
        clientName: clientName(clientId),
        staffId: entry.staffId,
        staffName: entry.submittedByName,
        source: "travel",
        sourceId: `${entry.claim.id}:${clientId}`,
        serviceDate: entry.date,
        chargeItemNumber: kmCharge.itemNumber,
        chargeName: kmCharge.shortName || kmCharge.name,
        unit: "km",
        quantity: perClientKm,
        rate: kmCharge.price,
        gstCode: gstFor(kmCharge.itemNumber),
        description: `Travel with participant: ${entry.claim.startLocation || "—"} → ${entry.claim.endLocation || "—"}`,
      }))
      await syncEntries(inputs)
    },
    [tasks, updateTask, taskInputs, syncEntries, setStatus, setTravelClaimStatus, reviewTravelClaims, kmCharge, clientName, gstFor, shifts, updateShiftProgressNote, timesheets, enabledCharges, chargeItems],
  )

  const reject = useCallback(
    async (item: ApprovalItem, note?: string) => {
      if (item.kind === "task") {
        if (!item.taskId) return
        await updateTask(item.taskId, { billingApproval: "rejected" })
        return
      }
      if (item.kind === "timesheet") {
        if (!item.timesheetId) return
        await setStatus(item.timesheetId, "returned", note)
        return
      }
      if (item.kind === "note") {
        if (!item.shiftId) return
        const shift = shifts.find((s) => s.id === item.shiftId)
        if (!shift?.progressNote) return
        await updateShiftProgressNote(item.shiftId, { ...shift.progressNote, approvalStatus: "rejected" })
        return
      }
      if (!item.timesheetId || !item.claimId) return
      await setTravelClaimStatus(item.timesheetId, item.claimId, "returned", note)
    },
    [updateTask, setStatus, setTravelClaimStatus, shifts, updateShiftProgressNote],
  )

  return {
    items,
    counts,
    isLoading: tasksLoading || timesheetsLoading,
    fetchError: tasksError || timesheetsError,
    approve,
    reject,
  }
}
