"use client"

import { CheckSquare } from "lucide-react"
import type { Task } from "@/lib/types"
import { formatTaskDate } from "./client-profile-helpers"
import { EmptyState } from "@/components/empty-state"
import { SectionToolbar } from "@/components/section-toolbar"

export function ProfileTasksTab({
  tasks,
  chargeCode,
  onToggleComplete,
  onCreateTask,
}: {
  tasks: Task[]
  chargeCode: (itemNumber: string) => string
  onToggleComplete: (task: Task) => void
  onCreateTask?: () => void
}) {
  const gridTemplate = "90px 1fr 40px 64px 56px 40px"

  return (
    <div className="flex h-full flex-col">
      <SectionToolbar onAddNew={onCreateTask} />
      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Tasks assigned to this participant will appear here."
          className="flex-1"
        />
      ) : (
      <div className="flex-1 overflow-y-auto bg-[#fafafa]">
        {tasks.map((task) => {
          const dateStr = formatTaskDate(task.dueDate)
          const isDone = task.status === "done"
          const assigneeInitials = task.assignee ? task.assignee.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : ""

          return (
            <div
              key={task.id}
              className="grid items-center border-b border-[#f0f0f0] px-[24px] transition-colors hover:bg-[#fafafa]"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div className="py-[12px] text-[13px] text-[#888]">
                {dateStr || <span className="text-[#ccc]">—</span>}
              </div>
              <div className="truncate py-[12px] pl-[8px]">
                <span className={`text-[13px] ${isDone ? "text-[#bbb] line-through" : "text-[#262626]"}`}>
                  {task.title || <span className="text-[#ccc]">Untitled task</span>}
                </span>
              </div>
              <div className="flex items-center justify-center py-[12px]">
                {assigneeInitials ? (
                  <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[#f0f0f0] text-[10px] font-bold text-[#555]">{assigneeInitials}</span>
                ) : <span className="text-[12px] text-[#ccc]">—</span>}
              </div>
              <div className="flex items-center justify-center py-[12px] text-[12px] font-medium text-[#888]">
                <span className="truncate text-center">
                  {task.chargeType ? chargeCode(task.chargeType) : <span className="text-[#ccc]">—</span>}
                </span>
              </div>
              <div className="flex items-center justify-center py-[12px] text-[13px] text-[#888]">
                {task.timeSpent > 0 ? task.timeSpent : <span className="text-[#ccc]">—</span>}
              </div>
              <div className="flex items-center justify-center">
                <button
                  onClick={() => onToggleComplete(task)}
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded border-[1.5px] transition-colors ${
                    isDone
                      ? "border-[#2563EB] bg-[#2563EB] text-white hover:border-[#1d4ed8] hover:bg-[#1d4ed8]"
                      : "border-[#ccc] hover:border-[#999]"
                  }`}
                  tabIndex={0}
                  aria-label={isDone ? "Mark as incomplete" : "Mark as complete"}
                >
                  {isDone && <span className="text-[9px]">✓</span>}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
