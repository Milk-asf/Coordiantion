"use client"

import { useState, useCallback, useRef, useEffect, forwardRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Sun,
  Bell,
  SquareCheck,
  BookOpen,
  User,
  Package,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Undo2,
  FileCheck,
  StickyNote,
  ClipboardList,
  CalendarRange,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { sidebarWorkspaceHeaderClass } from "@/components/tab-active-indicator"
import { PanelToggleButton } from "@/components/panel-toggle-button"
import { PageClockButton } from "@/components/page-clock-button"
import { SidebarAccountMenu } from "@/components/sidebar/sidebar-account-menu"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useNotifications, type AppNotification } from "@/lib/hooks/use-notifications"
import { useIncidents } from "@/lib/hooks/use-incidents"
import { SidebarBusinessNavGroup } from "@/components/sidebar/sidebar-nav-group"
import { SidebarListsGroup } from "@/components/sidebar/sidebar-lists-group"
import { FinanceNavPanel } from "@/components/sidebar/finance-nav-panel"
import { FINANCE_DEFAULT_HREF, isBusinessGroupActive } from "@/lib/business-nav"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  badge?: number
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { label: "Roster", href: "/roster", icon: CalendarRange },
      { label: "Tasks", href: "/tasks", icon: SquareCheck },
      { label: "Notes", href: "/notes", icon: StickyNote },
      { label: "Documents", href: "/documents", icon: Package },
      { label: "Forms", href: "/forms", icon: ClipboardList },
      { label: "Incidents", href: "/incidents", icon: AlertTriangle },
    ],
  },
  {
    title: "Business",
    items: [{ label: "Reports", href: "/reports", icon: BarChart3 }],
  },
  {
    title: "People",
    items: [
      { label: "Clients", href: "/clients", icon: User },
      { label: "Contacts", href: "/contacts", icon: BookOpen },
      { label: "Staff", href: "/staff", icon: User },
    ],
  },
]

// Support workers get a short, calm sidebar: My Day plus the four areas they
// actually use in the field. Everything else stays hidden.
const supportWorkerNavigation: NavSection[] = [
  {
    title: "My work",
    items: [
      { label: "My Day", href: "/my-day", icon: Sun },
      { label: "Roster", href: "/roster", icon: CalendarRange },
      { label: "Timesheets", href: "/timesheets", icon: Clock },
      { label: "Incidents", href: "/incidents", icon: AlertTriangle },
    ],
  },
  {
    title: "People",
    items: [{ label: "My participants", href: "/clients", icon: User }],
  },
]

const COLLAPSED_WIDTH = 88
const MIN_WIDTH = 148
const DEFAULT_WIDTH = 210
const MAX_WIDTH = 360
const COLLAPSE_THRESHOLD = 100

export function Sidebar() {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [notifPos, setNotifPos] = useState({ top: 0, left: 0 })
  const [isFinancePanelOpen, setIsFinancePanelOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const notifBtnRef = useRef<HTMLButtonElement>(null)
  const notifPanelRef = useRef<HTMLDivElement>(null)
  const widthBeforeCollapse = useRef(DEFAULT_WIDTH)
  const widthRef = useRef(width)
  const isCollapsedRef = useRef(isCollapsed)
  const widthBeforeFinancePanel = useRef<number | null>(null)
  const collapsedBeforeFinancePanel = useRef<boolean | null>(null)
  const userExpandedDuringFinance = useRef(false)
  const [instantWidthChange, setInstantWidthChange] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const {
    canViewStaff,
    canViewIncidents,
    canViewRoster,
    canViewTasks,
    canViewNotes,
    canViewDocuments,
    canViewForms,
    canViewClients,
    canViewContacts,
    canViewFinance,
    isSupportWorker,
    isLoading: permissionsLoading,
  } = usePermissions()
  const navVisibilityByLabel: Record<string, boolean> = {
    Roster: canViewRoster,
    Tasks: canViewTasks,
    Notes: canViewNotes,
    Documents: canViewDocuments,
    Forms: canViewForms,
    Reports: !isSupportWorker,
    Incidents: canViewIncidents,
    Clients: canViewClients,
    Contacts: canViewContacts,
    Staff: canViewStaff,
  }
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const { unviewedCount: unviewedIncidentsCount } = useIncidents()
  const isFinanceGroupActive = isBusinessGroupActive(pathname)
  const prevPathnameRef = useRef(pathname)

  useEffect(() => {
    const wasInFinance = isBusinessGroupActive(prevPathnameRef.current)
    if (isFinanceGroupActive && !wasInFinance) setIsFinancePanelOpen(true)
    if (!isFinanceGroupActive) setIsFinancePanelOpen(false)
    prevPathnameRef.current = pathname
  }, [pathname, isFinanceGroupActive])

  widthRef.current = width
  isCollapsedRef.current = isCollapsed

  useEffect(() => {
    if (isFinancePanelOpen) {
      if (userExpandedDuringFinance.current) return
      if (collapsedBeforeFinancePanel.current !== null) return

      const wasCollapsed = isCollapsedRef.current
      collapsedBeforeFinancePanel.current = wasCollapsed
      widthBeforeFinancePanel.current = wasCollapsed
        ? widthBeforeCollapse.current
        : widthRef.current

      if (wasCollapsed) return

      setInstantWidthChange(true)
      widthBeforeCollapse.current = widthRef.current
      setIsCollapsed(true)
      setWidth(COLLAPSED_WIDTH)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setInstantWidthChange(false))
      })
      return
    }

    if (collapsedBeforeFinancePanel.current === null) return

    const wasCollapsedBeforeFinance = collapsedBeforeFinancePanel.current
    const restoreWidth = widthBeforeFinancePanel.current ?? DEFAULT_WIDTH
    const keepUserLayout = userExpandedDuringFinance.current

    collapsedBeforeFinancePanel.current = null
    widthBeforeFinancePanel.current = null
    userExpandedDuringFinance.current = false

    if (keepUserLayout || wasCollapsedBeforeFinance) return

    widthBeforeCollapse.current = restoreWidth
    setIsCollapsed(false)
    setWidth(restoreWidth)
  }, [isFinancePanelOpen])

  const handleToggleFinancePanel = useCallback(() => {
    // Selecting Finance from outside the group lands on Invoices (the panel auto-opens on navigation).
    if (!isFinanceGroupActive) {
      router.push(FINANCE_DEFAULT_HREF)
      return
    }
    setIsFinancePanelOpen((prev) => !prev)
  }, [isFinanceGroupActive, router])

  const handleCloseFinancePanel = useCallback(() => {
    setIsFinancePanelOpen(false)
  }, [])

  useEffect(() => {
    if (!isNotifOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (notifRef.current?.contains(target)) return
      if (notifPanelRef.current?.contains(target)) return
      setIsNotifOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isNotifOpen])

  const handleMarkAllRead = () => {
    markAllAsRead()
    setIsNotifOpen(false)
  }

  const handleToggleCollapse = useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false)
      setWidth(widthBeforeCollapse.current)
      if (isFinancePanelOpen) userExpandedDuringFinance.current = true
    } else {
      widthBeforeCollapse.current = width
      setIsCollapsed(true)
      setWidth(COLLAPSED_WIDTH)
    }
  }, [isCollapsed, width, isFinancePanelOpen])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX
      if (newWidth < COLLAPSE_THRESHOLD) {
        setIsCollapsed(true)
        setWidth(COLLAPSED_WIDTH)
      } else {
        const clampedWidth = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH)
        setIsCollapsed(false)
        setWidth(clampedWidth)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      if (!isCollapsed) {
        widthBeforeCollapse.current = width
      }
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isDragging, isCollapsed, width])

  const renderNavLink = (item: NavItem, badgeOverride?: number) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
    const Icon = item.icon
    const badge = badgeOverride ?? item.badge

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={cn(
            "mx-1 flex h-[32px] items-center gap-2 rounded-[4px] px-[12px] text-[12px] font-normal no-underline transition-colors",
            isActive
              ? "bg-sidebar-active font-medium text-sidebar-active-text"
              : "text-[#616161] hover:bg-sidebar-hover",
            isCollapsed && "relative mx-0 justify-center px-0"
          )}
          aria-current={isActive ? "page" : undefined}
          tabIndex={0}
        >
          <Icon className="h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
          {!isCollapsed && (
            <>
              <span className="truncate">{item.label}</span>
              {badge != null && badge > 0 && (
                <span
                  className="ml-auto flex h-[20px] min-w-[20px] items-center justify-center rounded-full text-[11px] font-medium"
                  style={{ backgroundColor: "var(--primary-color-light)", color: "var(--primary-color-text)" }}
                >
                  {badge}
                </span>
              )}
            </>
          )}
          {isCollapsed && badge != null && badge > 0 && (
            <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-red-500" />
          )}
        </Link>
      </li>
    )
  }

  return (
    <>
    <div className="flex h-screen shrink-0">
    <aside
      ref={sidebarRef}
      style={{ width: `${width}px` }}
      className={cn(
        "folk-sidebar-surface relative flex h-full shrink-0 flex-col overflow-visible border-r border-folk-border",
        !isDragging && !instantWidthChange && "transition-[width] duration-200"
      )}
    >
      {/* Company name + collapse — 52px row aligned with page title bar. */}
      <div
        className={cn(
          sidebarWorkspaceHeaderClass("gap-[6px]"),
          isCollapsed ? "justify-center px-2" : "justify-between gap-[8px]",
        )}
      >
        <SidebarAccountMenu isCollapsed={isCollapsed} />
        {!isCollapsed ? <PageClockButton variant="icon" /> : null}
        <PanelToggleButton
          side="left"
          isOpen={!isCollapsed}
          onClick={handleToggleCollapse}
          ariaLabel={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        />
      </div>

      {/* Navigation */}
      <nav className="folk-tab-scroll flex-1 overflow-y-auto px-2" role="navigation" aria-label="Main navigation">
        <ul className="list-none space-y-px pt-[14px]">
          <li className={cn("relative", isCollapsed && "mx-0")}>
            <div className="relative" ref={notifRef}>
              <button
                ref={notifBtnRef}
                onClick={() => {
                  if (!isNotifOpen && notifBtnRef.current) {
                    const rect = notifBtnRef.current.getBoundingClientRect()
                    setNotifPos({ top: rect.top, left: rect.right + 8 })
                  }
                  setIsNotifOpen(!isNotifOpen)
                }}
                className={cn(
                  "folk-sidebar-nav-item mx-1 flex h-[32px] w-full items-center gap-2 rounded-[4px] px-[12px] text-[12px] font-normal transition-colors",
                  isNotifOpen
                    ? "bg-sidebar-active font-medium text-sidebar-active-text"
                    : "text-[#616161] hover:bg-sidebar-hover",
                  isCollapsed && "relative mx-0 justify-center px-0",
                )}
                aria-label="Notifications"
                tabIndex={0}
              >
                <Bell className="h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
                {!isCollapsed && (
                  <>
                    <span className="truncate">Notifications</span>
                    {unreadCount > 0 && (
                      <span
                        className="ml-auto flex h-[20px] min-w-[20px] items-center justify-center rounded-full text-[11px] font-medium"
                        style={{ backgroundColor: "var(--primary-color-light)", color: "var(--primary-color-text)" }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </>
                )}
                {isCollapsed && unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
            </div>
          </li>
        </ul>

        {(isSupportWorker ? supportWorkerNavigation : navigation).map((section) => {
          const items = section.items.filter((item) => {
            if (permissionsLoading) return true
            return navVisibilityByLabel[item.label] !== false
          })
          // The Business section contains the Finance group (gated separately) plus Reports.
          const showFinanceGroup = section.title === "Business" && (permissionsLoading || canViewFinance)
          if (section.title === "Business" && !showFinanceGroup && items.length === 0) return null
          if (items.length === 0 && section.title !== "Business") return null
          return (
            <div key={section.title} className="mt-4">
              {!isCollapsed && (
                <p className="mb-[6px] mt-[16px] px-[10px] text-[11px] font-normal tracking-wide text-[#999999]">
                  {section.title}
                </p>
              )}
              {isCollapsed && (
                <div className="mx-auto mb-1 h-px w-5 bg-sidebar-border" />
              )}
              <ul className="list-none space-y-px">
                {showFinanceGroup && (
                  <SidebarBusinessNavGroup
                    isCollapsed={isCollapsed}
                    isPanelOpen={isFinancePanelOpen}
                    isGroupActive={isFinanceGroupActive}
                    onTogglePanel={handleToggleFinancePanel}
                  />
                )}
                {items.map((item) => renderNavLink(
                  item,
                  item.label === "Incidents" && canViewIncidents ? unviewedIncidentsCount : undefined,
                ))}
              </ul>
            </div>
          )
        })}

        {!isSupportWorker && <SidebarListsGroup isCollapsed={isCollapsed} />}
      </nav>

      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize transition-colors",
          isDragging ? "bg-sidebar-text/10" : "hover:bg-sidebar-text/5"
        )}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setWidth((w) => Math.max(isCollapsed ? COLLAPSED_WIDTH : MIN_WIDTH, w - 10))
          if (e.key === "ArrowRight") setWidth((w) => Math.min(MAX_WIDTH, w + 10))
        }}
      />
    </aside>
    {isFinancePanelOpen && (
      <FinanceNavPanel pathname={pathname} onClose={handleCloseFinancePanel} />
    )}
    </div>
    {isNotifOpen && (
      <NotificationPanel
        ref={notifPanelRef}
        notifications={notifications}
        onClose={() => setIsNotifOpen(false)}
        onMarkAllRead={handleMarkAllRead}
        onMarkRead={markAsRead}
        onNavigate={(href) => {
          setIsNotifOpen(false)
          router.push(href)
        }}
        position={notifPos}
      />
    )}
    </>
  )
}

const notifIcon: Record<AppNotification["type"], React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  "overdue-task": AlertTriangle,
  "task-completed": CheckCircle2,
  "invoice-sent": FileCheck,
  "invoice-paid": CheckCircle2,
  "invoice-overdue": AlertTriangle,
  "new-client": User,
  "plan-expiring": Clock,
  "timesheet-returned": Undo2,
  "timesheet-approved": CheckCircle2,
  "travel-claim-returned": Undo2,
  "travel-claim-approved": CheckCircle2,
}

const notifColor: Record<AppNotification["type"], string> = {
  "overdue-task": "text-red-500 bg-red-50",
  "task-completed": "text-green-500 bg-green-50",
  "invoice-sent": "text-blue-500 bg-blue-50",
  "invoice-paid": "text-green-500 bg-green-50",
  "invoice-overdue": "text-orange-500 bg-orange-50",
  "new-client": "text-violet-500 bg-violet-50",
  "plan-expiring": "text-amber-500 bg-amber-50",
  "timesheet-returned": "text-amber-500 bg-amber-50",
  "timesheet-approved": "text-green-500 bg-green-50",
  "travel-claim-returned": "text-amber-500 bg-amber-50",
  "travel-claim-approved": "text-green-500 bg-green-50",
}

function formatNotifTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
}

const NotificationPanel = forwardRef<HTMLDivElement, {
  notifications: AppNotification[]
  onClose: () => void
  onMarkAllRead: () => void
  onMarkRead: (id: string) => void
  onNavigate: (href: string) => void
  position: { top: number; left: number }
}>(function NotificationPanel({
  notifications,
  onClose,
  onMarkAllRead,
  onMarkRead,
  onNavigate,
  position,
}, ref) {
  return (
    <div
      ref={ref}
      className="fixed z-50 flex max-h-[420px] w-[320px] flex-col overflow-hidden rounded-[6px] border border-folk-border bg-folk-surface shadow-folk"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex items-center justify-between border-b border-folk-border-subtle px-4 py-3">
        <h2 className="text-[14px] font-semibold text-folk-text">Notifications</h2>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          aria-label="Close notifications"
          tabIndex={0}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12">
            <p className="text-[13px] text-folk-secondary">No new notifications.</p>
            <p className="mt-1 text-[12px] text-folk-placeholder">Check back later.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#f5f5f5]">
            {notifications.map((n) => {
              const Icon = notifIcon[n.type]
              const colors = notifColor[n.type]
              return (
                <li
                  key={n.id}
                  className={cn(
                    "flex gap-2.5 px-4 py-3 transition-colors hover:bg-folk-page",
                    !n.read && "bg-blue-50/30"
                  )}
                  onClick={() => {
                    onMarkRead(n.id)
                    if (n.href) onNavigate(n.href)
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onMarkRead(n.id)
                      if (n.href) onNavigate(n.href)
                    }
                  }}
                >
                  <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", colors)}>
                    <Icon className="h-3 w-3" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-[12px] leading-tight", n.read ? "text-folk-secondary" : "font-medium text-folk-text")}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-[#aaa]">{formatNotifTime(n.timestamp)}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-folk-secondary">{n.description}</p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-folk-border-subtle px-4 py-2.5">
        <button
          onClick={onMarkAllRead}
          className="ml-auto block text-[12px] font-medium text-folk-secondary transition-colors hover:text-folk-text"
          tabIndex={0}
        >
          Mark all as read
        </button>
      </div>
    </div>
  )
})
