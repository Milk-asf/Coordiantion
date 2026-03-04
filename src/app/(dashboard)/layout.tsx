import { Sidebar } from "@/components/sidebar/sidebar"
import { ContactsProvider } from "@/lib/contacts-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ContactsProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="h-full flex-1 overflow-y-auto bg-[#fafafa]">
          {children}
        </main>
      </div>
    </ContactsProvider>
  )
}
