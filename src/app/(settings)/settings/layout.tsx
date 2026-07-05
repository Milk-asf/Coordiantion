"use client"

import { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Bell,
  Building2,
  CalendarRange,
  CreditCard,
  Database,
  Plug,
  ScrollText,
  ShieldCheck,
  Tag,
  Upload,
  UserRound,
  Users,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { pageTitleTextClass, sidebarWorkspaceHeaderClass } from "@/components/tab-active-indicator"
import { PageBackButton } from "@/components/page-back-button"
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
      { label: "Profile", href: "/settings/profile", icon: User },
      { label: "Security", href: "/settings/security", icon: ShieldCheck },
      { label: "Notifications", href: "/settings/notifications", icon: Bell },
    ],
  },
  {
    title: "Organisation",
    items: [
      { label: "General", href: "/settings/general", icon: Building2, requiredPermission: "isSuperAdmin" },
      { label: "Members", href: "/settings/members", icon: Users, requiredPermission: "canManageMembers" },
      { label: "Participants", href: "/settings/participants", icon: UserRound, requiredPermission: "canManageWorkspaceSettings" },
      { label: "NDIS price book", href: "/settings/charges", icon: Tag, requiredPermission: "canManageWorkspaceSettings" },
      { label: "Data model", href: "/settings/data-model", icon: Database, requiredPermission: "canManageWorkspaceSettings" },
      { label: "Rostering", href: "/settings/rostering", icon: CalendarRange, requiredPermission: "canManageWorkspaceSettings" },
      { label: "Integrations", href: "/settings/integrations", icon: Plug, requiredPermission: "canManageWorkspaceSettings" },
      { label: "Import", href: "/settings/import-history", icon: Upload, requiredPermission: "canManageWorkspaceSettings" },
      { label: "Audit log", href: "/settings/audit-log", icon: ScrollText, requiredPermission: "canManageWorkspaceSettings" },
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
  const router = useRouter()
  const permissions = usePermissions()

  const filteredNav = useMemo(
    () =>
      settingsNav
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            if (!item.requiredPermission) return true
            return permissions[item.requiredPermission]
          }),
        }))
        .filter((section) => section.items.length > 0),
    [permissions],
  )

  const isWidePage =
    pathname === "/settings/audit-log" ||
    pathname === "/settings/data-model" ||
    pathname === "/settings/participants" ||
    pathname === "/settings/members" ||
    pathname === "/settings/import-history" ||
    pathname === "/settings/rostering" ||
    pathname === "/settings/charges"

  return (
    <div className="flex h-full min-h-0 w-full flex-col md:flex-row">
      <div className="flex h-[52px] shrink-0 items-center gap-[12px] border-b border-folk-border bg-white px-[16px] md:hidden">
        <PageBackButton ariaLabel="Back to app" onClick={() => router.push("/clients")} />
        <h1 className={pageTitleTextClass("min-w-0 truncate")}>Settings</h1>
      </div>

      <aside className="folk-sidebar-surface hidden h-full w-[220px] shrink-0 flex-col border-r border-folk-border md:flex">
        <div className={sidebarWorkspaceHeaderClass("gap-[12px]")}>
          <PageBackButton ariaLabel="Back to app" onClick={() => router.push("/clients")} />
          <span className="min-w-0 truncate text-[13px] font-semibold text-folk-text">Settings</span>
        </div>

        <nav className="folk-tab-scroll flex-1 overflow-y-auto px-2 pt-[14px]" role="navigation" aria-label="Settings navigation">
          {filteredNav.map((section, sectionIndex) => (
            <div key={section.title} className={cn(sectionIndex > 0 && "mt-4")}>
              <p className="mb-[6px] px-[10px] text-[11px] font-normal tracking-wide text-[#999999]">
                {section.title}
              </p>
              <ul className="m-0 list-none space-y-px p-0">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "mx-1 flex h-[32px] items-center gap-2 rounded-[4px] px-[12px] text-[12px] font-normal transition-colors",
                          isActive
                            ? "bg-sidebar-active font-medium text-sidebar-active-text"
                            : "text-[#616161] hover:bg-sidebar-hover",
                        )}
                        aria-current={isActive ? "page" : undefined}
                        tabIndex={0}
                      >
                        <Icon className="h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
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

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-white px-[16px] pt-[24px] md:px-[40px] md:pt-[32px]">
        <div className={cn("mx-auto w-full pb-[80px]", isWidePage ? "max-w-[1040px]" : "max-w-[560px]")}>
          {children}
        </div>
      </div>
    </div>
  )
}
