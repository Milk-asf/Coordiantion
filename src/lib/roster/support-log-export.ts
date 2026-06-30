import type { Client } from "@/lib/types"
import type { RosterShift } from "@/lib/roster/types"
import { formatShiftTime } from "@/lib/roster/week-utils"

export function buildSupportLogText(shift: RosterShift, client?: Client | null): string {
  const note = shift.progressNote
  const lines: string[] = [
    "NDIS SUPPORT LOG",
    "================",
    "",
    `Participant: ${shift.clientName}`,
    `NDIS number: ${client?.participant.ndisNumber || "—"}`,
    `Service date: ${shift.date}`,
    `Time: ${formatShiftTime(shift.startTime, shift.endTime)}`,
    `Location: ${shift.location || "—"}`,
    `Support worker: ${shift.staffName || "—"}`,
    `Billables: ${shift.chargeTypes.join(", ") || "—"}`,
    `Shift status: ${shift.status}`,
  ]

  if (shift.status === "cancelled") {
    lines.push(`Cancelled by: ${shift.cancelledBy || "—"}`)
    lines.push(`Cancellation reason: ${shift.cancellationReason || "—"}`)
  }

  lines.push("", "PROGRESS NOTE", "-------------")

  if (!note) {
    lines.push("(No progress note recorded)")
  } else {
    lines.push(`Recorded: ${note.recordedAt ? new Date(note.recordedAt).toLocaleString("en-AU") : "—"}`)
    lines.push(`Author: ${note.authorName || "—"}`)
    lines.push("")
    lines.push("Support provided:")
    lines.push(note.supportProvided || "—")
    lines.push("")
    lines.push("Progress toward goals:")
    lines.push(note.goalProgress || "—")
    lines.push("")
    lines.push("Observations:")
    lines.push(note.observations || "—")
    lines.push("")
    lines.push("Concerns:")
    lines.push(note.concerns || "—")
    lines.push("")
    lines.push(`Incident occurred: ${note.incidentOccurred ? "Yes" : "No"}`)
    lines.push("")
    lines.push("Follow-up / handover:")
    lines.push(note.followUp || "—")
    lines.push("")
    lines.push(`Note approval: ${note.approvalStatus ?? "none"}`)
    lines.push(`Signature captured: ${note.signature ? "Yes" : "No"}`)
  }

  lines.push("", `Exported: ${new Date().toLocaleString("en-AU")}`)
  return lines.join("\n")
}

export function downloadSupportLog(shift: RosterShift, client?: Client | null) {
  const text = buildSupportLogText(shift, client)
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `support-log-${shift.clientName.replace(/\s+/g, "-").toLowerCase()}-${shift.date}.txt`
  link.click()
  URL.revokeObjectURL(url)
}
