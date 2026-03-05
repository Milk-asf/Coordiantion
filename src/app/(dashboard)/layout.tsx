"use client"

import { Sidebar } from "@/components/sidebar/sidebar"
import { WorkspaceProvider } from "@/lib/workspace-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkspaceProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="h-full flex-1 overflow-y-auto bg-[#fafafa]">
          {children}
        </main>
      </div>
    </WorkspaceProvider>
  )
}
