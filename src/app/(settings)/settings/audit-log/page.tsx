"use client"

import { Fragment, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, ScrollText, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/badge"
import { EmptyState } from "@/components/empty-state"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useMembers } from "@/lib/hooks/use-members"
import { useAuditLog, type AuditLogEntry, type AuditLogFilters } from "@/lib/hooks/use-audit-log"

const actionConfig: Record<AuditLogEntry["action"], { label: string; variant: "success" | "info" | "danger" }> = {
  INSERT: { label: "Created", variant: "success" },
  UPDATE: { label: "Updated", variant: "info" },
  DELETE: { label: "Deleted", variant: "danger" },
}

const periodOptions = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: 0 },
]

const selectClass =
  "h-[32px] rounded-[6px] border border-folk-border-subtle bg-folk-page px-[10px] text-[12px] font-medium text-folk-text outline-none transition-colors focus:border-[#bababa]"

function formatTableName(name: string) {
  return name.replace(/_/g, " ")
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function summariseChanges(entry: AuditLogEntry) {
  if (entry.action === "UPDATE") {
    const keys = Object.keys(entry.new_data ?? {})
    if (keys.length === 0) return "—"
    const shown = keys.slice(0, 4).map(formatTableName).join(", ")
    return keys.length > 4 ? `${shown} +${keys.length - 4} more` : shown
  }
  const data = entry.action === "INSERT" ? entry.new_data : entry.old_data
  const keys = Object.keys(data ?? {}).length
  return `${keys} field${keys === 1 ? "" : "s"}`
}

function DataPreview({ label, data }: { label: string; data: Record<string, unknown> | null }) {
  if (!data || Object.keys(data).length === 0) return null
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-[4px] text-[11px] font-semibold uppercase tracking-wide text-folk-secondary">{label}</p>
      <pre className="max-h-[240px] overflow-auto rounded-[6px] border border-folk-border-subtle bg-folk-page p-[10px] text-[11px] leading-[1.5] text-folk-text">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export default function AuditLogSettingsPage() {
  const { canManageWorkspaceSettings, isLoading: permissionsLoading } = usePermissions()
  const { members } = useMembers()
  const [action, setAction] = useState<AuditLogEntry["action"] | "">("")
  const [tableName, setTableName] = useState("")
  const [sinceDays, setSinceDays] = useState(30)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const filters = useMemo<AuditLogFilters>(
    () => ({
      action: action || undefined,
      tableName: tableName || undefined,
      sinceDays: sinceDays || undefined,
    }),
    [action, tableName, sinceDays],
  )

  const { entries, tableNames, isLoading, hasMore, loadMore, error } = useAuditLog(filters)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const actorName = (entry: AuditLogEntry) => {
    if (entry.actor_id) {
      const member = members.find((m) => m.user_id === entry.actor_id)
      if (member?.name) return member.name
    }
    if (entry.actor_email) return entry.actor_email
    if (entry.actor_role === "service_role") return "System"
    return "Unknown"
  }

  if (!permissionsLoading && !canManageWorkspaceSettings) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Admins only"
        description="The audit log is only visible to workspace admins."
      />
    )
  }

  return (
    <>
      <div className="mb-[24px]">
        <h1 className="text-[20px] font-bold text-folk-text">Audit log</h1>
        <p className="mt-[4px] text-[14px] text-folk-secondary">
          Every change to workspace data — who did it, when, and what changed. Records are
          written by the database and cannot be edited or deleted from the app.
        </p>
      </div>

      <div className="mb-[16px] flex flex-wrap items-center gap-[8px]">
        <select
          value={sinceDays}
          onChange={(e) => setSinceDays(Number(e.target.value))}
          className={selectClass}
          aria-label="Filter by period"
        >
          {periodOptions.map((opt) => (
            <option key={opt.label} value={opt.days}>{opt.label}</option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as AuditLogEntry["action"] | "")}
          className={selectClass}
          aria-label="Filter by action"
        >
          <option value="">All actions</option>
          <option value="INSERT">Created</option>
          <option value="UPDATE">Updated</option>
          <option value="DELETE">Deleted</option>
        </select>
        <select
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          className={selectClass}
          aria-label="Filter by record type"
        >
          <option value="">All record types</option>
          {tableNames.map((name) => (
            <option key={name} value={name}>{formatTableName(name)}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mb-[16px] rounded-[6px] bg-red-50 px-[14px] py-[10px] text-[13px] font-medium text-red-600">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="py-[40px] text-center text-[13px] text-folk-secondary">Loading audit log…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit entries"
          description="Changes to workspace data will appear here once the audit log migration is applied."
        />
      ) : (
        <div className="overflow-x-auto border border-folk-border-subtle">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-folk-border-subtle bg-folk-page">
                <th className="w-[24px] px-[8px] py-[8px]" />
                <th className="px-[10px] py-[8px] text-[11px] font-semibold uppercase tracking-wide text-folk-secondary">When</th>
                <th className="px-[10px] py-[8px] text-[11px] font-semibold uppercase tracking-wide text-folk-secondary">Actor</th>
                <th className="px-[10px] py-[8px] text-[11px] font-semibold uppercase tracking-wide text-folk-secondary">Action</th>
                <th className="px-[10px] py-[8px] text-[11px] font-semibold uppercase tracking-wide text-folk-secondary">Record type</th>
                <th className="px-[10px] py-[8px] text-[11px] font-semibold uppercase tracking-wide text-folk-secondary">Changes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isExpanded = expandedId === entry.id
                const config = actionConfig[entry.action]
                return (
                  <Fragment key={entry.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className={cn(
                        "cursor-pointer border-b border-folk-border-subtle transition-colors hover:bg-folk-hover",
                        isExpanded && "bg-folk-hover",
                      )}
                    >
                      <td className="px-[8px] py-[10px] text-folk-secondary">
                        {isExpanded
                          ? <ChevronDown className="h-[13px] w-[13px]" strokeWidth={1.75} />
                          : <ChevronRight className="h-[13px] w-[13px]" strokeWidth={1.75} />}
                      </td>
                      <td className="whitespace-nowrap px-[10px] py-[10px] text-[12px] text-folk-secondary">
                        {formatTimestamp(entry.created_at)}
                      </td>
                      <td className="max-w-[200px] truncate px-[10px] py-[10px] text-[13px] font-medium text-folk-text">
                        {actorName(entry)}
                      </td>
                      <td className="px-[10px] py-[10px]">
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </td>
                      <td className="px-[10px] py-[10px] text-[13px] capitalize text-folk-text">
                        {formatTableName(entry.table_name)}
                      </td>
                      <td className="max-w-[260px] truncate px-[10px] py-[10px] text-[12px] text-folk-secondary">
                        {summariseChanges(entry)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-folk-border-subtle">
                        <td colSpan={6} className="bg-folk-page px-[16px] py-[14px]">
                          <p className="mb-[10px] text-[12px] text-folk-secondary">
                            Record ID: <span className="font-mono text-[11px]">{entry.record_id ?? "—"}</span>
                            {entry.actor_email && (
                              <span className="ml-[16px]">Actor: {entry.actor_email}</span>
                            )}
                          </p>
                          <div className="flex flex-col gap-[12px] md:flex-row">
                            <DataPreview label={entry.action === "UPDATE" ? "Before" : "Deleted record"} data={entry.old_data} />
                            <DataPreview label={entry.action === "UPDATE" ? "After" : "New record"} data={entry.new_data} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && !isLoading && (
        <div className="mt-[16px] text-center">
          <button
            type="button"
            onClick={async () => {
              setIsLoadingMore(true)
              await loadMore()
              setIsLoadingMore(false)
            }}
            disabled={isLoadingMore}
            className="outline-btn h-[34px] px-[16px] text-[13px] font-semibold disabled:opacity-50"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  )
}
