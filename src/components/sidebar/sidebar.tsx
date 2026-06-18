"use client"

import { useState, useCallback, useRef, useEffect, forwardRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Bell,
  SquareCheck,
  BookOpen,
  User,
  Package,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  ChevronDown,
  Settings,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileCheck,
  StickyNote,
  ClipboardList,
  CalendarRange,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EntityIcon } from "@/components/entity-icon"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useWorkspaceSettings } from "@/lib/hooks/use-workspace-settings"
import { useNotifications, type AppNotification } from "@/lib/hooks/use-notifications"
import { SetupWidget } from "@/components/sidebar/setup-widget"
import { SidebarBusinessNavGroup } from "@/components/sidebar/sidebar-nav-group"
import { FinanceNavPanel } from "@/components/sidebar/finance-nav-panel"
import { isBusinessGroupActive } from "@/lib/business-nav"

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
    items: [],
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

const COLLAPSED_WIDTH = 60
const MIN_WIDTH = 148
const DEFAULT_WIDTH = 148
const MAX_WIDTH = 360
const COLLAPSE_THRESHOLD = 100

export function Sidebar() {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [notifPos, setNotifPos] = useState({ top: 0, left: 0 })
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [isFinancePanelOpen, setIsFinancePanelOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
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
  const { activeWorkspace } = useWorkspace()
  const { canViewStaff, canViewIncidents, isLoading: permissionsLoading } = usePermissions()
  const { settings: orgSettings } = useWorkspaceSettings()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
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
    setIsFinancePanelOpen((prev) => !prev)
  }, [])

  const handleCloseFinancePanel = useCallback(() => {
    setIsFinancePanelOpen(false)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(user.user_metadata?.full_name || "")
        setUserEmail(user.email || "")
      }
    })
  }, [])

  useEffect(() => {
    if (!isUserMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setIsUserMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isUserMenuOpen])

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

  const handleLogout = async () => {
    const supabase = createClient()
    if (supabase) await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
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

  const renderNavLink = (item: NavItem) => {
    const isActive = pathname === item.href
    const Icon = item.icon

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={cn(
            "mx-1 flex h-[32px] items-center gap-2 rounded-[4px] px-[12px] text-[13px] font-normal transition-colors",
            isActive
              ? "bg-sidebar-active font-medium text-sidebar-text"
              : "text-sidebar-text hover:bg-sidebar-hover",
            isCollapsed && "mx-0 justify-center px-0"
          )}
          aria-current={isActive ? "page" : undefined}
          tabIndex={0}
        >
          <Icon className="h-[16px] w-[16px] shrink-0" strokeWidth={1.75} />
          {!isCollapsed && (
            <>
              <span className="truncate">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span
                  className="ml-auto flex h-[20px] min-w-[20px] items-center justify-center rounded-full text-[11px] font-medium"
                  style={{ backgroundColor: "var(--primary-color-light)", color: "var(--primary-color-text)" }}
                >
                  {item.badge}
                </span>
              )}
            </>
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
        "relative flex h-full shrink-0 flex-col overflow-visible border-r border-folk-border bg-sidebar-bg",
        !isDragging && !instantWidthChange && "transition-[width] duration-200"
      )}
    >
      {/* Company name + collapse */}
      <div className="flex h-[40px] shrink-0 items-center justify-between px-3">
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden px-1 py-0.5">
            {orgSettings.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={orgSettings.logoUrl}
                alt="Organisation logo"
                className="h-7 w-7 shrink-0 rounded-none object-contain"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-none bg-green-600 text-[10px] font-semibold text-white">
                {(orgSettings.orgName || activeWorkspace?.name)?.[0]?.toUpperCase() || "W"}
              </div>
            )}
            <span className="truncate text-[15px] font-semibold text-sidebar-text">
              {orgSettings.orgName || activeWorkspace?.name || "Workspace"}
            </span>
          </div>
        )}
        <button
          onClick={handleToggleCollapse}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-none text-sidebar-muted transition-colors hover:text-sidebar-text",
            isCollapsed && "mx-auto"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          tabIndex={0}
        >
          {isCollapsed ? (
            <ChevronsRight className="h-[14px] w-[14px]" strokeWidth={1.75} />
          ) : (
            <ChevronsLeft className="h-[14px] w-[14px]" strokeWidth={1.75} />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2" role="navigation" aria-label="Main navigation">
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
              "flex w-full items-center gap-2 rounded-none px-2 py-[6px] text-[13px] font-medium transition-colors",
              isNotifOpen
                ? "bg-sidebar-active text-sidebar-text"
                : "text-sidebar-text hover:bg-sidebar-hover",
              isCollapsed && "justify-center px-0"
            )}
            aria-label="Notifications"
            tabIndex={0}
          >
            <Bell className="h-[16px] w-[16px] shrink-0" strokeWidth={1.75} />
            {!isCollapsed && (
              <>
                <span className="truncate">Notifications</span>
                {unreadCount > 0 && (
                  <span
                    className="ml-auto flex h-[22px] min-w-[22px] items-center justify-center rounded-none text-[12px] font-medium"
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

        {navigation.map((section) => {
          const items = section.items.filter((item) => {
            if (item.label === "Staff" && !permissionsLoading && !canViewStaff) return false
            if (item.label === "Incidents" && !permissionsLoading && !canViewIncidents) return false
            return true
          })
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
              <ul className="space-y-px">
                {section.title === "Business" && (
                  <SidebarBusinessNavGroup
                    isCollapsed={isCollapsed}
                    isPanelOpen={isFinancePanelOpen}
                    isGroupActive={isFinanceGroupActive}
                    onTogglePanel={handleToggleFinancePanel}
                  />
                )}
                {items.map(renderNavLink)}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* Setup widget */}
      <SetupWidget isCollapsed={isCollapsed} />

      {/* User menu at bottom */}
      <div className="relative border-t border-sidebar-border px-2 pb-3 pt-2" ref={userMenuRef}>
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className={cn(
            "flex w-full items-center gap-2 rounded-none px-2 py-[6px] text-[13px] font-medium text-sidebar-text transition-colors hover:bg-sidebar-hover",
            isCollapsed && "justify-center px-0"
          )}
          aria-label="User menu"
          tabIndex={0}
        >
          <EntityIcon
            text={
              userName
                ? userName.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase()
                : userEmail
                  ? userEmail.charAt(0).toUpperCase()
                  : "U"
            }
            size="xsm"
          />
          {!isCollapsed && (
            <>
              <span className="truncate text-[12px]">{userName || userEmail || "Account"}</span>
              <ChevronDown className="ml-auto h-[12px] w-[12px] shrink-0 text-sidebar-muted" strokeWidth={1.75} />
            </>
          )}
        </button>

        {isUserMenuOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-1 rounded-none border border-folk-border bg-folk-surface py-1 shadow-folk">
            <div className="border-b border-folk-border-subtle px-3 py-2">
              <p className="truncate text-[12px] font-medium text-folk-text">{userName || "User"}</p>
              <p className="truncate text-[11px] text-folk-secondary">{userEmail}</p>
            </div>
            <Link
              href="/settings"
              onClick={() => setIsUserMenuOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-[6px] text-[12px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
              tabIndex={0}
            >
              <Settings className="h-[14px] w-[14px]" strokeWidth={1.75} />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-[6px] text-[12px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
              tabIndex={0}
            >
              <LogOut className="h-[14px] w-[14px]" strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        )}
      </div>

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
}

const notifColor: Record<AppNotification["type"], string> = {
  "overdue-task": "text-red-500 bg-red-50",
  "task-completed": "text-green-500 bg-green-50",
  "invoice-sent": "text-blue-500 bg-blue-50",
  "invoice-paid": "text-green-500 bg-green-50",
  "invoice-overdue": "text-orange-500 bg-orange-50",
  "new-client": "text-violet-500 bg-violet-50",
  "plan-expiring": "text-amber-500 bg-amber-50",
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
  position: { top: number; left: number }
}>(function NotificationPanel({
  notifications,
  onClose,
  onMarkAllRead,
  onMarkRead,
  position,
}, ref) {
  return (
    <div
      ref={ref}
      className="fixed z-50 flex max-h-[420px] w-[320px] flex-col overflow-hidden rounded-none border border-folk-border bg-folk-surface shadow-folk"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex items-center justify-between border-b border-folk-border-subtle px-4 py-3">
        <h2 className="text-[14px] font-semibold text-folk-text">Notifications</h2>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
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
                  onClick={() => onMarkRead(n.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") onMarkRead(n.id) }}
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
