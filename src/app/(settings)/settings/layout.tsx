"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Settings,
  Mail,
  Bell,
  Mic,
  Building2,
  Users,
  Video,
  BookOpen,
  Database,
  GitBranch,
  Upload,
  CreditCard,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SettingsNavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

interface SettingsNavSection {
  title: string
  items: SettingsNavItem[]
}

const settingsNav: SettingsNavSection[] = [
  {
    title: "Account",
    items: [
      { label: "Settings", href: "/settings/profile", icon: Settings },
      { label: "Mail and Calendar", href: "/settings/mail-and-calendar", icon: Mail },
      { label: "Notifications", href: "/settings/notifications", icon: Bell },
      { label: "Recording", href: "/settings/recording", icon: Mic },
    ],
  },
  {
    title: "Workspace",
    items: [
      { label: "General", href: "/settings/general", icon: Building2 },
      { label: "Members", href: "/settings/members", icon: Users },
      { label: "Meetings", href: "/settings/meetings", icon: Video },
      { label: "Knowledge", href: "/settings/knowledge", icon: BookOpen },
      { label: "Data model", href: "/settings/data-model", icon: Database },
      { label: "Opportunity stages", href: "/settings/opportunity-stages", icon: GitBranch },
      { label: "Import history", href: "/settings/import-history", icon: Upload },
      { label: "Billing", href: "/settings/billing", icon: CreditCard },
    ],
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-full">
      <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar-bg">
        <div className="flex items-center px-3 pb-2 pt-3">
          <Link
            href="/clients"
            className="flex items-center gap-[6px] text-[13px] font-medium text-sidebar-text transition-colors hover:text-[#262626]"
            tabIndex={0}
          >
            <ArrowLeft className="h-[14px] w-[14px]" strokeWidth={1.75} />
            Settings
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-2" role="navigation" aria-label="Settings navigation">
          {settingsNav.map((section) => (
            <div key={section.title} className="mt-4">
              <p className="mb-1 px-2 text-[11px] font-medium tracking-wide text-sidebar-muted">
                {section.title}
              </p>
              <ul className="space-y-px">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded px-2 py-[6px] text-[13px] font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-active text-sidebar-text"
                            : "text-sidebar-text hover:bg-sidebar-hover"
                        )}
                        aria-current={isActive ? "page" : undefined}
                        tabIndex={0}
                      >
                        <Icon className="h-[16px] w-[16px] shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 overflow-y-auto pt-[28px]">
        <div className="mx-auto w-full max-w-[560px] pb-[80px]">
          {children}
        </div>
      </div>
    </div>
  )
}
