"use client"

import { ListFilter, Plus, FileHeart } from "lucide-react"
import type { CarePlan, Document } from "@/lib/types"
import { EmptyState } from "@/components/empty-state"
import { ProfileViewToggle } from "@/components/profile-view-toggle"
import { useProfileViewMode } from "@/lib/hooks/use-profile-view-mode"
import { getDocIcon } from "@/app/(dashboard)/clients/[id]/_components/client-profile-helpers"
import {
  TABLE_FULL,
  TABLE_PANEL_CELL,
  TABLE_PANEL_CELL_LAST,
  TABLE_PANEL_HEADER_STICKY,
  TABLE_PANEL_HEADER_STICKY_LAST,
  TABLE_PANEL_TEXT,
  TABLE_CELL_INNER,
  TABLE_PROFILE_CELL,
  TABLE_PROFILE_CELL_LAST,
  TABLE_TEXT_CELL,
} from "@/lib/table-styles"

interface CareplanTabProps {
  carePlan?: CarePlan | null
  document?: Document | null
  onAddNew: () => void
  onEdit: () => void
}

function formatTableDate(dateStr: string) {
  if (!dateStr) return "—"
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function CareplanTab({ carePlan, document, onAddNew, onEdit }: CareplanTabProps) {
  const hasCarePlan = Boolean(carePlan && document)
  const DocIcon = document?.mimeType ? getDocIcon(document.mimeType) : FileHeart
  const { viewMode, setViewMode } = useProfileViewMode()

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-folk-border bg-white px-[16px]">
        <button
          type="button"
          className="flex items-center gap-[6px] folk-pill-btn border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
          tabIndex={0}
        >
          <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>Filter</span>
        </button>
        <div className="flex shrink-0 items-center gap-[8px]">
          {hasCarePlan && (
            <ProfileViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          )}
          {!hasCarePlan && (
            <button
              type="button"
              onClick={onAddNew}
              className="primary-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
              tabIndex={0}
            >
              <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>Add new</span>
            </button>
          )}
        </div>
      </div>

      {!hasCarePlan ? (
        <EmptyState
          icon={FileHeart}
          title="No care plan yet"
          description="Upload the participant's care plan and record its created and renewal dates."
          action={{ label: "Add care plan", onClick: onAddNew }}
          className="flex-1"
        />
      ) : viewMode === "card" ? (
        <>
          <div className="flex-1 overflow-auto p-[16px]">
            <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <div
                role="button"
                onClick={onEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onEdit()
                  }
                }}
                className="group flex cursor-pointer flex-col rounded-none border border-[#d9d9d9] bg-folk-surface p-[20px] text-left transition-all hover:border-folk-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                tabIndex={0}
              >
                <DocIcon className="h-[20px] w-[20px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                <p className="mt-[12px] truncate text-[13px] font-semibold text-folk-text">
                  {document?.name || "Care plan"}
                </p>
                <div className="mt-[16px] space-y-[8px]">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-folk-secondary">Created date</p>
                    <p className="mt-[2px] text-[13px] font-medium text-folk-text">
                      {formatTableDate(carePlan!.createdDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-folk-secondary">Renewal date</p>
                    <p className="mt-[2px] text-[13px] font-medium text-folk-text">
                      {formatTableDate(carePlan!.renewalDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-folk-secondary">1 care plan</span>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-auto">
            <table className={TABLE_FULL}>
              <thead>
                <tr>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Name</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Created date</th>
                  <th className={TABLE_PANEL_HEADER_STICKY_LAST}>Renewal date</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  onClick={onEdit}
                  className="cursor-pointer transition-colors hover:bg-folk-hover"
                >
                  <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                    <div className={TABLE_CELL_INNER}>
                      <DocIcon className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                      <span className="truncate">{document?.name || "Care plan"}</span>
                    </div>
                  </td>
                  <td className={`${TABLE_PROFILE_CELL} ${TABLE_TEXT_CELL}`}>
                    <div className={TABLE_CELL_INNER}>{formatTableDate(carePlan!.createdDate)}</div>
                  </td>
                  <td className={`${TABLE_PROFILE_CELL_LAST} ${TABLE_TEXT_CELL}`}>
                    <div className={TABLE_CELL_INNER}>{formatTableDate(carePlan!.renewalDate)}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-folk-secondary">1 care plan</span>
          </div>
        </>
      )}
    </div>
  )
}
