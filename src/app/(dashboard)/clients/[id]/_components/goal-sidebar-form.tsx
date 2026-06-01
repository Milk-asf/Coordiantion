"use client"

import { useState } from "react"
import { X, ChevronDown, ChevronRight, Trash2, CheckSquare } from "lucide-react"
import type { ClientGoal, GoalType, GoalStatus } from "@/lib/types"
import { goalStatusConfig, goalTypeConfig } from "./goals-tab"

export interface ResolvedGoalTask {
  title: string
  status: "todo" | "in-progress" | "done"
  exists: boolean
}

export interface GoalFormData {
  title: string
  goalType: GoalType
  status: GoalStatus
  achievementStrategies: string
  barriers: string
}

interface GoalSidebarFormProps {
  goal: ClientGoal | null
  onSave: (data: GoalFormData) => void
  onDelete?: (id: string) => void
  onClose: () => void
  onOpenTask?: (taskId: string) => void
  resolveTask?: (taskId: string) => ResolvedGoalTask | null
}

const statusOrder: GoalStatus[] = ["not-started", "in-progress", "achieved", "on-hold"]
const taskStatusLabel: Record<string, string> = { todo: "To do", "in-progress": "In progress", done: "Done" }

export function GoalSidebarForm({ goal, onSave, onDelete, onClose, onOpenTask, resolveTask }: GoalSidebarFormProps) {
  const [title, setTitle] = useState(goal?.title ?? "")
  const [goalType, setGoalType] = useState<GoalType>(goal?.goalType ?? "short-term")
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? "not-started")
  const [achievementStrategies, setAchievementStrategies] = useState(goal?.achievementStrategies ?? "")
  const [barriers, setBarriers] = useState(goal?.barriers ?? "")
  const [isStatusOpen, setIsStatusOpen] = useState(false)

  const isEditing = !!goal
  const linkedTasks = goal?.linkedTasks ?? []

  const handleSave = () => {
    if (!title.trim()) return
    onSave({ title: title.trim(), goalType, status, achievementStrategies: achievementStrategies.trim(), barriers: barriers.trim() })
  }

  const labelCls = "mb-[4px] block text-[12px] font-medium text-[#888]"
  const inputCls = "h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"
  const textareaCls = "min-h-[76px] w-full resize-y rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] py-[8px] text-[13px] font-medium leading-[1.5] text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"

  return (
    <>
      <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
        <h2 className="text-[13px] font-semibold text-[#262626]">{isEditing ? "Edit goal" : "New goal"}</h2>
        <button
          onClick={onClose}
          className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
          tabIndex={0}
          aria-label="Close goal form"
        >
          <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-[14px] px-[24px] py-[14px]">
          <div>
            <label className={labelCls}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Increase independence in daily living"
              className={inputCls}
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>Goal type</label>
            <div className="flex gap-[8px]">
              {(Object.keys(goalTypeConfig) as GoalType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setGoalType(type)}
                  className={`flex h-[36px] flex-1 items-center justify-center rounded-[8px] border text-[13px] font-medium transition-colors ${goalType === type ? "border-[#a3c4f3] bg-[#eef4fd] text-[#2563EB]" : "border-[#e0e0e0] bg-[#fafafa] text-[#666] hover:bg-[#f5f5f5]"}`}
                  tabIndex={0}
                >
                  {goalTypeConfig[type].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Status</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStatusOpen((v) => !v)}
                className="flex h-[36px] w-full items-center justify-between rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium outline-none transition-colors hover:border-[#ccc] focus:border-[#a3c4f3]"
                tabIndex={0}
              >
                <span className={`inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] px-[12px] text-[12px] font-medium ${goalStatusConfig[status].chip}`}>{goalStatusConfig[status].label}</span>
                <ChevronDown className={`h-[14px] w-[14px] text-[#888] transition-transform ${isStatusOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
              </button>
              {isStatusOpen && (
                <>
                  <div className="fixed inset-0 z-[49]" onClick={() => setIsStatusOpen(false)} />
                  <div className="absolute left-0 right-0 top-full z-50 mt-[4px] overflow-hidden rounded-[8px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                    {statusOrder.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setStatus(s); setIsStatusOpen(false) }}
                        className="flex w-full items-center px-[10px] py-[6px] text-left transition-colors hover:bg-[#f5f5f5]"
                        tabIndex={0}
                      >
                        <span className={`inline-flex h-[24px] items-center whitespace-nowrap rounded-[6px] px-[12px] text-[12px] font-medium ${goalStatusConfig[s].chip}`}>{goalStatusConfig[s].label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>Achievement strategies</label>
            <textarea
              placeholder="How will this goal be worked towards?"
              value={achievementStrategies}
              onChange={(e) => setAchievementStrategies(e.target.value)}
              className={textareaCls}
            />
          </div>

          <div>
            <label className={labelCls}>Barriers</label>
            <textarea
              placeholder="What might get in the way of achieving this goal?"
              value={barriers}
              onChange={(e) => setBarriers(e.target.value)}
              className={textareaCls}
            />
          </div>
        </div>

        {isEditing && (
          <div className="border-t border-[#f0f0f0] px-[24px] py-[16px]">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#262626]">Linked tasks</h3>
              <span className="text-[12px] font-medium text-[#bbb]">{linkedTasks.length}</span>
            </div>
            {linkedTasks.length === 0 ? (
              <p className="mt-[8px] text-[12px] text-[#999]">Attach this goal to a task to track the work completed towards it. Linked tasks stay here even after they are archived.</p>
            ) : (
              <div className="mt-[8px] flex flex-col gap-[6px]">
                {linkedTasks.map((lt) => {
                  const live = resolveTask?.(lt.taskId) ?? null
                  const exists = live ? live.exists : true
                  const title = live?.title || lt.title || "Untitled task"
                  const status = live?.status ?? lt.status
                  const canOpen = !!onOpenTask && exists
                  return (
                    <div
                      key={lt.taskId}
                      role={canOpen ? "button" : undefined}
                      tabIndex={canOpen ? 0 : undefined}
                      onClick={canOpen ? () => onOpenTask!(lt.taskId) : undefined}
                      onKeyDown={canOpen ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenTask!(lt.taskId) } } : undefined}
                      className={`group flex items-center justify-between gap-[8px] rounded-[8px] border border-[#f0f0f0] bg-[#fafafa] px-[10px] py-[8px] ${canOpen ? "cursor-pointer transition-colors hover:border-[#dcdcdc] hover:bg-[#f5f5f5]" : ""}`}
                    >
                      <div className="flex min-w-0 items-center gap-[8px]">
                        <CheckSquare className={`h-[14px] w-[14px] shrink-0 ${status === "done" ? "text-green-600" : "text-[#bbb]"}`} strokeWidth={1.5} />
                        <span className="truncate text-[13px] font-medium text-[#262626]">{title}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-[6px]">
                        <span className="text-[11px] font-medium text-[#999]">{exists ? (taskStatusLabel[status] ?? status) : "Archived"}</span>
                        {canOpen && <ChevronRight className="h-[14px] w-[14px] text-[#ccc] transition-colors group-hover:text-[#888]" strokeWidth={1.5} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-[8px] border-t border-[#f0f0f0] px-[24px] py-[12px]">
        {isEditing && onDelete ? (
          <button
            onClick={() => onDelete(goal!.id)}
            className="flex items-center gap-[6px] rounded-[6px] px-[8px] py-[6px] text-[12px] font-medium text-[#c0392b] transition-colors hover:bg-red-50"
            tabIndex={0}
          >
            <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.5} />
            Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-[8px]">
          <button
            onClick={onClose}
            className="rounded-[6px] border border-[#e0e0e0] bg-white px-[12px] py-[6px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="primary-btn rounded-[6px] px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
            tabIndex={0}
          >
            {isEditing ? "Save changes" : "Create goal"}
          </button>
        </div>
      </div>
    </>
  )
}
