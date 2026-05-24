"use client"

import {
  FileText,
  User,
  Hash,
  CalendarDays,
  Clock,
  CheckSquare,
} from "lucide-react"
import type { Task } from "@/lib/types"
import { formatTaskDate } from "./client-profile-helpers"

export function ProfileTasksTab({
  tasks,
  chargeCode,
  onToggleComplete,
}: {
  tasks: Task[]
  chargeCode: (itemNumber: string) => string
  onToggleComplete: (task: Task) => void
}) {
  const gridTemplate = "90px 1fr 40px 64px 56px 40px"

  if (tasks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-[24px] py-[56px] text-center">
        <div className="rounded-full bg-[#f5f5f5] p-[12px]">
          <CheckSquare className="h-[20px] w-[20px] text-[#999]" strokeWidth={1.5} />
        </div>
        <h3 className="mt-[14px] text-[15px] font-semibold text-[#262626]">No tasks yet</h3>
        <p className="mt-[6px] max-w-[320px] text-[13px] text-[#888]">
          Tasks assigned to this participant will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto bg-[#fafafa]">
        <div className="sticky top-0 z-[1] grid items-center border-b border-[#e0e0e0] bg-[#fafafa] px-[24px]" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="flex items-center py-[9px]"><CalendarDays className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
          <div className="flex items-center py-[9px] pl-[8px]"><FileText className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
          <div className="flex items-center justify-center py-[9px]"><User className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
          <div className="flex items-center justify-center py-[9px]"><Hash className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
          <div className="flex items-center justify-center py-[9px]"><Clock className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
          <div className="flex items-center justify-center py-[9px]"><CheckSquare className="h-[14px] w-[14px] text-[#ccc]" strokeWidth={1.5} /></div>
        </div>

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
                      ? "border-blue-500 bg-blue-500 text-white hover:border-blue-400 hover:bg-blue-400"
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
    </div>
  )
}
