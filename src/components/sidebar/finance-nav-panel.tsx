"use client"

import Link from "next/link"
import { ChevronsLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  BUSINESS_NAV_GROUP,
  BUSINESS_NAV_SECTIONS,
  isBusinessNavItemActive,
} from "@/lib/business-nav"

interface FinanceNavPanelProps {
  pathname: string
  onClose: () => void
}

export function FinanceNavPanel({ pathname, onClose }: FinanceNavPanelProps) {
  return (
    <aside
      className="flex h-screen w-[232px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar-bg"
      role="navigation"
      aria-label="Finance navigation"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex shrink-0 items-center justify-between px-[12px] pb-[2px] pt-[10px]">
          <span className="text-[13px] font-semibold text-sidebar-text">{BUSINESS_NAV_GROUP.label}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[22px] w-[22px] items-center justify-center rounded-none text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text"
            aria-label="Close finance menu"
            tabIndex={0}
          >
            <ChevronsLeft className="h-[14px] w-[14px]" strokeWidth={1.75} />
          </button>
        </div>

        <div className="py-[6px]">
          {BUSINESS_NAV_SECTIONS.map((section, sectionIndex) => (
            <div key={section.title ?? `section-${sectionIndex}`} className={sectionIndex > 0 ? "mt-[8px]" : ""}>
              {section.title && (
                <p className="mb-[4px] px-[12px] text-[11px] font-medium tracking-wide text-sidebar-muted">
                  {section.title}
                </p>
              )}
              <ul className="space-y-px px-[6px]">
                {section.items.map((item) => {
                  const isActive = isBusinessNavItemActive(pathname, item.href)
                  const Icon = item.icon

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-none px-[8px] py-[7px] text-[13px] font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-active text-sidebar-text"
                            : "text-sidebar-text hover:bg-sidebar-hover"
                        )}
                        aria-current={isActive ? "page" : undefined}
                        tabIndex={0}
                      >
                        <Icon className="h-[16px] w-[16px] shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
