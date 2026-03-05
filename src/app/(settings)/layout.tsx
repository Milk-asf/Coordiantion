"use client"

import { WorkspaceProvider } from "@/lib/workspace-context"

export default function SettingsGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkspaceProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#fafafa]">
        {children}
      </div>
    </WorkspaceProvider>
  )
}
