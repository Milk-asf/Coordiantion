"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Search,
  Bell,
  SquareCheck,
  Calendar,
  Copy,
  Handshake,
  User,
  FileText,
  StickyNote,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

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
    ],
  },
  {
    title: "People",
    items: [
      { label: "Clients", href: "/clients", icon: Copy },
      { label: "Stakeholders", href: "/stakeholders", icon: Handshake },
      { label: "Team", href: "/team", icon: User },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Documents", href: "/documents", icon: FileText },
      { label: "Notes", href: "/notes", icon: StickyNote },
    ],
  },
]

const MIN_WIDTH = 60
const DEFAULT_WIDTH = 240
const MAX_WIDTH = 360
const COLLAPSE_THRESHOLD = 100

export function Sidebar() {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const widthBeforeCollapse = useRef(DEFAULT_WIDTH)
  const pathname = usePathname()

  const handleToggleCollapse = useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false)
      setWidth(widthBeforeCollapse.current)
    } else {
      widthBeforeCollapse.current = width
      setIsCollapsed(true)
      setWidth(MIN_WIDTH)
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
        setWidth(MIN_WIDTH)
      } else {
        const clampedWidth = Math.min(Math.max(newWidth, COLLAPSE_THRESHOLD), MAX_WIDTH)
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
            "flex items-center gap-2 rounded px-2 py-[6px] text-[14px] font-medium transition-colors",
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
      {/* User + collapse */}
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-[8px] font-medium text-white">
              C
            </div>
            <span className="truncate text-[13px] font-medium text-sidebar-text">
              Coordination
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

      {/* Search */}
      {!isCollapsed && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded border border-sidebar-border bg-white px-2 py-[5px]">
            <Search className="h-[13px] w-[13px] text-sidebar-muted" strokeWidth={1.75} />
            <span className="text-[12px] font-medium text-sidebar-muted">Search</span>
          </div>
        </div>
      )}

      {isCollapsed && (
        <div className="flex justify-center px-2 pb-2">
          <button
            className="flex h-7 w-7 items-center justify-center rounded text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text"
            aria-label="Search"
            tabIndex={0}
          >
            <Search className="h-[13px] w-[13px]" strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2" role="navigation" aria-label="Main navigation">
        {/* Top standalone items */}
        <ul className="space-y-px">
          {topItems.map(renderNavLink)}
        </ul>

        {/* Sectioned items */}
        {navigation.map((section) => (
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
              {section.items.map(renderNavLink)}
            </ul>
          </div>
        ))}
      </nav>

      {/* Help button at bottom */}
      <div className="px-3 pb-3 pt-2">
        {!isCollapsed ? (
          <button
            className="flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text"
            aria-label="Help"
            tabIndex={0}
          >
            <span className="text-[12px] font-medium">?</span>
          </button>
        ) : (
          <button
            className="mx-auto flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text"
            aria-label="Help"
            tabIndex={0}
          >
            <span className="text-[12px] font-medium">?</span>
          </button>
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
          if (e.key === "ArrowLeft") setWidth((w) => Math.max(MIN_WIDTH, w - 10))
          if (e.key === "ArrowRight") setWidth((w) => Math.min(MAX_WIDTH, w + 10))
        }}
      />
    </aside>
  )
}
