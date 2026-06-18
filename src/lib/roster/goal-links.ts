import type { Client, ClientGoal, GoalLinkedShift } from "@/lib/types"
import type { RosterShift, RosterShiftStatus } from "@/lib/roster/types"

export function findAttachedGoalId(client: Client | undefined, shiftId: string): string | null {
  if (!client) return null

  const goal = (client.participant.goals ?? []).find((item) =>
    item.linkedShifts?.some((linkedShift) => linkedShift.shiftId === shiftId)
  )

  return goal?.id ?? null
}

export function buildShiftGoalSnapshot(shift: {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  status: RosterShiftStatus
}): GoalLinkedShift {
  return {
    shiftId: shift.id,
    title: shift.title,
    date: shift.date,
    startTime: shift.startTime,
    endTime: shift.endTime,
    status: shift.status,
    linkedAt: new Date().toISOString(),
  }
}

export function applyShiftGoalLink(
  goals: ClientGoal[],
  shiftId: string,
  goalId: string | null,
  snapshot: GoalLinkedShift
): ClientGoal[] {
  return goals.map((goal) => {
    const without = (goal.linkedShifts ?? []).filter((linkedShift) => linkedShift.shiftId !== shiftId)
    if (goal.id === goalId) {
      return { ...goal, linkedShifts: [...without, snapshot] }
    }
    return { ...goal, linkedShifts: without }
  })
}

export function removeShiftFromGoals(goals: ClientGoal[], shiftId: string): ClientGoal[] {
  return goals.map((goal) => ({
    ...goal,
    linkedShifts: (goal.linkedShifts ?? []).filter((linkedShift) => linkedShift.shiftId !== shiftId),
  }))
}
