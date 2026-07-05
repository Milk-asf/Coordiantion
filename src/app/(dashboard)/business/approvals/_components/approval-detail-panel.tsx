"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Pencil,
  Route,
  Undo2,
  User as UserIcon,
  X,
} from "lucide-react"
import { FormModal } from "@/components/form-modal"
import { IconButton } from "@/components/icon-button"
import { EntityIcon } from "@/components/entity-icon"
import { TimesheetFormPanel } from "@/app/(dashboard)/timesheets/_components/timesheet-form-panel"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useClients } from "@/lib/hooks/use-clients"
import { useTasks } from "@/lib/tasks-context"
import { useTimesheets } from "@/lib/timesheets-context"
import { useRosterContext } from "@/lib/roster-context"
import { formatTimeLabel } from "@/lib/roster/week-utils"
import { formatDuration, verifyTimesheet } from "@/lib/timesheets/types"
import type { ShiftProgressNote } from "@/lib/roster/types"
import type { ApprovalItem, ApprovalKind } from "@/lib/approvals/use-approvals"
import { cn } from "@/lib/utils"

const KIND_META: Record<ApprovalKind, { label: string; chip: string }> = {
  task: { label: "Task", chip: "bg-[#ede9fe] text-[#6d28d9]" },
  timesheet: { label: "Timesheet", chip: "bg-[#dbeafe] text-[#1d4ed8]" },
  travel: { label: "Travel", chip: "bg-[#e7f5ec] text-[#1a7f43]" },
  note: { label: "Shift note", chip: "bg-[#fef3c7] text-[#b45309]" },
}

const NOTE_SECTIONS: { key: keyof Pick<ShiftProgressNote, "supportProvided" | "goalProgress" | "observations" | "concerns" | "followUp">; label: string }[] = [
  { key: "supportProvided", label: "Support provided" },
  { key: "goalProgress", label: "Progress toward goals" },
  { key: "observations", label: "Observations" },
  { key: "concerns", label: "Concerns or changes" },
  { key: "followUp", label: "Follow-up / handover" },
]

interface ApprovalDetailPanelProps {
  item: ApprovalItem
  isBusy: boolean
  onClose: () => void
  onApprove: () => void | Promise<void>
  onReturn: (note?: string) => void | Promise<void>
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—"
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_minmax(0,1fr)] items-start gap-[12px]">
      <span className="pt-[1px] text-[12px] font-medium text-folk-secondary">{label}</span>
      <div className="min-w-0 text-[13px] font-medium text-folk-text">{children}</div>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-[8px] block text-[11px] font-semibold uppercase tracking-[0.08em] text-folk-placeholder">
      {children}
    </span>
  )
}

export function ApprovalDetailPanel({ item, isBusy, onClose, onApprove, onReturn }: ApprovalDetailPanelProps) {
  const { clients } = useClients()
  const { canManageTimesheets } = usePermissions()
  const { tasks } = useTasks()
  const { getTimesheet } = useTimesheets()
  const { shifts } = useRosterContext()
  const [isReturning, setIsReturning] = useState(false)
  const [returnNote, setReturnNote] = useState("")
  const [isEditingTimesheet, setIsEditingTimesheet] = useState(false)

  const meta = KIND_META[item.kind]
  const clientName = (id: string) => clients.find((client) => client.id === id)?.displayName ?? "Unknown"

  const timesheet = useMemo(
    () => (item.timesheetId ? getTimesheet(item.timesheetId) ?? null : null),
    [getTimesheet, item.timesheetId],
  )
  const linkedShift = useMemo(
    () => (timesheet?.shiftId ? shifts.find((shift) => shift.id === timesheet.shiftId) ?? null : null),
    [shifts, timesheet],
  )
  const verification = useMemo(
    () =>
      timesheet
        ? verifyTimesheet(
            timesheet,
            linkedShift ? { date: linkedShift.date, startTime: linkedShift.startTime, endTime: linkedShift.endTime } : null,
          )
        : null,
    [timesheet, linkedShift],
  )
  const travelClaim = useMemo(
    () => (timesheet && item.claimId ? timesheet.travelClaims.find((claim) => claim.id === item.claimId) ?? null : null),
    [timesheet, item.claimId],
  )
  const task = useMemo(() => (item.taskId ? tasks.find((t) => t.id === item.taskId) ?? null : null), [tasks, item.taskId])
  const noteShift = useMemo(
    () => (item.kind === "note" && item.shiftId ? shifts.find((shift) => shift.id === item.shiftId) ?? null : null),
    [shifts, item.kind, item.shiftId],
  )

  const handleApprove = async () => {
    await onApprove()
    onClose()
  }

  const handleReturn = async () => {
    await onReturn(returnNote.trim())
    onClose()
  }

  if (isEditingTimesheet && timesheet && canManageTimesheets) {
    return (
      <TimesheetFormPanel
        isOpen
        timesheet={timesheet}
        variant="review"
        onClose={() => setIsEditingTimesheet(false)}
        onSaved={() => setIsEditingTimesheet(false)}
      />
    )
  }

  return (
    <FormModal onClose={onClose} width={440} position="right">
      <div className="flex h-[44px] shrink-0 items-center justify-between gap-[12px] border-b border-folk-border bg-white px-[16px]">
        <div className="flex min-w-0 items-center gap-[8px]">
          <span className={cn("inline-flex shrink-0 items-center rounded-full px-[8px] py-[2px] text-[11px] font-medium", meta.chip)}>
            {meta.label}
          </span>
          <span className="truncate text-[13px] font-semibold text-folk-text">{item.title}</span>
        </div>
        <IconButton
          type="button"
          onClick={onClose}
          tooltip="Close"
          className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
        >
          <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[24px] py-[16px]">
        <div className="space-y-[10px]">
          <DetailRow label="User">
            <span className="flex items-center gap-[6px]">
              <UserIcon className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
              {item.person}
            </span>
          </DetailRow>
          <DetailRow label="Participant">{item.clientName || "—"}</DetailRow>
          <DetailRow label="Date">
            <span className="flex items-center gap-[6px]">
              <CalendarDays className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
              {formatDate(item.date)}
            </span>
          </DetailRow>
          <DetailRow label="Quantity">{item.quantityLabel}</DetailRow>
        </div>

        {/* Timesheet review depth */}
        {item.kind === "timesheet" && timesheet && (
          <>
            <div className="mt-[18px] border-t border-folk-border-subtle pt-[14px]">
              <div className="space-y-[10px]">
                <DetailRow label="Time">
                  <span className="flex items-center gap-[6px]">
                    <Clock className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                    {formatTimeLabel(timesheet.startTime)} – {formatTimeLabel(timesheet.endTime)}
                  </span>
                </DetailRow>
                <DetailRow label="Break">{timesheet.breakMinutes} min</DetailRow>
                <DetailRow label="Time worked">{formatDuration(timesheet.workedMinutes)}</DetailRow>
                <DetailRow label="Shift">
                  {linkedShift ? (
                    <span className="flex min-w-0 items-center gap-[6px]">
                      <EntityIcon text={linkedShift.clientIconText} size="sm" />
                      <span className="truncate">
                        {linkedShift.clientName} · {formatTimeLabel(linkedShift.startTime)}–{formatTimeLabel(linkedShift.endTime)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-folk-tertiary">Not linked</span>
                  )}
                </DetailRow>
              </div>
            </div>

            {verification && (
              <div className="mt-[18px] border-t border-folk-border-subtle pt-[14px]">
                <SectionHeader>Shift verification</SectionHeader>
                {verification.ok ? (
                  <div className="flex items-start gap-[8px] rounded-[8px] border border-emerald-200 bg-emerald-50 px-[12px] py-[10px]">
                    <CheckCircle2 className="mt-[1px] h-[14px] w-[14px] shrink-0 text-emerald-600" strokeWidth={1.75} />
                    <p className="text-[12px] leading-snug text-emerald-800">Matches the rostered shift. Safe to approve.</p>
                  </div>
                ) : (
                  <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-[12px] py-[10px]">
                    <div className="flex items-center gap-[8px]">
                      <AlertTriangle className="h-[14px] w-[14px] shrink-0 text-amber-600" strokeWidth={1.75} />
                      <p className="text-[12px] font-semibold text-amber-900">
                        {verification.issues.length} {verification.issues.length === 1 ? "discrepancy" : "discrepancies"} found
                      </p>
                    </div>
                    <ul className="mt-[6px] list-disc space-y-[2px] pl-[26px]">
                      {verification.issues.map((issue) => (
                        <li key={issue} className="text-[12px] leading-snug text-amber-800">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="mt-[18px] border-t border-folk-border-subtle pt-[14px]">
              <SectionHeader>Travel claims</SectionHeader>
              {timesheet.travelClaims.length === 0 ? (
                <p className="text-[12px] text-folk-tertiary">No travel claims.</p>
              ) : (
                <div className="space-y-[10px]">
                  {timesheet.travelClaims.map((claim, index) => (
                    <div key={claim.id} className="rounded-[8px] border border-folk-border-subtle bg-folk-page p-[12px]">
                      <p className="mb-[6px] text-[12px] font-semibold text-folk-text">Claim {index + 1}</p>
                      <div className="space-y-[4px] text-[12px] text-folk-secondary">
                        {claim.clientIds.length > 0 && <p>{claim.clientIds.map(clientName).join(", ")}</p>}
                        <p className="flex items-center gap-[6px]">
                          <MapPin className="h-[12px] w-[12px] shrink-0" strokeWidth={1.5} />
                          {claim.startLocation || "—"} → {claim.endLocation || "—"}
                        </p>
                        <p>
                          {claim.distanceKm > 0 ? `${claim.distanceKm} km` : "Distance not set"}
                          {claim.purpose ? ` · ${claim.purpose}` : ""}
                        </p>
                        {claim.notes && <p className="text-folk-tertiary">{claim.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {timesheet.notes && (
              <div className="mt-[18px] border-t border-folk-border-subtle pt-[14px]">
                <SectionHeader>Notes</SectionHeader>
                <p className="whitespace-pre-wrap text-[13px] leading-[1.5] text-folk-text">{timesheet.notes}</p>
              </div>
            )}

            <div className="mt-[18px] border-t border-folk-border-subtle pt-[14px]">
              <SectionHeader>Signature</SectionHeader>
              {timesheet.signature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={timesheet.signature}
                  alt="Signature"
                  className="h-[120px] w-full rounded-[8px] border border-folk-border-subtle bg-white object-contain"
                />
              ) : (
                <p className="text-[12px] text-folk-tertiary">No signature provided.</p>
              )}
            </div>
          </>
        )}

        {/* Travel claim review depth */}
        {item.kind === "travel" && travelClaim && (
          <div className="mt-[18px] border-t border-folk-border-subtle pt-[14px]">
            <div className="space-y-[10px]">
              <DetailRow label="Distance">
                <span className="flex items-center gap-[6px]">
                  <Route className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                  {travelClaim.distanceKm > 0 ? `${travelClaim.distanceKm} km` : "Not set"}
                </span>
              </DetailRow>
              <DetailRow label="Route">
                <span className="flex min-w-0 items-center gap-[6px]">
                  <MapPin className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                  <span className="truncate">{travelClaim.startLocation || "—"} → {travelClaim.endLocation || "—"}</span>
                </span>
              </DetailRow>
              {travelClaim.purpose && <DetailRow label="Purpose">{travelClaim.purpose}</DetailRow>}
              {travelClaim.notes && (
                <DetailRow label="Notes">
                  <span className="font-normal text-folk-secondary">{travelClaim.notes}</span>
                </DetailRow>
              )}
            </div>
          </div>
        )}

        {/* Task review depth */}
        {item.kind === "task" && task && (
          <div className="mt-[18px] border-t border-folk-border-subtle pt-[14px]">
            <div className="space-y-[10px]">
              <DetailRow label="Charge">{item.detail}</DetailRow>
              {task.description && (
                <DetailRow label="Description">
                  <span className="whitespace-pre-wrap font-normal text-folk-secondary">{task.description}</span>
                </DetailRow>
              )}
            </div>
          </div>
        )}

        {/* Shift note review depth */}
        {item.kind === "note" && noteShift?.progressNote && (
          <div className="mt-[18px] space-y-[14px] border-t border-folk-border-subtle pt-[14px]">
            {noteShift.progressNote.incidentOccurred && (
              <div className="flex items-center gap-[8px] rounded-[8px] border border-amber-200 bg-amber-50 px-[12px] py-[8px]">
                <AlertTriangle className="h-[13px] w-[13px] shrink-0 text-amber-600" strokeWidth={1.75} />
                <p className="text-[12px] font-medium text-amber-900">Flagged as an incident</p>
              </div>
            )}
            {NOTE_SECTIONS.map((section) => {
              const text = noteShift.progressNote?.[section.key]
              if (!text) return null
              return (
                <div key={section.key}>
                  <SectionHeader>{section.label}</SectionHeader>
                  <p className="whitespace-pre-wrap text-[13px] leading-[1.5] text-folk-text">{text}</p>
                </div>
              )
            })}
            {noteShift.progressNote.signature && (
              <div>
                <SectionHeader>Signature</SectionHeader>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={noteShift.progressNote.signature}
                  alt="Signature"
                  className="h-[100px] w-auto rounded-[8px] border border-folk-border-subtle bg-white"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-folk-border-subtle px-[24px] py-[12px]">
        {isReturning ? (
          <div className="space-y-[10px]">
            <textarea
              value={returnNote}
              onChange={(event) => setReturnNote(event.target.value)}
              placeholder="Reason for returning (optional)"
              className="min-h-[64px] w-full resize-y rounded-[6px] border border-folk-border bg-white px-[12px] py-[8px] text-[13px] font-medium leading-[1.5] text-folk-text outline-none placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
              autoFocus
            />
            <div className="flex items-center justify-end gap-[8px]">
              <button
                type="button"
                onClick={() => setIsReturning(false)}
                disabled={isBusy}
                className="outline-btn folk-pill-btn px-[12px] py-[6px] text-[12px] font-medium disabled:opacity-50"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReturn}
                disabled={isBusy}
                className="folk-pill-btn rounded-full border border-[#fdba74] bg-[#fff7ed] px-[12px] py-[6px] text-[12px] font-medium text-[#c2410c] transition-colors hover:bg-[#ffedd5] disabled:opacity-50"
                tabIndex={0}
              >
                {isBusy ? "Returning…" : "Return"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-[8px]">
            {item.kind === "timesheet" && timesheet && timesheet.status !== "approved" && canManageTimesheets && (
              <button
                type="button"
                onClick={() => setIsEditingTimesheet(true)}
                disabled={isBusy}
                className="folk-pill-btn mr-auto flex items-center gap-[5px] rounded-full border border-folk-border px-[12px] py-[6px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover disabled:opacity-50"
                tabIndex={0}
              >
                <Pencil className="h-[13px] w-[13px]" strokeWidth={1.75} />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (verification && !verification.ok && !returnNote.trim()) {
                  setReturnNote(`Please adjust your timesheet: ${verification.issues.join(" ")}`)
                }
                setIsReturning(true)
              }}
              disabled={isBusy}
              className="folk-pill-btn flex items-center gap-[5px] rounded-full border border-[#fdba74] px-[12px] py-[6px] text-[12px] font-medium text-[#c2410c] transition-colors hover:bg-[#fff7ed] disabled:opacity-50"
              tabIndex={0}
            >
              <Undo2 className="h-[13px] w-[13px]" strokeWidth={1.75} />
              Return
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isBusy}
              className="primary-btn folk-pill-btn px-[14px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
              tabIndex={0}
            >
              {isBusy ? "Approving…" : "Approve"}
            </button>
          </div>
        )}
      </div>
    </FormModal>
  )
}
