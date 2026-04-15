"use client"

import { Sidebar } from "@/components/sidebar/sidebar"
import { WorkspaceProvider } from "@/lib/workspace-context"
import { ClientsProvider } from "@/lib/clients-context"
import { ContactsProvider } from "@/lib/contacts-context"
import { StaffProvider } from "@/lib/staff-context"
import { TasksProvider } from "@/lib/tasks-context"
import { DocumentsProvider } from "@/lib/documents-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkspaceProvider>
      <ClientsProvider>
        <ContactsProvider>
          <StaffProvider>
            <TasksProvider>
              <DocumentsProvider>
                <div className="flex h-screen overflow-hidden">
                  <Sidebar />
                  <main className="h-full flex-1 overflow-y-auto bg-[#fafafa]">
                    {children}
                  </main>
                </div>
              </DocumentsProvider>
            </TasksProvider>
          </StaffProvider>
        </ContactsProvider>
      </ClientsProvider>
    </WorkspaceProvider>
  )
}
