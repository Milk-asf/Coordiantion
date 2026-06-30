"use client"

import { useCallback, useEffect, useState, type ComponentType } from "react"
import { usePathname } from "next/navigation"
import {
  AlertTriangle,
  BookOpen,
  CalendarRange,
  ClipboardList,
  Clock,
  Coins,
  FileCheck,
  FileText,
  Package,
  Settings,
  ShoppingCart,
  StickyNote,
  SquareCheck,
  User,
  Users,
  Wallet,
} from "lucide-react"

export interface RouteMeta {
  href: string
  label: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}

// Longest hrefs first so prefix matching resolves the most specific route.
const ROUTE_REGISTRY: RouteMeta[] = [
  { href: "/business/invoices/timesheets", label: "Billing queue", icon: Clock },
  { href: "/business/ndis-claims", label: "Claims", icon: FileCheck },
  { href: "/business/reimbursements", label: "Reimbursements", icon: Wallet },
  { href: "/business/pay-runs", label: "Pay runs", icon: Coins },
  { href: "/business/orders", label: "Orders", icon: ShoppingCart },
  { href: "/business/invoices", label: "Invoicing", icon: FileText },
  { href: "/invoicing", label: "Invoicing", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/timesheets", label: "My work", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/documents", label: "Documents", icon: Package },
  { href: "/contacts", label: "Contacts", icon: BookOpen },
  { href: "/clients", label: "Clients", icon: User },
  { href: "/roster", label: "Roster", icon: CalendarRange },
  { href: "/forms", label: "Forms", icon: ClipboardList },
  { href: "/tasks", label: "Tasks", icon: SquareCheck },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/staff", label: "Staff", icon: Users },
]

interface StoredVisit {
  href: string
  ts: number
}

const STORAGE_KEY = "coordination:recently-visited"
const CHANGE_EVENT = "coordination:recently-visited-changed"
const MAX_ITEMS = 8

function resolveRoute(pathname: string): RouteMeta | null {
  return ROUTE_REGISTRY.find((route) => pathname === route.href || pathname.startsWith(`${route.href}/`)) ?? null
}

function readStore(): StoredVisit[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredVisit[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStore(visits: StoredVisit[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visits))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function recordVisit(pathname: string) {
  const route = resolveRoute(pathname)
  if (!route) return
  const existing = readStore().filter((visit) => visit.href !== route.href)
  writeStore([{ href: route.href, ts: Date.now() }, ...existing].slice(0, MAX_ITEMS))
}

export interface RecentlyVisitedItem extends RouteMeta {
  visitedAt: number
}

/** Reads the recently-visited list and stays in sync across same-tab updates. */
export function useRecentlyVisited(): RecentlyVisitedItem[] {
  const [items, setItems] = useState<RecentlyVisitedItem[]>([])

  const sync = useCallback(() => {
    const resolved = readStore()
      .map((visit) => {
        const route = resolveRoute(visit.href)
        return route ? { ...route, visitedAt: visit.ts } : null
      })
      .filter((item): item is RecentlyVisitedItem => item !== null)
    setItems(resolved)
  }, [])

  useEffect(() => {
    sync()
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [sync])

  return items
}

/**
 * Invisible recorder mounted once in the dashboard layout. It logs each known
 * route the user lands on so the dashboard can surface a "Recently visited" row.
 */
export function RecentlyVisitedTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    recordVisit(pathname)
  }, [pathname])

  return null
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}
