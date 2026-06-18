"use client"

import { useMemo, useState } from "react"
import { Loader2, Users } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/empty-state"
import { EntityIcon } from "@/components/entity-icon"
import { SectionToolbar } from "@/components/section-toolbar"
import { SuitabilityStatusSelect } from "@/components/suitability-status-select"
import { useClients } from "@/lib/hooks/use-clients"
import { useStaff } from "@/lib/hooks/use-staff"
import { useSuitability } from "@/lib/hooks/use-suitability"
import type { SuitabilityStatus } from "@/lib/suitability/types"
import {
  TABLE_FULL,
  TABLE_PANEL_CELL,
  TABLE_PANEL_CELL_LAST,
  TABLE_PANEL_HEADER_STICKY,
  TABLE_PANEL_HEADER_STICKY_LAST,
  TABLE_PANEL_TEXT,
} from "@/lib/table-styles"


interface SuitabilityTabProps {
  view: "client" | "staff"
  entityId: string
}

interface SuitabilityRow {
  id: string
  name: string
  iconText: string
  href: string
}

export function SuitabilityTab({ view, entityId }: SuitabilityTabProps) {
  const { staff } = useStaff()
  const { clients } = useClients()
  const { getStatus, setStatus, isLoading } = useSuitability()
  const [searchQuery, setSearchQuery] = useState("")

  const rows = useMemo<SuitabilityRow[]>(() => {
    if (view === "client") {
      return staff
        .filter((member) => member.status === "active" || member.status === "invited")
        .map((member) => ({
          id: member.id,
          name: member.name,
          iconText: member.iconText,
          href: `/staff/${member.id}?tab=suitability`,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    return clients
      .filter((client) => client.status === "active")
      .map((client) => ({
        id: client.id,
        name: client.displayName,
        iconText: client.iconText,
        href: `/clients/${client.id}?tab=suitability`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [clients, staff, view])

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => row.name.toLowerCase().includes(query))
  }, [rows, searchQuery])

  const counterpartLabel = view === "client" ? "Staff member" : "Client"
  const emptyTitle = view === "client" ? "No staff to show" : "No clients to show"
  const emptyDescription =
    view === "client"
      ? "Add active staff members to manage suitability for this participant."
      : "Add active clients to manage suitability for this staff member."

  const handleStatusChange = async (counterpartId: string, status: SuitabilityStatus) => {
    if (view === "client") {
      await setStatus(counterpartId, entityId, status)
      return
    }

    await setStatus(entityId, counterpartId, status)
  }

  const getRowStatus = (counterpartId: string) => {
    if (view === "client") return getStatus(counterpartId, entityId)
    return getStatus(entityId, counterpartId)
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-[10px]">
        <Loader2 className="h-[24px] w-[24px] animate-spin text-folk-secondary" strokeWidth={1.75} />
        <p className="text-[13px] text-folk-secondary">Loading suitability…</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-folk-border bg-folk-nav px-[16px]">
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={`Search ${counterpartLabel.toLowerCase()}…`}
          className="h-[32px] w-full max-w-[280px] rounded-none border border-folk-border bg-folk-surface px-[10px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#bbb]"
        />
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={emptyTitle}
          description={emptyDescription}
          className="flex-1"
        />
      ) : (
        <div className="flex-1 overflow-auto">
          <table className={TABLE_FULL}>
            <thead>
              <tr>
                <th className={TABLE_PANEL_HEADER_STICKY}>
                  {counterpartLabel}
                </th>
                <th className={TABLE_PANEL_HEADER_STICKY_LAST}>
                  Suitability
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-folk-page">
                  <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>
                    <Link
                      href={row.href}
                      className="flex items-center gap-[8px] transition-colors hover:text-[var(--primary-color)]"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <EntityIcon text={row.iconText} size="sm" />
                      <span className="truncate">{row.name}</span>
                    </Link>
                  </td>
                  <td className={TABLE_PANEL_CELL_LAST}>
                    <SuitabilityStatusSelect
                      value={getRowStatus(row.id)}
                      onChange={(status) => handleStatusChange(row.id, status)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
        <span className="text-[12px] font-medium text-folk-secondary">
          {filteredRows.length} {filteredRows.length === 1 ? "record" : "records"}
        </span>
      </div>
    </div>
  )
}
