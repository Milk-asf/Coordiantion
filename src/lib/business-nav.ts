import type { LucideIcon } from "lucide-react"
import {
  CalendarClock,
  CircleDollarSign,
  Clock,
  DollarSign,
  FileCheck,
  FileSpreadsheet,
  FileText,
  MapPin,
  ShoppingCart,
  Wallet,
} from "lucide-react"

export interface BusinessNavItem {
  label: string
  href: string
  icon: LucideIcon
}

export interface BusinessNavSection {
  title?: string
  items: BusinessNavItem[]
}

export const BUSINESS_NAV_GROUP = {
  label: "Finance",
  icon: CircleDollarSign,
} as const

export const BUSINESS_ROUTE_PREFIX = "/business"

const EXCLUDED_FINANCE_HREFS = new Set(["/business/billables"])

/** Routes that belong to a finance nav item but use a different URL. */
const FINANCE_NAV_ACTIVE_ALIASES: Record<string, string[]> = {
  "/business/invoices": ["/invoices", "/invoicing"],
}

function withoutExcludedFinanceRoutes(items: BusinessNavItem[]): BusinessNavItem[] {
  return items.filter((item) => !EXCLUDED_FINANCE_HREFS.has(item.href))
}

export const BUSINESS_NAV_SECTIONS: BusinessNavSection[] = [
  {
    items: withoutExcludedFinanceRoutes([
      { label: "Invoices", href: "/business/invoices", icon: FileText },
      { label: "NDIS claims", href: "/business/ndis-claims", icon: FileCheck },
    ]),
  },
  {
    title: "Clients",
    items: withoutExcludedFinanceRoutes([
      { label: "Budgets", href: "/budgets", icon: DollarSign },
      { label: "Planned Spending", href: "/planned-spending", icon: CalendarClock },
    ]),
  },
  {
    title: "Accounts",
    items: withoutExcludedFinanceRoutes([
      { label: "Statements", href: "/business/statements", icon: FileSpreadsheet },
      { label: "Orders", href: "/business/orders", icon: ShoppingCart },
    ]),
  },
  {
    title: "Employees",
    items: withoutExcludedFinanceRoutes([
      { label: "Travel claims", href: "/business/travel-claims", icon: MapPin },
      { label: "Reimbursements", href: "/business/reimbursements", icon: Wallet },
      { label: "Timesheets", href: "/business/timesheets", icon: Clock },
    ]),
  },
]

export const BUSINESS_NAV_ITEMS: BusinessNavItem[] = BUSINESS_NAV_SECTIONS.flatMap((section) => section.items)

export function isBusinessRoute(pathname: string) {
  return pathname === BUSINESS_ROUTE_PREFIX || pathname.startsWith(`${BUSINESS_ROUTE_PREFIX}/`)
}

export function isBusinessNavItemActive(pathname: string, href: string) {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true
  const aliases = FINANCE_NAV_ACTIVE_ALIASES[href]
  return aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`)) ?? false
}

export function isBusinessGroupActive(pathname: string) {
  return BUSINESS_NAV_ITEMS.some((item) => isBusinessNavItemActive(pathname, item.href))
}
