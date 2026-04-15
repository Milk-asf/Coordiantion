"use client"

import { WorkspaceProvider } from "@/lib/workspace-context"
import { ClientsProvider } from "@/lib/clients-context"

export default function SettingsGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkspaceProvider>
      <ClientsProvider>
        <div className="flex h-screen w-full overflow-hidden bg-[#fafafa]">
          {children}
        </div>
      </ClientsProvider>
    </WorkspaceProvider>
  )
}
