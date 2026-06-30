"use client"

import { useMemo } from "react"
import { useTasks } from "./use-tasks"
import { useInvoices } from "./use-invoices"
import { useClients } from "@/lib/clients-context"
import { useTimesheets } from "@/lib/timesheets-context"

export interface AppNotification {
  id: string
  type:
    | "overdue-task"
    | "task-completed"
    | "invoice-sent"
    | "invoice-paid"
    | "invoice-overdue"
    | "new-client"
    | "plan-expiring"
    | "timesheet-returned"
    | "timesheet-approved"
    | "travel-claim-returned"
    | "travel-claim-approved"
  title: string
  description: string
  timestamp: Date
  read: boolean
  href?: string
}

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const stored = localStorage.getItem("coordination:read-notifications")
    if (stored) return new Set(JSON.parse(stored))
  } catch { /* fall through */ }
  return new Set()
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem("coordination:read-notifications", JSON.stringify([...ids]))
}

function getNotifPrefs(): Record<string, { enabled: boolean; inApp: boolean; email: boolean }> {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem("coordination:notification-preferences")
    if (stored) return JSON.parse(stored)
  } catch { /* fall through */ }
  return {}
}

export function useNotifications() {
  const { tasks } = useTasks()
  const { invoices } = useInvoices()
  const { clients } = useClients()
  const { myTimesheets } = useTimesheets()

  const notifications = useMemo(() => {
    const items: AppNotification[] = []
    const now = new Date()
    const todayStr = now.toISOString().split("T")[0]
    const readIds = getReadIds()
    const prefs = getNotifPrefs()

    const isEnabled = (id: string) => {
      const pref = prefs[id]
      return !pref || (pref.enabled && pref.inApp)
    }

    for (const task of tasks) {
      if (task.status !== "done" && task.dueDate && task.dueDate < todayStr && isEnabled("overdue-task")) {
        items.push({
          id: `overdue-task-${task.id}`,
          type: "overdue-task",
          title: "Task overdue",
          description: `"${task.title || "Untitled"}" ${task.client ? `for ${task.client}` : ""} was due ${formatRelativeDate(task.dueDate)}`,
          timestamp: new Date(task.dueDate + "T00:00:00"),
          read: readIds.has(`overdue-task-${task.id}`),
        })
      }

      if (task.status === "done" && isEnabled("task-completed")) {
        items.push({
          id: `task-done-${task.id}`,
          type: "task-completed",
          title: "Task completed",
          description: `"${task.title || "Untitled"}" ${task.client ? `for ${task.client}` : ""} was marked complete`,
          timestamp: new Date(task.dueDate ? task.dueDate + "T00:00:00" : now),
          read: readIds.has(`task-done-${task.id}`),
        })
      }
    }

    for (const inv of invoices) {
      if (inv.status === "sent" && inv.sentAt && isEnabled("invoice-sent")) {
        items.push({
          id: `inv-sent-${inv.id}`,
          type: "invoice-sent",
          title: "Invoice sent",
          description: `${inv.invoiceNumber} for ${inv.clientName} — ${formatCurrency(inv.total)}`,
          timestamp: new Date(inv.sentAt),
          read: readIds.has(`inv-sent-${inv.id}`),
        })
      }
      if (inv.status === "paid" && inv.paidAt && isEnabled("invoice-paid")) {
        items.push({
          id: `inv-paid-${inv.id}`,
          type: "invoice-paid",
          title: "Invoice paid",
          description: `${inv.invoiceNumber} from ${inv.clientName} — ${formatCurrency(inv.total)}`,
          timestamp: new Date(inv.paidAt),
          read: readIds.has(`inv-paid-${inv.id}`),
        })
      }
      if (inv.status === "overdue" && isEnabled("invoice-overdue")) {
        items.push({
          id: `inv-overdue-${inv.id}`,
          type: "invoice-overdue",
          title: "Invoice overdue",
          description: `${inv.invoiceNumber} for ${inv.clientName} was due ${formatRelativeDate(inv.dueDate)}`,
          timestamp: new Date(inv.dueDate + "T00:00:00"),
          read: readIds.has(`inv-overdue-${inv.id}`),
        })
      }
    }

    // Workers see the outcome of their own submitted timesheets: returned ones
    // need adjusting, approved ones are heading to invoicing.
    for (const timesheet of myTimesheets) {
      const stamp = timesheet.reviewedAt || timesheet.updatedAt
      if (timesheet.status === "returned" && isEnabled("timesheet-returned")) {
        items.push({
          id: `timesheet-returned-${timesheet.id}-${stamp}`,
          type: "timesheet-returned",
          title: "Timesheet returned",
          description: timesheet.reviewNote
            ? `Adjust and resubmit: ${timesheet.reviewNote}`
            : "Your timesheet was returned. Adjust and resubmit it.",
          timestamp: new Date(stamp),
          read: readIds.has(`timesheet-returned-${timesheet.id}-${stamp}`),
          href: "/timesheets",
        })
      }
      if (timesheet.status === "approved" && isEnabled("timesheet-approved")) {
        items.push({
          id: `timesheet-approved-${timesheet.id}-${stamp}`,
          type: "timesheet-approved",
          title: "Timesheet approved",
          description: "Your timesheet was approved and sent to invoicing.",
          timestamp: new Date(stamp),
          read: readIds.has(`timesheet-approved-${timesheet.id}-${stamp}`),
          href: "/timesheets",
        })
      }

      if (timesheet.status === "draft") continue
      for (const claim of timesheet.travelClaims) {
        if (claim.status === "returned" && isEnabled("travel-claim-returned")) {
          const claimId = `travel-claim-returned-${timesheet.id}-${claim.id}-${stamp}`
          items.push({
            id: claimId,
            type: "travel-claim-returned",
            title: "Travel claim returned",
            description: claim.reviewNote
              ? `Adjust and resubmit: ${claim.reviewNote}`
              : "A travel claim was returned. Adjust and resubmit it.",
            timestamp: new Date(stamp),
            read: readIds.has(claimId),
            href: "/timesheets",
          })
        }
        if (claim.status === "approved" && isEnabled("travel-claim-approved")) {
          const claimId = `travel-claim-approved-${timesheet.id}-${claim.id}-${stamp}`
          items.push({
            id: claimId,
            type: "travel-claim-approved",
            title: "Travel claim approved",
            description: `Your ${claim.distanceKm > 0 ? `${claim.distanceKm} km ` : ""}travel claim was approved.`,
            timestamp: new Date(stamp),
            read: readIds.has(claimId),
            href: "/timesheets",
          })
        }
      }
    }

    for (const client of clients) {
      const planEnd = client.participant?.planEndDate
      if (planEnd && isEnabled("plan-expiring")) {
        const endDate = new Date(planEnd + "T00:00:00")
        const daysUntil = Math.ceil((endDate.getTime() - now.getTime()) / 86400000)
        if (daysUntil >= 0 && daysUntil <= 30) {
          items.push({
            id: `plan-expiring-${client.id}`,
            type: "plan-expiring",
            title: "Plan expiring soon",
            description: `${client.displayName || client.name}'s NDIS plan ends ${daysUntil === 0 ? "today" : `in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`}`,
            timestamp: endDate,
            read: readIds.has(`plan-expiring-${client.id}`),
          })
        }
      }
    }

    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    return items
  }, [tasks, invoices, clients, myTimesheets])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    const ids = getReadIds()
    ids.add(id)
    saveReadIds(ids)
  }

  const markAllAsRead = () => {
    const ids = getReadIds()
    for (const n of notifications) ids.add(n.id)
    saveReadIds(ids)
  }

  return { notifications, unreadCount, markAsRead, markAllAsRead }
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diffDays = Math.round((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? "" : "s"} ago`
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
