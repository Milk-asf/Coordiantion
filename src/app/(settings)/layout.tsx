"use client"

import { ToastProvider } from "@/components/toast"
import { WorkspaceProvider } from "@/lib/workspace-context"
import { ClientsProvider } from "@/lib/clients-context"
import { ContactsProvider } from "@/lib/contacts-context"
import { StaffProvider } from "@/lib/staff-context"

export default function SettingsGroupLayout({
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
              <div className="flex h-screen w-full overflow-hidden bg-folk-surface">
                {children}
              </div>
            </StaffProvider>
          </ContactsProvider>
        </ClientsProvider>
      </ToastProvider>
    </WorkspaceProvider>
  )
}
