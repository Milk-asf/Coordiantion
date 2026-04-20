"use client"

import { WorkspaceProvider } from "@/lib/workspace-context"
import { ClientsProvider } from "@/lib/clients-context"
import { StaffProvider } from "@/lib/staff-context"

export default function SettingsGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkspaceProvider>
      <ClientsProvider>
        <StaffProvider>
          <div className="flex h-screen w-full overflow-hidden bg-[#fafafa]">
            {children}
          </div>
        </StaffProvider>
      </ClientsProvider>
    </WorkspaceProvider>
  )
}
