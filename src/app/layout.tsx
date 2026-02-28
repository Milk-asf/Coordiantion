import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Sidebar } from "@/components/sidebar/sidebar"
import { ContactsProvider } from "@/lib/contacts-context"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Coordination",
  description: "Coordinate your work, your way",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <ContactsProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="h-full flex-1 overflow-y-auto bg-[#fafafa]">
              {children}
            </main>
          </div>
        </ContactsProvider>
      </body>
    </html>
  )
}
