import type { Client, GoalLinkedShift } from "@/lib/types"
import { applyShiftGoalLink, removeShiftFromGoals } from "@/lib/roster/goal-links"

interface SyncShiftGoalLinkParams {
  clients: Client[]
  targetClientId: string
  previousClientId?: string
  shiftId: string
  goalId: string | null
  snapshot: GoalLinkedShift
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>
}

export async function syncShiftGoalLink({
  clients,
  targetClientId,
  previousClientId,
  shiftId,
  goalId,
  snapshot,
  updateClient,
}: SyncShiftGoalLinkParams) {
  const clientIds = new Set([targetClientId])
  if (previousClientId && previousClientId !== targetClientId) {
    clientIds.add(previousClientId)
  }

  await Promise.all(
    Array.from(clientIds).map(async (clientId) => {
      const client = clients.find((item) => item.id === clientId)
      if (!client) return

      let goals = client.participant.goals ?? []

      if (clientId === previousClientId && previousClientId !== targetClientId) {
        goals = removeShiftFromGoals(goals, shiftId)
      }

      if (clientId === targetClientId) {
        goals = applyShiftGoalLink(goals, shiftId, goalId, snapshot)
      }

      await updateClient(clientId, {
        participant: {
          ...client.participant,
          goals,
        },
      })
    })
  )
}
