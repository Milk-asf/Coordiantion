"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { AlignLeft, Compass, SquareDashed } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type InvoicingNavTab = "all" | "bulk-created" | "bulk-draft"

interface InvoicingNavItem {
  id: InvoicingNavTab
  label: string
  href: string
  icon: LucideIcon
}

export const INVOICING_NAV_ITEMS: InvoicingNavItem[] = [
  { id: "all", label: "All Invoices", href: "/invoices", icon: Compass },
  { id: "bulk-draft", label: "Bulk Draft", href: "/business/invoices", icon: SquareDashed },
  { id: "bulk-created", label: "Bulk Created", href: "/business/invoices/bulk-created", icon: AlignLeft },
]

export function getInvoicingNavTab(pathname: string): InvoicingNavTab {
  if (pathname === "/invoices" || pathname.startsWith("/invoices/")) return "all"
  if (pathname.startsWith("/business/invoices/bulk-created")) return "bulk-created"
  if (pathname === "/business/invoices" || pathname.startsWith("/business/invoices/")) return "bulk-draft"
  return "all"
}

interface InvoicingNavProps {
  suffix?: ReactNode
  actions?: ReactNode
}

function InvoicingNavLink({ item, isActive }: { item: InvoicingNavItem; isActive: boolean }) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        "flex shrink-0 items-center gap-[6px] rounded-none px-[10px] py-[5px] text-[13px] font-medium transition-colors",
        isActive
          ? "border border-folk-border bg-folk-hover text-folk-text"
          : "text-folk-secondary hover:text-folk-text"
      )}
      aria-current={isActive ? "page" : undefined}
      tabIndex={0}
    >
      <Icon className="h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
      <span>{item.label}</span>
    </Link>
  )
}

export function InvoicingNav({ suffix, actions }: InvoicingNavProps) {
  const pathname = usePathname()
  const activeTab = getInvoicingNavTab(pathname)

  return (
    <div className="flex h-[44px] shrink-0 items-center justify-between gap-[8px] border-b border-folk-border bg-folk-nav px-[16px]">
      <div className="flex min-w-0 flex-1 items-center gap-[6px] overflow-x-auto">
        {INVOICING_NAV_ITEMS.map((item, index) => (
          <div key={item.id} className="flex shrink-0 items-center gap-[6px]">
            <InvoicingNavLink item={item} isActive={activeTab === item.id} />
            {index === 0 && <div className="h-[16px] w-px shrink-0 bg-[var(--folk-border)]" aria-hidden="true" />}
          </div>
        ))}
        {suffix}
      </div>
      {actions}
    </div>
  )
}
