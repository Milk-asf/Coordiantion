"use client"

import { ListFilter, Plus, Target } from "lucide-react"
import type { ClientGoal, GoalType, GoalStatus } from "@/lib/types"
import { getGoalTypeChipClasses } from "@/lib/chip-colors"
import { EmptyState } from "@/components/empty-state"
import {
  TABLE_FULL,
  TABLE_PANEL_CELL,
  TABLE_PANEL_CELL_LAST,
  TABLE_PANEL_HEADER_STICKY,
  TABLE_PANEL_HEADER_STICKY_LAST,
  TABLE_PANEL_TEXT,
} from "@/lib/table-styles"

export const goalTypeConfig: Record<GoalType, { label: string }> = {
  "long-term": { label: "Long term" },
  "short-term": { label: "Short term" },
}

export const goalStatusConfig: Record<GoalStatus, { label: string; chip: string }> = {
  "not-started": { label: "Not started", chip: "bg-[var(--folk-border-subtle)] text-folk-secondary" },
  "in-progress": { label: "In progress", chip: "bg-blue-100 text-blue-700" },
  achieved: { label: "Achieved", chip: "bg-green-100 text-green-700" },
  "on-hold": { label: "On hold", chip: "bg-amber-50 text-amber-600" },
}

interface GoalsTabProps {
  goals: ClientGoal[]
  onAddNew: () => void
  onEditGoal: (goal: ClientGoal) => void
}

export function GoalsTab({ goals, onAddNew, onEditGoal }: GoalsTabProps) {
  return (
    <div className="relative flex h-full flex-col">
      <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-folk-border bg-white px-[16px]">
        <button
          className="flex items-center gap-[6px] folk-pill-btn border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
          tabIndex={0}
        >
          <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>Filter</span>
        </button>
        <button
          onClick={onAddNew}
          className="primary-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
          tabIndex={0}
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>Add new</span>
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Create a goal to track outcomes and link tasks or roster shifts that work towards it."
          action={{ label: "Add goal", onClick: onAddNew }}
          className="flex-1"
        />
      ) : (
        <div className="flex-1 overflow-auto">
          <table className={TABLE_FULL}>
            <thead>
              <tr>
                <th className={TABLE_PANEL_HEADER_STICKY}>Goal</th>
                <th className={TABLE_PANEL_HEADER_STICKY}>Type</th>
                <th className={TABLE_PANEL_HEADER_STICKY}>Status</th>
                <th className={TABLE_PANEL_HEADER_STICKY_LAST}>Linked</th>
              </tr>
            </thead>
            <tbody>
              {[...goals].reverse().map((goal) => {
                const status = goalStatusConfig[goal.status] ?? goalStatusConfig["not-started"]
                const type = goalTypeConfig[goal.goalType] ?? goalTypeConfig["short-term"]
                const taskCount = goal.linkedTasks?.length ?? 0
                const shiftCount = goal.linkedShifts?.length ?? 0
                const linkedLabel = [
                  taskCount > 0 ? `${taskCount} ${taskCount === 1 ? "task" : "tasks"}` : null,
                  shiftCount > 0 ? `${shiftCount} ${shiftCount === 1 ? "shift" : "shifts"}` : null,
                ].filter(Boolean).join(" · ") || "None"
                return (
                  <tr
                    key={goal.id}
                    onClick={() => onEditGoal(goal)}
                    className="cursor-pointer transition-colors hover:bg-folk-hover"
                  >
                    <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT} max-w-[280px] truncate`}>
                      {goal.title || <span className="text-folk-placeholder">Untitled goal</span>}
                    </td>
                    <td className={TABLE_PANEL_CELL}>
                      <span className={getGoalTypeChipClasses(goal.goalType)}>{type.label}</span>
                    </td>
                    <td className={TABLE_PANEL_CELL}>
                      <span className={`inline-flex h-[24px] items-center whitespace-nowrap rounded-none px-[12px] text-[12px] font-medium ${status.chip}`}>{status.label}</span>
                    </td>
                    <td className={`${TABLE_PANEL_CELL_LAST} ${TABLE_PANEL_TEXT}`}>{linkedLabel}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
        <span className="text-[12px] font-medium text-folk-secondary">{goals.length} {goals.length === 1 ? "goal" : "goals"}</span>
      </div>
    </div>
  )
}
