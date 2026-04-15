"use client"

import { useMemo } from "react"
import { useTasks } from "./use-tasks"
import { useInvoices } from "./use-invoices"
import { useClients } from "@/lib/clients-context"

export interface AppNotification {
  id: string
  type: "overdue-task" | "task-completed" | "invoice-sent" | "invoice-paid" | "invoice-overdue" | "new-client" | "plan-expiring"
  title: string
  description: string
  timestamp: Date
  read: boolean
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

export function useNotifications() {
  const { tasks } = useTasks()
  const { invoices } = useInvoices()
  const { clients } = useClients()

  const notifications = useMemo(() => {
    const items: AppNotification[] = []
    const now = new Date()
    const todayStr = now.toISOString().split("T")[0]
    const readIds = getReadIds()

    for (const task of tasks) {
      if (task.status !== "done" && task.dueDate && task.dueDate < todayStr) {
        items.push({
          id: `overdue-task-${task.id}`,
          type: "overdue-task",
          title: "Task overdue",
          description: `"${task.title || "Untitled"}" ${task.client ? `for ${task.client}` : ""} was due ${formatRelativeDate(task.dueDate)}`,
          timestamp: new Date(task.dueDate + "T00:00:00"),
          read: readIds.has(`overdue-task-${task.id}`),
        })
      }

      if (task.status === "done") {
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
      if (inv.status === "sent" && inv.sentAt) {
        items.push({
          id: `inv-sent-${inv.id}`,
          type: "invoice-sent",
          title: "Invoice sent",
          description: `${inv.invoiceNumber} for ${inv.clientName} — ${formatCurrency(inv.total)}`,
          timestamp: new Date(inv.sentAt),
          read: readIds.has(`inv-sent-${inv.id}`),
        })
      }
      if (inv.status === "paid" && inv.paidAt) {
        items.push({
          id: `inv-paid-${inv.id}`,
          type: "invoice-paid",
          title: "Invoice paid",
          description: `${inv.invoiceNumber} from ${inv.clientName} — ${formatCurrency(inv.total)}`,
          timestamp: new Date(inv.paidAt),
          read: readIds.has(`inv-paid-${inv.id}`),
        })
      }
      if (inv.status === "overdue") {
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

    for (const client of clients) {
      const planEnd = client.participant?.planEndDate
      if (planEnd) {
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
  }, [tasks, invoices, clients])

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
