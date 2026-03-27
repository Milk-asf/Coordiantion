"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Bell,
  SquareCheck,
  Calendar,
  Copy,
  Handshake,
  User,
  FileText,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  ChevronDown,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import { usePermissions } from "@/lib/hooks/use-permissions"

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

const topItems: NavItem[] = [
  { label: "Notifications", href: "/notifications", icon: Bell, badge: 2 },
]

const navigation: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { label: "Tasks", href: "/tasks", icon: SquareCheck },
      { label: "Calendar", href: "/calendar", icon: Calendar },
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Clients", href: "/clients", icon: Copy },
      { label: "Contacts", href: "/contacts", icon: Handshake },
      { label: "Staff", href: "/staff", icon: User },
    ],
  },
]

const COLLAPSED_WIDTH = 60
const MIN_WIDTH = 170
const DEFAULT_WIDTH = 240
const MAX_WIDTH = 360
const COLLAPSE_THRESHOLD = 100

export function Sidebar() {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const sidebarRef = useRef<HTMLElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const widthBeforeCollapse = useRef(DEFAULT_WIDTH)
  const pathname = usePathname()
  const router = useRouter()
  const { activeWorkspace } = useWorkspace()
  const { canViewStaff, isLoading: permissionsLoading } = usePermissions()

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
    } else {
      widthBeforeCollapse.current = width
      setIsCollapsed(true)
      setWidth(COLLAPSED_WIDTH)
    }
  }, [isCollapsed, width])

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
            "flex items-center gap-2 rounded px-2 py-[6px] text-[13px] font-medium transition-colors",
            isActive
              ? "bg-sidebar-active text-sidebar-text"
              : "text-sidebar-text hover:bg-sidebar-hover",
            isCollapsed && "justify-center px-0"
          )}
          aria-current={isActive ? "page" : undefined}
          tabIndex={0}
        >
          <Icon className="h-[16px] w-[16px] shrink-0" strokeWidth={1.75} />
          {!isCollapsed && (
            <>
              <span className="truncate">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="ml-auto flex h-[22px] min-w-[22px] items-center justify-center rounded-md bg-blue-50 text-[12px] font-medium text-blue-500">
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
    <aside
      ref={sidebarRef}
      style={{ width: `${width}px` }}
      className={cn(
        "relative flex h-screen shrink-0 flex-col overflow-visible border-r border-sidebar-border bg-sidebar-bg",
        !isDragging && "transition-[width] duration-200"
      )}
    >
      {/* Company name + collapse */}
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden px-1 py-0.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-[8px] font-medium text-white">
              {activeWorkspace?.name?.[0]?.toUpperCase() || "W"}
            </div>
            <span className="truncate text-[13px] font-medium text-sidebar-text">
              {activeWorkspace?.name || "Workspace"}
            </span>
          </div>
        )}
        <button
          onClick={handleToggleCollapse}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded text-sidebar-muted transition-colors hover:text-sidebar-text",
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
        <ul className="space-y-px">
          {topItems.map(renderNavLink)}
        </ul>

        {navigation.map((section) => {
          const items = section.items.filter((item) => {
            if (item.label === "Staff" && !permissionsLoading && !canViewStaff) return false
            return true
          })
          if (items.length === 0) return null
          return (
            <div key={section.title} className="mt-4">
              {!isCollapsed && (
                <p className="mb-1 px-2 text-[11px] font-medium tracking-wide text-sidebar-muted">
                  {section.title}
                </p>
              )}
              {isCollapsed && (
                <div className="mx-auto mb-1 h-px w-5 bg-sidebar-border" />
              )}
              <ul className="space-y-px">
                {items.map(renderNavLink)}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* User menu at bottom */}
      <div className="relative border-t border-sidebar-border px-2 pb-3 pt-2" ref={userMenuRef}>
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className={cn(
            "flex w-full items-center gap-2 rounded px-2 py-[6px] text-[13px] font-medium text-sidebar-text transition-colors hover:bg-sidebar-hover",
            isCollapsed && "justify-center px-0"
          )}
          aria-label="User menu"
          tabIndex={0}
        >
          <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-[#e0e0e0] text-[10px] font-semibold text-[#555]">
            {userName ? userName.charAt(0).toUpperCase() : userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
          </div>
          {!isCollapsed && (
            <>
              <span className="truncate text-[12px]">{userName || userEmail || "Account"}</span>
              <ChevronDown className="ml-auto h-[12px] w-[12px] shrink-0 text-sidebar-muted" strokeWidth={1.75} />
            </>
          )}
        </button>

        {isUserMenuOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-1 rounded-lg border border-[#e0e0e0] bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            <div className="border-b border-[#f0f0f0] px-3 py-2">
              <p className="truncate text-[12px] font-medium text-[#262626]">{userName || "User"}</p>
              <p className="truncate text-[11px] text-[#888]">{userEmail}</p>
            </div>
            <Link
              href="/settings"
              onClick={() => setIsUserMenuOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-[6px] text-[12px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
              tabIndex={0}
            >
              <Settings className="h-[14px] w-[14px]" strokeWidth={1.75} />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-[6px] text-[12px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
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
  )
}
