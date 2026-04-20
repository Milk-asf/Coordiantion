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
      <div className="mb-[32px]">
        <h1 className="text-[20px] font-bold text-[#262626]">Participants</h1>
        <p className="mt-[4px] text-[14px] text-[#888]">
          Manage participant status. Toggle off to archive a participant.
        </p>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[#e5e5e5] bg-[#fafafa]">
        <div className="grid grid-cols-[1fr_100px_80px] items-center border-b border-[#efefef] px-[20px] py-[10px]">
          <span className="text-[12px] font-medium text-[#999]">Name</span>
          <span className="text-[12px] font-medium text-[#999]">Status</span>
          <span className="text-[12px] font-medium text-[#999]">Active</span>
        </div>

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

        {clients.length === 0 && (
          <div className="px-[20px] py-[40px] text-center text-[13px] text-[#bbb]">
            No participants
          </div>
        )}
      </div>

      {archivedClients.length > 0 && (
        <div className="mt-[28px]">
          <h2 className="mb-[10px] text-[13px] font-semibold uppercase tracking-wide text-[#999]">Archived</h2>
          <div className="overflow-hidden rounded-[14px] border border-[#e5e5e5] bg-[#fafafa]">
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
          </div>
        </div>
      )}
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
  return (
    <div className={cn(
      "grid grid-cols-[1fr_100px_80px] items-center border-b border-[#efefef] px-[20px] py-[14px] transition-colors last:border-b-0",
      isDisabledRow ? "opacity-60" : "hover:bg-[#f5f5f5]"
    )}>
      <div className="flex items-center gap-[12px]">
        <div className={cn(
          "flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px] text-[11px] font-semibold",
          isDisabledRow ? "bg-[#e8e8e8] text-[#bbb]" : "bg-[#e0e0e0] text-[#555]"
        )}>
          {initials}
        </div>
        <div className="min-w-0">
          <span className="block truncate text-[14px] font-medium text-[#262626]">{name}</span>
          {coordinator && (
            <span className="block truncate text-[12px] text-[#999]">{coordinator}</span>
          )}
        </div>
      </div>

      <div>
        {isActive ? (
          <span className="inline-flex items-center rounded-full border border-green-100 bg-green-50 px-[10px] py-[2px] text-[11px] font-medium text-green-600">Active</span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-[10px] py-[2px] text-[11px] font-medium text-gray-500">Archived</span>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "relative h-[22px] w-[40px] rounded-full transition-colors",
            isActive ? "bg-blue-400" : "bg-[#d4d4d4]"
          )}
          tabIndex={0}
          aria-label={isActive ? "Archive participant" : "Activate participant"}
          aria-checked={isActive}
          role="switch"
        >
          <span
            className={cn(
              "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform",
              isActive ? "left-[20px]" : "left-[2px]"
            )}
          />
        </button>
      </div>
    </div>
  )
}
