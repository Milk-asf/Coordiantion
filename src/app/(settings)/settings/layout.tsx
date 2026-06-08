"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Settings,
  Bell,
  Building2,
  Users,
  UserRound,

  Database,
  Upload,
  CreditCard,
  Tag,
  Plug,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePermissions } from "@/lib/hooks/use-permissions"

interface SettingsNavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  requiredPermission?: "isSuperAdmin" | "canManageWorkspaceSettings" | "canManageMembers" | "canAccessBilling"
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
      { label: "Notifications", href: "/settings/notifications", icon: Bell },
    ],
  },
  {
    title: "Organisation",
    items: [
      { label: "General", href: "/settings/general", icon: Building2, requiredPermission: "isSuperAdmin" },
      { label: "Members", href: "/settings/members", icon: Users, requiredPermission: "canManageMembers" },

      { label: "Participants", href: "/settings/participants", icon: UserRound, requiredPermission: "canManageWorkspaceSettings" },
      { label: "Data model", href: "/settings/data-model", icon: Database, requiredPermission: "canManageWorkspaceSettings" },
      { label: "Charges", href: "/settings/charges", icon: Tag, requiredPermission: "canManageWorkspaceSettings" },
      { label: "Integrations", href: "/settings/integrations", icon: Plug, requiredPermission: "canManageWorkspaceSettings" },
      { label: "Import", href: "/settings/import-history", icon: Upload, requiredPermission: "canManageWorkspaceSettings" },
      { label: "Billing", href: "/settings/billing", icon: CreditCard, requiredPermission: "canAccessBilling" },
    ],
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const permissions = usePermissions()

  const filteredNav = useMemo(() =>
    settingsNav
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (!item.requiredPermission) return true
          return permissions[item.requiredPermission]
        }),
      }))
      .filter((section) => section.items.length > 0),
    [permissions]
  )

  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      <div className="flex h-[52px] shrink-0 items-center border-b border-[#f0f0f0] bg-white px-[16px] md:hidden">
        <Link
          href="/tasks"
          className="flex items-center gap-[6px] text-[13px] font-medium text-[#555] transition-colors hover:text-[#262626]"
          tabIndex={0}
        >
          <ArrowLeft className="h-[14px] w-[14px]" strokeWidth={1.75} />
          Back
        </Link>
        <span className="ml-[12px] text-[14px] font-semibold text-[#262626]">Settings</span>
      </div>
      <aside className="hidden h-full w-[240px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar-bg md:flex">
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
          {filteredNav.map((section) => (
            <div key={section.title} className="mt-4">
              <p className="mb-1 px-2 text-[11px] font-medium tracking-wide text-sidebar-muted">
                {section.title}
              </p>
              <ul className="list-none space-y-px p-0 m-0">
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

      <div className="flex-1 overflow-y-auto bg-[#fafafa] px-[16px] pt-[24px] md:px-[40px] md:pt-[32px]">
        <div className={cn(
          "mx-auto w-full pb-[80px]",
          pathname === "/settings/data-model" || pathname === "/settings/charges" || pathname === "/settings/participants" || pathname === "/settings/members" || pathname === "/settings/import-history" ? "max-w-[720px]" : "max-w-[560px]"
        )}>
          {children}
        </div>
      </div>
    </div>
  )
}
