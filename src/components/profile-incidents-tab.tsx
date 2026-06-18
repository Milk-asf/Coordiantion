"use client"

import { SectionToolbar } from "@/components/section-toolbar"
import {
  formatIncidentDate,
  getIncidentCategoryLabel,
} from "@/lib/incident-definitions"
import type { Incident } from "@/lib/types"
import {
  TABLE_FULL,
  TABLE_PANEL_CELL,
  TABLE_PANEL_CELL_LAST,
  TABLE_PANEL_HEADER,
  TABLE_PANEL_HEADER_LAST,
  TABLE_PANEL_TEXT,
} from "@/lib/table-styles"
import { cn } from "@/lib/utils"

interface ProfileIncidentsTabProps {
  incidents: Incident[]
  onOpenIncident: (incidentId: string) => void
  onCreateIncident?: () => void
}

export function ProfileIncidentsTab({
  incidents,
  onOpenIncident,
  onCreateIncident,
}: ProfileIncidentsTabProps) {
  return (
    <div className="flex h-full flex-col">
      <SectionToolbar
        onAddNew={onCreateIncident}
        addLabel="Report incident"
        addDisabled={!onCreateIncident}
      />
      <div className="flex-1 overflow-auto">
        <table className={TABLE_FULL}>
          <thead>
            <tr>
              <th className={TABLE_PANEL_HEADER}>Date</th>
              <th className={TABLE_PANEL_HEADER}>Category</th>
              <th className={TABLE_PANEL_HEADER}>Status</th>
              <th className={TABLE_PANEL_HEADER}>Reportable</th>
              <th className={TABLE_PANEL_HEADER_LAST}>Recorded by</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => (
              <tr
                key={incident.id}
                onClick={() => onOpenIncident(incident.id)}
                className="cursor-pointer transition-colors hover:bg-folk-hover"
              >
                <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>{formatIncidentDate(incident.incidentDate)}</td>
                <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>{getIncidentCategoryLabel(incident.category)}</td>
                <td className={TABLE_PANEL_CELL}>
                  <span className="inline-flex h-[22px] items-center rounded-none border border-folk-border px-[8px] text-[11px] font-medium capitalize text-folk-text">
                    {incident.incidentStatus}
                  </span>
                </td>
                <td className={TABLE_PANEL_CELL}>
                  <span className={cn(
                    "inline-flex h-[22px] items-center rounded-none px-[8px] text-[11px] font-medium",
                    incident.isReportable ? "bg-[#fef2f2] text-[#b91c1c]" : "bg-folk-hover text-folk-secondary"
                  )}>
                    {incident.isReportable ? "Yes" : "No"}
                  </span>
                </td>
                <td className={`${TABLE_PANEL_CELL_LAST} ${TABLE_PANEL_TEXT}`}>{incident.completedByName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
