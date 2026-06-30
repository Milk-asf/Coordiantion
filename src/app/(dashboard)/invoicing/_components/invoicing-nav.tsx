"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { Compass, SquareDashed } from "lucide-react"
import type { ReactNode } from "react"
import { tabButtonClass, pageNavTabsScrollClass } from "@/components/tab-active-indicator"
import { PageTitleBar } from "@/components/page-title-bar"

export type InvoicingNavTab = "all" | "bulk-created" | "bulk-draft" | "timesheets"

interface InvoicingNavItem {
  id: InvoicingNavTab
  label: string
  href: string
  icon: LucideIcon
}

export const INVOICING_NAV_ITEMS: InvoicingNavItem[] = [
  { id: "bulk-draft", label: "Create invoices", href: "/business/invoices", icon: SquareDashed },
  { id: "all", label: "Invoices", href: "/invoices", icon: Compass },
]

export function getInvoicingNavTab(pathname: string): InvoicingNavTab {
  if (pathname === "/invoices" || pathname.startsWith("/invoices/")) return "all"
  if (pathname.startsWith("/business/invoices/timesheets")) return "timesheets"
  if (pathname.startsWith("/business/invoices/bulk-created")) return "bulk-created"
  if (pathname === "/business/invoices" || pathname.startsWith("/business/invoices/")) return "bulk-draft"
  return "all"
}

interface InvoicingNavProps {
  suffix?: ReactNode
  actions?: ReactNode
}

function InvoicingNavLink({ item, isActive }: { item: InvoicingNavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={tabButtonClass(isActive)}
      aria-current={isActive ? "page" : undefined}
      tabIndex={0}
    >
      <span className="folk-tab-label text-[13px] font-normal leading-none">{item.label}</span>
    </Link>
  )
}

export function InvoicingNav({ suffix, actions }: InvoicingNavProps) {
  const pathname = usePathname()
  const activeTab = getInvoicingNavTab(pathname)

  return (
    <>
      <PageTitleBar title="Invoicing" />
      {/* Nav tabs */}
      <div className="flex h-[44px] shrink-0 items-stretch justify-between gap-[8px] border-b border-folk-border bg-white px-[16px]">
        <div className={pageNavTabsScrollClass()}>
          <div className="folk-tab-bar flex h-full shrink-0 items-stretch">
            {INVOICING_NAV_ITEMS.map((item) => (
              <InvoicingNavLink key={item.id} item={item} isActive={activeTab === item.id} />
            ))}
          </div>
          {suffix && (
            <div className="folk-tab-bar flex items-stretch gap-0 overflow-y-visible">{suffix}</div>
          )}
        </div>
        <div className="flex items-center">{actions}</div>
      </div>
    </>
  )
}
