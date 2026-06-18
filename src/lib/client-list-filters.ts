import type { Client } from "@/lib/types"

export type ClientCheckUpCategory = "overdue" | "due-soon" | "scheduled" | "none"

export const CLIENT_CHECK_UP_OPTIONS: ClientCheckUpCategory[] = [
  "overdue",
  "due-soon",
  "scheduled",
  "none",
]

export const CLIENT_CHECK_UP_LABELS: Record<ClientCheckUpCategory, string> = {
  overdue: "Overdue",
  "due-soon": "Due within 7 days",
  scheduled: "Scheduled later",
  none: "No check-up",
}

export const CLIENT_FUNDING_LABELS: Record<string, string> = {
  "plan-managed": "Plan managed",
  "ndia-managed": "NDIA managed",
  "self-managed": "Self managed",
}

export const CLIENT_BUDGET_OPTIONS = ["has-budget", "no-budget"] as const

export const CLIENT_BUDGET_LABELS: Record<string, string> = {
  "has-budget": "Has budget",
  "no-budget": "No budget",
}

export function getClientCheckUpCategory(
  nextDate: string | null
): ClientCheckUpCategory {
  if (!nextDate) return "none"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(nextDate + "T00:00:00")
  const daysUntil = Math.ceil((due.getTime() - today.getTime()) / 86400000)
  if (daysUntil < 0) return "overdue"
  if (daysUntil <= 7) return "due-soon"
  return "scheduled"
}

export function getClientBudgetCategory(client: Client): "has-budget" | "no-budget" {
  const budgets = client.participant.budgets ?? []
  return budgets.length > 0 ? "has-budget" : "no-budget"
}

export interface ClientListFilterState extends Record<string, string[]> {
  status: string[]
  coordinator: string[]
  fundingType: string[]
  gender: string[]
  language: string[]
  checkUp: string[]
  budget: string[]
}

export const emptyClientListFilters: ClientListFilterState = {
  status: [],
  coordinator: [],
  fundingType: [],
  gender: [],
  language: [],
  checkUp: [],
  budget: [],
}

export function filterClients(
  clients: Client[],
  filters: ClientListFilterState,
  getNextCheckUp: (clientId: string, clientName: string) => string | null
) {
  return clients.filter((client) => {
    if (filters.status.length > 0) {
      if (!filters.status.includes(client.status)) return false
    } else if (client.status === "archived") {
      return false
    }

    if (filters.coordinator.length > 0 && !filters.coordinator.includes(client.owner)) {
      return false
    }

    const p = client.participant

    if (filters.fundingType.length > 0 && !filters.fundingType.includes(p.fundingType || "")) {
      return false
    }

    if (filters.gender.length > 0 && !filters.gender.includes(p.gender)) {
      return false
    }

    if (filters.language.length > 0 && !filters.language.includes(p.language)) {
      return false
    }

    if (filters.checkUp.length > 0) {
      const category = getClientCheckUpCategory(getNextCheckUp(client.id, client.name))
      if (!filters.checkUp.includes(category)) return false
    }

    if (filters.budget.length > 0) {
      const category = getClientBudgetCategory(client)
      if (!filters.budget.includes(category)) return false
    }

    return true
  })
}
