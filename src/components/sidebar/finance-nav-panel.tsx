"use client"

import Link from "next/link"
import { PanelToggleButton } from "@/components/panel-toggle-button"
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
      className="folk-sidebar-surface flex h-screen w-[232px] shrink-0 flex-col border-r border-sidebar-border"
      role="navigation"
      aria-label="Finance navigation"
    >
      <div className="folk-tab-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex shrink-0 items-center justify-between px-[12px] pb-[2px] pt-[10px]">
          <span className="text-[13px] font-semibold text-sidebar-text">{BUSINESS_NAV_GROUP.label}</span>
          <PanelToggleButton
            side="left"
            isOpen
            onClick={onClose}
            ariaLabel="Close finance menu"
            className="h-[22px] w-[22px] rounded-[4px]"
            iconClassName="h-[13px] w-[13px]"
          />
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
                          "flex items-center gap-2 rounded-none px-[8px] py-[7px] text-[12px] font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-active text-sidebar-active-text"
                            : "text-[#616161] hover:bg-sidebar-hover"
                        )}
                        aria-current={isActive ? "page" : undefined}
                        tabIndex={0}
                      >
                        <Icon className="h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
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
