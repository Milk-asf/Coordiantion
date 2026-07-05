"use client"

import { AlertTriangle } from "lucide-react"
import type { Incident } from "@/lib/types"
import {
  formatIncidentDate,
  getIncidentCategoryLabel,
} from "@/lib/incident-definitions"
import { IncidentTableStatusChip } from "@/app/(dashboard)/incidents/_components/incident-table-status-chip"
import { OverviewSummarySection } from "@/components/profile-account-details/overview-summary-section"

interface IncidentsOverviewSummaryProps {
  incidents: Incident[]
  limit?: number
  onViewAll?: () => void
  onOpenIncident?: (incidentId: string) => void
}

export function IncidentsOverviewSummary({
  incidents,
  limit = 3,
  onViewAll,
  onOpenIncident,
}: IncidentsOverviewSummaryProps) {
  const sorted = [...incidents].sort((a, b) => b.incidentDate.localeCompare(a.incidentDate))
  const preview = sorted.slice(0, limit)

  return (
    <OverviewSummarySection title="Incidents" itemCount={incidents.length} onViewAll={onViewAll}>
      {incidents.length === 0 ? (
        <p className="text-[13px] text-folk-placeholder">No incidents yet</p>
      ) : (
        <div className="space-y-[10px]">
          {preview.map((incident) => (
            <div
              key={incident.id}
              role={onOpenIncident ? "button" : undefined}
              tabIndex={onOpenIncident ? 0 : undefined}
              onClick={onOpenIncident ? () => onOpenIncident(incident.id) : undefined}
              onKeyDown={onOpenIncident ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onOpenIncident(incident.id)
                }
              } : undefined}
              className={onOpenIncident ? "flex cursor-pointer items-start gap-[10px] rounded-[6px] transition-colors hover:opacity-80" : "flex items-start gap-[10px]"}
            >
              <span className="mt-[1px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[var(--folk-border-subtle)] text-folk-secondary">
                <AlertTriangle className="h-[12px] w-[12px]" strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px]">
                  <p className="truncate text-[13px] leading-[1.5] text-[#555]">
                    <span className="font-semibold text-folk-text">{getIncidentCategoryLabel(incident.category)}</span>
                    {incident.incidentNumber && (
                      <>
                        {" "}
                        <span>{incident.incidentNumber}</span>
                      </>
                    )}
                    <span className="ml-[6px] text-[12px] text-folk-placeholder">· {formatIncidentDate(incident.incidentDate)}</span>
                  </p>
                  <IncidentTableStatusChip incident={incident} />
                </div>
              </div>
            </div>
          ))}
          {incidents.length > limit && (
            <p className="text-[12px] text-folk-placeholder">
              {incidents.length - limit} more {incidents.length - limit === 1 ? "incident" : "incidents"}
            </p>
          )}
        </div>
      )}
    </OverviewSummarySection>
  )
}
