"use client"

import { useClients } from "@/lib/hooks/use-clients"
import { cn } from "@/lib/utils"

export default function ParticipantsSettingsPage() {
  const { clients, updateClient } = useClients()

  const activeClients = clients.filter((c) => c.status !== "archived")
  const archivedClients = clients.filter((c) => c.status === "archived")

  const handleToggle = (id: string, currentStatus: "active" | "archived") => {
    updateClient(id, { status: currentStatus === "active" ? "archived" : "active" })
  }

  return (
    <>
      <div className="mb-[28px]">
        <h1 className="text-[22px] font-semibold text-[#1a1a1a]">Participants</h1>
        <p className="mt-[4px] text-[14px] text-sidebar-muted">
          Manage participant status. Toggle off to archive a participant.
        </p>
      </div>

      <div>
        <table className="w-full rounded-lg bg-[#fafafa] text-left">
          <thead>
            <tr className="border-b border-sidebar-border">
              <th className="w-[70%] pb-[10px] text-left text-[12px] font-medium text-sidebar-muted">Name</th>
              <th className="w-[15%] pb-[10px] text-left text-[12px] font-medium text-sidebar-muted">Status</th>
              <th className="w-[15%] pb-[10px] text-left text-[12px] font-medium text-sidebar-muted">Active</th>
            </tr>
          </thead>
          <tbody>
            {activeClients.map((client) => (
              <ParticipantRow
                key={client.id}
                name={client.displayName}
                initials={client.iconText}
                coordinator={client.owner}
                isActive
                onToggle={() => handleToggle(client.id, "active")}
              />
            ))}

            {archivedClients.length > 0 && (
              <>
                <tr>
                  <td colSpan={3} className="border-b border-sidebar-border pb-[8px] pt-[20px]">
                    <span className="text-[11px] font-medium tracking-wide text-[#999]">ARCHIVED</span>
                  </td>
                </tr>
                {archivedClients.map((client) => (
                  <ParticipantRow
                    key={client.id}
                    name={client.displayName}
                    initials={client.iconText}
                    coordinator={client.owner}
                    isActive={false}
                    onToggle={() => handleToggle(client.id, "archived")}
                    isDisabledRow
                  />
                ))}
              </>
            )}

            {clients.length === 0 && (
              <tr>
                <td colSpan={3} className="px-[20px] py-[32px] text-center text-[13px] font-medium text-[#bbb]">
                  No participants
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ParticipantRow({
  name,
  initials,
  coordinator,
  isActive,
  onToggle,
  isDisabledRow,
}: {
  name: string
  initials: string
  coordinator: string
  isActive: boolean
  onToggle: () => void
  isDisabledRow?: boolean
}) {
  const textColor = isDisabledRow ? "text-[#bbb]" : "text-[#262626]"
  const mutedColor = isDisabledRow ? "text-[#ccc]" : "text-[#888]"

  return (
    <tr className="border-b border-sidebar-border transition-colors last:border-b-0 hover:bg-[#fafafa]">
      <td className={cn("py-[12px] text-[13px] font-medium", textColor)}>
        <div className="flex items-center gap-[10px]">
          <div className={cn(
            "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[6px] text-[10px] font-semibold",
            isDisabledRow ? "bg-[#e8e8e8] text-[#bbb]" : "bg-[#d4d4d4] text-[#555]"
          )}>
            {initials}
          </div>
          <div className="min-w-0">
            <span className="block truncate">{name}</span>
            {coordinator && (
              <span className={cn("block truncate text-[11px]", mutedColor)}>{coordinator}</span>
            )}
          </div>
        </div>
      </td>
      <td className={cn("py-[12px] text-[13px] font-medium", mutedColor)}>
        {isActive ? (
          <span className="inline-flex items-center rounded-[4px] bg-green-50 px-[8px] py-[1px] text-[11px] font-medium text-green-600">active</span>
        ) : (
          <span className="inline-flex items-center rounded-[4px] bg-gray-100 px-[8px] py-[1px] text-[11px] font-medium text-gray-500">archived</span>
        )}
      </td>
      <td className="py-[12px]">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "relative h-[20px] w-[36px] rounded-full transition-colors",
            isActive ? "bg-blue-500" : "bg-[#d4d4d4]"
          )}
          tabIndex={0}
          aria-label={isActive ? "Archive participant" : "Activate participant"}
          aria-checked={isActive}
          role="switch"
        >
          <span
            className={cn(
              "absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-transform",
              isActive ? "left-[18px]" : "left-[2px]"
            )}
          />
        </button>
      </td>
    </tr>
  )
}
