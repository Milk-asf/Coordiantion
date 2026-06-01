"use client"

import { ListFilter, Plus, Target } from "lucide-react"
import type { ClientGoal, GoalType, GoalStatus } from "@/lib/types"
import { EmptyState } from "@/components/empty-state"

export const goalTypeConfig: Record<GoalType, { label: string }> = {
  "long-term": { label: "Long term" },
  "short-term": { label: "Short term" },
}

export const goalStatusConfig: Record<GoalStatus, { label: string; chip: string }> = {
  "not-started": { label: "Not started", chip: "bg-[#f0f0f0] text-[#666]" },
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
  const cellBase = "h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px]"
  const textCell = `${cellBase} text-[13px] font-medium text-[#262626]`

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-[#dcdcdc] px-[16px]">
        <button
          className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
          tabIndex={0}
        >
          <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>Filter</span>
        </button>
        <button
          onClick={onAddNew}
          className="primary-btn flex items-center gap-[5px] rounded-[4px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
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
          description="Create a goal to track outcomes and link the tasks that work towards it."
          action={{ label: "Add goal", onClick: onAddNew }}
          className="flex-1"
        />
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Goal</th>
                <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Type</th>
                <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Status</th>
                <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Linked tasks</th>
              </tr>
            </thead>
            <tbody>
              {[...goals].reverse().map((goal) => {
                const status = goalStatusConfig[goal.status] ?? goalStatusConfig["not-started"]
                const type = goalTypeConfig[goal.goalType] ?? goalTypeConfig["short-term"]
                const taskCount = goal.linkedTasks?.length ?? 0
                return (
                  <tr
                    key={goal.id}
                    onClick={() => onEditGoal(goal)}
                    className="cursor-pointer transition-colors hover:bg-[#f5f5f5]"
                  >
                    <td className={`${textCell} max-w-[280px] truncate`}>{goal.title || <span className="text-[#bbb]">Untitled goal</span>}</td>
                    <td className={cellBase}>
                      <span className="inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] bg-[#e8edf2] px-[12px] text-[12px] font-medium text-[#334155]">{type.label}</span>
                    </td>
                    <td className={cellBase}>
                      <span className={`inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] px-[12px] text-[12px] font-medium ${status.chip}`}>{status.label}</span>
                    </td>
                    <td className={textCell}>{taskCount} {taskCount === 1 ? "task" : "tasks"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
        <span className="text-[12px] font-medium text-[#999]">{goals.length} {goals.length === 1 ? "goal" : "goals"}</span>
      </div>
    </div>
  )
}
