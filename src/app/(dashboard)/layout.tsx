"use client"

import { Sidebar } from "@/components/sidebar/sidebar"
import { MobileNav } from "@/components/mobile-nav"
import { CommandPalette } from "@/components/command-palette"
import { KeyboardShortcutsProvider } from "@/components/keyboard-shortcuts-provider"
import { ToastProvider } from "@/components/toast"
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
      <ToastProvider>
        <ClientsProvider>
          <ContactsProvider>
            <StaffProvider>
              <TasksProvider>
                <DocumentsProvider>
                  <KeyboardShortcutsProvider>
                    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
                      <div className="hidden md:flex">
                        <Sidebar />
                      </div>
                      <MobileNav />
                      <main className="h-full flex-1 overflow-y-auto bg-[#fafafa]">
                        {children}
                      </main>
                      <CommandPalette />
                    </div>
                  </KeyboardShortcutsProvider>
                </DocumentsProvider>
              </TasksProvider>
            </StaffProvider>
          </ContactsProvider>
        </ClientsProvider>
      </ToastProvider>
    </WorkspaceProvider>
  )
}
