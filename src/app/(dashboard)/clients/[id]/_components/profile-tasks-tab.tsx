"use client"

import { Building2, CheckSquare, User } from "lucide-react"
import type { Task } from "@/lib/types"
import { formatTaskDate } from "./client-profile-helpers"
import { EmptyState } from "@/components/empty-state"
import { ProfileTaskListHeader } from "@/components/profile-task-list-header"
import { SectionToolbar } from "@/components/section-toolbar"
import { profileTaskGridClassName, profileTaskGridTemplate } from "@/app/(dashboard)/tasks/_components/task-helpers"
import { EntityIcon } from "@/components/entity-icon"

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
      <div className="flex-1 overflow-y-auto bg-white">
        <ProfileTaskListHeader trailingIcon={User} trailingLabel="Assignee" />
        {tasks.map((task) => {
          const dateStr = formatTaskDate(task.dueDate)
          const isDone = task.status === "done"
          const assigneeInitials = task.assignee ? task.assignee.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : ""

          return (
            <div
              key={task.id}
              className={`${profileTaskGridClassName} transition-colors hover:bg-folk-hover`}
              style={{ gridTemplateColumns: profileTaskGridTemplate }}
            >
              <div className="py-[8px] text-[13px] text-folk-secondary">
                {dateStr || <span className="text-[#ccc]">—</span>}
              </div>
              <div className="min-w-0 truncate py-[8px] pl-[8px]">
                <span className={`text-[13px] ${isDone ? "text-folk-placeholder line-through" : "text-folk-text"}`}>
                  {task.title || <span className="text-[#ccc]">Untitled task</span>}
                </span>
              </div>
              <div className="flex items-center justify-center px-[4px] py-[8px] text-[12px] font-medium text-folk-secondary">
                <span className="truncate text-center">
                  {task.chargeType ? chargeCode(task.chargeType) : <span className="text-[#ccc]">—</span>}
                </span>
              </div>
              <div className="flex items-center justify-center px-[4px] py-[8px] text-[13px] text-folk-secondary">
                {task.timeSpent > 0 ? task.timeSpent : <span className="text-[#ccc]">—</span>}
              </div>
              <div className="flex items-center justify-center py-[8px]">
                {assigneeInitials ? (
                  <EntityIcon text={assigneeInitials} size="sm" />
                ) : <span className="text-[12px] text-[#ccc]">—</span>}
              </div>
              <div className="flex items-center justify-center">
                <button
                  onClick={() => onToggleComplete(task)}
                  className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-folk-text bg-white text-folk-text transition-colors"
                  tabIndex={0}
                  aria-label={isDone ? "Mark as incomplete" : "Mark as complete"}
                >
                  {isDone && <span className="text-[9px] leading-none">✓</span>}
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
