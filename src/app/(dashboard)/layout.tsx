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
import { NotesProvider } from "@/lib/notes-context"
import { IncidentsProvider } from "@/lib/incidents-context"
import { DocumentsProvider } from "@/lib/documents-context"
import { FormsProvider } from "@/lib/forms-context"
import { AnalyticsProvider } from "@/lib/analytics/context"
import { ListsProvider } from "@/lib/lists/context"
import { TimesheetsProvider } from "@/lib/timesheets-context"
import { RosterProvider } from "@/lib/roster-context"
import { SuitabilityProvider } from "@/lib/suitability-context"
import { RecentlyVisitedTracker } from "@/lib/hooks/use-recently-visited"

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
                <NotesProvider>
                  <IncidentsProvider>
                  <DocumentsProvider>
                  <FormsProvider>
                  <AnalyticsProvider>
                  <ListsProvider>
                  <SuitabilityProvider>
                    <RosterProvider>
                    <TimesheetsProvider>
                    <KeyboardShortcutsProvider>
                      <RecentlyVisitedTracker />
                      <div className="dashboard-shell flex h-screen flex-col overflow-hidden md:flex-row">
                        <div className="dashboard-sidebar-wrap hidden md:flex">
                          <Sidebar />
                        </div>
                        <MobileNav />
                        <main className="dashboard-main h-full flex-1 overflow-y-auto bg-white">
                          {children}
                        </main>
                        <CommandPalette />
                      </div>
                    </KeyboardShortcutsProvider>
                    </TimesheetsProvider>
                    </RosterProvider>
                  </SuitabilityProvider>
                  </ListsProvider>
                  </AnalyticsProvider>
                  </FormsProvider>
                  </DocumentsProvider>
                  </IncidentsProvider>
                </NotesProvider>
              </TasksProvider>
            </StaffProvider>
          </ContactsProvider>
        </ClientsProvider>
      </ToastProvider>
    </WorkspaceProvider>
  )
}
