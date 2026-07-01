"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Menu,
  X,
  SquareCheck,
  StickyNote,
  Package,
  User,
  BookOpen,
  Settings,
  ClipboardList,
  CalendarRange,
  AlertTriangle,
  ChevronDown,
  Clock,
  LayoutList,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useIncidents } from "@/lib/hooks/use-incidents"
import { useWorkspace } from "@/lib/workspace-context"
import {
  BUSINESS_NAV_GROUP,
  BUSINESS_NAV_SECTIONS,
  isBusinessGroupActive,
  isBusinessNavItemActive,
} from "@/lib/business-nav"

const navItems = [
  { label: "Roster", href: "/roster", icon: CalendarRange },
  { label: "Tasks", href: "/tasks", icon: SquareCheck },
  { label: "Notes", href: "/notes", icon: StickyNote },
  { label: "Documents", href: "/documents", icon: Package },
  { label: "Forms", href: "/forms", icon: ClipboardList },
  { label: "Incidents", href: "/incidents", icon: AlertTriangle },
  { label: "Clients", href: "/clients", icon: User },
  { label: "Contacts", href: "/contacts", icon: BookOpen },
  { label: "Staff", href: "/staff", icon: User },
  { label: "Lists", href: "/lists", icon: LayoutList },
  { label: "Timesheets", href: "/timesheets", icon: Clock },
  { label: "Settings", href: "/settings", icon: Settings },
]

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [isBusinessOpen, setIsBusinessOpen] = useState(false)
  const pathname = usePathname()
  const { activeWorkspace } = useWorkspace()
  const {
    canViewIncidents,
    canViewRoster,
    canViewTasks,
    canViewNotes,
    canViewDocuments,
    canViewForms,
    canViewClients,
    canViewContacts,
    canViewStaff,
    canViewFinance,
    isSupportWorker,
    isLoading: permissionsLoading,
  } = usePermissions()
  const { unviewedCount: unviewedIncidentsCount } = useIncidents()
  const isBusinessActive = isBusinessGroupActive(pathname)
  const BusinessIcon = BUSINESS_NAV_GROUP.icon

  const navVisibilityByLabel: Record<string, boolean> = {
    Roster: canViewRoster,
    Tasks: canViewTasks,
    Notes: canViewNotes,
    Documents: canViewDocuments,
    Forms: canViewForms,
    Incidents: canViewIncidents,
    Clients: canViewClients,
    Contacts: canViewContacts,
    Staff: canViewStaff,
    Timesheets: true,
    Settings: !isSupportWorker,
  }

  const TOP_NAV_LABELS = new Set(["Roster", "Tasks", "Notes", "Documents", "Forms", "Incidents"])
  const workspaceNavItems = navItems.filter((item) => {
    if (permissionsLoading) return true
    return navVisibilityByLabel[item.label] !== false
  })
  const topNavItems = workspaceNavItems.filter((item) => TOP_NAV_LABELS.has(item.label))
  const bottomNavItems = workspaceNavItems.filter((item) => !TOP_NAV_LABELS.has(item.label))
  const showFinanceGroup = permissionsLoading || canViewFinance

  useEffect(() => {
    if (isBusinessActive) setIsBusinessOpen(true)
  }, [isBusinessActive])

  return (
    <>
      <header className="dashboard-mobile-header flex h-[52px] shrink-0 items-center justify-between border-b border-folk-border-subtle bg-white px-[16px] md:hidden">
        <span className="truncate text-[14px] font-semibold text-folk-text">
          {activeWorkspace?.name || "Coordination"}
        </span>
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-[36px] w-[36px] items-center justify-center rounded-none text-[#555] transition-colors hover:bg-folk-hover"
          aria-label="Open navigation"
          tabIndex={0}
        >
          <Menu className="h-[20px] w-[20px]" strokeWidth={1.5} />
        </button>
      </header>

      {isOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsOpen(false)} />
          <nav className="absolute inset-y-0 left-0 w-[280px] bg-folk-surface shadow-xl">
            <div className="flex h-[52px] items-center justify-between border-b border-folk-border-subtle bg-white px-[16px]">
              <span className="text-[14px] font-semibold text-folk-text">
                {activeWorkspace?.name || "Coordination"}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-[29px] w-[29px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover"
                aria-label="Close navigation"
                tabIndex={0}
              >
                <X className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </button>
            </div>
            <ul className="flex flex-col gap-[2px] p-[12px]">
              {topNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const badge = item.label === "Incidents" && canViewIncidents ? unviewedIncidentsCount : 0
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-[10px] rounded-none px-[12px] py-[10px] text-[14px] font-medium transition-colors",
                        isActive
                          ? "bg-[var(--folk-border-subtle)] text-folk-text"
                          : "text-[#555] hover:bg-[#f8f8f8] hover:text-folk-text"
                      )}
                      tabIndex={0}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                      <span className="flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span
                          className="flex h-[20px] min-w-[20px] items-center justify-center rounded-full text-[11px] font-medium"
                          style={{ backgroundColor: "var(--primary-color-light)", color: "var(--primary-color-text)" }}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}

              {showFinanceGroup && (
              <li>
                <button
                  type="button"
                  onClick={() => setIsBusinessOpen((prev) => !prev)}
                  className={cn(
                    "flex w-full items-center gap-[10px] rounded-none px-[12px] py-[10px] text-[14px] font-medium transition-colors",
                    isBusinessActive
                      ? "bg-[var(--folk-border-subtle)] text-folk-text"
                      : "text-[#555] hover:bg-[#f8f8f8] hover:text-folk-text"
                  )}
                  aria-expanded={isBusinessOpen}
                  tabIndex={0}
                >
                  <BusinessIcon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                  <span className="flex-1 text-left">{BUSINESS_NAV_GROUP.label}</span>
                  <ChevronDown
                    className={cn("h-[14px] w-[14px] shrink-0 transition-transform", !isBusinessOpen && "-rotate-90")}
                    strokeWidth={1.5}
                  />
                </button>
                {isBusinessOpen && (
                  <div className="ml-[12px] mt-[4px] space-y-[8px] border-l border-folk-border pl-[12px]">
                    {BUSINESS_NAV_SECTIONS.map((section, sectionIndex) => (
                      <div key={section.title ?? `section-${sectionIndex}`}>
                        {section.title && (
                          <p className="mb-[4px] px-[4px] text-[11px] font-medium tracking-wide text-folk-secondary">
                            {section.title}
                          </p>
                        )}
                        <ul className="space-y-[2px]">
                          {section.items.map((item) => {
                            const Icon = item.icon
                            const isActive = isBusinessNavItemActive(pathname, item.href)
                            return (
                              <li key={item.href}>
                                <Link
                                  href={item.href}
                                  onClick={() => setIsOpen(false)}
                                  className={cn(
                                    "flex items-center gap-[10px] rounded-none px-[12px] py-[8px] text-[13px] font-medium transition-colors",
                                    isActive
                                      ? "bg-[var(--folk-border-subtle)] text-folk-text"
                                      : "text-[#555] hover:bg-[#f8f8f8] hover:text-folk-text"
                                  )}
                                  tabIndex={0}
                                >
                                  <Icon className="h-[16px] w-[16px] shrink-0" strokeWidth={1.5} />
                                  <span>{item.label}</span>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </li>
              )}

              {bottomNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-[10px] rounded-none px-[12px] py-[10px] text-[14px] font-medium transition-colors",
                        isActive
                          ? "bg-[var(--folk-border-subtle)] text-folk-text"
                          : "text-[#555] hover:bg-[#f8f8f8] hover:text-folk-text"
                      )}
                      tabIndex={0}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      )}
    </>
  )
}
